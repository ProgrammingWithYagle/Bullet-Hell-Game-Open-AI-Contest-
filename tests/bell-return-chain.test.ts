import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  BellReturnChain,
  bellChainRules,
  bellChainStage,
  bellChainPosition,
  bellChainContact,
  type BellChain,
} from "../src/shared/bell-return-chain.ts";
import {
  BellCarillon,
  bellRules,
  bellWalls,
  type BellCue,
} from "../src/shared/bell-carillon.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { HZ, idleInput } from "../src/shared/protocol.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import {
  encounterPhases,
  bossPatternPhase,
} from "../src/shared/encounter-policy.ts";
import { drawBellCue } from "../src/client/bell-cues.ts";
import { bellFrame, isBellCue } from "../src/client/bell-presentation.ts";
import { viewOf } from "../src/shared/view.ts";

function fixture(form: "normal" | "brutal" | "crazed" = "brutal") {
  const d = new BellReturnChain();
  let serial = 0;
  const hurt: { id: string; amount: number; at: number }[] = [],
    sounds: { id: string; at: number }[] = [],
    warnings: number[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "bellringer",
    boss: { x: 100, y: 100 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1000, height: 800 },
    obstacles: [],
    targets: [{ id: "p", x: 400, y: 100, oldX: 400, oldY: 100 }],
    phase: 0,
    brutal: form !== "normal",
    variant: form,
    damageScale: 2,
    id: () => ++serial,
    damage: (id, amount) => hurt.push({ id, amount, at: c.tick }),
    spawnRat: () => {},
    warn: () => warnings.push(c.tick),
    cueSound: (id) => sounds.push({ id, at: c.tick }),
  };
  const start = () => d.start(c, c.boss, c.targets[0], bellWalls(c));
  const step = (at = c.tick + 1) => {
    c.tick = at;
    d.step(c);
  };
  const run = (end: number) => {
    while (c.tick < end) step();
  };
  const move = (x: number, y: number, oldX = x, oldY = y) =>
    Object.assign(c.targets[0], { x, y, oldX, oldY });
  return { d, c, hurt, sounds, warnings, start, step, run, move };
}
const head = (f: ReturnType<typeof fixture>) => {
  const q = f.d.cues()[0];
  assert(q);
  return q;
};

test("only advanced forms throw one finite physical clapper, with two complete warnings and fixed source/target/timeline", () => {
  const normal = fixture("normal");
  assert.equal(normal.start(), false);
  assert.deepEqual(normal.d.cues(), []);
  for (const form of ["brutal", "crazed"] as const) {
    const f = fixture(form);
    assert(f.start());
    assert.equal(f.d.cues().length, 1);
    const q = head(f);
    assert.equal(
      q.at - q.beganAt,
      Math.ceil(bellChainRules.warningSeconds * HZ),
    );
    assert.equal(
      q.returnAt - q.returnWarnAt,
      Math.ceil(bellChainRules.returnWarningSeconds * HZ),
    );
    assert.equal(q.maxHealth, form === "crazed" ? 65 : 45);
    assert(q.until > q.returnAt && q.returnAt > q.outwardEndAt);
    assert.equal(f.start(), false);
    const issued = {
      originX: q.originX,
      originY: q.originY,
      endX: q.endX,
      endY: q.endY,
      at: q.at,
      returnAt: q.returnAt,
      until: q.until,
      damage: q.damage,
    };
    f.c.boss.x = 700;
    f.c.boss.y = 600;
    f.c.phase = 3;
    f.c.damageScale = 99;
    f.move(900, 700);
    for (let tick = 1; tick < q.returnAt; tick++) {
      f.step();
      const actual = head(f);
      assert.deepEqual(
        Object.fromEntries(
          Object.keys(issued).map((k) => [k, Reflect.get(actual, k)]),
        ),
        issued,
      );
    }
    const copy = head(f);
    copy.endX = -999;
    assert.notEqual(head(f).endX, -999);
    assert.deepEqual(f.c.boss, { x: 700, y: 600 });
  }
});

