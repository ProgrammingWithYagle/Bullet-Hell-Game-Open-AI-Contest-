import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Game, data, implementedBossIds } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import {
  HZ,
  PROTOCOL,
  CONTENT_REVISION,
  idleInput,
  type BossId,
} from "../src/shared/protocol.ts";
import { openingBossIds } from "../src/shared/endless-schedule.ts";
import {
  SmallWakesDirector,
  smallWakesIds,
  smallLaneContact,
  smallClampContact,
  smallClampPanels,
  type SmallWakesId,
} from "../src/shared/small-wakes-director.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { bossThreat } from "../src/shared/boss-threat.ts";
import {
  encounterPhases,
  phaseMarkers,
  combatReviveFraction,
  phaseShieldBreak,
} from "../src/shared/encounter-policy.ts";
import { runtimeArenas } from "../src/shared/arena-layouts.ts";
import { distance, segmentRect } from "../src/shared/geometry.ts";
import {
  smallWakesArt,
  smallWakesPose,
} from "../src/client/small-wakes-presentation.ts";
import {
  smallWakesPhaseName,
  smallWakesPhaseHint,
} from "../src/client/small-wakes-text.ts";
import { bossTexturePresentation } from "../src/client/boss-textures.ts";
import {
  parseProfile,
  exportProfile,
  recordProfileView,
} from "../src/client/profile.ts";
import { viewOf } from "../src/shared/view.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { Client } from "@colyseus/sdk";
import music from "../assets/production/audio/boss-themes/library.json";
import tempos from "../src/client/music-tempos.json";

const steps = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function until(g: Game, check: () => boolean, max = 500) {
  for (let i = 0; i < max && !check(); i++) g.step();
  assert(check(), "Small Wakes state not reached");
}
function game(
  id: SmallWakesId,
  form: "normal" | "brutal" = "normal",
  phase = 0,
  map = "gatehouse",
  difficulty = "normal",
) {
  const g = createPracticeGame(
    {
      mode: "endless",
      difficulty,
      openingBossId: id,
      openingArenaId: map,
      seed: 337,
    },
    "Mara",
    "soldier",
    form,
  );
  assert(g.start());
  g.players.get("solo")!.invulnerableUntil = 1e9;
  g.boss.deadline = 1e9;
  g.boss.maxHealth = 1e7;
  g.boss.health = phase ? 4999999 : 1e7;
  until(
    g,
    () =>
      g.boss.phase === phase &&
      g.director.smallWakes.cues().some((c) => c.kind !== "small-motion"),
  );
  return g;
}
function context(
  id: SmallWakesId,
  phase = 0,
  brutal = false,
): SignatureContext {
  let next = 0;
  return {
    tick: 0,
    bossId: id,
    boss: { x: 800, y: 300 },
    radius: 50,
    targets: [{ id: "p", x: 800, y: 800, oldX: 800, oldY: 800 }],
    aimTargets: [{ id: "p", x: 800, y: 800, oldX: 800, oldY: 800 }],
    obstacles: [],
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    damageScale: 1,
    brutal,
    phase,
    id: () => ++next,
    damage: () => {},
    spawnRat: () => {},
  };
}
const sha = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

