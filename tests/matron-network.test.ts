import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { matronFrame } from "../src/client/matron-presentation.ts";
import {
  matronPhaseName,
  matronPhaseHint,
  matronHelp,
} from "../src/client/matron-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { viewOf } from "../src/shared/view.ts";
import { readFileSync } from "node:fs";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
const issued =
  "850f5e0dd38cfd283ff0dbf079892b3595ccc489a95c70586e4fd4a24505402b";
const wait = async (check: () => boolean) => {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Matron cue did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test("only exact known issued30 Practice/profile state migrates to the current protocol while retaining builds, form history and optional settings", () => {
  const g = createPracticeGame(
      { mode: "endless", openingBossId: "matron", seed: 117 },
      "Mara",
      "soldier",
      "crazed",
    ),
    save = g.offlineCheckpoint()!,
    old = structuredClone(save);
  old.protocolVersion = 30;
  old.contentRevision = issued;
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 42);
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
  const profile = freshProfile();
  profile.contentRevision = issued;
  profile.settings.showNames = false;
  profile.settings.roomChat = false;
  const after = parseProfile(JSON.stringify(profile));
  assert.equal(after.contentRevision, CONTENT_REVISION);
  assert.deepEqual(after.settings, profile.settings);
  assert.deepEqual(after.controls, profile.controls);
});
test("all fifteen manual guides route distinct Matron phases and form help, with existing action poses and static reduced motion", () => {
  const g = createPracticeGame(
    { openingBossId: "matron", mode: "endless" },
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
    assert.equal(matronPhaseName(0, l.id), m["boss.matron.phase.0"]);
    assert.equal(matronPhaseName(1, l.id), m["boss.matron.phase.1"]);
    assert.notEqual(matronPhaseName(0, l.id), matronPhaseName(1, l.id));
    assert(
      matronPhaseHint(1, "crazed", l.id).includes(m["boss.matron.crazedHelp"]),
    );
    assert.equal(
      signatureHelp(viewOf(g, "solo"), l.id),
      matronHelp("crazed", l.id),
    );
  }
  let sawWalk = false,
    sawPulse = false;
  for (let i = 0; i < 1600 && !sawPulse; i++) {
    g.step();
    const cues = g.director.services.matron.cues();
    assert.equal(matronFrame(cues, g.combatTick, true), 0);
    if (cues.some((q) => q.kind === "matron-walk")) sawWalk = true;
    if (cues.some((q) => q.kind === "matron-pulse")) sawPulse = true;
    const frame = matronFrame(cues, g.combatTick);
    assert(frame >= 0 && frame <= 6);
  }
  assert(sawWalk && sawPulse);
});
test(
  "real owner and observer replicate locked relay geometry, crossing needle budgets and complete encounter cleanup",
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    const a = new Session(endpoint),
      b = new Session(endpoint);
    try {
      const options = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "matron" as const,
        openingArenaId: "triage-yard",
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
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      g.boss.deadline = 1e9;
      g.boss.health = g.boss.maxHealth * 0.49;
      let q;
      for (let i = 0; i < 2500 && !q; i++) {
        g.step();
        q = g
          .bossCues()
          .find((q) => q.kind === "matron-pulse" && q.index === 1);
      }
      assert(q && q.kind === "matron-pulse");
      const id = q.id;
      await wait(() =>
        [a, b].every((s) => s.view?.bossCues.some((c) => c.id === id)),
      );
      for (const session of [a, b]) {
        const actual = session.view!.bossCues.find((c) => c.id === id);
        assert.deepEqual(actual, q);
      }
      let burst;
      for (let i = 0; i < 1800 && !burst; i++) {
        g.step();
        burst = g
          .bossCues()
          .find((q) => q.kind === "matron-needles" && q.crossing);
      }
      assert(burst && burst.kind === "matron-needles");
      const burstId = burst.id;
      await wait(() =>
        [a, b].every((s) => s.view?.bossCues.some((c) => c.id === burstId)),
      );
      for (const session of [a, b])
        assert.deepEqual(
          session.view!.bossCues.find((c) => c.id === burstId),
          burst,
        );
      g.boss.health = 0;
      g.step();
      await wait(() =>
        [a, b].every(
          (s) =>
            !s.view?.bossCues.some(
              (c) =>
                c.kind.startsWith("matron-") ||
                (c.kind === "service-prop" && c.role === "nest"),
            ),
        ),
      );
    } finally {
      await b.close();
      await a.close();
      await server.gracefullyShutdown(false);
    }
  },
);