test("outbound tell is harmless, first activation ignores past player motion, and later relative sweeps hit once per leg", () => {
  const f = fixture();
  assert(f.start());
  const q = head(f);
  f.move(q.originX, q.originY);
  f.run(q.at - 1);
  assert.equal(f.hurt.length, 0);
  f.move(q.originX + 100, q.originY, q.originX - 100, q.originY);
  f.step();
  assert.equal(f.hurt.length, 0);
  f.move(q.originX - 100, q.originY, q.originX + 100, q.originY);
  f.step();
  assert.equal(f.hurt.length, 1);
  assert.equal(f.hurt[0].amount, bellChainRules.damage * 2);
  while (f.c.tick < q.outwardEndAt) {
    const p = bellChainPosition(head(f), f.c.tick + 1);
    f.move(p.x, p.y);
    f.step();
  }
  assert.equal(f.hurt.length, 1);
  f.move(q.endX, q.endY);
  f.run(q.returnAt - 1);
  assert.equal(f.hurt.length, 1);
  f.step();
  assert.equal(f.hurt.length, 2);
  while (f.d.busy) {
    const live = f.d.cues()[0];
    if (live) {
      const p = bellChainPosition(live, f.c.tick + 1);
      f.move(p.x, p.y);
    }
    f.step();
  }
  assert.equal(f.hurt.length, 2);
  assert.deepEqual(f.d.cues(), []);
  assert.equal(Reflect.get(f.d, "touched").size, 0);
});

test("the outbound landing segment still damages at its warned endpoint before the harmless settling interval", () => {
  const f = fixture();
  assert(f.start());
  const q = head(f);
  f.move(850, 700);
  f.run(q.outwardEndAt - 1);
  f.move(q.endX + q.radius + 8, q.endY);
  f.step();
  assert.equal(f.hurt.length, 1);
  assert.equal(head(f).state, "outbound");
  f.step();
  assert.equal(head(f).state, "settle");
  assert.equal(f.hurt.length, 1);
});

test("crossing the thin tether behind or ahead of the travelling head is safe; only its actual swept body hits", () => {
  const f = fixture();
  assert(f.start());
  const q = head(f);
  f.move(850, 700);
  f.run(q.at + 20);
  let h = head(f);
  f.move(h.x - 90, h.y - 100, h.x - 90, h.y + 100);
  f.step();
  assert.equal(f.hurt.length, 0);
  h = head(f);
  f.move(h.x + 90, h.y - 100, h.x + 90, h.y + 100);
  f.step();
  assert.equal(f.hurt.length, 0);
  h = head(f);
  f.move(h.x, h.y - 100, h.x, h.y + 100);
  f.step();
  assert.equal(f.hurt.length, 1);
});

test("only the landed return-warning window exposes a real weak point; breaking it cancels the return and fades without delayed damage", () => {
  const f = fixture("crazed");
  assert(f.start());
  const q = head(f);
  f.move(850, 700);
  assert.equal(f.d.hit(q.id, 999, 0), 0);
  assert.deepEqual(f.d.weakPoints(), []);
  f.run(q.returnWarnAt - 1);
  assert.equal(f.d.hit(q.id, 999, f.c.tick), 0);
  f.step();
  assert.equal(f.d.weakPoints().length, 1);
  assert.equal(f.d.hit(q.id, 20, f.c.tick), 20);
  assert.equal(head(f).health, 45);
  assert.equal(f.d.hit(q.id, NaN, f.c.tick), 0);
  assert.equal(f.d.hit(q.id, Infinity, f.c.tick), 0);
  assert.equal(f.d.hit(q.id, -10, f.c.tick), 0);
  assert.equal(f.d.hit(q.id + 999, 999, f.c.tick), 0);
  assert.equal(f.d.hit(q.id, 100, f.c.tick), 45);
  assert.equal(head(f).state, "broken");
  assert.equal(head(f).health, 0);
  assert.deepEqual(f.d.weakPoints(), []);
  assert.equal(
    head(f).until,
    f.c.tick + Math.ceil(bellChainRules.brokenFadeSeconds * HZ),
  );
  f.run(q.until + 20);
  assert.equal(f.hurt.length, 0);
  assert.deepEqual(f.d.cues(), []);
  assert.deepEqual(
    f.sounds.map((q) => q.id),
    ["bell-clapper"],
  );
  assert.equal(f.warnings.length, 2);
});

