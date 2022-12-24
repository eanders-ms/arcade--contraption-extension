namespace contraption {
    export class Pair {
        id: number;
        bodyA: Body;
        bodyB: Body;
        collision: Collision;
        contacts: Contact[];
        activeContacts: Contact[];
        separation: number;
        isActive: boolean;
        confirmedActive: boolean;
        isSensor: boolean;
        timeCreated: number;
        timeUpdated: number;
        inverseMass: number;
        friction: number;
        frictionStatic: number;
        restitution: number;
        slop: number;

        constructor(collision: Collision, timestamp: number) {
            const bodyA = collision.bodyA;
            const bodyB = collision.bodyB;
            this.id = Pair.Id(bodyA, bodyB);
            this.bodyA = bodyA;
            this.bodyB = bodyB;
            this.collision = collision;
            this.contacts = [];
            this.activeContacts = [];
            this.separation = 0;
            this.isActive = true;
            this.confirmedActive = true;
            this.isSensor = bodyA.isSensor || bodyB.isSensor;
            this.timeCreated = timestamp;
            this.timeUpdated = timestamp;
            this.inverseMass = 0;
            this.friction = 0;
            this.frictionStatic = 0;
            this.restitution = 0;
            this.slop = 0;

            this.update(collision, timestamp);
        }

        update(collision: Collision, timestamp: number) {
            let contacts = this.contacts;
            let supports = collision.supports;
            let activeContacts = this.activeContacts;
            let parentA = collision.parentA;
            let parentB = collision.parentB;
            let parentAVerticesLength = parentA.vertices.length;

            this.isActive = true;
            this.timeUpdated = timestamp;
            this.collision = collision;
            this.separation = collision.depth;
            this.inverseMass = parentA.inverseMass + parentB.inverseMass;
            this.friction = parentA.friction < parentB.friction ? parentA.friction : parentB.friction;
            this.frictionStatic = parentA.frictionStatic > parentB.frictionStatic ? parentA.frictionStatic : parentB.frictionStatic;
            this.restitution = parentA.restitution > parentB.restitution ? parentA.restitution : parentB.restitution;
            this.slop = parentA.slop > parentB.slop ? parentA.slop : parentB.slop;

            collision.pair = this;
            this.activeContacts = activeContacts = [];

            for (let i = 0; i < supports.length; ++i) {
                const support = supports[i];
                const contactId = support.body === parentA ? support.index : parentAVerticesLength + support.index;
                const contact = contacts[contactId];

                if (contact) {
                    activeContacts.push(contact);
                } else {
                    activeContacts.push(contacts[contactId] = new Contact(support));
                }
            }
        }

        static Id(bodyA: Body, bodyB: Body): number {
            if (bodyA.id < bodyB.id) {
                return 'A' + bodyA.id + 'B' + bodyB.id;
            } else {
                return 'A' + bodyB.id + 'B' + bodyA.id;
            }
        }
    }
}
