import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Game, data } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { VariantPressure } from "../src/shared/variant-pressure.ts";
import {
  runtimeArenas,
  authoredArenas,
  runtimeArena,
} from "../src/shared/arena-layouts.ts";
import { arenaGroundPlacement } from "../src/client/arena-presentation.ts";
import { threatCode, bossThreat } from "../src/shared/boss-threat.ts";
import {
  encounterPhases,
  phaseShieldBreak,
} from "../src/shared/encounter-policy.ts";
import { bossVariantAppearance } from "../src/client/boss-variant-appearance.ts";
import {
  HZ,
  PROTOCOL,
  CONTENT_REVISION,
  type BossId,
  type BossVariant,
} from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  parseProfile,
  exportProfile,
  recordProfileView,
  loadProfile,
} from "../src/client/profile.ts";
const forms = ["normal", "brutal", "crazed"] as const;
const step = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function quiet(id: BossId = "candle-snail", variant: BossVariant = "crazed") {
  const g = createPracticeGame(
    { mode: "endless", openingBossId: id },
    "Mara",
    "soldier",
    variant,
  );
  g.start();
  Reflect.set(g, "attackAt", Array(20).fill(1e9));
  g.boss.deadline = 1e9;
  g.players.get("solo")!.invulnerableUntil = 1e9;
  g.drainEvents();
  return g;
}

test("all 66 identities admit Crazed with their fixed grade, inherited full signature and tier-appropriate phase count", () => {
  for (const b of data.bosses) {
    const profile = bossThreat(b.id),
      g = quiet(b.id as BossId);
    assert.equal(g.boss.variant, "crazed");
    assert.equal(g.boss.threat, profile.level);
    assert.equal(
      threatCode(profile.level, profile.subtier, "crazed"),
      (profile.level > 10
        ? ">10"
        : String(profile.level) +
          ["--", "-", "", "+", "++"][profile.subtier + 2]) + " C",
    );
    assert.equal(b.variants.crazed.identity, b.id + "-crazed");
    assert.equal(b.variants.crazed.signature, b.signature.id);
    const inherited = b.variants.crazed.phases.map((phase, index) => {
      if (b.id !== 'quarantine-clerk') return phase;
      const c = phase as Record<string, unknown>,
        base = b.variants.brutal.phases[index] as Record<string, unknown>;
      // The requested Crazed field adds ten smaller seals to the full Brutal
      // phase. Every other phase/attack field must still inherit unchanged.
      assert.equal(base.stampCount, 5); assert.equal(base.stampRadius, 72);
      assert.equal(c.stampCount, 10); assert.equal(c.stampRadius, 58);
      assert.equal(c.reopensStamp, index ? 10 : 1);
      return {...phase, stampCount:base.stampCount, stampRadius:base.stampRadius, reopensStamp:base.reopensStamp};
    });
    assert.deepEqual(inherited, b.variants.brutal.phases);
    assert.equal(
      encounterPhases(b.id, "crazed").length,
      profile.level <= 2 ? 2 : 4,
    );
    assert.equal(phaseShieldBreak("baby", "crazed"), false);
    const brutal = quiet(b.id as BossId, "brutal");
    assert.equal(
      g.boss.maxHealth,
      brutal.boss.maxHealth,
      "Crazed must add mechanics rather than another health multiplier",
    );
  }
  const look = bossVariantAppearance("crazed");
  assert.equal(look.tint, 0xd19aff);
  assert.equal(look.marks, 6);
  assert.equal(bossVariantAppearance("crazed", false).tint, 0xffffff);
});

test("Crazed queues at most the finite pending budget and actual echoes never exceed the 4000-hostile cap", () => {
  const g = quiet(),
    emit = Reflect.get(g, "emitBossShot") as (...a: unknown[]) => void;
  for (let i = 0; i < 4000; i++) emit.call(g, 800, 600, 0, 0, 1, 1);
  assert.equal(g.shots.size, 4000);
  assert(
    g.brutalVolley.queuedProjectiles <=
      data.rules.brutal.maximumPendingEchoProjectiles,
  );
  assert(
    g.brutalVolley.cues().length <= data.rules.brutal.maximumPendingEchoOrigins,
  );
  for (let i = 0; i < 4 * HZ; i++) {
    g.step();
    assert(g.shots.size <= 4000);
    g.drainEvents();
  }
  assert.equal(g.brutalVolley.queuedProjectiles, 0);
  g.boss.health = 0;
  g.step();
  assert.equal(g.variantPressure.cues().length, 0);
});

