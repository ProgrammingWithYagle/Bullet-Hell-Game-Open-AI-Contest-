import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { SurvivorActionClock } from "../src/client/survivor-action-presentation.ts";
import {
  rangerAttackCue,
  rangerPredictedSpeed,
  cancelPredictedRangerDraw,
  rangerCommitBlocked,
  drawRangerCue,
} from "../src/client/ranger-presentation.ts";
function fixture() {
  const g = new Game({ mode: "endless", seed: 41 }),
    p = g.addPlayer("p", "Nela", "ranger");
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  p.invulnerableUntil = 1e9;
  p.x = p.oldX = 800;
  p.y = p.oldY = 700;
  return { g, p };
}
function input(g: Game, patch: Record<string, unknown>) {
  const p = g.players.get("p")!;
  g.submitInput(p.id, {
    ...idleInput(),
    sequence: p.ack + 1,
    aim: 0,
    ...patch,
  });
  g.step();
}
test("A moving Ranger and a late observer show the committed bow aim and correct draw/release frame; pause cannot advance the draw", () => {
  const { g, p } = fixture(),
    clock = new SurvivorActionClock();
  clock.observe(viewOf(g, p.id), 0);
  input(g, { q: true });
  input(g, { aim: Math.PI / 2, moveY: 1 });
  let v = viewOf(g, p.id);
  clock.observe(v, 10);
  let pose = clock.pose(v.players[0], v, true, false)!;
  assert.equal(pose.action, "attack");
  assert.equal(pose.facing, "east");
  assert.equal(pose.frame, 0);
  for (let i = 0; i < 7; i++) g.step();
  v = viewOf(g, p.id);
  const late = new SurvivorActionClock();
  late.observe(v, 20);
  pose = late.pose(v.players[0], v, true, false)!;
  assert.equal(pose.frame, 2);
  assert.equal(pose.facing, "east");
  v.matchPaused = true;
  late.observe(v, 30);
  const held = late.pose(v.players[0], v, true, false, 10000)!;
  assert.equal(held.frame, 2);
  while (g.combatTick < 13) g.step();
  v = viewOf(g, p.id);
  late.observe(v, 10010);
  pose = late.pose(v.players[0], v, true, false)!;
  assert.equal(pose.frame, 3);
  assert.equal(pose.action, "attack");
  assert.equal(late.pose(v.players[0], v, true, true)!.frame, 3);
});
test("The acknowledged movement penalty is applied once, expires on its actual clock and clears immediately on a predicted dodge", () => {
  const { g, p } = fixture();
  input(g, { q: true });
  const v = viewOf(g, p.id),
    player = v.players[0],
    copy = { ...player, kit: { ...player.kit } };
  assert.equal(copy.kit.rangerDrawMovement, 0.55);
  assert.equal(rangerPredictedSpeed(copy, g.combatTick + 1), copy.speed);
  assert.equal(
    rangerPredictedSpeed(copy, copy.kit.rangerDrawUntil!),
    copy.speed / 0.55,
  );
  const original = copy.speed;
  cancelPredictedRangerDraw(copy);
  assert.equal(copy.speed, original / 0.55);
  assert.equal(copy.kit.rangerDrawUntil, 0);
  assert.notEqual(player.kit.rangerDrawUntil, 0);
  assert(
    rangerAttackCue(
      { ...player, dashUntil: g.combatTick + 4 },
      v,
      g.combatTick,
    ) === undefined,
  );
});
test("Ability readiness follows finite arrows, active draw and actual trap capacity, while a draw preview remains a short line", () => {
  const { g, p } = fixture();
  let player = viewOf(g, p.id).players[0];
  player.ammo = 0;
  assert(rangerCommitBlocked(player, "q", 0));
  assert(!rangerCommitBlocked(player, "e", 0));
  player.kit.rangerTraps = 2;
  player.kit.rangerTrapCapacity = 2;
  assert(rangerCommitBlocked(player, "e", 0));
  player.kit.rangerTrapCapacity = 3;
  assert(!rangerCommitBlocked(player, "e", 0));
  input(g, { q: true });
  const v = viewOf(g, p.id),
    cue = rangerAttackCue(v.players[0], v, g.combatTick)!;
  assert(cue);
  const calls: number[][] = [];
  const graphics: any = {
    lineStyle() {
      return this;
    },
    lineBetween(...a: number[]) {
      calls.push(a);
      return this;
    },
    fillStyle() {
      return this;
    },
    fillCircle() {
      return this;
    },
    strokeCircle() {
      return this;
    },
  };
  drawRangerCue(graphics, cue, g.combatTick, p.id);
  assert.equal(calls.length, 1);
  assert.equal(
    Math.hypot(calls[0][2] - calls[0][0], calls[0][3] - calls[0][1]),
    56,
  );
});
