import { createPracticeGame } from "../src/shared/practice-start.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  MatronWard,
  matronPath,
  matronRingContact,
  matronWalls,
  matronRules,
  type MatronCue,
} from "../src/shared/matron-ward.ts";
import { runtimeArenas, runtimeArena } from "../src/shared/arena-layouts.ts";
import { Minions } from "../src/shared/minions.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { HZ } from "../src/shared/protocol.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
function fixture(
  variant: "normal" | "brutal" | "crazed" = "normal",
  phase = 0,
) {
  const d = new MatronWard();
  let serial = 0;
  const hurt: { id: string; amount: number }[] = [],
    spawns: { at: number; point: { x: number; y: number } }[] = [],
    shots: { at: number; x: number; y: number; angle: number }[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "matron",
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
    movementSpeedScale: 1,
    id: () => ++serial,
    damage: (id, amount) => hurt.push({ id, amount }),
    spawnRat: () => {},
    spawnOrdinary: (point) => spawns.push({ at: c.tick, point: { ...point } }),
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
  return { d, c, hurt, spawns, shots, step, run };
}
const of = <K extends MatronCue["kind"]>(d: MatronWard, kind: K) =>
  d.cues().filter((q): q is Extract<MatronCue, { kind: K }> => q.kind === kind);
test("Matron escort paths are connected and body-clear across all maps, difficulty cover and late flanks", () => {
  for (const map of runtimeArenas)
    for (const difficulty of [
      "baby",
      "easy",
      "normal",
      "hard",
      "insane",
      "hellish",
    ])
      for (const late of [false, true]) {
        const f = fixture(),
          arena = runtimeArena(map.id, difficulty);
        f.c.bounds = arena.bounds;
        f.c.obstacles = arena.obstacles;
        f.c.hazardCircles = arena.lavaPits;
        // Match the actual boss entry, which is shared by these arenas.
        f.c.boss = { ...arena.bossSpawn };
        const path = matronPath(
          f.c,
          {
            x: arena.bounds.x + arena.bounds.width * 0.72,
            y: arena.bounds.y + arena.bounds.height * 0.72,
          },
          late,
          1,
        );
        assert(path.length > 1, map.id + "/" + difficulty);
        const b = arena.bounds;
        let length = 0;
        for (let i = 0; i < path.length; i++) {
          const p = path[i];
          assert(
            p.x - 58 >= b.x - 0.01 &&
              p.x + 58 <= b.x + b.width + 0.01 &&
              p.y - 58 >= b.y - 0.01 &&
              p.y + 58 <= b.y + b.height + 0.01,
          );
          assert(!matronWalls(f.c).some((o) => segmentRect(p, p, o, 58)));
          if (i) {
            assert(
              !matronWalls(f.c).some((o) => segmentRect(path[i - 1], p, o, 58)),
            );
            length += distance(path[i - 1], p);
          }
        }
        assert(length >= 96 && length <= 320.01);
      }
  const f = fixture();
  assert.notDeepEqual(
    matronPath(f.c, f.c.targets[0], false, 0),
    matronPath(f.c, f.c.targets[0], true, 0),
  );
});
test("escort warning locks its path, moves under its speed budget and stops safely on new cover", () => {
  const f = fixture();
  f.d.cast(f.c, f.c.targets[0]);
  const walk = of(f.d, "matron-walk")[0],
    locked = structuredClone(walk.path),
    origin = { ...f.c.boss };
  assert(walk.at - walk.beganAt >= 20);
  f.c.targets[0].x = 100;
  f.run(walk.at - 1);
  assert.deepEqual(f.c.boss, origin);
  assert.deepEqual(of(f.d, "matron-walk")[0].path, locked);
  f.step(walk.at);
  assert(distance(origin, f.c.boss) <= walk.speed / HZ + 0.001);
  assert(distance(origin, f.c.boss) > 0);
  const before = { ...f.c.boss },
    next = locked[1],
    angle = Math.atan2(next.y - before.y, next.x - before.x);
  f.c.obstacles.push({
    x: before.x + Math.cos(angle) * 62 - 2,
    y: before.y + Math.sin(angle) * 62 - 2,
    width: 4,
    height: 4,
  });
  f.step(walk.at + 1);
  assert(distance(before, f.c.boss) <= walk.speed / HZ + 0.001);
  assert.equal(of(f.d, "matron-walk").length, 0);
});
test("brood channels warn fully, spawn two/four from clear nest interiors and stop after nest destruction", () => {
  for (const phase of [0, 2]) {
    const f = fixture("normal", phase);
    f.d.cast(f.c, f.c.targets[0]);
    const nest = of(f.d, "service-prop")[0];
    assert.equal(nest.health, 100);
    let brood;
    for (let t = 1; t < 500 && !brood; t++) {
      f.step(t);
      brood = of(f.d, "matron-brood")[0];
    }
    assert(brood);
    assert(brood.at - brood.beganAt >= 36);
    f.run(brood.at - 1);
    assert.equal(f.spawns.length, 0);
    f.step(brood.at);
    assert.equal(f.spawns.length, phase ? 4 : 2);
    assert(f.spawns.every((s) => distance(s.point, nest) + 12 < nest.radius));
    const count = f.spawns.length;
    assert.equal(f.d.hit(nest.id, 999), 100);
    f.c.auxiliaryBusy = true;
    f.run(f.c.tick + 6 * HZ);
    assert.equal(f.spawns.length, count);
    assert.equal(f.d.weakPoints().length, 0);
  }
});
test("first phase calls one nest while late relays use surviving nests in a warned serial order", () => {
  for (const phase of [0, 2]) {
    const f = fixture("normal", phase),
      sets = new Map<number, { sources: number[]; ats: number[] }>();
    for (let t = 0; t < 2200; t++) {
      f.step(t);
      for (const p of of(f.d, "matron-pulse")) {
        const row = sets.get(p.beganAt) ?? { sources: [], ats: [] };
        if (!row.sources.includes(p.sourceId)) {
          row.sources.push(p.sourceId);
          row.ats.push(p.at);
        }
        sets.set(p.beganAt, row);
      }
      assert(f.d.weakPoints().length <= 3);
    }
    assert(sets.size >= 3);
    if (phase) {
      const triple = [...sets.values()].find((s) => s.sources.length === 3);
      assert(triple);
      assert(
        triple.ats[1] - triple.ats[0] >= 27 &&
          triple.ats[2] - triple.ats[1] >= 27,
      );
    } else assert([...sets.values()].every((s) => s.sources.length === 1));
  }
});
test("lullabies respect the full marked gap, swept body crossings, first activation and one hit per wave", () => {
  const ring = {
    x: 0,
    y: 0,
    radius: 110,
    oldRadius: 90,
    width: 12,
    gap: (86 * Math.PI) / 180,
    gapAngle: 0,
  };
  assert(!matronRingContact({ x: 100, y: 0 }, { x: 100, y: 0 }, ring));
  assert(matronRingContact({ x: -100, y: 0 }, { x: -100, y: 0 }, ring));
  assert(
    matronRingContact(
      { x: 0, y: -160 },
      { x: 0, y: 160 },
      { ...ring, radius: 100, oldRadius: 100 },
    ),
  );
  const f = fixture();
  f.d.cast(f.c, f.c.targets[0]);
  let pulse;
  for (let t = 1; t < 500 && !pulse; t++) {
    f.step(t);
    pulse = of(f.d, "matron-pulse")[0];
  }
  assert(pulse);
  assert(pulse.at - pulse.beganAt >= 48);
  f.c.auxiliaryBusy = true;
  f.c.targets[0].x = pulse.x - 100;
  f.c.targets[0].y = pulse.y;
  f.c.targets[0].oldX = pulse.x - 100;
  f.c.targets[0].oldY = pulse.y;
  f.run(pulse.at - 1);
  assert.equal(f.hurt.length, 0);
  f.run(pulse.at + HZ);
  assert.equal(f.hurt.length, 1);
  f.run(pulse.at + 2 * HZ);
  assert.equal(f.hurt.length, 1);
});
test("Brutal emits thirty owned needles and Crazed retains that exact prefix before sixty crossing needles", () => {
  const traces: { x: number; y: number; angle: number }[][] = [];
  for (const variant of ["brutal", "crazed"] as const) {
    const f = fixture(variant);
    f.d.cast(f.c, f.c.targets[0]);
    f.c.auxiliaryBusy = true;
    let groups: Extract<MatronCue, { kind: "matron-needles" }>[] | undefined;
    for (let t = 1; t < 500 && !groups; t++) {
      f.step(t);
      const q = of(f.d, "matron-needles");
      if (q.length) groups = q;
    }
    assert(groups);
    assert(groups.every((q) => q.at - q.beganAt >= 42));
    const frozen: Extract<MatronCue, { kind: "matron-needles" }>[] =
        structuredClone(groups),
      last = Math.max(...groups.map((q) => q.at));
    f.c.targets[0].x = 20;
    f.c.targets[0].y = 20;
    f.run(last + 1);
    assert.equal(f.shots.length, variant === "brutal" ? 30 : 90);
    assert.deepEqual(
      f.shots.map((s) => s.angle),
      frozen.flatMap((g) => g.angles),
    );
    traces.push(f.shots.map(({ at, ...shot }) => shot));
  }
  assert.deepEqual(traces[1].slice(0, 30), traces[0]);
  assert(
    traces[1]
      .slice(30)
      .some((s) => !traces[0].some((b) => b.angle === s.angle)),
  );
});
test("destroying a nest cancels its unreleased needles and broods, while an already launched lullaby continues", () => {
  const f = fixture("crazed");
  f.d.cast(f.c, f.c.targets[0]);
  f.c.auxiliaryBusy = true;
  let pulse;
  for (let t = 1; t < 500 && !pulse; t++) {
    f.step(t);
    pulse = of(f.d, "matron-pulse")[0];
  }
  assert(pulse);
  f.run(pulse.at);
  assert.equal(f.shots.length, 0);
  const nest = f.d.weakPoints()[0];
  f.d.hit(nest.id, 1e6);
  const count = f.spawns.length;
  f.run(pulse.at + 4 * HZ);
  assert.equal(f.shots.length, 0);
  assert.equal(f.spawns.length, count);
  assert(of(f.d, "matron-pulse").some((p) => p.id === pulse.id));
});
test("explicit interruption/reset cancel pending work, while phase changes retain the warned escort", () => {
  const f = fixture("crazed");
  f.d.cast(f.c, f.c.targets[0]);
  f.run(100);
  f.d.reset(1000);
  const before = { spawn: f.spawns.length, shot: f.shots.length };
  f.run(999);
  assert.deepEqual(f.d.cues(), []);
  assert.deepEqual({ spawn: f.spawns.length, shot: f.shots.length }, before);
  f.c.paused = true;
  f.run(1050);
  assert.deepEqual(f.d.cues(), []);
  f.c.paused = false;
  f.run(1100);
  assert(of(f.d, "matron-walk").length);
  const committed = f.d.cues().map(q => q.id);
  f.c.phase = 1;
  f.step(1101);
  assert(committed.every(id => f.d.cues().some(q => q.id === id)));
});
test("only the explicit Matron ordinary-navigation option routes a brood around cover", () => {
  const target = { id: "p", x: 950, y: 500 },
    wall = { x: 750, y: 420, width: 50, height: 160 };
  const run = (navigate: boolean) => {
    const m = new Minions();
    m.spawn(
      1,
      {
        kind: "ordinary",
        x: 650,
        y: 500,
        radius: 12,
        speed: 100,
        health: 45,
        damage: 9,
      },
      0,
    );
    for (let t = 0; t < 6 * HZ; t++)
      m.step(t, [target], [wall], () => {}, [target], navigate);
    return m.actors.get(1)!;
  };
  assert(distance(run(true), target) < 30);
  assert(distance(run(false), target) > 150);
  assert.equal(matronRules.minionMaximum, 18);
});

test("actual Matron cycles keep advancing after late-phase Baby/Easy assistance with eighteen-actor bounds", () => {
  for (const difficulty of ["baby", "easy", "normal", "hard"])
    for (const form of ["normal", "brutal", "crazed"] as const) {
      const g = createPracticeGame(
        { mode: "endless", openingBossId: "matron", difficulty },
        "Mara",
        "soldier",
        form,
      );
      g.start();
      g.boss.health = g.boss.maxHealth * 0.49;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      const walks = new Set<number>();
      let peak = 0;
      for (let i = 0; i < 2400; i++) {
        g.step();
        for (const q of g.bossCues())
          if (q.kind === "matron-walk") walks.add(q.id);
        peak = Math.max(peak, g.minions.actors.size);
        assert(g.minions.actors.size <= 18);
      }
      assert(walks.size >= 3, difficulty + "/" + form);
      assert(peak > 0);
      g.boss.health = 0;
      g.step();
      assert.equal(g.minions.actors.size, 0);
      assert(
        !g
          .bossCues()
          .some(
            (q) =>
              q.kind.startsWith("matron-") ||
              (q.kind === "service-prop" && q.role === "nest"),
          ),
      );
    }
});
