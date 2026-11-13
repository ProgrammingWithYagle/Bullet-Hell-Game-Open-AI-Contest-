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
const path = [
  "soldier-ballistics-1",
  ids.entry,
  ids.drill,
  ids.roving,
  ids.ready,
];
// Controlled legal late-budget and obstacle fixtures; not natural progression evidence.
function fixture(volley = false, fork?: string, extra: string[] = []) {
  const g = new Game({
    mode: "endless",
    seed: 41,
    maxPlayers: 2,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const item of [
    ...path,
    ...(volley ? [ids.volley] : []),
    ...(fork ? [fork] : []),
    ...extra,
  ])
    buy(g, p, item);
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
  const shots: Shot[] = [],
    sounds: string[] = [];
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
    for (const e of g.drainEvents()) {
      if (e.type === "shots")
        shots.push(...e.shots.filter((s) => s.owner === p.id));
      if (e.type === "sound" && e.owner === p.id) sounds.push(e.id);
    }
  };
  const until = (at: number, input: Partial<InputFrame> = {}) => {
    while (g.combatTick < at) step(input);
  };
  return { g, p, step, until, shots, sounds };
}
const opening = (g: Game) =>
    g.classCues().find((c) => c.kind === "soldier-ready"),
  motion = (g: Game) => g.classCues().find((c) => c.kind === "soldier-step"),
  loading = (g: Game) => g.classCues().find((c) => c.kind === "soldier-load");
const start = (f: ReturnType<typeof fixture>, ammo = 0) => {
  f.p.ammo = ammo;
  f.step({ technique2: true });
  const c = loading(f.g)!;
  assert(c.kind === "soldier-load");
  return c;
};

test("late gates and the one-capstone budget remain real rather than awarding a late build at entry", () => {
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("s", "Mara", "soldier");
  for (const item of path.slice(0, 3)) buy(g, p, item);
  assert.equal(p.totalSp, 12);
  assert.equal(
    g.transact(p.id, { id: "early", kind: "skill", item: ids.roving }).ok,
    false,
  );
  const f = fixture(true);
  assert.equal(f.p.totalSp, 27);
  assert.equal(
    f.p.skills.reduce((n, id) => n + f.g.skillCost(id), 0),
    18,
  );
  const cap = data.specializationSkills.find((s) => s.id === ids.volley)!;
  assert(cap.capstone && cap.grade === "SS+" && cap.freePlaySpRequired === 27);
  assert.equal(data.skills.length, 648);
  assert.equal(data.generalSkills.length, 4);
  // Isolate the global capstone rule with a deliberately enlarged UNIT fixture budget.
  const all = new Game({ mode: "endless" });
  all.encounter = 9;
  const q = all.addPlayer("q", "Mara", "soldier");
  q.totalSp = 100;
  const old = data.skills.find((s) => s.classId === "soldier" && s.capstone)!;
  const ancestors: string[] = [];
  let node: any = old;
  while (node) {
    ancestors.unshift(node.id);
    node = data.skills.find((s) => s.id === node.prerequisite);
  }
  for (const item of ancestors) buy(all, q, item);
  for (const item of path) if (!q.skills.includes(item)) buy(all, q, item);
  assert.equal(
    all.transact(q.id, { id: "two-caps", kind: "skill", item: ids.volley })
      .reason,
    "capstoneMaximum",
  );
});

test("only the first actual insertion creates a paid opening; starting work and full reload/refills do not", () => {
  const f = fixture(),
    c = start(f);
  assert(!opening(f.g));
  f.until(c.nextAt - 1);
  assert(!opening(f.g));
  f.step();
  const ready = opening(f.g)!;
  assert(ready.kind === "soldier-ready" && !ready.relay);
  assert.equal(
    ready.until - ready.at,
    Math.ceil(rules.readyWindowSeconds * HZ),
  );
  assert.equal(f.p.ammo, 1);
  assert.equal(f.sounds.filter((s) => s === "soldier-ready").length, 1);
  f.until(c.until);
  assert.equal(f.sounds.filter((s) => s === "soldier-ready").length, 1);
  for (const refill of ["reload", "ultimate"]) {
    const a = fixture();
    a.p.ammo = 0;
    a.step(refill === "reload" ? { reload: true } : { ultimate: true });
    if (a.p.reloadAt) a.until(a.p.reloadAt);
    assert(!opening(a.g));
    assert(!a.sounds.includes("soldier-ready"));
  }
});

