import { Prediction } from "../src/client/prediction.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  MoldMixing,
  moldRoad,
  moldWalls,
  moldPoint,
  moldMovement,
  type MoldCue,
} from "../src/shared/mold-mixing.ts";
import { runtimeArenas, runtimeArena } from "../src/shared/arena-layouts.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { serviceMovement } from "../src/shared/service-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
function fixture(
  variant: "normal" | "brutal" | "crazed" = "normal",
  phase = 0,
) {
  const d = new MoldMixing();
  let serial = 0;
  const hurt: { id: string; amount: number }[] = [],
    shots: { at: number; x: number; y: number; angle: number }[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "alchemist",
    boss: { x: 800, y: 250 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [{ id: "a", x: 800, y: 700, oldX: 800, oldY: 700 }],
    damageScale: 1,
    phase,
    brutal: variant !== "normal",
    variant,
    projectileMultiplier:
      variant === "normal" ? 1 : variant === "brutal" ? 2.5 : 7.5,
    id: () => ++serial,
    damage: (id, amount) => hurt.push({ id, amount }),
    spawnRat: () => {},
    emitControlled: (point, angle) => {
      shots.push({ at: c.tick, x: point.x, y: point.y, angle });
      return serial++;
    },
  };
  const step = (tick: number) => {
      c.tick = tick;
      d.step(c);
    },
    run = (end: number) => {
      for (let t = c.tick + 1; t <= end; t++) step(t);
    };
  return { d, c, hurt, shots, step, run };
}
const of = <K extends MoldCue["kind"]>(d: MoldMixing, kind: K) =>
  d.cues().filter((q): q is Extract<MoldCue, { kind: K }> => q.kind === kind);
function until(
  f: ReturnType<typeof fixture>,
  check: () => boolean,
  max = 3000,
) {
  for (let t = 0; t < max && !check(); t++) f.step(f.c.tick + 1);
  assert(check(), "Mold stage missing");
}
test("mixing roads are fully connected and clear for body and pool geometry on all real arenas/difficulties", () => {
  for (const map of runtimeArenas)
    for (const difficulty of [
      "baby",
      "easy",
      "normal",
      "hard",
      "insane",
      "hellish",
    ])
      for (const phase of [0, 1, 2, 3]) {
        const f = fixture(),
          arena = runtimeArena(map.id, difficulty);
        Object.assign(f.c, {
          bounds: arena.bounds,
          boss: { ...arena.bossSpawn },
          obstacles: arena.obstacles,
          hazardCircles: arena.lavaPits,
          phase,
        });
        const path = moldRoad(f.c, arena.playerSpawn, 0),
          b = arena.bounds;
        assert(path.length > 1, map.id + "/" + difficulty);
        let length = 0;
        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          assert(
            p.x - 58 >= b.x - 0.01 &&
              p.x + 58 <= b.x + b.width + 0.01 &&
              p.y - 58 >= b.y - 0.01 &&
              p.y + 58 <= b.y + b.height + 0.01,
          );
          assert(!moldWalls(f.c).some((o) => segmentRect(p, p, o, 58)));
          if (i) {
            assert(
              !moldWalls(f.c).some((o) => segmentRect(path[i - 1], p, o, 58)),
            );
            length += distance(path[i - 1], p);
          }
        }
        assert(length >= 160 && length <= 360.01);
      }
  assert.deepEqual(
    moldPoint(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      0.75,
    ),
    { x: 100, y: 50 },
  );
});
test("mixing walks lock their tell, remain harmless and stop on new masonry without teleporting", () => {
  const f = fixture();
  f.d.cast(f.c, f.c.targets[0]);
  const w = of(f.d, "mold-walk")[0],
    path = structuredClone(w.path),
    origin = { ...f.c.boss };
  assert(w.at - w.beganAt >= 20);
  f.c.targets[0].x = 20;
  f.run(w.at - 1);
  assert.deepEqual(f.c.boss, origin);
  assert.deepEqual(of(f.d, "mold-walk")[0].path, path);
  assert.equal(f.hurt.length, 0);
  f.step(w.at);
  assert(
    distance(origin, f.c.boss) > 0 &&
      distance(origin, f.c.boss) <= 80 / 30 + 0.01,
  );
  const before = { ...f.c.boss };
  f.c.obstacles.push({
    x: before.x - 60,
    y: before.y - 60,
    width: 120,
    height: 120,
  });
  f.step(w.at + 1);
  assert.deepEqual(f.c.boss, before);
  assert.equal(of(f.d, "mold-walk").length, 0);
});
test("culture pools have a full tell, locked centers, shared half-second contact and identical authority/prediction slow", () => {
  const f = fixture();
  f.d.cast(f.c, f.c.targets[0]);
  until(f, () => of(f.d, "mold-pool").length > 0);
  const pools = of(f.d, "mold-pool");
  assert.equal(pools.length, 3);
  const p = pools[0],
    other = pools[1],
    position = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
  assert(distance(position, p) < 65 && distance(position, other) < 65);
  Object.assign(f.c.targets[0], {
    ...position,
    oldX: position.x,
    oldY: position.y,
  });
  f.c.auxiliaryBusy = true;
  f.run(p.at - 1);
  assert.equal(f.hurt.length, 0);
  assert.equal(moldMovement(f.d.cues(), position, p.at - 1), 1);
  f.step(p.at);
  assert.equal(f.hurt.length, 1);
  assert.equal(f.hurt[0].amount, 10);
  assert.equal(moldMovement(f.d.cues(), position, p.at), 0.65);
  assert.equal(
    serviceMovement(f.d.cues(), position, "a", p.at).multiplier,
    0.65,
  );
  f.run(p.at + 14);
  assert.equal(f.hurt.length, 1);
  f.step(p.at + 15);
  assert.equal(f.hurt.length, 2);
  assert.deepEqual(
    of(f.d, "mold-pool").map((q) => ({ x: q.x, y: q.y })),
    pools.map((q) => ({ x: q.x, y: q.y })),
  );
});
test("three Standard phases use culture, one catalyst, then a fresh separately warned draining return", () => {
  for (const [phase, legs] of [
    [0, 0],
    [1, 1],
    [2, 2],
  ]) {
    const f = fixture("normal", phase);
    f.d.cast(f.c, f.c.targets[0]);
    f.c.auxiliaryBusy = true;
    const seen = new Map<number, Extract<MoldCue, { kind: "mold-front" }>>();
    let drained = false;
    for (let t = 1; t < 1600; t++) {
      f.step(t);
      for (const q of of(f.d, "mold-front"))
        if (!seen.has(q.id)) {
          assert(q.at - q.beganAt >= 45);
          seen.set(q.id, q);
        }
      drained ||= of(f.d, "mold-pool").some((q) => q.drainedAt > 0);
      if (!f.d.busy) break;
    }
    assert.equal(seen.size, legs);
    if (legs === 2) {
      const [a, b] = [...seen.values()];
      assert.deepEqual(b.path, [...a.path].reverse());
      assert(b.beganAt > a.at);
      assert(b.draining);
      assert(drained);
    } else assert(!drained);
  }
});
test("advanced Reflux keeps three Brutal legs and adds a fourth fully warned Crazed leg", () => {
  for (const form of ["brutal", "crazed"] as const) {
    const f = fixture(form, 3);
    f.d.cast(f.c, f.c.targets[0]);
    f.c.auxiliaryBusy = true;
    const seen = new Map<number, number>();
    for (let t = 1; t < 1800; t++) {
      f.step(t);
      for (const q of of(f.d, "mold-front")) {
        assert(q.at - q.beganAt >= 45);
        seen.set(q.id, q.leg);
      }
      if (of(f.d, "mold-spray").length) break;
    }
    assert.deepEqual(
      [...seen.values()],
      form === "brutal" ? [1, 2, 3] : [1, 2, 3, 4],
    );
  }
});
test("a catalyst sweeps crossing bodies once per leg and ignores movement completed before activation", () => {
  const f = fixture("normal", 1);
  f.d.cast(f.c, f.c.targets[0]);
  f.c.auxiliaryBusy = true;
  until(f, () => of(f.d, "mold-front").length > 0);
  const q = of(f.d, "mold-front")[0],
    next = q.path[1],
    angle = Math.atan2(next.y - q.y, next.x - q.x),
    side = { x: -Math.sin(angle) * 110, y: Math.cos(angle) * 110 };
  Object.assign(f.c.targets[0], {
    x: q.x + side.x,
    y: q.y + side.y,
    oldX: q.x - side.x,
    oldY: q.y - side.y,
  });
  f.run(q.at - 1);
  f.step(q.at);
  assert(!f.hurt.some((h) => h.amount === 12));
  Object.assign(f.c.targets[0], {
    x: q.x - side.x,
    y: q.y - side.y,
    oldX: q.x + side.x,
    oldY: q.y + side.y,
  });
  f.step(q.at + 1);
  assert.equal(f.hurt.filter((h) => h.amount === 12).length, 1);
  f.run(q.at + 8);
  assert.equal(f.hurt.filter((h) => h.amount === 12).length, 1);
});
test("decant clears actual pool damage and slow when its body reaches a culture circle", () => {
  const f = fixture("normal", 2);
  f.d.cast(f.c, f.c.targets[0]);
  f.c.auxiliaryBusy = true;
  until(f, () => of(f.d, "mold-pool").some((p) => p.drainedAt > 0));
  const p = of(f.d, "mold-pool").find((p) => p.drainedAt > 0)!;
  assert(f.c.tick < p.at + 12 * 30);
  assert.equal(moldMovement(f.d.cues(), p, f.c.tick), 1);
  const before = f.hurt.filter((h) => h.amount === 10).length;
  Object.assign(f.c.targets[0], { x: p.x, y: p.y, oldX: p.x, oldY: p.y });
  f.run(f.c.tick + 14);
  assert.equal(f.hurt.filter((h) => h.amount === 10).length, before);
});
test("controlled vial sprays emit thirty/ninety actual shots and retain the exact Brutal prefix before crossing repeats", () => {
  const traces: { x: number; y: number; angle: number }[][] = [];
  for (const form of ["brutal", "crazed"] as const) {
    const f = fixture(form);
    f.d.cast(f.c, f.c.targets[0]);
    f.c.auxiliaryBusy = true;
    until(f, () => of(f.d, "mold-spray").length > 0);
    const groups = of(f.d, "mold-spray");
    assert(groups.every((q) => q.at - q.beganAt >= 39));
    const lock = structuredClone(groups);
    f.c.targets[0].x = 10;
    f.run(Math.max(...groups.map((q) => q.at)) + 1);
    assert.equal(f.shots.length, form === "brutal" ? 30 : 90);
    assert.deepEqual(
      f.shots.map((s) => s.angle),
      lock.flatMap((q) => q.angles),
    );
    traces.push(f.shots.map(({ at, ...s }) => s));
  }
  assert.deepEqual(traces[1].slice(0, 30), traces[0]);
  assert(
    traces[1]
      .slice(30)
      .some((s) => !traces[0].some((b) => b.angle === s.angle)),
  );
});
test("owned snapshots are detached and reset/pause/phase cancellation cannot release stale spray work", () => {
  const f = fixture("crazed", 3);
  f.d.cast(f.c, f.c.targets[0]);
  const q = of(f.d, "mold-walk")[0];
  q.path[0].x = -999;
  assert.notEqual(of(f.d, "mold-walk")[0].path[0].x, -999);
  f.c.auxiliaryBusy = true;
  until(f, () => of(f.d, "mold-spray").length > 0);
  const first = of(f.d, "mold-spray")[0];
  first.angles[0] = -999;
  assert.notEqual(of(f.d, "mold-spray")[0].angles[0], -999);
  f.d.reset(f.c.tick + 500);
  const before = f.shots.length;
  f.run(f.c.tick + 499);
  assert.deepEqual(f.d.cues(), []);
  assert.equal(f.shots.length, before);
  f.c.paused = true;
  f.run(f.c.tick + 50);
  assert.deepEqual(f.d.cues(), []);
  f.c.paused = false;
  f.c.auxiliaryBusy = false;
  until(f, () => of(f.d, "mold-walk").length > 0);
  f.c.phase = 0;
  f.step(f.c.tick + 1);
  assert.deepEqual(f.d.cues(), []);
});
test("actual assistance, phase resets and repeated mixing cycles keep their scheduler advancing and clear on exit", () => {
  for (const difficulty of ["baby", "easy", "normal", "hard"])
    for (const form of ["normal", "brutal", "crazed"] as const) {
      const g = createPracticeGame(
        { mode: "endless", openingBossId: "alchemist", difficulty },
        "Mara",
        "soldier",
        form,
      );
      g.start();
      g.boss.health = g.boss.maxHealth * (form === "normal" ? 0.39 : 0.24);
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      const walks = new Set<number>();
      for (let t = 0; t < 2400; t++) {
        g.step();
        for (const q of g.bossCues())
          if (q.kind === "mold-walk") walks.add(q.id);
      }
      assert(walks.size >= 2, difficulty + "/" + form);
      g.boss.health = 0;
      g.step();
      assert(!g.bossCues().some((q) => q.kind.startsWith("mold-")));
    }
});

