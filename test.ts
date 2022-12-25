// tests go here; this will not be compiled when this package is used as an extension.

const runner = new contraption.Runner();
const engine = new contraption.Engine();

runner.start(engine);

const bodyA = new contraption.Body();
const bodyB = new contraption.Body();

engine.world.addBody(bodyA);
engine.world.addBody(bodyB);
