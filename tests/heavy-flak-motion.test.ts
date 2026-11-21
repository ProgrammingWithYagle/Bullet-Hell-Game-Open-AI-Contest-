import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { SurvivorActionClock } from "../src/client/survivor-action-presentation.ts";
// Native frame selection only; no rendered/device/human motion acceptance is claimed.
function fixture() {
  const g = new Game({ mode: "raid", seed: 41, maxPlayers: 1 }),
    p = g.addPlayer("solo", "Hux", "heavy");
  for (const item of [
    "heavy-ordnance-1",
    "heavy-flak-1",
    "heavy-flak-command-1",
  ])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  assert(g.start());
  g.boss.staggerUntil = g.boss.deadline = 1e6;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = g.arena.lavaPits.length = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  const clock = new SurvivorActionClock();
  let view = viewOf(g, p.id),
    sequence = 0;
  clock.observe(view);
  const sample = () => {
      view = viewOf(g, p.id);
      clock.observe(view);
      return view;
    },
    step = (input: object = {}, observe = true) => {
      assert(
        g.submitInput(p.id, {
          ...idleInput(),
          sequence: ++sequence,
          aim: 0,
          ...input,
        }),
      );
      g.step();
      if (observe) sample();
    },
    pose = (reduced = false) =>
      clock.pose(view.players[0], view, false, reduced);
  return { g, p, clock, sample, step, pose, view: () => view };
}
test("actual Heavy flak launches and ordinary primary reports select the actual firing bearing in all four directions", () => {
  for (const action of ["fire", "technique1"])
    for (const [aim, facing] of [
      [0, "east"],
      [Math.PI / 2, "south"],
      [Math.PI, "west"],
      [-Math.PI / 2, "north"],
    ] as const) {
      const f = fixture();
      f.step({ [action]: true, aim });
      assert.equal(f.pose()!.action, "attack");
      assert.equal(f.pose()!.facing, facing);
      assert.equal(f.pose(true)!.frame, 1);
    }
});
test("acquired Manual Fuze and actual interception do not restart the launch firing cycle", () => {
  const f = fixture();
  f.step({ technique1: true });
  for (let n = 0; n < 5; n++) f.step();
  const frame = f.pose()!.frame,
    at = f.g.kitStatus(f.p.id).heavyFlakShotAt;
  f.step({ technique2: true, aim: -Math.PI / 2 });
  assert.equal(f.g.kitStatus(f.p.id).heavyFlakShotAt, at);
  assert.equal(f.pose()!.facing, "east");
  assert(f.pose()!.frame >= frame);
  assert(f.pose()!.frame > 0);
});
test("an empty or rejected flak request does not invent a firing pose", () => {
  const f = fixture();
  f.p.ammo = 0;
  f.step({ technique1: true });
  assert.equal(f.pose()!.action, "idle");
  assert.equal(f.g.kitStatus(f.p.id).heavyFlakShotAt, 0);
});
test("a late Heavy observer reads actual launch age and a stale/ended report cannot restart motion", () => {
  const f = fixture();
  f.step({ technique1: true });
  for (let n = 0; n < 4; n++) f.step();
  const late = new SurvivorActionClock(),
    view = f.view();
  late.observe(view);
  assert.equal(late.pose(view.players[0], view, false)!.action, "attack");
  assert(late.pose(view.players[0], view, false)!.frame > 0);
  for (let n = 0; n < 30; n++) f.step();
  const stale = f.view();
  late.observe(stale);
  assert.equal(late.pose(stale.players[0], stale, false)!.action, "idle");
  f.g.endByHost();
  const ended = f.sample();
  late.observe(ended);
  assert.equal(late.pose(ended.players[0], ended, false)!.action, "idle");
});