test("the return closes its break window exactly at activation, warns anew, sounds once per release and keeps its own contact budget", () => {
  const f = fixture();
  assert(f.start());
  const q = head(f);
  f.move(850, 700);
  f.run(q.returnAt);
  assert.equal(head(f).state, "return");
  assert.deepEqual(f.d.weakPoints(), []);
  assert.equal(f.d.hit(q.id, 999, f.c.tick), 0);
  assert.deepEqual(f.warnings, [q.beganAt, q.returnWarnAt]);
  assert.deepEqual(f.sounds, [
    { id: "bell-clapper", at: q.at },
    { id: "bell-answer", at: q.returnAt },
  ]);
  f.d.step(f.c);
  assert.equal(f.sounds.length, 2);
  f.run(q.until);
  assert(!f.d.busy);
  assert(f.start());
  assert(head(f).id !== q.id);
  f.c.paused = true;
  f.step();
  assert(!f.d.busy);
  assert.deepEqual(f.d.cues(), []);
});

test("throws remain clear of actual cover, offset bounds and conservative lava footprints on all map/difficulty/form combinations", () => {
  let checked = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties)
      for (const form of ["brutal", "crazed"] as const) {
        const g = createPracticeGame(
          {
            mode: "endless",
            openingBossId: "bellringer",
            openingArenaId: map.id,
            difficulty: difficulty.id,
          },
          "Mara",
          "soldier",
          form,
        );
        g.start();
        const c = (
            g as unknown as { signatureContext(): SignatureContext }
          ).signatureContext(),
          d = new BellReturnChain(),
          walls = bellWalls(c);
        assert(
          d.start(c, c.boss, c.targets[0], walls),
          map.id + "/" + difficulty.id + "/" + form,
        );
        const q = d.cues()[0],
          end = { x: q.endX, y: q.endY };
        assert(distance(c.boss, end) >= bellChainRules.minimumReach - 0.001);
        assert(distance(c.boss, end) <= bellChainRules.maximumReach + 0.001);
        assert(
          walls.every(
            (w) => segmentRect(c.boss, end, w, q.radius + 1) === null,
          ),
        );
        assert(
          q.endX >= c.bounds!.x + q.radius && q.endY >= c.bounds!.y + q.radius,
        );
        assert(
          q.endX <= c.bounds!.x + c.bounds!.width - q.radius &&
            q.endY <= c.bounds!.y + c.bounds!.height - q.radius,
        );
        checked++;
      }
  assert.equal(checked, 72);
});

