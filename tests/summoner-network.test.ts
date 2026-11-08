import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput, PROTOCOL } from "../src/shared/protocol.ts";
async function wait(check: () => boolean) {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Retinue peer state did not arrive");
    await new Promise((r) => setTimeout(r, 15));
  }
}
test(
  "Real peers receive typed retinue bodies, owned orders, pause rejection, actual damage and cleanup without adding players or JSON actor traffic",
  { timeout: 25000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const a = new Session("http://127.0.0.1:" + address.port),
      b = new Session("http://127.0.0.1:" + address.port),
      late = new Session("http://127.0.0.1:" + address.port);
    try {
      const options = {
        name: "Joss",
        classId: "summoner" as const,
        mode: "raid" as const,
        difficulty: "normal",
      };
      await a.connect(options);
      await b.connect(
        { ...options, name: "Another Summoner" },
        { roomId: a.room!.roomId, kind: "freeplay" },
      );
      await wait(() => b.view?.players.length === 2);
      a.start();
      await wait(() => b.view?.phase === "combat");
      const room = liveRooms.get(a.room!.roomId)!,
        g = room.game,
        p = g.players.get(a.id)!;
      Object.defineProperty(g, "obstacles", { value: [] });
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      g.boss.health = g.boss.maxHealth = 1e6;
      g.boss.x = 1000;
      g.boss.y = 700;
      p.x = p.oldX = 800;
      p.y = p.oldY = 700;
      p.invulnerableUntil = 1e9;
      for (const other of g.players.values()) other.invulnerableUntil = 1e9;
      a.input({ ...idleInput(), sequence: 1, aim: 0, q: true });
      await wait(
        () =>
          b.view?.retinue?.filter((e) => e.owner === a.id && e.health > 0)
            .length === 2,
      );
      assert.equal(b.view!.players.length, 2);
      assert.equal(
        b.view!.players.find((p) => p.id === b.id)!.kit.retinueCount,
        0,
      );
      assert.equal(room.state.retinue.size, 2);
      assert(!JSON.parse(room.state.hazards).retinue);
      assert(!JSON.parse(room.state.hazards).summons);
      // Compare one acknowledged, frozen tick: live authority can otherwise
      // advance while its last encoded patch is still travelling to this peer.
      a.setMatchPaused(true);
      await wait(
        () =>
          b.view?.matchPaused === true && b.view.combatTick === g.combatTick,
      );
      for (const e of b.view!.retinue!) {
        const wire = room.state.retinue.get(String(e.id))!;
        assert.equal(e.x, wire.x / 4);
        assert.equal(e.oldY, wire.oldY / 4);
        assert.equal(e.aim, wire.aim / 1000);
        assert.equal(e.owner, a.id);
      }
      const health = g.boss.health;
      a.setMatchPaused(false);
      await wait(() => b.view?.matchPaused === false);
      await wait(() => g.boss.health < health);
      assert(p.damageDealt > 0);
      a.orderRetinue("hold");
      await wait(
        () =>
          b.view?.players.find((p) => p.id === a.id)?.kit.retinueOrder ===
          "hold",
      );
      assert.equal(
        b.view!.players.find((p) => p.id === b.id)!.kit.retinueOrder,
        "escort",
      );
      a.setMatchPaused(true);
      await wait(() => b.view?.matchPaused === true);
      const snapshot = g.retinue.snapshot();
      a.orderRetinue("escort");
      await new Promise((r) => setTimeout(r, 180));
      assert.equal(g.retinue.status(p, g.combatTick).retinueOrder, "hold");
      assert.deepEqual(g.retinue.snapshot(), snapshot);
      a.setMatchPaused(false);
      await wait(() => b.view?.matchPaused === false);
      await late.connect(
        {
          name: "Late observer",
          classId: "soldier",
          mode: "raid",
          difficulty: "normal",
        },
        { roomId: a.room!.roomId, kind: "freeplay" },
      );
      await wait(() => late.view?.retinue?.length === 2);
      assert(late.view!.retinue!.every((e) => e.owner === a.id));
      await a.close();
      await wait(() => !p.connected);
      await wait(() => b.view?.retinue?.length === 0);
      assert.equal(room.state.retinue.size, 0);
      assert.equal(PROTOCOL,69);
    } finally {
      await a.close();
      await b.close();
      await late.close();
      await server.gracefullyShutdown(false);
    }
  },
);
