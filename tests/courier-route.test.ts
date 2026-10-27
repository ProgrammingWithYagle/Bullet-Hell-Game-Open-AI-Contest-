import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CourierRoute,
  courierRouteRules,
  courierDispatchAngles,
  type CourierCue,
} from "../src/shared/courier-route.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { runtimeArena, runtimeArenas } from "../src/shared/arena-layouts.ts";
import { segmentRect, distance } from "../src/shared/geometry.ts";
import { Game, data } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import {
  HZ,
  PROTOCOL,
  CONTENT_REVISION,
  type BossVariant,
} from "../src/shared/protocol.ts";
import {
  courierPhaseName,
  courierPhaseHint,
  courierHelp,
} from "../src/client/courier-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { viewOf } from "../src/shared/view.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";

function fixture(advanced = false, phase = 0) {
  let id = 0;
  const d = new CourierRoute(),
    hurt: { id: string; amount: number; tick: number }[] = [],
    shots: {
      x: number;
      y: number;
      angle: number;
      damage: number;
      tick: number;
    }[] = [];
  const p = { id: "p", x: 750, y: 400, oldX: 750, oldY: 400 };
  const c: SignatureContext = {
    tick: 0,
    bossId: "courier",
    boss: { x: 300, y: 400 },
    radius: 35,
    targets: [p],
    aimTargets: [p],
    obstacles: [],
    bounds: { x: 100, y: 100, width: 1300, height: 800 },
    damageScale: 1,
    brutal: advanced,
    phase,
    id: () => ++id,
    damage: (id, amount) => hurt.push({ id, amount, tick: c.tick }),
    spawnRat: () => {},
    emitHostile: (pos, angle, _speed, damage) =>
      shots.push({ ...pos, angle, damage, tick: c.tick }),
  };
  const step = () => {
    c.tick++;
    d.step(c);
  };
  assert(d.cast(c, p, { speed: 420, damage: 18, telegraph: 1 }));
  return { d, c, p, hurt, shots, step };
}
function game(form: BossVariant = "normal", phase = 0) {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "courier",
      difficulty: "normal",
      seed: 981,
    },
    "Mara",
    "soldier",
    form,
  );
  assert(g.start());
  g.players.get("solo")!.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  if (phase) {
    g.boss.health = g.boss.maxHealth * 0.49;
    g.step();
    assert.equal(g.boss.phase, 1);
  }
  return g;
}
const route = (d: CourierRoute) =>
  d
    .cues()
    .find(
      (c): c is Extract<CourierCue, { kind: "courier-route" }> =>
        c.kind === "courier-route",
    );
const lane = (d: CourierRoute) =>
  d
    .cues()
    .find(
      (c): c is Extract<CourierCue, { kind: "charge" }> => c.kind === "charge",
    );

test("Courier routes execute one/two Standard legs and two/three advanced legs with explicit recovery", () => {
  for (const advanced of [false, true])
    for (const phase of [0, 2, 3]) {
      const f = fixture(advanced, phase),
        ids = new Set<number>();
      let recovered = false;
      while (f.d.busy && f.c.tick < 1800) {
        const l = lane(f.d);
        if (l) ids.add(l.id);
        recovered ||= route(f.d)?.state === "recovery";
        f.step();
      }
      assert.equal(f.d.busy, false);
      assert(recovered);
      assert.equal(ids.size, (phase ? 2 : 1) + (advanced ? 1 : 0));
      assert.equal(f.shots.length, advanced ? (phase ? 12 : 8) : 0);
      assert.equal(f.d.nextRouteAt - f.c.tick, HZ * 1.5);
      assert.equal(
        f.d.cast(f.c, f.p, { speed: 420, damage: 18, telegraph: 1 }),
        false,
      );
    }
});

