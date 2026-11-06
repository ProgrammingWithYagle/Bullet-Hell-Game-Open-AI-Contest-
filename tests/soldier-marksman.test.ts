import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import {
  CONTENT_REVISION,
  HZ,
  idleInput,
  type InputFrame,
  type Shot,
} from "../src/shared/protocol.ts";
import {
  marksmanId as id,
  marksmanRules as rules,
} from "../src/shared/soldier-marksman.ts";
import { motionAt } from "../src/shared/motion-window.ts";
import ratRules from "../src/shared/ratcatcher-muster-rules.json";

let serial = 0;
const buy = (g: Game, owner: string, item: string) => {
  const result = g.transact(owner, {
    id: "marksman-unit-" + ++serial,
    kind: "skill",
    item,
  });
  assert(result.ok, item + ": " + result.reason);
};
/** Controlled combat fixtures; these are not natural progression/balance evidence. */
function fixture() {
  const g = new Game({
    mode: "raid",
    difficulty: "normal",
    seed: 41,
    maxPlayers: 2,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  const p = g.addPlayer("marksman", "Mara", "soldier"),
    ally = g.addPlayer("ally", "Partner", "medic");
  buy(g, p.id, "soldier-ballistics-1");
  buy(g, p.id, id);
  assert(g.start());
  // Keep an ordinary core and a live partner while exercising one exact operation.
  g.boss.id = "constable";
  (g as any).director.reset("constable");
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.deadline = g.boss.staggerUntil = 1e9;
  g.boss.x = 1200;
  g.boss.y = 200;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  ally.x = ally.oldX = 1400;
  ally.y = ally.oldY = 900;
  p.invulnerableUntil = p.shield = p.supplyShield = 0;
  p.aim = 0;
  g.drainEvents();
  let sequence = 0;
  const step = (input: Partial<InputFrame> = {}) => {
    assert(
      g.submitInput(p.id, {
        ...idleInput(),
        aim: 0,
        sequence: ++sequence,
        clientTick: g.combatTick,
        ...input,
      }),
    );
    g.step();
  };
  const until = (at: number) => {
    while (g.combatTick < at) step();
  };
  const shot = () => [...g.shots.values()].find((s) => g.marksman.has(s.id));
  return { g, p, ally, step, until, shot };
}
const near = (actual: number, expected: number, epsilon = 1e-6) =>
  assert(Math.abs(actual - expected) <= epsilon, actual + " vs " + expected);

test("Marksman is an affordable real alternative to Skirmisher, with symmetric authority conflicts", () => {
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("s", "Mara", "soldier");
  const entry = data.specializationSkills.find((skill) => skill.id === id)!;
  assert.equal(entry.cost, 2);
  assert.equal(entry.freePlaySpRequired, 3);
  assert.equal(entry.grade, "D-");
  assert.equal(
    g.transact(p.id, { id: "no-foundation", kind: "skill", item: id }).ok,
    false,
  );
  buy(g, p.id, "soldier-ballistics-1");
  buy(g, p.id, id);
  assert.equal(
    g.transact(p.id, {
      id: "other-discipline",
      kind: "skill",
      item: "soldier-skirmisher-1",
    }).ok,
    false,
  );
  const old = new Game({ mode: "raid" }),
    q = old.addPlayer("q", "Mara", "soldier");
  buy(old, q.id, "soldier-ballistics-1");
  buy(old, q.id, "soldier-skirmisher-1");
  assert.equal(
    old.transact(q.id, { id: "no-shadow", kind: "skill", item: id }).ok,
    false,
  );
  assert.equal(data.skills.length, 648);
  assert.equal(data.generalSkills.length, 4);
  assert.equal(data.specializationSkills.length,48);
});

test("Bank Shot spends one real round and its own recovery without needing or changing E", () => {
  const f = fixture(),
    ammo = f.p.ammo,
    health = f.p.health,
    dodge = f.p.dodgeAt;
  f.step({ technique1: true, aim: 0 });
  const s = f.shot()!;
  assert(s);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.p.eAt, 0);
  assert.equal(f.p.qAt, 0);
  assert.equal(f.p.ultimateAt, 0);
  assert.equal(f.p.health, health);
  assert.equal(f.p.invulnerableUntil, 0);
  assert.equal(f.p.dodgeAt, dodge);
  near(Math.hypot(s.vx, s.vy), rules.speed);
  near(s.damage, rules.damage * f.g.stats(f.p).ability);
  assert.equal(s.pierce, 0);
  assert.equal(
    f.g.kitStatus(f.p.id).technique1At,
    f.g.combatTick + Math.ceil(rules.cooldown * HZ),
  );
  f.step({ technique1: true });
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(
    [...f.g.shots.values()].filter((s) => s.owner === f.p.id).length,
    1,
  );
});

test("a bank consumes the rest of the same tick, preserves speed and uses the actual projectile footprint", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 620;
  f.g.arena.obstacles.push({ x: 640, y: 500, width: 20, height: 300 });
  f.step({ technique1: true, aim: 0 });
  const s = f.shot()!;
  assert(s);
  near(s.x, 622 - rules.separation);
  near(s.y, 600);
  near(s.vx, -rules.speed);
  near(s.vy, 0);
  const cue = f.g.classCues().find((c) => c.kind === "soldier-bank")!;
  assert(cue.kind === "soldier-bank");
  assert.equal(cue.x, 636);
  assert.equal(cue.radius, rules.radius);
  assert.equal(cue.owner, f.p.id);
  near(cue.incomingAim, 0);
  near(Math.abs(cue.outgoingAim), Math.PI);
  assert.equal(cue.until - cue.at, Math.ceil(rules.contactSeconds * HZ));
  const updates = f.g
    .drainEvents()
    .filter((e) => e.type === "shots")
    .flatMap((e) => e.shots)
    .filter((row) => row.id === s.id);
  assert(updates.some((row) => row.vx < 0 && Math.abs(row.x - s.x) < 1e-6));
});