test("Ready Round buys the existing vulnerable step without E and spends one real round only on commitment", () => {
  for (const fork of [undefined, ids.advance, ids.rear]) {
    const f = fixture(false, fork),
      c = start(f);
    f.until(c.nextAt);
    const ammo = f.p.ammo,
      health = f.p.health,
      dodge = f.p.dodgeAt;
    f.step({ technique1: true, moveX: 1 });
    const m = motion(f.g)!;
    assert(m.kind === "soldier-step" && m.loaded && !m.relay);
    assert.equal(f.p.ammo, ammo - rules.loadedStepAmmo);
    assert.equal(f.p.eAt, 0);
    assert.equal(f.p.invulnerableUntil, 0);
    assert.equal(f.p.dodgeAt, dodge);
    f.until(m.until);
    assert.equal(f.shots.length, fork === ids.advance ? 2 : 1);
    assert.equal(f.p.health, health);
    assert(!opening(f.g));
  }
});

test("a ready normal burst follow-up stays free and preserves the paid opening for its finite clock", () => {
  const f = fixture(),
    c = start(f);
  f.until(c.nextAt);
  const ready = opening(f.g)!,
    ammo = f.p.ammo;
  f.step({ e: true, technique1: true, moveX: 1 });
  const m = motion(f.g)!;
  assert(m.kind === "soldier-step" && !m.loaded);
  assert.equal(f.p.ammo, ammo);
  assert.equal(opening(f.g)?.id, ready.id);
  f.until(m.until);
  assert.equal(f.shots.length, 4);
  f.step({ technique1: true, moveX: 1 });
  assert(!motion(f.g));
  assert.equal(opening(f.g)?.id, ready.id);
  assert.equal(
    f.p.ammo,
    ammo +
      (f.g.combatTick >=
      c.nextAt + Math.ceil(data.weapons[0].reloadTime * 0.2 * HZ)
        ? 1
        : 0),
  );
});

test("S- readiness respects action recovery while the capstone's explicit alternate payment extends it", () => {
  for (const cap of [false, true]) {
    const f = fixture(cap),
      c = start(f);
    f.step({ e: true, technique1: true, moveX: 1 });
    f.until(c.nextAt);
    const before = f.g.kitStatus(f.p.id).technique1At!,
      ammo = f.p.ammo;
    assert(before > f.g.combatTick);
    f.step({ technique1: true, moveY: 1 });
    assert.equal(!!motion(f.g), cap);
    assert.equal(f.p.ammo, ammo - (cap ? 1 : 0));
    if (cap) assert(f.g.kitStatus(f.p.id).technique1At! > before);
    else assert.equal(f.g.kitStatus(f.p.id).technique1At, before);
  }
});

test("the relay waits for three actual insertions after the first paid body has arrived", () => {
  const f = fixture(true),
    c = start(f);
  f.until(c.nextAt);
  f.step({ technique1: true, moveX: 1 });
  const first = motion(f.g)!;
  assert(first.kind === "soldier-step");
  f.until(first.until);
  assert(!opening(f.g));
  const third =
    c.nextAt +
    2 *
      Math.ceil(
        data.weapons.find((w) => w.id === f.p.weapon)!.reloadTime *
          f.g.stats(f.p).reload *
          rules.drillRoundFraction *
          HZ,
      );
  f.until(third - 1);
  assert(!opening(f.g));
  f.step();
  const relay = opening(f.g)!;
  assert(relay.kind === "soldier-ready" && relay.relay);
  assert.equal(
    relay.until - relay.at,
    Math.ceil(rules.relayWindowSeconds * HZ),
  );
});

test("if three rounds arrive first, only completion of the first paid step earns the relay", () => {
  const f = fixture(true),
    c = start(f);
  const interval = Math.ceil(
    data.weapons.find((w) => w.id === f.p.weapon)!.reloadTime *
      f.g.stats(f.p).reload *
      rules.drillRoundFraction *
      HZ,
  );
  f.until(c.nextAt + interval * 2);
  assert(opening(f.g) && !opening(f.g)!.relay);
  f.step({ technique1: true, moveX: 1 });
  const first = motion(f.g)!;
  assert(first.kind === "soldier-step");
  f.until(first.until - 1);
  assert(!opening(f.g));
  f.step();
  assert(opening(f.g)?.relay);
});