test("every charge warning locks its lane and a return starts at the actual wall stop before retargeting", () => {
  const f = fixture(false, 2),
    first = lane(f.d)!;
  const origin = { ...f.c.boss };
  f.p.x = 900;
  f.p.y = 700;
  while (f.c.tick < first.at - 1) {
    f.step();
    assert.deepEqual(lane(f.d), first);
    assert.deepEqual(f.c.boss, origin);
  }
  // A newly introduced collider stops the actual first charge before its warned endpoint.
  f.c.obstacles.push({ x: 510, y: 350, width: 40, height: 100 });
  while (route(f.d)?.state !== "turn") f.step();
  const stopped = { ...f.c.boss };
  assert(stopped.x < 510 - 35 && stopped.x > 460);
  while (!lane(f.d)) f.step();
  const second = lane(f.d)!;
  assert.equal(second.x1, stopped.x);
  assert.equal(second.y1, stopped.y);
  assert.equal(second.at - f.c.tick, Math.ceil(1.1 * HZ));
  assert(second.y2 > second.y1, "return did not read the moved target");
  f.p.x = 200;
  f.p.y = 800;
  while (f.c.tick < second.at - 1) {
    f.step();
    assert.deepEqual(lane(f.d), second);
    assert.deepEqual(f.c.boss, stopped);
  }
  f.step();
  assert(distance(f.c.boss, stopped) > 0);
});

test("moving charge bodies sweep fast crossing players once per leg and keep fading trails authoritative", () => {
  const f = fixture();
  const l = lane(f.d)!;
  f.c.tick = l.at;
  f.p.oldX = f.p.x = 307;
  f.p.oldY = 250;
  f.p.y = 550;
  f.d.step(f.c);
  assert.equal(f.hurt.filter((h) => h.amount === 18).length, 1);
  const t = f.d.cues().find((c) => c.kind === "trail");
  assert(t?.kind === "trail");
  assert.equal(t.width, 32);
  f.p.oldX = f.p.x = f.c.boss.x;
  f.p.oldY = f.p.y = f.c.boss.y;
  f.step();
  assert.equal(f.hurt.filter((h) => h.amount === 18).length, 1);
  while (f.d.charging) f.step();
  f.p.oldX = f.p.x = 1000;
  f.p.oldY = f.p.y = 800;
  while (f.c.tick < l.until + 4 * HZ) f.step();
  assert(!f.d.cues().some((c) => c.kind === "trail"));
});

test("overlapping return trails share one half-second contact budget and detect crossing a narrow trail", () => {
  const f = fixture(false, 2);
  f.c.targets = [];
  // Let both legs finish, aiming the return along its own first trail.
  while (f.d.busy && f.c.tick < 1200) f.step();
  const trails = f.d
    .cues()
    .filter(
      (c): c is Extract<CourierCue, { kind: "trail" }> => c.kind === "trail",
    );
  assert(trails.length >= 1);
  const t = trails.at(-1)!,
    x = (t.x1 + t.x2) / 2,
    y = (t.y1 + t.y2) / 2;
  f.c.targets = [f.p];
  f.hurt.length = 0;
  f.p.oldX = x;
  f.p.oldY = y - 120;
  f.p.x = x;
  f.p.y = y + 120;
  f.step();
  assert.equal(f.hurt.length, 1);
  assert.equal(f.hurt[0].amount, 5);
  f.p.oldX = f.p.x = x;
  f.p.oldY = f.p.y = y;
  for (let n = 0; n < 14; n++) f.step();
  assert.equal(f.hurt.length, 1);
  f.step();
  assert.equal(f.hurt.length, 2);
});

test("advanced dispatch locks actual final origin and angles, waits a full warning and preserves the central gap", () => {
  const f = fixture(true, 2);
  while (!f.d.cues().some((c) => c.kind === "courier-dispatch")) f.step();
  const dispatch = f.d.cues().find((c) => c.kind === "courier-dispatch")!;
  assert(dispatch.kind === "courier-dispatch");
  assert.equal(dispatch.at - f.c.tick, Math.ceil(1.2 * HZ));
  assert.equal(dispatch.x, f.c.boss.x);
  assert.equal(dispatch.y, f.c.boss.y);
  assert.equal(f.shots.length, 0);
  f.p.x = 200;
  f.p.y = 200;
  while (f.c.tick < dispatch.at - 1) {
    f.step();
    assert.deepEqual(
      f.d.cues().find((c) => c.kind === "courier-dispatch"),
      dispatch,
    );
    assert.equal(f.shots.length, 0);
  }
  f.step();
  assert.equal(f.shots.length, 12);
  assert.deepEqual(
    f.shots.map((s) => s.angle),
    dispatch.angles,
  );
  assert(
    f.shots.every(
      (s) => s.x === dispatch.x && s.y === dispatch.y && s.damage === 7,
    ),
  );
  for (const a of dispatch.angles) {
    const delta = Math.abs(
      Math.atan2(Math.sin(a - dispatch.aim), Math.cos(a - dispatch.aim)),
    );
    assert(delta >= dispatch.halfGap - 1e-10);
  }
  const clone = f.d.cues();
  clone.length = 0;
  assert(f.d.busy);
});

