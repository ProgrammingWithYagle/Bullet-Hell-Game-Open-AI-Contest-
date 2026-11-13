import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import {
  idleInput,
  HZ,
  DT,
  CONTENT_REVISION,
  type InputFrame,
  type Shot,
} from "../src/shared/protocol.ts";
import {
  sniperIds as ids,
  sniperRules as r,
  sniperBoreRules as br,
} from "../src/shared/soldier-sniper.ts";
import { sniperCoverExit } from "../src/shared/soldier-sniper-bore-geometry.ts";
import {
  advanceSniperBore,
  type BoreFlight,
  type BoreFlightContext,
} from "../src/shared/soldier-sniper-bore-flight.ts";
import { segmentCircle } from "../src/shared/geometry.ts";
import { motionAt } from "../src/shared/motion-window.ts";
import { runtimeArena } from "../src/shared/arena-layouts.ts";
import {
  sniperSample,
  isSniperSound,
} from "../src/client/soldier-sniper-sound.ts";
let serial = 0;
const buy = (g: Game, p: string, item: string) => {
  const result = g.transact(p, { id: "bore-" + ++serial, kind: "skill", item });
  assert(result.ok, item + ":" + result.reason);
};
// Controlled authority fixtures isolate material/body/time contracts. They are not natural runs or online proof.
function fixture(handling?: "carry" | "clear") {
  const g = new Game({
      mode: "raid",
      difficulty: "normal",
      seed: 41,
      maxPlayers: 2,
      arenaSelection: "fixed",
      openingArenaId: "gatehouse",
    }),
    p = g.addPlayer("solo", "Mara", "soldier"),
    ally = g.addPlayer("ally", "Perrin", "medic");
  assert.equal(p.totalSp, 12);
  for (const item of [
    "soldier-ballistics-1",
    ids.entry,
    ...(handling ? [ids[handling]] : []),
    ids.bore,
  ])
    buy(g, p.id, item);
  assert(g.start());
  g.boss.id = "constable";
  (g as any).director.reset("constable");
  g.boss.x = 1200;
  g.boss.y = 600;
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.deadline = g.boss.staggerUntil = 1e9;
  Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
  g.arena.obstacles.length = 0;
  g.arena.lavaPits.length = 0;
  p.x = p.oldX = 600;
  p.y = p.oldY = 600;
  ally.x = ally.oldX = 1400;
  ally.y = ally.oldY = 900;
  g.drainEvents();
  let sequence = 0;
  const step = (input: Partial<InputFrame> = {}) => {
      assert(
        g.submitInput(p.id, {
          ...idleInput(),
          sequence: ++sequence,
          aim: 0,
          ...input,
        }),
      );
      g.step();
    },
    until = (tick: number) => {
      let count = 0;
      while (g.combatTick < tick) {
        assert(++count < 400);
        step();
      }
    },
    kit = () => g.kitStatus(p.id),
    shots = () => [...g.shots.values()].filter((s) => g.sniper.has(s.id)),
    prepare = () => {
      step({ technique1: true });
      assert(kit().sniperPrepared);
      until(kit().sniperReadyAt!);
    },
    release = () => {
      prepare();
      step({ technique2: true });
      return shots()[0];
    };
  return { g, p, ally, step, until, kit, shots, prepare, release };
}
test("Bore Through is an acquired eleven-earned operation, affordable through three real Raid purchases and optional handling", () => {
  const g = new Game({ mode: "endless" });
  g.encounter = 2;
  const p = g.addPlayer("p", "Mara", "soldier");
  assert.equal(p.totalSp, 8);
  for (const item of ["soldier-ballistics-1", ids.entry]) buy(g, p.id, item);
  assert.equal(
    g.transact(p.id, { id: "not-eleven", kind: "skill", item: ids.bore }).ok,
    false,
  );
  const f = fixture();
  assert.equal(
    f.p.skills.reduce((n, id) => n + f.g.skillCost(id), 0),
    6,
  );
  const node = data.specializationSkills.find((s) => s.id === ids.bore)!;
  assert.equal(node.prerequisite, ids.entry);
  assert.equal(node.freePlaySpRequired, 11);
  assert.equal(node.capstone, false);
  assert.equal(node.role, "active");
});
test("plain entry plus Bore retains one full General capstone in27SP; a handling fork requires another legal budget", () => {
  for (const handling of [undefined, "carry", "clear"] as const) {
    const g = new Game({ mode: "endless" });
    g.encounter = 9;
    const p = g.addPlayer("solo", "Mara", "soldier");
    for (const item of [
      "soldier-ballistics-1",
      ids.entry,
      ...(handling ? [ids[handling]] : []),
      ids.bore,
    ])
      buy(g, p.id, item);
    for (let n = 1; n <= (handling ? 5 : 6); n++)
      buy(g, p.id, "soldier-command-" + n);
    if (handling) {
      buy(g, p.id, "general-sprint");
      assert.equal(
        p.skills.reduce((n, id) => n + g.skillCost(id), 0),
        26,
      );
      assert.equal(
        g.transact(p.id, {
          id: "over-budget",
          kind: "skill",
          item: "soldier-command-6",
        }).ok,
        false,
      );
    } else {
      assert.equal(
        p.skills.reduce((n, id) => n + g.skillCost(id), 0),
        27,
      );
      assert.equal(
        p.skills.filter((id) =>
          data.skills.some((s) => s.id === id && s.capstone),
        ).length,
        1,
      );
    }
  }
});
test("B alone never prepares or spends a round; an early B release retains the paid opportunity and clocks", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.step({ technique2: true });
  assert(!f.kit().sniperPrepared);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperRecoveryAt, 0);
  f.step({ technique1: true });
  const q = f.kit();
  f.step({ technique2: true });
  assert(f.kit().sniperPrepared);
  assert.equal(f.kit().sniperUntil, q.sniperUntil);
  assert.equal(f.kit().sniperRecoveryAt, q.sniperRecoveryAt);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.kit().sniperShotAt, 0);
});
test("a settled B uses the last already reserved magazine round without another payment or recovery", () => {
  const f = fixture();
  f.p.ammo = 1;
  f.prepare();
  const at = f.kit().sniperRecoveryAt;
  f.step({ technique2: true });
  assert.equal(f.p.ammo, 0);
  assert.equal(f.shots().length, 1);
  assert(
    Math.abs(f.shots()[0].damage - br.damage * f.g.stats(f.p).ability) < 1e-9,
  );
  assert.equal(f.kit().sniperRecoveryAt, at);
  assert(!f.kit().sniperPrepared);
  assert(f.kit().sniperShotAt! > 0);
});
test("simultaneous C/B releases preserve direct C priority and cannot manufacture a second physical round", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.prepare();
  f.step({ technique1: true, technique2: true });
  assert.equal(f.shots().length, 1);
  assert(
    Math.abs(f.shots()[0].damage - r.damage * f.g.stats(f.p).ability) < 1e-9,
  );
  assert.equal(f.p.ammo, ammo - 1);
  assert(!f.kit().sniperPrepared);
});
test("B spends real tick travel inside cover and emits contact only after physically emerging", () => {
  const f = fixture(),
    wall = { x: 620, y: 500, width: 40, height: 200 };
  f.g.arena.obstacles.push(wall);
  f.prepare();
  const until = f.kit().sniperUntil,
    at = f.kit().sniperRecoveryAt;
  f.step({ technique2: true });
  const s = f.shots()[0];
  assert(s);
  assert(Math.abs(s.x - (600 + r.speed * DT)) < 1e-9);
  assert(s.x < 663);
  assert(Math.abs(s.damage - br.damage) < 1e-9);
  assert(!f.g.classCues().some((c) => c.kind === "soldier-puncture"));
  f.step();
  assert(f.g.shots.has(s.id));
  assert(Math.abs(s.x - (600 + 2 * r.speed * DT)) < 1e-9);
  assert.equal(s.damage, br.damage * br.impactAfterCover);
  const cue = f.g.classCues().find((c) => c.kind === "soldier-puncture")!;
  assert.equal(cue.kind, "soldier-puncture");
  if (cue.kind === "soldier-puncture") {
    assert.equal(cue.x, 617);
    assert.equal(cue.exitX, 663);
    assert.equal(cue.until - cue.at, Math.ceil(br.cueSeconds * HZ));
    for (const key of [
      "reserved",
      "weapon",
      "damage",
      "fireLatch",
      "bore",
      "passed",
      "tunnel",
    ])
      assert(!(key in cue));
  }
  assert.equal(f.kit().sniperRecoveryAt, at);
  assert(until! > f.g.combatTick);
});
test("the first body before material stops B without crossing or body piercing", () => {
  const f = fixture();
  f.g.boss.x = 740;
  f.g.arena.obstacles.push({ x: 800, y: 500, width: 40, height: 200 });
  const before = f.g.boss.health,
    s = f.release();
  assert(s);
  for (let n = 0; n < 8 && f.g.shots.has(s.id); n++) f.step();
  assert(f.g.boss.health < before);
  assert(!f.g.shots.has(s.id));
  assert(!f.g.classCues().some((c) => c.kind === "soldier-puncture"));
});
test("a body after emergence receives the remaining impact and the actual firing origin even if its owner then moves", () => {
  const f = fixture();
  f.g.boss.x = 740;
  f.g.arena.obstacles.push({ x: 620, y: 500, width: 40, height: 200 });
  let origin: any,
    impact = 0;
  const original = (f.g as any).hitBoss.bind(f.g);
  (f.g as any).hitBoss = (
    p: any,
    damage: number,
    ignore: boolean,
    point: any,
  ) => {
    origin = { ...point };
    impact = damage;
    return original(p, damage, ignore, point);
  };
  const before = f.g.boss.health,
    s = f.release();
  assert(s);
  f.p.x = f.p.oldX = 500;
  for (let n = 0; n < 8 && f.g.shots.has(s.id); n++) f.step();
  assert(!f.g.shots.has(s.id));
  assert(f.g.boss.health < before);
  assert.deepEqual(origin, { x: 600, y: 600 });
  assert(Math.abs(impact - br.damage * br.impactAfterCover) < 1e-9);
});
test("deep masonry blocks B at its actual entrance without an emergence or a free round", () => {
  const f = fixture(),
    ammo = f.p.ammo;
  f.g.arena.obstacles.push({ x: 620, y: 500, width: 100, height: 200 });
  f.prepare();
  const at = f.kit().sniperRecoveryAt;
  f.step({ technique2: true });
  assert.equal(f.shots().length, 0);
  assert.equal(f.p.ammo, ammo - 1);
  assert.equal(f.kit().sniperRecoveryAt, at);
  assert(!f.g.classCues().some((c) => c.kind === "soldier-puncture"));
  assert(
    f.g.drainEvents().some((e) => e.type === "remove" && e.ids.length > 0),
  );
});
test("a second solid blocks the same actual B flight after its one real crossing", () => {
  const f = fixture();
  f.g.arena.obstacles.push(
    { x: 620, y: 500, width: 20, height: 200 },
    { x: 690, y: 500, width: 20, height: 200 },
  );
  const s = f.release();
  assert(s);
  f.step();
  assert(!f.g.shots.has(s.id));
  assert(f.g.classCues().some((c) => c.kind === "soldier-puncture"));
  assert.equal(f.g.boss.health, f.g.boss.maxHealth);
});
test("an overlapping different solid stops an interior B before emergence", () => {
  const f = fixture();
  f.g.arena.obstacles.push(
    { x: 620, y: 500, width: 40, height: 200 },
    { x: 640, y: 510, width: 40, height: 180 },
  );
  f.prepare();
  f.step({ technique2: true });
  assert.equal(f.shots().length, 0);
  assert(!f.g.classCues().some((c) => c.kind === "soldier-puncture"));
  assert.equal(f.g.boss.health, f.g.boss.maxHealth);
});
test("world bounds inside material stop B before it can emerge beyond the arena", () => {
  const f = fixture();
  f.g.arena.bounds.x = 580;
  f.g.arena.bounds.width = 70;
  f.g.arena.obstacles.push({ x: 620, y: 500, width: 40, height: 200 });
  const s = f.release();
  assert(s);
  f.step();
  assert(!f.g.shots.has(s.id));
  assert(!f.g.classCues().some((c) => c.kind === "soldier-puncture"));
});
test("B release into a full actual friendly pool retains its paid preparation and can still be retried before the original deadline", () => {
  const f = fixture();
  f.prepare();
  while (f.g.shots.size < 6000)
    (f.g as any).emitShot(f.ally.id, 1400, 900, 0, 0, 1, 1, 0, 20);
  const before = f.kit(),
    ammo = f.p.ammo;
  assert.equal(f.g.sniper.bore(f.p, (f.g as any).sniperContext()), false);
  assert.equal(f.p.ammo, ammo);
  assert.equal(f.kit().sniperUntil, before.sniperUntil);
  assert.equal(f.kit().sniperRecoveryAt, before.sniperRecoveryAt);
  assert(f.kit().sniperPrepared);
  assert.equal(f.shots().length, 0);
});
for (const handling of ["carry", "clear"] as const)
  test(
    handling +
      " remains an actual optional handling around the acquired B operation",
    () => {
      const f = fixture(handling),
        ammo = f.p.ammo;
      f.prepare();
      const at = f.kit().sniperRecoveryAt,
        until = f.kit().sniperUntil;
      if (handling === "carry") {
        f.step({ moveY: 1, technique2: true });
        assert(f.kit().sniperPrepared);
        assert.equal(f.shots().length, 0);
        assert.equal(f.kit().sniperUntil, until);
        f.until(f.kit().sniperReadyAt!);
        f.step({ technique2: true });
        assert.equal(f.shots().length, 1);
        assert.equal(f.p.ammo, ammo - 1);
      } else {
        f.step({ reload: true, technique2: true });
        assert(!f.kit().sniperPrepared);
        assert.equal(f.shots().length, 0);
        assert.equal(f.p.ammo, ammo);
        assert.equal(f.p.reloadAt, 0);
      }
      assert.equal(f.kit().sniperRecoveryAt, at);
    },
  );
