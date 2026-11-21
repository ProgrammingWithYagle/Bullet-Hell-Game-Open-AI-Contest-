import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const wait = async (check: () => boolean) => {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Stitchwork did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};

test(
  "real host and observer receive identical moving hems, needle cuts, pause state and defeat cleanup",
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer({ audience: "testing" });
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
        openingBossId: "stitchwright" as const,
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
      const room = liveRooms.get(a.room!.roomId)!,
        g = room.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      // Exercise actual phase entry, then wait for the owned current cast to finish.
      g.boss.health = g.boss.maxHealth * 0.49;
      for (
        let t = 0;
        t < 1400 &&
        !g
          .bossCues()
          .some(
            (q) =>
              q.kind === "stitch-seam" &&
              q.style === "hem" &&
              g.combatTick > q.at + 5,
          );
        t++
      )
        g.step();
      const gate = g.bossCues().find((q) => q.kind === "stitch-gate"),
        needle = g.director.services.stitchwright.weakPoints()[0];
      assert(gate && needle);
      await wait(() =>
        [a, b].every((s) => s.view?.bossCues.some((q) => q.id === gate.id)),
      );
      a.setMatchPaused(true);
      await wait(
        () => a.view?.matchPaused === true && b.view?.matchPaused === true,
      );
      const tick = g.combatTick;
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(g.combatTick, tick);
      const authoritative = g
        .bossCues()
        .filter((q) => q.kind.startsWith("stitch-"));
      await wait(() =>
        [a, b].every(
          (s) =>
            JSON.stringify(
              s.view?.bossCues.filter((q) => q.kind.startsWith("stitch-")),
            ) === JSON.stringify(authoritative),
        ),
      );
      assert(g.director.hitWeakPoint(999, g.combatTick, needle.id) > 0);
      const connected = g
        .bossCues()
        .filter(
          (q) =>
            q.kind === "stitch-seam" &&
            (q.pin1 === needle.id || q.pin2 === needle.id),
        );
      assert(connected.length > 0);
      assert(connected.every((q) => q.kind === "stitch-seam" && q.disabled));
      a.setMatchPaused(false);
      await wait(
        () => a.view?.matchPaused === false && b.view?.matchPaused === false,
      );
      await wait(() =>
        [a, b].every((s) =>
          connected.every((q) =>
            s.view?.bossCues.some(
              (copy) =>
                copy.id === q.id &&
                copy.kind === "stitch-seam" &&
                copy.disabled,
            ),
          ),
        ),
      );
      g.boss.health = 0;
      g.step();
      await wait(() =>
        [a, b].every(
          (s) =>
            !s.view?.bossCues.some(
              (q) =>
                q.kind.startsWith("stitch-") || q.kind === "service-tether",
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
