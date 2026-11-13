import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, data } from "../src/shared/game.ts";
import {
  ServiceDirector,
  serviceBeamContact,
  type ServiceAttack,
} from "../src/shared/service-director.ts";
import { runtimeArena } from "../src/shared/arena-layouts.ts";
import { moveBody, segmentRect } from "../src/shared/geometry.ts";
import { glassPlan, glassRayEnd } from "../src/shared/glass-surgery.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { CONTENT_REVISION, PROTOCOL } from "../src/shared/protocol.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import {
  glassPhaseName,
  glassPhaseHint,
  glassHelp,
} from "../src/client/glass-text.ts";
const issued =
  "5a4ffd871d1880ccb681aee1faa5e51a664385752977fa7a136b50d44c7c6927";
function fixture(
  phase = 0,
  variant = "normal",
  arenaId = "gatehouse",
  difficulty = "normal",
) {
  const arena = runtimeArena(arenaId, difficulty),
    d = new ServiceDirector(),
    hurt: { id: string; amount: number }[] = [];
  let serial = 0;
  d.reset("glass-surgeon", true);
  const c: SignatureContext = {
    tick: 0,
    bossId: "glass-surgeon",
    boss: { ...arena.bossSpawn },
    radius: 58,
    targets: [
      {
        id: "a",
        ...arena.playerSpawn,
        oldX: arena.playerSpawn.x,
        oldY: arena.playerSpawn.y,
      },
      {
        id: "b",
        x: arena.playerSpawn.x + 100,
        y: arena.playerSpawn.y,
        oldX: arena.playerSpawn.x + 100,
        oldY: arena.playerSpawn.y,
      },
    ],
    bounds: { x: 0, y: 0, width: arena.width, height: arena.height },
    obstacles: arena.obstacles,
    phase,
    variant: variant as any,
    brutal: variant !== "normal",
    damageScale: 1,
    id: () => ++serial,
    damage: (id, amount) => hurt.push({ id, amount }),
    spawnRat: () => {},
  };
  const attack = data.bosses.find((b) => b.id === "glass-surgeon")!.phases[
    Math.min(phase, 2)
  ].attacks[0] as ServiceAttack;
  const cast = () => d.cast(c, c.targets[0], attack),
    step = (tick: number) => {
      c.tick = tick;
      d.step(c);
    };
  return { d, c, hurt, cast, step };
}
const beams = (d: ServiceDirector) =>
  d.cues().filter((q) => q.kind === "service-beam");
const lenses = (d: ServiceDirector) =>
  d.cues().filter((q) => q.kind === "service-prop");
