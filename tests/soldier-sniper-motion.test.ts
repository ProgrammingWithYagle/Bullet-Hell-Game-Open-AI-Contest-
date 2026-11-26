import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { SurvivorActionClock } from "../src/client/survivor-action-presentation.ts";
// Native frame-selection checks only. No rendered or human motion acceptance is claimed.
function fixture() {
  const g = new Game({ mode: "short", seed: 41, maxPlayers: 2 }),
    p = g.addPlayer("solo", "Mara", "soldier");
  g.addPlayer("ally", "Perrin", "medic");
  for (const item of ["soldier-ballistics-1", "soldier-sniper-1"])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  assert(g.start());
  g.boss.staggerUntil = g.boss.deadline = 1e6;
  const clock = new SurvivorActionClock();
  let sequence = 0,
    view = viewOf(g, p.id);
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
      clock.pose(
        view.players.find((v) => v.id === p.id)!,
        view,
        false,
        reduced,
      ),
    release = () => {
      step({ technique1: true });
      const ready = g.kitStatus(p.id).sniperReadyAt!;
      while (g.combatTick < ready) step();
      step({ technique1: true });
    };
  return { g, p, clock, step, sample, pose, release, view: () => view };
}
test("Sniper reservation and settling do not select a firing pose before an actual release", () => {
  const f = fixture();
  f.step({ technique1: true });
  assert(f.g.kitStatus(f.p.id).sniperPrepared);
  assert.equal(f.pose()!.action, "idle");
  for (let n = 0; n < 4; n++) f.step();
  assert.equal(f.pose()!.action, "idle");
});
test("actual manually released Sniper shot selects its firing cycle without another ammo decrement or snapshot restart", () => {
  const f = fixture();
  f.release();
  assert.equal(f.pose()!.action, "attack");
  assert.equal(f.pose()!.facing, "east");
  const first = f.pose()!.frame;
  f.sample();
  assert.equal(f.pose()!.frame, first);
  for (let n = 0; n < 4; n++) f.step();
  assert.equal(f.pose()!.action, "attack");
  assert(f.pose()!.frame > first);
  assert.equal(f.pose(true)!.frame, 1);
});
test("a paid preparation cancelled between received snapshots does not manufacture a firing pose", () => {
  const f = fixture();
  f.step({ technique1: true }, false);
  f.step({ moveX: 1 }, false);
  f.step({}, false);
  assert(!f.g.kitStatus(f.p.id).sniperPrepared);
  f.sample();
  assert.equal(f.pose()!.action, "idle");
});
test("ordinary primary shots remain independently animated in every Sniper facing", () => {
  for (const [aim, facing] of [
    [0, "east"],
    [Math.PI / 2, "south"],
    [Math.PI, "west"],
    [-Math.PI / 2, "north"],
  ] as const) {
    const f = fixture();
    f.step({ aim, fire: true });
    assert.equal(f.pose()!.action, "attack");
    assert.equal(f.pose()!.facing, facing);
  }
});
test("a late observer samples the actual released-shot age and stale/ended shots never restart", () => {
  const f = fixture();
  f.release();
  for (let n = 0; n < 4; n++) f.step();
  const late = new SurvivorActionClock(),
    view = f.view(),
    p = view.players.find((v) => v.id === f.p.id)!;
  late.observe(view);
  const pose = late.pose(p, view, false)!;
  assert.equal(pose.action, "attack");
  assert(pose.frame > 0);
  for (let n = 0; n < 24; n++) f.step();
  const stale = f.view();
  late.observe(stale);
  assert.equal(
    late.pose(
      stale.players.find((v) => v.id === f.p.id)!,
      stale,
      false,
    )!.action,
    "idle",
  );
  f.g.endByHost();
  const ended = f.sample();
  late.observe(ended);
  assert.equal(
    late.pose(
      ended.players.find((v) => v.id === f.p.id)!,
      ended,
      false,
    )!.action,
    "idle",
  );
});

test("continuous actual Sniper primary reports do not restart an unfinished firing cycle", () => {
  const f = fixture();
  f.step({ fire: true });
  const first = f.pose()!.frame;
  for (let n = 0; n < 8; n++) f.step({ fire: true });
  assert.equal(f.pose()!.action, "attack");
  assert(f.pose()!.frame > first);
});
