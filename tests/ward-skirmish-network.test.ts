import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { Game } from "../src/shared/game.ts";
async function wait(check: () => boolean) {
  const end = Date.now() + 10000;
  while (!check()) {
    assert(Date.now() < end, "Skirmish objective did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
}
test(
  "real peers share a standalone ordinary objective, warned spawns and completion without boss receipts",
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
      const opts = {
        name: "Mara",
        classId: "soldier" as const,
        mode: "short" as const,
        difficulty: "normal",
        freePlay: { scenarioId: "ward-approach" as const },
      };
      await a.connect(opts);
      await b.connect(
        { ...opts, name: "Tamsin", classId: "engineer" },
        { roomId: a.room!.roomId },
      );
      await wait(() => b.view?.players.length === 2);
      assert.equal(b.view!.objective?.status, "briefing");
      const g = liveRooms.get(a.room!.roomId)!.game;
      const copy = Game.restoreAuthoritative(
        JSON.parse(JSON.stringify(g.authoritativeCheckpoint())),
      );
      assert.equal(copy.objective?.status, "briefing");
      a.start();
      await wait(
        () =>
          b.view?.phase === "combat" && b.view.objective?.status === "warning",
      );
      assert(a.view!.run.customized);
      assert.equal(b.view!.arenaId, "triage-yard");
      assert.deepEqual(a.view!.objective, b.view!.objective);
      assert(b.view!.objective!.portals.every((p) => p.at - g.combatTick > 30));
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      let seenActors = false,
        guard = 0;
      while (g.phase === "combat" && guard++ < 2000) {
        g.step();
        if (g.minions.actors.size) seenActors = true;
        for (const actor of g.minions.actors.values())
          g.minions.hit(actor.id, 1e6, g.combatTick);
      }
      assert(seenActors);
      assert.equal(g.phase, "victory");
      await wait(
        () =>
          b.view?.objective?.status === "complete" &&
          a.view?.phase === "victory",
      );
      assert.equal(b.view!.objective!.remaining, 0);
      assert.equal(b.view!.campaignBank, null);
      assert.equal(g.completedBossIds.size, 0);
      assert(
        b.view!.players.every(
          (p) =>
            p.progress.clears === 0 && p.progress.clearedBossIds.length === 0,
        ),
      );
      assert.equal(b.view!.minions.length, 0);
      assert.deepEqual(a.view!.objective, b.view!.objective);
    } finally {
      await a.close();
      await b.close();
      await server.gracefullyShutdown(false);
    }
  },
);
