import test from 'node:test';
import assert from 'node:assert/strict';
import { Prediction } from '../src/client/prediction.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { attachedLineworkFixture, lineworkFixture } from './helpers/heavy-linework-fixture.ts';
const near = (a: number, b: number) => assert(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
function apply(
  f: ReturnType<typeof lineworkFixture>,
  prediction: Prediction,
  props: Partial<InputFrame>,
  view = viewOf(f.g, f.p.id),
  ack = true,
) {
  if (ack) prediction.acknowledge(view, f.p.id);
  const original = structuredClone(view.players.find((p) => p.id === f.p.id)!),
    input = {
      ...idleInput(),
      aim: f.aim,
      ...props,
      sequence: f.p.ack + 1,
      clientTick: f.g.combatTick,
    };
  prediction.submit(input, view);
  f.step(props);
  near(prediction.player!.x, f.p.x);
  near(prediction.player!.y, f.p.y);
  assert.deepEqual(
    view.players.find((p) => p.id === f.p.id),
    original,
    'Received view must remain immutable',
  );
  assert.equal(prediction.player!.ammo, original.ammo, 'Client cannot pay or predict a round');
  return view;
}
for (const mode of ['bare', 'yoke', 'sheave'])
  test(
    mode +
      ' whole source prediction follows actual engage/steering/paid-primary movement from acknowledged line state',
    () => {
      const f = attachedLineworkFixture(mode),
        prediction = new Prediction(),
        tangent = { moveX: -Math.sin(f.aim), moveY: Math.cos(f.aim) };
      for (let n = 0; n < 12; n++) {
        apply(f, prediction, {
          ...tangent,
          aim: f.aim + Math.PI / 2,
          technique2: n === 0,
          fire: true,
        });
        assert.equal(prediction.player!.kit.lineworkActive, f.status().lineworkActive);
        assert.equal(prediction.player!.kit.lineworkUntil, f.status().lineworkUntil);
      }
    },
  );
for (const action of ['dodge', 'reload', 'ultimate', 'q'] as const)
  for (const admitted of [false, true])
    test(
      (admitted ? 'admitted ' : 'rejected ') +
        action +
        ' retains the actual same-step motor movement and post-move interruption authority',
      () => {
        const f = attachedLineworkFixture(),
          prediction = new Prediction();
        f.step({ technique2: true });
        if (!admitted) {
          if (action === 'dodge') {
            f.p.dodgeAt = f.g.combatTick + 1000;
            f.p.dodgeCharges = 0;
          }
          if (action === 'reload') f.p.ammo = f.g.stats(f.p).magazine;
          if (action === 'ultimate') f.p.ultimateAt = f.g.combatTick + 1000;
          if (action === 'q') f.p.qAt = f.g.combatTick + 1000;
        }
        apply(f, prediction, { [action]: true });
        assert.equal(prediction.player!.kit.lineworkUntil, f.status().lineworkUntil);
        assert.equal(prediction.player!.kit.lineworkActive, f.status().lineworkActive);
      },
    );
test('simultaneous separateC/B predicts this actual movement step before the irreversible release, never a new anchor', () => {
  const f = attachedLineworkFixture(),
    prediction = new Prediction();
  f.step({ technique2: true });
  const at = { x: f.p.x, y: f.p.y };
  apply(f, prediction, { technique1: true, technique2: true });
  assert(Math.hypot(f.p.x - at.x, f.p.y - at.y) > 0);
  assert.equal(prediction.player!.kit.lineworkUntil, 0);
  assert.equal(f.status().lineworkUntil, 0);
});
test('pending known engage/brake/reengage commands replay without mutating the received line or banking a new clock', () => {
  const f = attachedLineworkFixture('yoke'),
    prediction = new Prediction(),
    view = viewOf(f.g, f.p.id),
    original = structuredClone(view);
  prediction.acknowledge(view, f.p.id);
  const recovery = f.status().lineworkRecovery;
  for (const props of [
    { technique2: true, moveX: 0.3 },
    { moveY: 1 },
    { technique2: true, moveY: 1 },
    { technique2: true, moveX: -0.2 },
  ])
    apply(f, prediction, props, view, false);
  assert.deepEqual(view, original);
  assert.equal(prediction.player!.kit.lineworkRecovery, recovery);
  prediction.acknowledge(viewOf(f.g, f.p.id), f.p.id);
  near(prediction.player!.x, f.p.x);
  near(prediction.player!.y, f.p.y);
});
test('a new anchor or attachment is never invented from local input before acknowledgement', () => {
  const f = lineworkFixture('bare', 3),
    prediction = new Prediction();
  apply(f, prediction, { technique1: true });
  assert.equal(prediction.player!.kit.lineworkFlight, 0);
  assert.equal(prediction.player!.kit.lineworkConnection, undefined);
  assert(f.status().lineworkFlight > 0);
  prediction.acknowledge(viewOf(f.g, f.p.id), f.p.id);
  assert.equal(prediction.player!.kit.lineworkFlight, f.status().lineworkFlight);
});
test('known real temporary-construct geometry clears predicted work before movement without editing the acknowledged kit', () => {
  const f = attachedLineworkFixture(),
    prediction = new Prediction(),
    anchor = f.status().lineworkAnchor;
  f.g.classKits.extraWall(f.p, f.g.kitContext(), {
    point: { x: (f.p.x + anchor.x) / 2, y: (f.p.y + anchor.y) / 2 },
    source: 'controlled-known-line-cover',
    health: 100,
    seconds: 4,
    halfSpan: 65,
  });
  assert.equal(f.g.classKits.constructs().length, 1);
  apply(f, prediction, { moveX: 0.2 });
  assert.equal(prediction.player!.kit.lineworkUntil, 0);
  assert.equal(f.status().lineworkUntil, 0);
});
test('pending repeated cone input respects the cooldown already admitted in prediction', () => {
  const f = attachedLineworkFixture(),
    prediction = new Prediction();
  f.step({ technique2: true });
  const view = viewOf(f.g, f.p.id);
  prediction.acknowledge(view, f.p.id);
  for (const props of [{ q: true }, { q: true, technique2: true }, {}]) {
    apply(f, prediction, props, view, false);
    assert.equal(prediction.player!.kit.lineworkActive, f.status().lineworkActive);
  }
});
test('pending admitted Braced Firing slows the next motor/body step under the same issued duration', () => {
  const f = attachedLineworkFixture(),
    prediction = new Prediction();
  f.step({ technique2: true });
  const view = viewOf(f.g, f.p.id);
  prediction.acknowledge(view, f.p.id);
  for (const props of [{ e: true }, { moveX: 0.25 }, { moveY: 0.25 }])
    apply(f, prediction, props, view, false);
});
test('known Braced Firing expiry restores ordinary motor speed across pending movement', () => {
  const f = attachedLineworkFixture(),
    prediction = new Prediction();
  f.step({ technique2: true });
  f.p.braceUntil = f.g.combatTick + 2;
  const view = viewOf(f.g, f.p.id);
  prediction.acknowledge(view, f.p.id);
  for (let n = 0; n < 3; n++) apply(f, prediction, {}, view, false);
});
test('acknowledging an unpredicted authoritative position corrects body/line state without creating a round', () => {
  const f = attachedLineworkFixture(),
    prediction = new Prediction(),
    view = viewOf(f.g, f.p.id);
  prediction.acknowledge(view, f.p.id);
  prediction.player!.x += 17;
  const ammo = f.p.ammo;
  prediction.acknowledge(viewOf(f.g, f.p.id), f.p.id);
  near(prediction.player!.x, f.p.x);
  near(prediction.player!.y, f.p.y);
  assert.equal(prediction.player!.ammo, ammo);
  assert.deepEqual(
    prediction.player!.kit.lineworkConnection,
    f.g.kitStatus(f.p.id).lineworkConnection,
  );
});
