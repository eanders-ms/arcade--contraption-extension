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

        // @returns `stop` method
        start(engine: Engine): () => void {
            const tick = () => this.tick(engine);
            const updateCb = control.eventContext().registerFrameHandler(scene.PHYSICS_PRIORITY, () => this.tick(engine));
            const renderCb = control.eventContext().registerFrameHandler(scene.RENDER_SPRITES_PRIORITY, () => this.render(engine));
            return () => {
                control.eventContext().unregisterFrameHandler(updateCb);
                control.eventContext().unregisterFrameHandler(renderCb);
            }
        }

        tick(engine: Engine) {
            const time = Common.now();

            let delta: number;
            let correction: number;
            let timing = engine.timing;

            if (this.isFixed) {
                delta = this.delta;
            } else {
                delta = (time - this.timePrev) || this.delta;
                this.timePrev = time;

                this.deltaHistory.push(delta);
                this.deltaHistory = this.deltaHistory.slice(-this.deltaSampleSize);
                delta = this.deltaHistory.reduce((p, c) => Math.min(p, c), Infinity);

                delta = delta < this.deltaMin ? this.deltaMin : delta;
                delta = delta > this.deltaMax ? this.deltaMax : delta;

                correction = delta / this.delta;

                this.delta = delta;
            }

            if (this.timeScalePrev !== 0)
                correction *= timing.timeScale / this.timeScalePrev;

            if (timing.timeScale === 0)
                correction = 0;

            this.timeScalePrev = timing.timeScale;
            this.correction = correction;

            this.frameCounter += 1;
            if (time - this.counterTimestamp >= 1000) {
                this.fps = this.frameCounter * ((time - this.counterTimestamp) / 1000);
                this.counterTimestamp = time;
                this.frameCounter = 0;
            }

            engine.update(delta, correction);
        }

        render(engine: Engine) {
            const bodies = engine.world.allBodies();

            for (let i = 0; i < bodies.length; ++i) {
                const body = bodies[i];
                const vertices = body.vertices;

                let color = body.isStatic ? 6 : 5;

                for (let j = 0; j < vertices.length; ++j) {
                    const vertA = vertices[j];
                    const vertB = vertices[(j + 1) % vertices.length];

                    screen.drawLine(vertA.x, vertA.y, vertB.x, vertB.y, color);
                }
            }
        }
    }
}