function score(form: "normal" | "brutal" | "crazed", phase = 0) {
  const f = fixture(form),
    d = new BellCarillon();
  f.c.boss = { x: 800, y: 250 };
  f.c.bounds = { x: 0, y: 0, width: 1600, height: 1000 };
  f.move(800, 700);
  f.c.phase = phase;
  let generic = 0;
  f.c.emitHostile = () => generic++;
  f.c.emitControlled = () => {
    generic++;
    return 999999;
  };
  assert(d.cast(f.c, f.c.targets[0]));
  f.c.auxiliaryBusy = true;
  const chains = new Map<number, BellChain>(),
    rings = new Map<number, BellCue>(),
    clappers = new Map<number, BellCue>();
  let overlap = 0,
    ticks = 0;
  while (d.busy && ticks < 2500) {
    f.c.tick++;
    d.step(f.c);
    ticks++;
    const cues = d.cues();
    assert.equal(new Set(cues.map((q) => q.id)).size, cues.length);
    for (const q of cues) {
      if (q.kind === "bell-chain" && !chains.has(q.id))
        chains.set(q.id, structuredClone(q));
      if (q.kind === "bell-ring" && !rings.has(q.id))
        rings.set(q.id, structuredClone(q));
      if (q.kind === "bell-clapper" && !clappers.has(q.id))
        clappers.set(q.id, structuredClone(q));
    }
    if (
      cues.some((q) => q.kind === "bell-chain" && q.state === "return") &&
      cues.some((q) => q.kind === "bell-ring" && q.state === "travel")
    )
      overlap++;
  }
  assert(ticks < 2500 && !d.busy);
  assert.equal(generic, 0);
  return { d, f, chains, rings, clappers, overlap, ticks };
}
test("Standard retains two/three/four fronts with wider gaps, shorter clapper reach and deliberately slower spacing", () => {
  const authored = JSON.parse(
    readFileSync("content/catalog.json", "utf8"),
  ).bosses.find((b: { id: string }) => b.id === "bellringer");
  assert.deepEqual(authored.signature.parameters.carillon, bellRules);
  assert.deepEqual(authored.signature.parameters.returnChain, bellChainRules);
  assert(
    authored.phases.every(
      (p: {
        tetheredClapper: boolean;
        ringGapDegrees: number;
        clapperReach: number;
      }) =>
        !p.tetheredClapper && p.ringGapDegrees === 46 && p.clapperReach === 260,
    ),
  );
  for (const form of ["brutal", "crazed"])
    assert(
      authored.variants[form].additionalPatterns.includes(
        "tethered-clapper-return",
      ),
    );
  assert.equal(bellRules.beatSeconds, 1.05);
  assert.equal(bellRules.standardGapDegrees, 46);
  assert.equal(bellRules.standardClapperReach, 260);
  for (let phase = 0; phase < 3; phase++) {
    const s = score("normal", phase);
    assert.equal(s.chains.size, 0);
    const rings = [...s.rings.values()].filter((q) => q.kind === "bell-ring");
    assert.equal(rings.length, [2, 3, 4][phase]);
    assert(rings.every((q) => Math.abs(q.gap - (46 * Math.PI) / 180) < 1e-9));
    assert(
      [...s.clappers.values()].every(
        (q) => q.kind === "bell-clapper" && q.reach === 260,
      ),
    );
    assert.equal(rings[1].beganAt - rings[0].beganAt, Math.ceil(1.05 * HZ));
  }
});
test("every advanced phase gets one complete return-chain decision overlapping peals, and Crazed keeps its concurrent responding bell", () => {
  for (const form of ["brutal", "crazed"] as const)
    for (let phase = 0; phase < 4; phase++) {
      const s = score(form, phase);
      assert.equal(s.chains.size, 1);
      assert(s.overlap > 0);
      assert(
        [...s.rings.values()]
          .filter((q) => q.kind === "bell-ring" && !q.echo)
          .every(
            (q) =>
              q.kind === "bell-ring" &&
              Math.abs(q.gap - (35 * Math.PI) / 180) < 1e-9,
          ),
      );
      assert(
        [...s.clappers.values()].some(
          (q) => q.kind === "bell-clapper" && !q.echo && q.reach === 340,
        ),
      );
      assert.equal(
        [...s.rings.values()].filter((q) => q.kind === "bell-ring" && q.echo)
          .length,
        form === "crazed" ? (phase >= 2 ? 4 : 3) : 0,
      );
    }
});

test("actual Soldier projectiles hit and break the landed head through normal weak-point routing, without transferring damage to the boss", () => {
  const g = createPracticeGame(
      {
        mode: "endless",
        openingBossId: "bellringer",
        openingArenaId: "gatehouse",
        difficulty: "normal",
      },
      "Mara",
      "soldier",
      "brutal",
    ),
    p = g.players.get("solo")!;
  p.coins = 10000;
  for (let n = 0; n < 3; n++)
    assert(
      g.transact(p.id, {
        id: "chain-damage-" + n,
        kind: "upgrade",
        item: "damage",
      }).ok,
    );
  g.start();
  p.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  for (
    let n = 0;
    n < 2000 &&
    !g.bossCues().some((q) => q.kind === "bell-chain" && q.state === "rewarn");
    n++
  )
    g.step();
  const q = g
    .bossCues()
    .find((q) => q.kind === "bell-chain" && q.state === "rewarn");
  assert(q && q.kind === "bell-chain");
  const length = Math.hypot(q.endX - q.originX, q.endY - q.originY),
    ux = (q.endX - q.originX) / length,
    uy = (q.endY - q.originY) / length;
  p.x = p.oldX = q.endX - ux * 80;
  p.y = p.oldY = q.endY - uy * 80;
  p.aim = Math.atan2(q.endY - p.y, q.endX - p.x);
  const hp = g.boss.health;
  let damaged = false,
    broken = false;
  for (let sequence = 1; sequence <= 36; sequence++) {
    g.submitInput(p.id, { ...idleInput(), sequence, fire: true, aim: p.aim });
    g.step();
    const live = g
      .bossCues()
      .find((c) => c.kind === "bell-chain" && c.id === q.id);
    if (live && live.kind === "bell-chain") {
      damaged ||= live.health < q.maxHealth;
      broken ||= live.state === "broken";
    }
    if (broken) break;
  }
  assert(damaged && broken);
  assert.equal(g.boss.health, hp);
  assert(!g.director.weakPoints().some((c) => c.id === q.id));
  assert(p.damageDealt > 0);
});

