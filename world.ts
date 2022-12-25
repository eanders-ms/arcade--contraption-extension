namespace contraption {
    export interface WorldOptions {

    }

    export class World {
        id: number;
        parent: World;
        isModified: boolean;
        bodies: Body[];
        constraints: Constraint[];
        worlds: World[];
        cache: {
            allBodies: Body[];
            allConstraints: Constraint[];
            allWorlds: World[];
        };

        constructor(options?: WorldOptions) {
            options = options || {};

            this.id = Common.nextId();
            this.parent = null;
            this.isModified = false;
            this.bodies = [];
            this.constraints = [];
            this.worlds = [];
            this.cache = {
                allBodies: null,
                allConstraints: null,
                allWorlds: null
            };
        }

        setModified(isModified: boolean, updateParents: boolean, updateChildren: boolean) {
            this.isModified = isModified;

            if (isModified && this.cache) {
                this.cache.allBodies = null;
                this.cache.allConstraints = null;
                this.cache.allWorlds = null;
            }

            if (updateParents && this.parent) {
                // TODO: update parent worlds
            }

            if (updateChildren) {
                // TODO: update child worlds
            }
        }

        addBody(body: Body): this {
            this.bodies.push(body);
            this.setModified(true, true, false);
            return this;
        }

        removeBody(body: Body, deep?: boolean): this {
            const index = this.bodies.indexOf(body);
            if (index !== -1) {
                this.removeBodyAt(index);
            }

            if (deep) {
                // TODO: recurse into children
            }

            return this;
        }

        removeBodyAt(index: number): this {
            this.bodies.splice(index, 1);
            this.setModified(true, true, false);
            return this;
        }

        allBodies(): Body[] {
            if (this.cache && this.cache.allBodies) {
                return this.cache.allBodies;
            }

            const bodies = [].concat(this.bodies);

            for (let i = 0; i < this.worlds.length; ++i) {
                // TODO: concat sub-world bodies
            }

            if (this.cache) {
                this.cache.allBodies = bodies;
            }

            return bodies;
        }
        
        allConstraints(): Constraint[] {
            if (this.cache && this.cache.allConstraints) {
                return this.cache.allConstraints;
            }

            const constraints = [].concat(this.constraints);

            for (let i = 0; i < this.worlds.length; ++i) {
                // TODO: concat sub-world constraints
            }

            if (this.cache) {
                this.cache.allConstraints = constraints;
            }

            return constraints;
        }
    }
}