import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { ambulanceFrame } from "../src/client/ambulance-presentation.ts";
import {
  ambulancePhaseName,
  ambulancePhaseHint,
  ambulanceHelp,
} from "../src/client/ambulance-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { viewOf } from "../src/shared/view.ts";
import { readFileSync } from "node:fs";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
const issued =
  "e6db0059a1510315047e400e2c135ca2fd3a0368cea21c035946ff6a877631b2";
const wait = async (check: () => boolean) => {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Ambulance cue did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test("only exact known issued29 Practice/profile state migrates to the current protocol while retaining builds, form history and optional settings", () => {
  const g = createPracticeGame(
      { mode: "endless", openingBossId: "black-ambulance", seed: 117 },
      "Mara",
      "soldier",
      "crazed",
    ),
    save = g.offlineCheckpoint()!,
    old = structuredClone(save);
  old.protocolVersion = 29;
  old.contentRevision = issued;
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 36);
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
test("all fifteen manual guides route distinct Ambulance phases and form help, with existing action poses and static reduced motion", () => {
  const g = createPracticeGame(
    { openingBossId: "black-ambulance", mode: "endless" },
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
    assert.equal(
      ambulancePhaseName(0, l.id),
      m["boss.black-ambulance.phase.0"],
    );
    assert.equal(
      ambulancePhaseName(1, l.id),
      m["boss.black-ambulance.phase.1"],
    );
    assert.notEqual(ambulancePhaseName(0, l.id), ambulancePhaseName(1, l.id));
    assert(
      ambulancePhaseHint(1, "crazed", l.id).includes(
        m["boss.black-ambulance.crazedHelp"],
      ),
    );
    assert.equal(
      signatureHelp(viewOf(g, "solo"), l.id),
      ambulanceHelp("crazed", l.id),
    );
  }
  let sawLane = false,
    sawDriver = false;
  for (let i = 0; i < 3000 && !sawDriver; i++) {
    g.step();
    const cues = g.director.civic.ambulance.cues();
    assert.equal(ambulanceFrame(cues, g.combatTick, true), 0);
    const lane = cues.find((q) => q.kind === "ambulance-lane");
    if (lane?.kind === "ambulance-lane") {
      sawLane = true;
      const frame = ambulanceFrame(cues, g.combatTick);
      assert(frame >= 1 && frame <= 5);
    }
    if (cues.some((q) => q.kind === "driver")) {
      sawDriver = true;
      assert.equal(ambulanceFrame(cues, g.combatTick), 7);
    }
  }
  assert(sawLane && sawDriver);
});
test(
  "real owner and observer replicate locked second-dispatch geometry, door repeat budgets and complete encounter cleanup",
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
        openingBossId: "black-ambulance" as const,
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
          .find((q) => q.kind === "ambulance-lane" && q.leg === 2);
      }
      assert(q && q.kind === "ambulance-lane");
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
          .find((q) => q.kind === "ambulance-burst" && q.crossing);
      }
      assert(burst && burst.kind === "ambulance-burst");
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
              (c) => c.kind.startsWith("ambulance-") || c.kind === "driver",
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