test("three original grades have two half-health phases and every phase/form casts through real Game authority", () => {
  for (const [i, id] of smallWakesIds.entries()) {
    assert.deepEqual(bossThreat(id), { bossId: id, level: 1, subtier: i - 2 });
    assert(implementedBossIds.includes(id));
    assert(
      openingBossIds.some((candidate) => candidate === id),
      id + " missing from actual Endless opening policy",
    );
    for (const form of ["normal", "brutal"] as const)
      for (const phase of [0, 1]) {
        assert.deepEqual(
          encounterPhases(id, form).map((p) => p.healthThreshold),
          [1, 0.5],
        );
        assert.deepEqual(phaseMarkers(id, form), [50]);
        const g = game(id, form, phase),
          cues = g.director.smallWakes.cues();
        assert.equal(g.boss.phase, phase);
        assert(!g.accord);
        const attacks = cues.filter(
          (c) => c.kind !== "small-prop" && c.kind !== "small-motion",
        );
        assert(attacks.length > 0);
        assert(attacks.every((c) => c.at - g.combatTick >= 39));
        assert(
          cues.every(
            (c) => typeof c.id === "number" && Number.isSafeInteger(c.id),
          ),
          "A source object overwrote a numeric cue identity",
        );
        assert.equal(new Set(cues.map((c) => c.id)).size, cues.length);
        const brutal = form === "brutal";
        if (id === "candle-snail") {
          assert.equal(
            cues.filter((c) => c.kind === "small-lane").length,
            1 + phase + (brutal ? 1 : 0),
          );
          assert.equal(
            cues.filter((c) => c.kind === "small-volley").length,
            brutal ? 2 : 1,
          );
        }
        if (id === "cobble-crab") {
          assert.equal(
            cues.filter((c) => c.kind === "small-clamp").length,
            1 + phase + (brutal ? 1 : 0),
          );
          assert.equal(
            cues.filter((c) => c.kind === "small-volley").length,
            brutal ? 2 : 1,
          );
        }
        if (id === "mourning-kettle") {
          assert.equal(
            cues.filter((c) => c.kind === "small-lane").length,
            1 + phase + (brutal ? 1 : 0),
          );
          assert.equal(
            cues.filter((c) => c.kind === "small-volley").length,
            (1 + phase) * 2,
          );
        }
        g.drainEvents();
        let emitted = 0;
        for (let j = 0; j < 220; j++) {
          g.step();
          emitted += g
            .drainEvents()
            .flatMap((e) => (e.type === "shots" ? e.shots : []))
            .filter((s) => s.owner === "hostile").length;
          assert(g.shots.size <= 4000);
        }
        assert(
          emitted > 0,
          id + "/" + form + "/" + phase + " never emitted actual projectiles",
        );
      }
  }
});

test("Brutal makes real repeated waves and adds its distinct cross-cut, independent closure or rear pour", () => {
  for (const id of smallWakesIds) {
    const n = game(id),
      b = game(id, "brutal");
    const count = (g: Game) => {
      g.drainEvents();
      let total = 0;
      for (let i = 0; i < 220; i++) {
        g.step();
        total += g
          .drainEvents()
          .flatMap((e) => (e.type === "shots" ? e.shots : []))
          .filter((s) => s.owner === "hostile").length;
      }
      return total;
    };
    const nc = n.director.smallWakes.cues(),
      bc = b.director.smallWakes.cues();
    if (id === "candle-snail")
      assert.equal(
        bc.filter((c) => c.kind === "small-lane").length,
        nc.filter((c) => c.kind === "small-lane").length + 1,
      );
    if (id === "cobble-crab") {
      assert.equal(b.director.weakPoints().length, 2);
      assert.equal(bc.filter((c) => c.kind === "small-clamp").length, 2);
    }
    if (id === "mourning-kettle")
      assert.equal(bc.filter((c) => c.kind === "small-lane").length, 2);
    assert(
      count(b) >= count(n) * 2,
      id + " did not double the actual emitted waves",
    );
  }
});

test("locked wax/steam warnings stop at masonry, stay bounded and retain an actual cold center in phase two", () => {
  for (const id of ["candle-snail", "mourning-kettle"] as const)
    for (const brutal of [false, true]) {
      const d = new SmallWakesDirector(),
        c = context(id, 1, brutal);
      d.reset(id, true);
      d.cast(c, c.targets[0], {
        count: 5,
        speed: 120,
        damage: 9,
        telegraph: 1.3,
      });
      const lanes = d.cues().filter((x) => x.kind === "small-lane");
      assert(lanes.length >= 2);
      const quiet = { x: 800, y: 500 };
      for (let t = 0; t < 220; t++)
        assert(
          lanes.every((l) => !smallLaneContact(l, quiet, quiet, t)),
          "Cold center lost",
        );
      const bytes = JSON.stringify(lanes);
      c.targets[0].x = 1200;
      c.boss.x = 900;
      assert.equal(
        JSON.stringify(d.cues().filter((x) => x.kind === "small-lane")),
        bytes,
      );
      const w = new SmallWakesDirector(),
        blocked = context(id);
      blocked.obstacles = [{ x: 700, y: 500, width: 200, height: 50 }];
      w.reset(id, true);
      w.cast(blocked, blocked.targets[0], {
        count: 5,
        speed: 120,
        damage: 9,
        telegraph: 1.3,
      });
      const lane = w.cues().find((x) => x.kind === "small-lane")!;
      assert(lane.kind === "small-lane");
      assert(lane.y2 < 500 - lane.width / 2);
    }
});

