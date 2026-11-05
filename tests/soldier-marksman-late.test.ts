import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import {
  HZ,
  CONTENT_REVISION,
  idleInput,
  type InputFrame,
} from "../src/shared/protocol.ts";
import {
  marksmanIds as ids,
  marksmanRules as rules,
} from "../src/shared/soldier-marksman.ts";
let serial = 0;
const buy = (g: Game, p: string, item: string) => {
  const r = g.transact(p, { id: "late-" + ++serial, kind: "skill", item });
  assert(r.ok, item + ":" + r.reason);
};
const near = (a: number, b: number, e = 1e-6) =>
  assert(Math.abs(a - b) <= e, a + " vs " + b);
// Controlled legal27SP fixtures isolate authority. Natural rewards/replays are separate evidence.
function fixture(skills: string[] = []) {
  const g = new Game({
    mode: "endless",
    difficulty: "normal",
    seed: 41,
    maxPlayers: 2,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier"),
    ally = g.addPlayer("ally", "Perrin", "medic");
  assert.equal(p.totalSp, 27);
  for (const id of ["soldier-ballistics-1", ids.entry, ids.pair, ...skills])
    buy(g, p.id, id);
  assert(g.start());
  g.boss.id = "constable";
  (g as any).director.reset("constable");
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.deadline = g.boss.staggerUntil = 1e9;
  g.boss.x = 1200;
  g.boss.y = 200;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = 0;
  g.arena.obstacles.push({ x: 640, y: 500, width: 20, height: 300 });
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  p.aim = 0;
  ally.x = ally.oldX = 1400;
  ally.y = ally.oldY = 900;
  g.drainEvents();
  let sequence = 0;
  const step = (action: Partial<InputFrame> = {}) => {
    assert(
      g.submitInput(p.id, {
        ...idleInput(),
        aim: 0,
        sequence: ++sequence,
        ...action,
      }),
    );
    g.step();
  };
  const until = (time: number) => {
    while (g.combatTick < time) step();
  };
  const shots = () => [...g.shots.values()].filter((s) => g.marksman.has(s.id));
  const wait = (check: () => boolean) => {
    for (let n = 0; n < 100 && !check(); n++) step();
    assert(check());
  };
  const first = (c = false) => {
    step({ technique1: c, technique2: true });
    wait(() => g.kitStatus(p.id).soldierPairUntil! > g.combatTick);
  };
  const relay = () => {
    first(true);
    step({ technique2: true });
    wait(() => g.kitStatus(p.id).soldierRelayUntil! > g.combatTick);
  };
  return { g, p, ally, step, until, shots, wait, first, relay };
}

test("late earned gates, optional Held Measure and one-capstone opportunity cost remain authoritative", () => {
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("p", "Mara", "soldier");
  for (const id of ["soldier-ballistics-1", ids.entry, ids.pair])
    buy(g, p.id, id);
  for (const id of [ids.reserve, ids.relay, ids.twin])
    assert.equal(
      g.transact(p.id, { id: "early-" + id, kind: "skill", item: id }).ok,
      false,
    );
  const f = fixture([ids.carom, ids.relay, ids.twin]);
  assert(!f.p.skills.includes(ids.reserve));
  assert.equal(
    f.p.skills.reduce((sum, id) => sum + f.g.skillCost(id), 0),
    17,
  );
  assert.equal(data.rules.maximumActiveCapstones, 1);
  const current = new Game({ mode: "endless" });
  current.encounter = 9;
  const q = current.addPlayer("q", "Mara", "soldier");
  for (const id of [
    "soldier-ballistics-1",
    ids.entry,
    ids.pair,
    ids.relay,
    ids.twin,
  ])
    buy(current, q.id, id);
  const other = data.skills.filter(
      (s) => s.classId === "soldier" && s.capstone,
    )[0],
    chain: string[] = [];
  let n: any = other;
  while (n) {
    chain.unshift(n.id);
    n = data.skills.find((s) => s.id === n.prerequisite);
  }
  for (const id of chain.slice(0, -1))
    if (!q.skills.includes(id))
      current.transact(q.id, {
        id: "foundation-" + id,
        kind: "skill",
        item: id,
      });
  // Controlled guard fixture: ordinary spending cannot reach two complete capstone chains within27SP.
  for (const id of chain.slice(0, -1))
    if (!q.skills.includes(id)) q.skills.push(id);
  assert.deepEqual(
    current.transact(q.id, {
      id: "another-capstone",
      kind: "skill",
      item: other.id,
    }),
    { ok: false, reason: "capstoneMaximum" },
  );
});

test("Held Measure uses one actual manual reload and preserves spent B recovery through its real completion", () => {
  const f = fixture([ids.reserve]);
  f.first();
  const original = f.g.kitStatus(f.p.id),
    ammo = f.p.ammo;
  f.step({ reload: true });
  assert(f.p.reloadAt > f.g.combatTick);
  const held = f.g.kitStatus(f.p.id),
    end = f.p.reloadAt;
  assert(held.soldierPairHeld);
  assert(held.soldierPairUntil! > original.soldierPairUntil!);
  assert.equal(
    held.soldierPairUntil,
    Math.min(
      end + Math.ceil(rules.reserveGrace * HZ),
      f.g.combatTick + Math.ceil(rules.reserveMaximum * HZ),
    ),
  );
  f.step({ technique2: true });
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.g.kitStatus(f.p.id).technique2At, original.technique2At);
  f.until(end);
  assert.equal(f.p.reloadAt, 0);
  assert.equal(f.p.ammo, f.g.stats(f.p).magazine);
  assert(!f.g.kitStatus(f.p.id).soldierPairHeld);
  f.step({ technique2: true });
  assert.equal(f.p.ammo, f.g.stats(f.p).magazine - 1);
  assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil, 0);
  assert.equal(f.g.kitStatus(f.p.id).technique2At, original.technique2At);
});

