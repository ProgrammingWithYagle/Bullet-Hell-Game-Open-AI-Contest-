import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ClerkAppeal,
  clerkAppealRules,
  type ClerkStamp,
} from "../src/shared/clerk-appeal.ts";
import { clerkStampCenters } from "../src/shared/clerk-placement.ts";
import { runtimeArena, runtimeArenas } from "../src/shared/arena-layouts.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { Game, data } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import {
  HZ,
  PROTOCOL,
  CONTENT_REVISION,
  type BossVariant,
} from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  clerkHelp,
  clerkPhaseName,
  clerkPhaseHint,
} from "../src/client/clerk-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { encounterFrame } from "../src/client/encounter-presentation.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
function fixture(advanced = false, phase = 0) {
  let id = 0;
  const d = new ClerkAppeal(),
    p = { id: "p", x: 800, y: 750, oldX: 800, oldY: 750 },
    hurt: { tick: number; amount: number }[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "quarantine-clerk",
    boss: { x: 800, y: 300 },
    radius: 58,
    targets: [p],
    aimTargets: [p],
    bounds: { x: 128, y: 80, width: 1344, height: 840 },
    obstacles: [],
    damageScale: 1,
    brutal: advanced,
    phase,
    id: () => ++id,
    damage: (_id, amount) => hurt.push({ tick: c.tick, amount }),
    spawnRat: () => {},
  };
  const step = () => {
    c.tick++;
    d.step(c);
  };
  return { d, c, p, hurt, step };
}
const stamps = (d: ClerkAppeal) =>
  d.cues().filter((c): c is ClerkStamp => c.kind === "stamp");