test("swept lane and moving-jaw contact cannot tunnel, hurt during warning or survive cancellation", () => {
  const d = new SmallWakesDirector(),
    c = context("mourning-kettle");
  d.reset(c.bossId, true);
  d.cast(c, c.targets[0], { count: 5, speed: 120, damage: 9, telegraph: 1.3 });
  const l = d.cues().find((x) => x.kind === "small-lane")!;
  assert(l.kind === "small-lane");
  const before = { x: 600, y: 500 },
    after = { x: 1000, y: 500 };
  assert(!smallLaneContact(l, after, before, l.at - 1));
  assert(smallLaneContact(l, after, before, l.at));
  assert(!smallLaneContact({ ...l, cancelled: true }, after, before, l.at));
  assert(!smallLaneContact(l, after, before, l.until));
  const crab = new SmallWakesDirector(),
    cc = context("cobble-crab");
  crab.reset(cc.bossId, true);
  crab.cast(cc, cc.targets[0], {
    count: 5,
    speed: 120,
    damage: 9,
    telegraph: 1.3,
  });
  const q = crab.cues().find((x) => x.kind === "small-clamp")!;
  assert(q.kind === "small-clamp");
  const p = { x: q.x, y: q.y + 100 };
  assert(!smallClampContact(q, p, p, q.at - 1));
  let touched = false;
  for (let t = q.at; t < q.until; t++)
    touched ||= smallClampContact(q, p, p, t);
  assert(touched);
  assert(!smallClampContact({ ...q, cancelled: true }, p, p, q.closeAt));
});

test("the real steam contact removes health only after its warning, then respects its expiry", () => {
  const g = game("mourning-kettle"),
    p = g.players.get("solo")!,
    l = g.director.smallWakes.cues().find((c) => c.kind === "small-lane")!;
  assert(l.kind === "small-lane");
  p.invulnerableUntil = 0;
  p.x = l.x1 + (l.x2 - l.x1) * 0.65;
  p.y = l.y1 + (l.y2 - l.y1) * 0.65;
  const health = p.health;
  until(g, () => g.combatTick === l.at - 1);
  assert.equal(p.health, health);
  g.step();
  assert(p.health < health, "Warned steam did not deal real damage");
});

test("both phases/forms on all six arenas and every difficulty keep moving bodies, finite props and complete jaws inside their boards", () => {
  for (const map of runtimeArenas)
    for (const difficulty of data.difficulties)
      for (const id of smallWakesIds)
        for (const form of ["normal", "brutal"] as const)
          for (const phase of [0, 1]) {
            const g = game(id, form, phase, map.id, difficulty.id);
            if (g.accord) g.accord = null;
            let travelled = 0;
            for (let i = 0; i < 95; i++) {
              const previous = { x: g.boss.x, y: g.boss.y };
              g.step();
              const moved = distance(previous, g.boss);
              travelled += moved;
              assert(moved <= 42 / HZ + 1e-6);
              const radius = data.bosses.find((b) => b.id === id)!.radius;
              assert(
                !g.arena.obstacles.some(
                  (o) => segmentRect(g.boss, g.boss, o, radius) !== null,
                ),
                id + "/" + map.id + "/" + difficulty.id + " body in cover",
              );
              for (const p of g.director.smallWakes.weakPoints()) {
                assert(
                  distance(p, g.boss) > radius + p.radius + 4,
                  id + " covered a counterplay prop",
                );
                assert(
                  !g.arena.obstacles.some(
                    (o) => segmentRect(p, p, o, p.radius) !== null,
                  ),
                );
              }
              for (const cue of g.director.smallWakes.cues()) {
                if (cue.kind === "small-clamp")
                  for (const p of smallClampPanels(cue, g.combatTick)) {
                    const rx =
                        Math.abs(Math.cos(p.aim)) * p.halfLength +
                        Math.abs(Math.sin(p.aim)) * p.halfWidth,
                      ry =
                        Math.abs(Math.sin(p.aim)) * p.halfLength +
                        Math.abs(Math.cos(p.aim)) * p.halfWidth;
                    assert(
                      p.x - rx >= g.arena.bounds.x - 1 &&
                        p.x + rx <= g.arena.bounds.x + g.arena.bounds.width + 1,
                    );
                    assert(
                      p.y - ry >= g.arena.bounds.y - 1 &&
                        p.y + ry <=
                          g.arena.bounds.y + g.arena.bounds.height + 1,
                    );
                  }
                if (cue.kind === "small-lane")
                  for (const [x, y] of [
                    [cue.x1, cue.y1],
                    [cue.x2, cue.y2],
                  ])
                    assert(
                      x - cue.width / 2 >= g.arena.bounds.x &&
                        x + cue.width / 2 <=
                          g.arena.bounds.x + g.arena.bounds.width &&
                        y - cue.width / 2 >= g.arena.bounds.y &&
                        y + cue.width / 2 <=
                          g.arena.bounds.y + g.arena.bounds.height,
                    );
              }
            }
            assert(
              travelled > 5,
              id + "/" + map.id + "/" + difficulty.id + " remained stationary",
            );
          }
});