test("advanced third delivery rotates to another actual target with a fresh locked warning", () => {
  const f = fixture(true, 2),
    other = { id: "q", x: 200, y: 700, oldX: 200, oldY: 700 };
  f.c.targets.push(other);
  f.c.aimTargets!.push(other);
  while (route(f.d)?.leg !== 3 || route(f.d)?.state !== "warning") f.step();
  const l = lane(f.d)!;
  assert(l.y2 > l.y1);
  assert(l.x2 < l.x1);
  assert.equal(l.at - f.c.tick, Math.ceil(1.1 * HZ));
});

test("Courier complete routes remain inside actual bounds and do not cross masonry on all maps, difficulties and forms", () => {
  let combinations = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties)
      for (const advanced of [false, true])
        for (const phase of [0, 2]) {
          const f = fixture(advanced, phase),
            a = runtimeArena(map.id, difficulty.id);
          f.d.reset();
          f.c.boss = { ...a.bossSpawn };
          f.c.obstacles = a.obstacles;
          f.c.bounds = a.bounds;
          Object.assign(f.p, {
            ...a.playerSpawn,
            oldX: a.playerSpawn.x,
            oldY: a.playerSpawn.y,
          });
          assert(f.d.cast(f.c, f.p, { speed: 600, damage: 18, telegraph: 1 }));
          while (f.d.busy && f.c.tick < 1800) {
            const l = lane(f.d);
            if (l) {
              assert(l.at <= l.until);
              assert(
                !a.obstacles.some((o) => {
                  const hit = segmentRect(
                    { x: l.x1, y: l.y1 },
                    { x: l.x2, y: l.y2 },
                    o,
                    f.c.radius,
                  );
                  return hit !== null;
                }),
              );
            }
            const old = { ...f.c.boss };
            f.step();
            const b = f.c.boss;
            assert(
              b.x >= a.bounds.x + f.c.radius - 0.01 &&
                b.x <= a.bounds.x + a.width - f.c.radius + 0.01,
            );
            assert(
              b.y >= a.bounds.y + f.c.radius - 0.01 &&
                b.y <= a.bounds.y + a.height - f.c.radius + 0.01,
            );
            assert(distance(old, b) <= 600 / HZ + 0.01);
          }
          assert(!f.d.busy, map.id + ":" + difficulty.id);
          combinations++;
        }
  assert.equal(combinations, 144);
});

test("actual Courier attack cadence keeps a clear recovery and retains the existing warned cross volley between routes", () => {
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const g = game(form, 1);
    let cross = false,
      recovery = false,
      routeCount = 0,
      lastId = 0;
    for (let n = 0; n < 1500; n++) {
      g.step();
      const r = route(g.director.courier);
      if (r && r.id !== lastId) {
        lastId = r.id;
        routeCount++;
      }
      recovery ||= r?.state === "recovery";
      cross ||= g.warnings.some((w) => w.kind === "fan");
      assert(g.director.cues().filter((c) => c.kind === "charge").length <= 1);
      if (r)
        assert.equal(
          g.warnings.length,
          0,
          "authored auxiliary cast entered an active route",
        );
    }
    assert(
      recovery && cross && routeCount >= 2,
      form + " lost its cross volley or route cadence",
    );
  }
});

