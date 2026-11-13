import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import {
  traverseIds as ids,
  heavyTraverseRules as rules,
} from "../src/shared/heavy-traverse.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput, type InputFrame } from "../src/shared/protocol.ts";
import { Prediction } from "../src/client/prediction.ts";
import { traversePredictedMotion } from "../src/client/heavy-traverse-prediction.ts";
import { SurvivorActionClock } from "../src/client/survivor-action-presentation.ts";
const near = (a: number, b: number) =>
  assert(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
function fixture(mode: "loose" | "spade" | "floating" = "loose") {
  const g = new Game({
      mode: mode === "loose" ? "short" : "raid",
      seed: 41,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("solo", "Hux", "heavy");
  for (const item of [
    "heavy-ordnance-1",
    ids.entry,
    ...(mode === "loose" ? [] : [ids[mode]]),
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  assert(g.start());
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.health = g.boss.maxHealth = 1e6;
  p.x = p.oldX = 600;
  p.y = p.oldY = 780;
  g.drainEvents();
  let sequence = 0;
  const frame = (input: Partial<InputFrame> = {}) => ({
      ...idleInput(),
      sequence: ++sequence,
      aim: 0,
      ...input,
    }),
    step = (input: Partial<InputFrame> = {}) => {
      const i = frame(input);
      assert(g.submitInput(p.id, i));
      g.step();
      return i;
    };
  return { g, p, frame, step, view: () => viewOf(g, p.id) };
}
test("prediction matches authoritative known recoil and the default, planted and walking ground contracts", () => {
  for (const mode of ["loose", "spade", "floating"] as const) {
    const f = fixture(mode);
    f.step({ technique1: true });
    const prediction = new Prediction(),
      view = f.view();
    prediction.acknowledge(view, f.p.id);
    for (let i = 0; i < 4; i++) {
      const input = f.frame({ moveY: 1 });
      prediction.submit(input, view);
      assert(f.g.submitInput(f.p.id, input));
      f.g.step();
      near(prediction.player!.x, f.p.x);
      near(prediction.player!.y, f.p.y);
    }
    assert.equal(view.players[0].kit.heavyTraverseUntil, 32);
  }
});
test("fresh C releases predicted walking on that same step while retaining known paid recoil and immutable view input", () => {
  const f = fixture();
  f.step({ technique1: true });
  const prediction = new Prediction(),
    view = f.view(),
    before = structuredClone(view.players[0].kit);
  prediction.acknowledge(view, f.p.id);
  const input = f.frame({ technique1: true, moveY: 1 });
  prediction.submit(input, view);
  assert(f.g.submitInput(f.p.id, input));
  f.g.step();
  near(prediction.player!.x, f.p.x);
  near(prediction.player!.y, f.p.y);
  assert(f.p.y > 780);
  assert(f.p.x < 600);
  assert.deepEqual(view.players[0].kit, before);
  assert.equal(f.p.ammo, 44);
  assert.equal(prediction.player!.ammo, 44);
});
test("prediction never invents later shots, payments, recoil or recovery while awaiting the next authoritative report", () => {
  const f = fixture("floating");
  f.step({ technique1: true });
  const view = f.view(),
    p = structuredClone(view.players[0]),
    before = structuredClone(p.kit),
    ammo = p.ammo;
  for (let tick = 2; tick <= 31; tick++) {
    const motion = traversePredictedMotion(
      p,
      { ...idleInput(), sequence: tick },
      tick,
    );
    if (tick > 1 + rules.recoilTicks)
      assert.deepEqual({ x: motion.x, y: motion.y }, { x: 0, y: 0 });
    assert.equal(motion.walk, 1);
  }
  assert.equal(p.ammo, ammo);
  assert.deepEqual(p.kit, before);
});
test("native firing selection follows actual paid shot bearings in all four directions and ignores feed release and synthetic ammo changes", () => {
  for (const [aim, facing] of [
    [0, "east"],
    [Math.PI / 2, "south"],
    [Math.PI, "west"],
    [-Math.PI / 2, "north"],
  ] as const) {
    const f = fixture(),
      clock = new SurvivorActionClock();
    let view = f.view();
    clock.observe(view);
    f.step({ technique1: true, aim });
    view = f.view();
    clock.observe(view);
    const at = f.g.kitStatus(f.p.id).heavyTraverseShotAt;
    assert.equal(
      clock.pose(view.players[0], view, false, false)!.action,
      "attack",
    );
    assert.equal(
      clock.pose(view.players[0], view, false, false)!.facing,
      facing,
    );
    f.step({
      technique1: true,
      aim: Math.atan2(Math.sin(aim + Math.PI), Math.cos(aim + Math.PI)),
    });
    view = f.view();
    clock.observe(view);
    assert.equal(f.g.kitStatus(f.p.id).heavyTraverseShotAt, at);
    assert.equal(
      clock.pose(view.players[0], view, false, false)!.facing,
      facing,
    );
    for (let n = 0; n < 15; n++) f.step();
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