test("breaking one finite anchor or valve cancels only its linked pressure and leaves another Brutal source working", () => {
  for (const id of ["cobble-crab", "mourning-kettle"] as const) {
    const g = game(id, "brutal", 1),
      props = g.director.smallWakes.weakPoints();
    assert(props.length >= 2);
    const p = props[0],
      other = props[1];
    const remaining = g.director.smallWakes
      .cues()
      .filter((c) => "sourceId" in c && c.sourceId === other.id);
    assert(remaining.length);
    assert.equal(
      g.director.hitWeakPoint(p.health + 500, g.combatTick, p.id),
      p.health,
    );
    assert.equal(g.director.hitWeakPoint(10, g.combatTick, p.id), 0);
    const cues = g.director.smallWakes.cues();
    assert(
      cues
        .filter((c) => "sourceId" in c && c.sourceId === p.id)
        .every((c) => "cancelled" in c && c.cancelled),
    );
    assert.deepEqual(
      cues.filter((c) => "sourceId" in c && c.sourceId === other.id),
      remaining,
    );
    assert(g.director.weakPoints().some((q) => q.id === other.id));
  }
});

test("actual Soldier shots destroy each new finite weak point through swept hit selection and earn hit credit", () => {
  for (const id of ["cobble-crab", "mourning-kettle"] as const) {
    const g = game(id),
      weak = g.director.weakPoints()[0],
      p = g.players.get("solo")!;
    p.x = weak.x + 80;
    p.y = weak.y;
    const credit = p.damageDealt;
    let sequence = 0;
    for (
      let i = 0;
      i < 90 && g.director.weakPoints().some((w) => w.id === weak.id);
      i++
    ) {
      g.submitInput("solo", {
        ...idleInput(),
        sequence: ++sequence,
        clientTick: g.tick + 1,
        aim: Math.PI,
        fire: true,
      });
      g.step();
    }
    assert(
      !g.director.weakPoints().some((w) => w.id === weak.id),
      id + " counterplay object ignored actual weapon damage",
    );
    assert(p.damageDealt > credit);
  }
});

test("victory, timeout, wipe and stagger clear every Small Wakes pressure cue", () => {
  for (const id of smallWakesIds)
    for (const stop of ["victory", "timeout", "wipe", "stagger"]) {
      const g = game(id, "brutal", 1);
      if (stop === "victory") g.boss.health = 0;
      else if (stop === "timeout") g.boss.deadline = g.combatTick;
      else if (stop === "wipe") g.players.get("solo")!.status = "eliminated";
      else g.boss.staggerUntil = g.combatTick + 100;
      g.step();
      assert(
        !g.bossCues().some((c) => c.kind.startsWith("small-")),
        id + "/" + stop + " left pressure behind",
      );
    }
});

