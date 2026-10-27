import { encounterFrame } from "../src/client/encounter-presentation.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RatcatcherMuster,
  ratcatcherMusterRules,
  type RatMusterCue,
} from "../src/shared/ratcatcher-muster.ts";
import { Minions } from "../src/shared/minions.ts";
import { RatNavigator } from "../src/shared/rat-navigation.ts";
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
  ratcatcherPhaseName,
  ratcatcherPhaseHint,
  ratcatcherHelp,
} from "../src/client/ratcatcher-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { viewOf } from "../src/shared/view.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";

function fixture(advanced = false, phase = 0) {
  const d = new RatcatcherMuster();
  d.reset(true, advanced);
  let id = 0;
  const rats: {
      x: number;
      y: number;
      goal: { x: number; y: number };
      health: number;
      maximum: number;
    }[] = [],
    shots: { x: number; y: number; angle: number; tick: number }[] = [];
  const p = { id: "p", x: 800, y: 750, oldX: 800, oldY: 750 };
  const c: SignatureContext = {
    tick: 0,
    bossId: "ratcatcher",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    aimTargets: [p],
    obstacles: [],
    bounds: { x: 100, y: 100, width: 1300, height: 800 },
    damageScale: 1,
    brutal: advanced,
    phase,
    id: () => ++id,
    damage: () => {},
    spawnRat: (position, goal, _speed, health, _damage, maximum) =>
      rats.push({ ...position, goal: { ...goal }, health, maximum }),
    emitHostile: (position, angle) =>
      shots.push({ ...position, angle, tick: c.tick }),
  };
  d.step(c);
  const step = () => {
    c.tick++;
    d.step(c);
  };
  return { d, c, p, rats, shots, step };
}
const scents = (d: RatcatcherMuster) =>
  d
    .cues()
    .filter(
      (c): c is Extract<RatMusterCue, { kind: "scent" }> => c.kind === "scent",
    );
const whistle = (d: RatcatcherMuster) =>
  d
    .cues()
    .filter(
      (c): c is Extract<RatMusterCue, { kind: "ratcatcher-whistle" }> =>
        c.kind === "ratcatcher-whistle",
    )
    .toSorted((a, b) => b.at - a.at)[0];
