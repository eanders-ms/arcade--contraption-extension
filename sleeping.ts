namespace contraption.Sleeping {

    let _motionWakeThreshhold = 0.18;
    let _motionSleepThreshold = 0.08;
    let _minBias = 0.9;

    export function update(bodies: Body[], timeScale: number) {

    }

    export function set(body: Body, isSleeping: boolean) {
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
}
