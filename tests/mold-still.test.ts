import { readFileSync } from "node:fs";
const requireRead = (p: string) => readFileSync(p, "utf8");
import test from "node:test";
import assert from "node:assert/strict";
import {
  MoldStills,
  moldStillRules,
  aerosolPosition,
  aerosolContact,
  aerosolMovement,
  type MoldAerosol,
  type MoldStill,
} from "../src/shared/mold-still.ts";
import {
  MoldMixing,
  moldWalls,
  moldMovement,
  type MoldPool,
} from "../src/shared/mold-mixing.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { encounterPhases } from "../src/shared/encounter-policy.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import { drawMoldCue } from "../src/client/mold-cues.ts";
import { isMoldCue, moldFrame } from "../src/client/mold-presentation.ts";
import { Prediction } from "../src/client/prediction.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";

function fixture(phase = 0) {
  const d = new MoldStills(),
    hurt: { id: string; damage: number; at: number }[] = [],
    warnings: number[] = [],
    pools: MoldPool[] = [];
  let serial = 0;
  const c: SignatureContext = {
    tick: 0,
    bossId: "alchemist",
    boss: { x: 800, y: 250 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [{ id: "a", x: 900, y: 700, oldX: 900, oldY: 700 }],
    phase,
    brutal: true,
    variant: "crazed",
    projectileMultiplier: 7.5,
    damageScale: 1,
    id: () => ++serial,
    damage: (id, damage) => hurt.push({ id, damage, at: c.tick }),
    warn: () => warnings.push(c.tick),
    spawnRat: () => {},
  };
  const positions = [
      { x: 500, y: 400 },
      { x: 1100, y: 400 },
    ],
    start = () => d.start(c, c.targets[0], positions),
    step = () => {
      c.tick++;
      d.step(c, pools);
    },
    run = (end: number) => {
      while (c.tick < end) step();
    };
  return { d, c, hurt, warnings, pools, positions, start, step, run };
}
type F = ReturnType<typeof fixture>;
const columns = (f: F) =>
  f.d.cues().filter((q): q is MoldStill => q.kind === "mold-still");
const clouds = (f: F) =>
  f.d.cues().filter((q): q is MoldAerosol => q.kind === "mold-aerosol");
function until(f: F, check: () => boolean) {
  for (let n = 0; n < 1500 && !check(); n++) f.step();
  assert(check(), "Required still stage not reached");
}
function water(f: F, p: { x: number; y: number }, radius = 100) {
  const q: MoldPool = {
    kind: "mold-pool",
    id: 9999 + f.pools.length,
    x: p.x,
    y: p.y,
    radius,
    reagent: "water",
    index: 0,
    beganAt: f.c.tick,
    at: f.c.tick,
    until: f.c.tick + 1000,
    spentAt: 0,
  };
  f.pools.push(q);
  return q;
}
function move(f: F, x: number, y: number) {
  Object.assign(f.c.targets[0], { x, y, oldX: x, oldY: y });
}

test("distillation apparatus is Crazed-only, finite, cloned and bounded to one or two columns per cycle", () => {
  const authored = JSON.parse(requireRead("content/catalog.json")).bosses.find(
    (b: { id: string }) => b.id === "alchemist",
  );
  assert.deepEqual(
    authored.signature.parameters.volatileDistillation,
    moldStillRules,
  );
  assert(
    authored.phases.every(
      (p: Record<string, unknown>) => p.distillationColumns === undefined,
    ),
  );
  assert(
    authored.variants.brutal.phases.every(
      (p: Record<string, unknown>) => p.distillationColumns === undefined,
    ),
  );
  const f = fixture();
  for (const variant of ["normal", "brutal"] as const) {
    f.c.variant = variant;
    assert.equal(f.start(), false);
  }
  f.c.variant = "crazed";
  assert(f.start());
  assert.equal(columns(f).length, 1);
  assert(!f.start());
  const q = columns(f)[0];
  assert.equal(q.at - q.beganAt, 63);
  q.x = 123;
  assert.equal(columns(f)[0].x, 500);
  move(f, 1500, 950);
  f.run(800);
  assert(!f.d.busy);
  assert.deepEqual(f.d.cues(), []);
  assert.equal(Reflect.get(f.d, "hits").size, 0);
  assert(f.start());
  f.c.paused = true;
  f.step();
  assert(!f.d.busy);
});

test("phase zero keeps one fixed lane, phase one re-aims between full warnings, phase two crosses two sources and phase three ends in reflux", () => {
  for (let phase = 0; phase < 4; phase++) {
    const f = fixture(phase);
    assert(f.start());
    assert.equal(columns(f).length, [1, 1, 2, 2][phase]);
    const seen = new Map<number, MoldAerosol>();
    for (let n = 0; n < 850; n++) {
      if (n === 140) move(f, 500, 850);
      f.step();
      for (const q of clouds(f))
        if (!seen.has(q.id)) seen.set(q.id, structuredClone(q));
    }
    const all = [...seen.values()];
    assert.equal(all.length, [2, 3, 4, 6][phase]);
    assert(all.every((q) => q.at - q.beganAt === 54));
    assert.equal(all.filter((q) => q.reflux).length, phase === 3 ? 2 : 0);
    if (phase === 0) {
      assert.equal(all[0].endX, all[1].endX);
      assert.equal(all[0].endY, all[1].endY);
    }
    if (phase === 1)
      assert(all.some((q) => q.endX !== all[0].endX || q.endY !== all[0].endY));
    for (const q of all)
      if (q.reflux) {
        const s = f.positions[q.sourceId === 1 ? 0 : 1];
        assert.equal(q.endX, s.x);
        assert.equal(q.endY, s.y);
      }
  }
});

test("every aerosol locks its complete numeric route, damage and activation clock, independent of later target/phase/scale changes", () => {
  const f = fixture();
  assert(f.start());
  until(f, () => clouds(f).length > 0);
  const q = clouds(f)[0];
  move(f, 100, 900);
  f.c.phase = 3;
  f.c.damageScale = 5;
  for (let n = 0; n < 54; n++) f.step();
  const live = clouds(f).find((c) => c.id === q.id)!;
  for (const key of [
    "fromX",
    "fromY",
    "endX",
    "endY",
    "at",
    "until",
    "damage",
    "sourceId",
    "count",
  ] as const)
    assert.equal(live[key], q[key]);
  assert.equal(live.damage, 12);
  assert.equal(live.count, 2);
  assert.deepEqual({ x: live.x, y: live.y }, aerosolPosition(live, f.c.tick));
});

test("warnings are harmless, activation ignores old motion, later relative sweeps hit once per player per cloud and movement slow follows the real cloud", () => {
  const f = fixture();
  assert(f.start());
  until(f, () => clouds(f).length > 0);
  const q = clouds(f)[0];
  move(f, q.fromX, q.fromY);
  f.run(q.at - 1);
  assert.equal(f.hurt.length, 0);
  assert.equal(aerosolMovement(f.d.cues(), f.c.targets[0], f.c.tick), 1);
  move(f, 1500, 900);
  f.c.targets[0].oldX = q.fromX;
  f.c.targets[0].oldY = q.fromY;
  f.step();
  assert.equal(f.hurt.length, 0);
  const active = clouds(f)[0];
  move(f, active.x, active.y);
  f.step();
  assert.equal(f.hurt.length, 1);
  assert.equal(f.hurt[0].damage, 12);
  assert.equal(moldMovement(f.d.cues(), f.c.targets[0], f.c.tick), 0.7);
  for (let n = 0; n < 4; n++) {
    const a = clouds(f).find((c) => c.id === q.id)!;
    move(f, a.x, a.y);
    f.step();
  }
  assert.equal(f.hurt.length, 1);
  const live = clouds(f)[0],
    mid = { x: (live.oldX + live.x) / 2, y: (live.oldY + live.y) / 2 };
  assert(
    aerosolContact(
      live,
      { x: mid.x, y: mid.y - 200 },
      { x: mid.x, y: mid.y + 200 },
      f.c.tick,
    ),
  );
});

test("coolant condenses a travelling aerosol before damage, is visibly spent with grace, and clears its slow and ownership at expiry", () => {
  const f = fixture();
  assert(f.start());
  until(f, () => clouds(f).some((q) => q.state === "travel"));
  const q = clouds(f)[0],
    p = aerosolPosition(q, f.c.tick + 1),
    w = water(f, p, 90);
  move(f, p.x, p.y);
  f.step();
  const live = clouds(f).find((c) => c.id === q.id)!;
  assert.equal(live.state, "quenched");
  assert.equal(live.quenchedAt, f.c.tick);
  assert.equal(w.spentAt, f.c.tick);
  assert.equal(w.until, f.c.tick + 27);
  assert.equal(f.hurt.length, 0);
  assert.equal(moldMovement(f.d.cues(), p, f.c.tick), 1);
  f.run(live.until);
  assert(!clouds(f).some((c) => c.id === q.id));
  assert(!Reflect.get(f.d, "hits").has(q.id));
});

test("cooling apparatus cancels its pending releases with a condensation cue, but does not revoke an already released remote cloud", () => {
  const f = fixture();
  assert(f.start());
  until(f, () => clouds(f).some((q) => q.state === "travel"));
  const active = clouds(f)[0];
  f.run(active.at + 30);
  const first = columns(f)[0];
  water(f, first, 90);
  f.step();
  assert.equal(columns(f)[0].state, "cooled");
  assert.equal(clouds(f).find((q) => q.id === active.id)!.state, "travel");
  const g = fixture();
  assert(g.start());
  until(g, () => clouds(g).length > 0);
  const pending = clouds(g)[0];
  water(g, columns(g)[0], 90);
  g.step();
  assert.equal(clouds(g)[0].state, "quenched");
  assert.equal(clouds(g)[0].quenchedAt, g.c.tick);
  g.run(pending.until + 300);
  assert.deepEqual(clouds(g), []);
});

test("all actual Crazed phase/map/difficulty combinations place the requested apparatus on accessible reagent-sized clear floor and keep clouds inside bounds", () => {
  let checked = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties)
      for (let phase = 0; phase < 4; phase++) {
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
          "crazed",
        );
        g.start();
        g.boss.phase = phase;
        g.boss.health =
          g.boss.maxHealth *
          (encounterPhases("alchemist", "crazed")[phase].healthThreshold -
            0.01);
        g.boss.deadline = 1e9;
        g.players.get("solo")!.invulnerableUntil = 1e9;
        g.step();
        const cs = g.bossCues().filter((q) => q.kind === "mold-still");
        if (g.boss.variant !== "crazed") {
          assert.equal(difficulty.id, "insane");
          assert.equal(g.boss.variant, "brutal");
          assert.equal(cs.length, 0);
          checked++;
          continue;
        }
        assert.equal(
          cs.length,
          phase >= 2 ? 2 : 1,
          map.id + "/" + difficulty.id + "/" + phase,
        );
        const c = (
            g as unknown as { signatureContext(): SignatureContext }
          ).signatureContext(),
          walls = moldWalls(c),
          b = c.bounds!;
        for (const s of cs) {
          assert.equal(s.kind, "mold-still");
          assert(
            walls.every(
              (w) =>
                segmentRect(s, s, w, moldStillRules.clearance - 0.2) === null,
            ),
          );
          assert(distance(s, c.targets[0]) >= 180 - 0.01);
        }
        for (let n = 0; n < 170; n++) {
          g.step();
          for (const q of g.bossCues())
            if (q.kind === "mold-aerosol") {
              for (const p of [
                { x: q.fromX, y: q.fromY },
                { x: q.endX, y: q.endY },
              ])
                assert(
                  p.x >= b.x + q.radius &&
                    p.y >= b.y + q.radius &&
                    p.x <= b.x + b.width - q.radius &&
                    p.y <= b.y + b.height - q.radius,
                );
              assert.equal(q.at - q.beganAt, 54);
            }
        }
        checked++;
      }
  assert.equal(checked, 144);
});

