namespace contraption {

    export interface RunnerOptions {
        fps?: number;
        isFixed?: boolean;
    };

    export class Runner {

        fps: number;
        delta: number;
        deltaMin: number;
        deltaMax: number;
        correction: number;
        deltaSampleSize: number;
        counterTimestamp: number;
        frameCounter: number;
        deltaHistory: number[];
        timePrev: number;
        timeScalePrev: number;
        isFixed: boolean;
        enabled: boolean;

        constructor(options?: RunnerOptions) {
            options = options || {};
            options.fps = options.fps || 60;
            options.isFixed = options.isFixed || false;

            this.fps = options.fps;
            this.isFixed = options.isFixed;

            this.delta = 1000 / this.fps;
            this.deltaMin = this.delta;
            this.deltaMax = 1000 / (this.fps * 0.5);

            this.correction = 1;
            this.deltaSampleSize = 60;
            this.counterTimestamp = 0;
            this.frameCounter = 0;
            this.deltaHistory = [];
            this.timePrev = null;
            this.timeScalePrev = 1;
            this.enabled = true;
        }

        static Start(runner: Runner, engine: Engine) {

        }

        static Stop(runner: Runner) {

        }

        static Tick(runner: Runner, engine: Engine, time: number) {
            let delta: number;
            let correction: number;
            let timing = engine.timing;

            if (runner.isFixed) {
                delta = runner.delta;
            } else {
                delta = (time - runner.timePrev) || runner.delta;
                runner.timePrev = time;

                runner.deltaHistory.push(delta);
                runner.deltaHistory = runner.deltaHistory.slice(-runner.deltaSampleSize);
                delta = runner.deltaHistory.reduce((p, c) => Math.min(p, c), Infinity);

                delta = delta < runner.deltaMin ? runner.deltaMin : delta;
                delta = delta > runner.deltaMax ? runner.deltaMax : delta;

                correction = delta / runner.delta;

                runner.delta = delta;
            }

            if (runner.timeScalePrev !== 0)
                correction *= timing.timeScale / runner.timeScalePrev;

            if (timing.timeScale === 0)
                correction = 0;

            runner.timeScalePrev = timing.timeScale;
            runner.correction = correction;

            runner.frameCounter += 1;
            if (time - runner.counterTimestamp >= 1000) {
                runner.fps = runner.frameCounter * ((time - runner.counterTimestamp) / 1000);
                runner.counterTimestamp = time;
                runner.frameCounter = 0;
            }

            Engine.Update(engine, delta, correction);
        }

    }

}