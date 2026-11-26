import test from "node:test";
import assert from "node:assert/strict";
import { handlingGameFixture as fixture } from "./helpers/heavy-clutch-handling-game-fixture.ts";
import { Prediction } from "../src/client/prediction.ts";
import { traversePredictedMotion } from "../src/client/heavy-traverse-prediction.ts";
import { viewOf } from "../src/shared/view.ts";
import { keyedId, openId } from "../src/shared/heavy-traverse.ts";
import { idleInput } from "../src/shared/protocol.ts";
const near = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
test("known handling prediction matches actual same-step walking and stationary replant without editing the received kit", () => {
  for (const handling of [keyedId, openId])
    for (const mode of ["loose", "spade", "floating"] as const) {
      const f = fixture(mode, handling);
      f.step({ technique1: true });
      const view = viewOf(f.g, f.p.id),
        before = structuredClone(view.players[0].kit),
        prediction = new Prediction();
      prediction.acknowledge(view, f.p.id);
      for (let tick = 2; tick <= 7; tick++) {
        const props = {
          technique2: tick === 2 || tick === 6,
          moveY: tick < 6 || tick === 7 ? 1 : 0,
        };
        const frame = { ...idleInput(), sequence: tick, aim: 0, ...props };
        prediction.submit(frame, view);
        f.step(props);
        near(prediction.player!.x, f.p.x);
        near(prediction.player!.y, f.p.y);
        assert.equal(prediction.player!.ammo, 44);
        assert.equal(prediction.player!.kit.heavyClutchHandling, handling);
      }
      assert.deepEqual(view.players[0].kit, before);
    }
});
test("lost handling cancels only known dependent recoil while retaining the earlier base recoil", () => {
  for (const handling of [keyedId, openId]) {
    const f = fixture("floating", handling);
    f.step({ technique1: true });
    f.step({ technique2: true });
    const base = structuredClone(viewOf(f.g, f.p.id).players[0]);
    base.skills = base.skills.filter((s) => s !== handling);
    const earlier = traversePredictedMotion(
      base,
      { ...idleInput(), sequence: 3 },
      3,
    );
    assert(earlier.x < 0);
    assert.equal(base.kit.heavyTraverseUntil, 0);
    f.step({ technique2: true });
    while (f.g.combatTick < 11) f.step();
    const later = structuredClone(viewOf(f.g, f.p.id).players[0]);
    assert.equal(later.kit.heavyTraverseShotRequiresHandling, handling);
    later.skills = later.skills.filter((s) => s !== handling);
    assert.deepEqual(
      traversePredictedMotion(later, { ...idleInput(), sequence: 12 }, 12),
      { walk: 1, x: 0, y: 0 },
    );
    assert.equal(later.kit.heavyTraverseUntil, 0);
  }
});
test("prediction never invents an Open primary admission, conversion, skipped slot, payment or future shot", () => {
  const f = fixture("floating", openId);
  f.step({ technique1: true });
  f.step({ technique2: true });
  const p = structuredClone(viewOf(f.g, f.p.id).players[0]),
    before = structuredClone(p.kit),
    ammo = p.ammo;
  for (let now = 3; now <= 31; now++) {
    traversePredictedMotion(
      p,
      { ...idleInput(), sequence: now, fire: true },
      now,
    );
    assert.equal(p.ammo, ammo);
    assert.equal(p.kit.heavyClutchConverted, 0);
  }
  assert.deepEqual(p.kit, before);
});