test("controlled Clockmender rings scale actual shots 24/60/180, preserve stop/resume and leave no uncontrolled duplicates", () => {
  for (const [form, count] of [
    ["normal", 24],
    ["brutal", 60],
    ["crazed", 180],
  ] as const) {
    const g = quiet("clockmender", form),
      c = Reflect.get(g, "signatureContext").call(g);
    assert(
      g.director.district.cast(
        c,
        { x: 800, y: 700 },
        { kind: "ring", speed: 100, count: 1, damage: 8, telegraph: 1 },
      ),
    );
    const clock = g.director
      .cues()
      .find((c) => c.kind === "district-state" && c.style === "clock");
    assert(clock && clock.kind === "district-state");
    const released: any[] = [];
    while (g.combatTick < clock.at) {
      g.step();
      released.push(
        ...g
          .drainEvents()
          .flatMap((e) =>
            e.type === "shots"
              ? e.shots.filter((s) => s.owner === "hostile")
              : [],
          ),
      );
    }
    assert.equal(new Set(released.map((s) => s.id)).size, count, form);
    assert.equal(
      g.brutalVolley.queuedProjectiles,
      0,
      "controlled shots must stay in their controller",
    );
    const liveIds = new Set(released.map((s) => s.id));
    while (g.combatTick < clock.at + Math.ceil(1.4 * HZ)) {
      g.step();
      g.drainEvents();
    }
    const stopped = [...g.shots.values()].filter((s) => liveIds.has(s.id));
    assert(stopped.length > 0);
    assert(stopped.every((s) => s.vx === 0 && s.vy === 0));
    step(g, 2 * HZ);
    assert(
      [...g.shots.values()]
        .filter((s) => liveIds.has(s.id))
        .every((s) => Math.hypot(s.vx, s.vy) > 0),
    );
    g.boss.health = 0;
    g.step();
    assert.equal(g.shots.size, 0);
  }
});

test("controlled drone swarms retain live source cancellation at the higher projectile densities", () => {
  for (const form of forms) {
    const g = quiet("spore-beekeeper", form),
      c = Reflect.get(g, "signatureContext").call(g);
    assert(
      g.director.district.cast(
        c,
        { x: 800, y: 700 },
        { kind: "ring", speed: 100, count: 1, damage: 8, telegraph: 1 },
      ),
    );
    const ring = g.director
      .cues()
      .find((c) => c.kind === "district-ring" && c.style === "swarm");
    assert(ring && ring.kind === "district-ring");
    while (g.combatTick < ring.at) g.step();
    const drones = g.director.district
      .weakPoints()
      .filter((p) => p.role === "drone");
    assert(drones.length > 0);
    const before = g.shots.size;
    assert(before > 0);
    for (const drone of drones)
      g.director.hitWeakPoint(99999, g.combatTick, drone.id);
    g.step();
    assert.equal(
      g.shots.size,
      0,
      form + " source cancellation left controlled swarm shots",
    );
  }
});

test("variant pressure locks pursuit positions, warns before contact, sweeps fast movement and expires without hidden repeats", () => {
  const d = new VariantPressure();
  d.reset();
  let id = 0;
  const target = { id: "p", x: 1400, y: 850, oldX: 1400, oldY: 850 };
  const hurt: number[] = [];
  const c = {
    now: 6 * HZ,
    bossId: "candle-snail" as BossId,
    variant: "crazed",
    phase: 0,
    bounds: { x: 128, y: 80, width: 1344, height: 840 },
    targets: [target],
    damageScale: 1,
    paused: false,
    id: () => ++id,
    damage: (_id: string, n: number) => hurt.push(n),
  };
  d.step(c);
  const cue = d.cues()[0];
  assert(cue);
  assert(cue.at - c.now >= 1.8 * HZ);
  assert.equal(hurt.length, 0);
  target.x = 1000;
  target.oldX = 1000;
  c.now = cue.at - 1;
  d.step(c);
  assert.equal(hurt.length, 0);
  assert.equal(d.cues()[0].x1, 1400);
  c.now = cue.at;
  target.x = 1400;
  target.oldX = 1400;
  d.step(c);
  assert.deepEqual(hurt, [14]);
  d.step(c);
  assert.equal(hurt.length, 1);
  c.now = cue.until;
  d.step(c);
  assert.equal(d.cues().length, 0);
  c.now = 20 * HZ;
  d.step(c);
  const lane = d.cues()[0];
  assert(lane.style === "crosscut");
  c.now = lane.at;
  if (lane.x1 === lane.x2) {
    target.oldX = lane.x1 - 160;
    target.x = lane.x1 + 160;
    target.oldY = target.y = (lane.y1 + lane.y2) / 2;
  } else {
    target.oldY = lane.y1 - 160;
    target.y = lane.y1 + 160;
    target.oldX = target.x = (lane.x1 + lane.x2) / 2;
  }
  d.step(c);
  assert.equal(
    hurt.length,
    2,
    "dash-length movement tunneled through the active lane",
  );
});

