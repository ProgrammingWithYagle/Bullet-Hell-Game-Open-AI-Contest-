import test from "node:test";
import assert from "node:assert/strict";
import {
  MoldMixing,
  moldRules,
  moldRoad,
  moldWalls,
  moldMovement,
  moldGasContact,
  moldCoolant,
  type MoldCue,
  type MoldGas,
  type MoldPool,
} from "../src/shared/mold-mixing.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { moldFrame } from "../src/client/mold-presentation.ts";
import { serviceMovement } from "../src/shared/service-director.ts";
import { Prediction } from "../src/client/prediction.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
function fixture(
  variant: "normal" | "brutal" | "crazed" = "normal",
  phase = 0,
) {
  const d = new MoldMixing();
  let serial = 0,
    emissions = 0;
  const hurt: { id: string; amount: number; at: number }[] = [];
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
    damage: (id, amount) => hurt.push({ id, amount, at: c.tick }),
    spawnRat: () => {},
    emitControlled: () => {
      emissions++;
      return ++serial;
    },
  };
  const step = (tick = c.tick + 1) => {
      c.tick = tick;
      d.step(c);
    },
    run = (end: number) => {
      while (c.tick < end) step();
    };
  return { d, c, hurt, step, run, emissions: () => emissions };
}
type F = ReturnType<typeof fixture>;
function of<K extends MoldCue["kind"]>(f: F, kind: K) {
  return f.d
    .cues()
    .filter((q): q is Extract<MoldCue, { kind: K }> => q.kind === kind);
}
function until(f: F, check: () => boolean, max = 2500) {
  for (let i = 0; i < max && !check(); i++) f.step();
  assert(check(), "Expected chemistry stage was not reached");
}
function move(f: F, x: number, y: number) {
  for (const p of f.c.targets) {
    p.oldX = x;
    p.oldY = y;
    p.x = x;
    p.y = y;
  }
}
function neutralize(f: F) {
  f.step();
  const acid = of(f, "mold-flask").find((q) => q.reagent === "acid")!;
  assert(acid);
  f.run(acid.at);
  assert(of(f, "mold-pool").some((q) => q.reagent === "acid"));
  move(f, acid.x + 100, acid.y);
  until(f, () => of(f, "mold-flask").some((q) => q.reagent === "alkali"));
  const base = of(f, "mold-flask").find((q) => q.reagent === "alkali")!;
  f.run(base.at);
  const water = of(f, "mold-pool").find((q) => q.reagent === "water");
  assert(water);
  return { acid, base, water };
}
test("all 144 actual map/difficulty/phase roads remain connected, body-clear and inside actual offset bounds and lava footprints", () => {
  let checked = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties) {
      const g = createPracticeGame(
        {
          mode: "endless",
          openingBossId: "alchemist",
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
        const path = moldRoad(c, c.targets[0], phase),
          walls = moldWalls(c);
        assert(path.length > 1);
        let length = 0;
        for (let n = 0; n < path.length; n++) {
          assert.deepEqual(Object.keys(path[n]).sort(), ["x", "y"]);
          if (n) {
            length += distance(path[n - 1], path[n]);
            assert(
              walls.every(
                (o) => segmentRect(path[n - 1], path[n], o, c.radius) === null,
              ),
            );
          }
        }
        assert(
          length >= moldRules.minimumWalk - 1 &&
            length <= moldRules.maximumWalk + 1,
        );
        checked++;
      }
    }
  assert.equal(checked, 144);
});
test("flasks lock survivor landings with a full warning and start away from the boss while walking has real bounded movement and drawn gait frames", () => {
  const f = fixture();
  Object.assign(f.c.boss, { id: "alchemist", health: 900 });
  f.step();
  const flask = of(f, "mold-flask")[0],
    walk = of(f, "mold-walk")[0];
  assert(flask && walk);
  assert.equal(flask.at - flask.beganAt, 42);
  assert(distance(flask, f.c.boss) > 300);
  const locked = structuredClone(flask),
    frames = new Set<number>();
  move(f, 1200, 850);
  const start = { ...f.c.boss };
  f.run(walk.at - 1);
  assert.equal(distance(f.c.boss, start), 0);
  while (of(f, "mold-walk").length) {
    const old = { ...f.c.boss };
    f.step();
    assert(distance(old, f.c.boss) <= walk.speed / 30 + 0.001);
    const frame = moldFrame(f.d.cues(), f.c.tick);
    if (frame >= 8) frames.add(frame);
    const q = of(f, "mold-flask").find((q) => q.id === flask.id);
    if (q) assert.deepEqual(q, locked);
  }
  assert.equal(frames.size, 8);
  assert(distance(f.c.boss, start) > 100);
  assert.equal(f.emissions(), 0);
});
test("opposite aimed reagents neutralize into real coolant, remove damage/slow, and do not require walking into the dangerous pool", () => {
  const f = fixture(),
    { acid, water } = neutralize(f);
  assert.equal(distance(water, acid), 100);
  assert(water.radius >= 78);
  assert(!of(f, "mold-pool").some((q) => q.id === acid.id));
  assert.equal(moldMovement(f.d.cues(), water, f.c.tick), 1);
  assert(moldCoolant(of(f, "mold-pool"), water, f.c.tick));
  const before = f.hurt.length;
  f.run(f.c.tick + 12);
  assert.equal(f.hurt.length, before);
});
test("a harmful pool ignores pre-landing motion, sweeps later movement, and shares one floor hit per half-second across overlapping reagents", () => {
  const f = fixture();
  f.step();
  const flask = of(f, "mold-flask")[0];
  f.run(flask.at - 1);
  move(f, flask.x + 250, flask.y);
  f.c.targets[0].oldX = flask.x;
  f.step(flask.at);
  assert.equal(f.hurt.length, 0);
  const p = f.c.targets[0];
  p.oldX = flask.x + 250;
  p.x = flask.x - 250;
  f.step();
  assert.equal(f.hurt.length, 1);
  assert.equal(f.hurt[0].amount, 10);
  move(f, flask.x, flask.y);
  f.run(f.c.tick + 10);
  assert.equal(f.hurt.length, 1);
  assert.equal(moldMovement(f.d.cues(), p, f.c.tick), 0.65);
});
test("distillation warns a real full-field vapor bank; coolant protects its whole-body footprint and the bank continues around it", () => {
  const f = fixture("normal", 1),
    { water } = neutralize(f);
  until(f, () => of(f, "mold-gas").length > 0);
  const gas = of(f, "mold-gas")[0];
  assert.equal(gas.at - gas.beganAt, 60);
  assert.equal(gas.count, 1);
  const point = { x: water.x, y: water.y };
  let witnessed = false;
  while (f.c.tick < gas.until) {
    f.step();
    const current = of(f, "mold-gas")[0];
    if (!current || f.c.tick < current.at) continue;
    if (moldGasContact(point, point, current, [], f.c.tick)) {
      assert(!moldGasContact(point, point, current, [water], f.c.tick));
      witnessed = true;
      break;
    }
  }
  assert(witnessed);
  assert.equal(f.hurt.filter((h) => h.at >= water.at).length, 0);
});
test("vapor relative sweeps catch crossing players, respect finite tangent bounds and only exempt the actual inset coolant footprint", () => {
  const q: MoldGas = {
    kind: "mold-gas",
    id: 1,
    x: 0,
    y: 0,
    width: 1600,
    height: 1000,
    axis: "x",
    head: 200,
    oldHead: 100,
    start: 0,
    end: 1600,
    bankWidth: 70,
    speed: 250,
    index: 1,
    count: 1,
    beganAt: 0,
    at: 60,
    until: 500,
  };
  const water: MoldPool = {
    kind: "mold-pool",
    id: 2,
    x: 150,
    y: 700,
    radius: 140,
    reagent: "water",
    index: 0,
    beganAt: 0,
    at: 0,
    until: 500,
    spentAt: 0,
  };
  assert(moldGasContact({ x: 300, y: 700 }, { x: 50, y: 700 }, q, [], 70));
  assert(
    !moldGasContact({ x: 150, y: 700 }, { x: 150, y: 700 }, q, [water], 70),
  );
  assert(!moldGasContact({ x: 150, y: 1300 }, { x: 150, y: 1300 }, q, [], 70));
  assert(!moldCoolant([water], { x: water.x + 139, y: water.y }, 70));
  assert(
    moldGasContact(
      { x: water.x, y: water.y + 139 },
      { x: water.x, y: water.y + 139 },
      q,
      [water],
      70,
    ),
  );
});
test("thermal-runaway vessels are immediately visible, coolant actually defuses them, and ignored vessels receive a separate rupture warning and one burst", () => {
  const f = fixture("normal", 2),
    { water } = neutralize(f);
  const cooled = of(f, "mold-reactor")[0];
  assert.equal(cooled.state, "cooled");
  assert.equal(cooled.cooledAt, water.at);
  f.run(cooled.burstAt + 5);
  assert.equal(f.hurt.filter((h) => h.amount === 18).length, 0);
  const uncooled = fixture("normal", 2);
  uncooled.step();
  const vessel = of(uncooled, "mold-reactor")[0];
  assert(vessel);
  move(uncooled, 1300, 850);
  uncooled.run(vessel.ruptureAt);
  assert.equal(of(uncooled, "mold-reactor")[0].state, "rupture");
  assert.equal(vessel.burstAt - vessel.ruptureAt, 45);
  move(uncooled, vessel.x, vessel.y);
  uncooled.run(vessel.burstAt + 8);
  assert.equal(uncooled.hurt.filter((h) => h.amount === 18).length, 1);
});
test("Brutal creates matching-reagent coupling with an achievable neutralization window, and cooling either endpoint cancels both pending eruptions", () => {
  const f = fixture("brutal");
  f.step();
  const flask = of(f, "mold-flask")[0];
  f.run(flask.at);
  const reactions = of(f, "mold-reaction");
  assert.equal(reactions.length, 2);
  assert(
    reactions.every((q) => q.type === "coupled" && q.at - q.beganAt >= 78),
  );
  const ids = [...reactions[0].sources];
  move(f, flask.x + 100, flask.y);
  until(f, () => of(f, "mold-flask").some((q) => q.reagent === "alkali"));
  const base = of(f, "mold-flask").find((q) => q.reagent === "alkali")!;
  assert(base.at < reactions[0].at);
  f.run(base.at);
  assert(of(f, "mold-pool").some((q) => q.reagent === "water"));
  assert(
    !of(f, "mold-reaction").some((q) =>
      q.sources.some((id) => ids.includes(id)),
    ),
  );
  f.run(reactions[1].at);
  assert.equal(f.hurt.filter((h) => h.amount === 18).length, 0);
  assert.equal(f.emissions(), 0);
});
test("Ossuary Baby cover cannot isolate the primary pressure vessel from actual acid/alkali neutralization", () => {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "alchemist",
      openingArenaId: "ossuary-works",
      difficulty: "baby",
      seed: 491,
    },
    "Mara",
    "soldier",
  );
  g.start();
  g.players.get("solo")!.invulnerableUntil = 1e9;
  g.boss.health = g.boss.maxHealth * 0.39;
  let cooled = false,
    sawVessel = false,
    sawWater = false;
  for (let i = 0; i < 1200 && !cooled; i++) {
    g.step();
    const cues = g.director.services.alchemist.cues();
    sawVessel ||= cues.some((q) => q.kind === "mold-reactor");
    sawWater ||= cues.some(
      (q) => q.kind === "mold-pool" && q.reagent === "water",
    );
    cooled = cues.some(
      (q) => q.kind === "mold-reactor" && q.state === "cooled",
    );
  }
  assert(
    sawVessel && sawWater && cooled,
    "The real cover-constrained reaction must cool its actual primary vessel",
  );
});
test("an uncanceled coupled eruption waits for its own full warning and deals one timed blast, not repeated contact damage", () => {
  const f = fixture("brutal");
  f.step();
  const flask = of(f, "mold-flask")[0];
  f.run(flask.at);
  const reaction = of(f, "mold-reaction")[0];
  move(f, 1300, 850);
  until(f, () => of(f, "mold-flask").some((q) => q.reagent === "alkali"));
  move(f, reaction.x, reaction.y);
  f.run(reaction.at - 1);
  assert.equal(f.hurt.filter((h) => h.amount === 18).length, 0);
  f.run(reaction.at + 5);
  assert.equal(f.hurt.filter((h) => h.amount === 18).length, 1);
});
test("Crazed adds a real catalyst interaction: coolant is spent to quench it, while unmixed reagents produce a freshly warned catalytic eruption", () => {
  const quenched = fixture("crazed"),
    { water } = neutralize(quenched);
  until(quenched, () =>
    of(quenched, "mold-flask").some((q) => q.reagent === "catalyst"),
  );
  const catalyst = of(quenched, "mold-flask").find(
    (q) => q.reagent === "catalyst",
  )!;
  quenched.run(catalyst.at);
  const spent = of(quenched, "mold-pool").find((q) => q.id === water.id)!;
  assert.equal(spent.spentAt, catalyst.at);
  assert(spent.until <= catalyst.at + 27);
  assert(!of(quenched, "mold-reaction").some((q) => q.type === "catalytic"));
  const erupt = fixture("crazed");
  neutralize(erupt);
  const reagent = of(erupt, "mold-pool").find((q) => q.reagent !== "water")!;
  assert(reagent);
  move(erupt, reagent.x, reagent.y);
  until(erupt, () =>
    of(erupt, "mold-flask").some((q) => q.reagent === "catalyst"),
  );
  const hit = of(erupt, "mold-flask").find((q) => q.reagent === "catalyst")!;
  erupt.run(hit.at);
  const reaction = of(erupt, "mold-reaction").find(
    (q) => q.type === "catalytic",
  );
  assert(reaction);
  assert.equal(reaction.at - reaction.beganAt, 45);
  assert.equal(erupt.emissions(), 0);
});
test("advanced Fractionation adds a second perpendicular vapor bank with its own fresh warning and distinct one/two/three pressure vessels", () => {
  for (const [variant, count] of [
    ["normal", 1],
    ["brutal", 2],
    ["crazed", 3],
  ] as const) {
    const f = fixture(variant, variant === "normal" ? 2 : 3);
    f.step();
    assert.equal(of(f, "mold-reactor").length, count);
    if (variant === "normal") continue;
    until(f, () => of(f, "mold-gas").length > 0);
    const first = of(f, "mold-gas")[0];
    assert.equal(first.count, 2);
    f.run(first.until);
    const second = of(f, "mold-gas")[0];
    assert(second && second.id !== first.id);
    assert.notEqual(second.axis, first.axis);
    assert.equal(second.at - second.beganAt, 60);
    assert.equal(second.index, 2);
    assert.equal(f.emissions(), 0);
  }
});
test("snapshot geometry is detached and numeric with rich actor data; pause, phase and explicit reset cancel all chemistry and retained contact state", () => {
  const f = fixture("crazed", 3);
  Object.assign(f.c.boss, { id: "alchemist", health: 999 });
  f.step();
  const held = f.d.cues();
  assert(held.every((q) => Number.isSafeInteger(q.id)));
  const walk = held.find((q) => q.kind === "mold-walk");
  assert(walk && walk.kind === "mold-walk");
  walk.path[0].x = -999;
  assert.notEqual(of(f, "mold-walk")[0].path[0].x, -999);
  f.c.paused = true;
  f.step();
  assert.deepEqual(f.d.cues(), []);
  f.c.paused = false;
  f.run(f.c.tick + 23);
  assert.deepEqual(f.d.cues(), []);
  f.step();
  assert(f.d.cues().length);
  f.c.phase = 0;
  f.step();
  assert.deepEqual(f.d.cues(), []);
  const end = f.c.tick + 90;
  f.d.reset(end);
  f.run(end - 1);
  assert.deepEqual(f.d.cues(), []);
  f.run(end);
  assert(f.d.cues().length);
});
test("new cover interrupts a procession safely without canceling the independently warned reagent throws", () => {
  const f = fixture();
  f.step();
  const walk = of(f, "mold-walk")[0],
    flask = of(f, "mold-flask")[0],
    next = walk.path[1];
  f.c.obstacles.push({
    x: next.x - 50,
    y: next.y - 50,
    width: 100,
    height: 100,
  });
  const before = { ...f.c.boss };
  f.run(walk.at);
  assert.equal(distance(f.c.boss, before), 0);
  assert.equal(of(f, "mold-walk").length, 0);
  assert(of(f, "mold-flask").some((q) => q.id === flask.id));
  f.run(flask.at);
  assert(of(f, "mold-pool").some((q) => q.reagent === "acid"));
});
test("actual authority and local Prediction agree on reagent slow, coolant and expiration without adding vapor movement forces", () => {
  const f = fixture(),
    { water } = neutralize(f);
  assert.equal(serviceMovement(f.d.cues(), water, "a", f.c.tick).multiplier, 1);
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "alchemist",
      openingArenaId: "triage-yard",
      difficulty: "normal",
    },
    "Mara",
    "soldier",
  );
  g.start();
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  let pool: MoldPool | undefined;
  for (let i = 0; i < 250 && !pool; i++) {
    g.step();
    pool = g.director.services.alchemist
      .cues()
      .find(
        (q): q is MoldPool => q.kind === "mold-pool" && q.reagent === "acid",
      );
  }
  assert(pool);
  p.x = pool.x;
  p.y = pool.y;
  const prediction = new Prediction();
  prediction.acknowledge(viewOf(g, "solo"), "solo");
  for (let i = 1; i <= 120; i++) {
    const input = { ...idleInput(), sequence: i, moveX: 1, moveY: 0.2 };
    prediction.submit(input, viewOf(g, "solo"));
    g.submitInput("solo", input);
    g.step();
    assert(Math.abs(prediction.player!.x - p.x) < 1e-6);
    assert(Math.abs(prediction.player!.y - p.y) < 1e-6);
  }
  assert.equal(moldMovement([pool], pool, pool.until), 1);
});
test("actual Game uses distinct chemistry phases with zero generic hostile projectiles or common Crazed pressure, and cleans owned work on stagger and exit", () => {
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const g = createPracticeGame(
      { mode: "endless", openingBossId: "alchemist", difficulty: "normal" },
      "Mara",
      "soldier",
      form,
    );
    g.start();
    g.players.get("solo")!.invulnerableUntil = 1e9;
    for (let i = 0; i < 240; i++) {
      g.step();
      assert.equal(
        [...g.shots.values()].filter((q) => q.owner === "hostile").length,
        0,
      );
      assert(g.bossCues().every((q) => q.kind.startsWith("mold-")));
    }
    g.boss.staggerUntil = g.combatTick + 30;
    g.step();
    assert.deepEqual(g.director.services.alchemist.cues(), []);
    g.boss.health = 0;
    g.step();
    assert.deepEqual(g.director.services.alchemist.cues(), []);
  }
});
