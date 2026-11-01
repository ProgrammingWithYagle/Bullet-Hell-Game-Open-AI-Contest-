import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput } from "../src/shared/protocol.ts";

async function wait(check: () => boolean) {
  const until = Date.now() + 7000;
  while (!check()) {
    assert(Date.now() < until, "Bard peer state did not arrive");
    await new Promise((r) => setTimeout(r, 15));
  }
}
test(
  "Two real peers observe owned SP purchases, actual note-hit cadence, spent phrases and disconnected-owner cleanup",
  { timeout: 25000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const a = new Session("http://127.0.0.1:" + address.port),
      b = new Session("http://127.0.0.1:" + address.port);
    try {
      await a.connect({
        name: "Iven",
        classId: "bard",
        mode: "short",
        difficulty: "normal",
      });
      await b.connect(
        {
          name: "Another Bard",
          classId: "bard",
          mode: "short",
          difficulty: "normal",
        },
        { roomId: a.room!.roomId, kind: "freeplay" },
      );
      await wait(() => b.view?.players.length === 2);
      a.purchase({ kind: "skill", item: "bard-performance-1" });
      await wait(
        () =>
          b.view?.players.some(
            (p) => p.id === a.id && p.skills.includes("bard-performance-1"),
          ) === true,
      );
      assert.equal(b.view!.players.find((p) => p.id === b.id)!.sp, 3);
      a.start();
      await wait(() => b.view?.phase === "combat");
      const g = liveRooms.get(a.room!.roomId)!.game,
        p = g.players.get(a.id)!;
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      g.boss.health = g.boss.maxHealth = 1e6;
      g.boss.x = 1000;
      g.boss.y = 700;
      p.x = p.oldX = 800;
      p.y = p.oldY = 700;
      p.invulnerableUntil = 1e9;
      let sequence = 0;
      const held = setInterval(
        () =>
          a.input({ ...idleInput(), sequence: ++sequence, aim: 0, fire: true }),
        50,
      );
      try {
        await wait(
          () => b.view?.players.find((p) => p.id === a.id)?.kit.cadence === 3,
        );
      } finally {
        clearInterval(held);
      }
      assert.equal(b.view!.players.find((p) => p.id === b.id)!.kit.cadence, 0);
      a.input({ ...idleInput(), sequence: ++sequence, aim: 0 });
      await wait(() => p.ack >= sequence);
      // Wait out the one already-fired note before observing the spend.
      await new Promise((r) => setTimeout(r, 400));
      a.input({
        ...idleInput(),
        sequence: ++sequence,
        q: true,
        ultimate: true,
      });
      await wait(
        () =>
          b.view?.classCues.some(
            (c) => c.kind === "bard-phrase" && c.owner === a.id,
          ) === true,
      );
      assert.equal(b.view!.players.find((p) => p.id === a.id)!.kit.cadence, 0);
      assert.equal(g.bard.status(b.id).cadence, 0);
      await a.close();
      await wait(() => !g.players.get(p.id)?.connected);
      await wait(
        () =>
          b.view?.classCues.every(
            (c) => !c.kind.startsWith("bard-") || c.owner !== p.id,
          ) === true,
      );
    } finally {
      await a.close();
      await b.close();
      await server.gracefullyShutdown(false);
    }
  },
);
