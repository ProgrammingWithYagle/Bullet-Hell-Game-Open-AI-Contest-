import test from "node:test";
import assert from "node:assert/strict";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { Game, data } from "../src/shared/game.ts";
import {
  encounterPhases,
  bossPatternPhase,
} from "../src/shared/encounter-policy.ts";
import {
  HZ,
  idleInput,
  type BossId,
  type Vec,
} from "../src/shared/protocol.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { MoldMixing } from "../src/shared/mold-mixing.ts";
import { BellCarillon } from "../src/shared/bell-carillon.ts";
import { MatronWard } from "../src/shared/matron-ward.ts";
import {
  ServiceDirector,
  type ServiceAttack,
} from "../src/shared/service-director.ts";
import { Prediction } from "../src/client/prediction.ts";
import { viewOf } from "../src/shared/view.ts";

const forms = ["normal", "brutal", "crazed"] as const;
function game(
  id: BossId,
  difficulty = "normal",
  form: (typeof forms)[number] = "normal",
) {
  const g = createPracticeGame(
    { mode: "endless", openingBossId: id, difficulty, seed: 829 },
    "Mara",
    "soldier",
    form,
  );
  g.start();
  g.boss.deadline = 1e9;
  for (const p of g.players.values()) p.invulnerableUntil = 1e9;
  return g;
}
function until(g: Game, check: () => boolean, max = 2000) {
  for (let i = 0; i < max && !check(); i++) g.step();
  assert(
    check(),
    "Actual encounter did not reach the required attack witness: " + g.boss.id,
  );
}
function advance(g: Game) {
  const next = encounterPhases(g.boss.id, g.boss.variant)[g.boss.phase + 1];
  assert(next);
  g.boss.health = g.boss.maxHealth * (next.healthThreshold - 0.001);
  g.step();
}
function holdFreshCasts(g: Game) {
  Reflect.set(g, "phaseAttackReadyAt", 1e9);
  Reflect.set(
    g,
    "attackAt",
    encounterPhases(g.boss.id, g.boss.variant)[g.boss.phase].attacks.map(
      () => 1e9,
    ),
  );
}
type Owner = MoldMixing | BellCarillon | MatronWard;
function fixture(
  ctor: new () => Owner,
  id: BossId,
  form: (typeof forms)[number],
  phase: number,
) {
  const d = new ctor();
  let serial = 0;
  const damage: unknown[] = [],
    spawned: unknown[] = [],
    shots: unknown[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: id,
    boss: { x: 800, y: 250 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [{ id: "a", x: 800, y: 700, oldX: 800, oldY: 700 }],
    damageScale: form === "normal" ? 1 : 2,
    phase,
    brutal: form !== "normal",
    variant: form,
    projectileMultiplier: form === "normal" ? 1 : form === "brutal" ? 2.5 : 7.5,
    id: () => ++serial,
    damage: (id, amount) => damage.push({ id, amount, at: c.tick }),
    spawnRat: () => {},
    spawnOrdinary: (...args) => spawned.push({ at: c.tick, args }),
    emitControlled: (...args) => {
      shots.push({ at: c.tick, args });
      return ++serial;
    },
  };
  return {
    d,
    c,
    damage,
    spawned,
    shots,
    step() {
      c.tick++;
      d.step(c);
    },
  };
}
for (const [id, ctor] of [
  ["alchemist", MoldMixing],
  ["bellringer", BellCarillon],
  ["matron", MatronWard],
] as const)
  test(
    id +
      ": committed full scores retain their original phase, child attacks and damage through every legal form/phase change",
    () => {
      for (const form of forms) {
        const phases = encounterPhases(id, form);
        for (let phase = 0; phase < phases.length - 1; phase++) {
          const a = fixture(ctor, id, form, bossPatternPhase(id, form, phase)),
            b = fixture(ctor, id, form, bossPatternPhase(id, form, phase));
          a.step();
          b.step();
          assert(a.d.busy && b.d.busy);
          const next = bossPatternPhase(id, form, phase + 1);
          b.c.phase = next;
          a.c.auxiliaryBusy = b.c.auxiliaryBusy = true;
          let checked = 0;
          while (a.d.busy && checked < 2000) {
            a.step();
            b.step();
            checked++;
            assert.deepEqual(
              b.d.cues(),
              a.d.cues(),
              `${id}/${form}/${phase} at ${a.c.tick}`,
            );
            assert.deepEqual(b.c.boss, a.c.boss);
            assert.deepEqual(b.damage, a.damage);
            assert.deepEqual(b.spawned, a.spawned);
            assert.deepEqual(b.shots, a.shots);
          }
          assert(checked > 0 && checked < 2000);
          assert(!a.d.busy && !b.d.busy);
          // Future work adopts the live phase after the committed score has finished.
          b.c.auxiliaryBusy = false;
          for (let i = 0; i < 500 && !b.d.busy; i++) b.step();
          assert(b.d.busy);
          assert.equal(Reflect.get(b.d, "phase"), next);
        }
      }
    },
  );

test("already announced Matron brood retains its spawn speed/count even when its phase changes after the escort is idle", () => {
  const f = fixture(MatronWard, "matron", "normal", 0);
  f.step();
  for (let i = 0; i < 1500; i++) {
    f.step();
    if (
      !f.d.busy &&
      f.d.cues().some((q) => q.kind === "matron-brood" && q.at > f.c.tick)
    )
      break;
  }
  // If the first brood overlaps the relay, wait for the next independently warned brood.
  f.c.auxiliaryBusy = true;
  for (
    let i = 0;
    i < 500 &&
    !f.d.cues().some((q) => q.kind === "matron-brood" && q.at > f.c.tick);
    i++
  )
    f.step();
  const q = f.d
    .cues()
    .find((q) => q.kind === "matron-brood" && q.at > f.c.tick);
  assert(q && q.kind === "matron-brood");
  const count = f.spawned.length;
  f.c.phase = 2;
  while (f.c.tick < q.at) f.step();
  assert.equal(f.spawned.length - count, q.count);
  for (const entry of f.spawned.slice(count) as { args: unknown[] }[])
    assert.equal(entry.args[1], 80);
});

test("all six global difficulties retain warned constable fans and their actual locked-origin release across phase entry", () => {
  for (const difficulty of data.difficulties) {
    const g = game("constable", difficulty.id);
    until(g, () =>
      g.warnings.some((w) => w.kind === "fan" && w.at > g.combatTick),
    );
    const w = structuredClone(
      g.warnings.find((w) => w.kind === "fan" && w.at > g.combatTick)!,
    );
    const emitted: {
      point: Vec;
      angle: number;
      speed: number;
      damage: number;
    }[] = [];
    const original = Reflect.get(g, "emitBossShot").bind(g);
    Reflect.set(
      g,
      "emitBossShot",
      (
        x: number,
        y: number,
        angle: number,
        speed: number,
        damage: number,
        ...rest: unknown[]
      ) => {
        emitted.push({ point: { x, y }, angle, speed, damage });
        return original(x, y, angle, speed, damage, ...rest);
      },
    );
    advance(g);
    assert.equal(g.boss.phase, 1);
    if (g.combatTick < w.at)
      assert.deepEqual(
        g.warnings.find((q) => q.id === w.id),
        w,
      );
    holdFreshCasts(g);
    while (g.combatTick < w.at) g.step();
    for (let n = 0; n < w.count; n++) {
      const angle = w.aim + (n / Math.max(1, w.count - 1) - 0.5) * w.arc;
      assert(
        emitted.some(
          (q) =>
            q.point.x === w.x &&
            q.point.y === w.y &&
            Math.abs(q.angle - angle) < 1e-9 &&
            q.speed === w.speed &&
            q.damage === w.damage,
        ),
      );
    }
  }
});

test("phase entry preserves an issued zone, an in-flight projectile and its pending advanced echoes, with natural release and field expiry", () => {
  for (const form of forms) {
    const g = game("constable", "normal", form),
      id = Reflect.get(g, "id").bind(g) as () => number;
    const zone = {
      id: id(),
      kind: "zone" as const,
      x: 300,
      y: 700,
      aim: 0,
      count: 1,
      arc: 0,
      speed: 0,
      damage: 21,
      radius: 70,
      at: g.combatTick + 12,
      until: g.combatTick + 80,
    };
    g.warnings.push(zone);
    const shot = Reflect.get(g, "emitBossShot").call(
      g,
      g.boss.x,
      g.boss.y,
      0,
      120,
      9,
      4,
    );
    assert(shot);
    const echoes = g.brutalVolley.cues();
    advance(g);
    holdFreshCasts(g);
    assert(g.shots.has(shot.id));
    assert.deepEqual(
      g.warnings.find((q) => q.id === zone.id),
      zone,
    );
    assert.deepEqual(g.brutalVolley.cues(), echoes);
    const released: unknown[] = [];
    const emit = Reflect.get(g, "emitShot").bind(g);
    Reflect.set(g, "emitShot", (...args: unknown[]) => {
      if (args[0] === "hostile") released.push(args);
      return emit(...args);
    });
    while (g.combatTick < zone.at) g.step();
    assert.deepEqual(
      g.fields.find((q) => q.id === zone.id),
      {
        id: zone.id,
        owner: "hostile",
        kind: "zone",
        x: zone.x,
        y: zone.y,
        radius: zone.radius,
        until: zone.until,
        potency: zone.damage,
      },
    );
    while (g.combatTick < Math.max(zone.until, ...echoes.map((q) => q.at)))
      g.step();
    assert(!g.fields.some((q) => q.id === zone.id));
    assert.equal(g.brutalVolley.cues().length, 0);
    assert.equal(
      released.length,
      echoes.reduce((n, q) => n + q.angles.length, 0),
    );
  }
});

test("common Brutal/Crazed arena pressure keeps its exact warning geometry and lifetime when the phase changes", () => {
  for (const form of ["brutal", "crazed"] as const) {
    const g = game("constable", "normal", form);
    until(g, () => g.variantPressure.cues().length > 0);
    const q = structuredClone(g.variantPressure.cues()[0]);
    advance(g);
    holdFreshCasts(g);
    assert.deepEqual(
      g.variantPressure.cues().find((p) => p.id === q.id),
      q,
    );
    while (g.combatTick < q.until - 1) {
      g.step();
      assert.deepEqual(
        g.variantPressure.cues().find((p) => p.id === q.id),
        q,
      );
    }
    g.step();
    assert(!g.variantPressure.cues().some((p) => p.id === q.id));
  }
});

test("old glass needles and garden roots remain shootable dependencies when the next phase places a fresh set, and expire after their own beams", () => {
  for (const id of ["glass-surgeon", "plague-gardener"] as const) {
    const d = new ServiceDirector();
    d.reset(id, true);
    let serial = 0;
    const c: SignatureContext = {
      tick: 0,
      bossId: id,
      boss: { x: 800, y: 250 },
      radius: 58,
      targets: [{ id: "a", x: 800, y: 700, oldX: 800, oldY: 700 }],
      bounds: { x: 0, y: 0, width: 1600, height: 1000 },
      obstacles: [],
      damageScale: 1,
      phase: 0,
      brutal: false,
      id: () => ++serial,
      damage: () => {},
      spawnRat: () => {},
    };
    const attack = data.bosses.find((b) => b.id === id)!.phases[0]
      .attacks[0] as ServiceAttack;
    d.cast(c, c.targets[0], attack);
    const old = d.cues(),
      weak = d.weakPoints()[0];
    assert(weak);
    c.phase = 1;
    c.tick = 45;
    d.cast(c, c.targets[0], attack);
    assert(old.every((q) => d.cues().some((p) => p.id === q.id)));
    const fresh = new Set(
      d
        .weakPoints()
        .filter((p) => !old.some((q) => q.id === p.id))
        .map((p) => p.id),
    );
    assert(fresh.size);
    assert(d.hit(weak.id, 1e6, c.tick) > 0);
    d.step(c);
    const oldConnected = old.filter(
      (q) => q.kind === "service-beam" && q.dependencies.includes(weak.id),
    );
    assert(oldConnected.length);
    for (const q of oldConnected) {
      const p = d.cues().find((p) => p.id === q.id);
      assert(p && p.kind === "service-beam");
      assert(p.disabled || p.cutAt > 0);
    }
    assert(d.weakPoints().some((p) => fresh.has(p.id)));
    for (c.tick++; c.tick <= 300; c.tick++) d.step(c);
    assert(
      !d
        .cues()
        .some(
          (q) =>
            q.kind === "service-prop" &&
            (q.role === "needle" || q.role === "root"),
        ),
    );
  }
});

test("Mold pool contact inflicts the same real health loss and keeps its hit budget across a Normal phase transition", () => {
  const a = game("alchemist"),
    b = game("alchemist");
  until(a, () =>
    a.bossCues().some((q) => q.kind === "mold-pool" && q.reagent === "acid"),
  );
  while (b.combatTick < a.combatTick) b.step();
  const pool = a
    .bossCues()
    .find((q) => q.kind === "mold-pool" && q.reagent === "acid");
  assert(pool && pool.kind === "mold-pool");
  for (const g of [a, b]) {
    const p = g.players.get("solo")!;
    p.x = p.oldX = pool.x;
    p.y = p.oldY = pool.y;
    p.invulnerableUntil = 0;
    holdFreshCasts(g);
  }
  const before = a.players.get("solo")!.damageTaken;
  const threshold = encounterPhases(b.boss.id, b.boss.variant)[1]
    .healthThreshold;
  b.boss.health = b.boss.maxHealth * (threshold - 0.001);
  for (let n = 0; n < 16; n++) {
    a.step();
    b.step();
    assert.equal(
      b.players.get("solo")!.damageTaken,
      a.players.get("solo")!.damageTaken,
    );
  }
  assert(a.players.get("solo")!.damageTaken > before);
  assert.equal(b.boss.phase, 1);
});

test("retained pools, currents, gates, wind and moving blocks remain on the shared authority/prediction path", () => {
  for (const [id, kind] of [
    ["alchemist", "mold-pool"],
    ["sluice-keeper", "service-current"],
    ["gate-widow", "gate"],
    ["ragpicker-kite", "early-lane"],
    ["walking-district", "endless-prop"],
  ] as const) {
    const g = game(id);
    until(g, () =>
      g
        .bossCues()
        .some(
          (q) => q.kind === kind && "until" in q && q.until > g.combatTick + 5,
        ),
    );
    const q = g.bossCues().find((q) => q.kind === kind)!;
    advance(g);
    assert(g.bossCues().some((p) => p.kind === q.kind && p.id === q.id));
    const p = g.players.get("solo")!;
    if (q.kind === "mold-pool") {
      p.x = q.x;
      p.y = q.y;
    }
    if (q.kind === "service-current") {
      p.x = q.x + q.width / 2;
      p.y = q.y + q.height / 2;
    }
    const prediction = new Prediction();
    prediction.acknowledge(viewOf(g, "solo"), "solo");
    for (let sequence = 1; sequence <= 45; sequence++) {
      const input = { ...idleInput(), sequence, moveX: 0.4, moveY: 0.3 };
      prediction.submit(input, viewOf(g, "solo"));
      g.submitInput("solo", input);
      g.step();
      assert(Math.abs(prediction.player!.x - p.x) < 1e-6, id + " x");
      assert(Math.abs(prediction.player!.y - p.y) < 1e-6, id + " y");
    }
  }
});

test("phase entry retains living Matron minions and old/new cues keep unique IDs", () => {
  const g = game("matron", "normal", "crazed");
  until(g, () => g.minions.actors.size > 0);
  const actors = [...g.minions.actors.keys()];
  advance(g);
  assert(actors.every((id) => g.minions.actors.has(id)));
  for (let n = 0; n < 600; n++) {
    g.step();
    const cues = g.bossCues();
    assert.equal(new Set(cues.map((q) => q.id)).size, cues.length);
    assert(cues.every((q) => Number.isSafeInteger(q.id)));
    assert(g.minions.actors.size <= data.rules.maximumMinions);
  }
  const d = g.director.services.matron;
  assert((Reflect.get(d, "emitted") as Set<number>).size <= d.cues().length);
  assert(
    (Reflect.get(d, "broodSpeeds") as Map<number, number>).size <=
      d.cues().length,
  );
});

test("Baby/Easy phase entry keeps attacks, whereas completing the warned shield channel still earns an interruption", () => {
  for (const difficulty of ["baby", "easy"]) {
    const g = game("constable", difficulty);
    until(g, () => g.warnings.length > 0);
    const ids = g.warnings.map((q) => q.id);
    advance(g);
    assert(g.accord);
    assert(ids.every((id) => g.warnings.some((q) => q.id === id)));
    const lastCast = g.boss.castAt,
      p = g.players.get("solo")!;
    p.x = g.accord.points[0].x;
    p.y = g.accord.points[0].y;
    const channel = g.accord.channelTicks;
    assert.equal(channel, Math.ceil((difficulty === "baby" ? 2 : 3) * HZ));
    for (let n = 0; n < channel; n++) {
      g.step();
      if (!g.accords) assert.equal(g.boss.castAt, lastCast);
    }
    assert.equal(g.accords, 1);
    assert.equal(g.warnings.length, 0);
    assert.equal(g.brutalVolley.cues().length, 0);
    assert(![...g.shots.values()].some((q) => q.owner === "hostile"));
    assert(!g.fields.some((q) => q.owner === "hostile"));
    assert(g.boss.staggerUntil > g.combatTick);
  }
});

test("boss defeat clears carried cues, warnings, shots, minions and hit ownership for every executing identity", () => {
  for (const boss of data.bosses) {
    const g = game(boss.id as BossId, "normal", "crazed");
    until(
      g,
      () =>
        g.warnings.length > 0 ||
        g.bossCues().length > 0 ||
        g.signatures.length > 0,
    );
    advance(g);
    g.boss.health = 0;
    g.step();
    assert.notEqual(g.phase, "combat");
    assert.equal(g.bossCues().length, 0, boss.id);
    assert.equal(g.signatures.length, 0);
    assert.equal(g.warnings.length, 0);
    assert.equal(g.shots.size, 0);
    assert.equal(g.fields.length, 0);
    assert.equal(g.minions.actors.size, 0);
  }
});

test("Matron nest replacement never revokes a warned brood/needle and retained spawn/hit records stay bounded over repeated cycles", () => {
  const f = fixture(MatronWard, "matron", "crazed", 3);
  for (let tick = 0; tick < 6000; tick++) {
    const pending = f.d
      .cues()
      .filter(
        (q) =>
          (q.kind === "matron-brood" || q.kind === "matron-needles") &&
          q.at > f.c.tick + 1,
      );
    f.step();
    const cues = f.d.cues();
    for (const q of pending)
      assert(
        cues.some((p) => p.id === q.id),
        "Nest replacement erased warning " + q.id,
      );
    assert(cues.filter((q) => q.kind === "service-prop").length <= 3);
    assert(
      (Reflect.get(f.d, "broodSpeeds") as Map<number, number>).size <=
        cues.filter((q) => q.kind === "matron-brood").length,
    );
    assert(
      (Reflect.get(f.d, "emitted") as Set<number>).size <=
        cues.filter(
          (q) => q.kind === "matron-brood" || q.kind === "matron-needles",
        ).length,
    );
  }
});