test("motion uses real warning/release clocks, full defeat frames and complete fallback identities", () => {
  for (const id of smallWakesIds) {
    const g = game(id),
      cues = g.bossCues(),
      art = smallWakesArt.find((a) => a.bossId === id)!;
    assert(
      [4, 5].includes(
        smallWakesPose(g.boss, g.tick, g.combatTick, cues)!.frame,
      ),
    );
    assert.equal(
      smallWakesPose(g.boss, g.tick, g.combatTick, cues, true)!.frame,
      0,
    );
    assert.equal(
      bossTexturePresentation(id, 0, false, art).key,
      id + "-reference",
    );
    assert.equal(
      bossTexturePresentation(id, 11, false, art).key,
      id + "-defeat-reference",
    );
    assert.equal(bossTexturePresentation(id, 11, true, art).frame, 11);
    g.boss.health = 0;
    g.boss.defeatedAt = g.tick;
    assert.equal(smallWakesPose(g.boss, g.tick, 200, [])!.frame, 8);
    assert.equal(smallWakesPose(g.boss, g.tick + 30, 200, [])!.frame, 11);
    assert.equal(smallWakesPose(g.boss, g.tick, 200, [], true)!.frame, 11);
  }
});

test("all fifteen locales have individual phase names, persistent responses and extra Brutal help", () => {
  for (const l of data.locales)
    for (const id of smallWakesIds) {
      assert.notEqual(
        smallWakesPhaseName(id, 0, l.id),
        smallWakesPhaseName(id, 1, l.id),
      );
      assert(smallWakesPhaseName(id, 0, l.id).length > 1);
      assert.notEqual(
        smallWakesPhaseHint(id, 0, "normal", l.id),
        smallWakesPhaseHint(id, 1, "normal", l.id),
      );
      assert([...smallWakesPhaseHint(id, 1, "normal", l.id)].length >= 12);
      assert(
        smallWakesPhaseHint(id, 1, "brutal", l.id).length >
          smallWakesPhaseHint(id, 1, "normal", l.id).length,
      );
    }
  assert.equal(combatReviveFraction("normal"), 0.25);
  assert.equal(combatReviveFraction("hard"), 0);
  assert(!phaseShieldBreak("normal", "normal"));
  assert(!phaseShieldBreak("baby", "brutal"));
});

test("issued protocol19 local Practice and profiles retain identity, money, discoveries and purchases under protocol20", () => {
  const g = createPracticeGame(
      { mode: "endless", openingBossId: "lantern-warden" },
      "Mara",
      "soldier",
    ),
    p = g.players.get("solo")!;
  p.coins = 777;
  const save = g.offlineCheckpoint()!;
  save.protocolVersion = 19;
  save.contentRevision =
    "82763fd1f5288303f8170a798b656f5443fc8f5236b652786a9e3b27070c41af";
  const restored = Game.restoreOffline(save);
  assert.equal(PROTOCOL, 20);
  assert.equal(restored.settings.runId, g.settings.runId);
  assert.equal(restored.players.get("solo")!.coins, 777);
  assert.deepEqual(restored.players.get("solo")!.skills, p.skills);
  assert.throws(
    () => Game.restoreOffline({ ...save, contentRevision: "f".repeat(64) }),
    /versionMismatch/,
  );
  assert.throws(
    () => Game.restoreOffline({ ...save, serverOnly: true }),
    /versionMismatch/,
  );
  const memory = new Map<string, string>(),
    store = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
    };
  recordProfileView(viewOf(g, "solo"), "solo", store);
  const profile = JSON.parse(exportProfile(store));
  profile.contentRevision = save.contentRevision;
  assert.equal(
    parseProfile(JSON.stringify(profile)).contentRevision,
    CONTENT_REVISION,
  );
});

test("the independent verifier reconstructs all native RGBA ownership, anchors, atlases and v5 fallback crops", () => {
  execFileSync("python", ["-X", "utf8", "tools/verify-small-wakes-art.py"], {
    timeout: 60000,
  });
  const report = JSON.parse(
    readFileSync(
      "reviews/small-wakes-2026-10-26/art-verification.json",
      "utf8",
    ),
  );
  assert(report.passed && report.oneScalePerIdentity);
  assert.equal(report.selectedPoses, 36);
  assert.equal(report.immutableNatives, 10);
  assert.equal(report.renderedAccepted, false);
});

