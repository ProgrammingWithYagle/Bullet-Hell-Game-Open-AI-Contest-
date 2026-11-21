import test from "node:test";
import assert from "node:assert/strict";
import {
  RangerKit,
  baseRangerOptions,
  rangerTriplineContact,
  type RangerOwner,
  type RangerTarget,
  type RangerArrow,
  type RangerContext,
} from "../src/shared/ranger-kit.ts";
import rules from "../src/shared/ranger-rules.json";

function fixture() {
  const kit = new RangerKit(),
    p: RangerOwner = {
      id: "nela",
      classId: "ranger",
      x: 400,
      y: 400,
      aim: 0,
      connected: true,
      status: "active",
      dashUntil: 0,
    };
  const arrows: RangerArrow[] = [],
    hits: { owner: string; target: string; damage: number; slow: number }[] =
      [],
    sounds: string[] = [];
  let id = 0;
  const c: RangerContext = {
    tick: 0,
    combat: true,
    paused: false,
    owners: [p],
    bounds: { x: 0, y: 0, width: 1200, height: 1000 },
    obstacles: [],
    lava: [],
    targets: [],
    id: () => ++id,
    arrow: (a) => arrows.push({ ...a }),
    strike: (owner, target, damage, slow) => {
      const actual = Math.min(target.health, damage);
      target.health -= actual;
      hits.push({ owner: owner.id, target: target.key, damage: actual, slow });
      return actual;
    },
    sound: (s) => sounds.push(s),
  };
  const step = (ticks = 1) => {
    for (let i = 0; i < ticks; i++) {
      c.tick++;
      kit.step(c);
    }
  };
  const target = (key = "ordinary:1"): RangerTarget => ({
    key,
    kind: "ordinary",
    x: 480,
    y: 450,
    oldX: 480,
    oldY: 450,
    radius: 10,
    health: 1000,
  });
  const primary = (patch: Partial<Parameters<RangerKit["primary"]>[2]> = {}) =>
    kit.primary(p, c, {
      damage: 30,
      speed: 800,
      range: 900,
      pierce: 0,
      count: 1,
      spread: 0,
      ...patch,
    });
  return { kit, p, c, arrows, hits, sounds, step, target, primary };
}

test("A primary arrow commits one aim, waits the full draw, releases from the actual owner and never fires while paused", () => {
  const f = fixture();
  assert(f.primary());
  assert(!f.primary());
  assert.equal(f.kit.movement(f.p.id, 0), 0.82);
  f.p.aim = Math.PI;
  f.p.x += 20;
  f.step(rules.primaryDrawTicks - 1);
  assert.equal(f.arrows.length, 0);
  const before = f.kit.cues(f.c);
  f.c.paused = true;
  f.kit.step({ ...f.c, tick: 100 });
  assert.equal(f.arrows.length, 0);
  assert.deepEqual(f.kit.cues(f.c), before);
  f.c.paused = false;
  f.step();
  assert.equal(f.arrows.length, 1);
  assert.equal(f.arrows[0].aim, 0);
  assert.equal(f.arrows[0].x, 420);
  assert.equal(f.arrows[0].owner, "nela");
  assert.equal(f.arrows[0].training, false);
  assert.equal(f.kit.status(f.p.id, f.c.tick).rangerDrawUntil, 0);
  assert.equal(
    f.kit.cues(f.c).find((c) => c.kind === "ranger-release")!.id,
    before[0].id,
    "Windup and release keep one animation identity",
  );
});

test("Drawn Line is a finite delayed piercing projectile request; Crosswind changes actual arrows and committed dodges cancel without a release", () => {
  const f = fixture(),
    o = baseRangerOptions();
  assert(f.kit.cast(f.p, "q", f.c, o));
  assert.equal(f.kit.movement(f.p.id, 0), 0.55);
  assert(!f.kit.canCast(f.p, "e", f.c));
  f.step(12);
  assert.equal(f.arrows.length, 1);
  assert.equal(f.arrows[0].damage, 95);
  assert.equal(f.arrows[0].pierce, 2);
  assert(f.arrows[0].training);
  o.talents.crosswind = true;
  assert(f.kit.cast(f.p, "q", f.c, o));
  f.step(12);
  assert.equal(f.arrows.length, 4);
  assert.deepEqual(
    f.arrows.slice(1).map((a) => a.damage),
    [47.5, 47.5, 47.5],
  );
  assert(
    f.arrows[1].aim < f.arrows[2].aim && f.arrows[2].aim < f.arrows[3].aim,
  );
  assert(f.primary());
  f.p.dashUntil = f.c.tick + 8;
  f.step();
  assert.equal(f.kit.status(f.p.id, f.c.tick).rangerDrawUntil, 0);
  f.step(12);
  assert.equal(f.arrows.length, 4);
});