test("the real advanced dispatch uses the shared 2.5x/7.5x projectile wave budget without duplicating route legs", () => {
  for (const [form, total] of [
    ["brutal", 20],
    ["crazed", 60],
  ] as const) {
    const g = game(form);
    Reflect.set(g, "attackAt", Array(20).fill(1e9));
    g.boss.x = 800;
    g.boss.y = 300;
    const p = g.players.get("solo")!;
    p.x = 800;
    p.y = 450;
    const c = Reflect.get(g, "signatureContext").call(g) as SignatureContext;
    assert(
      g.director.courier.cast(c, p, { speed: 420, damage: 18, telegraph: 1 }),
    );
    while (!g.director.cues().some((c) => c.kind === "courier-dispatch"))
      g.step();
    const dispatch = g.director
      .cues()
      .find((c) => c.kind === "courier-dispatch")!;
    assert(dispatch.kind === "courier-dispatch");
    const emitted: number[] = [];
    const original = Reflect.get(g, "emitShot").bind(g);
    Reflect.set(g, "emitShot", (...args: any[]) => {
      if (args[0] === "hostile") emitted.push(args[4]);
      return original(...args);
    });
    while (g.combatTick < dispatch.at + 5 * HZ) g.step();
    assert.equal(emitted.length, total, form + " actual wave emissions");
  }
});

test("phase changes, successful stagger and every encounter exit cancel Courier lanes, trails, dispatch and echoes", () => {
  for (const end of ["phase", "stagger", "victory", "timeout", "wipe"]) {
    const g = game("crazed");
    while (!g.director.cues().some((c) => c.kind === "trail")) g.step();
    if (end === "phase") g.boss.health = g.boss.maxHealth * 0.49;
    if (end === "stagger") g.boss.staggerUntil = g.combatTick + 4 * HZ;
    if (end === "victory") g.boss.health = 0;
    if (end === "timeout") g.boss.deadline = g.combatTick + 1;
    if (end === "wipe") g.players.get("solo")!.status = "eliminated";
    g.step();
    assert(!g.director.cues().length, end + " left route geometry");
    assert(
      !g.bossCues().some((c) => c.kind === "brutal-echo"),
      end + " left echoes",
    );
  }
  const f = fixture(true, 2);
  f.c.paused = true;
  f.step();
  assert.equal(f.d.busy, false);
  assert.deepEqual(f.d.cues(), []);
});

test("fifteen locales bind Courier phase names, persistent response hints and encounter help to the same source", () => {
  const c = data.bosses.find((b) => b.id === "courier")!;
  assert.deepEqual(c.signature.parameters.deliveryRoute, courierRouteRules);
  assert.deepEqual(
    c.phases.map((p) => Reflect.get(p, "deliveryLegs")),
    [1, 2],
  );
  assert.deepEqual(
    c.variants.brutal.phases.map((p) => Reflect.get(p, "deliveryLegs")),
    [2, 3],
  );
  assert.deepEqual(
    c.variants.crazed.phases.map((p) => Reflect.get(p, "deliveryLegs")),
    [2, 3],
  );
  for (const locale of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    assert.equal(courierPhaseName(0, locale.id), m["boss.courier.phase.0"]);
    assert.equal(courierPhaseName(1, locale.id), m["boss.courier.phase.1"]);
    assert.equal(
      courierPhaseHint(1, "normal", locale.id),
      m["boss.courier.phaseHint.1"],
    );
    assert(
      courierPhaseHint(1, "crazed", locale.id).includes(
        m["boss.courier.brutalHelp"],
      ),
    );
    assert.equal(
      signatureHelp(viewOf(game("brutal"), "solo"), locale.id),
      courierHelp("brutal", locale.id),
    );
  }
});

