import {runtimeArena,runtimeArenas} from '../src/shared/arena-layouts.ts';
import {clerkStampCenters} from '../src/shared/clerk-placement.ts';
import {segmentRect} from '../src/shared/geometry.ts';
import test from "node:test";
import assert from "node:assert/strict";
import {
  ClerkAppeal,
  clerkAppealRules,
  type ClerkStamp,
} from "../src/shared/clerk-appeal.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { type BossVariant } from "../src/shared/protocol.ts";
import { distance } from "../src/shared/geometry.ts";
import { clerkHelp, clerkPhaseHint } from "../src/client/clerk-text.ts";
import { data } from "../src/shared/game.ts";
const stamps = (d: ClerkAppeal) =>
  d.cues().filter((c): c is ClerkStamp => c.kind === "stamp");
function fixture(form: BossVariant = "normal", phase = 0) {
  let serial = 0;
  const d = new ClerkAppeal(),
    p = { id: "p", x: 800, y: 750, oldX: 800, oldY: 750 },
    damage: number[] = [],
    shots: object[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "quarantine-clerk",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    obstacles: [],
    bounds: { x: 128, y: 80, width: 1344, height: 840 },
    phase,
    variant: form,
    brutal: form !== "normal",
    damageScale: 1,
    id: () => ++serial,
    damage: (_id, n) => damage.push(n),
    spawnRat: () => {},
    emitHostile: (point) => shots.push({ x: point.x, y: point.y }),
  };
  const step = () => {
    c.tick++;
    d.step(c);
  };
  d.cast(c, p, { speed: 0, damage: 10, telegraph: 1.3 });
  while (!stamps(d).length) {
    step();
    assert(c.tick < 300);
  }
  return { d, c, p, damage, shots, step };
}
function game(form: BossVariant = "crazed") {
  const g = createPracticeGame(
    {
      openingBossId: "quarantine-clerk",
      mode: "endless",
      difficulty: "normal",
      seed: 981,
    },
    "Mara",
    "tank",
    form,
  );
  g.start();
  g.boss.deadline = 1e9;
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  for (let n = 0; n < 1000 && !stamps(g.director.clerk).length; n++) g.step();
  assert(stamps(g.director.clerk).length);
  // Isolate this stamp contract from unrelated global pursuit marks; the real
  // Clerk controller, damage path, shots, armor, shields and player step remain.
  Reflect.get(g, "variantPressure").reset(1e9);
  p.x = p.oldX = g.arena.bounds.x + 20;
  p.y = p.oldY = g.arena.bounds.y + 20;
  return { g, p };
}
function enterBlack(health = 100) {
  const { g, p } = game(),
    s = stamps(g.director.clerk).find((s) => s.severity === "black")!;
  while (g.combatTick < s.at - 1) g.step();
  p.x = p.oldX = s.x;
  p.y = p.oldY = s.y;
  p.health = health;
  p.invulnerableUntil = 0;
  for (let n = 0; n < 20 && p.health === health; n++) g.step();
  return { g, p, s };
}