test("reload before contact, a full magazine and repeated reload cannot manufacture or renew reserved proof", () => {
  const before = fixture([ids.reserve]);
  before.step({ technique2: true, reload: true });
  assert(!before.g.kitStatus(before.p.id).soldierPairHeld);
  const f = fixture([ids.reserve]);
  f.first();
  f.p.ammo = f.g.stats(f.p).magazine;
  const original = f.g.kitStatus(f.p.id).soldierPairUntil;
  f.step({ reload: true });
  assert.equal(f.p.reloadAt, 0);
  assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil, original);
  assert(!f.g.kitStatus(f.p.id).soldierPairHeld);
  const repeat = fixture([ids.reserve]);
  repeat.first();
  repeat.step({ reload: true });
  const until = repeat.g.kitStatus(repeat.p.id).soldierPairUntil!;
  repeat.until(repeat.p.reloadAt);
  repeat.step({ fire: true });
  repeat.step({ reload: true });
  assert.equal(repeat.g.kitStatus(repeat.p.id).soldierPairUntil, until);
  repeat.until(until);
  assert.equal(repeat.g.kitStatus(repeat.p.id).soldierPairUntil, 0);
});

test("reserved proof is capped, and dodge/channel/overdrive/weapon/technique interruption keeps spent recovery", () => {
  const cap = fixture([ids.reserve]);
  cap.first();
  cap.p.reloadAt = cap.g.combatTick + 300;
  assert(cap.g.marksman.reservePair(cap.p, (cap.g as any).marksmanContext()));
  assert.equal(
    cap.g.kitStatus(cap.p.id).soldierPairUntil,
    cap.g.combatTick + Math.ceil(rules.reserveMaximum * HZ),
  );
  for (const reason of [
    "dodge",
    "channel",
    "overdrive",
    "weapon",
    "technique",
  ] as const) {
    const f = fixture([ids.reserve]);
    f.first();
    f.step({ reload: true });
    const at = f.g.kitStatus(f.p.id).technique2At;
    if (reason === "dodge") f.step({ dodge: true, moveY: 1 });
    else {
      if (reason === "channel") f.p.channelUntil = f.g.combatTick + 30;
      else if (reason === "overdrive") f.p.overdriveUntil = f.g.combatTick + 30;
      else if (reason === "weapon") f.p.weapon = "soldier-1";
      else f.p.skills = f.p.skills.filter((s) => s !== ids.reserve);
      f.step();
    }
    assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil, 0, reason);
    assert.equal(f.g.kitStatus(f.p.id).technique2At, at);
  }
});