test("actual client prediction and authority agree through culture slow and its expiration", () => {
  const g = createPracticeGame(
    { mode: "endless", openingBossId: "alchemist" },
    "Mara",
    "soldier",
    "normal",
  );
  g.start();
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  let pool;
  for (let t = 0; t < 600 && !pool; t++) {
    g.step();
    pool = g
      .bossCues()
      .find((q) => q.kind === "mold-pool" && g.combatTick >= q.at);
  }
  assert(pool && pool.kind === "mold-pool");
  p.x = pool.x;
  p.y = pool.y;
  const prediction = new Prediction();
  prediction.acknowledge(viewOf(g, "solo"), "solo");
  for (let i = 1; i <= 180; i++) {
    const input = { ...idleInput(), sequence: i, moveX: 1, moveY: 0.2 };
    prediction.submit(input, viewOf(g, "solo"));
    g.submitInput("solo", input);
    g.step();
    assert(Math.abs(prediction.player!.x - p.x) < 1e-6);
    assert(Math.abs(prediction.player!.y - p.y) < 1e-6);
  }
});

test("rich boss metadata cannot overwrite numeric reaction IDs or leak into coordinate paths", () => {
  const f = fixture("crazed", 3);
  Object.assign(f.c.boss, { id: "alchemist", health: 1000, castAt: 44 });
  f.d.cast(f.c, f.c.targets[0]);
  f.c.auxiliaryBusy = true;
  const fronts = new Set<number>();
  for (let t = 1; t < 1800; t++) {
    f.step(t);
    for (const q of f.d.cues()) {
      assert.equal(typeof q.id, "number");
      if (q.kind === "mold-walk" || q.kind === "mold-front")
        for (const p of q.path)
          assert.deepEqual(Object.keys(p).sort(), ["x", "y"]);
      if (q.kind === "mold-front") fronts.add(q.id);
    }
    if (of(f.d, "mold-spray").length) break;
  }
  assert.equal(fronts.size, 4);
});