test("actual phase entry retains issued column/cloud clocks and explicit stagger/defeat clears all new ownership", () => {
  for (const moment of ["charging", "warning", "travel"] as const) {
    const g = createPracticeGame(
      { mode: "endless", openingBossId: "alchemist" },
      "Mara",
      "soldier",
      "crazed",
    );
    g.start();
    g.boss.deadline = 1e9;
    g.players.get("solo")!.invulnerableUntil = 1e9;
    const select = () =>
      g
        .bossCues()
        .find((q) =>
          moment === "charging"
            ? q.kind === "mold-still" && q.state === moment
            : q.kind === "mold-aerosol" && q.state === moment,
        );
    for (let n = 0; n < 1500 && !select(); n++) g.step();
    const locked = select()!;
    assert(locked);
    g.boss.health = g.boss.maxHealth * 0.74;
    g.step();
    assert.equal(g.boss.phase, 1);
    const kept = g.bossCues().find((q) => q.id === locked.id)!;
    assert(kept);
    for (const key of [
      "beganAt",
      "at",
      "until",
      "fromX",
      "fromY",
      "endX",
      "endY",
      "damage",
      "phase",
      "releases",
    ])
      if (key in locked)
        assert.equal(Reflect.get(kept, key), Reflect.get(locked, key));
    g.boss.staggerUntil = g.combatTick + 30;
    g.step();
    assert(
      !g
        .bossCues()
        .some((q) => q.kind === "mold-still" || q.kind === "mold-aerosol"),
    );
    g.boss.health = 0;
    g.step();
    assert.deepEqual(g.bossCues(), []);
  }
});