test("issued protocol21 local saves preserve completed Crazed/Brutal forms exactly and reject unknown or online envelopes", () => {
  const g = game("crazed");
  g.players.get("solo")!.coins = 789;
  g.boss.health = 0;
  g.step();
  const save = g.offlineCheckpoint()!;
  assert.equal(save.completedBossForms.courier, "crazed");
  const old = structuredClone(save);
  old.protocolVersion = 21;
  old.contentRevision =
    "312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006";
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 26);
  assert.equal(after.contentRevision, CONTENT_REVISION);
  assert.deepEqual(after.completedBossForms, save.completedBossForms);
  assert.deepEqual(after.player, save.player);
  assert.equal(after.settings.runId, save.settings.runId);
  for (const mutate of [
    (s: any) => (s.contentRevision = "0".repeat(64)),
    (s: any) => (s.serverOnly = true),
    (s: any) => (s.players = []),
    (s: any) => (s.completedBossForms.courier = "invalid"),
  ]) {
    const bad = structuredClone(old);
    mutate(bad);
    assert.throws(() => Game.restoreOffline(bad));
  }
  const b = structuredClone(old);
  b.completedBossForms.courier = "brutal";
  assert.equal(
    Game.restoreOffline(b).offlineCheckpoint()!.completedBossForms.courier,
    "brutal",
  );
  const profile = freshProfile();
  profile.contentRevision = old.contentRevision;
  const migrated = parseProfile(JSON.stringify(profile));
  assert.equal(migrated.contentRevision, CONTENT_REVISION);
  assert.deepEqual(
    { ...migrated, contentRevision: old.contentRevision },
    profile,
  );
});

test(
  "real owner and observer receive actual Courier route/return/dispatch cues and phase sound, then clear them on victory",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const a = httpServer.address();
    assert(a && typeof a === "object");
    const owner = new Session("http://127.0.0.1:" + a.port),
      observer = new Session("http://127.0.0.1:" + a.port),
      sounds = [0, 0];
    for (const [i, s] of [owner, observer].entries())
      s.onEvents = (es) => {
        sounds[i] += es.filter(
          (e) => e.type === "sound" && e.id === "boss-phase",
        ).length;
      };
    const until = async (check: () => boolean) => {
      const end = Date.now() + 6500;
      while (!check()) {
        if (Date.now() > end)
          throw Error("Courier network state did not replicate");
        await new Promise((r) => setTimeout(r, 15));
      }
    };
    try {
      const options = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "courier" as const,
      };
      await owner.connect(options);
      await observer.connect(
        { ...options, name: "Observer" },
        { roomId: owner.room!.roomId },
      );
      await until(() => owner.view?.players.length === 2);
      owner.start();
      await until(() => observer.view?.phase === "combat");
      const g = liveRooms.get(owner.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      await until(() => sounds.every((n) => n === 1));
      g.boss.health = g.boss.maxHealth * 0.49;
      await until(
        () => sounds.every((n) => n === 2) && observer.view?.boss.phase === 1,
      );
      Reflect.set(g, "attackAt", [g.combatTick, 1e9]);
      await until(() =>
        [owner, observer].every((s) =>
          s.view?.bossCues.some((c) => c.kind === "courier-route"),
        ),
      );
      Reflect.set(g, "attackAt", Array(20).fill(1e9));
      const returnLane = () =>
        g.director.cues().find((c) => c.kind === "charge" && c.lane === 2);
      let guard = 0;
      while (!returnLane() && guard++ < 1800) g.step();
      assert(returnLane());
      const l = returnLane()!;
      await until(() =>
        [owner, observer].every((s) =>
          s.view?.bossCues.some((c) => c.id === l.id),
        ),
      );
      for (const s of [owner, observer])
        assert.deepEqual(
          s.view!.bossCues.find((c) => c.id === l.id),
          l,
        );
      guard = 0;
      while (
        !g.director.cues().some((c) => c.kind === "courier-dispatch") &&
        guard++ < 1800
      )
        g.step();
      const d = g.director.cues().find((c) => c.kind === "courier-dispatch")!;
      assert(d);
      await until(
        () => observer.view?.bossCues.some((c) => c.id === d.id) ?? false,
      );
      assert.deepEqual(
        observer.view!.bossCues.find((c) => c.id === d.id),
        d,
      );
      g.boss.health = 0;
      await until(() => observer.view?.phase !== "combat");
      assert(
        !observer.view!.bossCues.some(
          (c) =>
            c.kind === "courier-route" ||
            c.kind === "courier-dispatch" ||
            c.kind === "charge" ||
            c.kind === "trail" ||
            c.kind === "brutal-echo",
        ),
      );
    } finally {
      await Promise.allSettled([owner.close(), observer.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
