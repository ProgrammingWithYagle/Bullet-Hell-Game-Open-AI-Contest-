import test from "node:test";
import assert from "node:assert/strict";
import { Game, data, type Player } from "../src/shared/game.ts";
import {
  idleInput,
  HZ,
  CONTENT_REVISION,
  type InputFrame,
  type Shot,
} from "../src/shared/protocol.ts";
import {
  skirmisherIds as ids,
  skirmisherRules as rules,
} from "../src/shared/soldier-skirmisher.ts";
import { viewOf } from "../src/shared/view.ts";
import { soldierActions } from "../src/client/soldier-actions.ts";

const buy = (g: Game, p: Player, item: string) =>
  assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
// Controlled legal budget/arena fixtures; these are not natural progression evidence.
function fixture(roving = false, fork?: string, extra: string[] = []) {
  const g = new Game({
    mode: "endless",
    seed: 41,
    maxPlayers: 2,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const id of [
    "soldier-ballistics-1",
    ids.entry,
    ids.drill,
    ...(roving ? [ids.roving] : []),
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
  const until = (at: number, input: Partial<InputFrame> = {}) => {
    while (g.combatTick < at) step(input);
  };
  return { g, p, step, until, shots };
}
const cue = (g: Game) => g.classCues().find((c) => c.kind === "soldier-load");

test("ordinary Raid's 12 SP buys the fifth action; earned gates keep the evolution later and preserve General", () => {
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("solo", "Mara", "soldier");
  assert.equal(p.totalSp, 12);
  for (const id of ["soldier-ballistics-1", ids.entry, ids.drill])
    buy(g, p, id);
  assert.equal(
    p.totalSp - p.skills.reduce((n, id) => n + g.skillCost(id), 0),
    6,
  );
  assert.equal(
    g.transact(p.id, { id: "later", kind: "skill", item: ids.roving }).reason,
    "insufficientPoints",
  );
  assert.equal(data.skills.filter((s) => s.classId === "soldier").length, 54);
  assert.equal(data.generalSkills.length, 4);
  const s = new Game(),
    q = s.addPlayer("solo", "Mara", "soldier");
  buy(s, q, "soldier-ballistics-1");
  buy(s, q, ids.entry);
  assert.equal(
    s.transact(q.id, { id: "too-early", kind: "skill", item: ids.drill }).ok,
    false,
  );
});

test("individual rounds use each actual weapon's modified reload clock and stop at four without overflow", () => {
  for (const w of data.weapons.filter((w) => w.classId === "soldier")) {
    const f = fixture();
    f.p.weapon = w.id;
    f.p.upgrades.reload = 2;
    f.p.ammo = 0;
    const stats = f.g.stats(f.p),
      health = f.p.health,
      dodgeAt = f.p.dodgeAt;
    f.step({ technique2: true });
    const c = cue(f.g)!;
    assert(c?.kind === "soldier-load");
    assert.equal(
      c.nextAt - c.at,
      Math.ceil(w.reloadTime * stats.reload * rules.drillFirstFraction * HZ),
    );
    assert.equal(c.total, 4);
    assert.equal(f.p.ammo, 0);
    assert.equal(f.p.reloadAt, 0);
    f.until(c.nextAt - 1);
    assert.equal(f.p.ammo, 0);
    f.step();
    assert.equal(f.p.ammo, 1);
    const second = cue(f.g)!;
    assert(second.kind === "soldier-load");
    assert.equal(
      second.nextAt - c.nextAt,
      Math.ceil(w.reloadTime * stats.reload * rules.drillRoundFraction * HZ),
    );
    f.until(c.until);
    assert.equal(f.p.ammo, 4);
    assert(!cue(f.g));
    assert.equal(f.p.health, health);
    assert.equal(f.p.dodgeAt, dodgeAt);
    assert.equal(f.p.invulnerableUntil, 0);
  }
  const f = fixture();
  f.p.ammo = f.g.stats(f.p).magazine - 1;
  f.step({ technique2: true });
  const c = cue(f.g)!;
  assert(c.kind === "soldier-load" && c.total === 1);
  f.until(c.until);
  assert.equal(f.p.ammo, f.g.stats(f.p).magazine);
  assert(!cue(f.g));
});

test("replacing a normal reload never converts elapsed work into cartridges", () => {
  const f = fixture();
  f.p.ammo = 0;
  f.step({ reload: true });
  const normal = f.p.reloadAt;
  f.until(normal - 2);
  f.step({ technique2: true });
  const c = cue(f.g)!;
  assert(c?.kind === "soldier-load");
  assert.equal(f.p.ammo, 0);
  assert.equal(f.p.reloadAt, 0);
  assert(c.nextAt > normal);
  f.until(c.nextAt - 1);
  assert.equal(f.p.ammo, 0);
  f.step();
  assert.equal(f.p.ammo, 1);
});

test("stop works during recovery, retains inserted rounds and resumes held primary without catch-up shots", () => {
  const f = fixture();
  f.p.ammo = 0;
  f.step({ technique2: true, fire: true });
  const c = cue(f.g)!;
  assert(c.kind === "soldier-load");
  const recovery = f.g.kitStatus(f.p.id).technique2At;
  f.until(c.nextAt, { fire: true });
  assert.equal(f.p.ammo, 1);
  assert.equal(f.shots.length, 0);
  f.step({ technique2: true, fire: true });
  assert(!cue(f.g));
  assert.equal(f.shots.length, 1);
  assert.equal(f.p.ammo, 0);
  assert.equal(f.g.kitStatus(f.p.id).technique2At, recovery);
  f.step({ technique2: true });
  assert(!cue(f.g));
  assert.equal(f.g.kitStatus(f.p.id).technique2At, recovery);
});

test("manual full Reload interrupts; simultaneous Reload and action2 chooses the full reload", () => {
  for (const simultaneous of [false, true]) {
    const f = fixture();
    f.p.ammo = 0;
    f.step({ technique2: true });
    const c = cue(f.g)!;
    assert(c.kind === "soldier-load");
    f.until(c.nextAt);
    f.step({ reload: true, technique2: simultaneous });
    assert(!cue(f.g));
    assert.equal(f.p.ammo, 1);
    assert(f.p.reloadAt > f.g.combatTick);
    f.until(f.p.reloadAt);
    assert.equal(f.p.ammo, f.g.stats(f.p).magazine);
    assert(!cue(f.g));
  }
});

test("base drill stops for a fresh burst or successful step; a rejected step preserves its work", () => {
  for (const action of ["burst", "step", "rejected"]) {
    const f = fixture();
    f.p.ammo = 0;
    if (action !== "burst") f.step({ e: true });
    f.step({ technique2: true });
    const c = cue(f.g)!;
    assert(c.kind === "soldier-load");
    if (action === "rejected")
      f.g.obstacles.push({
        x: f.p.x + 30,
        y: f.p.y - 30,
        width: 20,
        height: 60,
      });
    f.step(action === "burst" ? { e: true } : { technique1: true, moveX: 1 });
    if (action === "rejected") {
      assert.equal(cue(f.g)?.id, c.id);
      assert(!f.g.skirmisher.hasMotion(f.p.id));
    } else {
      assert(!cue(f.g));
      if (action === "step") assert(f.g.skirmisher.hasMotion(f.p.id));
    }
  }
});

test("Roving Chamber keeps the same finite drill through burst and all three physical commitments", () => {
  for (const fork of [undefined, ids.advance, ids.rear]) {
    const f = fixture(true, fork);
    f.p.ammo = 0;
    f.step({ technique2: true });
    const c = cue(f.g)!;
    assert(c.kind === "soldier-load");
    const recovery = f.g.kitStatus(f.p.id).technique2At;
    f.step({ e: true, technique1: true, moveX: 1 });
    assert(f.g.skirmisher.hasMotion(f.p.id));
    assert.equal(cue(f.g)?.id, c.id);
    f.until(c.until);
    assert.equal(f.p.ammo, 4);
    assert(!cue(f.g));
    assert.equal(f.g.kitStatus(f.p.id).technique2At, recovery);
    assert.equal(f.shots.length, fork === ids.advance ? 5 : 4);
  }
});

test("dodge and actual health loss stop both drills; a fully absorbed hit does not", () => {
  for (const roving of [false, true])
    for (const interruption of [
      "dodge",
      "damage",
      "curse",
      "stamp",
      "shield",
    ]) {
      const f = fixture(roving);
      f.p.ammo = 0;
      f.step({ technique2: true });
      const c = cue(f.g)!;
      assert(c.kind === "soldier-load");
      f.until(c.nextAt);
      const recovery = f.g.kitStatus(f.p.id).technique2At;
      if (interruption === "dodge") f.step({ dodge: true, moveX: 1 });
      else if (interruption === "curse")
        (f.g as any).damageCurrentHealth(f.p, 0.1, 1);
      else if (interruption === "stamp") (f.g as any).purpleStamp(f.p, 0, true);
      else {
        if (interruption === "shield") f.p.shield = 100;
        (f.g as any).damage(f.p, 5);
      }
      if (interruption === "shield") assert(cue(f.g));
      else assert(!cue(f.g), interruption);
      assert.equal(f.p.ammo, 1);
      assert.equal(f.g.kitStatus(f.p.id).technique2At, recovery);
    }
});

test("owner/weapon/phase loss clears unfinished work and an actual ultimate refill ends the drill", () => {
  for (const interruption of [
    "weapon",
    "skill",
    "disconnect",
    "down",
    "phase",
    "ultimate",
  ]) {
    const f = fixture(true);
    f.p.ammo = 0;
    f.step({ technique2: true });
    const c = cue(f.g)!;
    assert(c.kind === "soldier-load");
    if (interruption === "weapon") {
      f.p.weapon = "soldier-1";
      f.step();
    }
    if (interruption === "skill") {
      f.p.skills = f.p.skills.filter((id) => id !== ids.drill);
      f.step();
    }
    if (interruption === "disconnect") f.g.setConnected(f.p.id, false);
    if (interruption === "down") (f.g as any).damage(f.p, 1e6);
    if (interruption === "phase") assert(f.g.endByHost());
    if (interruption === "ultimate") {
      f.step({ ultimate: true });
      assert.equal(f.p.ammo, f.g.stats(f.p).magazine);
    }
    assert(!cue(f.g), interruption);
  }
});

test("walking remains real while sprint is gated; full magazines and unowned requests spend no recovery", () => {
  const f = fixture(false, undefined, ["general-sprint"]);
  f.p.ammo = 0;
  f.step({ technique2: true });
  const start = f.p.x;
  f.step({ moveX: 1, sprint: true });
  assert(f.p.x > start);
  assert(!f.p.sprinting);
  assert(cue(f.g));
  const g = new Game(),
    p = g.addPlayer("solo", "Mara", "soldier");
  assert(g.start());
  g.submitInput(p.id, { ...idleInput(), sequence: 1, technique2: true });
  g.step();
  assert.equal(g.kitStatus(p.id).technique2At, 0);
  assert(!cue(g));
  const full = fixture();
  full.step({ technique2: true });
  assert(!cue(full.g));
  assert.equal(full.g.kitStatus(full.p.id).technique2At, 0);
});

test("issued Breach Cadence still delivers its three scheduled burst rounds during roving loading", () => {
  const f = fixture(true, undefined, [
    "soldier-command-1",
    "soldier-command-2",
    "soldier-command-3",
  ]);
  f.p.ammo = 0;
  f.step({ technique2: true });
  const c = cue(f.g)!;
  assert(c.kind === "soldier-load");
  f.step({ e: true });
  f.until(f.g.combatTick + Math.ceil(0.3 * HZ));
  assert.equal(f.shots.length, 3);
  assert(cue(f.g));
  f.until(c.until);
  assert.equal(f.p.ammo, 4);
});

test("public load progress is owner-attached and strips private bookkeeping; stop stays available during recovery", () => {
  const f = fixture();
  f.p.ammo = 0;
  f.step({ technique2: true });
  f.step({ moveY: 1 });
  const c = cue(f.g)!;
  assert(c.kind === "soldier-load");
  assert.equal(c.x, f.p.x);
  assert.equal(c.y, f.p.y);
  for (const key of ["weapon", "interval", "remaining", "damage"])
    assert(!(key in c));
  const action = soldierActions(
    viewOf(f.g, f.p.id).players[0],
    f.g.combatTick,
  ).extras.find((a) => a.key === "technique2")!;
  assert.equal(action.at, 0);
  assert.equal(action.blocked, false);
  assert(f.g.kitStatus(f.p.id).technique2At! > f.g.combatTick);
  f.step({ technique2: true });
  const stopped = soldierActions(
    viewOf(f.g, f.p.id).players[0],
    f.g.combatTick,
  ).extras.find((a) => a.key === "technique2")!;
  assert(stopped.at > f.g.combatTick);
});

test("disconnect or downing cancels unfinished work without refunding either acquired action's recovery", () => {
  for (const down of [false, true]) {
    const f = fixture(true);
    f.p.ammo = 0;
    f.step({ technique2: true });
    f.step({ e: true, technique1: true, moveX: 1 });
    const before = f.g.kitStatus(f.p.id);
    assert(
      before.technique1At! > f.g.combatTick &&
        before.technique2At! > f.g.combatTick,
    );
    if (down) (f.g as any).damage(f.p, 1e6);
    else f.g.setConnected(f.p.id, false);
    f.g.skirmisher.step((f.g as any).skirmisherContext());
    const after = f.g.kitStatus(f.p.id);
    assert(!cue(f.g));
    assert.equal(after.soldierStepUntil, 0);
    assert.equal(after.soldierFollowupUntil, 0);
    assert.equal(after.technique1At, before.technique1At);
    assert.equal(after.technique2At, before.technique2At);
  }
});

test("exact issued55 safe ownership migrates without inventing new techniques or online proof", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const id of ["soldier-ballistics-1", ids.entry, ids.rear]) buy(g, p, id);
  const save = g.offlineCheckpoint()!;
  assert(save);
  const issued = {
    ...save,
    protocolVersion: 55,
    contentRevision:
      "da03a1304940cf65d0a3298fba1c5e4d84c53a199203f0e3f4c42081c9ec3de6",
  };
  const restored = Game.restoreOffline(structuredClone(issued));
  assert.deepEqual(restored.players.get(p.id)!.skills, p.skills);
  assert.equal(restored.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  assert(!restored.skirmisher.isLoading(p.id));
  for (const id of [ids.drill, ids.roving]) {
    const forged = structuredClone(issued);
    forged.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  }
  assert.throws(
    () => Game.restoreOffline({ ...issued, protocolVersion: 54 }),
    /versionMismatch/,
  );
});
