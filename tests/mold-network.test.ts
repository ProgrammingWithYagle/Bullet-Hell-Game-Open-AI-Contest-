import { moldFree } from "../src/shared/mold-mixing.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { Game, data } from "../src/shared/game.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { moldFrame } from "../src/client/mold-presentation.ts";
import {
  moldPhaseName,
  moldPhaseHint,
  moldHelp,
} from "../src/client/mold-text.ts";
import { signatureHelp } from "../src/client/extension-ui.ts";
import { viewOf } from "../src/shared/view.ts";
import { readFileSync } from "node:fs";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
const issued =
  "b6cdeb5a0d7475f65192d16f26a91d31660e9593843704738e1ddf494f5191bb";
const wait = async (check: () => boolean) => {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Mold cue did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test("only exact known issued32 Practice/profile state migrates to the current protocol while retaining builds, form history and optional settings", () => {
  const g = createPracticeGame(
      { mode: "endless", openingBossId: "alchemist", seed: 117 },
      "Mara",
      "soldier",
      "crazed",
    ),
    save = g.offlineCheckpoint()!,
    old = structuredClone(save);
  old.protocolVersion = 32;
  old.contentRevision = issued;
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 34);
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
test("all fifteen manual guides route all four distinct Mold phases and form help, with eight newly drawn walking frames, retained action poses and static reduced motion", () => {
  const g = createPracticeGame(
    { openingBossId: "alchemist", mode: "endless" },
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
    assert.equal(moldPhaseName(0, l.id), m["boss.alchemist.phase.0"]);
    assert.equal(moldPhaseName(1, l.id), m["boss.alchemist.phase.1"]);
    assert.notEqual(moldPhaseName(0, l.id), moldPhaseName(1, l.id));
    for (let phase = 0; phase < 4; phase++)
      assert.equal(
        moldPhaseName(phase, l.id),
        m["boss.alchemist.phase." + phase],
      );
    assert.equal(
      new Set([0, 1, 2, 3].map((p) => moldPhaseName(p, l.id))).size,
      4,
    );
    assert(
      moldPhaseHint(1, "crazed", l.id).includes(m["boss.alchemist.crazedHelp"]),
    );
    assert.equal(
      signatureHelp(viewOf(g, "solo"), l.id),
      moldHelp("crazed", l.id),
    );
  }
  let sawWalk = false,
    sawPulse = false;
  for (let i = 0; i < 1600 && !sawPulse; i++) {
    g.step();
    const cues = g.director.services.alchemist.cues();
    assert.equal(moldFrame(cues, g.combatTick, true), 0);
    if (cues.some((q) => q.kind === "mold-walk")) sawWalk = true;
    if (cues.some((q) => q.kind === "mold-pool")) sawPulse = true;
    const frame = moldFrame(cues, g.combatTick);
    assert(frame >= 0 && frame <= 15);
  }
  assert(sawWalk && sawPulse);
});
test(
  "real owner and observer replicate aimed flasks, actual neutralization, cooled vessels, vapor tells and complete encounter cleanup",
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
        difficulty: "normal",
        openingBossId: "alchemist" as const,
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
      g.boss.health = g.boss.maxHealth * 0.39;
      const context = (
          g as unknown as {
            signatureContext(): import("../src/shared/boss-director.ts").SignatureContext;
          }
        ).signatureContext(),
        bounds = g.arena.bounds,
        point = moldFree(
          context,
          { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
          150,
        );
      assert(point);
      for (const p of g.players.values()) {
        p.invulnerableUntil = 1e9;
        p.x = point.x;
        p.y = point.y;
        p.oldX = point.x;
        p.oldY = point.y;
      }
      let flask;
      for (let i = 0; i < 250 && !flask; i++) {
        g.step();
        if (g.boss.phase === 2)
          flask = g
            .bossCues()
            .find((q) => q.kind === "mold-flask" && q.reagent === "acid");
      }
      assert(flask && flask.kind === "mold-flask");
      const locked = structuredClone(flask);
      assert.equal(locked.at - locked.beganAt, 42);
      await wait(() =>
        [a, b].every((s) => s.view?.bossCues.some((q) => q.id === locked.id)),
      );
      for (const s of [a, b])
        assert.deepEqual(
          s.view!.bossCues.find((q) => q.id === locked.id),
          locked,
        );
      for (const p of g.players.values()) {
        p.x = locked.x;
        p.y = locked.y;
        p.oldX = locked.x;
        p.oldY = locked.y;
      }
      while (g.combatTick < locked.at) g.step();
      let base;
      for (let i = 0; i < 120 && !base; i++) {
        g.step();
        base = g
          .bossCues()
          .find((q) => q.kind === "mold-flask" && q.reagent === "alkali");
      }
      assert(base && base.kind === "mold-flask");
      while (g.combatTick < base.at) g.step();
      const water = g
          .bossCues()
          .find((q) => q.kind === "mold-pool" && q.reagent === "water"),
        cooled = g
          .bossCues()
          .find((q) => q.kind === "mold-reactor" && q.state === "cooled");
      assert(water && cooled);
      const waterId = water.id,
        cooledId = cooled.id;
      await wait(() =>
        [a, b].every(
          (s) =>
            s.view?.bossCues.some((q) => q.id === waterId) &&
            s.view?.bossCues.some((q) => q.id === cooledId),
        ),
      );
      for (const s of [a, b]) {
        assert.deepEqual(
          s.view!.bossCues.find((q) => q.id === waterId),
          water,
        );
        assert.deepEqual(
          s.view!.bossCues.find((q) => q.id === cooledId),
          cooled,
        );
      }
      let gas;
      for (let i = 0; i < 120 && !gas; i++) {
        g.step();
        gas = g
          .bossCues()
          .find((q) => q.kind === "mold-gas" && q.at > g.combatTick);
      }
      assert(gas && gas.kind === "mold-gas");
      const gasId = gas.id;
      assert.equal(gas.at - gas.beganAt, 60);
      await wait(() =>
        [a, b].every((s) => s.view?.bossCues.some((q) => q.id === gasId)),
      );
      for (const s of [a, b])
        assert.deepEqual(
          s.view!.bossCues.find((q) => q.id === gasId),
          gas,
        );
      assert.equal(
        [...g.shots.values()].filter((q) => q.owner === "hostile").length,
        0,
      );
      g.boss.health = 0;
      g.step();
      await wait(() =>
        [a, b].every(
          (s) => !s.view?.bossCues.some((q) => q.kind.startsWith("mold-")),
        ),
      );
    } finally {
      await b.close();
      await a.close();
      await server.gracefullyShutdown(false);
    }
  },
);
