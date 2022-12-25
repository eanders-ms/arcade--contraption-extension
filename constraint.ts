namespace contraption {
    export interface ConstraintOptions {
        bodyA?: Body;
        bodyB?: Body;
        pointA?: Vector;
        pointB?: Vector;
        angleA?: number;
        angleB?: number;
        stiffness?: number;
        damping?: number;
        angularStiffness?: number;
    }

    export class Constraint {
        static _warming = 0.4;
        static _torqueDampen = 1;
        static _minLength = 0.000001;

        id: number;
        bodyA: Body;
        bodyB: Body;
        pointA: Vector;
        pointB: Vector;
        angleA: number;
        angleB: number
        length: number;
        stiffness: number;
        damping: number;
        angularStiffness: number;

        constructor(options: ConstraintOptions) {
            options = options || {};
            if (options.bodyA && !options.pointA)
                options.pointA = new Vector();
            if (options.bodyB && !options.pointB)
                options.pointB = new Vector();

            const initialPointA = options.bodyA ? Vector.AddToRef(options.bodyA.position, options.pointA) : options.pointA;
            const initialPointB = options.bodyB ? Vector.AddToRef(options.bodyB.position, options.pointB) : options.pointB;
            const length = Vector.Magnitude(Vector.SubToRef(initialPointA, initialPointB));

            this.length = length;

            this.id = Common.nextId();
            this.stiffness = options.stiffness || (this.length > 0 ? 1 : 0.7);
            this.damping = options.damping || 0;
            this.angularStiffness = options.angularStiffness || 0;
            this.angleA = options.bodyA ? options.bodyA.angle : options.angleA;
            this.angleB = options.bodyB ? options.bodyB.angle : options.angleB;
        }

        static PreSolveAll(bodies: Body[]) {
            for (let i = 0; i < bodies.length; ++i) {
                const body = bodies[i];
                const impulse = body.constraintImpulse;
                if (body.isStatic || (impulse.x === 0 && impulse.y === 0 && impulse.angle === 0))
                    continue;
                body.position.x += impulse.x;
                body.position.y += impulse.y;
                body.angle += impulse.angle;
            }
        }

        static SolveAll(constraints: Constraint[], timeScale: number) {
            // Solve fixed constraints first.
            for (let i = 0; i < constraints.length; i += 1) {
                const constraint = constraints[i];
                const fixedA = !constraint.bodyA || (constraint.bodyA && constraint.bodyA.isStatic);
                const fixedB = !constraint.bodyB || (constraint.bodyB && constraint.bodyB.isStatic);

                if (fixedA || fixedB) {
                    constraints[i].solve(timeScale);
                }
            }

            // Solve free constraints last.
            for (let i = 0; i < constraints.length; i += 1) {
                const constraint = constraints[i];
                const fixedA = !constraint.bodyA || (constraint.bodyA && constraint.bodyA.isStatic);
                const fixedB = !constraint.bodyB || (constraint.bodyB && constraint.bodyB.isStatic);

                if (!fixedA && !fixedB) {
                    constraints[i].solve(timeScale);
                }
            }
        }

        static PostSolveAll(bodies: Body[]) {
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                const impulse = body.constraintImpulse;

                if (body.isStatic || (impulse.x === 0 && impulse.y === 0 && impulse.angle === 0)) {
                    continue;
                }

                Sleeping.Set(body, false);

                // update geometry and reset
                for (let j = 0; j < body.parts.length; j++) {
                    const part = body.parts[j];

                    Vertex.TranslateInPlace(part.vertices, impulse);

                    if (j > 0) {
                        part.position.x += impulse.x;
                        part.position.y += impulse.y;
                    }

                    if (impulse.angle !== 0) {
                        Vertex.RotateInPlace(part.vertices, impulse.angle, body.position);
                        Axes.RotateInPlace(part.axes, impulse.angle);
                        if (j > 0) {
                            Vector.RotateAroundToRef(part.position, impulse.angle, body.position, part.position);
                        }
                    }

                    part.bounds.update(part.vertices, body.velocity);
                }

                // dampen the cached impulse for warming next step
                impulse.angle *= Constraint._warming;
                impulse.x *= Constraint._warming;
                impulse.y *= Constraint._warming;
            }
        }

        solve(timeScale: number) {
            const bodyA = this.bodyA;
            const bodyB = this.bodyB;
            const pointA = this.pointA;
            const pointB = this.pointB;

            if (!bodyA || !bodyB)
                return;

            if (bodyA && !bodyA.isStatic) {
                Vector.RotateToRef(pointA, bodyA.angle - this.angleA, pointA);
                this.angleA = bodyA.angle;
            }
            if (bodyB && !bodyB.isStatic) {
                Vector.RotateToRef(pointB, bodyB.angle - this.angleB, pointB);
                this.angleB = bodyB.angle;
            }

            let pointAWorld = pointA;
            let pointBWorld = pointB;

            if (bodyA) pointAWorld = Vector.AddToRef(bodyA.position, pointA);
            if (bodyB) pointBWorld = Vector.AddToRef(bodyB.position, pointB);

            if (!pointAWorld || !pointBWorld)
                return;

            let delta = Vector.SubToRef(pointAWorld, pointBWorld);
            let currentLength = Vector.Magnitude(delta);

            if (currentLength < Constraint._minLength) {
                currentLength = Constraint._minLength;
            }

            const difference = (currentLength - this.length) / currentLength;
            const stiffness = this.stiffness < 1 ? this.stiffness * timeScale : this.stiffness;
            const force = Vector.MulToRef(delta, difference * stiffness);
            const massTotal = (bodyA ? bodyA.inverseMass : 0) + (bodyB ? bodyB.inverseMass : 0);
            const inertiaTotal = (bodyA ? bodyA.inverseInertia : 0) + (bodyB ? bodyB.inverseInertia : 0);
            const resistanceTotal = massTotal + inertiaTotal;
            const normal = new Vector();
            const relativeVelocity = new Vector();
            let normalVelocity = 0;

            if (this.damping) {
                const zero = new Vector();
                Vector.DivToRef(delta, currentLength, normal);

                Vector.SubToRef(
                    bodyB && Vector.SubToRef(bodyB.position, bodyB.positionPrev) || zero,
                    bodyA && Vector.SubToRef(bodyA.position, bodyA.positionPrev) || zero,
                    relativeVelocity
                );

                normalVelocity = Vector.Dot(normal, relativeVelocity);
            }

            if (bodyA && !bodyA.isStatic) {
                const share = bodyA.inverseMass / massTotal;

                // keep track of applied impulses for post solving
                bodyA.constraintImpulse.x -= force.x * share;
                bodyA.constraintImpulse.y -= force.y * share;

                // apply forces
                bodyA.position.x -= force.x * share;
                bodyA.position.y -= force.y * share;

                // apply damping
                if (this.damping) {
                    bodyA.positionPrev.x -= this.damping * normal.x * normalVelocity * share;
                    bodyA.positionPrev.y -= this.damping * normal.y * normalVelocity * share;
                }

                // apply torque
                const torque = (Vector.Cross(pointA, force) / resistanceTotal) * Constraint._torqueDampen * bodyA.inverseInertia * (1 - this.angularStiffness);
                bodyA.constraintImpulse.angle -= torque;
                bodyA.angle -= torque;
            }

            if (bodyB && !bodyB.isStatic) {
                const share = bodyB.inverseMass / massTotal;

                // keep track of applied impulses for post solving
                bodyB.constraintImpulse.x += force.x * share;
                bodyB.constraintImpulse.y += force.y * share;

                // apply forces
                bodyB.position.x += force.x * share;
                bodyB.position.y += force.y * share;

                // apply damping
                if (this.damping) {
                    bodyB.positionPrev.x += this.damping * normal.x * normalVelocity * share;
                    bodyB.positionPrev.y += this.damping * normal.y * normalVelocity * share;
                }

                // apply torque
                const torque = (Vector.Cross(pointB, force) / resistanceTotal) * Constraint._torqueDampen * bodyB.inverseInertia * (1 - this.angularStiffness);
                bodyB.constraintImpulse.angle += torque;
                bodyB.angle += torque;
            }
        }

        pointAWorld(): Vector {
            return new Vector(
                (this.bodyA ? this.bodyA.position.x : 0)
                + (this.pointA ? this.pointA.x : 0),
                (this.bodyA ? this.bodyA.position.y : 0)
                + (this.pointA ? this.pointA.y : 0)
            );
        };

        pointBWorld(): Vector {
            return new Vector(
                (this.bodyB ? this.bodyB.position.x : 0)
                + (this.pointB ? this.pointB.x : 0),
                (this.bodyB ? this.bodyB.position.y : 0)
                + (this.pointB ? this.pointB.y : 0)
            );
        }
    }
}