test("Brutal and Crazed add different real warned patterns, rotate targets and bound fifty-player marks", () => {
  for (const form of forms) {
    const d = new VariantPressure();
    d.reset();
    const seen = new Set<string>();
    let id = 0;
    const c = {
      now: 0,
      bossId: "cobble-crab" as BossId,
      variant: form,
      phase: 1,
      bounds: { x: 128, y: 80, width: 1344, height: 840 },
      targets: Array.from({ length: 50 }, (_, i) => ({
        id: "p" + i,
        x: 150 + (i % 10) * 120,
        y: 140 + Math.floor(i / 10) * 140,
        oldX: 0,
        oldY: 0,
      })),
      damageScale: 1,
      paused: false,
      id: () => ++id,
      damage: () => {},
    };
    for (let now = 0; now < 35 * HZ; now++) {
      c.now = now;
      d.step(c);
      for (const cue of d.cues()) seen.add(cue.style);
      assert(
        d.cues().filter((s) => s.style === "pursuit").length <=
          (form === "crazed" ? 3 : 2),
      );
      assert(d.cues().length <= 3);
    }
    assert.deepEqual(
      [...seen].sort(),
      form === "normal"
        ? []
        : form === "brutal"
          ? ["crosscut", "pursuit"]
          : ["crosscut", "pursuit", "weave"],
    );
  }
});

test("real Crazed corner pressure reaches distant players and is removed by phase changes, stagger, victory, timeout and wipe", () => {
  for (const end of ["phase", "stagger", "victory", "timeout", "wipe"]) {
    const g = quiet(),
      p = g.players.get("solo")!;
    p.x = g.arena.bounds.x + g.arena.width - 80;
    p.y = g.arena.bounds.y + g.arena.height - 80;
    step(g, 6 * HZ);
    const cue = g.bossCues().find((c) => c.kind === "variant-pressure");
    assert(cue && cue.kind === "variant-pressure");
    assert.equal(cue.x1, p.x);
    assert.equal(cue.y1, p.y);
    assert.equal(
      viewOf(g, "solo").bossCues.filter((c) => c.kind === "variant-pressure")
        .length,
      1,
    );
    if (end === "phase") g.boss.health = g.boss.maxHealth * 0.49;
    if (end === "stagger") g.boss.staggerUntil = g.combatTick + 30;
    if (end === "victory") g.boss.health = 0;
    if (end === "timeout") g.boss.deadline = g.combatTick + 1;
    if (end === "wipe") {
      p.invulnerableUntil = 0;
      g.damage(p, 10000);
      p.status = "eliminated";
      p.selfRevives = 0;
    }
    g.step();
    assert(!g.bossCues().some((c) => c.kind === "variant-pressure"), end);
  }
});

test("Warden active cones retain a clear auxiliary-pressure window even in Crazed", () => {
  const g = quiet("lantern-warden");
  let active = 0,
    pressure = 0;
  for (let t = 0; t < 60 * HZ; t++) {
    g.step();
    g.drainEvents();
    if (g.signatures.some((s) => s.phase === "active")) {
      active++;
      assert(!g.bossCues().some((c) => c.kind === "variant-pressure"));
    }
    if (g.bossCues().some((c) => c.kind === "variant-pressure")) pressure++;
  }
  assert(active > 0);
  assert(
    pressure > 0,
    "Crazed Warden never used its additional recovery pressure",
  );
});

