import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import {
  CONTENT_REVISION,
  HZ,
  idleInput,
  type InputFrame,
} from "../src/shared/protocol.ts";
import {
  grenadierIds as ids,
  grenadierRules as r,
} from "../src/shared/soldier-grenadier.ts";
let tx = 0;
const near = (a: number, b: number, e = 1e-6) =>
    assert(Math.abs(a - b) <= e, a + " vs " + b),
  buy = (g: Game, p: string, item: string) => {
    const v = g.transact(p, { id: "gren-" + ++tx, kind: "skill", item });
    assert(v.ok, item + ":" + v.reason);
  };
// Controlled legal27SP fixtures isolate physics/authority. They are not natural progression or online proof.
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
  for (const id of ["soldier-ballistics-1", ids.entry, ...skills])
    buy(g, p.id, id);
  assert(g.start());
  g.boss.id = "constable";
  (g as any).director.reset("constable");
  g.boss.x = 1200;
  g.boss.y = 200;
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.deadline = g.boss.staggerUntil = 1e9;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = 0;
  g.arena.lavaPits.length = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  p.aim = 0;
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
  };
  const until = (time: number) => {
    let n = 0;
    while (g.combatTick < time) {
      assert(++n < 2000);
      step();
    }
  };
  const shots = () =>
    [...g.shots.values()].filter((s) => g.grenadier.has(s.id));
  const ground = () => {
    for (
      let n = 0;
      n < 45 && shots().some((s) => s.vx !== 0 || s.vy !== 0);
      n++
    )
      step();
    assert.equal(shots().length, 1);
    assert.equal(shots()[0].vx, 0);
    assert.equal(shots()[0].vy, 0);
    return shots()[0];
  };
  return { g, p, ally, step, until, shots, ground };
}
const body = (f: ReturnType<typeof fixture>, x: number, y = 600) =>
    f.g.spawnMinion({
      kind: "ordinary",
      x,
      y,
      radius: 2,
      health: 500,
      speed: 0,
      damage: 0,
    })!,
  context = (f: ReturnType<typeof fixture>) => (f.g as any).grenadierContext();