test("oblique reflection reverses the normal component while keeping tangential travel and total speed", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 620;
  f.p.y = f.p.oldY = 590;
  f.g.arena.obstacles.push({ x: 640, y: 500, width: 20, height: 300 });
  f.step({ technique1: true, aim: Math.PI / 4 });
  const s = f.shot()!;
  assert(s);
  const distance = rules.speed / HZ / Math.sqrt(2);
  near(s.x, 636 - (distance - 16) - rules.separation);
  near(s.y, 590 + distance);
  near(s.vx, -rules.speed / Math.sqrt(2));
  near(s.vy, rules.speed / Math.sqrt(2));
  near(Math.hypot(s.vx, s.vy), rules.speed);
});

test("a second wall stops the spent bank and a closed civic gate uses the same real geometry", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 620;
  f.g.arena.obstacles.push(
    { x: 640, y: 500, width: 20, height: 300 },
    { x: 590, y: 500, width: 20, height: 300 },
  );
  f.step({ technique1: true, aim: 0 });
  const id = f.shot()!.id;
  f.step();
  assert(!f.g.shots.has(id));
  assert(!f.g.marksman.has(id));
  assert.equal(
    f.g.classCues().filter((c) => c.kind === "soldier-bank").length,
    1,
  );
  const gate = fixture();
  gate.p.x = gate.p.oldX = 620;
  (gate.g as any).director.civic.solids = () => [
    { x: 640, y: 500, width: 20, height: 300 },
  ];
  gate.step({ technique1: true, aim: 0 });
  assert(gate.shot()!.vx < 0);
});

