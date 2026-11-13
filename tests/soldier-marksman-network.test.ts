import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { marksmanId } from "../src/shared/soldier-marksman.ts";

test(
  "ordinary Short peers share a real bank, preserve owner-only acquisition and paused late observation, and clear it on host exit",
  { timeout: 18000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      host = new Session(endpoint),
      ally = new Session(endpoint),
      late = new Session(endpoint);
    const wait = async (check: () => boolean, label: string) => {
      const end = Date.now() + 6000;
      while (!check()) {
        assert(Date.now() < end, label);
        await new Promise((r) => setTimeout(r, 5));
      }
    };
    try {
      const options = {
        mode: "short" as const,
        difficulty: "normal",
        seed: 41,
        arenaSelection: "fixed" as const,
        openingArenaId: "gatehouse",
        name: "Mara",
        classId: "soldier" as const,
      };
      await host.connect(options);
      await ally.connect(
        { ...options, name: "Tamsin", classId: "engineer" },
        { roomId: host.room!.roomId },
      );
      const g = liveRooms.get(host.room!.roomId)!.game,
        p = g.players.get(host.id)!;
      assert.equal(p.totalSp, 3);
      for (const item of ["soldier-ballistics-1", marksmanId]) {
        host.purchase({ kind: "skill", item });
        await wait(
          () =>
            !!host.view?.players
              .find((p) => p.id === host.id)
              ?.skills.includes(item),
          "ordinary purchase " + item,
        );
      }
      assert.equal(host.view!.players.find((p) => p.id === host.id)!.sp, 0);
      assert.equal(g.players.get(ally.id)!.skills.length, 0);
      ally.purchase({ kind: "skill", item: marksmanId });
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(g.players.get(ally.id)!.skills.length, 0);
      assert.equal(g.players.get(ally.id)!.totalSp, 3);
      host.start();
      await wait(() => ally.view?.phase === "combat", "combat");
      let sequence = 0;
      const ammo = p.ammo;
      host.input({
        ...idleInput(),
        sequence: ++sequence,
        aim: Math.PI,
        technique1: true,
      });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "soldier-bank" && c.owner === host.id,
          ),
        "actual wall contact",
      );
      host.input({ ...idleInput(), sequence: ++sequence, aim: Math.PI });
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused, "pause");
      const tick = g.combatTick,
        at = g.kitStatus(host.id).technique1At,
        bank = ally.view!.classCues.find((c) => c.kind === "soldier-bank")!;
      assert.equal(p.ammo, ammo - 1);
      assert.equal(p.eAt, 0);
      assert(at! > tick);
      assert(!("origin" in bank) && !("proof" in bank));
      assert(g.shots.has(bank.id));
      ally.room!.send("pauseMatch", false);
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(g.combatTick, tick);
      assert(ally.view!.matchPaused);
      await late.connect(
        { ...options, name: "Perrin", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await wait(() => !!late.view?.matchPaused, "late paused observation");
      assert(
        late.view!.classCues.some(
          (c) => c.kind === "soldier-bank" && c.id === bank.id,
        ),
      );
      assert.equal(
        late.view!.players.find((p) => p.id === late.id)!.skills.length,
        0,
      );
      assert.equal(
        late.view!.players.find((p) => p.id === host.id)!.kit.technique1At,
        at,
      );
      host.input({
        ...idleInput(),
        sequence: ++sequence,
        technique1: true,
        fire: true,
      });
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(g.combatTick, tick);
      assert.equal(p.ammo, ammo - 1);
      host.endMatch();
      await wait(
        () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
        "paused host exit",
      );
      assert(!g.shots.has(bank.id));
      for (const peer of [host, ally, late])
        assert(!peer.view!.classCues.some((c) => c.kind === "soldier-bank"));
    } finally {
      host.close();
      ally.close();
      late.close();
      await server.gracefullyShutdown(false);
    }
  },
);