test("three distinct original scores match pulse clocks and preserve all 63 prior masters and score events", () => {
  const previous = JSON.parse(
    readFileSync(
      "reviews/small-wakes-2026-10-26/previous-music-library.json",
      "utf8",
    ),
  );
  assert.equal(previous.tracks.length, 63);
  for (const t of previous.tracks) {
    assert.equal(sha(t.path), t.sha256);
    assert.deepEqual(
      music.tracks.find((n) => n.bossId === t.bossId),
      t,
    );
  }
  const added = music.tracks.filter((t) =>
    smallWakesIds.some((id) => id === t.bossId),
  );
  assert.equal(added.length, 3);
  assert.equal(new Set(added.map((t) => t.sha256)).size, 3);
  assert.equal(new Set(added.map((t) => t.meter)).size, 3);
  for (const t of added) {
    assert(t.passed);
    assert.equal(sha(t.path), t.sha256);
    assert.deepEqual(tempos[t.bossId as keyof typeof tempos], {
      bpm: t.bpm,
      beatsPerBar: t.beatsPerBar,
    });
    assert(t.score.some((s) => s.bus === "lead"));
  }
});

const wait = async (check: () => boolean) => {
  const end = Date.now() + 6500;
  while (!check()) {
    if (Date.now() > end) throw Error("Small Wakes replication timeout");
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  "real owner/observer rooms reject protocol19 and replicate all three Brutal signatures, cancellation and cleanup",
  { timeout: 40000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    try {
      await assert.rejects(
        new Client(endpoint).create("grave", {
          name: "Old",
          classId: "soldier",
          mode: "endless",
          difficulty: "normal",
          visibility: "public",
          createKey: randomUUID(),
          protocolVersion: 19,
          contentRevision:
            "82763fd1f5288303f8170a798b656f5443fc8f5236b652786a9e3b27070c41af",
        }),
        /versionMismatch/,
      );
      for (const id of smallWakesIds) {
        const owner = new Session(endpoint),
          observer = new Session(endpoint);
        try {
          const options = {
            name: "Host",
            classId: "soldier" as const,
            mode: "endless" as const,
            difficulty: "hellish",
            openingBossId: id,
            openingArenaId: "gatehouse",
          };
          await owner.connect(options);
          await observer.connect(
            { ...options, name: "Observer", classId: "medic" },
            { roomId: owner.room!.roomId },
          );
          await wait(() => owner.view?.players.length === 2);
          owner.start();
          await wait(() => observer.view?.phase === "combat");
          const g = liveRooms.get(owner.room!.roomId)!.game;
          for (const p of g.players.values()) p.invulnerableUntil = 1e9;
          g.boss.deadline = 1e9;
          g.boss.health = g.boss.maxHealth * 0.49;
          await wait(
            () =>
              observer.view?.boss.phase === 1 &&
              observer.view.bossCues.some(
                (c) => c.kind === "small-lane" || c.kind === "small-clamp",
              ) === true,
          );
          assert.equal(observer.view!.boss.id, id);
          assert.equal(observer.view!.boss.variant, "brutal");
          assert(!g.accord);
          const weak = g.director.smallWakes.weakPoints()[0];
          if (weak) {
            g.director.hitWeakPoint(999, g.combatTick, weak.id);
            await wait(
              () =>
                observer.view?.bossCues.some(
                  (c) =>
                    c.kind === "small-prop" &&
                    c.id === weak.id &&
                    c.health === 0,
                ) === true,
            );
            assert(
              observer
                .view!.bossCues.filter(
                  (c) => "sourceId" in c && c.sourceId === weak.id,
                )
                .every((c) => "cancelled" in c && c.cancelled),
            );
          }
          g.boss.health = 0;
          await wait(() => observer.view?.phase === "mutationVote");
          assert(
            !observer.view!.bossCues.some((c) => c.kind.startsWith("small-")),
          );
          assert(observer.online);
        } finally {
          await Promise.allSettled([observer.close(), owner.close()]);
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