test("a physical shot starting inside cover is absorbed rather than moved through the wall", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 645;
  // Deliberately invalid body placement is a UNIT fixture, not a legal player route.
  f.g.arena.obstacles.push({ x: 640, y: 500, width: 20, height: 300 });
  const context = (f.g as any).marksmanContext();
  assert(f.g.marksman.cast(f.p, context));
  const s = f.shot()!;
  const result = f.g.marksman.advance(s, {
    tick: f.g.combatTick,
    owner: f.p,
    obstacles: f.g.arena.obstacles,
    hit: () => false,
    sound: () => {},
  });
  assert.equal(result.alive, false);
  assert.equal(result.updated, false);
  assert.equal(
    f.g.classCues().filter((c) => c.kind === "soldier-bank").length,
    0,
  );
});

test("a live body before the wall receives ordinary credited damage and prevents a later bank", () => {
  const f = fixture();
  f.g.boss.x = 720;
  f.g.boss.y = 600;
  f.g.arena.obstacles.push({ x: 800, y: 500, width: 20, height: 300 });
  const health = f.g.boss.health;
  f.step({ technique1: true, aim: 0 });
  for (let i = 0; i < 20 && f.shot(); i++) f.step();
  assert(!f.shot());
  near(health - f.g.boss.health, rules.damage * f.g.stats(f.p).ability);
  near(f.p.damageDealt, health - f.g.boss.health);
  assert(!f.g.classCues().some((c) => c.kind === "soldier-bank"));
});

test("the reflected leg can hit a real body behind the original firing direction without teleporting damage", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 620;
  f.g.boss.x = 480;
  f.g.boss.y = 600;
  f.g.arena.obstacles.push({ x: 640, y: 500, width: 20, height: 300 });
  const health = f.g.boss.health;
  f.step({ technique1: true, aim: 0 });
  assert(f.shot());
  assert.equal(f.g.boss.health, health);
  for (let i = 0; i < 20 && f.shot(); i++) f.step();
  assert(!f.shot());
  near(health - f.g.boss.health, rules.damage * f.g.stats(f.p).ability);
});

test("a real reflected hit supplies its bank origin to source-sensitive armor and retains ordinary credit", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 620;
  f.g.boss.x = 480;
  f.g.boss.y = 600;
  f.g.arena.obstacles.push({ x: 640, y: 500, width: 20, height: 300 });
  const origins: { x: number; y: number }[] = [],
    director = (f.g as any).director;
  // Isolate the existing armor hook; the actual Game shot still travels both physical legs.
  director.district.bodyMultiplier = (source: any) => {
    origins.push({ x: source.x, y: source.y });
    return source.x > 630 ? 0.5 : 0;
  };
  const health = f.g.boss.health;
  f.step({ technique1: true, aim: 0 });
  for (let i = 0; i < 20 && f.shot(); i++) f.step();
  assert(!f.shot());
  assert.equal(origins.length, 1);
  near(origins[0].x, 636 - rules.separation);
  near(origins[0].y, 600);
  near(health - f.g.boss.health, rules.damage * f.g.stats(f.p).ability * 0.5);
  near(f.p.damageDealt, health - f.g.boss.health);
});

test("each leg reports its actual portion of the tick and last physical origin", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 620;
  const context = (f.g as any).marksmanContext();
  assert(f.g.marksman.cast(f.p, context));
  const s = f.shot()!;
  const calls: { from: number; to: number; originX: number }[] = [];
  const result = f.g.marksman.advance(s, {
    tick: f.g.combatTick,
    owner: f.p,
    obstacles: [{ x: 640, y: 500, width: 20, height: 300 }],
    hit: (_a, _b, _wall, window, origin) => {
      calls.push({ ...window, originX: origin.x });
      return false;
    },
    sound: () => {},
  });
  assert(result.alive && result.updated);
  assert.equal(calls.length, 2);
  near(calls[0].from, 0);
  near(calls[0].to, 1);
  near(calls[0].originX, 620);
  near(calls[1].from, 16 / 30);
  near(calls[1].to, 1);
  near(calls[1].originX, 636 - rules.separation);
});

