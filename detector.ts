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

        static CanCollide(filterA: CollisionFilter, filterB: CollisionFilter) {
            if (filterA.group === filterB.group && filterA.group !== 0)
                return filterA.group > 0;

            return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
        };

        collisions(): Collision[] {
            const collisions: Collision[] = [],
                pairs = this.pairs,
                bodies = this.bodies,
                bodiesLength = bodies.length;

            bodies.sort((bodyA, bodyB) => bodyA.bounds.min.x - bodyB.bounds.min.x);

            for (let i = 0; i < bodiesLength; ++i) {
                const bodyA = bodies[i],
                    boundsA = bodyA.bounds,
                    boundXMax = bodyA.bounds.max.x,
                    boundYMax = bodyA.bounds.max.y,
                    boundYMin = bodyA.bounds.min.y,
                    bodyAStatic = bodyA.isStatic || bodyA.isSleeping,
                    partsALength = bodyA.parts.length,
                    partsASingle = partsALength === 1;

                for (let j = i + 1; j < bodiesLength; ++j) {
                    const bodyB = bodies[j],
                        boundsB = bodyB.bounds;

                    if (boundsB.min.x > boundXMax) {
                        break;
                    }

                    if (boundYMax < boundsB.min.y || boundYMin > boundsB.max.y) {
                        continue;
                    }

                    if (bodyAStatic && (bodyB.isStatic || bodyB.isSleeping)) {
                        continue;
                    }

                    if (!Detector.CanCollide(bodyA.collisionFilter, bodyB.collisionFilter)) {
                        continue;
                    }

                    const partsBLength = bodyB.parts.length;

                    if (partsASingle && partsBLength === 1) {
                        const collision = Collision.Collides(bodyA, bodyB, pairs);

                        if (collision) {
                            collisions.push(collision);
                        }
                    } else {
                        const partsAStart = partsALength > 1 ? 1 : 0,
                            partsBStart = partsBLength > 1 ? 1 : 0;

                        for (let k = partsAStart; k < partsALength; ++k) {
                            const partA = bodyA.parts[k],
                                boundsA = partA.bounds;

                            for (let z = partsBStart; z < partsBLength; ++z) {
                                const partB = bodyB.parts[z],
                                    boundsB = partB.bounds;

                                if (boundsA.min.x > boundsB.max.x || boundsA.max.x < boundsB.min.x
                                    || boundsA.max.y < boundsB.min.y || boundsA.min.y > boundsB.max.y) {
                                    continue;
                                }

                                const collision = Collision.Collides(partA, partB, pairs);

                                if (collision) {
                                    collisions.push(collision);
                                }
                            }
                        }
                    }
                }
            }

            return collisions;
        }
    }
}