test("Endless progresses each actually cleared identity through Standard, Brutal and Crazed across saved boundaries", () => {
  let g = new Game({ mode: "endless", maxPlayers: 1, seed: 829 });
  g.addPlayer("solo", "Vigil", "soldier");
  g.start();
  const clears = new Map<string, number>();
  let crazed = 0;
  for (let n = 0; n < 250; n++) {
    const prior = clears.get(g.boss.id) ?? 0;
    assert.equal(g.boss.variant, forms[Math.min(2, prior)]);
    if (g.boss.variant === "crazed") crazed++;
    clears.set(g.boss.id, prior + 1);
    g.boss.health = 0;
    g.step();
    const save = g.offlineCheckpoint()!;
    assert(save);
    g = Game.restoreOffline(save);
    assert.deepEqual(
      Object.fromEntries(g.completedBossForms),
      save.completedBossForms,
    );
    while (g.phase !== "combat") {
      g.phaseEnds = g.tick;
      g.step();
    }
  }
  assert(crazed > 0);
  assert.equal(clears.size, 65);
  const online = g.authoritativeCheckpoint();
  assert.equal(online, null, "combat must not be checkpointed");
  g.boss.health = 0;
  g.step();
  const boundary = g.authoritativeCheckpoint()!;
  assert.deepEqual(
    Object.fromEntries(Game.restoreAuthoritative(boundary).completedBossForms),
    boundary.completedBossForms,
  );
});