test("moving pins, raid bodies and district bodies are sampled over the leg rather than replaying their whole tick", () => {
  const f = fixture(),
    director = (f.g as any).director;
  for (const kind of ["stitch-pin", "raid-prop", "district-prop"]) {
    const weak = {
      kind,
      id: 99,
      oldX: 0,
      oldY: 0,
      x: 1000,
      y: 0,
      radius: 1,
      width: 0,
      height: 0,
      health: 10,
    };
    const from = { x: 250, y: 0 },
      to = { ...from };
    const issued = director.weakContact(from, to, weak, 0);
    assert(issued !== null, kind);
    assert.equal(
      director.weakContact(from, to, weak, 0, { from: 0, to: 1 }),
      issued,
      kind,
    );
    assert.equal(
      director.weakContact(from, to, weak, 0, { from: 0.75, to: 1 }),
      null,
      kind,
    );
  }
  const rat = director.ratcatcher;
  rat.oldOrigin = { x: 0, y: 0 };
  rat.origin = { x: 1000, y: 0 };
  const point = { x: 250 + ratRules.sackOffset.x, y: ratRules.sackOffset.y };
  assert(rat.weakContact(point, point, 0) !== null);
  assert.equal(rat.weakContact(point, point, 0, { from: 0.75, to: 1 }), null);
});

test("moving core collision uses the same fractional interval and full-tick endpoints stay exact", () => {
  const f = fixture();
  (f.g as any).bossPrevious = { x: 0, y: 100 };
  f.g.boss.x = 1000;
  f.g.boss.y = 100;
  const point = { x: 250, y: 100 },
    shot: Shot = {
      id: 9999,
      owner: f.p.id,
      ...point,
      vx: 0,
      vy: 0,
      radius: 1,
      damage: 30,
      expires: 9999,
      pierce: 0,
    };
  const health = f.g.boss.health;
  assert((f.g as any).friendlyCollision(shot, point, point, 1, []));
  assert.equal(f.g.boss.health, health - 30);
  assert.equal(
    (f.g as any).friendlyCollision(shot, point, point, 1, [], {
      from: 0.75,
      to: 1,
      origin: point,
    }),
    false,
  );
  assert.equal(f.g.boss.health, health - 30);
  const previous = { x: 0.1, y: 1e-9 },
    current = { x: 987.654321, y: 1e9 };
  assert.deepEqual(motionAt(previous, current, 0), previous);
  assert.deepEqual(motionAt(previous, current, 1), current);
});

test("manual Reload and accepted dodge reject Bank Shot without spending its round or recovery", () => {
  for (const input of [{ reload: true }, { dodge: true, moveX: 1 }]) {
    const f = fixture();
    f.p.ammo -= 2;
    const ammo = f.p.ammo;
    f.step({ ...input, technique1: true });
    assert(!f.shot());
    assert.equal(f.p.ammo, ammo);
    assert.equal(f.g.kitStatus(f.p.id).technique1At, 0);
  }
});

test("empty ammunition and a failed projectile admission cannot spend recovery", () => {
  const f = fixture();
  f.p.ammo = 0;
  f.step({ technique1: true });
  assert(!f.shot());
  assert.equal(f.g.kitStatus(f.p.id).technique1At, 0);
  const other = fixture(),
    ammo = other.p.ammo;
  const result = other.g.marksman.cast(other.p, {
    tick: other.g.combatTick,
    stats: (p) => other.g.stats(p),
    shoot: () => undefined,
    shootMany:()=>undefined,
    sound: () => assert.fail("No sound without an admitted projectile"),
  });
  assert.equal(result, false);
  assert.equal(other.p.ammo, ammo);
  assert.equal(other.g.kitStatus(other.p.id).technique1At, 0);
});