function game(form: BossVariant = "normal", phase = 0, difficulty = "normal") {
  const g = createPracticeGame(
    {
      openingBossId: "quarantine-clerk",
      mode: "endless",
      difficulty,
      seed: 981,
    },
    "Mara",
    "soldier",
    form,
  );
  g.start();
  // Isolate attack/ability effects; class starting shields have their own full matrix test.
  for(const member of g.players.values())member.shield=0;
  g.players.get("solo")!.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  if (phase) {
    g.boss.health = g.boss.maxHealth * 0.49;
    g.step();
  }
  return g;
}
test("Clerk fixes all289valid target placements and supplies three distinct later appeal positions on actual maps", () => {
  let n = 0;
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties) {
      const a = runtimeArena(map.id, difficulty.id),
        b = a.bounds;
      for (const nx of [0.15, 0.5, 0.85])
        for (const ny of [0.25, 0.5, 0.75]) {
          const p = { x: b.x + b.width * nx, y: b.y + b.height * ny };
          if (a.obstacles.some((o) => segmentRect(p, p, o, 9))) continue;
          const first = clerkStampCenters(b, a.obstacles, p, a.lavaPits),
            second = clerkStampCenters(b, a.obstacles, p, a.lavaPits, first);
          assert.equal(first.length, 3, map.id + ":" + difficulty.id);
          assert.equal(
            second.length,
            3,
            map.id + ":" + difficulty.id + " appeal",
          );
          for (const s of [...first, ...second]) {
            assert(!a.obstacles.some((o) => segmentRect(s, s, o, 92)));
            assert(
              a.lavaPits.every((l) => distance(s, l) > 82 + l.radius + 10),
            );
          }
          for (const s of second)
            assert(first.every((t) => distance(s, t) > 184));
          n++;
        }
    }
  assert.equal(n, 289);
});
test("placement stays in the target reachable component rather than choosing through a sealed partition", () => {
  const b = { x: 0, y: 0, width: 1600, height: 1000 },
    wall = { x: 790, y: 0, width: 20, height: 1000 };
  const points = clerkStampCenters(b, [wall], { x: 300, y: 500 });
  assert.equal(points.length, 3);
  assert(points.every((p) => p.x < 790));
  assert.deepEqual(
    clerkStampCenters({ x: 0, y: 0, width: 80, height: 80 }, [], {
      x: 40,
      y: 40,
    }),
    [],
  );
});
test("first-phase stamps lock harmless ordered tells and reopen I exactly when III strikes", () => {
  const f = fixture();
  assert(f.d.cast(f.c, f.p, { speed: 0, damage: 10, telegraph: 1.3 }));
  const s = stamps(f.d);
  assert.deepEqual(
    s.map((x) => x.index),
    [1, 2, 3],
  );
  assert.equal(s[1].at - s[0].at, 20);
  assert.equal(s[0].safeAt, s[2].at);
  f.p.x = s[0].x;
  f.p.y = s[0].y;
  f.p.oldX = f.p.x;
  f.p.oldY = f.p.y;
  while (f.c.tick < s[0].at - 1) {
    f.step();
    assert.equal(f.hurt.length, 0);
    assert.deepEqual(stamps(f.d), s);
  }
  f.step();
  assert.equal(f.hurt.length, 1);
  while (f.c.tick < s[0].safeAt) f.step();
  assert(f.d.isSafe(f.p, f.c.tick));
  const before = f.hurt.length;
  for (let n = 0; n < 20; n++) f.step();
  assert.equal(f.hurt.length, before);
  assert(!f.d.isSafe({ x: s[0].x + 82, y: s[0].y }, f.c.tick));
});
test("late phase marks collision-resolved movement then gives a complete new warning and reopens III after its strike", () => {
  const f = fixture(false, 2);
  f.d.cast(f.c, f.p, { speed: 0, damage: 10, telegraph: 1.3 });
  const patrol = f.d.cues()[0];
  assert(patrol.kind === "clerk-patrol");
  while (f.c.tick < patrol.moveAt - 1) {
    f.step();
    assert.deepEqual(f.c.boss, { x: 800, y: 300 });
  }
  while (!stamps(f.d).length) {
    const old = { ...f.c.boss };
    f.step();
    assert(distance(old, f.c.boss) <= 72 / HZ + 0.01);
    assert(f.c.tick < 300);
  }
  const s = stamps(f.d),
    stop = { ...f.c.boss };
  assert(distance(stop, { x: 800, y: 300 }) > 140);
  assert.equal(s[0].at - f.c.tick, 39);
  assert.equal(s[0].safeAt, 0);
  assert.equal(s[2].safeAt - s[2].at, 12);
  while (f.c.tick < s[0].at - 1) {
    f.step();
    assert.deepEqual(f.c.boss, stop);
  }
  assert(!f.d.isSafe(s[2], s[2].at));
  assert(f.d.isSafe(s[2], s[2].safeAt));
});
test("a newly inserted patrol obstacle changes the actual stop but never removes the complete stamp warning", () => {
  const f = fixture(false, 2);
  f.d.cast(f.c, f.p, { speed: 0, damage: 10, telegraph: 1.3 });
  const p = f.d.cues()[0];
  assert(p.kind === "clerk-patrol");
  f.c.obstacles.push({
    x: (p.x1 + p.x2) / 2 - 5,
    y: 220,
    width: 10,
    height: 160,
  });
  while (!stamps(f.d).length) {
    f.step();
    assert(f.c.tick < 300);
  }
  assert(distance(f.c.boss, { x: p.x2, y: p.y2 }) > 40);
  assert.equal(stamps(f.d)[0].at - f.c.tick, 39);
});
test("advanced late appeal replaces the expired field with five shifted fully warned positions", () => {
  const f = fixture(true, 3);
  f.d.cast(f.c, f.p, { speed: 0, damage: 10, telegraph: 1.3 });
  while (!stamps(f.d).length) f.step();
  const first = stamps(f.d),
    ids = new Set(first.map((s) => s.id));
  assert.equal(first.length, 5);
  f.p.x = 1100;
  f.p.y = 700;
  let second: ClerkStamp[] = [];
  for (let n = 0; n < 1000; n++) {
    f.step();
    const current = stamps(f.d);
    assert(current.length <= 5);
    if (current.length && current.every((s) => !ids.has(s.id))) {
      second = current;
      break;
    }
  }
  assert.equal(second.length, 5);
  assert(f.c.tick > first[0].until);
  assert.equal(second[0].at - f.c.tick, 45);
  assert(second.every((s) => first.every((t) => distance(s, t) > 64)));
  const safe=second.find(s=>s.safeAt>0)!;
  assert.equal(safe.safeAt,second[4].at+12);
  const locked = JSON.stringify(second);
  f.p.x = 200;
  f.p.y = 200;
  while (f.c.tick < second[0].at - 1) {
    f.step();
    assert.equal(JSON.stringify(stamps(f.d)), locked);
  }
});