test("the actual new-cue renderer uses shared routes, bounds its work, and remains visible on the hostile layer with reduced-motion pose support", () => {
  const f = fixture(3);
  assert(f.start());
  until(f, () => clouds(f).length > 0);
  const calls: { name: string; args: number[] }[] = [],
    h = new Proxy(
      {},
      {
        get(_target, name) {
          return (...args: number[]) => {
            calls.push({ name: String(name), args });
            return h;
          };
        },
      },
    ) as Parameters<typeof drawMoldCue>[0];
  const friendly = new Proxy(
    {},
    {
      get() {
        return () => {
          throw Error("Hostile still depended on friendly-effect drawing");
        };
      },
    },
  ) as typeof h;
  for (const q of f.d.cues()) {
    calls.length = 0;
    drawMoldCue(h, friendly, q, f.c.tick, f.d.cues());
    assert(calls.length > 0 && calls.length < 250);
    assert(calls.every((c) => c.args.every(Number.isFinite)));
    assert(isMoldCue(q));
  }
  assert.equal(moldFrame(f.d.cues(), f.c.tick, true), 0);
  const q = clouds(f)[0];
  f.run(q.at + 10);
  const live = clouds(f).find((c) => c.id === q.id)!;
  calls.length = 0;
  drawMoldCue(h, friendly, live, f.c.tick, f.d.cues());
  const p = aerosolPosition(live, f.c.tick);
  assert(
    calls.some(
      (c) =>
        c.name === "fillCircle" &&
        c.args[0] === p.x &&
        c.args[1] === p.y &&
        c.args[2] === live.radius,
    ),
  );
});

