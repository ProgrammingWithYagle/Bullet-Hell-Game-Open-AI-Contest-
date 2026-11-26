import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import {
  idleInput,
  HZ,
  CONTENT_REVISION,
  type InputFrame,
} from "../src/shared/protocol.ts";
import {
  sniperId as id,
  sniperRules as r,
} from "../src/shared/soldier-sniper.ts";
let serial = 0;
const buy = (g: Game, p: string, item: string) => {
  const result = g.transact(p, {
    id: "sniper-" + ++serial,
    kind: "skill",
    item,
  });
  assert(result.ok, item + ":" + result.reason);
};
// Controlled fixtures isolate authority/physics; they are not natural progression or online proof.
function fixture() {
  const g = new Game({
      mode: "short",
      difficulty: "normal",
      seed: 41,
      maxPlayers: 2,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("solo", "Mara", "soldier"),
    ally = g.addPlayer("ally", "Perrin", "medic");
  assert.equal(p.totalSp, 3);
  buy(g, p.id, "soldier-ballistics-1");
  buy(g, p.id, id);
  assert(g.start());
  g.boss.id = "constable";
  (g as any).director.reset("constable");
  g.boss.x = 1200;
  g.boss.y = 600;
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.deadline = g.boss.staggerUntil = 1e9;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = 0;
  g.arena.lavaPits.length = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  ally.x = ally.oldX = 1400;
  ally.y = ally.oldY = 900;
  g.drainEvents();
  let sequence = 0;
  const step = (input: Partial<InputFrame> = {}) => {
      assert(
        g.submitInput(p.id, {
          ...idleInput(),
          sequence: ++sequence,
          aim: 0,
          ...input,
        }),
      );
      g.step();
    },
    until = (tick: number, aim = 0) => {
      let count = 0;
      while (g.combatTick < tick) {
        assert(++count < 1000);
        step({ aim });
      }
    },
    kit = () => g.kitStatus(p.id),
    shots = () => [...g.shots.values()].filter((s) => g.sniper.has(s.id)),
    release = (aim = 0) => {
      step({ technique1: true, aim });
      until(kit().sniperReadyAt!, aim);
      step({ technique1: true, aim });
      assert(shots().length);
      return shots()[0];
    };
  return { g, p, ally, step, until, kit, shots, release };
}

test("ordinary Short buys the actual first Sniper operation with two purchases and symmetric discipline conflicts", () => {
  const g = new Game({ mode: "short" }),
    p = g.addPlayer("solo", "Mara", "soldier");
  assert.equal(
    g.transact(p.id, { id: "early", kind: "skill", item: id }).ok,
    false,
  );
  buy(g, p.id, "soldier-ballistics-1");
  buy(g, p.id, id);
  assert.equal(
    p.totalSp - p.skills.reduce((n, id) => n + g.skillCost(id), 0),
    0,
  );
  for (const other of [
    "soldier-skirmisher-1",
    "soldier-marksman-1",
    "soldier-grenadier-1",
  ]) {
    assert.equal(
      g.transact(p.id, { id: other, kind: "skill", item: other }).ok,
      false,
    );
    const h = new Game({ mode: "raid" }),
      q = h.addPlayer("other", "Mara", "soldier");
    buy(h, q.id, "soldier-ballistics-1");
    buy(h, q.id, other);
    assert.equal(
      h.transact(q.id, { id: "blocked", kind: "skill", item: id }).reason,
      "incompatibleItem",
    );
  }
});
test("one actual round is reserved on stationary preparation; settling never fires and manual release spends it only once", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const q = f.kit();
  assert(q.sniperPrepared);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(
    q.sniperReadyAt! - f.g.combatTick,
    Math.ceil(r.settleSeconds * HZ),
  );
  assert.equal(
    q.sniperUntil! - f.g.combatTick,
    Math.ceil(r.preparationSeconds * HZ),
  );
  assert.equal(f.shots().length, 0);
  f.until(q.sniperReadyAt! + 3);
  assert.equal(f.shots().length, 0);
  assert(f.kit().sniperPrepared);
  f.step({ technique1: true });
  assert.equal(f.shots().length, 1);
  assert.equal(f.p.ammo, ammo - 1);
  assert(!f.kit().sniperPrepared);
  assert.equal(f.kit().sniperRecoveryAt, q.sniperRecoveryAt);
  assert.equal(f.p.eAt, 0);
  assert.equal(f.shots()[0].visual, undefined);
});
test("early release rejection keeps the paid preparation, original deadline and recovery", () => {
  const f = fixture();
  f.step({ technique1: true });
  const q = f.kit(),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.kit().sniperUntil, q.sniperUntil);
  assert.equal(f.kit().sniperReadyAt, q.sniperReadyAt);
  assert.equal(f.kit().sniperRecoveryAt, q.sniperRecoveryAt);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.shots().length, 0);
});
test("a small deliberate re-aim retains settling; recentering restarts it without extending total preparation", () => {
  const f = fixture();
  f.step({ technique1: true });
  const q = f.kit();
  f.step({ aim: r.aimArc * 0.5 });
  assert.equal(f.kit().sniperReadyAt, q.sniperReadyAt);
  f.step({ aim: r.aimArc + 0.001 });
  assert.equal(
    f.kit().sniperReadyAt,
    f.g.combatTick + Math.ceil(r.settleSeconds * HZ),
  );
  assert.equal(f.kit().sniperUntil, q.sniperUntil);
  assert.equal(f.kit().sniperRecoveryAt, q.sniperRecoveryAt);
  const ready = f.kit().sniperReadyAt!;
  f.until(ready, r.aimArc + 0.001);
  const aim = r.aimArc + 0.05;
  f.step({ technique1: true, aim });
  const shot = f.shots()[0];
  assert(shot);
  assert(Math.abs(Math.atan2(shot.vy, shot.vx) - aim) < 1e-10);
});
test("settled bearings wrap across pi without an invented full turn or automatic release", () => {
  const f = fixture();
  f.step({ technique1: true, aim: Math.PI - 0.05 });
  const q = f.kit();
  f.step({ aim: -Math.PI + 0.05 });
  assert.equal(f.kit().sniperReadyAt, q.sniperReadyAt);
  assert.equal(f.kit().sniperUntil, q.sniperUntil);
  assert.equal(f.shots().length, 0);
});
test("preparation expiry loses the reserved round, retains recovery and creates no shot or ammunition refund", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const q = f.kit();
  f.until(q.sniperUntil!);
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.kit().sniperRecoveryAt, q.sniperRecoveryAt);
  assert.equal(f.shots().length, 0);
  f.step({ technique1: true });
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.shots().length, 0);
});
test("held primary stays blocked, while release then a fresh trigger abandons the paid preparation", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique1: true, fire: true });
  for (let i = 0; i < 6; i++) f.step({ fire: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.g.shots.size, 0);
  f.step();
  f.step({ fire: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo - 2);
  assert.equal(f.shots().length, 0);
  assert.equal(f.g.shots.size, 1);
});
test("actual movement abandons the paid point without rooting or protecting the player", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ moveX: 1, technique1: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo);
  f.step();
  f.step({ technique1: true });
  assert(f.kit().sniperPrepared);
  const x = f.p.x,
    at = f.kit().sniperRecoveryAt,
    spawnInvulnerability = f.p.invulnerableUntil;
  f.step({ moveX: 1 });
  assert(f.p.x > x);
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.kit().sniperRecoveryAt, at);
  assert.equal(f.p.invulnerableUntil, spawnInvulnerability);
});
test("body displacement and actual health loss cancel; absorbed damage does not lose the prepared round", () => {
  const f = fixture();
  f.step({ technique1: true });
  const healthBeforeShield = f.p.health;
  f.p.invulnerableUntil = 0;
  f.p.shield = 10;
  (f.g as any).damage(f.p, 1);
  assert.equal(f.p.health, healthBeforeShield);
  assert(
    f.p.shield < 10,
    "the real shield absorbed damage outside spawn protection",
  );
  assert(f.kit().sniperPrepared);
  f.p.shield = 0;
  f.p.invulnerableUntil = 0;
  (f.g as any).damage(f.p, 1);
  assert(!f.kit().sniperPrepared);
  const h = fixture();
  h.step({ technique1: true });
  h.p.x += 0.1;
  h.p.oldX = h.p.x;
  h.step({ technique1: true });
  assert(!h.kit().sniperPrepared);
  assert.equal(h.shots().length, 0);
});
test("busy/empty/incompatible fresh requests spend no round or recovery, and incompatible held actions retain paid costs", () => {
  for (const action of ["reload", "dodge", "e", "ultimate"] as const) {
    const f = fixture();
    f.step({ technique1: true });
    const at = f.kit().sniperRecoveryAt;
    f.step({ [action]: true });
    assert(!f.kit().sniperPrepared, action);
    assert.equal(f.kit().sniperRecoveryAt, at, action);
  }
  for (const busy of [
    "reloadAt",
    "dashUntil",
    "channelUntil",
    "overdriveUntil",
  ] as const) {
    const f = fixture();
    f.p[busy] = 100;
    const ammo = f.p.ammo;
    f.step({ technique1: true });
    assert.equal(f.p.ammo, ammo, busy);
    assert.equal(f.kit().sniperRecoveryAt, 0, busy);
  }
  const f = fixture();
  f.p.ammo = 0;
  f.step({ technique1: true });
  assert.equal(f.kit().sniperRecoveryAt, 0);
  assert(!f.kit().sniperPrepared);
});
test("a full actual friendly pool rejects preparation and preserves an already paid release opportunity", () => {
  for (const held of [false, true]) {
    const f = fixture();
    if (held) {
      f.step({ technique1: true });
      f.until(f.kit().sniperReadyAt!);
    }
    while (f.g.shots.size < 6000)
      (f.g as any).emitShot(f.ally.id, 1400, 900, 0, 0, 1, 1, 0, 20);
    const before = f.kit(),
      ammo = f.p.ammo;
    assert.equal(f.g.sniper.cast(f.p, (f.g as any).sniperContext()), false);
    assert.equal(f.p.ammo, ammo);
    assert.equal(f.kit().sniperUntil, before.sniperUntil);
    assert.equal(f.kit().sniperRecoveryAt, before.sniperRecoveryAt);
    assert.equal(f.shots().length, 0);
  }
});
test("a released direct shot travels physically, stops at actual cover and never banks to a target beyond it", () => {
  const f = fixture();
  f.g.arena.obstacles.push({ x: 655, y: 580, width: 20, height: 40 });
  const shot = f.release(),
    before = f.g.boss.health;
  assert(Math.abs(shot.x - 600 - r.speed / HZ) < 1e-7);
  f.step();
  assert(!f.g.shots.has(shot.id));
  assert.equal(f.g.boss.health, before);
  assert.equal(f.shots().length, 0);
});
test("a released shot uses the actual firing origin for armor even when its living owner moves before impact", () => {
  const f = fixture();
  f.g.boss.x = 740;
  let origin: any;
  const original = (f.g as any).hitBoss.bind(f.g);
  (f.g as any).hitBoss = (
    p: any,
    damage: number,
    ignore: boolean,
    point: any,
  ) => {
    origin = { ...point };
    return original(p, damage, ignore, point);
  };
  const before = f.g.boss.health,
    shot = f.release();
  f.p.x = f.p.oldX = 500;
  for (let n = 0; n < 8 && f.g.shots.has(shot.id); n++) f.step();
  assert(!f.g.shots.has(shot.id));
  assert(f.g.boss.health < before);
  assert.deepEqual(origin, { x: 600, y: 600 });
});
test("disconnect, downing, weapon/technique loss and host exit remove actual flight without rostered recovery refunds", () => {
  for (const reason of [
    "disconnect",
    "down",
    "weapon",
    "technique",
    "host",
  ] as const) {
    const f = fixture(),
      shot = f.release(),
      at = f.kit().sniperRecoveryAt;
    if (reason === "disconnect") f.g.setConnected(f.p.id, false);
    else if (reason === "down") {
      f.p.invulnerableUntil = 0;
      (f.g as any).damage(f.p, 1e6);
    } else if (reason === "weapon") {
      f.p.weapon = "soldier-1";
      f.step();
    } else if (reason === "technique") {
      f.p.skills = f.p.skills.filter((s) => s !== id);
      f.step();
      f.p.skills.push(id);
    } else f.g.endByHost();
    assert(!f.g.shots.has(shot.id), reason);
    assert(!f.g.classCues().some((c) => c.kind === "soldier-sight"), reason);
    assert(
      f.g
        .drainEvents()
        .some((e) => e.type === "remove" && e.ids.includes(shot.id)),
      reason,
    );
    if (reason !== "host") assert.equal(f.kit().sniperRecoveryAt, at, reason);
  }
});
test("exact issued61 preserves late Grenadier ownership and all General choices while rejecting future Sniper and online envelopes", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("p", "Mara", "soldier");
  for (const item of [
    "soldier-ballistics-1",
    "soldier-grenadier-1",
    "soldier-grenadier-skim-1",
    "soldier-grenadier-pitch-1",
    "general-sprint",
    "general-course-correction",
    "general-brake-step",
    "general-double-dash",
  ])
    buy(g, p.id, item);
  const save = {
      ...g.offlineCheckpoint()!,
      protocolVersion: 61,
      contentRevision:
        "8cc259ca145f72fd2492e1e1f7576e567fb41a903fc1a8e7fb5fda042379e37f",
    },
    copy = Game.restoreOffline(structuredClone(save));
  assert.deepEqual(copy.players.get("solo")!.skills, p.skills);
  assert.equal(copy.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  const future = structuredClone(save);
  future.player.skills.push(id);
  assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  for (const patch of [
    { protocolVersion: 60 },
    { protocolVersion: 62 },
    { practiceOnly: false },
    { serverOnly: true },
  ])
    assert.throws(
      () => Game.restoreOffline({ ...save, ...patch }),
      /versionMismatch/,
    );
  assert.equal(data.specializationSkills.find((s) => s.id === id)!.cost, 2);
});

