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
        mass?: number;
        inertia?: number;
    }

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

        constructor(options: BodyCreateOptions) {
            options = options || {};

            this.angle = options.angle || 0;
            this.vertices = options.vertices || Vertex.FromPath("L 0 0 L 40 0 L 40 40 L 0 40");
            this.position = options.position || new Vector();
            this.isStatic = options.isStatic || false;
            this.mass = options.mass || 0;
            this.inverseMass = this.mass ? 1 / this.mass : Infinity;
            this.inertia = options.inertia || 0;
            this.inverseInertia = 0; this.inertia ? 1 / this.inertia : Infinity;

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

            Vertex.RotateInPlace(this.vertices, this.angle, this.position);
            Axes.RotateInPlace(this.axes, this.angle);
            Bounds.Update(this.bounds, this.vertices, this.velocity);
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

    }

}
