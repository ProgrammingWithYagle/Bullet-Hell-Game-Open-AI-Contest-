import test from "node:test";
import assert from "node:assert/strict";
import {
  ClerkAppeal,
  clerkAppealRules,
  type ClerkVolley,
  type ClerkStamp,
} from "../src/shared/clerk-appeal.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { Game, data } from "../src/shared/game.ts";
import { runtimeArena, runtimeArenas } from "../src/shared/arena-layouts.ts";
import { clerkStampCenters } from "../src/shared/clerk-placement.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { CONTENT_REVISION, HZ, PROTOCOL } from "../src/shared/protocol.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";

function fixture(phase = 0, advanced = false) {
  let nextId = 0;
  const d = new ClerkAppeal(),
    p = { id: "p", x: 800, y: 750, oldX: 800, oldY: 750 },
    fired: {
      tick: number;
      x: number;
      y: number;
      angle: number;
      speed: number;
      damage: number;
    }[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "quarantine-clerk",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    obstacles: [],
    bounds: { x: 128, y: 80, width: 1344, height: 840 },
    damageScale: 1,
    brutal: advanced,
    phase,
    id: () => ++nextId,
    damage: () => {},
    spawnRat: () => {},
    emitHostile: (point, angle, speed, damage) =>
      fired.push({
        tick: c.tick,
        x: point.x,
        y: point.y,
        angle,
        speed,
        damage,
      }),
  };
  d.cast(c, p, { speed: 0, damage: 10, telegraph: 1.3 });
  const step = () => {
    c.tick++;
    d.step(c);
  };
  while (!d.cues().some((s) => s.kind === "stamp")) step();
  return { d, c, p, fired, step };
}
const volleys = (d: ClerkAppeal) =>
  d.cues().filter((c): c is ClerkVolley => c.kind === "clerk-volley");
const stamps = (d: ClerkAppeal) =>
  d.cues().filter((c): c is ClerkStamp => c.kind === "stamp");
function game() {
  const g = createPracticeGame(
    {
      openingBossId: "quarantine-clerk",
      mode: "endless",
      difficulty: "normal",
      seed: 981,
    },
    "Mara",
    "soldier",
  );
  g.start();
  // Isolate attack/ability effects; class starting shields have their own full matrix test.
  for(const member of g.players.values())member.shield=0;
  g.boss.deadline = 1e9;
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  while (!stamps(g.director.clerk).length) g.step();
  const seal = stamps(g.director.clerk).find((s) => s.safeAt > 0)!;
  while (g.combatTick < seal.safeAt) g.step();
  p.x = p.oldX = seal.x;
  p.y = p.oldY = seal.y;
  p.health = p.maxHealth;
  p.invulnerableUntil = 0;
  return { g, p, seal };
}
function emit(g: Game, x: number, y: number, vx: number) {
  return Reflect.get(g, "emitShot").call(
    g,
    "hostile",
    x,
    y,
    vx < 0 ? Math.PI : 0,
    Math.abs(vx),
    8,
    5,
  );
}

test("each Clerk reopening precedes its form-specific locked seven-shot fans with a full warning and no tracking", () => {
  for (const phase of [0, 1])
    for (const advanced of [false, true]) {
      const f = fixture(phase, advanced),
        s = stamps(f.d),
        green = s.find((s) => s.safeAt > 0)!,
        v = volleys(f.d);
      assert.equal(v.length, advanced ? 3 : 2);
      for (const w of v) {
        assert.equal(w.at - green.safeAt, 15);
        assert.equal(w.at - w.beganAt, 36);
        assert.equal(w.angles.length, 7);
        assert(s.some((s) => s.safeAt === 0 && s.x === w.x && s.y === w.y));
        assert.equal(w.targetX, green.x);
        assert.equal(w.targetY, green.y);
        assert.equal(w.angles[3], Math.atan2(green.y - w.y, green.x - w.x));
      }
      const locked = JSON.stringify(v);
      f.p.x = 300;
      f.p.y = 200;
      while (f.c.tick < v[0].at - 1) {
        f.step();
        assert.equal(f.fired.length, 0);
        assert.equal(
          JSON.stringify(
            volleys(f.d).filter((w) => v.some((a) => a.id === w.id)),
          ),
          locked,
        );
      }
      f.step();
      assert.equal(f.fired.length, v.length * 7);
      assert(f.fired.every((s) => s.tick === v[0].at && s.damage === 8));
      for (let n = 0; n < 5; n++) f.step();
      assert.equal(f.fired.length, v.length * 7);
    }
});

test("shelter fans and their isolated cue arrays remain bounded through advanced repeats and reset", () => {
  const f = fixture(1, true),
    first = volleys(f.d),
    original = first[0].angles[0];
  first[0].angles[0] = 999;
  assert.equal(volleys(f.d)[0].angles[0], original);
  let peak = 0;
  while (f.d.busy) {
    f.step();
    peak = Math.max(peak, volleys(f.d).length);
    assert(f.c.tick < 800);
  }
  assert(peak <= 3);
  assert.equal(f.fired.length, 42);
  assert.deepEqual(f.d.cues(), []);
  const paused = fixture(1, true);
  paused.c.paused = true;
  paused.step();
  assert.deepEqual(paused.d.cues(), []);
  paused.c.paused = false;
  for (let n = 0; n < 500; n++) paused.step();
  assert.equal(paused.fired.length, 0);
});

