import test from "node:test";
import assert from "node:assert/strict";
import {
  ClerkAppeal,
  type ClerkStamp,
  type ClerkDomain,
} from "../src/shared/clerk-appeal.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import type { BossVariant, Shot } from "../src/shared/protocol.ts";
const stamps = (d: ClerkAppeal) =>
  d.cues().filter((q): q is ClerkStamp => q.kind === "stamp");
const domains = (d: ClerkAppeal) =>
  d.cues().filter((q): q is ClerkDomain => q.kind === "clerk-domain");
function fixture(variant: BossVariant, phase = 0) {
  let serial = 0,
    roll = 0.81;
  const d = new ClerkAppeal(),
    p = { id: "p", x: 800, y: 780, oldX: 800, oldY: 780 },
    hits: number[] = [];
  const c: SignatureContext = {
    tick: 1,
    bossId: "quarantine-clerk",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    obstacles: [],
    bounds: { x: 128, y: 80, width: 1344, height: 840 },
    phase,
    variant,
    brutal: variant !== "normal",
    random: () => roll,
    id: () => ++serial,
    damage: () => {},
    damageMaximumHealth: (_id, f) => {
      hits.push(f);
      return true;
    },
    damageScale: 1,
    spawnRat: () => {},
  };
  const cast = () => d.cast(c, p, { speed: 0, damage: 10, telegraph: 1.3 }),
    step = () => {
      c.tick++;
      d.step(c);
    };
  cast();
  for (let n = 0; n < 300 && !stamps(d).length; n++) step();
  assert(stamps(d).length);
  return { d, p, c, hits, step, cast, setRoll: (v: number) => (roll = v) };
}
test("Brutal locks one random I–V safe number across its whole first phase, including interrupted casts, then rerolls late", () => {
  const f = fixture("brutal"),
    initial = stamps(f.d).find((s) => s.safeAt)!;
  assert.equal(initial.index, 5);
  f.d.cancelCast();
  f.setRoll(0.01);
  f.c.tick += 30;
  assert(f.cast());
  assert.equal(stamps(f.d).find((s) => s.safeAt)!.index, 5);
  f.d.cancelCast();
  f.c.phase = 1;
  assert(f.cast());
  for (let n = 0; n < 300 && !stamps(f.d).length; n++) f.step();
  assert.equal(stamps(f.d).find((s) => s.safeAt)!.index, 1);
  f.d.cancelCast();
  f.setRoll(0.61);
  assert(f.cast());
  for (let n = 0; n < 300 && !stamps(f.d).length; n++) f.step();
  assert.equal(stamps(f.d).find((s) => s.safeAt)!.index, 4);
  f.d.reset();
  f.c.phase = 0;
  f.setRoll(0.21);
  assert(f.cast());
  assert.equal(stamps(f.d).find((s) => s.safeAt)!.index, 2);
});
test("all six green-shelter boss damage bonuses are exact and require the full body inside an active shelter", () => {
  for (const [form, bonuses] of [
    ["normal", [0.5, 0.35]],
    ["brutal", [0.4, 0.2]],
    ["crazed", [0.25, 0.05]],
  ] as const)
    for (const phase of [0, 1]) {
      const f = fixture(form, phase),
        s = stamps(f.d).find((s) => s.safeAt)!;
      assert.equal(f.d.shelterMultiplier(s, s.safeAt - 1, phase, form), 1);
      assert.equal(
        f.d.shelterMultiplier(s, s.safeAt, phase, form),
        1 + bonuses[phase],
      );
      assert.equal(
        f.d.shelterMultiplier(
          { x: s.x + s.radius - 8, y: s.y },
          s.safeAt,
          phase,
          form,
        ),
        1,
      );
      assert.equal(f.d.shelterMultiplier(s, s.until, phase, form), 1);
    }
});
test("Crazed late batches add exactly two warned domains while other forms/phases add none", () => {
  for (const form of ["normal", "brutal", "crazed"] as const)
    for (const phase of [0, 1]) {
      const f = fixture(form, phase),
        list = domains(f.d);
      assert.equal(list.length, form === "crazed" && phase === 1 ? 2 : 0);
      assert(
        list.every(
          (d) =>
            d.at - d.beganAt === 60 &&
            d.until === Number.MAX_SAFE_INTEGER &&
            d.radius === 32,
        ),
      );
    }
});
test("activated domains survive later casts and cast cancellation, pending domains cancel, and encounter reset clears them", () => {
  const f = fixture("crazed", 1),
    first = domains(f.d);
  f.d.cancelCast();
  assert.equal(domains(f.d).length, 0);
  assert(f.cast());
  for (let n = 0; n < 300 && !domains(f.d).length; n++) f.step();
  const issued = domains(f.d);
  while (f.c.tick < Math.max(...issued.map((d) => d.at))) f.step();
  f.d.cancelCast();
  assert.equal(domains(f.d).length, 2);
  const locked = domains(f.d);
  f.c.tick += 300;
  assert(f.cast());
  for (let n = 0; n < 300 && domains(f.d).length < 4; n++) f.step();
  assert.equal(domains(f.d).length, 4);
  for (const q of locked)
    assert(
      domains(f.d).some((d) => d.id === q.id && d.x === q.x && d.y === q.y),
    );
  f.d.reset();
  assert.equal(domains(f.d).length, 0);
  assert(first.length);
});
test("permanent-domain contacts share a one-second per-survivor budget across overlaps and never hit during the warning", () => {
  const f = fixture("crazed", 1),
    q = domains(f.d)[0];
  Object.assign(f.p, { x: q.x, y: q.y, oldX: q.x, oldY: q.y });
  while (f.c.tick < q.at - 1) f.step();
  assert.equal(f.hits.length, 0);
  f.step();
  assert.deepEqual(f.hits, [0.1]);
  const list = Reflect.get(f.d, "domains") as ClerkDomain[];
  list.push({ ...q, id: 999999 });
  for (let n = 0; n < 29; n++) f.step();
  assert.equal(f.hits.length, 1);
  f.step();
  assert.equal(f.hits.length, 2);
});
test("the actual Game applies shelter bonuses at boss impact and maximum-health domains bypass armor/shields while respecting invulnerability", () => {
  for (const [form, bonus] of [
    ["normal", 0.5],
    ["brutal", 0.4],
    ["crazed", 0.25],
  ] as const) {
    const g = createPracticeGame(
      {
        openingBossId: "quarantine-clerk",
        difficulty: "normal",
        mode: "endless",
        seed: 11,
      },
      "Mara",
      "soldier",
      form,
    );
    g.start();
    const p = g.players.get("solo")!;
    p.invulnerableUntil = 1e9;
    g.boss.deadline = 1e9;
    for (
      let n = 0;
      n < 1000 && !g.director.clerk.safeZones(g.combatTick).length;
      n++
    )
      g.step();
    const s = g.director.clerk.safeZones(g.combatTick)[0];
    assert(s);
    p.x = s.x;
    p.y = s.y;
    p.oldX = p.x;
    p.oldY = p.y;
    const health = g.boss.health;
    const shot: Shot = {
      id: 999999,
      owner: p.id,
      x: g.boss.x,
      y: g.boss.y,
      vx: 0,
      vy: 0,
      radius: 3,
      damage: 10,
      expires: g.combatTick + 30,
      pierce: 0,
    };
    g.shots.set(shot.id, shot);
    g.step();
    assert(Math.abs(health - g.boss.health - 10 * (1 + bonus)) < 1e-6);
  }
  const g = createPracticeGame(
    {
      openingBossId: "quarantine-clerk",
      difficulty: "normal",
      mode: "endless",
      seed: 31,
    },
    "Mara",
    "tank",
    "crazed",
  );
  g.start();
  g.boss.health = g.boss.maxHealth * 0.49;
  g.boss.deadline = 1e9;
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  for (
    let n = 0;
    n < 1500 && !domains(g.director.clerk).some((d) => g.combatTick >= d.at);
    n++
  )
    g.step();
  const q = domains(g.director.clerk).find((d) => g.combatTick >= d.at)!;
  assert(q);
  g.director.clerk.cancelCast();
  Reflect.set(g, "attackAt", Array(20).fill(1e9));
  Reflect.get(g, "variantPressure").reset(1e9);
  Reflect.get(g, "brutalVolley").clear();
  Reflect.get(g, "clearShots").call(g);
  p.x = q.x;
  p.y = q.y;
  p.oldX = p.x;
  p.oldY = p.y;
  p.health = p.maxHealth;
  p.shield = 500;
  p.supplyShield = 500;
  p.supplyShieldUntil = 1e9;
  g.step();
  assert.equal(p.health, p.maxHealth);
  p.invulnerableUntil = 0;
  g.step();
  assert(Math.abs(p.health - p.maxHealth * 0.9) < 1e-6);
  assert.equal(p.shield, 500);
  assert.equal(p.supplyShield, 500);
});
