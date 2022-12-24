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
            // TODO
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