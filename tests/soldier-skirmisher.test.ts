import test from "node:test";
import assert from "node:assert/strict";
import { Game, type Player } from "../src/shared/game.ts";
import {
  idleInput,
  HZ,
  type InputFrame,
  type Shot,
  PROTOCOL,
  CONTENT_REVISION,
} from "../src/shared/protocol.ts";
import {
  skirmisherIds as ids,
  skirmisherRules as r,
} from "../src/shared/soldier-skirmisher.ts";
import { conflictingSkill } from "../src/shared/skill-conflicts.ts";
const buy = (g: Game, p: Player, item: string) =>
  assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
function fixture(fork?: string, extra: string[] = [], early = false) {
  const g = new Game({
    mode: "endless",
    seed: 41,
    maxPlayers: 2,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = early ? 0 : 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const id of [
    "soldier-ballistics-1",
    ids.entry,
    ...(fork ? [fork] : []),
    ...extra,
  ])
    buy(g, p, id);
  assert(g.start());
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.x = 1250;
  g.boss.y = 200;
  g.obstacles.splice(0);
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  p.invulnerableUntil = 0;
  p.shield = p.supplyShield = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  g.drainEvents();
  let sequence = 0;
  const shots: Shot[] = [];
  const step = (input: Partial<InputFrame> = {}) => {
    assert(
      g.submitInput(p.id, {
        ...idleInput(),
        sequence: ++sequence,
        clientTick: g.combatTick,
        ...input,
      }),
    );
    g.step();
    for (const e of g.drainEvents())
      if (e.type === "shots")
        shots.push(...e.shots.filter((s) => s.owner === p.id));
  };
  return { g, p, step, shots };
}
const stepCue = (g: Game) =>
  g.classCues().find((c) => c.kind === "soldier-step");

test("normal starting 3 SP acquires a separate action; one real burst earns one vulnerable physical follow-through", () => {
  const { g, p, step, shots } = fixture(undefined, [], true),
    health = p.health,
    ammo = p.ammo,
    dodgeAt = p.dodgeAt,
    invulnerable = p.invulnerableUntil;
  assert.equal(p.totalSp, 3);
  assert.equal(
    p.totalSp - p.skills.reduce((n, id) => n + g.skillCost(id), 0),
    0,
  );
  step({ e: true, technique1: true, moveX: 1 });
  const cue = stepCue(g);
  assert(cue?.kind === "soldier-step");
  assert.equal(shots.length, 3);
  for (let i = 0; i < Math.ceil(r.stepSeconds * HZ); i++) step();
  assert(Math.abs(p.x - cue.toX) < 1e-6);
  assert(Math.abs(p.y - cue.toY) < 1e-6);
  assert.equal(stepCue(g), undefined);
  assert.equal(shots.length, 4);
  assert.equal(shots.at(-1)!.damage, r.shotDamage * g.stats(p).ability);
  assert.equal(p.health, health);
  assert.equal(p.ammo, ammo);
  assert.equal(p.dodgeAt, dodgeAt);
  assert.equal(p.invulnerableUntil, invulnerable);
  step({ technique1: true, moveX: 1 });
  assert.equal(stepCue(g), undefined);
  assert.equal(shots.length, 4);
});

test("unearned, expired and directionless follow-through requests spend no opening or recovery", () => {
  const { g, p, step, shots } = fixture();
  step({ technique1: true, moveX: 1 });
  assert(!stepCue(g));
  assert.equal(g.kitStatus(p.id).technique1At, 0);
  step({ e: true });
  const until = g.kitStatus(p.id).soldierFollowupUntil;
  assert(until! > g.combatTick);
  step({ technique1: true });
  assert(!stepCue(g));
  assert.equal(g.kitStatus(p.id).soldierFollowupUntil, until);
  assert.equal(g.kitStatus(p.id).technique1At, 0);
  for (let i = g.combatTick; i <= until!; i++) step();
  step({ technique1: true, moveX: 1 });
  assert(!stepCue(g));
  assert.equal(shots.length, 3);
});

test("a wall across the whole footprint rejects a step without spending its earned opening", () => {
  const { g, p, step } = fixture();
  step({ e: true });
  const until = g.kitStatus(p.id).soldierFollowupUntil;
  g.obstacles.push({ x: p.x + 35, y: p.y - 30, width: 12, height: 60 });
  step({ technique1: true, moveX: 1 });
  assert(!stepCue(g));
  assert.equal(g.kitStatus(p.id).soldierFollowupUntil, until);
  assert.equal(g.kitStatus(p.id).technique1At, 0);
  g.obstacles.splice(0);
  step({ technique1: true, moveY: 1 });
  assert(stepCue(g));
});

test("bounds and a crossed lava circle reject the entire step before any recovery is spent", () => {
  for (const kind of ["bounds", "lava"]) {
    const { g, p, step } = fixture();
    step({ e: true });
    if (kind === "bounds") {
      p.x = g.arena.bounds.x + g.arena.bounds.width - 20;
      p.oldX = p.x;
    } else
      (g.arena.lavaPits as { x: number; y: number; radius: number }[]).push({
        x: p.x + 45,
        y: p.y,
        radius: 4,
      });
    step({ technique1: true, moveX: 1 });
    assert(!stepCue(g), kind);
    assert.equal(g.kitStatus(p.id).technique1At, 0, kind);
  }
});

test("new obstruction, displacement and a real dodge cancel unfinished work without an arrival shot or refund", () => {
  for (const kind of ["wall", "force", "slow", "dodge"]) {
    const { g, p, step, shots } = fixture();
    step({ e: true, technique1: true, moveX: 1 });
    const recovery = g.kitStatus(p.id).technique1At;
    step();
    if (kind === "wall")
      g.obstacles.push({ x: p.x + 20, y: p.y - 20, width: 10, height: 40 });
    else if (kind === "force") p.y += 4;
    else if (kind === "slow") p.slowUntil = g.combatTick + 90;
    step(kind === "dodge" ? { dodge: true, moveY: 1 } : {});
    for (let i = 0; i < 12; i++) step();
    assert(!stepCue(g), kind);
    assert.equal(shots.length, 3, kind);
    assert.equal(g.kitStatus(p.id).technique1At, recovery, kind);
    if (kind === "dodge") assert(p.dodgeAt > 0);
  }
});

test("Crossing Advance splits the same damage into departure and re-aimed arrival rounds", () => {
  const { g, p, step, shots } = fixture(ids.advance);
  step({ e: true, technique1: true, aim: 0, moveY: 1 });
  const cue = stepCue(g);
  assert(cue?.kind === "soldier-step");
  assert.equal(cue.mode, "advance");
  assert.equal(shots.length, 4);
  assert.equal(cue.toY, cue.y);
  assert.equal(cue.toX - cue.x, r.stepDistance);
  for (let i = 0; i < Math.ceil(r.stepSeconds * HZ); i++)
    step({ aim: Math.PI / 2 });
  assert.equal(shots.length, 5);
  assert(Math.abs(shots.at(-1)!.vx) < 1e-5);
  assert(shots.at(-1)!.vy > 0);
  assert.equal(
    shots[3].damage + shots[4].damage,
    r.shotDamage * g.stats(p).ability,
  );
});

test("Rear Guard intercepts only one visible hostile round and remains vulnerable to the next", () => {
  const { g, p, step, shots } = fixture(ids.rear);
  step({ e: true, technique1: true, aim: 0 });
  const cue = stepCue(g);
  assert(cue?.kind === "soldier-step");
  assert.equal(cue.mode, "rear");
  const mid = cue.at + Math.ceil((cue.until - cue.at) / 2);
  while (g.combatTick < mid - 1) step();
  const x = cue.x - r.stepDistance * ((mid - cue.at) / (cue.until - cue.at)),
    y = cue.y;
  const hostile = (id: number, dx: number, dy = 0): Shot => ({
    id,
    owner: "hostile",
    x: x + dx,
    y: y + dy,
    vx: 0,
    vy: 0,
    radius: 2,
    damage: 7,
    expires: g.combatTick + 90,
    pierce: 0,
  });
  g.shots.set(90001, hostile(90001, 1));
  g.shots.set(90002, hostile(90002, 2));
  g.shots.set(90003, hostile(90003, 30, 40));
  const health = p.health,
    damage = p.damageDealt,
    coins = p.coins;
  step();
  assert(!g.shots.has(90001));
  assert.equal(p.health, health - 7);
  assert(g.shots.has(90003));
  assert.equal(shots.length, 4);
  assert.equal(p.damageDealt, damage);
  assert.equal(p.coins, coins);
  assert.equal(p.invulnerableUntil, g.combatTick + Math.ceil(0.2 * HZ));
});

test("Rear Guard cannot intercept through cover or remove another player's shot", () => {
  const { g, p, step } = fixture(ids.rear);
  step({ e: true, technique1: true, aim: 0 });
  const cue = stepCue(g);
  assert(cue?.kind === "soldier-step");
  const mid = cue.at + Math.ceil((cue.until - cue.at) / 2);
  while (g.combatTick < mid - 1) step();
  const x = cue.x - r.stepDistance * ((mid - cue.at) / (cue.until - cue.at)),
    y = cue.y;
  g.obstacles.push({ x: x + 24, y: y - 15, width: 5, height: 30 });
  for (const [id, owner] of [
    [90001, "hostile"],
    [90002, p.id],
  ] as const)
    g.shots.set(id, {
      id,
      owner,
      x: x + 55,
      y,
      vx: 0,
      vy: 0,
      radius: 2,
      damage: 7,
      expires: g.combatTick + 90,
      pierce: 0,
    });
  step();
  assert(g.shots.has(90001));
  assert(g.shots.has(90002));
});

test("the issued Breach Cadence still fires all three committed-aim rounds from the moving owner", () => {
  const { g, p, step, shots } = fixture(ids.advance, [
    "soldier-command-1",
    "soldier-command-2",
    "soldier-command-3",
  ]);
  step({ e: true, technique1: true, aim: 0 });
  for (let i = 0; i < 12; i++) step({ aim: Math.PI / 2 });
  assert.equal(shots.length, 5);
  const original = shots.filter(
    (s) => Math.abs(s.damage - (45 * g.stats(p).ability) / 3) < 1e-6,
  );
  assert.equal(original.length, 3);
  assert(original.every((s) => Math.abs(s.vy) < 1e-5));
  assert(original[2].x > original[0].x);
});

test("disconnect and host end immediately remove windows and motion; reconnect cannot resume it", () => {
  const { g, p, step, shots } = fixture();
  step({ e: true, technique1: true, moveX: 1 });
  assert(stepCue(g));
  g.setConnected(p.id, false);
  assert(!stepCue(g));
  assert.equal(g.kitStatus(p.id).soldierFollowupUntil, 0);
  g.setConnected(p.id, true);
  for (let i = 0; i < 12; i++) step();
  assert.equal(shots.length, 3);
  const next = fixture();
  next.step({ e: true, technique1: true, moveX: 1 });
  assert(next.g.endByHost());
  assert(!stepCue(next.g));
  assert.equal(next.g.kitStatus(next.p.id).soldierStepUntil, 0);
});

test("the early fork uses the same authoritative exclusion for purchases and restored boundaries", () => {
  assert.equal(conflictingSkill([ids.advance], ids.rear), ids.advance);
  assert.equal(conflictingSkill([ids.rear], ids.advance), ids.rear);
  const { g, p } = fixture(ids.advance);
  assert.equal(
    g.transact(p.id, { id: "wrong-fork", kind: "skill", item: ids.rear }).ok,
    false,
  );
});

test("issued protocol54 preserves legitimate Builder ownership but cannot invent Soldier techniques", () => {
  const g = new Game({ mode: "endless", seed: 41 });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Tamsin", "engineer");
  for (const id of [
    "engineer-constructs-1",
    "engineer-builder-1",
    "engineer-builder-longspan-1",
  ])
    buy(g, p, id);
  const save = g.offlineCheckpoint();
  assert(save);
  const old = {
    ...structuredClone(save),
    protocolVersion: 54,
    contentRevision:
      "d7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510",
  };
  const restored = Game.restoreOffline(old).offlineCheckpoint();
  assert(restored);
  assert.equal(restored.protocolVersion, PROTOCOL);
  assert.equal(restored.contentRevision, CONTENT_REVISION);
  assert.deepEqual(restored.player.skills, save.player.skills);
  assert.equal(restored.player.coins, save.player.coins);
  const forged = structuredClone(old);
  forged.player.skills.push(ids.entry);
  assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
});

test("new follow-through coexists with the issued moving rally and bounded second resupply", () => {
  const extra = [
    "soldier-command-1",
    "soldier-command-2",
    "soldier-command-3",
    "soldier-command-path-1-1",
    "soldier-command-path-1-2",
    "soldier-command-path-1-3",
    "soldier-command-path-2-1",
    "soldier-command-path-2-2",
    "soldier-command-path-2-3",
  ];
  const { g, p, step } = fixture(ids.advance, extra);
  step({ q: true, e: true, technique1: true, moveX: 1 });
  const rally = g.fields.find((f) => f.owner === p.id && f.kind === "rally");
  assert(rally);
  assert.equal(rally.anchor, p.id);
  assert.equal(
    rally.radius,
    170 * (1 + (g.stats(p).effects.rallyRadius ?? 0)) * 0.75,
  );
  assert(stepCue(g));
  step({ ultimate: true });
  const ultimate = g.fields.at(-1)!;
  assert.equal(ultimate.owner, p.id);
  assert.equal(ultimate.anchor, undefined);
  assert.equal(
    ultimate.potency,
    (Math.min(
      0.8,
      0.35 *
        (1 + (g.stats(p).effects.ultimatePotency ?? 0)) *
        g.stats(p).ability,
    ) *
      5) /
      7,
  );
  p.ammo = 0;
  const refillAt =
    g.combatTick + Math.floor((ultimate.until - g.combatTick) / 2);
  while (g.combatTick < refillAt - 1) step();
  assert.equal(p.ammo, 0);
  step();
  assert.equal(p.ammo, g.stats(p).magazine);
});
test("downing immediately cancels unfinished Soldier work, without revival or an arrival shot", () => {
  const { g, p, step, shots } = fixture();
  step({ e: true, technique1: true, moveX: 1 });
  assert(stepCue(g));
  g.damage(p, 1000, false, true);
  assert.equal(p.status, "downed");
  assert.equal(p.health, 0);
  assert(!stepCue(g));
  assert.equal(g.kitStatus(p.id).soldierFollowupUntil, 0);
  for (let i = 0; i < 12; i++) step();
  assert.equal(shots.length, 3);
  assert.equal(p.health, 0);
});