for (const reason of ["bore", "disconnect", "weapon", "down", "host"] as const)
  test(
    reason +
      " loss removes an actual interior B flight without returning its payment",
    () => {
      const f = fixture(),
        ammo = f.p.ammo;
      f.g.arena.obstacles.push({ x: 620, y: 500, width: 40, height: 200 });
      const s = f.release();
      assert(s);
      const id = s.id,
        at = f.kit().sniperRecoveryAt;
      if (reason === "bore") {
        f.p.skills = f.p.skills.filter((s) => s !== ids.bore);
        f.step();
      } else if (reason === "disconnect") f.g.setConnected(f.p.id, false);
      else if (reason === "weapon") {
        f.p.weapon = "soldier-1";
        f.step();
      } else if (reason === "down") {
        f.p.invulnerableUntil = 0;
        f.p.shield = 0;
        f.g.damage(f.p, 1e6);
      } else f.g.endByHost();
      assert(!f.g.shots.has(id));
      assert.equal(f.p.ammo, ammo - 1);
      if (reason !== "host") assert.equal(f.kit().sniperRecoveryAt, at);
      assert(
        f.g
          .drainEvents()
          .some((e) => e.type === "remove" && e.ids.includes(id)),
      );
      assert(!f.g.classCues().some((c) => c.kind === "soldier-puncture"));
    },
  );
