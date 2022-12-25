namespace contraption {
    export class Sleeping {

        static _motionWakeThreshold = 0.18;
        static _motionSleepThreshold = 0.08;
        static _minBias = 0.9;

        static Set(body: Body, isSleeping: boolean) {
            const wasSleeping = body.isSleeping;

            if (isSleeping) {
                body.isSleeping = true;
                body.sleepCounter = body.sleepThreshold;

                body.positionImpulse.set(0, 0);
                body.positionPrev.set(body.position.x, body.position.y);
                body.velocity.set(0, 0);

                body.anglePrev = body.angle;
                body.speed = 0;
                body.angularSpeed = 0;
                body.angularVelocity = 0;

                if (!wasSleeping) {
                    Events.trigger(body, 'sleepStart');
                }
            } else {
                body.isSleeping = false;
                body.sleepCounter = 0;

                if (wasSleeping) {
                    Events.trigger(body, 'sleepEnd');
                }
            }
        }

        static Update(bodies: Body[], timeScale: number) {
            const timeFactor = timeScale * timeScale * timeScale;

            // update bodies sleeping status
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i],
                    motion = body.speed * body.speed + body.angularSpeed * body.angularSpeed;

                // wake up bodies if they have a force applied
                if (body.force.x !== 0 || body.force.y !== 0) {
                    Sleeping.Set(body, false);
                    continue;
                }

                const minMotion = Math.min(body.motion, motion),
                    maxMotion = Math.max(body.motion, motion);

                // biased average motion estimation between frames
                body.motion = Sleeping._minBias * minMotion + (1 - Sleeping._minBias) * maxMotion;

                if (body.sleepThreshold > 0 && body.motion < Sleeping._motionSleepThreshold * timeFactor) {
                    body.sleepCounter += 1;

                    if (body.sleepCounter >= body.sleepThreshold)
                        Sleeping.Set(body, true);
                } else if (body.sleepCounter > 0) {
                    body.sleepCounter -= 1;
                }
            }
        }

        static AfterCollisions(pairs: Pair[], timeScale: number) {
            const timeFactor = timeScale * timeScale * timeScale;

            // wake up bodies involved in collisions
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];

                // don't wake inactive pairs
                if (!pair.isActive)
                    continue;

                const collision = pair.collision,
                    bodyA = collision.bodyA.parent,
                    bodyB = collision.bodyB.parent;

                // don't wake if at least one body is static
                if ((bodyA.isSleeping && bodyB.isSleeping) || bodyA.isStatic || bodyB.isStatic)
                    continue;

                if (bodyA.isSleeping || bodyB.isSleeping) {
                    const sleepingBody = (bodyA.isSleeping && !bodyA.isStatic) ? bodyA : bodyB,
                        movingBody = sleepingBody === bodyA ? bodyB : bodyA;

                    if (!sleepingBody.isStatic && movingBody.motion > Sleeping._motionWakeThreshold * timeFactor) {
                        Sleeping.Set(sleepingBody, false);
                    }
                }
            }
        }
    }
}
