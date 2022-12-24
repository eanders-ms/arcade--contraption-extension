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

        static Update(engine: Engine, delta: number, correction: number) {
            
        }
    }
}
