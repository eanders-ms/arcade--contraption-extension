namespace contraption {
    export interface EngineOptions {
        positionIterations?: number;
        velocityIterations?: number;
        constraintIterations?: number;
        enableSleeping?: boolean;
        gravity?: Gravity;
        world?: World;
        pairs?: Pairs;
        detector?: Detector;
    };

    export class Gravity extends Vector {
        constructor(x: number, y: number, public scale: number) {
            super(x, y);
        }
    }

    export interface Timing {
        timestamp: number;
        timeScale: number;
        lastDelta: number;
        lastElapsed: number;
    }

    export class Engine {
        positionIterations: number;
        velocityIterations: number;
        constraintIterations: number;
        enableSleeping: boolean;
        //events: []
        gravity: Gravity;
        timing: Timing;
        world: World;
        pairs: Pairs;
        detector: Detector;

        constructor(options?: EngineOptions) {
            options = options || {};

            options.positionIterations = options.positionIterations || 6;
            options.velocityIterations = options.velocityIterations || 4;
            options.constraintIterations = options.constraintIterations || 2;
            options.enableSleeping = options.enableSleeping || false;
            options.gravity = options.gravity || new Gravity(0, 1, 0.001);
            options.world = options.world || new World();
            options.pairs = options.pairs || new Pairs();
            options.detector = options.detector || new Detector();

            this.positionIterations = options.positionIterations;
            this.velocityIterations = options.velocityIterations;
            this.constraintIterations = options.constraintIterations;
            this.enableSleeping = options.enableSleeping;
            this.gravity = options.gravity;
            this.world = options.world;
            this.pairs = options.pairs;
            this.detector = options.detector;

            this.timing = {
                timestamp: 0,
                timeScale: 1,
                lastDelta: 0,
                lastElapsed: 0
            };
        }

        update(delta?: number, correction?: number): this {
            const startTime = Common.now();

            delta = delta || 1000 / 60;
            correction = correction || 1;

            const world = this.world;
            const detector = this.detector;
            const pairs = this.pairs;
            const timing = this.timing;
            const timestamp = timing.timestamp;

            timing.timestamp += delta * timing.timeScale;
            timing.lastDelta = delta * timing.timeScale;

            // Events.trigger(this, 'beforeUpdate', event);

            // Get all bodies and all constraints in the world
            const allBodies = world.allBodies();
            const allConstraints = world.allConstraints();

            // Update the detector bodies if they have changed
            if (world.isModified) {
                detector.setBodies(allBodies);
            }

            // reset all composite modified flags
            if (world.isModified) {
                world.setModified(false, false, true);
            }

            // Update sleeping if enabled
            if (this.enableSleeping) {
                Sleeping.Update(allBodies, timing.timeScale);
            }

            // Apply gravity to all bodies
            Engine.BodiesApplyGravity(allBodies, this.gravity);

            // Update all body position and rotation by integration
            Engine.BodiesUpdate(allBodies, delta, timing.timeScale, correction);

            // Update all constraints (first pass)
            Constraint.PreSolveAll(allBodies);
            for (let i = 0; i < this.constraintIterations; ++i) {
                Constraint.SolveAll(allConstraints, timing.timeScale);
            }
            Constraint.PostSolveAll(allBodies);

            // Find all collisions
            detector.pairs = this.pairs;
            const collisions = detector.collisions();

            // Update collision Pairs
            pairs.update(collisions, timestamp);

            // Wake up bodies involved in collisions
            if (this.enableSleeping) {
                Sleeping.AfterCollisions(pairs.list, timing.timeScale);
            }

            // Trigger collision events
            if (pairs.collisionStart.length > 0) {
                // Events.trigger(this, 'collisionStart, { pairs: pairs.collisionStart })
            }

            // Iteratively resolve position between collisions
            Resolver.PreSolvePosition(pairs.list);
            for (let i = 0; i < this.positionIterations; ++i) {
                Resolver.SolvePosition(pairs.list, timing.timeScale);
            }
            Resolver.PostSolvePosition(allBodies);

            // Update all constraints (second pass)
            Constraint.PreSolveAll(allBodies);
            for (let i = 0; i < this.constraintIterations; ++i) {
                Constraint.SolveAll(allConstraints, timing.timeScale);
            }
            Constraint.PostSolveAll(allBodies);

            // Iteratively resolve velocity between collisions
            Resolver.PreSolveVelocity(pairs.list);
            for (let i = 0; i < this.velocityIterations; i++) {
                Resolver.SolveVelocity(pairs.list, timing.timeScale);
            }

            // Trigger collision events
            if (pairs.collisionActive.length > 0) {
                // Events.trigger(this, 'collisionActive', { pairs: pairs.collisionActive });
            }
            if (pairs.collisionEnd.length > 0) {
                // Events.trigger(this, 'collisionEnd', { pairs: pairs.collisionEnd });
            }

            // Clear force buffers
            Engine.BodiesClearForces(allBodies);

            // Events.trigger(this, 'afterUpdate', event);

            // Log the time elapsed computing this update
            this.timing.lastElapsed = Common.now() - startTime;

            return this;
        }

        static BodiesApplyGravity(bodies: Body[], gravity: Gravity) {
            const gravityScale = typeof gravity.scale !== 'undefined' ? gravity.scale : 0.001;

            if ((gravity.x === 0 && gravity.y === 0) || gravityScale === 0) {
                return;
            }

            for (let i = 0; i < bodies.length; ++i) {
                const body = bodies[i];

                if (body.isStatic || body.isSleeping)
                    continue;

                // apply gravity
                body.force.y += body.mass * gravity.y * gravityScale;
                body.force.x += body.mass * gravity.x * gravityScale;
            }
        }

        static BodiesUpdate(bodies: Body[], deltaTime: number, timeScale: number, correction: number) {
            for (let i = 0; i < bodies.length; ++i) {
                const body = bodies[i];

                if (body.isStatic || body.isSleeping)
                    continue;

                body.update(deltaTime, timeScale, correction);
            }
        }

        static BodiesClearForces(bodies: Body[]) {
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];

                // reset force buffers
                body.force.x = 0;
                body.force.y = 0;
                body.torque = 0;
            }
        }
    }
}