test("two paid steps per drill keep all three variants, real ammunition and spent recovery; no relay loop", () => {
  for (const fork of [undefined, ids.advance, ids.rear]) {
    const f = fixture(true, fork),
      c = start(f);
    f.until(c.nextAt);
    f.step({ technique1: true, moveX: 1 });
    const first = motion(f.g)!;
    assert(first.kind === "soldier-step");
    f.until(first.until);
    const end = f.g.combatTick + 40;
    while (!opening(f.g)?.relay && f.g.combatTick < end) f.step();
    assert(opening(f.g)?.relay);
    const prior = f.g.kitStatus(f.p.id).technique1At!;
    f.step({ technique1: true, moveY: 1 });
    const second = motion(f.g)!;
    assert(second.kind === "soldier-step" && second.loaded && second.relay);
    assert(f.g.kitStatus(f.p.id).technique1At! > prior);
    f.until(Math.max(second.until, c.until) + 10, {
      technique1: true,
      moveX: 1,
    });
    assert.equal(f.p.ammo, 2);
    assert.equal(f.shots.length, fork === ids.advance ? 4 : 2);
    assert(!opening(f.g));
    assert(!motion(f.g));
    assert.equal(f.sounds.filter((s) => s === "soldier-ready").length, 2);
  }
});

test("invalid bounds/cover/lava and missing direction reject paid commitments before ammo, opening or recovery spend", () => {
  for (const kind of ["bounds", "cover", "lava", "direction"]) {
    const f = fixture(true),
      c = start(f);
    f.until(c.nextAt);
    if (kind === "bounds")
      f.p.x = f.p.oldX = f.g.arena.bounds.x + f.g.arena.bounds.width - 20;
    if (kind === "cover")
      f.g.obstacles.push({
        x: f.p.x + 30,
        y: f.p.y - 30,
        width: 20,
        height: 60,
      });
    if (kind === "lava")
      (f.g.arena.lavaPits as any[]).push({
        x: f.p.x + 45,
        y: f.p.y,
        radius: 8,
      });
    const ready = opening(f.g)!,
      ammo = f.p.ammo,
      at = f.g.kitStatus(f.p.id).technique1At;
    f.step({ technique1: true, moveX: kind === "direction" ? 0 : 1 });
    assert(!motion(f.g));
    assert.equal(opening(f.g)?.id, ready.id);
    assert.equal(f.p.ammo, ammo);
    assert.equal(f.g.kitStatus(f.p.id).technique1At, at);
  }
});

test("new cover or displacement cancels the first paid arrival and cannot earn a relay from elapsed time", () => {
  for (const kind of ["cover", "displacement"]) {
    const f = fixture(true),
      c = start(f);
    f.until(c.nextAt);
    f.step({ technique1: true, moveX: 1 });
    const m = motion(f.g)!;
    assert(m.kind === "soldier-step");
    if (kind === "cover")
      f.g.obstacles.push({
        x: f.p.x + 30,
        y: f.p.y - 30,
        width: 20,
        height: 60,
      });
    else f.p.y += 8;
    f.until(c.until + 20);
    assert(!motion(f.g));
    assert(!opening(f.g));
    assert.equal(f.p.ammo, 3);
    assert.equal(f.sounds.filter((s) => s === "soldier-ready").length, 1);
    assert(f.g.kitStatus(f.p.id).technique1At! > f.g.combatTick);
  }
});

test("manual B stop keeps an earned short opening but cannot replace the third insertion with an ultimate refill", () => {
  const f = fixture(true),
    c = start(f);
  f.until(c.nextAt);
  const ready = opening(f.g)!;
  f.step({ technique2: true });
  assert(!loading(f.g));
  assert.equal(opening(f.g)?.id, ready.id);
  f.step({ ultimate: true });
  assert.equal(opening(f.g)?.until, ready.until);
  f.step({ technique1: true, moveX: 1 });
  const m = motion(f.g)!;
  assert(m.kind === "soldier-step");
  f.until(m.until + 10);
  assert(!opening(f.g));
  assert.equal(f.sounds.filter((s) => s === "soldier-ready").length, 1);
});