test("exact issued63 restores legal handling/General ownership but excludes future Bore and online envelopes", () => {
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("solo", "Mara", "soldier");
  for (const item of [
    "soldier-ballistics-1",
    ids.entry,
    ids.carry,
    "general-sprint",
  ])
    buy(g, p.id, item);
  const save = {
      ...g.offlineCheckpoint()!,
      protocolVersion: 63,
      contentRevision:
        "ab9c05008157f8aa069f47c7f23cb022622f0d0ef6be51424ae5ce2b91cc6230",
    },
    copy = Game.restoreOffline(structuredClone(save));
  assert.deepEqual(copy.players.get("solo")!.skills, p.skills);
  assert.equal(copy.offlineCheckpoint()!.contentRevision, CONTENT_REVISION);
  const future = structuredClone(save);
  future.player.skills.push(ids.bore);
  assert.throws(() => Game.restoreOffline(future), /versionMismatch/);
  for (const patch of [
    { protocolVersion: 62 },
    { protocolVersion: 64 },
    { practiceOnly: false },
    { serverOnly: true },
  ])
    assert.throws(
      () => Game.restoreOffline({ ...save, ...patch }),
      /versionMismatch/,
    );
});
test("narrow-cover geometry measures the actual padded ray, including oblique and corner exits", () => {
  const wall = { x: 100, y: 0, width: 40, height: 200 };
  assert.deepEqual(
    sniperCoverExit({ x: 97, y: 100 }, { x: 1, y: 0 }, wall, 3, 46),
    { x: 143, y: 100, distance: 46 },
  );
  assert.equal(
    sniperCoverExit({ x: 97, y: 100 }, { x: 1, y: 0 }, wall, 3, 45),
    undefined,
  );
  assert.equal(
    sniperCoverExit(
      { x: 97, y: 100 },
      { x: 1, y: 1 },
      { ...wall, width: 60, height: 400 },
      3,
      68,
    ),
    undefined,
  );
  const corner = sniperCoverExit(
    { x: 97, y: 196 },
    { x: 1, y: 1 },
    { x: 100, y: 100, width: 400, height: 100 },
    3,
    68,
  )!;
  assert(Math.abs(corner.y - 203) < 1e-9);
  assert(Math.abs(corner.distance - 7 * Math.SQRT2) < 1e-9);
  assert.equal(
    sniperCoverExit({ x: 90, y: 100 }, { x: 1, y: 0 }, wall, 3, 68),
    undefined,
  );
  assert.equal(
    sniperCoverExit({ x: 97, y: 100 }, { x: 0, y: 0 }, wall, 3, 68),
    undefined,
  );
});
test("each real Normal map offers at least one actual narrow section within the depth budget", () => {
  for (const a of data.arenas) {
    const arena = runtimeArena(a.id, "normal");
    assert(
      arena.obstacles.some((w) => {
        const horizontal = w.width <= w.height,
          from = horizontal
            ? { x: w.x - r.radius, y: w.y + w.height / 2 }
            : { x: w.x + w.width / 2, y: w.y - r.radius };
        return !!sniperCoverExit(
          from,
          horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 },
          w,
          r.radius,
          br.coverDepth,
        );
      }),
      a.id,
    );
  }
});
test("post-emergence collision uses the remaining moving-body interval rather than reusing the whole tick", () => {
  const s = {
      id: 1,
      owner: "solo",
      x: 600,
      y: 600,
      vx: r.speed,
      vy: 0,
      damage: br.damage,
      radius: r.radius,
      expires: 100,
    } as Shot,
    f: BoreFlight = { available: true },
    wall = { x: 620, y: 500, width: 40, height: 200 },
    bounds = { x: 100, y: 100, width: 1400, height: 800 };
  let tick = 1,
    controlWouldHit = false,
    calls = 0;
  const previous = { x: 680, y: 580 },
    current = { x: 680, y: 650 },
    body = (from: any, to: any, a: any, b: any) =>
      segmentCircle(
        { x: from.x - a.x, y: from.y - a.y },
        { x: to.x - b.x, y: to.y - b.y },
        { x: 0, y: 0 },
        11,
      );
  const c: BoreFlightContext = {
    bounds,
    obstacles: [wall],
    maximum: br.coverDepth,
    impactAfterCover: br.impactAfterCover,
    crossed: () => {},
    hit: (from, to, limit, window) => {
      if (tick === 1) return false;
      calls++;
      const a = motionAt(previous, current, window.from),
        b = motionAt(previous, current, window.to),
        hit = body(from, to, a, b),
        wrong = body(from, to, previous, current);
      controlWouldHit = wrong !== null && wrong <= limit;
      assert(
        Math.abs(window.from - (663 - (600 + r.speed * DT)) / (r.speed * DT)) <
          1e-9,
      );
      return hit !== null && hit <= limit;
    },
  };
  assert(advanceSniperBore(s, f, c));
  tick = 2;
  assert(advanceSniperBore(s, f, c));
  assert.equal(calls, 1);
  assert(
    controlWouldHit,
    "the fixture must reject the incorrect full-tick reuse",
  );
  assert(Math.abs(s.x - (600 + 2 * r.speed * DT)) < 1e-9);
});
test("B report is a finite distinct native waveform without a loop", () => {
  assert(isSniperSound("sniper-bore"));
  for (const rate of [22050, 44100, 48000]) {
    const values = Array.from({ length: Math.ceil(rate * 0.2) }, (_, i) =>
      sniperSample("sniper-bore", i / rate),
    );
    assert(values.every(Number.isFinite));
    assert(values.some((v) => Math.abs(v) > 0.01));
    assert(Math.max(...values.map(Math.abs)) <= 0.5);
    assert(values[0] === 0 && values.at(-1) === 0);
    assert.notDeepEqual(
      values,
      values.map((_, i) => sniperSample("sniper-shot", i / rate)),
    );
  }
});