test("all289valid map targets and both seal sets leave time for a central fan shot to meet the open shelter", () => {
  let samples = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties) {
      const a = runtimeArena(map.id, difficulty.id),
        b = a.bounds;
      for (const nx of [0.15, 0.5, 0.85])
        for (const ny of [0.25, 0.5, 0.75]) {
          const p = { x: b.x + b.width * nx, y: b.y + b.height * ny };
          if (a.obstacles.some((o) => segmentRect(p, p, o, 9))) continue;
          const first = clerkStampCenters(b, a.obstacles, p, a.lavaPits),
            second = clerkStampCenters(b, a.obstacles, p, a.lavaPits, first);
          for (const points of [first, second])
            for (const safeIndex of [0, 2])
              for (const origin of points) {
                if (origin === points[safeIndex]) continue;
                const length = distance(origin, points[safeIndex]),
                  speed = Math.max(
                    clerkAppealRules.volleyMinimumSpeed,
                    Math.min(
                      clerkAppealRules.volleyMaximumSpeed,
                      length / clerkAppealRules.volleyTravelSeconds,
                    ),
                  ),
                  arrival =
                    clerkAppealRules.volleyAfterOpenSeconds +
                    (length -
                      clerkAppealRules.stampRadius -
                      clerkAppealRules.volleyRadius) /
                      speed;
                assert(
                  arrival < clerkAppealRules.activeSeconds,
                  map.id + ":" + difficulty.id,
                );
              }
          samples++;
        }
    }
  assert.equal(samples, 289);
});

test("actual Normal Clerk fires while its seal is useful and real rim interceptions prevent injury", () => {
  const { g, p, seal } = game(),
    release = volleys(g.director.clerk)[0].at;
  let impacts = 0,
    released = 0;
  for (let n = 0; n < 65; n++) {
    g.step();
    if (g.combatTick === release)
      released = [...g.shots.values()].filter(
        (s) => s.owner === "hostile",
      ).length;
    impacts += g.director.cues().filter((c) => c.kind === "clerk-block").length;
    assert.equal(p.health, p.maxHealth);
  }
  assert(released > 0);
  assert(impacts > 0);
  assert(g.combatTick < seal.until);
});

test("a wall encountered before a seal absorbs the shot without inventing a rim impact", () => {
  const { g, seal } = game();
  g.arena.obstacles.push({
    x: seal.x + 106,
    y: seal.y - 20,
    width: 6,
    height: 40,
  });
  const shot = emit(g, seal.x + 130, seal.y, -1800);
  Reflect.get(g, "stepShots").call(g);
  assert(!g.shots.has(shot.id));
  assert(!g.director.cues().some((c) => c.kind === "clerk-block"));
});

test("actual interception cues are capped at48, sit on the rim, expire naturally and survive phase entry", () => {
  const { g, seal } = game();
  for (let n = 0; n < 80; n++) emit(g, seal.x + 90, seal.y, -600);
  Reflect.get(g, "stepShots").call(g);
  const blocks = g.director.cues().filter((c) => c.kind === "clerk-block");
  assert.equal(blocks.length, 48);
  for (const c of blocks) {
    assert.equal(distance(c, seal), 82);
    assert.equal(c.until - c.at, 9);
  }
  for (let n = 0; n < 9; n++) g.step();
  assert(!g.director.cues().some((c) => c.kind === "clerk-block"));
  emit(g, seal.x + 90, seal.y, -600);
  Reflect.get(g, "stepShots").call(g);
  assert(g.director.cues().some((c) => c.kind === "clerk-block"));
  const continuing = g.director.cues().filter(c => c.kind === "clerk-block" || c.kind === "clerk-volley").filter(c => c.until > g.combatTick+1).map(c => c.id);
  g.boss.health = g.boss.maxHealth * 0.49;
  g.step();
  assert(continuing.length);
  assert(continuing.every(id => g.director.cues().some(c => c.id === id)));
});

test("only the known protocol24 local Practice/profile revision migrates while exact form and build history survives", () => {
  const { g } = game();
  g.boss.health = 0;
  g.step();
  const save = g.offlineCheckpoint()!,
    old = structuredClone(save),
    revision =
      "27c4b2e298912b53f88b115654857f923966aeccdb80b730e449536a2045ef27";
  old.protocolVersion = 24;
  old.contentRevision = revision;
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 41);
  assert.equal(after.contentRevision, CONTENT_REVISION);
  assert.deepEqual(after.player, save.player);
  assert.deepEqual(after.completedBossForms, save.completedBossForms);
  for (const invalid of [
    { ...old, contentRevision: "0".repeat(64) },
    { ...old, serverOnly: true },
    { ...old, practiceOnly: false },
    { ...old, players: [] },
  ])
    assert.throws(() => Game.restoreOffline(invalid));
  const p = freshProfile();
  p.contentRevision = revision;
  assert.deepEqual(
    { ...parseProfile(JSON.stringify(p)), contentRevision: revision },
    p,
  );
});

test("an exposed survivor on a warned fan wing takes actual projectile damage outside both the seal and stamp", () => {
  const { g, p, seal } = game(),
    fans = volleys(g.director.clerk);
  const candidates = fans.flatMap((w) =>
    [w.angles[0], w.angles.at(-1)!].map((angle) => ({
      x: w.x + Math.cos(angle) * 150,
      y: w.y + Math.sin(angle) * 150,
    })),
  );
  const point = candidates.find(
    (q) =>
      stamps(g.director.clerk).every((s) => distance(q, s) > s.radius + 10) &&
      !g.obstacles.some((o) => segmentRect(q, q, o, 9)),
  );
  assert(point);
  p.x = p.oldX = point.x;
  p.y = p.oldY = point.y;
  const hp = p.health;
  while (g.combatTick < fans[0].at + 35) g.step();
  assert(p.health < hp);
  assert(!g.director.clerk.isSafe(point, g.combatTick));
  assert(g.combatTick < seal.until);
});