function game(form: BossVariant = "normal", phase = 0) {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "ratcatcher",
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

test("opening Ratcatcher locks three harmless scent lanes, spawns four real rats per lane and exposes recovery", () => {
  const f = fixture();
  assert(f.d.cast(f.c, f.p, { speed: 100, damage: 8, telegraph: 1.2 }));
  const lanes = scents(f.d);
  assert.equal(lanes.length, 3);
  assert.equal(lanes[0].at, 36);
  f.p.x = 400;
  while (f.c.tick < 35) {
    f.step();
    assert.deepEqual(scents(f.d), lanes);
    assert.equal(f.rats.length, 0);
    assert.deepEqual(f.c.boss, { x: 800, y: 300 });
  }
  f.step();
  assert.equal(f.rats.length, 12);
  assert(
    f.rats.every(
      (r) =>
        r.health === 12 &&
        r.maximum === 12 &&
        lanes.some((l) => l.x2 === r.goal.x && l.y2 === r.goal.y),
    ),
  );
  while (f.d.busy) f.step();
  assert.equal(f.d.nextSignatureAt - f.c.tick, 1.5 * HZ);
});

test("late phase marks a safe patrol, resolves movement, then locks a complete new warning from its actual stop", () => {
  const f = fixture(false, 2);
  assert(f.d.cast(f.c, f.p, { speed: 116, damage: 8, telegraph: 1.2 }));
  const patrol = f.d.cues().find((c) => c.kind === "ratcatcher-patrol")!;
  assert(patrol.kind === "ratcatcher-patrol");
  assert.equal(patrol.moveAt, Math.ceil(0.65 * HZ));
  assert.equal(scents(f.d).length, 0);
  while (f.c.tick < patrol.moveAt - 1) {
    f.step();
    assert.deepEqual(f.c.boss, { x: 800, y: 300 });
  }
  while (!scents(f.d).length) {
    const old = { ...f.c.boss };
    f.step();
    assert(distance(old, f.c.boss) <= 80 / HZ + 0.01);
    assert(f.c.tick < 300);
  }
  const stopped = { ...f.c.boss },
    lanes = scents(f.d);
  assert(distance(stopped, { x: 800, y: 300 }) > 150);
  assert.equal(lanes[0].at - f.c.tick, 36);
  assert(lanes.every((l) => l.x1 === stopped.x && l.y1 === stopped.y));
  f.p.x = 1100;
  while (f.c.tick < lanes[0].at - 1) {
    f.step();
    assert.deepEqual(f.c.boss, stopped);
    assert.deepEqual(scents(f.d), lanes);
  }
});

test("a new collider stops patrol early and the subsequent warning uses that actual position", () => {
  const f = fixture(false, 2);
  f.d.cast(f.c, f.p, { speed: 116, damage: 8, telegraph: 1.2 });
  const path = f.d.cues().find((c) => c.kind === "ratcatcher-patrol")!;
  assert(path.kind === "ratcatcher-patrol");
  const wallX = (path.x1 + path.x2) / 2;
  f.c.obstacles.push({ x: wallX - 8, y: 200, width: 16, height: 200 });
  while (!scents(f.d).length) {
    f.step();
    assert(f.c.tick < 300);
  }
  assert(distance(f.c.boss, { x: path.x2, y: path.y2 }) > 40);
  assert.equal(scents(f.d)[0].x1, f.c.boss.x);
  assert.equal(scents(f.d)[0].at - f.c.tick, 36);
});

test("pack spawning honors locked lane origins even if an external relocation changes the live boss during the tell", () => {
  const f = fixture();
  f.d.cast(f.c, f.p, { speed: 100, damage: 8, telegraph: 1.2 });
  const lanes = scents(f.d);
  f.c.boss.x += 300;
  while (!f.rats.length) f.step();
  assert(
    f.rats.every((r) => Math.hypot(r.x - lanes[0].x1, r.y - lanes[0].y1) <= 78),
  );
  assert(f.rats.every((r) => r.x < 950));
});

test("intrinsic sack damage cancels the pending/next pack, restores on its exact clock, and never silences advanced whistles", () => {
  for (const before of [false, true]) {
    const f = fixture(true);
    const sack = f.d.sack()!;
    assert.equal(sack.health, 130);
    assert.equal(f.d.hit(9999, 0, sack.id + 9), 0);
    if (before) assert.equal(f.d.hit(9999, 0, sack.id), 130);
    f.d.cast(f.c, f.p, { speed: 100, damage: 8, telegraph: 1.2 });
    if (!before) assert.equal(f.d.hit(9999, 0, sack.id), 130);
    const lanes = scents(f.d);
    assert(lanes.every((l) => l.interrupted));
    while (f.c.tick < lanes[0].at) f.step();
    assert.equal(f.rats.length, 0);
    assert(whistle(f.d));
    while (f.c.tick < lanes[0].at + 3 * HZ - 1) f.step();
    assert.equal(f.d.sack()!.health, 0);
    f.step();
    assert.equal(f.d.sack()!.health, 130);
    assert.equal(f.shots.length, 8);
  }
});

test("the sack follows actual patrol motion and uses relative swept contact without a fictional first-frame origin", () => {
  const f = fixture(false, 2);
  const start = f.d.sack()!;
  assert.equal(start.x, 842);
  assert.equal(start.y, 235);
  assert.equal(
    f.d.weakContact({ x: 800, y: 190 }, { x: 800, y: 190 }, 1),
    null,
  );
  f.d.cast(f.c, f.p, { speed: 116, damage: 8, telegraph: 1.2 });
  while (f.c.tick < 30) f.step();
  const sack = f.d.sack()!;
  assert.notEqual(sack.x, start.x);
  assert.equal(sack.x, f.c.boss.x + 42);
  assert.equal(sack.y, f.c.boss.y - 65);
  assert.equal(
    f.d.weakContact(
      { x: sack.x - 50, y: sack.y },
      { x: sack.x + 50, y: sack.y },
      1,
    ) !== null,
    true,
  );
});

test("advanced opening/late phases release one/two full warned whistle rings with a locked safe gap and rotated second gap", () => {
  for (const phase of [0, 3]) {
    const f = fixture(true, phase);
    f.d.cast(f.c, f.p, { speed: 116, damage: 8, telegraph: 1.2 });
    while (!whistle(f.d)) f.step();
    const first = whistle(f.d)!;
    assert.equal(first.at - f.c.tick, 36);
    assert.equal(first.angles.length, phase ? 12 : 8);
    assert.equal(f.shots.length, 0);
    while (f.c.tick < first.at - 1) {
      f.step();
      assert.deepEqual(whistle(f.d), first);
      assert.equal(f.shots.length, 0);
    }
    f.step();
    assert.equal(f.shots.length, first.angles.length);
    for (const a of first.angles)
      assert(
        Math.abs(
          Math.atan2(Math.sin(a - first.aim), Math.cos(a - first.aim)),
        ) >=
          first.gap / 2 - 1e-10,
      );
    if (phase) {
      const second = whistle(f.d)!;
      assert.equal(second.at - f.c.tick, 36);
      assert(Math.abs(second.aim - first.aim - Math.PI / 3) < 1e-10);
    }
    while (f.d.busy) {
      f.step();
      assert(f.c.tick < 1200);
    }
    assert.equal(f.shots.length, phase ? 12 * 2 : 8);
  }
});

test("rat navigation actually goes around cover and makes contact while ordinary actors retain their previous behavior", () => {
  const m = new Minions(),
    wall = { x: 500, y: 350, width: 110, height: 250 },
    target = { id: "p", x: 750, y: 480, oldX: 750, oldY: 480 };
  let hits = 0;
  for (const [id, kind, y] of [
    [1, "rat", 480],
    [2, "ordinary", 520],
  ] as const)
    m.spawn(
      id,
      { kind, x: 350, y, speed: 125, health: 12, damage: 8, radius: 12 },
      0,
    );
  for (let tick = 0; tick < 400; tick++) {
    const old = { ...m.actors.get(1)! };
    m.step(tick, [target], [wall], () => hits++);
    const rat = m.actors.get(1)!;
    assert(!segmentRect(old, rat, wall, 12));
  }
  assert(hits > 0);
  assert(m.actors.get(1)!.x > 700);
  assert(m.actors.get(2)!.x < 500 - 11);
});

test("rat navigation replaces paths for moved targets/new walls and bounds its corner graph and actor routes", () => {
  const nav = new RatNavigator(),
    obstacles = [{ x: 400, y: 250, width: 100, height: 400 }],
    from = { x: 300, y: 450 },
    target = { x: 800, y: 450 };
  const a = nav.waypoint(1, from, target, obstacles, 12, 0);
  assert(!segmentRect(from, a, obstacles[0], 12));
  assert.notDeepEqual(a, target);
  const moved = { x: 300, y: 800 };
  assert.deepEqual(nav.waypoint(1, from, moved, obstacles, 12, 1), moved);
  obstacles.push({ x: 250, y: 600, width: 100, height: 40 });
  const changed = nav.waypoint(1, from, moved, obstacles, 12, 2);
  assert(!obstacles.some((o) => segmentRect(from, changed, o, 12)));
  const many = Array.from({ length: 40 }, (_, i) => ({
    x: 500 + (i % 8) * 80,
    y: 180 + Math.floor(i / 8) * 130,
    width: 30,
    height: 70,
  }));
  nav.waypoint(2, from, target, many, 12, 3);
  assert(Reflect.get(nav, "graph").nodes.length <= 64);
  nav.remove(2);
  nav.clear();
  assert.equal(Reflect.get(nav, "routes").size, 0);
});

test("actual advanced whistle emissions use the shared 2.5x/7.5x budget while rats retain the twelve-live cap", () => {
  for (const [form, total] of [
    ["brutal", 20],
    ["crazed", 60],
  ] as const) {
    const g = game(form);
    Reflect.set(g, "attackAt", Array(20).fill(1e9));
    const p = g.players.get("solo")!,
      c = Reflect.get(g, "signatureContext").call(g) as SignatureContext;
    g.director.ratcatcher.cast(c, p, { speed: 100, damage: 8, telegraph: 1.2 });
    while (!whistle(g.director.ratcatcher)) g.step();
    const w = whistle(g.director.ratcatcher)!;
    let emitted = 0;
    const original = Reflect.get(g, "emitShot").bind(g);
    Reflect.set(g, "emitShot", (...a: any[]) => {
      if (a[0] === "hostile") emitted++;
      return original(...a);
    });
    while (g.combatTick < w.at + 5 * HZ) {
      g.step();
      assert(g.minions.actors.size <= 12);
    }
    assert.equal(emitted, total);
  }
});

test("all maps/difficulties admit a complete relocated muster with body and sack inside bounds and no masonry crossings", () => {
  let cases = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties) {
      const a = runtimeArena(map.id, difficulty.id),
        f = fixture(false, 2);
      f.c.boss = { ...a.bossSpawn };
      f.c.bounds = a.bounds;
      f.c.obstacles = a.obstacles;
      Object.assign(f.p, a.playerSpawn);
      f.d.cast(f.c, f.p, { speed: 116, damage: 8, telegraph: 1.2 });
      let moved = 0;
      while (f.d.busy && f.c.tick < 1000) {
        const old = { ...f.c.boss };
        f.step();
        moved += distance(old, f.c.boss);
        const sack = f.d.sack()!;
        assert(
          f.c.boss.x >= a.bounds.x + 58 - 0.1 &&
            f.c.boss.x <= a.bounds.x + a.width - 58 + 0.1,
        );
        assert(
          f.c.boss.y >= a.bounds.y + 58 - 0.1 &&
            f.c.boss.y <= a.bounds.y + a.height - 58 + 0.1,
        );
        assert(
          sack.x >= a.bounds.x + 24 - 0.1 &&
            sack.x <= a.bounds.x + a.width - 24 + 0.1,
        );
        assert(sack.y >= a.bounds.y + 24 - 0.1);
        if (distance(old, f.c.boss) > 0.01)
          assert(!a.obstacles.some((o) => segmentRect(old, f.c.boss, o, 58)));
      }
      assert(!f.d.busy);
      assert(moved > 50, map.id + ":" + difficulty.id + " did not relocate");
      cases++;
    }
  assert.equal(cases, 36);
});

