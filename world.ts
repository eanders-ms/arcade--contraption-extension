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

        static SetModified(world: World, isModified: boolean, updateParents: boolean, updateChildren: boolean) {
            world.isModified = isModified;

            if (isModified && world.cache) {
                world.cache.allBodies = null;
                world.cache.allConstraints = null;
                world.cache.allWorlds = null;
            }

            if (updateParents && world.parent) {
                // TODO
            }

            if (updateChildren) {
                // TODO
            }
        }

        static AddBody(world: World, body: Body): World {
            world.bodies.push(body);
            World.SetModified(world, true, true, false);            
            return world;
        }

        static RemoveBody(world: World, body: Body, deep?: boolean): World {
            const index = world.bodies.indexOf(body);
            if (index !== -1) {
                World.RemoveBodyAt(world, index);
            }

            if (deep) {
                // TODO, recurse into children
            }

            return world;
        }

        static RemoveBodyAt(world: World, index: number): World {
            world.bodies.splice(index, 1);
            World.SetModified(world, true, true, false);
            return world;
        }


        
    }
}