namespace contraption {
    export class Detector {
        bodies: Body[];
        pairs: Pairs;

        constructor() {
            this.bodies = [];
            this.pairs = null;
        }

        setBodies(bodies: Body[]) {
            this.bodies = bodies.slice(0);
        }

        clear() {
            this.bodies = [];
        }

        collisions(): Collision[] {
            const collisions: Collision[] = [];

            // TODO

            return collisions;
        }
    }
}
