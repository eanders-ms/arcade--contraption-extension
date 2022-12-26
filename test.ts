// tests go here; this will not be compiled when this package is used as an extension.
game.stats = true;

const runner = new contraption.Runner();
const engine = new contraption.Engine({
    enableSleeping: false
});

runner.start(engine);

for (let x = 12; x < screen.width - 20; x += 12) {
    for (let y = -60; y < screen.height / 3; y += 12) {
        if (Math.random() > 0.5) {
            const body = contraption.Bodies.CreateRectangle(x, y, 10, 10, { restitution: 0.25 });
            engine.world.addBody(body);
        } else {
            const body = contraption.Bodies.CreateCircle(x, y, 5, { restitution: 0.25 });
            engine.world.addBody(body);
        }
    }
}
const ground = contraption.Bodies.CreateRectangle(0, screen.height + 10, screen.width * 4, 50, { isStatic: true });
const wallA = contraption.Bodies.CreateRectangle(0, screen.height / 3, 10, screen.height + 10, { isStatic: true });
const wallB = contraption.Bodies.CreateRectangle(screen.width - 5, screen.height / 3, 10, screen.height + 10, { isStatic: true });

engine.world.addBody(ground);
engine.world.addBody(wallA);
engine.world.addBody(wallB);
