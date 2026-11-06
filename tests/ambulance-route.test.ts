import test from "node:test";
import assert from "node:assert/strict";
import {
  AmbulanceRoute,
  ambulancePatrol,
  ambulanceRay,
  ambulanceRules as r,
  type AmbulanceLane,
} from "../src/shared/ambulance-route.ts";
import { runtimeArenas, runtimeArena } from "../src/shared/arena-layouts.ts";
import { data } from "../src/shared/game.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
function fixture(form: "normal" | "brutal" | "crazed" = "normal", phase = 0) {
  let id = 1;
  const hits: { id: string; amount: number }[] = [],
    shots: { x: number; y: number; angle: number; tick: number }[] = [];
  const c: SignatureContext = {
    bossId: "black-ambulance",
    boss: { x: 800, y: 250 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [{ id: "p", x: 800, y: 800, oldX: 800, oldY: 800 }],
    tick: 1,
    phase,
    variant: form,
    brutal: form !== "normal",
    damageScale: 1,
    id: () => id++,
    damage: (id, amount) => hits.push({ id, amount }),
    spawnRat: () => {},
    emitControlled: (p, angle) => {
      shots.push({ ...p, angle, tick: c.tick });
      return id++;
    },
    emitHostile: () => {
      throw Error("Owned dispatch shots must bypass generic recapture");
    },
  };
  const d = new AmbulanceRoute();
  return { c, d, hits, shots };
}
function until(
  f: ReturnType<typeof fixture>,
  check: () => boolean,
  max = 3000,
) {
  for (let n = 0; n < max && !check(); n++) {
    f.d.step(f.c);
    f.c.tick++;
  }
  assert(check(), "Dispatch state did not occur");
}
const lane = (f: ReturnType<typeof fixture>) =>
  f.d.cues().find((q): q is AmbulanceLane => q.kind === "ambulance-lane");
test("connected Ambulance patrol paths honor every actual offset map, cover difficulty and lava footprint", () => {
  let cases = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties)
      for (const late of [false, true]) {
        const arena = runtimeArena(map.id, difficulty.id),
          f = fixture();
        Object.assign(f.c, {
          bounds: arena.bounds,
          boss: { ...arena.bossSpawn },
          obstacles: arena.obstacles,
          hazardCircles: arena.lavaPits,
        });
        const path = ambulancePatrol(f.c, 3, late);
        assert(path.length >= 2, map.id + "/" + difficulty.id);
        let length = 0;
        for (let i = 0; i < path.length; i++) {
          const p = path[i],
            b = arena.bounds;
          assert(
            p.x >= b.x + 58 - 0.01 &&
              p.x <= b.x + b.width - 58 + 0.01 &&
              p.y >= b.y + 58 - 0.01 &&
              p.y <= b.y + b.height - 58 + 0.01,
          );
          assert(
            !arena.obstacles.some((o) => segmentRect(p, p, o, 57.9)),
            map.id + " buried node",
          );
          if (i) {
            assert(
              !arena.obstacles.some((o) =>
                segmentRect(path[i - 1], p, o, 57.9),
              ),
              map.id + " disconnected route",
            );
            length += distance(p, path[i - 1]);
          }
        }
        assert(length > 32);
        cases++;
      }
  assert.equal(cases, 72);
});
test("normal early and late dispatches have one/two independently warned headings; advanced forms add distinct stops", () => {
  for (const form of ["normal", "brutal", "crazed"] as const)
    for (const phase of [0, 2]) {
      const f = fixture(form, phase),
        seen = new Map<number, AmbulanceLane>();
      let last = { ...f.c.boss };
      until(f, () => {
        for (const q of f.d.cues())
          if (q.kind === "ambulance-lane") {
            assert(q.at - q.beganAt >= 42);
            seen.set(q.id, q);
          }
        assert(distance(last, f.c.boss) <= 600 / 30 + 0.01);
        last = { ...f.c.boss };
        return f.d.recovering;
      });
      assert.equal(
        seen.size,
        form === "normal"
          ? phase
            ? 2
            : 1
          : 2 + (phase ? 1 : 0) + (form === "crazed" && phase ? 1 : 0),
      );
      for (const q of seen.values()) assert(q.leg <= q.legs);
    }
});
test("a dispatch locks real origin/destination throughout the full warning and cannot hit before release", () => {
  const f = fixture();
  until(f, () => Boolean(lane(f)));
  const q = lane(f)!,
    copy = structuredClone(q),
    origin = { ...f.c.boss };
  f.c.targets[0] = { id: "p", x: 200, y: 600, oldX: 200, oldY: 600 };
  while (f.c.tick < q.at) {
    f.d.step(f.c);
    assert.deepEqual(f.c.boss, origin);
    f.c.tick++;
  }
  assert.deepEqual(lane(f), copy);
  assert.equal(f.hits.length, 0);
});
test("moving Ambulance body and moving survivor use relative swept contact, once per dispatch", () => {
  const f = fixture();
  until(f, () => Boolean(lane(f)));
  const q = lane(f)!;
  f.c.tick = q.at + 2;
  const x = f.c.boss.x,
    y = f.c.boss.y;
  f.c.targets[0] = {
    id: "p",
    oldX: x - 200,
    oldY: y + 6,
    x: x + 200,
    y: y + 6,
  };
  f.d.step(f.c);
  assert.equal(f.hits.length, 1);
  assert.equal(f.hits[0].amount, 18);
  for (let n = 0; n < 5; n++) {
    f.c.tick++;
    Object.assign(f.c.targets[0], {
      x: f.c.boss.x,
      y: f.c.boss.y,
      oldX: f.c.boss.x,
      oldY: f.c.boss.y,
    });
    f.d.step(f.c);
  }
  assert.equal(f.hits.length, 1);
});
test("the first active frame never sweeps player movement that finished before charge activation", () => {
  const f = fixture();
  until(f, () => Boolean(lane(f)));
  const q = lane(f)!;
  f.c.tick = q.at;
  f.c.targets[0] = {
    id: "p",
    oldX: f.c.boss.x - 200,
    oldY: f.c.boss.y,
    x: f.c.boss.x + 200,
    y: f.c.boss.y,
  };
  f.d.step(f.c);
  assert.equal(f.hits.length, 0);
});
test("body-radius rays clip to offset bounds and cover, while new masonry cancels actual travel before it", () => {
  const f = fixture();
  f.c.bounds = { x: 150, y: 60, width: 1200, height: 880 };
  const end = ambulanceRay(f.c, { x: 800, y: 400 }, { x: 2000, y: 400 });
  assert(end.x <= 1292 && end.y === 400);
  f.c.obstacles = [{ x: 1000, y: 100, width: 50, height: 700 }];
  const clipped = ambulanceRay(f.c, { x: 800, y: 400 }, { x: 1300, y: 400 });
  assert(clipped.x < 942);
  const g = fixture();
  until(g, () => Boolean(lane(g)));
  const q = lane(g)!;
  const mid = { x: (q.x1 + q.x2) / 2, y: (q.y1 + q.y2) / 2 };
  g.c.obstacles.push({ x: mid.x - 12, y: mid.y - 12, width: 24, height: 24 });
  until(g, () => !lane(g));
  assert(distance(g.c.boss, mid) >= 58 + 11.9);
  assert(!g.c.obstacles.some((o) => segmentRect(g.c.boss, g.c.boss, o, 57.9)));
});
test("first stop emits exactly40 Brutal or120 Crazed shots with full fresh tells, retained Brutal prefix and crossing repeats", () => {
  const reports = [];
  for (const form of ["brutal", "crazed"] as const) {
    const f = fixture(form);
    until(f, () => f.d.cues().some((q) => q.kind === "ambulance-burst"));
    const cues = f.d.cues().filter((q) => q.kind === "ambulance-burst");
    assert(
      cues.every(
        (q) => q.at - q.beganAt >= Math.ceil(r.burstWarningSeconds * 30),
      ),
    );
    assert.equal(f.shots.length, 0);
    const leg = cues[0].leg;
    until(f, () =>
      f.d.cues().some((q) => q.kind === "ambulance-lane" && q.leg > leg),
    );
    assert.equal(f.shots.length, form === "brutal" ? 40 : 120);
    reports.push(cues);
  }
  for (const q of reports[0]) {
    const found = reports[1].find(
      (c) => c.x === q.x && c.y === q.y && c.at === q.at,
    );
    assert(found);
    assert(q.angles.every((a) => found.angles.includes(a)));
  }
  assert(reports[1].some((q) => q.crossing));
});
test("driver exposure remains a stationary exactly-three-second real recovery window", () => {
  const f = fixture();
  until(f, () => f.d.recovering);
  const q = f.d.cues().find((q) => q.kind === "driver")!;
  assert.equal(q.until - q.beganAt, 90);
  const p = { ...f.c.boss };
  while (f.c.tick < q.until) {
    f.d.step(f.c);
    f.c.tick++;
    assert.deepEqual(f.c.boss, p);
  }
  f.d.step(f.c);
  assert(!f.d.recovering);
  assert(!f.d.cues().some((q) => q.kind === "driver"));
});
test("reset cancels every unreleased owned cue at any stage, preserves already emitted shots and supports a delayed next phase", () => {
  for (const kind of [
    "ambulance-patrol",
    "ambulance-lane",
    "ambulance-burst",
    "driver",
  ]) {
    const f = fixture(kind === "ambulance-burst" ? "brutal" : "normal");
    until(f, () => f.d.cues().some((q) => q.kind === kind));
    const emitted = f.shots.length;
    f.d.reset(f.c.tick + 60);
    assert.equal(f.d.cues().length, 0);
    assert(!f.d.busy);
    f.d.step(f.c);
    assert.equal(f.d.cues().length, 0);
    assert.equal(f.shots.length, emitted);
  }
});
test("phase entry retains the Ambulance route; stagger, victory and deadline clean it up", () => {
  for (const action of ["phase", "stagger", "victory", "deadline"]) {
    const g = createPracticeGame(
      {
        mode: "endless",
        openingBossId: "black-ambulance",
        difficulty: "normal",
      },
      "Mara",
      "soldier",
      "brutal",
    );
    g.start();
    g.players.get("solo")!.invulnerableUntil = 1e9;
    g.step();
    assert(g.bossCues().some((q) => q.kind === "ambulance-patrol"));
    const committed = g.director.cues().filter(q => !("until" in q) || q.until > g.combatTick + 1).map(q => q.id);
    if (action === "phase") g.boss.health = g.boss.maxHealth * 0.49;
    else if (action === "stagger") g.boss.staggerUntil = g.combatTick + 60;
    else if (action === "victory") g.boss.health = 0;
    else g.boss.deadline = g.combatTick + 1;
    g.step();
    if(action === "phase") {
      assert(committed.length);
      assert(committed.every(id => g.director.cues().some(q => q.id === id)));
      continue;
    }
    assert(
      !g
        .bossCues()
        .some((q) => q.kind.startsWith("ambulance-") || q.kind === "driver"),
      action,
    );
  }
});

test("actual Baby/Easy assistance expiry and repeated recovery never deadlock the dedicated dispatch scheduler", () => {
  for (const difficulty of ["baby", "easy", "normal"]) {
    const g = createPracticeGame(
      { mode: "endless", openingBossId: "black-ambulance", difficulty },
      "Mara",
      "soldier",
      "normal",
    );
    g.start();
    g.players.get("solo")!.invulnerableUntil = 1e9;
    g.boss.health = g.boss.maxHealth * 0.49;
    const drivers = new Set<number>();
    for (let i = 0; i < 2400; i++) {
      g.step();
      for (const q of g.bossCues()) if (q.kind === "driver") drivers.add(q.id);
    }
    assert(drivers.size >= 2, difficulty + " repeated driver windows");
  }
});
