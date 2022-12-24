namespace contraption {

    export class Impulse extends Vertex {
        angle: number;
        constructor(x: number, y: number, angle?: number) {
            super(x, y);
            this.angle = typeof angle !== 'undefined' ? angle : 0;
        }
    }

    export class CollisionFilter {
        constructor(public category: number, public mask: number, public group: number) {
        }
    }

    export interface BodyCreateOptions {
        angle?: number;
        vertices?: Vertex[];
        position?: Vector;
        isStatic?: boolean;
        isSleeping?: boolean;
        mass?: number;
        inertia?: number;
        density?: number;
        velocity?: Vector;
        angularVelocity?: number;
        parts?: Body[];
    }

    interface PhysProperties {
        mass: number;
        area: number;
        inertia: number;
        center: Vector;
    };

    interface DynamicProperties {
        restitution: number;
        friction: number;
        mass: number;
        inertia: number;
        density: number;
        inverseMass: number;
        inverseInertia: number;
    };

    export class Body {
        static _inertiaScale: number = 4;
        static _nextCollidingGroupId: number = 1;
        static _nextNonCollidingGroupId: number = -1;
        static _nextCategory: number = 0x0001;

        static NextGroup(isNonColliding: boolean) {
            if (isNonColliding)
                return Body._nextNonCollidingGroupId--;
            return Body._nextCollidingGroupId++;
        }

        static NextCategory(): number {
            Body._nextCategory = Body._nextCategory << 1;
            return Body._nextCategory;
        }

        id: number;
        angle: number;
        vertices: Vertex[];
        position: Vector;
        force: Vector;
        torque: number;
        positionImpulse: Impulse;
        constraintImpulse: Impulse;
        totalContacts: number;
        speed: number;
        angularSpeed: number;
        velocity: Vector;
        angularVelocity: number;
        sleepThreshold: number;
        sleepCounter: number;
        density: number;
        restitution: number;
        friction: number;
        frictionStatic: number;
        frictionAir: number;
        collisionFilter: CollisionFilter;
        slop: number;
        timeScale: number;
        events: any;
        bounds: Bounds;
        circleRadius: number;
        positionPrev: Vector;
        anglePrev: number;
        parent: Body;
        axes: Vector[];
        area: number;
        mass: number;
        inverseMass: number;
        inertia: number;
        inverseInertia: number;
        isStatic: boolean;
        isSensor: boolean;
        isSleeping: boolean;
        parts: Body[];

        _dynamicProperties: DynamicProperties;

        constructor(options: BodyCreateOptions) {
            options = options || {};

            // Fill in options
            options.angle = options.angle || 0;
            options.vertices = options.vertices || Vertex.FromPath("L 0 0 L 40 0 L 40 40 L 0 40");
            options.position = options.position || new Vector();
            options.isStatic = options.isStatic || false;
            options.isSleeping = options.isSleeping || false;
            options.mass = options.mass || 0;
            options.inertia = options.inertia || 0;
            options.density = options.density || 0.001;
            options.velocity = options.velocity || new Vector();
            options.angularVelocity = options.angularVelocity || 0;
            options.parts = options.parts || [];

            // Init from options
            this.angle = options.angle;
            this.vertices = options.vertices;
            this.position = options.position;
            this.isStatic = options.isStatic;
            this.isSleeping = options.isSleeping;
            this.mass = options.mass;
            this.inertia = options.inertia;
            this.density = options.density;
            this.velocity = options.velocity;
            this.angularVelocity = options.angularVelocity;
            this.parts = options.parts;

            // Init with defaults
            this.id = Common.nextId();
            this.force = new Vector();
            this.torque = 0;
            this.positionImpulse = new Impulse(0, 0, 0);
            this.constraintImpulse = new Impulse(0, 0, 0);
            this.totalContacts = 0;
            this.speed = 0;
            this.angularSpeed = 0;
            this.velocity = new Vector();
            this.angularVelocity = 0;
            this.sleepThreshold = 60;
            this.sleepCounter = 0;
            this.density = 0.001;
            this.restitution = 0;
            this.friction = 0.1;
            this.frictionStatic = 0.5;
            this.frictionAir = 0.01;
            this.collisionFilter = new CollisionFilter(0x0001, 0xFFFFFFFF, 0);
            this.slop = 0.05;
            this.timeScale = 1;
            this.circleRadius = 0;
            this.positionPrev = Vector.Clone(this.position);
            this.anglePrev = this.angle;
            this.area = 0;
            this.isSensor = false;
            this.isSleeping = false;
            this.bounds = new Bounds();
            this.axes = Axes.FromVerts(this.vertices);

            // Init calculated values
            this.positionPrev = Vector.Clone(this.position);
            this.anglePrev = this.angle;
            this.setParts(this.parts);
            this.setVertices(this.vertices);
            this.setStatic(this.isStatic);
            this.setSleeping(this.isSleeping);

            Vertex.RotateInPlace(this.vertices, this.angle, this.position);
            Axes.RotateInPlace(this.axes, this.angle);
            this.bounds.update(this.vertices, this.velocity);

            // Allow override of some calculated values
            this.setMass(options.mass || this.mass);
            this.setInertia(options.inertia || this.inertia);
        }

        setMass(mass: number) {
            const moment = this.inertia / (this.mass / 6);
            this.inertia = moment * (mass / 6);
            this.inverseInertia = 1 / this.inertia;

            this.mass = mass;
            this.inverseMass = 1 / this.mass;
            this.density = this.mass / this.area;
        }

        setDensity(density: number) {
            this.setMass(density * this.area);
            this.density = density;
        }

        setInertia(inertia: number) {
            this.inertia = inertia;
            this.inverseInertia = 1 / this.inertia;
        }

        setVertices(verts: Vertex[]) {
            if (verts[0].body === this) {
                this.vertices = verts;
            } else {
                this.vertices = Vertex.Create(verts, this);
            }

            // Update properties
            this.axes = Axes.FromVerts(this.vertices);
            this.area = Vertex.Area(this.vertices);
            this.setMass(this.density * this.area);

            // Orient vertices around the center of mass at origin
            const centroid = Vertex.Centroid(this.vertices);
            Vertex.TranslateInPlace(this.vertices, centroid, -1);

            // Update inertia while vertices are at origin
            this.setInertia(Body._inertiaScale * Vertex.Inertia(this.vertices, this.mass));

            // Translate to current position
            Vertex.TranslateInPlace(this.vertices, this.position);
            this.bounds.update(this.vertices, this.velocity);
        }

        setPosition(pos: Vector) {
            const delta = Vector.SubToRef(pos, this.position);
            this.positionPrev.x += delta.x;
            this.positionPrev.y += delta.y;
        }

        setParts(parts: Body[], autoHull?: boolean) {
            parts = parts.slice(0);

            // Ensure the first part is the parent body
            this.parts = [];
            this.parts.push(this);
            this.parent = this;

            for (let i = 0; i < parts.length; ++i) {
                const part = parts[i];
                if (part !== this) {
                    part.parent = this;
                    this.parts.push(part);
                }
            }

            if (this.parts.length === 1) return;

            autoHull = typeof autoHull !== 'undefined' ? autoHull : true;

            if (autoHull) {
                let verts: Vertex[] = [];
                for (let i = 0; i < parts.length; ++i) {
                    verts = verts.concat(parts[i].vertices);
                }

                Vertex.ClockwiseSortInPlace(verts);

                const hull = Vertex.Hull(verts);
                const hullCenter = Vertex.Centroid(hull);

                this.setVertices(hull);
                Vertex.TranslateInPlace(this.vertices, hullCenter);
            }

            const total = this.sumPhysProperties();

            this.area = total.area;
            this.parent = this;
            this.position.x = total.center.x;
            this.position.y = total.center.y;
            this.positionPrev.x = total.center.x;
            this.positionPrev.y = total.center.y;

            this.setMass(total.mass);
            this.setInertia(total.inertia);
            this.setPosition(total.center);
        }

        sumPhysProperties(): PhysProperties {
            const properties: PhysProperties = {
                mass: 0,
                area: 0,
                inertia: 0,
                center: new Vector()
            };

            for (let i = this.parts.length === 1 ? 0 : 1; i < this.parts.length; ++i) {
                const part = this.parts[i];
                const mass = part.mass !== Infinity ? part.mass : 1;

                properties.mass += mass;
                properties.area += part.area;
                properties.inertia += part.inertia;
                properties.center = Vector.AddToRef(properties.center, Vector.MulToRef(part.position, mass));
            }

            properties.center = Vector.DivToRef(properties.center, properties.mass);

            return properties;
        }

        setStatic(isStatic: boolean) {
            for (let i = 0; i < this.parts.length; ++i) {
                const part = this.parts[i];

                if (part.isStatic === isStatic) continue;
                part.isStatic = isStatic;

                if (isStatic) {
                    part._dynamicProperties = {
                        restitution: part.restitution,
                        friction: part.friction,
                        mass: part.mass,
                        inertia: part.inertia,
                        density: part.density,
                        inverseMass: part.inverseMass,
                        inverseInertia: part.inverseInertia
                    };

                    part.restitution = 0;
                    part.friction = 1;
                    part.mass = part.inertia = part.density = Infinity;
                    part.inverseMass = part.inverseInertia = 0;

                    part.positionPrev.x = part.position.x;
                    part.positionPrev.y = part.position.y;
                    part.anglePrev = part.angle;
                    part.angularVelocity = 0;
                    part.speed = 0;
                    part.angularSpeed = 0;
                    part.velocity.x = 0;
                    part.velocity.y = 0;
                } else if (part._dynamicProperties) {
                    const d = part._dynamicProperties;
                    part.restitution = d.restitution;
                    part.friction = d.friction;
                    part.mass = d.mass;
                    part.inertia = d.inertia;
                    part.density = d.density;
                    part.inverseMass = d.inverseMass;
                    part.inverseInertia = d.inverseInertia;

                    part._dynamicProperties = null;
                }
            }
        }

        setSleeping(isSleeping: boolean) {
            Sleeping.set(this, isSleeping);
        }
    }

}