test("Clerk forms create exactly3/5/10 separated stamps with red purple black severity and full warnings", () => {
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const f = fixture(form),
      s = stamps(f.d),
      count = clerkAppealRules.stampCounts[form],
      radius = clerkAppealRules.stampRadii[form];
    assert.equal(s.length, count);
    assert.deepEqual(
      s.map((s) => s.severity),
      clerkAppealRules.stampSeverities[form],
    );
    for (const a of s) {
      assert.equal(a.radius, radius);
      assert(
        a.at - f.c.tick >= Math.ceil(clerkAppealRules.stampWarnings[form] * 30),
      );
      assert(s.every((b) => a.id === b.id || distance(a, b) > radius * 2 + 20));
    }
    const safe = s.find((s) => s.safeAt > 0)!;
    assert(safe.index >= 1 && safe.index <= count);
    if (form === "normal") assert.equal(safe.index,1);
    if (form !== "normal") {
      assert(s.every((s) => s.until <= safe.until));
      assert(safe.until - safe.safeAt >= Math.ceil(clerkAppealRules.shelterSeconds[form]*30));
      assert(s.every((s) => s.until > s.at));
    }
  }
});
test("Brutal/Crazed late appeals replace expired fields, keep caps5/10 and shift every new center", () => {
  for (const form of ["brutal", "crazed"] as const) {
    const f = fixture(form, 1),
      first = stamps(f.d),
      ids = new Set(first.map((s) => s.id));
    let second: ClerkStamp[] = [];
    for (let n = 0; n < 1000; n++) {
      f.step();
      const s = stamps(f.d);
      assert(s.length <= first.length);
      if (s.length && s.every((s) => !ids.has(s.id))) {
        second = s;
        break;
      }
    }
    assert.equal(second.length, first.length);
    assert(f.c.tick > Math.max(...first.map(s=>s.until)));
    assert(second.every((s) => first.every((old) => distance(s, old) > 64)));
    const safe = second.find((s) => s.safeAt > 0)!;
    assert(safe.index >= 1 && safe.index <= first.length);
    assert.equal(safe.safeAt - Math.max(...second.map(s=>s.at)),12);
  }
});
test("purple stamps deal exactly twice red base damage under the shared half-second contact budget", () => {
  const red = fixture("brutal"),
    purple = fixture("brutal");
  const rs = stamps(red.d).find((s) => s.severity === "red" && s.safeAt === 0)!,
    ps = stamps(purple.d).find((s) => s.severity === "purple")!;
  for (const [f, s] of [
    [red, rs],
    [purple, ps],
  ] as const) {
    f.p.x = f.p.oldX = s.x;
    f.p.y = f.p.oldY = s.y;
    while (f.c.tick < s.at) f.step();
    assert.equal(f.damage.length, 1);
    for (let n = 0; n < 14; n++) f.step();
    assert.equal(f.damage.length, 1);
  }
  assert.equal(red.damage[0], 5);
  assert.equal(purple.damage[0], 10);
});
test("actual black seal removes75percent of current health once per activation while armor and shield capacity remain", () => {
  const { g, p } = game(),
    s = stamps(g.director.clerk).find((s) => s.severity === "black")!;
  while (g.combatTick < s.at - 1) g.step();
  p.x = p.oldX = s.x;
  p.y = p.oldY = s.y;
  p.health = 40;
  const legalShield=p.maxHealth/2;
  p.shield = legalShield;
  p.supplyShield = legalShield;
  p.supplyShieldUntil = 1e9;
  p.braceUntil = 1e9;
  p.invulnerableUntil = 0;
  for (let n = 0; n < 20 && p.health === 40; n++) g.step();
  assert.equal(p.health, 10);
  assert.equal(p.shield, legalShield);
  assert.equal(p.supplyShield, legalShield);
  const taken = p.damageTaken;
  for (let n = 0; n < 35; n++) {
    p.invulnerableUntil = 0;
    g.step();
    assert.equal(p.health, 10);
  }
  assert.equal(p.damageTaken, taken);
});
test("black current-health loss is nonlethal down to1HP and never heals a pre-existing fractional health value", () => {
  for (const health of [100, 2, 1, 0.5]) {
    const { p } = enterBlack(health);
    assert.equal(p.health, health === 100 ? 25 : health === 2 ? 1 : health);
    assert.equal(p.status, "active");
  }
});
test("dash invulnerability delays a black seal hit without consuming its one-hit activation budget", () => {
  const { g, p } = game(),
    s = stamps(g.director.clerk).find((s) => s.severity === "black")!;
  while (g.combatTick < s.at - 1) g.step();
  p.x = p.oldX = s.x;
  p.y = p.oldY = s.y;
  p.health = 100;
  p.invulnerableUntil = g.combatTick + 12;
  for (let n = 0; n < 10; n++) {
    g.step();
    assert.equal(p.health, 100);
  }
  for (let n = 0; n < 15 && p.health === 100; n++) g.step();
  assert.equal(p.health, 25);
});
test("reentering the same black seal cannot drain again but a different black seal has its own earned hit", () => {
  const { g, p, s } = enterBlack(),
    other = stamps(g.director.clerk).find(
      (a) => a.severity === "black" && a.id !== s.id,
    )!;
  p.x = p.oldX = g.arena.bounds.x + 20;
  p.y = p.oldY = g.arena.bounds.y + 20;
  for (let n = 0; n < 15; n++) g.step();
  p.health = 100;
  p.invulnerableUntil = 0;
  p.x = p.oldX = s.x;
  p.y = p.oldY = s.y;
  g.step();
  assert.equal(p.health, 100);
  while (g.combatTick < other.at) g.step();
  p.x = p.oldX = other.x;
  p.y = p.oldY = other.y;
  p.invulnerableUntil = 0;
  for (let n = 0; n < 20 && p.health === 100; n++) g.step();
  assert.equal(p.health, 25);
});
test("green whole-body shelter prevents current-health curses as well as ordinary hostile damage", () => {
  const { g, p } = game(),
    safe = stamps(g.director.clerk).find((s) => s.safeAt > 0)!;
  while (g.combatTick < safe.safeAt) g.step();
  p.x = p.oldX = safe.x;
  p.y = p.oldY = safe.y;
  p.health = 100;
  p.invulnerableUntil = 0;
  assert.equal(
    Reflect.get(g, "damageCurrentHealth").call(g, p, 0.75, 1),
    false,
  );
  g.damage(p, 50);
  assert.equal(p.health, 100);
});
test("graded fields warn two three four bounded volley sources and preserve actual reopen-before-release clocks", () => {
  for (const form of ["normal", "brutal", "crazed"] as const)
    for (const phase of [0, 1]) {
      const f = fixture(form, phase),
        s = stamps(f.d),
        safe = s.find((s) => s.safeAt > 0)!,
        v = f.d.cues().filter((c) => c.kind === "clerk-volley");
      assert.equal(v.length, clerkAppealRules.volleyOrigins[form]);
      for (const w of v) {
        assert.equal(w.at - safe.safeAt, 15);
        assert.equal(w.at - w.beganAt, 36);
        assert(
          s.some(
            (s) =>
              s.x === w.x &&
              s.y === w.y &&
              s.severity !== "black" &&
              s.safeAt === 0,
          ),
        );
      }
    }
});
test("fifteen-locale advanced help describes randomized numbered shelter, purple affliction and once-per-seal black health loss", () => {
  for (const l of data.locales) {
    const b = clerkHelp("brutal", l.id),
      c = clerkHelp("crazed", l.id),
      hint = clerkPhaseHint(1, "crazed", l.id);
    assert.notEqual(b, c);
    assert(c.includes("75"));
    assert.notEqual(hint,clerkPhaseHint(1,"normal",l.id));
    assert(b.includes("15%") && c.includes("15%"));
    assert(b.includes("35%") && c.includes("35%"));
    assert(clerkHelp("normal", l.id).length > 40);
  }
  assert(clerkHelp("brutal", "en").includes("five"));
  assert(clerkHelp("crazed", "en").includes("ten"));
  assert(clerkHelp("crazed", "en").includes("once per seal activation"));
});

