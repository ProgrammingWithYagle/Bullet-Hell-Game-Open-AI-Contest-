import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import {
  idleInput,
  HZ,
  DT,
  CONTENT_REVISION,
  type InputFrame,
} from "../src/shared/protocol.ts";
import {
  sniperIds as ids,
  sniperRules as r,
} from "../src/shared/soldier-sniper.ts";
import { viewOf } from "../src/shared/view.ts";
import { SurvivorActionClock } from "../src/client/survivor-action-presentation.ts";
import {
  sniperSample,
  isSniperSound,
} from "../src/client/soldier-sniper-sound.ts";
let serial = 0;
const buy = (g: Game, p: string, item: string) => {
  const result = g.transact(p, {
    id: "handling-" + ++serial,
    kind: "skill",
    item,
  });
  assert(result.ok, item + ":" + result.reason);
};
// Controlled Game fixtures isolate handling/physics; they are not natural runs or online proof.
function fixture(handling: "carry" | "clear" | "plain" = "carry") {
  const g = new Game({
      mode: "raid",
      difficulty: "normal",
      seed: 41,
      maxPlayers: 2,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("solo", "Mara", "soldier"),
    ally = g.addPlayer("ally", "Perrin", "medic");
  assert.equal(p.totalSp, 12);
  for (const item of [
    "soldier-ballistics-1",
    ids.entry,
    ...(handling === "plain" ? [] : [ids[handling]]),
  ])
    buy(g, p.id, item);
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
    until = (tick: number) => {
      let count = 0;
      while (g.combatTick < tick) {
        assert(++count < 400);
        step();
      }
    },
    kit = () => g.kitStatus(p.id),
    shots = () => [...g.shots.values()].filter((s) => g.sniper.has(s.id));
  return { g, p, ally, step, until, kit, shots };
}
test("the Sniper handling fork costs5SP through three real purchases and excludes its alternative in both directions", () => {
  const short = new Game({ mode: "short" }),
    s = short.addPlayer("s", "Mara", "soldier");
  for (const item of ["soldier-ballistics-1", ids.entry])
    buy(short, s.id, item);
  assert.equal(
    short.transact(s.id, { id: "too-early", kind: "skill", item: ids.carry })
      .ok,
    false,
  );
  for (const h of ["carry", "clear"] as const) {
    const g = new Game({ mode: "raid" }),
      p = g.addPlayer(h, "Mara", "soldier");
    for (const item of ["soldier-ballistics-1", ids.entry, ids[h]])
      buy(g, p.id, item);
    assert.equal(
      p.skills.reduce((n, id) => n + g.skillCost(id), 0),
      5,
    );
    assert.equal(p.totalSp, 12);
    assert.equal(
      g.transact(p.id, {
        id: "exclusive-" + h,
        kind: "skill",
        item: ids[h === "carry" ? "clear" : "carry"],
      }).reason,
      "incompatibleItem",
    );
    const node = data.specializationSkills.find((s) => s.id === ids[h])!;
    assert.equal(node.freePlaySpRequired, 5);
    assert.equal(node.prerequisite, ids.entry);
    assert.equal(node.capstone, false);
  }
});
test("Careful Carry moves the same paid round and resets settling at every actual position without extending its original deadline", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const original = f.kit();
  f.until(original.sniperReadyAt!);
  for (let n = 0; n < 7; n++) {
    const x = f.p.x;
    f.step({ moveX: 1, aim: 0.3 });
    assert(f.p.x > x);
    const k = f.kit();
    assert(k.sniperPrepared);
    assert.equal(
      k.sniperReadyAt! - f.g.combatTick,
      Math.ceil(r.settleSeconds * HZ),
    );
    assert.equal(k.sniperUntil, original.sniperUntil);
    assert.equal(k.sniperRecoveryAt, original.sniperRecoveryAt);
    assert.equal(f.p.ammo, ammo - 1);
    assert.equal(f.shots().length, 0);
    const cue = f.g.classCues().find((c) => c.kind === "soldier-sight")!;
    assert.equal(cue.x, f.p.x);
    assert.equal(cue.y, f.p.y);
    assert.equal(cue.aim, 0.3);
  }
  const at = f.kit().sniperReadyAt!;
  f.until(at);
  const origin = { x: f.p.x, y: f.p.y };
  f.step({ technique1: true });
  assert.equal(f.shots().length, 1);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.kit().sniperRecoveryAt, original.sniperRecoveryAt);
  assert(Math.abs(f.shots()[0].x - origin.x - r.speed * DT) < 0.001);
  assert.equal(f.shots()[0].y, origin.y);
});
test("movement on a ready Carry release tick restarts settling before the shot can be emitted", () => {
  const f = fixture();
  f.step({ technique1: true });
  f.until(f.kit().sniperReadyAt!);
  const until = f.kit().sniperUntil;
  f.step({ moveY: 1, technique1: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.shots().length, 0);
  assert.equal(
    f.kit().sniperReadyAt! - f.g.combatTick,
    Math.ceil(r.settleSeconds * HZ),
  );
  assert.equal(f.kit().sniperUntil, until);
});
test("continuous Carry relocation cannot outlive the original finite paid opportunity", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const k = f.kit();
  while (f.g.combatTick < k.sniperUntil!) f.step({ moveX: 1 });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.kit().sniperRecoveryAt, k.sniperRecoveryAt);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.shots().length, 0);
});
test("Careful Carry does not permit fresh moving preparation or spend a rejected round/recovery", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ moveX: 1, technique1: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperRecoveryAt, 0);
});
test("a held primary remains blocked while carrying; clearing needs a deliberate Reload and no shot is automatic", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ fire: true, technique1: true });
  for (let n = 0; n < 8; n++) f.step({ fire: true, moveX: 1 });
  assert(f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.kit().sniperPrimaryAt, 0);
  assert.equal(f.kit().sniperShotAt, 0);
  assert.equal(f.g.shots.size, 0);
});
test("Clear Chamber returns exactly the one reserved round, consumes that Reload press and retains actual spent recovery", () => {
  const f = fixture("clear");
  f.p.ammo -= 2;
  const ammo = f.p.ammo;
  f.step({ technique1: true });
  const k = f.kit();
  f.step({ reload: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.p.reloadAt, 0);
  assert.equal(f.kit().sniperRecoveryAt, k.sniperRecoveryAt);
  assert.equal(f.kit().sniperPrimaryAt, 0);
  assert.equal(f.kit().sniperShotAt, 0);
  assert.equal(f.shots().length, 0);
  assert(
    f.g
      .drainEvents()
      .some((e) => e.type === "sound" && e.id === "sniper-clear"),
  );
  f.step({ reload: true });
  assert(f.p.reloadAt > f.g.combatTick);
  assert.equal(f.p.ammo, ammo);
});
test("full-magazine Clear rejection preserves the same paid preparation and all original clocks", () => {
  const f = fixture("clear");
  f.step({ technique1: true });
  const before = f.kit();
  f.p.ammo = f.g.stats(f.p).magazine;
  f.step({ reload: true });
  const k = f.kit();
  assert(k.sniperPrepared);
  assert.equal(k.sniperUntil, before.sniperUntil);
  assert.equal(k.sniperReadyAt, before.sniperReadyAt);
  assert.equal(k.sniperRecoveryAt, before.sniperRecoveryAt);
  assert.equal(f.p.ammo, f.g.stats(f.p).magazine);
  assert.equal(f.p.reloadAt, 0);
  assert.equal(f.shots().length, 0);
});
test("a cleared round cannot be returned again and a fresh preparation still respects the original recovery", () => {
  const f = fixture("clear"),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const at = f.kit().sniperRecoveryAt;
  f.step({ reload: true });
  for (let n = 0; n < 3; n++) f.step({ reload: true, technique1: true });
  assert.equal(f.p.ammo, ammo);
  assert(!f.kit().sniperPrepared);
  assert.equal(f.kit().sniperRecoveryAt, at);
  assert.equal(f.p.reloadAt, 0);
});
test("Clear cancels without manufacturing a fire pose, even if its reservation happened between received views", () => {
  const f = fixture("clear"),
    clock = new SurvivorActionClock();
  clock.observe(viewOf(f.g, f.p.id));
  f.step({ technique1: true });
  f.step({ reload: true });
  const v = viewOf(f.g, f.p.id),
    p = v.players.find((p) => p.id === f.p.id)!;
  clock.observe(v);
  assert.equal(clock.pose(p, v, false)!.action, "idle");
  assert.equal(clock.pose(p, v, false, true)!.action, "idle");
  assert.equal(p.kit.sniperPrimaryAt, 0);
  assert.equal(p.kit.sniperShotAt, 0);
});
test("a Clear press with an already held primary returns the round without firing on that same press", () => {
  const f = fixture("clear"),
    ammo = f.p.ammo;
  f.step({ fire: true, technique1: true });
  f.step({ fire: true, reload: true });
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.g.shots.size, 0);
  assert.equal(f.kit().sniperPrimaryAt, 0);
  assert(!f.kit().sniperPrepared);
  f.step({ fire: true });
  assert(f.kit().sniperPrimaryAt! > 0);
  assert(f.p.ammo < ammo);
});
test("new primary plus Reload abandons preparation instead of recovering its reserved round", () => {
  const f = fixture("clear"),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  f.step({ fire: true, reload: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo - 1);
  assert(f.p.reloadAt > f.g.combatTick);
  assert.equal(f.kit().sniperShotAt, 0);
});
for (const h of ["plain", "carry"] as const)
  test(
    h + " retains ordinary paid cancellation and magazine reload on Reload",
    () => {
      const f = fixture(h),
        ammo = f.p.ammo;
      f.step({ technique1: true });
      const at = f.kit().sniperRecoveryAt;
      f.step({ reload: true });
      assert(!f.kit().sniperPrepared);
      assert.equal(f.p.ammo, ammo - 1);
      assert(f.p.reloadAt > f.g.combatTick);
      assert.equal(f.kit().sniperRecoveryAt, at);
    },
  );
for (const h of ["carry", "clear"] as const) {
  test(
    h +
      " actual health loss forfeits the paid round and cannot be undone by a later Clear request",
    () => {
      const f = fixture(h),
        ammo = f.p.ammo;
      f.step({ technique1: true });
      const at = f.kit().sniperRecoveryAt;
      f.p.invulnerableUntil = 0;
      f.p.shield = 0;
      const health = f.p.health;
      f.g.damage(f.p, 1);
      assert(f.p.health < health);
      assert(!f.kit().sniperPrepared);
      f.step({ reload: true });
      assert.equal(f.p.ammo, ammo - 1);
      assert.equal(f.kit().sniperRecoveryAt, at);
    },
  );
  test(
    h +
      " required handling loss cancels its existing paid preparation rather than laundering it into another variant",
    () => {
      const f = fixture(h),
        ammo = f.p.ammo;
      f.step({ technique1: true });
      const at = f.kit().sniperRecoveryAt;
      f.p.skills = f.p.skills.filter((id) => id !== ids[h]);
      f.step();
      assert(!f.kit().sniperPrepared);
      assert.equal(f.p.ammo, ammo - 1);
      assert.equal(f.kit().sniperRecoveryAt, at);
    },
  );
}
test("shield absorption leaves Clear preparation valid, without treating absorbed damage as health loss", () => {
  const f = fixture("clear"),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  f.p.invulnerableUntil = 0;
  f.p.shield = 2;
  const health = f.p.health;
  f.g.damage(f.p, 1);
  assert.equal(f.p.health, health);
  assert(f.p.shield < 2);
  assert(f.kit().sniperPrepared);
  f.step({ reload: true });
  assert.equal(f.p.ammo, ammo);
  assert(!f.kit().sniperPrepared);
});
test("an expired Clear preparation cannot recover its old round or restart its deadline", () => {
  const f = fixture("clear"),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const k = f.kit();
  f.until(k.sniperUntil!);
  f.step({ reload: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.kit().sniperRecoveryAt, k.sniperRecoveryAt);
  assert(f.p.reloadAt > f.g.combatTick);
});
test("exact issued62 ownership preserves Settled Shot/General while excluding future handling and online envelopes", () => {
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("solo", "Mara", "soldier");
  for (const item of [
    "soldier-ballistics-1",
    ids.entry,
    "general-sprint",
    "general-course-correction",
  ])
    buy(g, p.id, item);
  const save = {
      ...g.offlineCheckpoint()!,
      protocolVersion: 62,
      contentRevision:
        "dbed606e76c6a9eca213580505238a0b82ee041ec1590264b062e614928ae14c",
    },
    copy = Game.restoreOffline(structuredClone(save));
  assert.deepEqual(copy.players.get("solo")!.skills, p.skills);
  assert.equal(copy.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  for (const id of [ids.carry, ids.clear]) {
    const future = structuredClone(save);
    future.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  }
  for (const patch of [
    { protocolVersion: 61 },
    { protocolVersion: 63 },
    { practiceOnly: false },
    { serverOnly: true },
  ])
    assert.throws(
      () => Game.restoreOffline({ ...save, ...patch }),
      /versionMismatch/,
    );
});
test("current boundaries reject the incompatible pair and preserve a legal single handling as local ownership", () => {
  for (const h of ["carry", "clear"] as const) {
    const g = new Game({ mode: "raid" }),
      p = g.addPlayer("solo", "Mara", "soldier");
    for (const item of ["soldier-ballistics-1", ids.entry, ids[h]])
      buy(g, p.id, item);
    const save = g.offlineCheckpoint()!;
    assert.deepEqual(
      Game.restoreOffline(structuredClone(save)).players.get("solo")!.skills,
      p.skills,
    );
    save.player.skills.push(ids[h === "carry" ? "clear" : "carry"]);
    assert.throws(() => Game.restoreOffline(save));
  }
});
test("the Clear sound is finite, distinct from settling and bounded at common sample rates", () => {
  assert(isSniperSound("sniper-clear"));
  for (const rate of [22050, 44100, 48000]) {
    const a = Array.from({ length: Math.ceil(0.2 * rate) }, (_, i) =>
      sniperSample("sniper-clear", i / rate),
    );
    assert(a.every(Number.isFinite));
    assert(a.some((v) => Math.abs(v) > 0.01));
    assert(Math.max(...a.map(Math.abs)) <= 0.5);
    assert(a[0] === 0 && a.at(-1) === 0);
    assert.notDeepEqual(
      a,
      a.map((_, i) => sniperSample("sniper-settle", i / rate)),
    );
  }
});