test("already warned throws/returns finish across actual phase entry and explicit stagger/defeat cleanup removes their weak ownership", () => {
  for (const moment of ["windup", "outbound", "rewarn", "return"] as const) {
    const g = createPracticeGame(
      { mode: "endless", openingBossId: "bellringer", difficulty: "normal" },
      "Mara",
      "soldier",
      "crazed",
    );
    g.start();
    g.players.get("solo")!.invulnerableUntil = 1e9;
    g.boss.deadline = 1e9;
    for (
      let n = 0;
      n < 2500 &&
      !g.bossCues().some((q) => q.kind === "bell-chain" && q.state === moment);
      n++
    )
      g.step();
    const q = g
      .bossCues()
      .find((q) => q.kind === "bell-chain" && q.state === moment);
    assert(q && q.kind === "bell-chain");
    const next = encounterPhases(g.boss.id, g.boss.variant)[1];
    g.boss.health = g.boss.maxHealth * (next.healthThreshold - 0.001);
    g.step();
    const kept = g
      .bossCues()
      .find((c) => c.kind === "bell-chain" && c.id === q.id);
    assert(kept && kept.kind === "bell-chain");
    for (const key of [
      "originX",
      "originY",
      "endX",
      "endY",
      "at",
      "returnWarnAt",
      "returnAt",
      "until",
      "damage",
      "maxHealth",
    ])
      assert.equal(Reflect.get(kept, key), Reflect.get(q, key));
    g.boss.staggerUntil = g.combatTick + 20;
    g.step();
    assert(!g.bossCues().some((c) => c.kind === "bell-chain"));
    assert(!g.director.weakPoints().some((c) => c.kind === "bell-chain"));
    g.boss.health = 0;
    g.step();
    assert(!g.bossCues().length);
  }
});

test("the drawn throw/return/weak-point cues use exact shared geometry, remain bounded and expose numeric state to snapshots", () => {
  const f = fixture();
  assert(f.start());
  const q = head(f);
  const calls: { name: string; args: number[] }[] = [];
  const graphics = new Proxy(
    {},
    {
      get(_target, name) {
        return (...args: number[]) => {
          calls.push({ name: String(name), args });
          return graphics;
        };
      },
    },
  ) as Parameters<typeof drawBellCue>[0];
  for (const at of [
    0,
    q.at + 10,
    q.outwardEndAt + 2,
    q.returnWarnAt + 10,
    q.returnAt + 5,
  ]) {
    f.run(at);
    const live = head(f);
    calls.length = 0;
    drawBellCue(graphics, graphics, live, f.c.tick);
    assert(calls.length > 0 && calls.length < 150);
    assert(calls.every((c) => c.args.every(Number.isFinite)));
    const center = bellChainPosition(live, f.c.tick);
    assert(
      calls.some(
        (c) =>
          c.name === "fillEllipse" &&
          Math.abs(c.args[0] - center.x) < 1e-9 &&
          Math.abs(c.args[1] - center.y) < 1e-9,
      ),
    );
    assert.equal(
      calls.filter((c) => c.name === "fillRect").length,
      bellChainStage(live, f.c.tick) === "rewarn" ? 2 : 0,
    );
    assert(isBellCue(live));
    assert.equal(bellFrame([live], f.c.tick, true), 0);
  }
  const g = createPracticeGame(
    { mode: "endless", openingBossId: "bellringer" },
    "Mara",
    "soldier",
    "brutal",
  );
  g.start();
  g.players.get("solo")!.invulnerableUntil = 1e9;
  for (
    let n = 0;
    n < 1000 && !g.bossCues().some((c) => c.kind === "bell-chain");
    n++
  )
    g.step();
  const live = viewOf(g, "solo").bossCues.find((c) => c.kind === "bell-chain");
  assert(live && live.kind === "bell-chain");
  assert(
    Object.entries(live).every(([key, value]) =>
      key === "kind" || key === "state"
        ? typeof value === "string"
        : (typeof value === "number" && Number.isFinite(value)) ||
          (key === "crazed" && typeof value === "boolean"),
    ),
  );
});