test("disconnect and downing remove unfinished flight while rostered spent recovery remains", () => {
  for (const loss of ["disconnect", "down"]) {
    const f = fixture();
    f.step({ technique1: true });
    const shot = f.shot()!,
      at = f.g.kitStatus(f.p.id).technique1At;
    if (loss === "disconnect") f.g.setConnected(f.p.id, false);
    else {
      f.p.status = "downed";
      f.step();
    }
    assert(!f.g.shots.has(shot.id));
    assert(!f.g.marksman.has(shot.id));
    assert.equal(f.g.kitStatus(f.p.id).technique1At, at);
    assert.equal(f.g.phase, "combat");
  }
});

test("ordinary health damage after release leaves a living owner's actual projectile in flight", () => {
  const f = fixture();
  f.step({ technique1: true });
  const shot = f.shot()!;
  const health = f.p.health;
  (f.g as any).damage(f.p, 3);
  assert(f.p.health < health);
  f.step();
  assert(f.g.shots.has(shot.id));
});

test("finite lifetime and explicit host cleanup remove flight/cues without inventing ownership", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 100;
  f.step({ technique1: true });
  const shot = f.shot()!;
  f.until(shot.expires - 1);
  assert(f.g.shots.has(shot.id));
  f.step();
  assert(!f.g.shots.has(shot.id));
  const other = fixture();
  other.step({ technique1: true });
  const unfinished = other.shot()!;
  assert(unfinished);
  assert(other.g.endByHost());
  assert(!other.shot());
  assert(!other.g.shots.has(unfinished.id));
  assert(!other.g.classCues().some((c) => c.kind === "soldier-bank"));
});

test("public contact feedback is bounded and omits private flight/payment state", () => {
  const f = fixture();
  f.p.x = f.p.oldX = 620;
  f.g.arena.obstacles.push({ x: 640, y: 500, width: 20, height: 300 });
  f.step({ technique1: true });
  const cue = f.g.classCues().find((c) => c.kind === "soldier-bank")!;
  assert(cue.kind === "soldier-bank");
  for (const key of [
    "banks",
    "origin",
    "flights",
    "weapon",
    "recovery",
    "proof",
  ])
    assert(!(key in cue), key);
  f.until(cue.until);
  assert(!f.g.classCues().some((c) => c.kind === "soldier-bank"));
});

test("exact issued57 boundaries retain their old Skirmisher ownership and cannot invent Marksman", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("s", "Mara", "soldier");
  for (const skill of [
    "soldier-ballistics-1",
    "soldier-skirmisher-1",
    "soldier-skirmisher-drill-1",
    "soldier-skirmisher-roving-1",
    "soldier-skirmisher-ready-1",
    "soldier-skirmisher-volley-1",
  ])
    buy(g, p.id, skill);
  const save = g.offlineCheckpoint()!;
  assert(save);
  const issued = {
    ...save,
    contentRevision:
      "d86d223b830a1bd0a75ad54e5fa4ee1b69075313e05d32502c12672559ffb4cd",
    protocolVersion: 57,
  };
  const restored = Game.restoreOffline(structuredClone(issued));
  assert.equal(restored.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  assert.deepEqual(restored.players.get("solo")!.skills, p.skills);
  const forged = structuredClone(issued);
  forged.player.skills.push(id);
  assert.throws(() => Game.restoreOffline(forged), /versionMismatch/);
  assert.throws(
    () => Game.restoreOffline({ ...issued, protocolVersion: 56 }),
    /versionMismatch/,
  );
  const current = new Game({ mode: "raid" }),
    q = current.addPlayer("q", "Mara", "soldier");
  buy(current, q.id, "soldier-ballistics-1");
  buy(current, q.id, id);
  const copy = Game.restoreOffline(current.offlineCheckpoint()!);
  assert(copy.players.get("solo")!.skills.includes(id));
  assert.equal(copy.kitStatus("solo").technique1At, 0);
});