test("stamp contact sweeps fast crossings, shares a half-second hit budget and expires with its visible geometry", () => {
  const f = fixture();
  f.d.cast(f.c, f.p, { speed: 0, damage: 10, telegraph: 1.3 });
  const s = stamps(f.d)[1];
  f.c.tick = s.at;
  f.p.oldX = s.x - 150;
  f.p.x = s.x + 150;
  f.p.oldY = f.p.y = s.y;
  f.d.step(f.c);
  assert.equal(f.hurt.length, 1);
  assert.equal(f.hurt[0].amount, 5);
  f.p.oldX = f.p.x = s.x;
  for (let n = 0; n < 14; n++) f.step();
  assert.equal(f.hurt.length, 1);
  f.step();
  assert.equal(f.hurt.length, 2);
  while (f.d.busy) f.step();
  assert.deepEqual(f.d.cues(), []);
  assert.equal(f.d.nextSignatureAt - f.c.tick, 45);
});
test("actual Clerk retains damaging stamps, a whole-body safe interior and hostile projectile absorption", () => {
  const g = game(),
    p = g.players.get("solo")!;
  while (!stamps(g.director.clerk).length) g.step();
  const s = stamps(g.director.clerk)[0];
  p.x = s.x;
  p.y = s.y;
  p.invulnerableUntil = 0;
  const hp = p.health;
  while (g.combatTick < s.at) g.step();
  assert(p.health < hp);
  while (g.combatTick < s.safeAt) g.step();
  p.invulnerableUntil = 0;
  const before = p.health;
  g.damage(p, 50);
  assert.equal(p.health, before);
  g.shots.set(990001, {
    id: 990001,
    owner: "hostile",
    x: s.x + 110,
    y: s.y,
    vx: -300,
    vy: 0,
    radius: 5,
    damage: 50,
    expires: g.combatTick + 90,
    pierce: 0,
  });
  for (let n = 0; n < 10; n++) g.step();
  assert(!g.shots.has(990001));
  assert.equal(p.health, before);
});
test("actual auxiliary fans occur between clear signature sequences and retain advanced echo density", () => {
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const g = game(form, 1);
    let fan = false,
      repeat = false,
      patrolId = 0;
    const seen = new Set<number>(),
      count = clerkAppealRules.stampCounts[form];
    for (let n = 0; n < 1500; n++) {
      g.step();
      fan ||= g.warnings.some((w) => w.kind === "fan");
      const patrol = g.director.clerk
        .cues()
        .find((c) => c.kind === "clerk-patrol");
      if (patrol && patrol.id !== patrolId) {
        patrolId = patrol.id;
        seen.clear();
      }
      for (const s of stamps(g.director.clerk)) seen.add(s.id);
      repeat ||= seen.size > count;
      if (g.director.clerk.busy) assert.equal(g.warnings.length, 0);
    }
    assert(fan);
    assert.equal(repeat, form !== "normal");
  }
});
test("phase retains Clerk appeals/protection; stagger and encounter exit clean them up", () => {
  for (const end of ["phase", "stagger", "victory", "timeout", "wipe"]) {
    const g = game("crazed");
    while (!stamps(g.director.clerk).length) g.step();
    const committed = g.director.cues().filter(q => !("until" in q) || q.until > g.combatTick + 1).map(q => q.id);
    if (end === "phase") g.boss.health = g.boss.maxHealth * 0.49;
    if (end === "stagger") g.boss.staggerUntil = g.combatTick + 120;
    if (end === "victory") g.boss.health = 0;
    if (end === "timeout") g.boss.deadline = g.combatTick + 1;
    if (end === "wipe") g.players.get("solo")!.status = "eliminated";
    g.step();
    if(end === "phase") {
      assert(committed.length);
      assert(committed.every(id => g.director.cues().some(q => q.id === id)));
      continue;
    }
    assert.equal(g.director.cues().length, 0, end);
    assert.equal(g.director.safeZones(g.combatTick).length, 0);
    assert(!g.bossCues().some((c) => c.kind === "brutal-echo"));
  }
});
test("existing stamp casting poses follow real strike order and reduced motion keeps its static authority pose", () => {
  const g = game("brutal", 1);
  while (!stamps(g.director.clerk).length) g.step();
  const s = stamps(g.director.clerk);
  for (const stamp of s) {
    assert(encounterFrame(g.boss, stamp.at, g.director.cues()) >= 4);
    assert.equal(encounterFrame(g.boss, stamp.at, g.director.cues(), true), 0);
  }
  assert.equal(clerkAppealRules.stampRadius, 82);
});
test("fifteen locales and known protocol23 local saves preserve help, form/build history and strict boundaries", () => {
  for (const locale of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    assert.equal(
      clerkPhaseName(0, locale.id),
      m["boss.quarantine-clerk.phase.0"],
    );
    assert.equal(
      clerkPhaseName(1, locale.id),
      m["boss.quarantine-clerk.phase.1"],
    );
    assert.equal(
      clerkPhaseHint(1, "normal", locale.id),
      m["boss.quarantine-clerk.phaseHint.1"] + " " + m["boss.quarantine-clerk.shelterBonusHelp"],
    );
    assert.equal(
      signatureHelp(viewOf(game("brutal"), "solo"), locale.id),
      clerkHelp("brutal", locale.id),
    );
  }
  const g = game("crazed");
  g.boss.health = 0;
  g.step();
  const save = g.offlineCheckpoint()!,
    old = structuredClone(save);
  old.protocolVersion = 23;
  old.contentRevision =
    "da37e2a0e2beb54343495ce39027211df254fa1c79ab42ec3f3360373ad792db";
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 42);
  assert.equal(after.contentRevision, CONTENT_REVISION);
  assert.deepEqual(after.player, save.player);
  assert.deepEqual(after.completedBossForms, save.completedBossForms);
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
});
test(
  "real owner/observer clients receive Clerk patrol, phase sound and independent appeal warnings then clear them on defeat",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const a = httpServer.address();
    assert(a && typeof a === "object");
    const host = new Session("http://127.0.0.1:" + a.port),
      guest = new Session("http://127.0.0.1:" + a.port),
      sounds = [0, 0];
    for (const [i, s] of [host, guest].entries())
      s.onEvents = (es) => {
        sounds[i] += es.filter(
          (e) => e.type === "sound" && e.id === "boss-phase",
        ).length;
      };
    const until = async (check: () => boolean) => {
      const end = Date.now() + 6500;
      while (!check()) {
        if (Date.now() > end) throw Error("Clerk state did not replicate");
        await new Promise((r) => setTimeout(r, 15));
      }
    };
    try {
      const o = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "quarantine-clerk" as const,
      };
      await host.connect(o);
      await guest.connect(
        { ...o, name: "Observer" },
        { roomId: host.room!.roomId },
      );
      await until(() => host.view?.players.length === 2);
      host.start();
      await until(
        () => guest.view?.phase === "combat" && sounds.every((n) => n === 1),
      );
      const g = liveRooms.get(host.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      g.boss.health = g.boss.maxHealth * 0.49;
      await until(
        () => guest.view?.boss.phase === 1 && sounds.every((n) => n === 2),
      );
      Reflect.set(g, "attackAt", [g.combatTick, 1e9]);
      await until(
        () =>
          guest.view?.bossCues.some((c) => c.kind === "clerk-patrol") ?? false,
      );
      Reflect.set(g, "attackAt", Array(20).fill(1e9));
      let guard = 0;
      while (!stamps(g.director.clerk).length && guard++ < 1800) g.step();
      const firstIds = new Set(stamps(g.director.clerk).map((s) => s.id));
      assert.equal(firstIds.size, 10);
      while (
        !(
          stamps(g.director.clerk).length === 10 &&
          stamps(g.director.clerk).every((s) => !firstIds.has(s.id))
        ) &&
        guard++ < 1800
      )
        g.step();
      const second = stamps(g.director.clerk);
      assert.equal(second.length, 10);
      assert(second.every((s) => !firstIds.has(s.id)));
      assert.equal(second.filter((s) => s.severity === "black").length, 2);
      assert.equal(second.filter((s) => s.severity === "purple").length, 3);
      await until(() =>
        [host, guest].every((s) =>
          second.every((c) => s.view?.bossCues.some((v) => v.id === c.id)),
        ),
      );
      for (const s of [host, guest])
        for (const c of second)
          assert.deepEqual(
            s.view!.bossCues.find((v) => v.id === c.id),
            c,
          );
      // New warnings and actual collision feedback use the same owner/observer wire path.
      const volley = g.director.clerk
        .cues()
        .find((c) => c.kind === "clerk-volley");
      assert(volley?.kind === "clerk-volley");
      await until(() =>
        [host, guest].every((s) =>
          s.view?.bossCues.some((c) => c.id === volley.id),
        ),
      );
      for (const client of [host, guest])
        assert.deepEqual(
          client.view!.bossCues.find((c) => c.id === volley.id),
          volley,
        );
      // Percent-current-health loss also travels through the authoritative player schema.
      const black = second.find((s) => s.severity === "black")!,
        player = g.players.get(host.id)!;
      Reflect.get(g, "variantPressure").reset(1e9);
      while (g.combatTick < black.at - 1) g.step();
      player.x = player.oldX = black.x;
      player.y = player.oldY = black.y;
      player.health = 100;
      player.invulnerableUntil = 0;
      for (let n = 0; n < 20 && player.health === 100; n++) g.step();
      assert.equal(player.health, 25);
      player.invulnerableUntil = 1e9;
      await until(() =>
        [host, guest].every(
          (s) => s.view?.players.find((p) => p.id === host.id)?.health === 25,
        ),
      );
      const shelter = stamps(g.director.clerk).find((c) => c.safeAt > 0)!;
      while (g.combatTick < shelter.safeAt) g.step();
      Reflect.get(g, "emitShot").call(
        g,
        "hostile",
        shelter.x + shelter.radius + 8,
        shelter.y,
        Math.PI,
        600,
        8,
        5,
      );
      g.step();
      const block = g.director.clerk
        .cues()
        .find((c) => c.kind === "clerk-block");
      assert(block?.kind === "clerk-block");
      await until(() =>
        [host, guest].every((s) =>
          s.view?.bossCues.some((c) => c.id === block.id),
        ),
      );
      for (const client of [host, guest])
        assert.deepEqual(
          client.view!.bossCues.find((c) => c.id === block.id),
          block,
        );
      g.boss.health = 0;
      await until(() => guest.view?.phase !== "combat");
      assert(!guest.view!.bossCues.length);
    } finally {
      await Promise.allSettled([host.close(), guest.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