test("Finite cable geometry includes round endpoint grazes and high-speed crossings while excluding outside paths", () => {
  const a = { x: 0, y: 0 },
    b = { x: 100, y: 0 };
  assert(rangerTriplineContact({ x: 50, y: -100 }, { x: 50, y: 100 }, a, b, 5));
  assert(rangerTriplineContact({ x: 104, y: -20 }, { x: 104, y: 20 }, a, b, 5));
  assert(
    !rangerTriplineContact({ x: 106, y: -20 }, { x: 106, y: 20 }, a, b, 5),
  );
  assert(rangerTriplineContact({ x: 0, y: 4 }, { x: 0, y: 4 }, a, a, 5));
  assert(
    !rangerTriplineContact({ x: -20, y: -20 }, { x: -10, y: -10 }, a, b, 5),
  );
});

test("Tripline placement stops before masonry, avoids lava, obeys finite owner capacity and never silently replaces an existing line", () => {
  const f = fixture(),
    o = baseRangerOptions();
  f.c.obstacles = [{ x: 510, y: 350, width: 20, height: 100 }];
  assert(f.kit.cast(f.p, "e", f.c, o));
  const first = f.kit.cues(f.c).find((c) => c.kind === "ranger-trap")!;
  assert(first.x2 < 510 - 8);
  assert(first.x2 - first.x >= rules.trapMinimumLength);
  f.p.aim = Math.PI / 2;
  assert(f.kit.cast(f.p, "e", f.c, o));
  assert(!f.kit.canCast(f.p, "e", f.c, o));
  assert(!f.kit.cast(f.p, "e", f.c, o));
  assert.equal(
    f.kit.cues(f.c).filter((c) => c.kind === "ranger-trap").length,
    2,
  );
  o.trapCapacityBonus = 999;
  assert(f.kit.cast(f.p, "e", f.c, o));
  assert(f.kit.cast(f.p, "e", f.c, o));
  assert(!f.kit.cast(f.p, "e", f.c, o));
  const blocked = fixture();
  blocked.c.obstacles = [{ x: 425, y: 300, width: 400, height: 250 }];
  assert(!blocked.kit.canCast(blocked.p, "e", blocked.c));
  const lava = fixture();
  lava.c.lava = [{ x: 455, y: 400, radius: 20 }];
  assert(!lava.kit.canCast(lava.p, "e", lava.c));
  assert.equal(
    f.kit.cues(f.c).find((c) => c.id === first.id)!.until,
    first.until,
    "Capacity checks do not replace/heal an earlier line",
  );
});

test("An ordinary crossing triggers only after the complete arming interval, while boss contacts receive damage without an invented root", () => {
  const f = fixture(),
    enemy = f.target();
  enemy.y = enemy.oldY = 400;
  f.c.targets = [enemy];
  assert(f.kit.cast(f.p, "e", f.c));
  f.step(23);
  assert.equal(f.hits.length, 0);
  f.step();
  assert.equal(f.hits.length, 1);
  assert.equal(f.hits[0].owner, f.p.id);
  assert.equal(f.hits[0].slow, 90);
  assert.equal(f.kit.status(f.p.id, f.c.tick).rangerTraps, 0);
  const boss = f.target("boss");
  boss.kind = "boss";
  boss.y = boss.oldY = 400;
  f.c.targets = [boss];
  assert(f.kit.cast(f.p, "e", f.c));
  f.step(24);
  assert.equal(f.hits[1].slow, 0);
  assert.equal(f.hits[1].damage, 45);
});

