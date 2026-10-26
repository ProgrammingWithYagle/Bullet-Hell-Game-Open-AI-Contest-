import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Game, data } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import {
  earlyWatchBossIds,
  earlyWatchMovement,
  type EarlyWatchId,
} from "../src/shared/early-watch-director.ts";
import { bossThreat, classifiedContract } from "../src/shared/boss-threat.ts";
import {
  recordProfileView,
  loadProfile,
  exportProfile,
  parseProfile,
} from "../src/client/profile.ts";
import { idleInput, PROTOCOL, type BossId } from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import { segmentRect, distance } from "../src/shared/geometry.ts";
import { Prediction } from "../src/client/prediction.ts";
import {
  earlyWatchPose,
  earlyWatchArt,
} from "../src/client/early-watch-presentation.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";

function game(
  id: EarlyWatchId,
  variant: "normal" | "brutal" = "normal",
  phase = 0,
  map = "gatehouse",
) {
  phase=Math.min(1,phase);
  const g = createPracticeGame(
    {
      seed: 223,
      mode: "endless",
      difficulty: "normal",
      openingBossId: id,
      openingArenaId: map,
    },
    "Mara",
    "soldier",
    variant,
  );
  assert(g.start());
  g.players.get("solo")!.invulnerableUntil = 1e9;
  g.boss.health = g.boss.maxHealth * [1, 0.49][phase];
  while (g.boss.phase < phase) {
    g.step();
    assert(g.combatTick < 500);
  }
  const start = g.combatTick;
  while (!g.director.earlyWatch.cues().some((c) => c.kind === "early-prop")) {
    g.step();
    assert(g.combatTick - start < 300);
  }
  return g;
}
test("Early Watch grades, two longer phases and late Brutal geometry execute through real Game casts", () => {
  for (const [i, id] of earlyWatchBossIds.entries()) {
    assert.deepEqual(bossThreat(id), { bossId: id, level: 1, subtier: i - 2 });
    for (const form of ["normal", "brutal"] as const)
      for (let phase = 0; phase < 2; phase++) {
        const pattern=phase===0?0:form==='brutal'?3:2;
        const g = game(id, form, phase),
          cues = g.director.cues(),
          live = cues.filter((c) => c.kind !== "early-prop");
        assert(live.length > 0);
        assert.equal(new Set(cues.map((c) => c.id)).size, cues.length);
        assert(live.every((c) => "at" in c && c.at - g.combatTick >= 37));
        if (id === "ashen-usher") {
          assert.equal(
            cues.filter((c) => c.kind === "early-prop").length,
            form === "brutal" ? 3 : 2,
          );
          assert.equal(
            cues.filter((c) => c.kind === "early-volley").length,
            (pattern >= 2 ? 4 : 2) + (form === "brutal" ? 1 : 0),
          );
        } else if (id === "brass-toad")
          assert.equal(
            cues.filter((c) => c.kind === "early-hop").length,
            pattern === 0 ? 1 : pattern >= 3 ? 3 : 2,
          );
        else {
          assert.equal(
            cues.filter((c) => c.kind === "early-lane").length,
            (phase === 0 ? 1 : 2) + (form === "brutal" ? 1 : 0),
          );
          if (phase >= 1 && form === "normal")
            assert.deepEqual(
              earlyWatchMovement(
                cues,
                { x: 800, y: 550 },
                Math.min(
                  ...cues
                    .filter((c) => c.kind === "early-lane")
                    .map((c) => ("at" in c ? c.at : 0)),
                ),
              ),
              { x: 0, y: 0 },
            );
        }
        let shots = 0;
        for (let n = 0; n < 220; n++) {
          g.step();
          shots += g
            .drainEvents()
            .filter((e) => e.type === "shots")
            .reduce(
              (s, e) =>
                s +
                (e.type === "shots"
                  ? e.shots.filter((x) => x.owner === "hostile").length
                  : 0),
              0,
            );
        }
        assert(shots > 0, id + " must emit real hostile projectiles");
      }
  }
});
test("destroying a ticket stand cancels all its pending volleys and leaves the other aisle intact", () => {
  const g = game("ashen-usher", "normal", 2),
    stand = g.director.weakPoints()[0];
  assert(g.director.hitWeakPoint(999, g.combatTick, stand.id) > 0);
  const cues = g.director.cues(),
    mine = cues.filter(
      (c) => c.kind === "early-volley" && c.sourceId === stand.id,
    );
  assert.equal(mine.length, 2);
  assert(mine.every((c) => c.kind === "early-volley" && c.cancelled));
  assert(
    cues.some(
      (c) =>
        c.kind === "early-volley" && c.sourceId !== stand.id && !c.cancelled,
    ),
  );
  g.drainEvents();
  const emissions: any[] = [];
  for (let n = 0; n < 130; n++) {
    g.step();
    for (const e of g.drainEvents())
      if (e.type === "shots")
        emissions.push(...e.shots.filter((s) => s.owner === "hostile"));
  }
  assert(emissions.length > 0);
  assert(!emissions.some((s) => s.x === stand.x && s.y === stand.y));
});
test("Toad changes ground position only on its warned hop, lands with real damage and emits a broad-gap ring", () => {
  const g = game("brass-toad"),
    hop = g.director.cues().find((c) => c.kind === "early-hop")!;
  assert(hop.kind === "early-hop");
  const before = { x: g.boss.x, y: g.boss.y };
  while (g.combatTick < hop.at) {
    g.step();
    assert.deepEqual({ x: g.boss.x, y: g.boss.y }, before);
  }
  for (let n = 0; n < 8; n++) g.step();
  assert(distance(before, g.boss) > 5);
  const p = g.players.get("solo")!;
  p.x = hop.x;
  p.y = hop.y;
  p.invulnerableUntil = 0;
  const health = p.health;
  g.drainEvents();
  while (g.combatTick < hop.landAt) g.step();
  assert(p.health < health);
  const shots = g
    .drainEvents()
    .flatMap((e) =>
      e.type === "shots" ? e.shots.filter((s) => s.owner === "hostile") : [],
    );
  assert(shots.length >= 12);
  const angles = shots.map((s) => Math.atan2(s.vy, s.vx)).sort((a, b) => a - b);
  const gaps = angles.map(
    (angle, i) =>
      (angles[(i + 1) % angles.length] - angle + 2 * Math.PI) % (2 * Math.PI),
  );
  assert(Math.max(...gaps) >= 1.9 - 1e-6);
});
test("breaking the drain plug removes the tongue without suppressing warned hops", () => {
  const g = game("brass-toad", "normal", 2),
    plug = g.director
      .weakPoints()
      .find((p) => p.kind === "early-prop" && p.role === "drain")!;
  assert(plug);
  g.director.hitWeakPoint(1000, g.combatTick, plug.id);
  assert(
    g.director
      .cues()
      .some(
        (c) => c.kind === "early-lane" && c.role === "tongue" && c.cancelled,
      ),
  );
  assert.equal(
    g.director.cues().filter((c) => c.kind === "early-hop").length,
    2,
  );
});
test("wind is bounded, absent during tells and dodge, and authority/prediction share collision-resolved displacement", () => {
  const g = game("ragpicker-kite"),
    wind = g.director.cues().find((c) => c.kind === "early-lane")!;
  assert(wind.kind === "early-lane");
  const point = { x: (wind.x1 + wind.x2) / 2, y: wind.y1 };
  assert.deepEqual(earlyWatchMovement(g.director.cues(), point, wind.at - 1), {
    x: 0,
    y: 0,
  });
  const force = earlyWatchMovement([wind, wind, wind], point, wind.at);
  assert(Math.abs(Math.hypot(force.x, force.y) - 65) < 1e-9);
  assert.deepEqual(earlyWatchMovement([wind], point, wind.at, true), {
    x: 0,
    y: 0,
  });
  while (g.combatTick < wind.at) g.step();
  const p = g.players.get("solo")!;
  p.x = point.x;
  p.y = point.y;
  const prediction = new Prediction();
  let view = viewOf(g, "solo");
  prediction.acknowledge(view, "solo");
  for (let n = 1; n <= 15; n++) {
    const input = { ...idleInput(), sequence: n, clientTick: g.tick + 1 };
    prediction.submit(input, view);
    g.submitInput("solo", input);
    g.step();
    view = viewOf(g, "solo");
    assert(distance(p, prediction.player!) < 1e-6);
  }
  const pin = g.director.weakPoints()[0];
  g.director.hitWeakPoint(999, g.combatTick, pin.id);
  assert.deepEqual(earlyWatchMovement(g.director.cues(), point, g.combatTick), {
    x: 0,
    y: 0,
  });
});
test("phase changes cancel outgoing attack cues and every moving body respects all six arena layouts", () => {
  for (const id of earlyWatchBossIds)
    for (const form of ["normal", "brutal"] as const)
      for (const arena of data.arenas) {
        const g = game(id, form, 0, arena.id),
          oldIds = new Set(g.director.cues().map((c) => c.id));
        for (const weak of g.director.weakPoints())
          assert(
            distance(weak, g.boss) >
              data.bosses.find((b) => b.id === id)!.radius + weak.radius + 19,
          );
        g.boss.health = g.boss.maxHealth * 0.49;
        g.step();
        assert.equal(g.boss.phase, 1);
        assert(!g.director.cues().some((c) => oldIds.has(c.id)));
        for (let n = 0; n < 360; n++) {
          g.step();
          assert(
            !g.obstacles.some((o) =>
              segmentRect(
                g.boss,
                g.boss,
                o,
                data.bosses.find((b) => b.id === id)!.radius - 1,
              ),
            ),
          );
          const b = g.arena.bounds;
          assert(
            g.boss.x >= b.x &&
              g.boss.x <= b.x + b.width &&
              g.boss.y >= b.y &&
              g.boss.y <= b.y + b.height,
          );
        }
      }
});
test("four-frame defeats hold the last pose and hop lift follows combat time even after a world-clock offset", () => {
  const g = game("brass-toad"),
    hop = g.director.cues().find((c) => c.kind === "early-hop")!;
  assert(hop.kind === "early-hop");
  const mid = (hop.at + hop.landAt) / 2;
  assert(
    earlyWatchPose(g.boss, mid + 600, mid, g.director.cues(), false, mid + 600)!
      .lift > 40,
  );
  g.boss.health = 0;
  g.boss.defeatedAt = 1000;
  assert.equal(earlyWatchPose(g.boss, 1000, 300, [], false)!.frame, 8);
  assert.equal(earlyWatchPose(g.boss, 1200, 300, [], false)!.frame, 11);
  assert.equal(earlyWatchPose(g.boss, 1000, 300, [], true)!.frame, 11);
  for (const e of earlyWatchArt) {
    assert.equal(e.frames, 12);
    assert.equal(e.defeatFrames, 4);
    assert.equal(
      createHash("sha256").update(readFileSync(e.atlas)).digest("hex"),
      e.atlasSha256,
    );
  }
});
test("issued protocol-14 Practice migration preserves fixed-grade cards, progress and run identity while rejecting unknown revisions and forged scope", () => {
  const g = createPracticeGame({ seed: 331, mode: "short" }, "Mara", "soldier");
  const issued = g.offlineCheckpoint()!;
  issued.protocolVersion = 14;
  issued.contentRevision =
    "43b7b2848b50bbe56072bfa134e5775355a7faca28092624744bdae6a0d318bb";
  const restored = Game.restoreOffline(issued),
    after = restored.offlineCheckpoint()!;
  assert.equal(after.protocolVersion, PROTOCOL);
  assert.equal(after.settings.runId, issued.settings.runId);
  assert.deepEqual(after.player.progress, issued.player.progress);
  assert.deepEqual(after.selectedContract, issued.selectedContract);
  for (const patch of [
    { contentRevision: "f".repeat(64) },
    { serverOnly: true },
    { settings: { ...issued.settings, openingBossId: "ashen-usher" } },
  ])
    assert.throws(() =>
      Game.restoreOffline({ ...structuredClone(issued), ...patch }),
    );
});
test("fifteen locale sources contain original names, complete help and three named phase labels", () => {
  for (const locale of data.locales) {
    const all = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    const messages = Object.fromEntries(
      Object.entries(all).filter(([k]) =>
        earlyWatchBossIds.some((id) => k.startsWith("boss." + id + ".")),
      ),
    ) as Record<string, string>;
    assert.equal(Object.keys(messages).length, 18);
    for (const id of earlyWatchBossIds) {
      assert(messages[`boss.${id}.description`].length > 40);
      assert(messages[`boss.${id}.brutalHelp`].length > 15);
    }
  }
});
const until = async (check: () => boolean) => {
  const end = Date.now() + 6500;
  while (!check()) {
    if (Date.now() > end) throw Error("Early Watch replication timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  "real two-client rooms replicate every Early Watch identity, warned geometry and break cancellation",
  { timeout: 35000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    try {
      for (const id of earlyWatchBossIds) {
        const owner = new Session("http://127.0.0.1:" + address.port),
          guest = new Session("http://127.0.0.1:" + address.port);
        try {
          const options = {
            name: "Host",
            classId: "soldier" as const,
            mode: "endless" as const,
            difficulty: "normal",
            openingBossId: id,
            openingArenaId: "gatehouse",
          };
          await owner.connect(options);
          await guest.connect(
            { ...options, classId: "medic" },
            { roomId: owner.room!.roomId },
          );
          await until(() => owner.view?.players.length === 2);
          owner.start();
          await until(() => guest.view?.phase === "combat");
          const room = liveRooms.get(owner.room!.roomId)!;
          for (const p of room.game.players.values()) p.invulnerableUntil = 1e9;
          await until(
            () =>
              guest.view?.bossCues.some((c) => c.kind === "early-prop") ===
              true,
          );
          assert.equal(guest.view!.boss.id, id);
          const prop = room.game.director.weakPoints()[0];
          assert(prop);
          room.game.director.hitWeakPoint(999, room.game.combatTick, prop.id);
          await until(
            () =>
              guest.view?.bossCues.some(
                (c) =>
                  c.kind === "early-prop" && c.id === prop.id && c.health === 0,
              ) === true,
          );
          assert(guest.online);
          assert.equal(room.game.settings.openingBossId, id);
          room.game.boss.health = 0;
          await until(() => guest.view?.phase === "mutationVote");
          assert.equal(guest.view!.bossCues.length, 0);
        } finally {
          await Promise.allSettled([guest.close(), owner.close()]);
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);

test("real Soldier fire destroys each Early Watch weak point through the shared swept-hit path", () => {
  for (const id of earlyWatchBossIds) {
    const g = game(id, "normal", 2),
      weak = g.director.weakPoints()[0],
      p = g.players.get("solo")!;
    p.x = weak.x + 80;
    p.y = weak.y;
    let sequence = 0;
    for (
      let n = 0;
      n < 90 && g.director.weakPoints().some((w) => w.id === weak.id);
      n++
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
      id + " weak point must take actual weapon damage",
    );
  }
});

test("personal profile export and import retain all sixty-two ordinary discoveries", () => {
  const g = new Game({ mode: "endless", seed: 434, maxPlayers: 1 });
  g.addPlayer("solo", "Mara", "soldier");
  const ids = data.bosses.filter((b) => !b.secret).map((b) => b.id as BossId);
  assert.equal(ids.length, 62);
  g.encounter = 62;
  g.players.get("solo")!.progress = {
    clears: 62,
    rescues: 0,
    firstEncounter: 0,
    campaignClears: 0,
    clearedBossIds: ids,
  };
  const memory = new Map<string, string>(),
    store = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
  recordProfileView(viewOf(g, "solo"), "solo", store);
  const profile = loadProfile(store);
  assert.equal(profile.runs[0].bossIds.length, 62);
  assert.deepEqual(parseProfile(exportProfile(store)).runs[0].bossIds, ids);
});