test("already issued Breach Cadence completes its three actual shots before Sniper settling; rejected setup spends nothing", () => {
  const g = new Game({ mode: "endless", seed: 41 });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier");
  for (const item of [
    "soldier-ballistics-1",
    id,
    "soldier-command-1",
    "soldier-command-2",
    "soldier-command-3",
  ])
    buy(g, p.id, item);
  assert(g.start());
  g.boss.staggerUntil = 1e6;
  let sequence = 0;
  const step = (input: object = {}) => {
    assert(
      g.submitInput(p.id, { ...idleInput(), sequence: ++sequence, ...input }),
    );
    g.step();
  };
  step({ e: true });
  const at = p.eAt,
    ammo = p.ammo,
    last = g.combatTick + Math.ceil(0.24 * HZ);
  while (g.combatTick < last - 1) {
    step({ technique1: true });
    assert(
      !g.kitStatus(p.id).sniperPrepared,
      "the actual burst still owns its firing commitment",
    );
    assert.equal(g.kitStatus(p.id).sniperRecoveryAt, 0);
    assert.equal(p.ammo, ammo);
  }
  step({ technique1: true });
  assert(g.kitStatus(p.id).sniperPrepared);
  assert.equal(p.ammo, ammo - 1);
  assert.equal(p.eAt, at);
  assert.equal(
    g
      .drainEvents()
      .filter((e) => e.type === "shots")
      .flatMap((e) => (e.type === "shots" ? e.shots : []))
      .filter((s) => s.owner === p.id).length,
    3,
  );
});

test("purple percentage health loss immediately abandons the paid Sniper round even if a later real heal restores health", () => {
  const f = fixture();
  f.step({ technique1: true });
  const at = f.kit().sniperRecoveryAt,
    health = f.p.health,
    ammo = f.p.ammo;
  f.p.invulnerableUntil = 0;
  assert((f.g as any).purpleStamp(f.p, 0, true));
  assert(f.p.health < health);
  (f.g as any).heal(f.ally, f.p, health);
  assert.equal(f.p.health, health);
  assert(
    !f.kit().sniperPrepared,
    "the actual loss event survives a subsequent heal",
  );
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperRecoveryAt, at);
  assert.equal(f.shots().length, 0);
});
