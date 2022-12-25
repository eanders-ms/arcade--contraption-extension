namespace contraption {
    export class Pairs {
        table: any;
        list: Pair[];
        collisionStart: Pair[];
        collisionEnd: Pair[];
        collisionActive: Pair[];

        constructor() {
            this.table = {};
            this.list = [];
            this.collisionStart = [];
            this.collisionEnd = [];
            this.collisionActive = [];
        }

        update(collisions: Collision[], timestamp: number) {
            let pairsList = this.list,
                pairsListLength = pairsList.length,
                pairsTable = this.table,
                collisionsLength = collisions.length,
                collisionStart = this.collisionStart,
                collisionEnd = this.collisionEnd,
                collisionActive = this.collisionActive,
                collision: Collision,
                pairIndex: number,
                pair: Pair,
                i: number;

            // clear collision state arrays, but maintain old reference
            collisionStart.length = 0;
            collisionEnd.length = 0;
            collisionActive.length = 0;

            for (i = 0; i < pairsListLength; i++) {
                pairsList[i].confirmedActive = false;
            }

            for (i = 0; i < collisionsLength; i++) {
                collision = collisions[i];
                pair = collision.pair;

                if (pair) {
                    // pair already exists (but may or may not be active)
                    if (pair.isActive) {
                        // pair exists and is active
                        collisionActive.push(pair);
                    } else {
                        // pair exists but was inactive, so a collision has just started again
                        collisionStart.push(pair);
                    }

                    // update the pair
                    pair.update(collision, timestamp);
                    pair.confirmedActive = true;
                } else {
                    // pair did not exist, create a new pair
                    pair = new Pair(collision, timestamp);
                    pairsTable[pair.id] = pair;

                    // push the new pair
                    collisionStart.push(pair);
                    pairsList.push(pair);
                }
            }

            // find pairs that are no longer active
            let removePairIndex: number[] = [];
            pairsListLength = pairsList.length;

            for (i = 0; i < pairsListLength; i++) {
                pair = pairsList[i];

                if (!pair.confirmedActive) {
                    pair.setActive(false, timestamp);
                    collisionEnd.push(pair);

                    if (!pair.collision.bodyA.isSleeping && !pair.collision.bodyB.isSleeping) {
                        removePairIndex.push(i);
                    }
                }
            }

            // remove inactive pairs
            for (i = 0; i < removePairIndex.length; i++) {
                pairIndex = removePairIndex[i] - i;
                pair = pairsList[pairIndex];
                pairsList.splice(pairIndex, 1);
                delete pairsTable[pair.id];
            }
        }

        clear(): this {
            this.table = {};
            this.list = [];
            this.collisionStart = [];
            this.collisionEnd = [];
            this.collisionActive = [];
            return this;
        }
    }
}