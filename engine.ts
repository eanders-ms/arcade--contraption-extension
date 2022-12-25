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

        update(delta?: number, correction?: number) {
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

            const allBodies = world.allBodies();
            const allConstraints = world.allConstraints();

            if (world.isModified) {
                detector.setBodies(allBodies);
            }

            if (world.isModified) {
                world.setModified(false, false, true);
            }

            if (this.enableSleeping) {
                Sleeping.update(allBodies, timing.timeScale);
            }

            Engine.BodiesApplyGravity(allBodies, this.gravity);
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

        static BodiesUpdate(bodies: Body[], deltaTime: number, timeScale: number, correction: number, worldBounds: Bounds) {
            for (let i = 0; i < bodies.length; ++i) {
                const body = bodies[i];

                if (body.isStatic || body.isSleeping)
                    continue;

                body.update(deltaTime, timeScale, correction);
            }
        };
    }
}