test("only the second paid B shot's actual bank earns Angle Relay, and one C spends a real round and extends recovery", () => {
  const f = fixture([ids.relay]);
  f.first(true);
  assert.equal(f.g.kitStatus(f.p.id).soldierRelayUntil, 0);
  const at = f.g.kitStatus(f.p.id).technique1At!;
  f.step({ technique2: true });
  f.wait(() => f.g.kitStatus(f.p.id).soldierRelayUntil! > f.g.combatTick);
  const until = f.g.kitStatus(f.p.id).soldierRelayUntil!,
    ammo = f.p.ammo;
  assert.equal(until - f.g.combatTick, Math.ceil(rules.relayWindow * HZ));
  assert(at > f.g.combatTick);
  f.step({ technique1: true });
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.g.kitStatus(f.p.id).soldierRelayUntil, 0);
  assert.equal(
    f.g.kitStatus(f.p.id).technique1At,
    at + Math.ceil(rules.cooldown * f.g.stats(f.p).cooldown * HZ),
  );
  f.step({ technique1: true });
  assert.equal(f.p.ammo, ammo - 1);
  for (let n = 0; n < 10; n++) f.step();
  assert.equal(f.g.kitStatus(f.p.id).soldierRelayUntil, 0);
});

test("a ready ordinary C consumes the same relay, while a second B intercepted before cover cannot earn one", () => {
  const f = fixture([ids.relay, ids.twin]);
  f.first();
  f.step({ technique2: true });
  f.wait(() => f.g.kitStatus(f.p.id).soldierRelayUntil! > f.g.combatTick);
  const ammo = f.p.ammo;
  f.step({ technique1: true });
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.g.kitStatus(f.p.id).soldierRelayUntil, 0);
  const hit = fixture([ids.relay]);
  hit.first(true);
  hit.g.spawnMinion({
    kind: "ordinary",
    x: 620,
    y: 600,
    health: 100,
    speed: 0,
    radius: 2,
    damage: 0,
  });
  hit.step({ technique2: true });
  for (let n = 0; n < 6; n++) hit.step();
  assert.equal(hit.g.kitStatus(hit.p.id).soldierRelayUntil, 0);
});

test("Twin Lanes emits two independent real trajectories at the manual spread and spends exactly two rounds once", () => {
  for (const fork of [ids.carom, ids.line]) {
    const f = fixture([fork, ids.relay, ids.twin]);
    f.relay();
    const before = new Set(f.shots().map((s) => s.id)),
      ammo = f.p.ammo,
      at = f.g.kitStatus(f.p.id).technique1At!;
    f.g.drainEvents();
    f.step({ technique1: true, aim: Math.PI / 2 });
    const pair = f.shots().filter((s) => !before.has(s.id));
    assert.equal(pair.length, 2);
    assert.equal(f.p.ammo, ammo - 2);
    assert.equal(new Set(pair.map((s) => s.id)).size, 2);
    for (const shot of pair) {
      near(Math.hypot(shot.vx, shot.vy), rules.speed);
      near(shot.damage, rules.damage * f.g.stats(f.p).ability);
      assert.equal(shot.owner, f.p.id);
    }
    const aims = pair.map((s) => Math.atan2(s.vy, s.vx)).sort((a, b) => a - b);
    near(aims[0], Math.PI / 2 - (rules.twinDegrees * Math.PI) / 180);
    near(aims[1], Math.PI / 2 + (rules.twinDegrees * Math.PI) / 180);
    assert.equal(
      f.g.kitStatus(f.p.id).technique1At,
      at + Math.ceil(rules.cooldown * HZ),
    );
    assert.equal(f.g.kitStatus(f.p.id).soldierRelayUntil, 0);
    assert.equal(
      f.g
        .drainEvents()
        .filter((e) => e.type === "sound" && e.id === "soldier-bank-shot")
        .length,
      1,
    );
  }
});

