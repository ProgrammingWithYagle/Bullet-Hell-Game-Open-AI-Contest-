import test from "node:test";
import assert from "node:assert/strict";
import {
  WidowGates,
  widowLayout,
  widowPallRects,
  ejectClosingGates,
  type WidowGate,
  type WidowPall,
} from "../src/shared/widow-gates.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { runtimeArenas, runtimeArena } from "../src/shared/arena-layouts.ts";
import { data } from "../src/shared/game.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { idleInput, type BossVariant } from "../src/shared/protocol.ts";
import { Prediction } from "../src/client/prediction.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  widowHelp,
  widowPhaseName,
  widowPhaseHint,
} from "../src/client/widow-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { encounterFrame } from "../src/client/encounter-presentation.ts";
const gates = (d: WidowGates) =>
  d.cues().filter((c): c is WidowGate => c.kind === "gate");
function fixture(variant: BossVariant = "normal", phase = 0) {
  const d = new WidowGates(),
    p = { id: "p", x: 800, y: 800, oldX: 800, oldY: 800 },
    hits: { tick: number; amount: number }[] = [],
    shots: { tick: number; x: number; y: number; angle: number }[] = [];
  let serial = 0,
    warnings = 0;
  const c: SignatureContext = {
    tick: 1,
    bossId: "gate-widow",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    aimTargets: [p],
    bounds: { x: 128, y: 80, width: 1344, height: 840 },
    obstacles: [],
    phase,
    variant,
    brutal: variant !== "normal",
    id: () => ++serial,
    damage: (_id, amount) => hits.push({ tick: c.tick, amount }),
    spawnRat: () => {},
    damageScale: 1,
    warn: () => warnings++,
    emitControlled: (point, angle) => {
      shots.push({ tick: c.tick, x: point.x, y: point.y, angle });
      return ++serial;
    },
  };
  const step = () => {
    c.tick++;
    d.step(c);
  };
  d.step(c);
  return { d, p, c, hits, shots, step, warnings: () => warnings };
}
function ready(variant: BossVariant = "normal", phase = 0) {
  const f = fixture(variant, phase);
  for (let n = 0; n < 300 && !gates(f.d).length; n++) f.step();
  assert.equal(gates(f.d).length, 3);
  return f;
}
function until(f: ReturnType<typeof fixture>, check: () => boolean, n = 1600) {
  for (let i = 0; i < n && !check(); i++) f.step();
  assert(check(), "Widow sequence did not reach expected state");
}
function game(variant: BossVariant = "normal", phase = 0) {
  const g = createPracticeGame(
    {
      openingBossId: "gate-widow",
      openingArenaId: "gatehouse",
      difficulty: "normal",
      mode: "endless",
      seed: 491,
    },
    "Mara",
    "soldier",
    variant,
  );
  g.start();
  g.boss.deadline = 1e9;
  g.players.get("solo")!.invulnerableUntil = 1e9;
  if (phase) g.boss.health = g.boss.maxHealth * 0.49;
  return g;
}
test("each actual map and cover difficulty provides both gate orientations and a real clear open crossing", () => {
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties)
      for (const axis of ["horizontal", "vertical"] as const)
        for (let lane = 0; lane < 3; lane++) {
          const a = runtimeArena(map.id, difficulty.id),
            f = fixture();
          Object.assign(f.c, {
            boss: { ...a.bossSpawn },
            obstacles: a.obstacles,
            bounds: a.bounds,
            hazardCircles: a.lavaPits,
            targets: [
              {
                id: "p",
                ...a.playerSpawn,
                oldX: a.playerSpawn.x,
                oldY: a.playerSpawn.y,
              },
            ],
          });
          delete f.c.aimTargets;
          const l = widowLayout(f.c, axis, lane);
          assert(l, [map.id, difficulty.id, axis, lane].join("/"));
          assert(l.passageWidth >= 128);
          assert(
            !a.obstacles.some((o) => segmentRect(l.passage, l.passage, o, 22)),
          );
          assert(
            l.gates.every(
              (r) =>
                r.x >= a.bounds.x &&
                r.y >= a.bounds.y &&
                r.x + r.width <= a.bounds.x + a.bounds.width + 0.001 &&
                r.y + r.height <= a.bounds.y + a.bounds.height + 0.001,
            ),
          );
        }
});
test("first phase locks one horizontal set, warns completely and never closes more than two lanes", () => {
  const f = ready(),
    q = gates(f.d)[0],
    locked = structuredClone(gates(f.d));
  assert.equal(q.axis, "horizontal");
  assert.equal(q.legs, 1);
  assert.equal(q.at - f.c.tick, 45);
  assert.equal(f.warnings(), 1);
  assert.equal(f.d.solids(f.c.tick).length, 0);
  f.p.x = 200;
  f.p.y = 850;
  until(f, () => f.c.tick === q.at - 1);
  assert.deepEqual(gates(f.d), locked);
  assert.equal(f.hits.length, 0);
  f.step();
  assert.equal(f.d.solids(f.c.tick).length, 2);
});
test("the moving floor pall actually damages closed tracks once and leaves the entire open lane clear", () => {
  const f = ready(),
    pall = f.d.cues().find((c): c is WidowPall => c.kind === "widow-pall")!,
    open = gates(f.d).find((q) => q.open)!;
  assert.equal(pall.at - gates(f.d)[0].at, 18);
  f.p.x = open.x + open.width / 2;
  f.p.y = pall.to;
  f.p.oldX = f.p.x;
  f.p.oldY = f.p.y;
  until(f, () => f.c.tick === pall.until);
  assert.equal(f.hits.length, 0);
  const h = ready(),
    wave = h.d.cues().find((c): c is WidowPall => c.kind === "widow-pall")!,
    r = widowPallRects(wave, wave.at + 15)[0];
  Object.assign(h.p, {
    x: r.x + r.width / 2,
    y: r.y + r.height / 2,
    oldX: r.x + r.width / 2,
    oldY: r.y + r.height / 2,
  });
  until(h, () => h.c.tick === wave.until);
  assert.equal(h.hits.filter((x) => x.amount === 14).length, 1);
});
test("floor sweep contact matches relative player/bar movement and does not hit movement that ended before activation", () => {
  const f = ready(),
    q = f.d.cues().find((c): c is WidowPall => c.kind === "widow-pall")!;
  until(f, () => f.c.tick === q.at - 1);
  const r = widowPallRects(q, q.at)[0];
  Object.assign(f.p, {
    oldX: r.x + r.width / 2,
    oldY: r.y + r.height / 2,
    x: r.x + r.width / 2,
    y: r.y + 100,
  });
  f.step();
  assert.equal(f.hits.length, 0);
  Object.assign(f.p, {
    oldX: r.x + r.width / 2,
    oldY: r.y - 80,
    x: r.x + r.width / 2,
    y: r.y + 80,
  });
  f.step();
  assert.equal(f.hits.length, 1);
});
test("late phase physically moves only after its tell then gives serial vertical and horizontal gates full fresh warnings", () => {
  const f = fixture("normal", 1),
    walk = f.d.cues().find((c) => c.kind === "widow-walk")!;
  assert.equal(walk.kind, "widow-walk");
  const start = { ...f.c.boss };
  until(f, () => f.c.tick === walk.moveAt - 1);
  assert.deepEqual(f.c.boss, start);
  until(f, () => gates(f.d).length === 3);
  assert(distance(start, f.c.boss) > 60);
  const first = gates(f.d)[0];
  assert.equal(first.axis, "vertical");
  assert.equal(first.leg, 1);
  assert.equal(first.at - f.c.tick, 45);
  until(f, () => gates(f.d).some((g) => g.leg === 2));
  const next = gates(f.d)[0];
  assert.equal(next.axis, "horizontal");
  assert(next.beganAt > first.until);
  assert.equal(next.at - next.beganAt, 45);
  assert.equal(gates(f.d).length, 3);
});
test("Brutal owns a 30-shot first-gate budget and Crazed keeps it with a 90-shot budget and later crossing tells", () => {
  for (const [form, total] of [
    ["brutal", 30],
    ["crazed", 90],
  ] as const) {
    const f = ready(form),
      first = gates(f.d)[0],
      needles = f.d.cues().filter((c) => c.kind === "widow-needles");
    assert.equal(
      needles.reduce((sum, n) => sum + n.angles.length, 0),
      total,
    );
    assert(needles.every((n) => n.at - n.beganAt >= 40));
    assert.equal(
      needles.some((n) => n.crossing),
      form === "crazed",
    );
    until(f, () => f.c.tick === first.until);
    assert.equal(f.shots.length, total);
  }
  const b = ready("brutal"),
    c = ready("crazed");
  for (const q of b.d.cues().filter((q) => q.kind === "widow-needles")) {
    const match = c.d
      .cues()
      .find(
        (n) =>
          n.kind === "widow-needles" &&
          n.x === q.x &&
          n.y === q.y &&
          n.at === q.at,
      );
    assert(match?.kind === "widow-needles");
    assert(q.angles.every((a) => match.angles.includes(a)));
  }
  assert.equal(gates(c.d)[0].legs, 2);
  assert.equal(gates(ready("crazed", 1).d)[0].legs, 3);
});
test("gate ejection uses each orientation and never teleports through fixed masonry or a lava pit", () => {
  const horizontal = { x: 100, y: 400, width: 500, height: 48 },
    vertical = { x: 400, y: 100, width: 48, height: 500 };
  const a = ejectClosingGates({ x: 250, y: 424 }, [horizontal], 9);
  assert(a.y < 391 || a.y > 457);
  assert.equal(a.x, 250);
  const z = ejectClosingGates({ x: 424, y: 250 }, [vertical], 9);
  assert(z.x < 391 || z.x > 457);
  assert.equal(z.y, 250);
  const fixed = [{ x: 100, y: 455, width: 500, height: 60 }],
    q = ejectClosingGates({ x: 250, y: 424 }, [horizontal], 9, fixed);
  assert(q.y < 391);
  assert(!fixed.some((r) => segmentRect({ x: 250, y: 424 }, q, r, 9)));
  const lava = [{ x: 250, y: 457, radius: 20 }],
    p = ejectClosingGates({ x: 250, y: 424 }, [horizontal], 9, [], lava);
  assert(p.y < 391);
});
test("reset cancels all unreleased needles, pall and solids; recovery admits retained auxiliary casts", () => {
  const f = ready("crazed");
  f.d.reset(f.c.tick + 60);
  assert.equal(f.d.cues().length, 0);
  for (let i = 0; i < 40; i++) f.step();
  assert.equal(f.shots.length, 0);
  assert.equal(f.d.cues().length, 0);
  const g = ready();
  until(g, () => !g.d.busy);
  assert(g.d.nextSignatureAt > g.c.tick);
  assert.equal(g.d.cues().length, 0);
});
test("actual authoritative movement and local prediction agree across both gate orientations", () => {
  for (const phase of [0, 1]) {
    const g = game("normal", phase);
    for (
      let n = 0;
      n < 800 && !g.director.civic.solids(g.combatTick).length;
      n++
    )
      g.step();
    const solid = g.director.civic.solids(g.combatTick)[0];
    assert(solid);
    const p = g.players.get("solo")!;
    if (solid.width > solid.height) {
      p.x = solid.x + solid.width / 2;
      p.y = solid.y - 40;
    } else {
      p.x = solid.x - 40;
      p.y = solid.y + solid.height / 2;
    }
    p.oldX = p.x;
    p.oldY = p.y;
    const prediction = new Prediction();
    prediction.acknowledge(viewOf(g, p.id), p.id);
    for (let sequence = 1; sequence <= 15; sequence++) {
      const input = {
        ...idleInput(),
        sequence,
        moveX: solid.width < solid.height ? 1 : 0,
        moveY: solid.width > solid.height ? 1 : 0,
      };
      prediction.submit(input, viewOf(g, p.id));
      g.submitInput(p.id, input);
      g.step();
      assert(distance(prediction.player!, p) < 1e-6);
    }
  }
});
test("actual Game cleanup removes gates and owned warnings on phase, stagger, defeat and victory", () => {
  for (const end of ["phase", "stagger", "timeout", "wipe", "victory"]) {
    const g = game("crazed");
    g.step();
    assert(g.director.civic.widow.cues().length);
    if (end === "phase") g.boss.health = g.boss.maxHealth * 0.49;
    if (end === "stagger") g.boss.staggerUntil = g.combatTick + 90;
    if (end === "timeout") g.boss.deadline = g.combatTick + 1;
    if (end === "wipe") g.players.get("solo")!.status = "eliminated";
    if (end === "victory") g.boss.health = 0;
    g.step();
    assert.equal(g.director.civic.widow.cues().length, 0, end);
  }
});
test("fifteen guides route the two phase names, advanced mechanics and existing casting poses without inventing walking art", () => {
  const g = game();
  g.step();
  const gate = gates(g.director.civic.widow)[0];
  assert.equal(encounterFrame(g.boss, gate.at - 2, g.director.cues()), 3);
  assert.equal(encounterFrame(g.boss, gate.at, g.director.cues(), true), 0);
  for (const l of data.locales) {
    assert(widowPhaseName(0, l.id));
    assert.notEqual(widowPhaseName(0, l.id), widowPhaseName(1, l.id));
    assert.notEqual(
      widowPhaseHint(0, "normal", l.id),
      widowPhaseHint(1, "normal", l.id),
    );
    assert.notEqual(widowHelp("brutal", l.id), widowHelp("crazed", l.id));
    assert.equal(
      signatureHelp(viewOf(g, "solo"), l.id),
      widowHelp("normal", l.id),
    );
  }
});