test("phase/stagger cancel pending Ratcatcher cues without a free rat clear; encounter exits remove all rats", () => {
  for (const end of ["phase", "stagger", "victory", "timeout", "wipe"]) {
    const g = game("crazed");
    while (!whistle(g.director.ratcatcher)) g.step();
    if (end === "phase") g.boss.health = g.boss.maxHealth * 0.49;
    if (end === "stagger") g.boss.staggerUntil = g.combatTick + 4 * HZ;
    if (end === "victory") g.boss.health = 0;
    if (end === "timeout") g.boss.deadline = g.combatTick + 1;
    if (end === "wipe") g.players.get("solo")!.status = "eliminated";
    g.step();
    assert(!g.director.cues().some((c) => c.kind !== "sack"), end);
    assert(!g.bossCues().some((c) => c.kind === "brutal-echo"));
    assert.equal(
      g.minions.actors.size,
      end === "phase" || end === "stagger" ? 12 : 0,
    );
  }
});

test("fifteen locales and known protocol22 saves/profiles preserve phase help and exact completed form/build history", () => {
  for (const locale of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    assert.equal(
      ratcatcherPhaseName(0, locale.id),
      m["boss.ratcatcher.phase.0"],
    );
    assert.equal(
      ratcatcherPhaseName(1, locale.id),
      m["boss.ratcatcher.phase.1"],
    );
    assert.equal(
      ratcatcherPhaseHint(1, "normal", locale.id),
      m["boss.ratcatcher.phaseHint.1"],
    );
    assert.equal(
      signatureHelp(viewOf(game("crazed"), "solo"), locale.id),
      ratcatcherHelp("crazed", locale.id),
    );
  }
  const g = game("crazed");
  g.boss.health = 0;
  g.step();
  const save = g.offlineCheckpoint()!,
    old = structuredClone(save);
  old.protocolVersion = 22;
  old.contentRevision =
    "9598869248912ad6a787d6e72791183acf4e12d38da92f2a677164f93e3f51c7";
  const migrated = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 31);
  assert.equal(migrated.contentRevision, CONTENT_REVISION);
  assert.deepEqual(migrated.completedBossForms, save.completedBossForms);
  assert.deepEqual(migrated.player, save.player);
  for (const bad of [
    { ...old, contentRevision: "0".repeat(64) },
    { ...old, serverOnly: true },
    { ...old, players: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
  const p = freshProfile();
  p.contentRevision = old.contentRevision;
  assert.deepEqual(
    {
      ...parseProfile(JSON.stringify(p)),
      contentRevision: old.contentRevision,
    },
    p,
  );
  const b = data.bosses.find((b) => b.id === "ratcatcher")!;
  assert.deepEqual(b.signature.parameters.muster, ratcatcherMusterRules);
});

test(
  "real owner/observer rooms replicate the relocated origin, locked whistle gap, phase sound and cancellation",
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
        if (Date.now() > end) throw Error("Ratcatcher room did not replicate");
        await new Promise((r) => setTimeout(r, 15));
      }
    };
    try {
      const options = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "ratcatcher" as const,
      };
      await owner.connect(options);
      await observer.connect(
        { ...options, name: "Observer" },
        { roomId: owner.room!.roomId },
      );
      await until(() => owner.view?.players.length === 2);
      owner.start();
      await until(
        () => observer.view?.phase === "combat" && sounds.every((n) => n === 1),
      );
      const g = liveRooms.get(owner.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      g.boss.health = g.boss.maxHealth * 0.49;
      await until(
        () => observer.view?.boss.phase === 1 && sounds.every((n) => n === 2),
      );
      Reflect.set(g, "attackAt", [g.combatTick, 1e9]);
      await until(
        () =>
          observer.view?.bossCues.some((c) => c.kind === "ratcatcher-patrol") ??
          false,
      );
      Reflect.set(g, "attackAt", Array(20).fill(1e9));
      let guard = 0;
      while (!whistle(g.director.ratcatcher) && guard++ < 1800) g.step();
      const w = whistle(g.director.ratcatcher)!;
      assert(w);
      await until(() =>
        [owner, observer].every((s) =>
          s.view?.bossCues.some((c) => c.id === w.id),
        ),
      );
      for (const s of [owner, observer])
        assert.deepEqual(
          s.view!.bossCues.find((c) => c.id === w.id),
          w,
        );
      g.boss.health = 0;
      await until(() => observer.view?.phase !== "combat");
      assert(
        !observer.view!.bossCues.some(
          (c) =>
            c.kind === "ratcatcher-patrol" ||
            c.kind === "ratcatcher-whistle" ||
            c.kind === "scent" ||
            c.kind === "brutal-echo",
        ),
      );
    } finally {
      await Promise.allSettled([owner.close(), observer.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);

test("Ratcatcher existing action poses follow each actual whistle warning and release without mutating authority", () => {
  const g = game("brutal", 1);
  Reflect.set(g, "attackAt", Array(20).fill(1e9));
  const p = g.players.get("solo")!,
    c = Reflect.get(g, "signatureContext").call(g) as SignatureContext;
  assert(
    g.director.ratcatcher.cast(c, p, { speed: 116, damage: 8, telegraph: 1.2 }),
  );
  while (!whistle(g.director.ratcatcher)) g.step();
  for (let pass = 1; pass <= 2; pass++) {
    const w = whistle(g.director.ratcatcher)!;
    assert.equal(w.pass, pass);
    while (g.combatTick < w.at) {
      const cues = g.director.cues(),
        before = JSON.stringify(cues),
        frame = encounterFrame(g.boss, g.combatTick, cues);
      assert(frame >= 1 && frame <= 7);
      assert.equal(JSON.stringify(cues), before);
      assert.equal(encounterFrame(g.boss, g.combatTick, cues, true), 0);
      g.step();
    }
    const cues = g.director.cues(),
      release = cues.find(
        (c) => c.kind === "ratcatcher-whistle" && c.id === w.id,
      )!;
    assert(release.kind === "ratcatcher-whistle");
    assert.equal(release.until - release.at, 12);
    assert.equal(encounterFrame(g.boss, g.combatTick, cues), 4);
  }
  while (g.director.ratcatcher.busy) g.step();
  assert.equal(encounterFrame(g.boss, g.combatTick, g.director.cues()), 0);
});

test("rats reach close navigation corners before turning rather than clipping a padded wall", () => {
  const nav = new RatNavigator(),
    wall = { x: 500, y: 350, width: 110, height: 250 };
  const from = { x: 487, y: 340 },
    target = { x: 800, y: 480 };
  const route = nav.waypoint(91, from, target, [wall], 12, 0);
  assert.equal(segmentRect(from, route, wall, 12), null);
  assert(distance(from, route) > 0);
  const m = new Minions();
  m.spawn(
    91,
    { kind: "rat", ...from, speed: 125, health: 12, damage: 8, radius: 12 },
    0,
  );
  for (let tick = 0; tick < 240; tick++) {
    const old = { ...m.actors.get(91)! };
    m.step(tick, [{ id: "p", ...target }], [wall], () => {});
    assert.equal(segmentRect(old, m.actors.get(91)!, wall, 12), null);
  }
  assert(m.actors.get(91)!.x > 700);
});