test("all map/difficulty/form/phase combinations keep optical endpoints bounded, lenses shootable and a base-speed escape before release", () => {
  let checked = 0;
  for (const arena of data.arenas)
    for (const difficulty of data.difficulties)
      for (const variant of ["normal", "brutal", "crazed"])
        for (let phase = 0; phase < 4; phase++) {
          const f = fixture(phase, variant, arena.id, difficulty.id),
            a = runtimeArena(arena.id, difficulty.id);
          assert(f.cast());
          const points = lenses(f.d),
            light = beams(f.d);
          assert.equal(points.length, phase === 0 ? 1 : phase === 1 ? 2 : 3);
          for (const p of points) {
            assert(
              p.x >= p.radius &&
                p.x <= a.width - p.radius &&
                p.y >= p.radius &&
                p.y <= a.height - p.radius,
            );
            assert(
              !a.obstacles.some((o) => segmentRect(p, p, o, p.radius) !== null),
            );
            assert(f.d.weakPoints().some((q) => q.id === p.id));
          }
          for (const q of light) {
            assert(q.at - f.c.tick >= 60);
            assert(q.until - q.at >= 37);
            for (const [x, y] of [
              [q.x1, q.y1],
              [q.x2, q.y2],
            ])
              assert(x >= 0 && x <= a.width && y >= 0 && y <= a.height);
            assert(q.dependencies.length > 0);
            assert(
              q.dependencies.every((id) => points.some((p) => p.id === id)),
            );
          }
          let canEscape = false;
          for (let n = 0; n < 24 && !canEscape; n++) {
            let p = { x: f.c.targets[0].x, y: f.c.targets[0].y };
            for (let tick = 0; tick < 60; tick++)
              p = moveBody(
                p,
                {
                  x: (Math.cos((n * Math.PI) / 12) * 180) / 30,
                  y: (Math.sin((n * Math.PI) / 12) * 180) / 30,
                },
                9,
                a.obstacles,
              );
            canEscape = light.every((q) => !serviceBeamContact(p, p, q));
          }
          assert(
            canEscape,
            arena.id + "/" + difficulty.id + "/" + variant + "/" + phase,
          );
          checked++;
        }
  assert.equal(checked, 432);
});
test("lens, relay and fork produce distinct routes whose endpoints stay fixed when survivors move", () => {
  const counts: number[] = [];
  for (let phase = 0; phase < 3; phase++) {
    const f = fixture(phase);
    f.cast();
    const before = beams(f.d);
    counts.push(before.length);
    assert.equal(
      new Set(before.map((q) => [q.index, q.x1, q.y1, q.x2, q.y2].join(":")))
        .size,
      before.length,
    );
    f.c.targets[0].x += 150;
    f.c.targets[0].oldX = f.c.targets[0].x;
    f.step(1);
    assert.deepEqual(beams(f.d), before);
  }
  assert(counts[0] < counts[1] && counts[1] < counts[2]);
  const end = glassRayEnd(
    { x: 500, y: 300 },
    { x: 1000, y: 300 },
    { x: 0, y: 0, width: 1600, height: 1000 },
  );
  assert.deepEqual(end, { x: 1580, y: 300 });
});
test("a shared junction and every segment of one pulse can hurt a survivor only once, including later active ticks", () => {
  const f = fixture(2);
  f.cast();
  const joint = lenses(f.d)[0];
  Object.assign(f.c.targets[0], {
    x: joint.x,
    y: joint.y,
    oldX: joint.x,
    oldY: joint.y,
  });
  f.step(59);
  assert.equal(f.hurt.filter((h) => h.id === "a").length, 0);
  f.step(60);
  assert.equal(f.hurt.filter((h) => h.id === "a").length, 1);
  assert.equal(f.hurt.find((h) => h.id === "a")!.amount, 20);
  for (let t = 61; t < 98; t++) f.step(t);
  assert.equal(f.hurt.filter((h) => h.id === "a").length, 1);
});
test("cutting the shared lens disables every downstream main segment, and old cuts cannot regenerate in a delayed return", () => {
  const f = fixture(0, "crazed");
  f.cast();
  const lens = lenses(f.d)[0];
  assert.equal(f.d.hit(lens.id, 1e6, 1), lens.health);
  assert(beams(f.d).every((q) => q.disabled));
  for (let now = 1; now <= 310; now++) f.step(now);
  assert.equal(f.hurt.length, 0);
  assert.equal(beams(f.d).length, 0);
  assert.equal(lenses(f.d).length, 0);
  const fork = fixture(2);
  fork.cast();
  const b = lenses(fork.d)[1];
  fork.d.hit(b.id, 1e6, 1);
  assert(
    beams(fork.d)
      .filter((q) => q.dependencies.includes(b.id))
      .every((q) => q.disabled),
  );
  assert(
    beams(fork.d).some((q) => !q.dependencies.includes(b.id) && !q.disabled),
  );
});
test("Brutal and Crazed returns start fresh complete warnings, stay separated in time and remain bounded by a quiet cycle", () => {
  const f = fixture(3, "crazed");
  f.cast();
  const main = beams(f.d);
  assert(main.every((q) => q.index === 0));
  const mainEnd = Math.max(...main.map((q) => q.until));
  f.step(98);
  assert(!beams(f.d).length);
  f.step(99);
  const returning = beams(f.d);
  assert(returning.length > 0);
  assert(returning.every((q) => q.at - f.c.tick >= 60));
  assert(returning.every((q) => q.at > mainEnd));
  const returnAt = returning[0].at,
    returnEnd = returning[0].until;
  f.step(171);
  const incision = beams(f.d).filter((q) => q.at > returnAt);
  assert(incision.length > 0);
  assert(incision.every((q) => q.at - f.c.tick >= 60 && q.at > returnEnd));
  assert(f.d.nextSignatureAt >= Math.max(...incision.map((q) => q.until)) + 30);
});
test("stagger/reset and encounter exit cancel delayed optics; harmless movement waits for all optical work and pauses correctly", () => {
  const f = fixture(1, "crazed");
  f.cast();
  const start = { ...f.c.boss };
  f.step(10);
  assert.deepEqual(f.c.boss, start);
  f.d.reset("glass-surgeon");
  for (let t = 11; t < 320; t++) f.step(t);
  assert(!f.d.cues().length);
  assert(!f.hurt.length);
  assert(Math.hypot(f.c.boss.x - start.x, f.c.boss.y - start.y) > 1);
  const g = new Game({ openingBossId: "glass-surgeon", difficulty: "normal" }),
    player = g.addPlayer("solo", "Close observer", "soldier");
  g.start();
  g.combatTick = 31;
  g.boss.deadline = 1e9;
  (g as unknown as { attackAt: number[] }).attackAt = [1e9, 1e9];
  player.x = g.boss.x;
  player.y = g.boss.y;
  player.shield = 0;
  player.invulnerableUntil = 0;
  const health = player.health,
    bossBefore = { x: g.boss.x, y: g.boss.y };
  for (let t = 0; t < 30; t++) g.step();
  assert.equal(player.health, health);
  assert.equal(player.shield, 0);
  assert(Math.hypot(g.boss.x - bossBefore.x, g.boss.y - bossBefore.y) > 1);
  const paused = { ...f.c.boss };
  f.c.paused = true;
  f.step(321);
  assert.deepEqual(f.c.boss, paused);
  f.d.reset("constable", true);
  assert.equal(f.d.nextSignatureAt, 0);
});
test("retained phase optics keep old weak-point identities while fresh phase paths have independent cuts", () => {
  const f = fixture(0, "brutal");
  f.cast();
  const before = f.d.cues(),
    weak = lenses(f.d)[0];
  f.c.phase = 2;
  f.c.tick = 30;
  f.cast();
  assert(before.every((q) => f.d.cues().some((p) => p.id === q.id)));
  const fresh = lenses(f.d).filter((q) => q.id !== weak.id);
  assert.equal(fresh.length, 3);
  f.d.hit(weak.id, 1e6, 30);
  f.step(99);
  assert(f.d.weakPoints().some((p) => fresh.some((q) => q.id === p.id)));
  assert(
    beams(f.d)
      .filter((q) => q.dependencies.includes(weak.id))
      .every((q) => q.disabled),
  );
});
test("known General-mobility saves/profiles migrate with exact builds and controls, while same-protocol online content stays strict", () => {
  const g = new Game({ mode: "raid" }),
    p = g.addPlayer("solo", "Oren witness", "medic");
  assert(
    g.transact(p.id, { id: "sprint", kind: "skill", item: "general-sprint" })
      .ok,
  );
  const old = g.offlineCheckpoint()!;
  old.protocolVersion = 45;
  old.contentRevision = issued;
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(after.protocolVersion, PROTOCOL);
  assert.equal(after.contentRevision, CONTENT_REVISION);
  assert.deepEqual(after.player, old.player);
  const profile = freshProfile();
  profile.contentRevision = issued;
  profile.controls.sprintMode = "toggle";
  const next = parseProfile(JSON.stringify(profile));
  assert.deepEqual(next.controls, profile.controls);
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...g.authoritativeCheckpoint(),
      contentRevision: issued,
    }),
  );
  assert.throws(() =>
    Game.restoreOffline({ ...old, contentRevision: "f".repeat(64) }),
  );
});
test("fifteen catalogs have distinct optical phase help, advanced-form counterplay and recovered Oren Pell lore", () => {
  for (const locale of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    const names = new Set<string>();
    for (let phase = 0; phase < 4; phase++) {
      names.add(glassPhaseName(phase, locale.id));
      assert(
        glassPhaseHint(phase, "crazed", locale.id).includes(
          m["boss.glass-surgeon.crazedHelp"],
        ),
      );
    }
    assert.equal(names.size, 4);
    assert(
      glassHelp("brutal", locale.id).includes(
        m["boss.glass-surgeon.brutalHelp"],
      ),
    );
    assert(m["boss.glass-surgeon.lore"].length > 60);
  }
  assert(
    data.bosses
      .find((b) => b.id === "glass-surgeon")!
      .lore.includes("Oren Pell"),
  );
});
const wait = async (check: () => boolean) => {
  const end = Date.now() + 7000;
  while (!check()) {
    assert(Date.now() < end, "Glass optics did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test(
  "actual peers share locked Glass optics, preserve cut lenses and clear delayed incisions on stagger",
  { timeout: 25000 },
  async () => {
    const { server, httpServer } = createGameServer({ audience: "testing" });
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const a = new Session("http://127.0.0.1:" + address.port),
      b = new Session("http://127.0.0.1:" + address.port);
    try {
      const options = {
        name: "Observer",
        classId: "soldier" as const,
        mode: "raid" as const,
        difficulty: "hellish",
        openingBossId: "glass-surgeon" as const,
      };
      await a.connect(options);
      await b.connect(
        { ...options, name: "Witness", classId: "tank" },
        { roomId: a.room!.roomId },
      );
      await wait(() => a.view?.players.length === 2);
      a.start();
      await wait(() => b.view?.phase === "combat");
      const g = liveRooms.get(a.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      await wait(() => a.view!.bossCues.some((q) => q.kind === "service-beam"));
      const beam = a.view!.bossCues.find((q) => q.kind === "service-beam");
      assert(beam && beam.kind === "service-beam");
      await wait(() => b.view!.bossCues.some((q) => q.id === beam.id));
      assert.deepEqual(
        b.view!.bossCues.find((q) => q.id === beam.id),
        beam,
      );
      const health = g.boss.health;
      assert(
        g.director.hitWeakPoint(1e6, g.combatTick, beam.dependencies[0]) > 0,
      );
      assert.equal(g.boss.health, health);
      await wait(() =>
        [a, b].every((s) =>
          s.view!.bossCues.some(
            (q) => q.id === beam.id && q.kind === "service-beam" && q.disabled,
          ),
        ),
      );
      g.boss.staggerUntil = g.combatTick + 30;
      await wait(() =>
        [a, b].every(
          (s) =>
            !s.view!.bossCues.some(
              (q) => q.kind === "service-beam" || q.kind === "service-prop",
            ),
        ),
      );
      assert.equal(g.boss.variant, "crazed");
    } finally {
      await b.close();
      await a.close();
      await server.gracefullyShutdown(false);
    }
  },
);

test("repeated Endless optical cycles release every queued warning and keep hit ownership bounded", () => {
  const f = fixture(3, "crazed");
  for (let cycle = 0; cycle < 80; cycle++) {
    f.c.tick = cycle * 400;
    f.c.phase = cycle % 4;
    assert(f.cast());
    for (let dt = 1; dt <= 320; dt++) f.step(cycle * 400 + dt);
    assert.equal(f.d.cues().length, 0);
    const internals = f.d as unknown as {
      opticalQueue: unknown[];
      once: Set<string>;
      contacts: Map<string, number>;
    };
    assert.equal(internals.opticalQueue.length, 0);
    assert.equal(internals.once.size, 0);
    assert.equal(internals.contacts.size, 0);
  }
});