test("ordinary Short buys a distinct affordable Grenadier discipline and symmetric conflicts preserve issued choices", () => {
  for (const chosen of [
    ids.entry,
    "soldier-skirmisher-1",
    "soldier-marksman-1",
  ]) {
    const g = new Game({ mode: "short" }),
      p = g.addPlayer("p", "Mara", "soldier");
    assert.equal(p.totalSp, 3);
    buy(g, p.id, "soldier-ballistics-1");
    buy(g, p.id, chosen);
    for (const other of [
      ids.entry,
      "soldier-skirmisher-1",
      "soldier-marksman-1",
    ].filter((s) => s !== chosen))
      assert.deepEqual(
        g.transact(p.id, {
          id: "conflict-" + other,
          kind: "skill",
          item: other,
        }),
        { ok: false, reason: "incompatibleItem" },
      );
    assert.equal(
      p.skills.reduce((n, id) => n + g.skillCost(id), 0),
      3,
    );
  }
  assert.equal(data.skills.length, 648);
  assert.equal(data.generalSkills.length, 4);
  assert.equal(data.specializationSkills.length,49);
});
test("prime starts one finite recovery without ammo or E, and a separate manual throw retains the cooked fuse", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const kit = f.g.kitStatus(f.p.id),
    until = kit.grenadierFuseUntil!,
    at = kit.grenadierRecoveryAt;
  assert(kit.grenadierHolding);
  assert.equal(f.shots().length, 0);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.p.eAt, 0);
  assert.equal(until - f.g.combatTick, Math.ceil(r.fuseSeconds * HZ));
  for (let n = 0; n < 8; n++) f.step();
  f.step({ technique1: true });
  const shot = f.shots()[0];
  assert(shot);
  assert.equal(shot.visual, "canister");
  assert.equal(shot.expires, until);
  assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at);
  assert.equal(f.p.ammo, ammo);
  assert(!f.g.kitStatus(f.p.id).grenadierHolding);
  assert.equal(f.p.eAt, 0);
});
test("a held primary trigger stays blocked through preparation, while a later deliberate trigger press cancels the hand", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ fire: true, technique1: true });
  f.step({ fire: true });
  assert(f.g.kitStatus(f.p.id).grenadierHolding);
  assert.equal(f.p.ammo, ammo);
  f.step();
  f.step({ fire: true });
  assert(!f.g.kitStatus(f.p.id).grenadierHolding);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.shots().length, 0);
});
test("holding to fuse expiry vents safely, keeps recovery and cannot create blasts, ammo or healing credit", () => {
  const f = fixture(),
    a = body(f, 620),
    health = f.p.health,
    ammo = f.p.ammo;
  f.step({ technique1: true });
  const at = f.g.kitStatus(f.p.id).grenadierRecoveryAt;
  f.until(f.g.kitStatus(f.p.id).grenadierFuseUntil!);
  assert(!f.g.kitStatus(f.p.id).grenadierHolding);
  assert.equal(a.health, 500);
  assert.equal(f.p.health, health);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.p.damageDealt, 0);
  assert(f.g.classCues().some((c) => c.kind === "soldier-grenade-vent"));
  f.step({ technique1: true });
  assert.equal(f.shots().length, 0);
  assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at);
});
test("a real body grounds a plain canister before cover and receives only the later finite blast", () => {
  const f = fixture(),
    a = body(f, 630),
    other = body(f, 700);
  f.g.arena.obstacles.push({ x: 660, y: 500, width: 20, height: 250 });
  f.step({ technique1: true });
  f.step({ technique1: true });
  f.g.drainEvents();
  for (let n = 0; n < 5; n++) f.step();
  const shot = f.shots()[0];
  assert(shot);
  near(shot.x, 630 - a.radius - r.radius);
  assert.equal(shot.vx, 0);
  assert.equal(a.health, 500);
  assert.equal(other.health, 500);
  f.until(shot.expires);
  assert.equal(f.shots().length, 0);
  near(500 - a.health, r.damage * f.g.stats(f.p).ability);
  assert.equal(other.health, 500);
  assert(f.g.classCues().some((c) => c.kind === "soldier-grenade-blast"));
});
test("Contact Case explodes at its first real cover contact and cover occludes the far side", () => {
  const f = fixture([ids.contact]),
    nearBody = body(f, 615, 650),
    farBody = body(f, 690, 650);
  f.g.arena.obstacles.push({ x: 640, y: 500, width: 20, height: 300 });
  f.step({ technique1: true });
  f.step({ technique1: true });
  for (let n = 0; n < 5 && f.shots().length; n++) f.step();
  assert.equal(f.shots().length, 0);
  assert(nearBody.health < 500);
  assert.equal(farBody.health, 500);
  const cue = f.g.classCues().find((c) => c.kind === "soldier-grenade-blast");
  assert(cue);
  near(cue.x, 640 - r.radius);
  assert.equal(f.p.health, f.p.maxHealth);
});
test("one real skimming bank uses only remaining tick travel, loses actual speed, and a second wall grounds it", () => {
  const f = fixture([ids.skim]);
  f.g.arena.obstacles.push({ x: 610, y: 500, width: 1, height: 300 });
  f.step({ technique1: true });
  f.step({ technique1: true });
  const shot = f.shots()[0];
  assert(shot);
  near(
    shot.x,
    605 - r.separation - r.speed * r.bankRetention * (1 / HZ - 5 / r.speed),
  );
  near(shot.vx, -(r.speed * r.bankRetention - r.drag / HZ));
  assert(f.g.classCues().some((c) => c.kind === "soldier-grenade-contact"));
  const two = fixture([ids.skim]);
  two.g.arena.obstacles.push(
    { x: 610, y: 500, width: 1, height: 300 },
    { x: 588, y: 500, width: 1, height: 300 },
  );
  two.step({ technique1: true });
  two.step({ technique1: true });
  const stopped = two.shots()[0];
  assert(stopped);
  near(stopped.x, 594);
  assert.equal(stopped.vx, 0);
  assert.equal(
    two.g.classCues().filter((c) => c.kind === "soldier-grenade-contact")
      .length,
    2,
  );
});
test("physical body contact beats a later skimming wall, and impact blast damage samples the actual body time", () => {
  const f = fixture([ids.contact]),
    a = body(f, 800);
  a.oldX = 600;
  a.oldY = 600;
  a.x = 1000;
  a.y = 600;
  (f.g as any).grenadierBlast(f.p, { x: 700, y: 600 }, 80, 0.25);
  assert(a.health < 500, "body at700 during contact, endpoint1000 is outside");
  const s = fixture([ids.skim]);
  body(s, 615);
  s.g.arena.obstacles.push({ x: 640, y: 500, width: 1, height: 300 });
  s.step({ technique1: true });
  s.step({ technique1: true });
  assert.equal(s.shots()[0].vx, 0);
  assert(s.shots()[0].x < 620);
});
test("each skimming leg passes only its own moving-body time interval", () => {
  const f = fixture([ids.skim]);
  f.g.arena.obstacles.push({ x: 610, y: 500, width: 1, height: 300 });
  assert(f.g.grenadier.cast(f.p, context(f)));
  assert(f.g.grenadier.cast(f.p, context(f)));
  const shot = f.shots()[0],
    windows: any[] = [];
  const result = f.g.grenadier.advance(shot, {
    tick: f.g.combatTick,
    owner: f.p,
    bounds: f.g.arena.bounds,
    obstacles: f.g.arena.obstacles,
    body: (_a, _b, window) => {
      windows.push(window);
      return null;
    },
    blast: () => assert.fail("not expired"),
    id: () => 123456,
    sound: () => {},
  });
  assert(result.alive);
  assert.equal(windows.length, 2);
  near(windows[0].from, 0);
  near(windows[1].from, 5 / (r.speed / HZ));
  near(windows[1].to, 1);
});
test("blast supplies its actual explosion origin to armor and never hits a boss core through independent weak bodies", () => {
  const f = fixture();
  f.g.boss.x = 630;
  f.g.boss.y = 600;
  let origin: any;
  const original = (f.g as any).hitBoss.bind(f.g);
  (f.g as any).hitBoss = (p: any, d: number, bypass: boolean, at: any) => {
    origin = at;
    return original(p, d, bypass, at);
  };
  (f.g as any).grenadierBlast(f.p, { x: 610, y: 600 }, 80);
  assert.deepEqual(origin, { x: 610, y: 600 });
  const before = f.g.boss.health;
  (f.g as any).director.hasIndependentBodies = () => true;
  (f.g as any).grenadierBlast(f.p, { x: 610, y: 600 }, 80);
  assert.equal(f.g.boss.health, before);
});
test("Underhand Cast is acquired, shortens physical travel and uses the same charge/recovery without magazine spending", () => {
  const no = fixture();
  no.step({ technique2: true });
  assert.equal(no.shots().length, 0);
  assert.equal(no.g.kitStatus(no.p.id).grenadierRecoveryAt, 0);
  const f = fixture([ids.pitch]),
    ammo = f.p.ammo;
  f.step({ technique2: true });
  assert.equal(f.shots().length, 1);
  const shot = f.shots()[0];
  near(shot.x, 600 + r.shortSpeed / HZ);
  near(shot.vx, r.shortSpeed - r.drag / HZ);
  const at = f.g.kitStatus(f.p.id).grenadierRecoveryAt;
  f.step({ technique2: true });
  assert.equal(f.shots().length, 1);
  assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at);
  assert.equal(f.p.ammo, ammo);
  const cook = fixture([ids.pitch]);
  cook.step({ technique1: true });
  const until = cook.g.kitStatus(cook.p.id).grenadierFuseUntil;
  for (let n = 0; n < 10; n++) cook.step();
  cook.step({ technique2: true });
  assert.equal(cook.shots()[0].expires, until);
});
test("full pool rejects a fresh prime or short cast, while failed release keeps its paid finite hand and recovery", () => {
  for (const held of [false, true]) {
    const f = fixture([ids.pitch]);
    if (held) f.step({ technique1: true });
    while (f.g.shots.size < 6000)
      (f.g as any).emitShot(f.ally.id, 1400, 900, 0, 0, 1, 1, 0, 20);
    const before = f.g.kitStatus(f.p.id),
      ammo = f.p.ammo;
    assert.equal(f.g.grenadier.cast(f.p, context(f)), false);
    assert.equal(f.g.grenadier.shortCast(f.p, context(f)), false);
    const after = f.g.kitStatus(f.p.id);
    assert.equal(after.grenadierRecoveryAt, before.grenadierRecoveryAt);
    assert.equal(after.grenadierFuseUntil, before.grenadierFuseUntil);
    assert.equal(f.p.ammo, ammo);
    assert.equal(f.shots().length, 0);
  }
});
test("Re-pin stores exactly one remaining fuse through a bounded pocket and ordinary Reload remains separate", () => {
  const f = fixture([ids.pitch, ids.pin]);
  f.step({ technique1: true });
  for (let n = 0; n < 7; n++) f.step();
  const before = f.g.kitStatus(f.p.id),
    remaining = before.grenadierFuseUntil! - f.g.combatTick - 1,
    at = before.grenadierRecoveryAt;
  f.step({ reload: true });
  const pinned = f.g.kitStatus(f.p.id);
  assert(!pinned.grenadierHolding);
  assert.equal(pinned.grenadierRemainingFuse, remaining);
  assert.equal(
    pinned.grenadierPinnedUntil,
    f.g.combatTick + Math.ceil(r.pinSeconds * HZ),
  );
  assert.equal(f.p.reloadAt, 0, "full magazine needs no ordinary reload");
  for (let n = 0; n < 30; n++) f.step();
  f.step({ technique1: true });
  assert.equal(
    f.g.kitStatus(f.p.id).grenadierFuseUntil,
    f.g.combatTick + remaining,
  );
  assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at);
  f.step({ reload: true });
  assert.equal(
    f.g.kitStatus(f.p.id).grenadierFuseUntil,
    0,
    "a second re-pin cannot restart or store the clock",
  );
});
test("pocket expiry does not throw, refresh recovery or block ordinary firing while secured", () => {
  const f = fixture([ids.pitch, ids.pin]);
  f.step({ technique1: true });
  f.step({ reload: true });
  const until = f.g.kitStatus(f.p.id).grenadierPinnedUntil!,
    ammo = f.p.ammo,
    at = f.g.kitStatus(f.p.id).grenadierRecoveryAt;
  f.step({ fire: true });
  assert.equal(f.p.ammo, ammo - 1);
  f.until(until);
  assert.equal(f.g.kitStatus(f.p.id).grenadierPinnedUntil, 0);
  assert.equal(f.shots().length, 0);
  assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at);
});
test("optional preparation alternatives are exclusive and have real20SP versus19SP complete-build costs", () => {
  for (const [choice, other, cost] of [
    [ids.pin, ids.sling, 20],
    [ids.sling, ids.pin, 19],
  ] as const) {
    const g = new Game({ mode: "endless" });
    g.encounter = 9;
    const p = g.addPlayer("p", "Mara", "soldier");
    for (const id of [
      "soldier-ballistics-1",
      ids.entry,
      ids.skim,
      ids.pitch,
      choice,
      ids.kick,
      ids.return,
    ])
      buy(g, p.id, id);
    assert.equal(
      p.skills.reduce((n, id) => n + g.skillCost(id), 0),
      cost,
    );
    assert.deepEqual(
      g.transact(p.id, { id: "other-" + other, kind: "skill", item: other }),
      { ok: false, reason: "incompatibleItem" },
    );
    assert.equal(data.rules.maximumActiveCapstones, 1);
  }
});
test("Clipped Sling preserves the running fuse through the actual issued burst while the ordinary hand cancels", () => {
  for (const clipped of [false, true]) {
    const f = fixture([ids.pitch, ...(clipped ? [ids.sling] : [])]);
    f.step({ technique1: true });
    const until = f.g.kitStatus(f.p.id).grenadierFuseUntil;
    f.step({ e: true });
    assert(f.p.eAt > f.g.combatTick);
    assert.equal(f.g.kitStatus(f.p.id).grenadierHolding, clipped);
    if (clipped) assert.equal(f.g.kitStatus(f.p.id).grenadierFuseUntil, until);
    assert(
      [...f.g.shots.values()].some(
        (s) => s.owner === f.p.id && !f.g.grenadier.has(s.id),
      ),
    );
  }
});
test("reload/dodge/channel/overdrive reject new requests without spending and incompatible actions cancel only the live hand", () => {
  for (const action of ["reload", "dodge", "channel", "overdrive"] as const) {
    const f = fixture();
    if (action === "reload") f.p.reloadAt = 30;
    else if (action === "dodge") f.p.dashUntil = 30;
    else if (action === "channel") f.p.channelUntil = 30;
    else f.p.overdriveUntil = 30;
    assert.equal(f.g.grenadier.cast(f.p, context(f)), false);
    assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, 0);
  }
  for (const action of [
    { reload: true },
    { dodge: true, moveY: 1 },
    { ultimate: true },
  ]) {
    const f = fixture();
    f.step({ technique1: true });
    const at = f.g.kitStatus(f.p.id).grenadierRecoveryAt;
    f.step(action);
    assert(!f.g.kitStatus(f.p.id).grenadierHolding);
    assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at);
  }
});
test("actual health loss cancels an unsecured hand, absorbed damage and living-owner flight do not", () => {
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
  assert(f.g.kitStatus(f.p.id).grenadierHolding);
  f.p.shield = 0;
  f.p.invulnerableUntil = 0;
  (f.g as any).damage(f.p, 1);
  assert(!f.g.kitStatus(f.p.id).grenadierHolding);
  const q = fixture();
  q.step({ technique1: true });
  q.step({ technique1: true });
  const shot = q.shots()[0],
    healthBeforeFlightHit = q.p.health;
  q.p.invulnerableUntil = 0;
  q.p.shield = 0;
  (q.g as any).damage(q.p, 1);
  assert(q.p.health < healthBeforeFlightHit);
  assert(q.g.shots.has(shot.id));
  q.step();
  assert(q.g.shots.has(shot.id));
});
test("Toe Roll requires nearby clear ground, moves the same canister once and preserves its original fuse/recovery", () => {
  const f = fixture([ids.pitch, ids.kick]);
  f.step({ technique2: true });
  const shot = f.ground(),
    until = shot.expires,
    at = f.g.kitStatus(f.p.id).grenadierRecoveryAt,
    id = shot.id;
  assert(shot.x - f.p.x < r.handlingReach);
  f.g.arena.obstacles.push({ x: 620, y: 590, width: 1, height: 20 });
  f.step({ technique2: true });
  assert.equal(shot.vx, 0);
  assert.equal(shot.expires, until);
  f.g.arena.obstacles.length = 0;
  f.step({ technique2: true, aim: Math.PI / 2 });
  assert.equal(shot.id, id);
  assert(shot.vy > 0);
  assert.equal(shot.expires, until);
  assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at);
  f.ground();
  f.p.x = shot.x;
  f.p.y = shot.y;
  f.step({ technique2: true });
  assert.equal(shot.vx, 0);
  assert.equal(shot.vy, 0);
  assert.equal(f.shots().length, 1);
});
test("Live Return catches once with an actual removal, keeps remaining fuse and cannot reset spent handling rights", () => {
  const f = fixture([ids.pitch, ids.pin, ids.kick, ids.return]);
  f.step({ technique1: true });
  f.step({ reload: true });
  f.step({ technique1: true });
  f.step({ technique2: true });
  const shot = f.ground(),
    until = shot.expires,
    at = f.g.kitStatus(f.p.id).grenadierRecoveryAt;
  f.step({ technique2: true, aim: Math.PI / 2 });
  f.ground();
  f.p.x = shot.x;
  f.p.y = shot.y;
  f.g.drainEvents();
  f.step({ technique1: true });
  assert(!f.g.shots.has(shot.id));
  assert(f.g.kitStatus(f.p.id).grenadierHolding);
  assert.equal(f.g.kitStatus(f.p.id).grenadierFuseUntil, until);
  assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at);
  assert(
    f.g
      .drainEvents()
      .some((e) => e.type === "remove" && e.ids.includes(shot.id)),
  );
  f.step({ technique2: true });
  const again = f.ground();
  f.p.x = again.x;
  f.p.y = again.y;
  f.step({ technique1: true });
  assert(!f.g.kitStatus(f.p.id).grenadierHolding);
  assert(f.g.shots.has(again.id));
  f.step({ technique2: true });
  assert.equal(again.vx, 0);
  assert.equal(again.vy, 0);
});
test("a fuse too close to expiry cannot be caught, and bounds ground at the first real crossing", () => {
  const f = fixture([ids.pitch, ids.kick, ids.return]);
  f.step({ technique2: true });
  const shot = f.ground();
  f.until(shot.expires - 4);
  f.step({ technique1: true });
  assert(!f.g.kitStatus(f.p.id).grenadierHolding);
  assert(f.g.shots.has(shot.id));
  const edge = fixture();
  edge.p.x = edge.g.arena.bounds.x + edge.g.arena.bounds.width - r.radius - 2;
  edge.step({ technique1: true });
  edge.step({ technique1: true });
  const q = edge.shots()[0];
  assert(q);
  near(q.x, edge.g.arena.bounds.x + edge.g.arena.bounds.width - r.radius);
  assert.equal(q.vx, 0);
});
test("disconnect, downing, required-technique loss and host exit remove actual flight without rostered recovery refunds", () => {
  for (const reason of ["disconnect", "down", "technique", "host"] as const) {
    const f = fixture([ids.pitch]);
    f.step({ technique2: true });
    const shot = f.shots()[0],
      at = f.g.kitStatus(f.p.id).grenadierRecoveryAt;
    if (reason === "disconnect") f.g.setConnected(f.p.id, false);
    else if (reason === "down") {
      f.p.invulnerableUntil = 0;
      (f.g as any).damage(f.p, 1e6);
    } else if (reason === "technique") {
      f.p.skills = f.p.skills.filter((id) => id !== ids.pitch);
      f.step();
    } else f.g.endByHost();
    assert(!f.g.shots.has(shot.id), reason);
    assert(!f.g.classCues().some((c) => c.kind === "soldier-fuse"));
    if (reason !== "host")
      assert.equal(f.g.kitStatus(f.p.id).grenadierRecoveryAt, at, reason);
  }
});
test("exact issued60 preserves old ownership and all four General choices while rejecting future grenades and online envelopes", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("p", "Mara", "soldier");
  for (const id of [
    "soldier-ballistics-1",
    "soldier-marksman-1",
    "soldier-marksman-line-1",
    "soldier-marksman-pair-1",
    "general-sprint",
    "general-course-correction",
    "general-brake-step",
    "general-double-dash",
  ])
    buy(g, p.id, id);
  const save = {
      ...g.offlineCheckpoint()!,
      protocolVersion: 60,
      contentRevision:
        "4ab2898a2eb9f7f6b6041753cac7a7d6a2ebc7581e6256e79e9858c95567d232",
    },
    copy = Game.restoreOffline(structuredClone(save));
  assert.deepEqual(copy.players.get("solo")!.skills, p.skills);
  assert.equal(copy.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  assert.equal(copy.kitStatus("solo").grenadierFuseUntil, undefined);
  for (const id of Object.values(ids)) {
    const forged = structuredClone(save);
    forged.player.skills.push(id);
    assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  }
  for (const patch of [
    { protocolVersion: 59 },
    { protocolVersion: 61 },
    { practiceOnly: false },
    { serverOnly: true },
  ])
    assert.throws(
      () => Game.restoreOffline({ ...save, ...patch }),
      /versionMismatch/,
    );
});