test("ordinary Reload, accepted dodge, health loss and owner/weapon/technique loss clear readiness without recovery refunds", () => {
  for (const interruption of [
    "reload",
    "dodge",
    "health",
    "weapon",
    "disconnect",
    "skill",
  ]) {
    const f = fixture(true),
      c = start(f);
    f.step({ e: true, technique1: true, moveX: 1 });
    f.until(c.nextAt);
    const recovery = f.g.kitStatus(f.p.id);
    assert(opening(f.g));
    if (interruption === "reload") f.step({ reload: true });
    if (interruption === "dodge") f.step({ dodge: true, moveX: 1 });
    if (interruption === "health") (f.g as any).damage(f.p, 5);
    if (interruption === "weapon") {
      f.p.weapon = "soldier-1";
      f.step();
    }
    if (interruption === "disconnect") f.g.setConnected(f.p.id, false);
    if (interruption === "skill") {
      f.p.skills = f.p.skills.filter((id) => id !== ids.drill);
      f.step();
    }
    assert(!opening(f.g), interruption);
    assert.equal(f.g.kitStatus(f.p.id).technique1At, recovery.technique1At);
    assert.equal(f.g.kitStatus(f.p.id).technique2At, recovery.technique2At);
  }
});

test("expiry and host/phase cleanup remove readiness and no safe restore invents unfinished proof", () => {
  const f = fixture(true),
    c = start(f);
  f.until(c.nextAt);
  const until = opening(f.g)!.until;
  f.until(until);
  assert(!opening(f.g));
  assert(f.g.endByHost());
  assert(!opening(f.g));
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const id of [...path, ids.volley]) buy(g, p, id);
  const value = g.offlineCheckpoint()!;
  assert(value);
  const restored = Game.restoreOffline(value);
  assert.deepEqual(restored.players.get(p.id)!.skills, p.skills);
  assert.equal(restored.kitStatus(p.id).soldierReadyUntil, 0);
  assert(!opening(restored));
});

test("Breach Cadence's issued burst still completes during a free step and both paid legs", () => {
  const f = fixture(true, undefined, [
      "soldier-command-1",
      "soldier-command-2",
      "soldier-command-3",
    ]),
    c = start(f);
  f.step({ e: true, technique1: true, moveX: 1 });
  f.until(c.nextAt);
  f.step({ technique1: true, moveY: 1 });
  const first = motion(f.g)!;
  assert(first.kind === "soldier-step");
  f.until(first.until);
  while (!opening(f.g)?.relay && f.g.combatTick < c.until + 60) f.step();
  assert(opening(f.g)?.relay);
  f.step({ technique1: true, moveX: 1 });
  const second = motion(f.g)!;
  assert(second.kind === "soldier-step");
  f.until(second.until);
  assert.equal(f.shots.length, 6);
});

test("public readiness follows the owner and strips private drill/payment proof; HUD exposes the valid alternate payment", () => {
  const f = fixture(true),
    c = start(f);
  f.step({ e: true, technique1: true, moveX: 1 });
  f.until(c.nextAt);
  const ready = opening(f.g)!;
  assert(ready.kind === "soldier-ready");
  for (const key of [
    "source",
    "weapon",
    "proof",
    "rounds",
    "paidDrill",
    "paidLeg",
  ])
    assert(!(key in ready));
  const a = soldierActions(
    viewOf(f.g, f.p.id).players[0],
    f.g.combatTick,
  ).extras.find((a) => a.key === "technique1")!;
  assert.equal(a.at, 0);
  assert(!a.blocked);
  assert(f.g.kitStatus(f.p.id).technique1At! > f.g.combatTick);
  f.step({ technique1: true, moveY: 1 });
  const m = motion(f.g)!;
  assert(m.kind === "soldier-step");
  assert(!("paidDrill" in m) && !("paidLeg" in m));
});

test("missing ammunition and an already committed body cannot double-spend a paid opening", () => {
  const f = fixture(true),
    c = start(f);
  f.until(c.nextAt);
  const ready = opening(f.g)!,
    at = f.g.kitStatus(f.p.id).technique1At;
  f.p.ammo = 0;
  f.step({ technique1: true, moveX: 1 });
  assert(!motion(f.g));
  assert.equal(opening(f.g)?.id, ready.id);
  assert.equal(f.g.kitStatus(f.p.id).technique1At, at);
  f.until(
    c.nextAt +
      Math.ceil(
        data.weapons.find((w) => w.id === f.p.weapon)!.reloadTime *
          f.g.stats(f.p).reload *
          rules.drillRoundFraction *
          HZ,
      ),
  );
  assert.equal(f.p.ammo, 1);
  f.step({ technique1: true, moveX: 1 });
  const m = motion(f.g)!;
  assert(m.kind === "soldier-step");
  const paidAt = f.g.kitStatus(f.p.id).technique1At;
  f.step({ technique1: true, moveY: 1 });
  assert.equal(motion(f.g)?.id, m.id);
  assert.equal(f.p.ammo, 0);
  assert.equal(f.g.kitStatus(f.p.id).technique1At, paidAt);
});