test("Linked Stakes has a shared finite quota and never hits the same entity twice, including a second crossing", () => {
  const f = fixture(),
    o = baseRangerOptions();
  o.talents.linkedStakes = true;
  const a = f.target("ordinary:1");
  a.y = 400;
  a.oldY = 300;
  f.c.targets = [a];
  assert(f.kit.cast(f.p, "e", f.c, o));
  f.step(24);
  assert.equal(f.hits.length, 1);
  f.step(30);
  assert.equal(f.hits.length, 1);
  const b = f.target("ordinary:2"),
    c = f.target("ordinary:3");
  for (const t of [b, c]) {
    t.y = 450;
    t.oldY = 350;
  }
  f.c.targets = [b, c];
  f.step();
  assert.equal(f.hits.length, 3);
  assert.equal(f.kit.status(f.p.id, f.c.tick).rangerTraps, 0);
});

test("Survey charges belong to fixed legal ground, are spent once at commitment and remain spent after cancellation", () => {
  const f = fixture();
  assert(f.kit.cast(f.p, "ultimate", f.c));
  const points = f.kit.cues(f.c).filter((c) => c.kind === "ranger-survey");
  assert.equal(points.length, 2);
  assert.equal(f.kit.status(f.p.id, 0).rangerSurveyCharges, 6);
  assert(f.primary());
  f.step(6);
  assert.equal(
    f.arrows[0].damage,
    30,
    "Casting alone does not empower an arrow outside the marks",
  );
  f.p.x = points[0].x;
  f.p.y = points[0].y;
  assert(f.primary());
  assert.equal(f.kit.status(f.p.id, f.c.tick).rangerSurveyCharges, 5);
  f.step(6);
  assert.equal(f.arrows[1].damage, 48);
  assert.equal(f.arrows[1].pierce, 1);
  assert(f.primary());
  f.p.dashUntil = f.c.tick + 8;
  f.step();
  assert.equal(f.kit.status(f.p.id, f.c.tick).rangerSurveyCharges, 4);
  assert.equal(f.arrows.length, 2, "No free arrow is created by cancelling");
  f.p.x += 100;
  f.step(8);
  const stationary = f.kit.cues(f.c).filter((c) => c.kind === "ranger-survey");
  assert.deepEqual(
    stationary.map((c) => [c.x, c.y]),
    points.map((c) => [c.x, c.y]),
  );
});

test("Long Survey trades two short-lived marks for one longer finite commitment, and effect extremes remain bounded", () => {
  const f = fixture(),
    o = baseRangerOptions();
  o.talents.longSurvey = true;
  o.ultimateCharges = 100;
  o.ultimatePotency = 100;
  o.ultimateRadius = 100;
  o.ultimateDurationBonus = 10000;
  assert(f.kit.cast(f.p, "ultimate", f.c, o));
  const point = f.kit.cues(f.c).find((c) => c.kind === "ranger-survey")!;
  assert.equal(point.remaining, 5);
  assert.equal(point.until, 420 + 240);
  assert.equal(point.radius, 56);
  assert.equal(f.kit.cues(f.c).length, 1);
  f.p.x = point.x;
  f.p.y = point.y;
  assert(
    f.primary({
      damage: 1e9,
      speed: 1e9,
      range: 1e9,
      pierce: 1e9,
      count: 1e9,
      spread: 1e9,
    }),
  );
  f.step(6);
  assert.equal(f.arrows.length, 4);
  assert(
    f.arrows.every(
      (a) =>
        a.damage === 900 &&
        a.range === 1500 &&
        a.pierce === 8 &&
        a.speed === 1600,
    ),
  );
  f.step(660);
  assert.equal(f.kit.status(f.p.id, f.c.tick).rangerSurveyCharges, 0);
});

test("Unknown ownership, inactive callers, disconnect and encounter exit cannot retain private bow, line or survey state", () => {
  const f = fixture(),
    fake = { ...f.p, id: "foreign" };
  assert(!f.kit.cast(fake, "e", f.c));
  assert(!f.kit.cast({ ...f.p, classId: "soldier" }, "q", f.c));
  assert(f.kit.cast(f.p, "e", f.c));
  assert(f.kit.cast(f.p, "ultimate", f.c));
  assert(f.primary());
  f.p.connected = false;
  f.step();
  assert.equal(f.kit.cues(f.c).length, 0);
  assert.equal(f.arrows.length, 0);
  f.p.connected = true;
  assert(f.kit.cast(f.p, "e", f.c));
  f.c.combat = false;
  f.step();
  assert.equal(f.kit.cues(f.c).length, 0);
  assert.equal(f.kit.status(f.p.id, f.c.tick).rangerTraps, 0);
});