test("recycling a canister projectile cannot relabel an ordinary primary or another owner projectile", () => {
  const f = fixture([ids.pitch]);
  f.step({ technique2: true });
  const s = f.shots()[0];
  assert.equal(s.visual, "canister");
  (f.g as any).removeShot(s);
  const ordinary = (f.g as any).emitShot(f.ally.id, 1400, 900, 0, 100, 10);
  assert(ordinary);
  assert.equal(ordinary.visual, undefined);
  assert(!("visual" in ordinary));
});

test("purple percentage health loss immediately cancels a live Grenadier hand even if a later real heal restores health; a re-pinned fuse stays stored", () => {
  for (const pinned of [false, true]) {
    const f = fixture([ids.pitch, ids.pin]);
    f.step({ technique1: true });
    if (pinned) f.step({ reload: true });
    const before = f.g.kitStatus(f.p.id),
      health = f.p.health,
      ammo = f.p.ammo;
    f.p.invulnerableUntil = 0;
    assert((f.g as any).purpleStamp(f.p, 0, true));
    assert(f.p.health < health);
    (f.g as any).heal(f.ally, f.p, health);
    assert.equal(f.p.health, health);
    const after = f.g.kitStatus(f.p.id);
    assert.equal(
      after.grenadierHolding,
      false,
      "a restored health total cannot erase the actual loss event",
    );
    if (pinned) {
      assert.equal(after.grenadierPinnedUntil, before.grenadierPinnedUntil);
      assert.equal(after.grenadierRemainingFuse, before.grenadierRemainingFuse);
    } else assert.equal(after.grenadierFuseUntil, 0);
    assert.equal(after.grenadierRecoveryAt, before.grenadierRecoveryAt);
    assert.equal(f.p.ammo, ammo);
  }
});