test("health damage during a paid commitment loses the relay proof while the issued vulnerable step still travels", () => {
  const f = fixture(true),
    c = start(f);
  f.until(c.nextAt);
  f.step({ technique1: true, moveX: 1 });
  const m = motion(f.g)!;
  assert(m.kind === "soldier-step");
  const health = f.p.health;
  (f.g as any).damage(f.p, 5);
  assert(f.p.health < health);
  f.until(m.until + 40);
  assert(!opening(f.g));
  assert.equal(f.shots.length, 1);
  assert.equal(f.sounds.filter((s) => s === "soldier-ready").length, 1);
  assert(f.p.x >= m.toX - 0.02);
});

test("exact issued56 ownership migrates while new late ownership and wrong editions remain rejected", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const item of path.slice(0, 4)) buy(g, p, item);
  const value = g.offlineCheckpoint()!;
  assert(value);
  const issued = {
    ...value,
    contentRevision:
      "833b5a88a27000579adf2b9d5c12f113805d83184eb99dae71f9fba8cbf6a2fd",
    protocolVersion: 56,
  };
  const copy = Game.restoreOffline(structuredClone(issued));
  assert.equal(copy.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  assert.deepEqual(copy.players.get(p.id)!.skills, p.skills);
  for (const id of [ids.ready, ids.volley]) {
    const forged = structuredClone(issued);
    forged.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  }
  assert.throws(
    () => Game.restoreOffline({ ...issued, protocolVersion: 55 }),
    /versionMismatch/,
  );
});

test("actionable rejected steps explain ground/direction/ammo, retain rights and throttle feedback without combat allocation", () => {
  for (const reason of ["ground", "direction", "ammunition"]) {
    const f = fixture(true),
      c = start(f);
    f.until(c.nextAt);
    f.step({ technique2: true });
    const ready = opening(f.g)!,
      ammo = reason === "ammunition" ? 0 : f.p.ammo;
    f.p.ammo = ammo;
    if (reason === "ground")
      f.g.obstacles.push({
        x: f.p.x + 30,
        y: f.p.y - 30,
        width: 20,
        height: 60,
      });
    f.step({ technique1: true, moveX: reason === "direction" ? 0 : 1 });
    const cue = f.g.classCues().find((c) => c.kind === "soldier-step-reject")!;
    assert(
      cue.kind === "soldier-step-reject" && cue.reason === reason && cue.id < 0,
    );
    assert.equal(f.p.ammo, ammo);
    assert.equal(opening(f.g)?.until, ready.until);
    assert.equal(f.g.kitStatus(f.p.id).technique1At, 0);
    assert.equal(f.g.kitStatus(f.p.id).soldierStepRejectReason, reason);
  }
  const f = fixture(true),
    c = start(f);
  f.until(c.nextAt);
  f.step({ technique2: true });
  f.g.obstacles.push({ x: f.p.x + 30, y: f.p.y - 30, width: 20, height: 60 });
  f.p.input.moveX = 1;
  const context = (f.g as any).skirmisherContext();
  let allocations = 0;
  context.id = () => {
    allocations++;
    return 9999;
  };
  assert.equal(f.g.skirmisher.cast(f.p, context), false);
  assert.equal(allocations, 0);
  const rejected = f.g
      .classCues()
      .find((c) => c.kind === "soldier-step-reject")!,
    ammo = f.p.ammo;
  for (let n = 0; n < 8; n++) f.step({ technique1: true, moveX: 1 });
  assert.equal(
    f.g.classCues().find((c) => c.kind === "soldier-step-reject")!.id,
    rejected.id,
  );
  assert.equal(f.sounds.filter((s) => s === "soldier-step-reject").length, 1);
  assert.equal(f.p.ammo, ammo);
  f.g.obstacles.splice(0);
  f.step({ technique1: true, moveX: 1 });
  assert(motion(f.g));
  assert(!f.g.classCues().some((c) => c.kind === "soldier-step-reject"));
  assert.equal(f.p.ammo, ammo - 1);
});
