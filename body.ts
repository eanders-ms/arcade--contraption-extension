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
            Body.SetParts(this, this.parts);
            Body.SetVertices(this, this.vertices);
            Body.SetStatic(this, this.isStatic);
            Body.SetSleeping(this, this.isSleeping);
            //Body.SetParent(this, this.parent);

            Vertex.RotateInPlace(this.vertices, this.angle, this.position);
            Axes.RotateInPlace(this.axes, this.angle);
            Bounds.Update(this.bounds, this.vertices, this.velocity);

            // Allow override of some calculated values
            Body.SetMass(this, options.mass || this.mass);
            Body.SetInertia(this, options.inertia || this.inertia);
        }

        static SetMass(body: Body, mass: number) {
            const moment = body.inertia / (body.mass / 6);
            body.inertia = moment * (mass / 6);
            body.inverseInertia = 1 / body.inertia;

            body.mass = mass;
            body.inverseMass = 1 / body.mass;
            body.density = body.mass / body.area;
        }

        static SetDensity(body: Body, density: number) {
            Body.SetMass(body, density * body.area);
            body.density = density;
        }

        static SetInertia(body: Body, inertia: number) {
            body.inertia = inertia;
            body.inverseInertia = 1 / body.inertia;
        }

        static SetVertices(body: Body, verts: Vertex[]) {
            if (verts[0].body === body) {
                body.vertices = verts;
            } else {
                body.vertices = Vertex.Create(verts, body);
            }

            // Update properties
            body.axes = Axes.FromVerts(body.vertices);
            body.area = Vertex.Area(body.vertices);
            Body.SetMass(body, body.density * body.area);

            // Orient vertices around the center of mass at origin
            const centroid = Vertex.Centroid(body.vertices);
            Vertex.TranslateInPlace(body.vertices, centroid, -1);

            // Update inertia while vertices are at origin
            Body.SetInertia(body, Body._inertiaScale * Vertex.Inertia(body.vertices, body.mass));

            // Translate to current position
            Vertex.TranslateInPlace(body.vertices, body.position);
            Bounds.Update(body.bounds, body.vertices, body.velocity);
        }

        static SetPosition(body: Body, pos: Vector) {
            const delta = Vector.SubToRef(pos, body.position);
            body.positionPrev.x += delta.x;
            body.positionPrev.y += delta.y;
        }

        static SetParts(body: Body, parts: Body[], autoHull?: boolean) {
            parts = parts.slice(0);

            // Ensure the first part is the parent body
            body.parts = [];
            body.parts.push(body);
            body.parent = body;

            for (let i = 0; i < parts.length; ++i) {
                const part = parts[i];
                if (part !== body) {
                    part.parent = body;
                    body.parts.push(part);
                }
            }

            if (body.parts.length === 1) return;

            autoHull = typeof autoHull !== 'undefined' ? autoHull : true;

            if (autoHull) {
                let verts: Vertex[] = [];
                for (let i = 0; i < parts.length; ++i) {
                    verts = verts.concat(parts[i].vertices);
                }

                Vertex.ClockwiseSortInPlace(verts);

                const hull = Vertex.Hull(verts);
                const hullCenter = Vertex.Centroid(hull);

                Body.SetVertices(body, hull);
                Vertex.TranslateInPlace(body.vertices, hullCenter);
            }

            const total = Body.SumPhysProperties(body);

            body.area = total.area;
            body.parent = body;
            body.position.x = total.center.x;
            body.position.y = total.center.y;
            body.positionPrev.x = total.center.x;
            body.positionPrev.y = total.center.y;

            Body.SetMass(body, total.mass);
            Body.SetInertia(body, total.inertia);
            Body.SetPosition(body, total.center);
        }

        static SumPhysProperties(body: Body): PhysProperties {
            const properties: PhysProperties = {
                mass: 0,
                area: 0,
                inertia: 0,
                center: new Vector()
            };

            for (let i = body.parts.length === 1 ? 0 : 1; i < body.parts.length; ++i) {
                const part = body.parts[i];
                const mass = part.mass !== Infinity ? part.mass : 1;

                properties.mass += mass;
                properties.area += part.area;
                properties.inertia += part.inertia;
                properties.center = Vector.AddToRef(properties.center, Vector.MulToRef(part.position, mass));
            }

            properties.center = Vector.DivToRef(properties.center, properties.mass);

            return properties;
        }

        static SetStatic(body: Body, isStatic: boolean) {
            for (let i = 0; i < body.parts.length; ++i) {
                const part = body.parts[i];

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

        static SetSleeping(body: Body, isSleeping: boolean) {
            Sleeping.set(body, isSleeping);
        }
    }

}
