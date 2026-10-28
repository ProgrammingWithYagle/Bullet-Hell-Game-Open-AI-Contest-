import test from "node:test";
import assert from "node:assert/strict";
import {
  BellCarillon,
  bellRoad,
  bellWalls,
  bellEchoPoint,
  type BellCue,
} from "../src/shared/bell-carillon.ts";
import { gappedRingContact } from "../src/shared/ring-contact.ts";
import { serviceRingContact } from "../src/shared/service-director.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { data } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { bellFrame } from "../src/client/bell-presentation.ts";
function fixture(
  variant: "normal" | "brutal" | "crazed" = "normal",
  phase = 0,
) {
  const d = new BellCarillon();
  let serial = 0,
    shots = 0;
  const hurt: { id: string; amount: number; at: number }[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "bellringer",
    boss: { x: 800, y: 250 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [{ id: "a", x: 800, y: 700, oldX: 800, oldY: 700 }],
    damageScale: 1,
    phase,
    brutal: variant !== "normal",
    variant,
    id: () => ++serial,
    damage: (id, amount) => hurt.push({ id, amount, at: c.tick }),
    spawnRat: () => {},
    emitControlled: () => {
      shots++;
      return ++serial;
    },
    emitHostile: () => {
      shots++;
    },
  };
  const step = (t = c.tick + 1) => {
      c.tick = t;
      d.step(c);
    },
    run = (end: number) => {
      while (c.tick < end) step();
    };
  return { d, c, hurt, step, run, shots: () => shots };
}
type F = ReturnType<typeof fixture>;
const of = <K extends BellCue["kind"]>(f: F, kind: K) =>
  f.d.cues().filter((q): q is Extract<BellCue, { kind: K }> => q.kind === kind);
function until(f: F, check: () => boolean, max = 5000) {
  for (let n = 0; n < max && !check(); n++) f.step();
  assert(check(), "Expected bell state did not occur");
}
test("144 real map/difficulty/phase procession paths stay body-clear within actual offset bounds, masonry and conservative lava footprints", () => {
  let cases = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties) {
      const g = createPracticeGame(
        {
          mode: "endless",
          openingBossId: "bellringer",
          openingArenaId: map.id,
          difficulty: difficulty.id,
          seed: 491,
        },
        "Mara",
        "soldier",
      );
      g.start();
      const c = (
        g as unknown as { signatureContext(): SignatureContext }
      ).signatureContext();
      for (let phase = 0; phase < 4; phase++) {
        c.phase = phase;
        const p = bellRoad(c, c.targets[0], phase),
          walls = bellWalls(c);
        assert(p.length > 1);
        let length = 0;
        for (let n = 0; n < p.length; n++) {
          assert.deepEqual(Object.keys(p[n]).sort(), ["x", "y"]);
          if (n) {
            length += distance(p[n - 1], p[n]);
            assert(
              walls.every(
                (o) => segmentRect(p[n - 1], p[n], o, c.radius) === null,
              ),
            );
          }
        }
        assert(length <= 281 && length >= 140);
        const echo = bellEchoPoint(c, c.boss, phase, phase);
        assert(echo);
        assert(walls.every((o) => segmentRect(echo, echo, o, 30) === null));
        cases++;
      }
    }
  assert.equal(cases, 144);
});
test("Single Toll locks origin and opening through a full 33-tick harmless tell and one travelling wave; only the next cast changes its bearing", () => {
  const f = fixture();
  f.step();
  const first = of(f, "bell-ring")[0];
  assert.equal(first.at - first.beganAt, 33);
  const locked = {
    x: first.x,
    y: first.y,
    gap: first.gap,
    gapAngle: first.gapAngle,
  };
  f.run(first.at - 1);
  assert.equal(f.hurt.length, 0);
  assert.equal(of(f, "bell-ring")[0].radius, 0);
  while (of(f, "bell-ring").some((q) => q.id === first.id)) {
    f.step();
    const q = of(f, "bell-ring").find((q) => q.id === first.id);
    if (q)
      assert.deepEqual(
        { x: q.x, y: q.y, gap: q.gap, gapAngle: q.gapAngle },
        locked,
      );
  }
  until(f, () => of(f, "bell-ring").some((q) => q.id !== first.id));
  assert.equal(of(f, "bell-ring")[0].gapAngle, Math.PI / 6);
  assert.equal(f.shots(), 0);
});
test("the extracted ring capsule contact preserves all existing service behavior, inward/outward sweeps and body-width opening edges", () => {
  assert.equal(serviceRingContact, gappedRingContact);
  const q = {
    x: 0,
    y: 0,
    oldRadius: 120,
    radius: 140,
    width: 12,
    gapAngle: 0,
    gap: (35 * Math.PI) / 180,
  };
  assert(!gappedRingContact({ x: 130, y: 0 }, { x: 130, y: 0 }, q));
  assert(gappedRingContact({ x: -130, y: 0 }, { x: -130, y: 0 }, q));
  assert(
    gappedRingContact(
      { x: 0, y: -300 },
      { x: 0, y: 300 },
      { ...q, oldRadius: 130, radius: 130 },
    ),
  );
  assert(
    gappedRingContact(
      { x: -130, y: 0 },
      { x: -130, y: 0 },
      { ...q, oldRadius: 140, radius: 120 },
    ),
  );
  const a = (17.5 * Math.PI) / 180;
  assert(
    gappedRingContact(
      { x: 130 * Math.cos(a), y: 130 * Math.sin(a) },
      { x: 130 * Math.cos(a), y: 130 * Math.sin(a) },
      q,
    ),
  );
  assert(
    !gappedRingContact(
      { x: 130, y: 0 },
      { x: 130, y: 0 },
      { ...q, gapAngle: Math.PI * 2 },
    ),
  );
});
test("first activation ignores pre-warning player motion and each front damages a crossing survivor once", () => {
  const f = fixture();
  f.step();
  const q = of(f, "bell-ring")[0];
  f.run(q.at - 1);
  Object.assign(f.c.targets[0], { x: 1300, y: 250, oldX: 800, oldY: 250 });
  f.step(q.at);
  assert.equal(f.hurt.length, 0);
  Object.assign(f.c.targets[0], { x: 700, y: 250, oldX: 1300, oldY: 250 });
  f.step();
  assert.equal(f.hurt.length, 1);
  f.c.targets[0].x = 800;
  f.c.targets[0].oldX = 700;
  f.run(f.c.tick + 10);
  assert.equal(f.hurt.length, 1);
});
test("Procession moves only after its tell, uses all eight drawn gait frames, and locks the toll to its final source", () => {
  const f = fixture("normal", 1);
  f.step();
  const w = of(f, "bell-walk")[0],
    start = { ...f.c.boss },
    frames = new Set<number>();
  f.run(w.at - 1);
  assert.equal(distance(start, f.c.boss), 0);
  while (of(f, "bell-walk").length) {
    const before = { ...f.c.boss };
    f.step();
    assert(distance(before, f.c.boss) <= w.speed / 30 + 0.001);
    const frame = bellFrame(f.d.cues(), f.c.tick);
    if (frame >= 8) frames.add(frame);
  }
  assert.equal(frames.size, 8);
  assert(distance(start, f.c.boss) > 100);
  const q = of(f, "bell-ring")[0];
  assert(q);
  assert.deepEqual({ x: q.x, y: q.y }, f.c.boss);
  assert.equal(q.at - q.beganAt, 33);
});
test("new cover safely stops the planned procession instead of teleporting through it or releasing from an unreached source", () => {
  const f = fixture("normal", 1);
  f.step();
  const w = of(f, "bell-walk")[0],
    p = w.path[1],
    start = { ...f.c.boss };
  f.c.obstacles.push({ x: p.x - 50, y: p.y - 50, width: 100, height: 100 });
  f.run(w.at);
  assert.deepEqual(f.c.boss, start);
  assert.equal(of(f, "bell-walk").length, 0);
  assert.equal(of(f, "bell-ring").length, 0);
});
test("Counterstroke changes to inward then outward with independent full warnings and one locked source per score", () => {
  const f = fixture("normal", 2);
  f.step();
  until(f, () => of(f, "bell-ring").length > 0);
  const first = of(f, "bell-ring")[0];
  assert(first.returning);
  assert.equal(first.at - first.beganAt, 45);
  assert.equal(first.radius, first.reach);
  until(f, () => of(f, "bell-ring").some((q) => q.strike === 2));
  const second = of(f, "bell-ring").find((q) => q.strike === 2)!;
  assert(!second.returning);
  assert.equal(second.at - second.beganAt, 33);
  assert.deepEqual({ x: second.x, y: second.y }, { x: first.x, y: first.y });
  assert(Math.abs(second.gapAngle - first.gapAngle - Math.PI / 3) < 1e-9);
});
test("Brutal has a genuine harmless hold, retunes sixty degrees, then gives a fresh complete reactivation warning", () => {
  const f = fixture("brutal");
  f.step();
  until(f, () => of(f, "bell-ring").some((q) => q.state === "quiet"));
  const q = of(f, "bell-ring")[0];
  assert(q.held);
  assert(Math.abs(q.gapAngle - q.initialGapAngle - Math.PI / 3) < 1e-9);
  assert.equal(q.resumeAt - q.quietUntil, 36);
  f.c.targets.push({
    id: "new",
    x: q.x - q.radius,
    y: q.y,
    oldX: q.x - q.radius,
    oldY: q.y,
  });
  const hits = () => f.hurt.filter((h) => h.id === "new");
  f.run(q.quietUntil - 1);
  assert.equal(hits().length, 0);
  f.run(q.resumeAt - 1);
  assert.equal(hits().length, 0);
  assert.equal(of(f, "bell-ring")[0].radius, q.radius);
  f.step(q.resumeAt);
  assert.equal(hits().length, 1);
  f.run(q.resumeAt + 12);
  assert.equal(hits().length, 1);
});
test("Crazed retains the Brutal hold and warns a second source; the primary cannot damage during the responding front", () => {
  const f = fixture("crazed");
  f.step();
  until(f, () => of(f, "bell-resonator").length > 0);
  const marker = of(f, "bell-resonator")[0],
    echo = of(f, "bell-ring").find((q) => q.echo)!,
    primary = of(f, "bell-ring").find((q) => !q.echo)!;
  assert.equal(echo.at - echo.beganAt, 48);
  assert.equal(marker.ringId, echo.id);
  assert.equal(echo.respondTo, primary.id);
  assert(distance(echo, primary) >= 180);
  assert(primary.resumeAt > echo.until + 36);
  const lock = { x: echo.x, y: echo.y, gapAngle: echo.gapAngle };
  while (f.c.tick < primary.resumeAt - 1) {
    f.step();
    const rings = of(f, "bell-ring");
    assert(rings.filter((q) => q.state === "travel").length <= 1);
    const p = rings.find((q) => q.id === primary.id);
    assert(p && p.state !== "travel");
    const e = rings.find((q) => q.id === echo.id);
    if (e) assert.deepEqual({ x: e.x, y: e.y, gapAngle: e.gapAngle }, lock);
  }
  f.step();
  assert.equal(
    of(f, "bell-ring").find((q) => q.id === primary.id)!.state,
    "travel",
  );
  assert.equal(f.shots(), 0);
});
test("advanced Carillon uses a three-part outward/inward/outward score instead of another generic projectile spray", () => {
  const f = fixture("brutal", 3);
  f.step();
  const observed = new Map<number, boolean>();
  for (let n = 0; n < 7000 && observed.size < 3; n++) {
    f.step();
    for (const q of of(f, "bell-ring"))
      if (!q.echo) observed.set(q.strike, q.returning);
  }
  assert.deepEqual([...observed.values()], [false, true, false]);
  assert.equal(f.shots(), 0);
});
test("rich actor data cannot overwrite numeric cue identities or leak into path points and snapshots cannot mutate the owner", () => {
  const f = fixture("crazed", 1);
  Object.assign(f.c.boss, { id: "bellringer", health: 999 });
  f.step();
  let q = of(f, "bell-walk")[0];
  assert(q);
  assert(q.path.every((p) => Object.keys(p).sort().join(",") === "x,y"));
  q.path[0].x = -999;
  assert.notEqual(of(f, "bell-walk")[0].path[0].x, -999);
  until(f, () => of(f, "bell-resonator").length > 0);
  assert(f.d.cues().every((q) => Number.isSafeInteger(q.id)));
  assert.equal(new Set(f.d.cues().map((q) => q.id)).size, f.d.cues().length);
});
test("pause, phase and explicit reset remove all pending echoes/holds and preserve their fresh restart delay", () => {
  const f = fixture("crazed");
  f.step();
  until(f, () => of(f, "bell-resonator").length > 0);
  f.c.paused = true;
  f.step();
  assert.deepEqual(f.d.cues(), []);
  f.c.paused = false;
  f.run(f.c.tick + 23);
  assert.deepEqual(f.d.cues(), []);
  f.step();
  assert(f.d.cues().length);
  f.c.phase = 1;
  f.step();
  assert.deepEqual(f.d.cues(), []);
  const end = f.c.tick + 80;
  f.d.reset(end);
  f.run(end - 1);
  assert.deepEqual(f.d.cues(), []);
  f.step();
  assert(f.d.cues().length);
});
test("completed rings and repeated assistance cycles do not retain hit sets, responders or stale owned cues", () => {
  const f = fixture();
  f.c.auxiliaryBusy = true;
  for (let n = 0; n < 3; n++) {
    f.d.cast(f.c, f.c.targets[0]);
    until(f, () => !f.d.busy);
    assert.equal(Reflect.get(f.d, "hits").size, 0);
    assert.deepEqual(f.d.cues(), []);
    f.run(f.d.nextSignatureAt);
  }
  for (let n = 0; n < 8; n++) {
    f.d.reset();
    f.d.cast(f.c, f.c.targets[0]);
    f.c.paused = true;
    f.step();
    assert.deepEqual(f.d.cues(), []);
    f.c.paused = false;
  }
});
test("actual Game removes generic Bellringer bullets/lasers and clears owned fronts during stagger, assistance and encounter exit", () => {
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const g = createPracticeGame(
      { mode: "endless", openingBossId: "bellringer", difficulty: "normal" },
      "Mara",
      "soldier",
      form,
    );
    g.start();
    g.players.get("solo")!.invulnerableUntil = 1e9;
    for (let i = 0; i < 250; i++) {
      g.step();
      assert.equal(
        [...g.shots.values()].filter((q) => q.owner === "hostile").length,
        0,
      );
      assert(g.bossCues().every((q) => q.kind.startsWith("bell-")));
    }
    g.boss.staggerUntil = g.combatTick + 30;
    g.step();
    assert.deepEqual(g.director.services.bellringer.cues(), []);
    g.boss.health = 0;
    g.step();
    assert.deepEqual(g.director.services.bellringer.cues(), []);
  }
});
