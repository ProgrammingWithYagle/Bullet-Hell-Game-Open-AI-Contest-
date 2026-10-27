import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const wait = async (check: () => boolean) => {
  const end = Date.now() + 7000;
  while (!check()) {
    if (Date.now() > end) throw Error("New mechanics did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test("only the known issued protocol28 local Practice boundary migrates to29 with player and form history intact", () => {
  const g = createPracticeGame(
      {
        openingBossId: "quarantine-clerk",
        mode: "endless",
        difficulty: "normal",
        seed: 71,
      },
      "Mara",
      "soldier",
      "crazed",
    ),
    save = g.offlineCheckpoint()!,
    old = structuredClone(save);
  old.protocolVersion = 28;
  old.contentRevision =
    "39ca64136ddb477d344eb75408a22ed239af57efb1d3a3a4f5893ac33c13864d";
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(restored.protocolVersion, PROTOCOL);
  assert.equal(PROTOCOL, 31);
  assert.equal(restored.contentRevision, CONTENT_REVISION);
  assert.deepEqual(restored.player, save.player);
  assert.deepEqual(restored.completedBossForms, save.completedBossForms);
  assert.deepEqual(restored.selectedContract, save.selectedContract);
  for (const bad of [
    { ...old, contentRevision: "0".repeat(64) },
    { ...old, serverOnly: true },
    { ...old, practiceOnly: false },
    { ...old, players: [] },
    { ...old, transactions: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
});
test(
  "real owner and observer receive Widow crossing geometry and combat-long Clerk domains, with complete victory cleanup",
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    try {
      for (const bossId of ["gate-widow", "quarantine-clerk"] as const) {
        const a = new Session(endpoint),
          b = new Session(endpoint);
        try {
          const options = {
            name: "Host",
            classId: "soldier" as const,
            mode: "endless" as const,
            difficulty: "hellish",
            openingBossId: bossId,
            openingArenaId: "crown-crypt",
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
          g.boss.health = g.boss.maxHealth * 0.49;
          g.step();
          const desired = () =>
            bossId === "gate-widow"
              ? g.bossCues().find((c) => c.kind === "gate" && c.leg === 2)
              : g
                  .bossCues()
                  .find(
                    (c) => c.kind === "clerk-domain" && g.combatTick >= c.at,
                  );
          for (let n = 0; n < 1800 && !desired(); n++) g.step();
          const q = desired();
          assert(q);
          await wait(() =>
            [a, b].every((s) => s.view?.bossCues.some((c) => c.id === q.id)),
          );
          for (const session of [a, b]) {
            const found: NonNullable<Session["view"]>["bossCues"][number] = session.view!.bossCues.find((c) => c.id === q.id)!;
            assert.deepEqual(found, q);
          }
          if (bossId === "quarantine-clerk") {
            g.director.clerk.cancelCast();
            g.boss.staggerUntil = g.combatTick + 90;
            g.step();
            assert(g.bossCues().some((c) => c.id === q.id));
          }
          g.boss.health = 0;
          g.step();
          await wait(() =>
            [a, b].every(
              (s) =>
                !s.view?.bossCues.some(
                  (c) =>
                    c.kind === "gate" ||
                    c.kind === "widow-pall" ||
                    c.kind === "widow-needles" ||
                    c.kind === "clerk-domain",
                ),
            ),
          );
        } finally {
          await b.close();
          await a.close();
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
