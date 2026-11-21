import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { Session } from "../src/client/session.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
async function wait(check: () => boolean) {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Stationmaster cues did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
}
test(
  "actual peers retain train phase, opened signals and delayed dispatches, then cancel everything on stagger",
  { timeout: 25000 },
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
        name: "Valve witness",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "stationmaster" as const,
        openingArenaId: "triage-yard",
      };
      await a.connect(options);
      await b.connect(
        { ...options, name: "Observer", classId: "medic" },
        { roomId: a.room!.roomId },
      );
      await wait(() => a.view?.players.length === 2);
      a.start();
      await wait(() => b.view?.phase === "combat");
      const g = liveRooms.get(a.room!.roomId)!.game;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      let guard = 0;
      while (!g.director.services.stationmaster.weakPoints().length) {
        g.step();
        assert(++guard < 200);
      }
      const valve = g.director.services.stationmaster.weakPoints()[0];
      await wait(() =>
        b.view!.bossCues.some(
          (q) => q.kind === "service-train-signal" && q.id === valve.id,
        ),
      );
      g.boss.health = g.boss.maxHealth * 0.74;
      g.step();
      assert.equal(g.boss.phase, 1);
      assert(
        g.director.services.stationmaster.cues().every((q) => q.phase === 0),
      );
      g.director.services.hit(valve.id, 999, g.combatTick);
      await wait(() =>
        [a, b].every((s) =>
          s.view!.bossCues.some(
            (q) =>
              q.kind === "service-train-track" &&
              q.signal === valve.id &&
              q.open,
          ),
        ),
      );
      while (
        !g.director.services.stationmaster.cues().some((q) => q.dispatch === 2)
      ) {
        g.step();
        assert(++guard < 500);
      }
      await wait(() =>
        b.view!.bossCues.some(
          (q) => q.kind === "service-train-track" && q.dispatch === 2,
        ),
      );
      for (const s of [a, b]) {
        const current = s.view!.bossCues.find(
          (q) => q.kind === "service-train-track" && q.dispatch === 2,
        );
        assert(
          current &&
            current.kind === "service-train-track" &&
            "phase" in current,
        );
        assert.equal(current.phase, 0);
      }
      g.boss.staggerUntil = g.combatTick + 90;
      g.step();
      await wait(() =>
        [a, b].every(
          (s) =>
            !s.view!.bossCues.some(
              (q) =>
                q.kind === "service-train-track" ||
                q.kind === "service-train-signal",
            ),
        ),
      );
      assert.deepEqual(g.director.services.stationmaster.diagnostics(), {
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
