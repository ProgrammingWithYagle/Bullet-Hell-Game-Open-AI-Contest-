import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import type { Game } from "../src/shared/game.ts";
async function wait(check: () => boolean) {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Baking did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
}
function until(g: Game, check: () => boolean) {
  let count = 0;
  while (!check()) {
    g.step();
    assert(++count < 1000);
  }
}
test(
  "actual owner and observer share landed crust health, child cuts, retained phase batches and fresh Crazed warnings",
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
        name: "Baker witness",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "ash-baker" as const,
        openingArenaId: "triage-yard",
      };
      await a.connect(options);
      await b.connect(
        { ...options, name: "Oven observer", classId: "medic" },
        { roomId: a.room!.roomId },
      );
      await wait(() => a.view?.players.length === 2);
      a.start();
      await wait(() => b.view?.phase === "combat");
      const g = liveRooms.get(a.room!.roomId)!.game;
      assert.equal(g.boss.id, "ash-baker");
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      until(g, () => g.director.services.baker.weakPoints().length > 0);
      const crust = g.director.services.baker.weakPoints()[0];
      await wait(() =>
        b.view!.bossCues.some(
          (q) =>
            q.kind === "service-baker-loaf" && q.id === crust.id && q.landed,
        ),
      );
      for (const s of [a, b]) {
        const q = s.view!.bossCues.find(
          (q) => q.kind === "service-baker-loaf" && q.id === crust.id,
        );
        assert(q && q.kind === "service-baker-loaf");
        assert.equal(q.health, crust.health);
        assert.equal(q.endX, crust.endX);
      }
      g.boss.health = g.boss.maxHealth * 0.74;
      g.step();
      await wait(() => b.view?.boss.phase === 1);
      assert(
        g.director.services.baker
          .cues()
          .some((q) => q.id === crust.id && q.phase === 0),
      );
      assert(g.director.services.hit(crust.id, 999, g.combatTick) > 0);
      await wait(() =>
        [a, b].every(
          (s) =>
            !s.view!.bossCues.some(
              (q) => q.kind === "service-baker-crumb" && q.parent === crust.id,
            ),
        ),
      );
      until(g, () =>
        g.director.services.baker.cues().some((q) => q.batch === 2),
      );
      await wait(() =>
        b.view!.bossCues.some(
          (q) => q.kind === "service-baker-loaf" && q.batch === 2,
        ),
      );
      for (const s of [a, b]) {
        const q = s.view!.bossCues.find(
          (q) => q.kind === "service-baker-loaf" && q.batch === 2,
        );
        assert(q && q.kind === "service-baker-loaf");
        assert.equal(q.at - q.beganAt, 54);
        assert.equal(q.phase, 0);
      }
      g.boss.staggerUntil = g.combatTick + 90;
      g.step();
      await wait(() =>
        [a, b].every(
          (s) =>
            !s.view!.bossCues.some((q) => q.kind.startsWith("service-baker-")),
        ),
      );
      assert.deepEqual(g.director.services.baker.diagnostics(), {
        shapes: 0,
        queued: 0,
        hitGroups: 0,
      });
    } finally {
      await a.close();
      await b.close();
      await server.gracefullyShutdown(false);
    }
  },
);