test('all867sampled target/form placements fit complete separated fields and fresh late appeals on all maps',()=>{
  let samples=0;
  for(const map of runtimeArenas)for(const difficulty of data.difficulties){
    const a=runtimeArena(map.id,difficulty.id),b=a.bounds;
    for(const nx of [.15,.5,.85])for(const ny of [.25,.5,.75]){
      const target={x:b.x+b.width*nx,y:b.y+b.height*ny};
      if(a.obstacles.some(o=>segmentRect(target,target,o,9)))continue;
      for(const form of ['normal','brutal','crazed'] as const){
        const r=clerkAppealRules.stampRadii[form],count=clerkAppealRules.stampCounts[form],gap=form==='normal'?r*2+20:64,
          first=clerkStampCenters(b,a.obstacles,target,a.lavaPits,[],r,count,gap),
          second=clerkStampCenters(b,a.obstacles,target,a.lavaPits,first,r,count,gap);
        assert.equal(first.length,count,map.id+':'+difficulty.id+':'+form);
        assert.equal(second.length,count,map.id+':'+difficulty.id+':'+form+' appeal');
        for(const set of [first,second])for(const p of set){
          assert(!a.obstacles.some(o=>segmentRect(p,p,o,r+10)));
          assert(a.lavaPits.every(l=>distance(p,l)>r+l.radius+10));
          assert(set.every(q=>p===q||distance(p,q)>r*2+20));
        }
        assert(second.every(p=>first.every(q=>distance(p,q)>gap)));samples++;
      }
    }
  }
  assert.equal(samples,867);
});
