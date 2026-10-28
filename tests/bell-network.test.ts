import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, data } from "../src/shared/game.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import {
  bellPhaseName,
  bellPhaseHint,
  bellHelp,
} from "../src/client/bell-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { viewOf } from "../src/shared/view.ts";
import { bellFrame } from "../src/client/bell-presentation.ts";
const issued =
  "0d8d0df4d5bd156da29529164a249489dcb3f3dbdda7026921bcc76555eb6266";
const wait = async (check: () => boolean) => {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Bell cue did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test("exact known issued33 local Practice/profile state migrates to the current protocol without changing builds/form history/preferences; foreign or online state stays strict", () => {
  const g = createPracticeGame(
      { mode: "endless", openingBossId: "bellringer", seed: 117 },
      "Mara",
      "soldier",
      "crazed",
    ),
    save = g.offlineCheckpoint()!,
    old = structuredClone(save);
  old.protocolVersion = 33;
  old.contentRevision = issued;
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 38);
  assert.equal(restored.protocolVersion, PROTOCOL);
  assert.equal(restored.contentRevision, CONTENT_REVISION);
  assert.deepEqual(restored.player, save.player);
  assert.deepEqual(restored.completedBossForms, save.completedBossForms);
  assert.deepEqual(restored.selectedContract, save.selectedContract);
  for (const bad of [
    { ...old, contentRevision: "f".repeat(64) },
    { ...old, serverOnly: true },
    { ...old, practiceOnly: false },
    { ...old, players: [] },
    { ...old, transactions: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
  const p = freshProfile();
  p.contentRevision = issued;
  p.settings.showNames = false;
  p.settings.roomChat = false;
  const after = parseProfile(JSON.stringify(p));
  assert.deepEqual(after.settings, p.settings);
  assert.deepEqual(after.controls, p.controls);
  assert.equal(after.contentRevision, CONTENT_REVISION);
});
test("fifteen closed guides expose four distinct Bellringer phases and advanced mechanics while actual procession uses drawn frames8–15 and reduced motion remains static", () => {
  const g = createPracticeGame(
    { mode: "endless", openingBossId: "bellringer" },
    "Mara",
    "soldier",
    "crazed",
  );
  g.start();
  g.players.get("solo")!.invulnerableUntil = 1e9;
  for (const l of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + l.id + ".json", "utf8"),
    ).messages;
    for (let phase = 0; phase < 4; phase++)
      assert.equal(
        bellPhaseName(phase, l.id),
        m["boss.bellringer.phase." + phase],
      );
    assert.equal(
      new Set([0, 1, 2, 3].map((p) => bellPhaseName(p, l.id))).size,
      4,
    );
    assert(
      bellPhaseHint(1, "crazed", l.id).includes(
        m["boss.bellringer.crazedHelp"],
      ),
    );
    assert.equal(
      signatureHelp(viewOf(g, "solo"), l.id),
      bellHelp("crazed", l.id),
    );
  }
  g.boss.health = g.boss.maxHealth * 0.7;
  const frames = new Set<number>();
  for (let i = 0; i < 400; i++) {
    g.step();
    const cues = g.director.services.bellringer.cues();
    assert.equal(bellFrame(cues, g.combatTick, true), 0);
    const f = bellFrame(cues, g.combatTick);
    assert(f >= 0 && f <= 15);
    if (f >= 8) frames.add(f);
  }
  assert.equal(frames.size, 8);
});
test(
  "real owner and observer replicate concurrent primary, newly warned Crazed responding bell, locked geometry and encounter cleanup",
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      a = new Session(endpoint),
      b = new Session(endpoint);
    try {
      const options = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "bellringer" as const,
        openingArenaId: "gatehouse",
      };
      await a.connect(options);
      await b.connect(
        { ...options, name: "Observer" },
        { roomId: a.room!.roomId },
      );
      await wait(() => a.view?.players.length === 2);
      a.start();
      await wait(() => b.view?.phase === "combat");
      const g = liveRooms.get(a.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      let primary;
      for (let i = 0; i < 800 && !primary; i++) {
        g.step();
        primary = g
          .bossCues()
          .find(
            (q) =>
              q.kind === "bell-ring" &&
              !q.echo &&
              q.state === "travel" &&
              g.bossCues().some((e) => e.kind === "bell-ring" && e.echo),
          );
      }
      assert(primary && primary.kind === "bell-ring");
      const echo = g.bossCues().find((q) => q.kind === "bell-ring" && q.echo),
        marker = g.bossCues().find((q) => q.kind === "bell-resonator");
      assert(echo && echo.kind === "bell-ring" && marker);
      assert.equal(echo.at - echo.beganAt, 48);
      assert.equal(echo.respondTo, primary.id);
      for (
        let i = 0;
        i < 100 &&
        !g
          .bossCues()
          .some(
            (q) => q.kind === "bell-ring" && q.echo && q.state === "travel",
          );
        i++
      )
        g.step();
      assert(
        g
          .bossCues()
          .some(
            (q) => q.kind === "bell-ring" && !q.echo && q.state === "travel",
          ),
      );
      assert(
        g
          .bossCues()
          .some(
            (q) => q.kind === "bell-ring" && q.echo && q.state === "travel",
          ),
      );
      const locked = [primary, echo, marker];
      assert(locked.every((q) => Number.isSafeInteger(q.id)));
      await wait(() =>
        [a, b].every((s) =>
          locked.every((q) => s.view?.bossCues.some((p) => p.id === q.id)),
        ),
      );
      for (const session of [a, b])
        for (const q of locked) {
          const replicated = session.view!.bossCues.find((p) => p.id === q.id)!;
          for (const key of [
            "id",
            "kind",
            "x",
            "y",
            "at",
            "gapAngle",
            "gap",
            "respondTo",
            "ringId",
          ] as const)
            if (key in q)
              assert.equal(Reflect.get(replicated, key), Reflect.get(q, key));
        }
      assert.equal(
        [...g.shots.values()].filter((q) => q.owner === "hostile").length,
        0,
      );
      g.boss.health = 0;
      g.step();
      await wait(() =>
        [a, b].every(
          (s) => !s.view?.bossCues.some((q) => q.kind.startsWith("bell-")),
        ),
      );
    } finally {
      await b.close();
      await a.close();
      await server.gracefullyShutdown(false);
    }
  },
);

test("known issued34 local state migrates exactly while a foreign34 revision and online-shaped data remain rejected", () => {
  const g = createPracticeGame(
      { mode: "endless", openingBossId: "bellringer" },
      "Mara",
      "soldier",
      "crazed",
    ),
    save = g.offlineCheckpoint()!,
    old = {
      ...structuredClone(save),
      protocolVersion: 34,
      contentRevision:
        "94552a8007ad25febb2f9c8e212ffdf28360bcb1df528a7c7ab226f7388ee675",
    };
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(after.protocolVersion, PROTOCOL);
  assert.equal(after.contentRevision, CONTENT_REVISION);
  assert.deepEqual(after.player, save.player);
  assert.deepEqual(after.completedBossForms, save.completedBossForms);
  for (const bad of [
    { ...old, contentRevision: "f".repeat(64) },
    { ...old, practiceOnly: false },
    { ...old, serverOnly: true },
    { ...old, players: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
});