test("removing an actual solid during the crossing exposes a body in its former material", () => {
  const f = fixture(),
    wall = { x: 620, y: 500, width: 40, height: 200 };
  f.g.arena.obstacles.push(wall);
  const s = f.release();
  assert(s && s.x < 663);
  const id = s.id,
    director = (f.g as any).director;
  let hits = 0;
  director.weakPoints = () => [
    { kind: "pin", id: 999, x: 655, y: 600, radius: 2, health: 100 },
  ];
  director.hitWeakPoint = () => {
    hits++;
    return 10;
  };
  director.damageTransfer = () => null;
  f.g.arena.obstacles.length = 0;
  f.step();
  assert.equal(
    hits,
    1,
    "the body is in open space now, before the old rectangle exit",
  );
  assert(!f.g.shots.has(id));
  assert.equal(f.g.boss.health, f.g.boss.maxHealth);
});

test("an opened original solid never grants passage through a newly present second solid", () => {
  const f = fixture(),
    wall = { x: 620, y: 500, width: 40, height: 200 };
  f.g.arena.obstacles.push(wall);
  const s = f.release();
  assert(s && s.x < 663);
  const id = s.id,
    director = (f.g as any).director;
  let hits = 0;
  director.weakPoints = () => [
    { kind: "pin", id: 999, x: 655, y: 600, radius: 2, health: 100 },
  ];
  director.hitWeakPoint = () => {
    hits++;
    return 10;
  };
  director.damageTransfer = () => null;
  f.g.arena.obstacles.length = 0;
  f.g.arena.obstacles.push({ x: 650, y: 500, width: 20, height: 200 });
  f.step();
  assert.equal(hits, 0);
  assert(!f.g.shots.has(id));
  assert.equal(f.g.boss.health, f.g.boss.maxHealth);
});