test("real acid/alkali landings create coolant beside a column and close its still-pending release", () => {
  const f = fixture(1),
    mold = new MoldMixing();
  f.c.bounds!.height = 840;
  mold.step(f.c);
  const s = mold.cues().find((q) => q.kind === "mold-still");
  assert(s && s.kind === "mold-still");
  const acid = mold
    .cues()
    .filter((q) => q.kind === "mold-flask" && q.reagent === "acid");
  assert(acid.some((q) => q.kind === "mold-flask" && distance(q, s) < 132));
  move(f, s.x, s.y);
  for (let n = 0; n < 110; n++) {
    f.c.tick++;
    mold.step(f.c);
  }
  const cooled = mold.cues().find((q) => q.id === s.id);
  assert(cooled && cooled.kind === "mold-still" && cooled.state === "cooled");
  assert(
    mold
      .cues()
      .some(
        (q) =>
          q.kind === "mold-pool" && q.reagent === "water" && distance(q, s) < 1,
      ),
  );
  assert(
    !mold
      .cues()
      .some((q) => q.kind === "mold-aerosol" && q.state !== "quenched"),
  );
});

test("isolated actual-Game aerosol damages real health once, appears in detached views and shares slow with client prediction", () => {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "alchemist",
      openingArenaId: "gatehouse",
      difficulty: "normal",
    },
    "Mara",
    "soldier",
    "crazed",
  );
  g.start();
  g.boss.deadline = 1e9;
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  for (
    let n = 0;
    n < 1000 && !g.bossCues().some((q) => q.kind === "mold-aerosol");
    n++
  )
    g.step();
  const q = g.bossCues().find((q) => q.kind === "mold-aerosol");
  assert(q && q.kind === "mold-aerosol");
  // Keep the real owned aerosol and isolate other chemistry for this health/prediction regression.
  const owner = g.director.services.alchemist;
  for (const name of ["flasks", "pools", "reactors", "reactions"])
    Reflect.set(owner, name, []);
  Reflect.set(owner, "gas", null);
  Reflect.set(owner, "walk", null);
  Reflect.set(owner, "stage", "idle");
  owner.nextSignatureAt = 1e9;
  const angle = Math.atan2(q.endY - q.fromY, q.endX - q.fromX);
  p.x = p.oldX = q.fromX + Math.cos(angle) * 40;
  p.y = p.oldY = q.fromY + Math.sin(angle) * 40;
  p.shield = 0;
  p.invulnerableUntil = 0;
  const hp = p.health;
  while (g.combatTick < q.at) g.step();
  assert(p.health < hp && p.health > 0);
  const after = p.health;
  for (let n = 0; n < 3; n++) g.step();
  assert.equal(p.health, after);
  const active = g.bossCues().find((c) => c.id === q.id);
  assert(active && active.kind === "mold-aerosol" && active.state === "travel");
  const at = aerosolPosition(active, g.combatTick);
  p.x = p.oldX = at.x;
  p.y = p.oldY = at.y;
  const view = viewOf(g, p.id),
    replicated = view.bossCues.find((c) => c.id === q.id);
  assert(replicated && replicated.kind === "mold-aerosol");
  replicated.x = 12345;
  const detachedCheck = g.bossCues().find((c) => c.id === q.id);
  assert(detachedCheck && detachedCheck.kind === "mold-aerosol");
  assert.notEqual(detachedCheck.x, 12345);
  const v = viewOf(g, p.id),
    prediction = new Prediction();
  prediction.acknowledge(v, p.id);
  const input = { ...idleInput(), sequence: 1, moveX: 1 };
  prediction.submit(input, v);
  g.submitInput(p.id, input);
  g.step();
  assert(
    Math.abs(prediction.player!.x - p.x) < 0.001 &&
      Math.abs(prediction.player!.y - p.y) < 0.001,
  );
  assert.equal(moldMovement(g.bossCues(), p, g.combatTick), 0.7);
});
