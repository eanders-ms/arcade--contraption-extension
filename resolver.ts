namespace contraption {
    export class Resolver {
        static _restingThresh = 4;
        static _restingThreshTangent = 8;
        static _positionDampen = 0.9;
        static _positionWarming = 0.8;
        static _frictionNormalMultiplier = 100;

        static PreSolvePosition(pairs: Pair[]) {
            // find total contacts on each body
            for (let i = 0; i < pairs.length; ++i) {
                const pair = pairs[i];

                if (!pair.isActive)
                    continue;

                const activeCount = pair.activeContacts.length;
                pair.collision.parentA.totalContacts += activeCount;
                pair.collision.parentB.totalContacts += activeCount;
            }
        }

        static SolvePosition(pairs: Pair[], timeScale: number) {
            // find impulses required to resolve penetration
            for (let i = 0; i < pairs.length; ++i) {
                const pair = pairs[i];

                if (!pair.isActive || pair.isSensor)
                    continue;

                const collision = pair.collision;
                const bodyA = collision.parentA;
                const bodyB = collision.parentB;
                const normal = collision.normal;

                // get current separation between body edges involved in collision
                pair.separation =
                    normal.x * (bodyB.positionImpulse.x + collision.penetration.x - bodyA.positionImpulse.x)
                    + normal.y * (bodyB.positionImpulse.y + collision.penetration.y - bodyA.positionImpulse.y);
            }

            for (let i = 0; i < pairs.length; ++i) {
                const pair = pairs[i];

                if (!pair.isActive || pair.isSensor)
                    continue;

                const collision = pair.collision;
                const bodyA = collision.parentA;
                const bodyB = collision.parentB;
                const normal = collision.normal;
                let positionImpulse = (pair.separation - pair.slop) * timeScale;

                if (bodyA.isStatic || bodyB.isStatic)
                    positionImpulse *= 2;

                if (!(bodyA.isStatic || bodyA.isSleeping)) {
                    const contactShare = Resolver._positionDampen / bodyA.totalContacts;
                    bodyA.positionImpulse.x += normal.x * positionImpulse * contactShare;
                    bodyA.positionImpulse.y += normal.y * positionImpulse * contactShare;
                }

                if (!(bodyB.isStatic || bodyB.isSleeping)) {
                    const contactShare = Resolver._positionDampen / bodyB.totalContacts;
                    bodyB.positionImpulse.x -= normal.x * positionImpulse * contactShare;
                    bodyB.positionImpulse.y -= normal.y * positionImpulse * contactShare;
                }
            }
        }

        static PostSolvePosition(bodies: Body[]) {
            for (let i = 0; i < bodies.length; ++i) {
                const body = bodies[i],
                    positionImpulse = body.positionImpulse,
                    positionImpulseX = positionImpulse.x,
                    positionImpulseY = positionImpulse.y,
                    velocity = body.velocity;

                // reset contact count
                body.totalContacts = 0;

                if (positionImpulseX !== 0 || positionImpulseY !== 0) {
                    // update body geometry
                    for (let j = 0; j < body.parts.length; ++j) {
                        const part = body.parts[j];
                        Vertex.TranslateInPlace(part.vertices, positionImpulse);
                        part.bounds.update(part.vertices, velocity);
                        part.position.x += positionImpulseX;
                        part.position.y += positionImpulseY;
                    }

                    // move the body without changing velocity
                    body.positionPrev.x += positionImpulseX;
                    body.positionPrev.y += positionImpulseY;

                    if (positionImpulseX * velocity.x + positionImpulseY * velocity.y < 0) {
                        // reset cached impulse if the body has velocity along it
                        positionImpulse.x = 0;
                        positionImpulse.y = 0;
                    } else {
                        // warm the next iteration
                        positionImpulse.x *= Resolver._positionWarming;
                        positionImpulse.y *= Resolver._positionWarming;
                    }
                }
            }
        }

        static PreSolveVelocity(pairs: Pair[]) {
            for (let i = 0; i < pairs.length; ++i) {
                const pair = pairs[i];

                if (!pair.isActive || pair.isSensor)
                    continue;

                const contacts = pair.activeContacts,
                    contactsLength = contacts.length,
                    collision = pair.collision,
                    bodyA = collision.parentA,
                    bodyB = collision.parentB,
                    normal = collision.normal,
                    tangent = collision.tangent;

                // resolve each contact
                for (let j = 0; j < contacts.length; ++j) {
                    const contact = contacts[j],
                        contactVertex = contact.vertex,
                        normalImpulse = contact.normalImpulse,
                        tangentImpulse = contact.tangentImpulse;

                    if (normalImpulse !== 0 || tangentImpulse !== 0) {
                        // total impulse from contact
                        const impulseX = normal.x * normalImpulse + tangent.x * tangentImpulse,
                            impulseY = normal.y * normalImpulse + tangent.y * tangentImpulse;

                        // apply impulse from contact
                        if (!(bodyA.isStatic || bodyA.isSleeping)) {
                            bodyA.positionPrev.x += impulseX * bodyA.inverseMass;
                            bodyA.positionPrev.y += impulseY * bodyA.inverseMass;
                            bodyA.anglePrev += bodyA.inverseInertia * (
                                (contactVertex.x - bodyA.position.x) * impulseY
                                - (contactVertex.y - bodyA.position.y) * impulseX
                            );
                        }

                        if (!(bodyB.isStatic || bodyB.isSleeping)) {
                            bodyB.positionPrev.x -= impulseX * bodyB.inverseMass;
                            bodyB.positionPrev.y -= impulseY * bodyB.inverseMass;
                            bodyB.anglePrev -= bodyB.inverseInertia * (
                                (contactVertex.x - bodyB.position.x) * impulseY
                                - (contactVertex.y - bodyB.position.y) * impulseX
                            );
                        }
                    }
                }
            }
        }

        static SolveVelocity(pairs: Pair[], timeScale: number) {
            const timeScaleSquared = timeScale * timeScale,
                restingThresh = Resolver._restingThresh * timeScaleSquared,
                frictionNormalMultiplier = Resolver._frictionNormalMultiplier,
                restingThreshTangent = Resolver._restingThreshTangent * timeScaleSquared,
                NumberMaxValue = Infinity,
                pairsLength = pairs.length;

            for (let i = 0; i < pairsLength; ++i) {
                const pair = pairs[i];

                if (!pair.isActive || pair.isSensor)
                    continue;

                const collision = pair.collision,
                    bodyA = collision.parentA,
                    bodyB = collision.parentB,
                    bodyAVelocity = bodyA.velocity,
                    bodyBVelocity = bodyB.velocity,
                    normalX = collision.normal.x,
                    normalY = collision.normal.y,
                    tangentX = collision.tangent.x,
                    tangentY = collision.tangent.y,
                    contacts = pair.activeContacts,
                    contactsLength = contacts.length,
                    contactShare = 1 / contactsLength,
                    inverseMassTotal = bodyA.inverseMass + bodyB.inverseMass,
                    friction = pair.friction * pair.frictionStatic * frictionNormalMultiplier * timeScaleSquared;

                // update body velocities
                bodyAVelocity.x = bodyA.position.x - bodyA.positionPrev.x;
                bodyAVelocity.y = bodyA.position.y - bodyA.positionPrev.y;
                bodyBVelocity.x = bodyB.position.x - bodyB.positionPrev.x;
                bodyBVelocity.y = bodyB.position.y - bodyB.positionPrev.y;
                bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
                bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

                // resolve each contact
                for (let j = 0; j < contactsLength; ++j) {
                    const contact = contacts[j],
                        contactVertex = contact.vertex;

                    const offsetAX = contactVertex.x - bodyA.position.x,
                        offsetAY = contactVertex.y - bodyA.position.y,
                        offsetBX = contactVertex.x - bodyB.position.x,
                        offsetBY = contactVertex.y - bodyB.position.y;

                    const velocityPointAX = bodyAVelocity.x - offsetAY * bodyA.angularVelocity,
                        velocityPointAY = bodyAVelocity.y + offsetAX * bodyA.angularVelocity,
                        velocityPointBX = bodyBVelocity.x - offsetBY * bodyB.angularVelocity,
                        velocityPointBY = bodyBVelocity.y + offsetBX * bodyB.angularVelocity;

                    const relativeVelocityX = velocityPointAX - velocityPointBX,
                        relativeVelocityY = velocityPointAY - velocityPointBY;

                    const normalVelocity = normalX * relativeVelocityX + normalY * relativeVelocityY,
                        tangentVelocity = tangentX * relativeVelocityX + tangentY * relativeVelocityY;

                    // coulomb friction
                    const normalOverlap = pair.separation + normalVelocity;
                    let normalForce = Math.min(normalOverlap, 1);
                    normalForce = normalOverlap < 0 ? 0 : normalForce;

                    const frictionLimit = normalForce * friction;

                    let tangentImpulse = 0;
                    let maxFriction = 0;

                    if (tangentVelocity > frictionLimit || -tangentVelocity > frictionLimit) {
                        const maxFriction = tangentVelocity > 0 ? tangentVelocity : -tangentVelocity;
                        tangentImpulse = pair.friction * (tangentVelocity > 0 ? 1 : -1) * timeScaleSquared;

                        if (tangentImpulse < -maxFriction) {
                            tangentImpulse = -maxFriction;
                        } else if (tangentImpulse > maxFriction) {
                            tangentImpulse = maxFriction;
                        }
                    } else {
                        tangentImpulse = tangentVelocity;
                        maxFriction = NumberMaxValue;
                    }

                    // account for mass, inertia and contact offset
                    const oAcN = offsetAX * normalY - offsetAY * normalX,
                        oBcN = offsetBX * normalY - offsetBY * normalX,
                        share = contactShare / (inverseMassTotal + bodyA.inverseInertia * oAcN * oAcN + bodyB.inverseInertia * oBcN * oBcN);

                    // raw impulses
                    let normalImpulse = (1 + pair.restitution) * normalVelocity * share;
                    tangentImpulse *= share;

                    // handle high velocity and resting collisions separately
                    if (normalVelocity * normalVelocity > restingThresh && normalVelocity < 0) {
                        // high normal velocity so clear cached contact normal impulse
                        contact.normalImpulse = 0;
                    } else {
                        // solve resting collision constraints using Erin Catto's method (GDC08)
                        // impulse constraint tends to 0
                        const contactNormalImpulse = contact.normalImpulse;
                        contact.normalImpulse += normalImpulse;
                        contact.normalImpulse = Math.min(contact.normalImpulse, 0);
                        normalImpulse = contact.normalImpulse - contactNormalImpulse;
                    }

                    // handle high velocity and resting collisions separately
                    if (tangentVelocity * tangentVelocity > restingThreshTangent) {
                        // high tangent velocity so clear cached contact tangent impulse
                        contact.tangentImpulse = 0;
                    } else {
                        // solve resting collision constraints using Erin Catto's method (GDC08)
                        // tangent impulse tends to -tangentSpeed or +tangentSpeed
                        const contactTangentImpulse = contact.tangentImpulse;
                        contact.tangentImpulse += tangentImpulse;
                        if (contact.tangentImpulse < -maxFriction) contact.tangentImpulse = -maxFriction;
                        if (contact.tangentImpulse > maxFriction) contact.tangentImpulse = maxFriction;
                        tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
                    }

                    // total impulse from contact
                    const impulseX = normalX * normalImpulse + tangentX * tangentImpulse,
                        impulseY = normalY * normalImpulse + tangentY * tangentImpulse;

                    // apply impulse from contact
                    if (!(bodyA.isStatic || bodyA.isSleeping)) {
                        bodyA.positionPrev.x += impulseX * bodyA.inverseMass;
                        bodyA.positionPrev.y += impulseY * bodyA.inverseMass;
                        bodyA.anglePrev += (offsetAX * impulseY - offsetAY * impulseX) * bodyA.inverseInertia;
                    }

                    if (!(bodyB.isStatic || bodyB.isSleeping)) {
                        bodyB.positionPrev.x -= impulseX * bodyB.inverseMass;
                        bodyB.positionPrev.y -= impulseY * bodyB.inverseMass;
                        bodyB.anglePrev -= (offsetBX * impulseY - offsetBY * impulseX) * bodyB.inverseInertia;
                    }
                }
            }
        }
    }
}
