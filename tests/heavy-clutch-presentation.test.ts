import test from "node:test";
import assert from "node:assert/strict";
import { clutchPresentationFixture as fixture } from "./helpers/heavy-clutch-presentation-fixture.ts";
import { Prediction } from "../src/client/prediction.ts";
import { traversePredictedMotion } from "../src/client/heavy-traverse-prediction.ts";
import { SurvivorActionClock } from "../src/client/survivor-action-presentation.ts";
import { clutchId } from "../src/shared/heavy-traverse.ts";
import { idleInput } from "../src/shared/protocol.ts";
const near = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
test("Clutch prediction lifts on the same movement step, keeps known paid recoil and replants all three carriages without mutating its input view", () => {
  for (const mode of ["loose", "spade", "floating"] as const) {
    const f = fixture(mode);
    f.step({ technique1: true });
    const prediction = new Prediction(),
      view = f.view(),
      before = structuredClone(view.players[0].kit);
    prediction.acknowledge(view, f.p.id);
    for (let tick = 2; tick <= 7; tick++) {
      const input = f.frame({
        technique2: tick === 2 || tick === 6,
        moveY: tick < 6 || tick === 7 ? 1 : 0,
      });
      prediction.submit(input, view);
      assert(f.g.submitInput(f.p.id, input));
      f.g.step();
      near(prediction.player!.x, f.p.x);
      near(prediction.player!.y, f.p.y);
      assert.equal(prediction.player!.ammo, 44);
    }
    assert.deepEqual(view.players[0].kit, before);
    assert.equal(f.g.kitStatus(f.p.id).heavyClutchUsed, true);
    assert.equal(f.g.kitStatus(f.p.id).heavyClutchLifted, false);
  }
});
test("predicted C takes priority over B and releases walking while retaining the already paid recoil", () => {
  const f = fixture();
  f.step({ technique1: true });
  const prediction = new Prediction(),
    view = f.view();
  prediction.acknowledge(view, f.p.id);
  const input = f.frame({ technique1: true, technique2: true, moveY: 1 });
  prediction.submit(input, view);
  assert(f.g.submitInput(f.p.id, input));
  f.g.step();
  near(prediction.player!.x, f.p.x);
  near(prediction.player!.y, f.p.y);
  assert.equal(prediction.player!.kit.heavyTraverseUntil, 0);
  assert.equal(f.g.kitStatus(f.p.id).heavyClutchUsed, false);
  assert.equal(f.p.ammo, 44);
});
test("prediction cannot open and close a clutch on a repeated sequence or one tick and cannot lift twice", () => {
  const f = fixture();
  f.step({ technique1: true });
  const view = f.view(),
    p = structuredClone(view.players[0]),
    before = structuredClone(view.players[0].kit);
  const motion = (sequence: number, tick: number) =>
    traversePredictedMotion(
      p,
      { ...idleInput(), technique2: true, sequence },
      tick,
    );
  assert.equal(motion(2, 2).walk, 1);
  assert.equal(motion(2, 3).walk, 1);
  assert(p.kit.heavyClutchLifted);
  assert.equal(motion(3, 2).walk, 1);
  assert.equal(motion(3, 3).walk, 0);
  assert(!p.kit.heavyClutchLifted);
  assert.equal(motion(4, 4).walk, 0);
  assert.deepEqual(view.players[0].kit, before);
});
test("known-only Clutch prediction never invents skipped slots, future emissions, ammunition payments, recoil or recovery", () => {
  const f = fixture("floating");
  f.step({ technique1: true });
  f.step({ technique2: true });
  const p = structuredClone(f.view().players[0]),
    before = structuredClone(p.kit),
    ammo = p.ammo;
  for (let now = 3; now <= 31; now++) {
    const motion = traversePredictedMotion(
      p,
      { ...idleInput(), sequence: now },
      now,
    );
    assert.equal(motion.walk, 1);
    if (now > 5) assert.deepEqual({ x: motion.x, y: motion.y }, { x: 0, y: 0 });
    assert.equal(p.ammo, ammo);
  }
  assert.deepEqual(p.kit, before);
});
test("prediction rejects an unowned B and a moving Spade re-engagement but accepts a separate stationary replant", () => {
  const plain = fixture();
  plain.p.skills = plain.p.skills.filter((id) => id !== clutchId);
  plain.step({ technique1: true });
  const p = structuredClone(plain.view().players[0]);
  assert.equal(
    traversePredictedMotion(
      p,
      { ...idleInput(), sequence: 2, technique2: true, moveY: 1 },
      2,
    ).walk,
    0,
  );
  assert(!p.kit.heavyClutchUsed);
  const f = fixture("spade");
  f.step({ technique1: true });
  f.step({ technique2: true, moveY: 1 });
  const moved = structuredClone(f.view().players[0]);
  assert.equal(
    traversePredictedMotion(
      moved,
      { ...idleInput(), sequence: 3, technique2: true, moveY: 1 },
      3,
    ).walk,
    1,
  );
  assert(moved.kit.heavyClutchLifted);
  const post = { x: moved.x, y: moved.y };
  assert.equal(
    traversePredictedMotion(
      moved,
      { ...idleInput(), sequence: 4, technique2: true },
      4,
    ).walk,
    0,
  );
  assert.equal(moved.kit.heavyTraversePostX, post.x);
  assert.equal(moved.kit.heavyTraversePostY, post.y);
});
test("lost Clutch ownership cancels predicted retained work and dependent recoil while preserving earlier base recoil", () => {
  const first = fixture();
  first.step({ technique1: true });
  first.step({ technique2: true });
  const base = structuredClone(first.view().players[0]);
  base.skills = base.skills.filter((id) => id !== clutchId);
  const a = traversePredictedMotion(base, { ...idleInput(), sequence: 3 }, 3);
  assert.equal(a.walk, 1);
  assert(a.x < 0);
  assert.equal(base.kit.heavyTraverseUntil, 0);
  const later = fixture();
  later.step({ technique1: true });
  later.step({ technique2: true });
  later.step({ technique2: true });
  while (later.g.combatTick < 11) later.step();
  const dependent = structuredClone(later.view().players[0]);
  assert(dependent.kit.heavyTraverseShotRequiresClutch);
  dependent.skills = dependent.skills.filter((id) => id !== clutchId);
  assert.deepEqual(
    traversePredictedMotion(dependent, { ...idleInput(), sequence: 12 }, 12),
    { walk: 1, x: 0, y: 0 },
  );
  assert.equal(dependent.kit.heavyTraverseUntil, 0);
});
test("lift and re-engage sounds create no firing pose, new shot bearing or synthetic ammunition attack", () => {
  for (const aim of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const f = fixture("floating"),
      clock = new SurvivorActionClock();
    clock.observe(f.view());
    f.step({ technique1: true, aim });
    clock.observe(f.view());
    f.step({ technique2: true, aim });
    clock.observe(f.view());
    while (f.g.combatTick < 17) {
      f.step({ aim });
      clock.observe(f.view());
    }
    const before = f.g.kitStatus(f.p.id).heavyTraverseShotAt;
    f.step({ technique2: true, aim });
    let view = f.view();
    clock.observe(view);
    assert.equal(f.g.kitStatus(f.p.id).heavyTraverseShotAt, before);
    assert.notEqual(
      clock.pose(view.players[0], view, false, false)?.action,
      "attack",
    );
    f.step({ technique1: true, aim });
    view = f.view();
    clock.observe(view);
    view.players[0].ammo--;
    view.tick++;
    clock.observe(view);
    assert.notEqual(
      clock.pose(view.players[0], view, false, false)?.action,
      "attack",
    );
  }
});