test("known protocol20 local saves and profiles retain progress; unproven legacy form history is conservatively Standard", () => {
  const g = new Game({ mode: "endless", maxPlayers: 1 }),
    p = g.addPlayer("solo", "Mara", "soldier");
  p.coins = 777;
  g.start();
  g.boss.health = 0;
  g.step();
  const save = g.offlineCheckpoint()!;
  const old = structuredClone(save);
  old.protocolVersion = 20;
  old.contentRevision =
    "86ace79844ae1abe21b7fa54d18fa2de1f4316a2b5a0578c1878e6b27479ffdf";
  delete (old as any).completedBossForms;
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(after.protocolVersion, PROTOCOL);
  assert.equal(after.player.coins, save.player.coins);
  assert.equal(after.settings.runId, save.settings.runId);
  assert.deepEqual(after.player.skills, save.player.skills);
  assert.deepEqual(after.completedBossForms, { constable: "normal" });
  for (const bad of [
    { ...old, contentRevision: "f".repeat(64) },
    { ...old, serverOnly: true },
    { ...save, completedBossForms: { foreign: "crazed" } },
    { ...save, completedBossForms: { constable: "forged" } },
    { ...save, completedBossForms: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
  const memory = new Map<string, string>(),
    store = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
  recordProfileView(viewOf(g, "solo"), "solo", store);
  const profile = JSON.parse(exportProfile(store));
  profile.contentRevision = old.contentRevision;
  assert.deepEqual(
    parseProfile(JSON.stringify(profile)).runs,
    loadProfile(store).runs,
  );
  assert.equal(
    parseProfile(JSON.stringify(profile)).contentRevision,
    CONTENT_REVISION,
  );
});

test("four spacious maps reduce real retreat distance and painted/colliding geometry together while two narrow layouts stay full size", () => {
  const compact = ["gatehouse", "triage-yard", "sunken-chapel", "bell-foundry"];
  for (const map of runtimeArenas) {
    const old = authoredArenas.find((a) => a.id === map.id)!;
    const far = (a: typeof map) =>
      Math.max(
        ...[a.bounds.x + 9, a.bounds.x + a.width - 9].flatMap((x) =>
          [a.bounds.y + 9, a.bounds.y + a.height - 9].map((y) =>
            Math.hypot(x - a.bossSpawn.x, y - a.bossSpawn.y),
          ),
        ),
      );
    if (compact.includes(map.id)) {
      assert(map.width * map.height <= old.width * old.height * 0.82);
      assert(far(map) < far(old) * 0.91);
    } else {
      assert.deepEqual(map.bounds, old.bounds);
      assert.deepEqual(map.cover, old.cover);
    }
    const paint = arenaGroundPlacement(map.id);
    assert.deepEqual(
      [
        paint.x - paint.width / 2,
        paint.y - paint.height / 2,
        paint.width,
        paint.height,
      ],
      [map.bounds.x, map.bounds.y, map.width, map.height],
    );
    for (const difficulty of data.difficulties) {
      const g = new Game({
        openingArenaId: map.id,
        maxPlayers: 50,
        mode: "endless",
        difficulty: difficulty.id,
      });
      for (let i = 0; i < 50; i++) g.addPlayer("p" + i, "Survivor", "soldier");
      assert(g.start());
      const arena = runtimeArena(map.id, difficulty.id);
      for (const p of g.players.values()) {
        assert(
          p.x >= arena.bounds.x + 9 && p.x <= arena.bounds.x + arena.width - 9,
        );
        assert(
          p.y >= arena.bounds.y + 9 && p.y <= arena.bounds.y + arena.height - 9,
        );
      }
    }
  }
});

test("phase transitions send one distinct priority sound per actual phase and the original new cue reconstructs exactly", () => {
  for (const form of forms) {
    const g = quiet("candle-snail", form);
    g.boss.health = g.boss.maxHealth * 0.49;
    g.step();
    assert.equal(
      g.drainEvents().filter((e) => e.type === "sound" && e.id === "boss-phase")
        .length,
      1,
    );
    step(g, 20);
    assert.equal(
      g.drainEvents().filter((e) => e.type === "sound" && e.id === "boss-phase")
        .length,
      0,
    );
  }
  const proof = JSON.parse(
    readFileSync("reviews/crazed-horizon-2026-10-26/phase-sound.json", "utf8"),
  );
  const bytes = readFileSync("assets/production/audio/cues/phase-turn-v1.wav");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), proof.sha256);
  assert.equal(bytes.readUInt32LE(24), 44100);
  assert.equal(bytes.length, 44 + 59976 * 4);
  assert(proof.rms > 0.1 && proof.peak <= 0.8);
  assert(Math.abs(proof.dc) < 0.0001);
  assert.equal(proof.first, 0);
  assert.equal(proof.last, 0);
  execFileSync("python", ["-X", "utf8", "tools/build-phase-turn.py"], {
    encoding: "utf8",
  });
});

test(
  "real owner/observer rooms replicate purple Crazed admission, locked extra pressure, phase sound and cleanup",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const owner = new Session("http://127.0.0.1:" + address.port),
      observer = new Session("http://127.0.0.1:" + address.port);
    const sounds = [0, 0];
    for (const [i, session] of [owner, observer].entries())
      session.onEvents = (events) => {
        sounds[i] += events.filter(
          (e) => e.type === "sound" && e.id === "boss-phase",
        ).length;
      };
    const until = async (check: () => boolean) => {
      const end = Date.now() + 6500;
      while (!check()) {
        if (Date.now() > end) throw Error("Crazed room did not replicate");
        await new Promise((r) => setTimeout(r, 15));
      }
    };
    try {
      const options = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "candle-snail" as const,
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
      Reflect.set(g, "attackAt", Array(20).fill(1e9));
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      step(g, 6 * HZ);
      await until(() =>
        [owner, observer].every((s) =>
          s.view!.bossCues.some((c) => c.kind === "variant-pressure"),
        ),
      );
      const mark = g.bossCues().find((c) => c.kind === "variant-pressure")!;
      for (const session of [owner, observer]) {
        assert.equal(session.view!.boss.variant, "crazed");
        assert.deepEqual(
          session.view!.bossCues.find((c) => c.id === mark.id),
          mark,
        );
        assert.equal(session.view!.accord, null);
      }
      const before = sounds.slice();
      g.boss.health = g.boss.maxHealth * 0.49;
      await until(
        () =>
          [owner, observer].every((s) => s.view?.boss.phase === 1) &&
          sounds.every((n, i) => n === before[i] + 1),
      ).catch((error) => {
        throw Error(
          String(error) +
            " " +
            JSON.stringify({
              phase: g.phase,
              bossPhase: g.boss.phase,
              sounds,
              owner: owner.view?.boss.phase,
              observer: observer.view?.boss.phase,
            }),
        );
      });
      assert(
        [owner, observer].every(
          (s) => !s.view!.bossCues.some((c) => c.id === mark.id),
        ),
      );
      g.boss.health = 0;
      await until(() => observer.view?.phase !== "combat");
      assert(
        !observer.view!.bossCues.some(
          (c) =>
            c.kind === "variant-pressure" ||
            c.kind === "brutal-echo" ||
            c.kind === "arena-lava",
        ),
      );
    } finally {
      await Promise.allSettled([owner.close(), observer.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