test("one round or only one free pool slot rejects Twin Lanes atomically without spending either recovery or relay", () => {
  for (const reason of ["ammo", "pool"] as const) {
    const f = fixture([ids.relay, ids.twin]);
    f.relay();
    if (reason === "ammo") f.p.ammo = 1;
    else
      while (f.g.shots.size < 5999)
        (f.g as any).emitShot(f.ally.id, 1400, 900, 0, 1, 0, 1, 0, 10);
    const count = f.g.shots.size,
      ammo = f.p.ammo,
      at = f.g.kitStatus(f.p.id).technique1At,
      until = f.g.kitStatus(f.p.id).soldierRelayUntil;
    f.g.drainEvents();
    assert.equal(f.g.marksman.cast(f.p, (f.g as any).marksmanContext()), false);
    assert.equal(f.g.shots.size, count);
    assert.equal(f.p.ammo, ammo);
    assert.equal(f.g.kitStatus(f.p.id).technique1At, at);
    assert.equal(f.g.kitStatus(f.p.id).soldierRelayUntil, until);
    assert(!f.g.drainEvents().some((e) => e.type === "shots"));
  }
});

test("expired relay and owner/required-technique/phase loss never restore or regenerate unfinished rights", () => {
  const f = fixture([ids.relay, ids.twin]);
  f.relay();
  const ammo = f.p.ammo,
    at = f.g.kitStatus(f.p.id).technique1At;
  f.until(f.g.kitStatus(f.p.id).soldierRelayUntil!);
  f.step({ technique1: true });
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.g.kitStatus(f.p.id).technique1At, at);
  for (const reason of ["disconnect", "technique", "host"] as const) {
    const q = fixture([ids.relay, ids.twin]);
    q.relay();
    if (reason === "disconnect") q.g.setConnected(q.p.id, false);
    else if (reason === "technique") {
      q.p.skills = q.p.skills.filter((s) => s !== ids.relay);
      q.step();
    } else q.g.endByHost();
    assert.equal(q.g.marksman.status(q.p, q.g.combatTick).soldierRelayUntil, 0);
  }
  const twin = fixture([ids.relay, ids.twin]);
  twin.relay();
  twin.step({ technique1: true });
  assert(twin.shots().length >= 2);
  twin.p.skills = twin.p.skills.filter((s) => s !== ids.twin);
  twin.step();
  assert(
    !twin.shots().some((s) => s.expires > twin.g.combatTick && s.vy !== 0),
  );
});

test("issued59 preserves all prior ownership and four General techniques while rejecting invented late techniques and online envelopes", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("p", "Mara", "soldier");
  for (const id of [
    "soldier-ballistics-1",
    ids.entry,
    ids.line,
    ids.pair,
    "general-sprint",
    "general-brake-step",
    "general-course-correction",
  ])
    buy(g, p.id, id);
  const old = {
    ...g.offlineCheckpoint()!,
    protocolVersion: 59,
    contentRevision:
      "87a0e537a0bb27015572bd340c9761b1a05298d8c6250817a25d5011433b144f",
  };
  const copy = Game.restoreOffline(structuredClone(old)),
    q = copy.players.get("solo")!;
  assert.deepEqual(q.skills, p.skills);
  assert.equal(copy.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  assert.equal(copy.kitStatus("solo").soldierRelayUntil, 0);
  assert(!copy.kitStatus("solo").soldierPairHeld);
  for (const id of [ids.reserve, ids.relay, ids.twin]) {
    const forged = structuredClone(old);
    forged.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  }
  for (const patch of [
    { protocolVersion: 58 },
    { protocolVersion: 60 },
    { practiceOnly: false },
    { serverOnly: true },
  ])
    assert.throws(
      () => Game.restoreOffline({ ...old, ...patch }),
      /versionMismatch/,
    );
});

test("reserved grace still cancels on dodge, weapon or Held Measure loss after the actual reload completes", () => {
  for (const reason of ["dodge", "weapon", "technique"] as const) {
    const f = fixture([ids.reserve]);
    f.first();
    f.step({ reload: true });
    f.until(f.p.reloadAt);
    assert(f.g.kitStatus(f.p.id).soldierPairUntil! > f.g.combatTick);
    if (reason === "dodge") f.step({ dodge: true, moveY: 1 });
    else {
      if (reason === "weapon") f.p.weapon = "soldier-1";
      else f.p.skills = f.p.skills.filter((s) => s !== ids.reserve);
      f.step();
    }
    assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil, 0, reason);
  }
});
