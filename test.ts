// tests go here; this will not be compiled when this package is used as an extension.

const runner = new contraption.Runner();
const engine = new contraption.Engine();

runner.start(engine);

const body = new contraption.Body();

engine.world.addBody(body);
