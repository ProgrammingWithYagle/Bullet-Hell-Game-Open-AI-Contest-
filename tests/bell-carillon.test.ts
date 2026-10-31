import test from "node:test";
import assert from "node:assert/strict";
import {
  BellCarillon,
  bellClapperContact,
  bellOpeningPoint,
  type BellClapper,
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
        assert(length <= 341 && length >= 140);
        assert(
          distance(p.at(-1)!, c.targets[0]) < distance(c.boss, c.targets[0]),
          "Approach did not close toward the marked survivor",
        );
        const echo = bellEchoPoint(c, c.boss, phase, phase);
        assert(echo);
        assert(walls.every((o) => segmentRect(echo, echo, o, 30) === null));
        cases++;
      }
    }
  assert.equal(cases, 144);
});
test("Paired Knell overlaps two independently warned outward fronts from one locked source and opening", () => {
  const f = fixture();
  f.step();
  until(f, () => of(f, "bell-ring").length > 0);
  const first = of(f, "bell-ring")[0];
  assert.equal(first.at - first.beganAt, 33);
  const lock = { x: first.x, y: first.y, gapAngle: first.gapAngle };
  until(f, () => of(f, "bell-ring").some((q) => q.strike === 2));
  const second = of(f, "bell-ring").find((q) => q.strike === 2)!;
  assert.equal(second.beganAt - first.beganAt, 32);
  assert.equal(second.at - second.beganAt, 33);
  assert(!first.returning && !second.returning);
  f.run(second.at + 1);
  assert.equal(
    of(f, "bell-ring").filter((q) => q.state === "travel").length,
    2,
  );
  for (const q of of(f, "bell-ring"))
    assert.deepEqual({ x: q.x, y: q.y, gapAngle: q.gapAngle }, lock);
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
test("first ring activation ignores old player motion and each travelling front damages a survivor once", () => {
  const f = fixture();
  f.step();
  until(f, () => of(f, "bell-ring").length > 0);
  const q = of(f, "bell-ring")[0];
  f.run(q.at - 1);
  Object.assign(f.c.targets[0], { x: q.x + 500, y: q.y, oldX: q.x, oldY: q.y });
  f.step(q.at);
  assert.equal(f.hurt.filter((h) => h.amount === 14).length, 0);
  Object.assign(f.c.targets[0], {
    x: q.x - 100,
    y: q.y,
    oldX: q.x + 500,
    oldY: q.y,
  });
  f.step();
  assert.equal(f.hurt.filter((h) => h.amount === 14).length, 1);
  Object.assign(f.c.targets[0], {
    x: q.x - 500,
    y: q.y,
    oldX: q.x - 100,
    oldY: q.y,
  });
  f.run(f.c.tick + 10);
  assert.equal(f.hurt.filter((h) => h.amount === 14).length, 1);
});

test("Procession moves only after its tell, uses all eight drawn gait frames, and closes toward the marked survivor and locks the toll to its final source", () => {
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
test("Counterstroke interleaves inward and outward fronts before the earlier wave finishes", () => {
  const f = fixture("normal", 2);
  f.step();
  until(f, () => of(f, "bell-ring").length > 0);
  const first = of(f, "bell-ring")[0];
  assert(!first.returning);
  until(f, () => of(f, "bell-ring").some((q) => q.strike === 2));
  const second = of(f, "bell-ring").find((q) => q.strike === 2)!;
  assert(second.returning);
  assert.equal(second.at - second.beganAt, 45);
  assert.equal(second.radius, second.reach);
  assert.deepEqual(
    { x: second.x, y: second.y, gapAngle: second.gapAngle },
    { x: first.x, y: first.y, gapAngle: first.gapAngle },
  );
  f.run(second.at + 1);
  assert(of(f, "bell-ring").filter((q) => q.state === "travel").length >= 2);
});

test("Brutal layers four peals and two independent aimed clappers instead of the former exclusive silent hold", () => {
  const f = fixture("brutal");
  f.step();
  const peals = new Set(),
    clappers = new Set();
  let peak = 0;
  until(f, () => of(f, "bell-ring").length > 0);
  while (f.d.busy) {
    for (const q of of(f, "bell-ring")) {
      peals.add(q.id);
      assert(!q.held);
      assert(!["quiet", "rewarn"].includes(q.state));
    }
    for (const q of of(f, "bell-clapper")) clappers.add(q.id);
    peak = Math.max(
      peak,
      of(f, "bell-ring").filter((q) => q.state === "travel").length,
    );
    f.step();
  }
  assert.equal(peals.size, 4);
  assert.equal(clappers.size, 2);
  assert(peak >= 3);
  assert.equal(f.shots(), 0);
});

test("Crazed primary and responding bell stay dangerous together, with fixed sources/openings and complete independent warnings", () => {
  const f = fixture("crazed");
  f.step();
  until(f, () => of(f, "bell-ring").some((q) => q.echo));
  const marker = of(f, "bell-resonator")[0],
    echo = of(f, "bell-ring").find((q) => q.echo)!,
    primary = of(f, "bell-ring").find((q) => !q.echo)!;
  assert.equal(echo.at - echo.beganAt, 48);
  assert.equal(marker.ringId, echo.id);
  assert.equal(echo.respondTo, primary.id);
  assert(distance(echo, primary) >= 180);
  const locks = [primary, echo].map((q) => ({
    id: q.id,
    x: q.x,
    y: q.y,
    gapAngle: q.gapAngle,
  }));
  f.run(echo.at + 1);
  assert(of(f, "bell-ring").some((q) => !q.echo && q.state === "travel"));
  assert(of(f, "bell-ring").some((q) => q.echo && q.state === "travel"));
  for (const lock of locks) {
    const q = of(f, "bell-ring").find((q) => q.id === lock.id)!;
    assert.deepEqual({ id: q.id, x: q.x, y: q.y, gapAngle: q.gapAngle }, lock);
  }
  assert.equal(f.shots(), 0);
});

test("advanced Carillon uses six overlapping alternating peals instead of another generic projectile spray", () => {
  const f = fixture("brutal", 3);
  f.step();
  const observed = new Map<number, boolean>();
  for (let n = 0; n < 7000 && observed.size < 6; n++) {
    f.step();
    for (const q of of(f, "bell-ring"))
      if (!q.echo) observed.set(q.strike, q.returning);
  }
  assert.deepEqual(
    [...observed.values()],
    [false, true, false, true, false, true],
  );
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
test("explicit interruption/reset clear peals with a fresh restart delay, while a phase change retains the committed score", () => {
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
  const committed = f.d.cues().map(q => q.id);
  f.c.phase = 1;
  f.step();
  assert(committed.every(id => f.d.cues().some(q => q.id === id)));
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

test("clapper sector is harmless for its full 36-tick lock, ignores old motion on activation and hits once per swing", () => {
  const f = fixture();
  f.step();
  until(f, () => of(f, "bell-clapper").length > 0);
  const q = of(f, "bell-clapper")[0],
    angle = q.angle;
  assert.equal(q.at - q.beganAt, 36);
  f.run(q.at - 1);
  assert.equal(f.hurt.filter((h) => h.amount === 16).length, 0);
  Object.assign(f.c.targets[0], {
    x: q.x + Math.cos(angle) * 500,
    y: q.y + Math.sin(angle) * 500,
    oldX: q.x + Math.cos(angle) * 170,
    oldY: q.y + Math.sin(angle) * 170,
  });
  f.step(q.at);
  assert.equal(f.hurt.filter((h) => h.amount === 16).length, 0);
  Object.assign(f.c.targets[0], {
    x: q.x + Math.cos(angle) * 170,
    y: q.y + Math.sin(angle) * 170,
    oldX: q.x + Math.cos(angle) * 500,
    oldY: q.y + Math.sin(angle) * 500,
  });
  f.step();
  assert.equal(f.hurt.filter((h) => h.amount === 16).length, 1);
  f.run(q.until - 1);
  assert.equal(f.hurt.filter((h) => h.amount === 16).length, 1);
  assert.equal(of(f, "bell-clapper")[0].angle, angle);
});
test("swept clapper geometry covers radial edges and caps but leaves a real sideways body-clear escape", () => {
  const q: BellClapper = {
    kind: "bell-clapper",
    id: 1,
    x: 0,
    y: 0,
    beganAt: 0,
    at: 36,
    until: 45,
    angle: 0,
    halfAngle: 0.72,
    reach: 340,
    damage: 16,
    state: "swing",
    echo: false,
  };
  assert(bellClapperContact({ x: -100, y: 0 }, { x: 500, y: 0 }, q));
  assert(bellClapperContact({ x: 100, y: -300 }, { x: 100, y: 300 }, q));
  assert(bellClapperContact({ x: 349, y: 0 }, { x: 349, y: 0 }, q));
  assert(!bellClapperContact({ x: 351, y: 0 }, { x: 351, y: 0 }, q));
  const at = (a: number) => ({ x: 280 * Math.cos(a), y: 280 * Math.sin(a) });
  assert(bellClapperContact(at(0.74), at(0.74), q));
  assert(!bellClapperContact(at(0.92), at(0.92), q));
  assert(!bellClapperContact({ x: 0, y: 200 }, { x: 0, y: 300 }, q));
});
test("a new clapper locks the current survivor position rather than reusing the first aim, and strike/reply sounds come from actual activation", () => {
  const f = fixture("crazed", 1),
    sounds: string[] = [];
  f.c.cueSound = (id) => sounds.push(id);
  f.step();
  until(f, () => of(f, "bell-clapper").some((q) => !q.echo));
  const first = of(f, "bell-clapper").find((q) => !q.echo)!;
  Object.assign(f.c.targets[0], {
    x: first.x - 230,
    y: first.y,
    oldX: first.x - 230,
    oldY: first.y,
  });
  until(f, () =>
    of(f, "bell-clapper").some((q) => !q.echo && q.id !== first.id),
  );
  const next = of(f, "bell-clapper").find((q) => !q.echo && q.id !== first.id)!;
  assert(Math.abs(Math.abs(next.angle) - Math.PI) < 1e-8);
  assert.notEqual(next.angle, first.angle);
  f.run(f.c.tick + 100);
  assert(sounds.includes("bell-toll"));
  assert(sounds.includes("bell-answer"));
  assert(sounds.includes("bell-clapper"));
});
test("both simultaneous sources share a clear-floor opening outside the first clapper, including offset arenas and lava footprints", () => {
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties) {
      const g = createPracticeGame(
        {
          mode: "endless",
          openingBossId: "bellringer",
          openingArenaId: map.id,
          difficulty: difficulty.id,
        },
        "Mara",
        "soldier",
        "crazed",
      );
      g.start();
      const c = (
          g as unknown as { signatureContext(): SignatureContext }
        ).signatureContext(),
        target = c.targets[0],
        echo = bellEchoPoint(
          c,
          c.boss,
          Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
          1,
          target,
        )!;
      assert(echo);
      const p = bellOpeningPoint(c, c.boss, target, echo),
        walls = bellWalls(c);
      assert(walls.every((o) => segmentRect(p, p, o, 12) === null));
      for (const origin of [c.boss, echo]) {
        assert(distance(p, origin) >= 130);
        const radius = distance(p, origin),
          gapAngle = Math.atan2(p.y - origin.y, p.x - origin.x);
        assert(
          !gappedRingContact(p, p, {
            ...origin,
            oldRadius: radius - 8,
            radius: radius + 8,
            width: 12,
            gap: (35 * Math.PI) / 180,
            gapAngle,
          }),
        );
      }
    }
});
