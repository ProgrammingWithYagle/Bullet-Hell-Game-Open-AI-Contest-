import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { skirmisherIds as ids } from "../src/shared/soldier-skirmisher.ts";

test(
  "real mixed-class peers see finite owner loading, pause/late observation and host-exit cleanup with ordinary Raid ownership",
  { timeout: 15000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      host = new Session(endpoint),
      ally = new Session(endpoint),
      late = new Session(endpoint),
      wait = async (check: () => boolean, label: string) => {
        const end = Date.now() + 6000;
        while (!check()) {
          assert(Date.now() < end, label);
          await new Promise((r) => setTimeout(r, 8));
        }
      };
    try {
      const options = {
        name: "Mara",
        classId: "soldier" as const,
        mode: "raid" as const,
        difficulty: "normal",
        seed: 41,
        arenaSelection: "fixed" as const,
        openingArenaId: "gatehouse",
        openingBossId: "constable" as const,
      };
      await host.connect(options);
      await ally.connect(
        { ...options, name: "Tamsin", classId: "engineer" },
        { roomId: host.room!.roomId },
      );
      const g = liveRooms.get(host.room!.roomId)!.game;
      assert.equal(g.players.get(host.id)!.totalSp, 12);
      for (const item of ["soldier-ballistics-1", ids.entry, ids.drill]) {
        host.purchase({ kind: "skill", item });
        await wait(
          () => g.players.get(host.id)!.skills.includes(item),
          "actual purchase",
        );
      }
      host.start();
      await wait(() => ally.view?.phase === "combat", "combat");
      const magazine = g.players.get(host.id)!.ammo;
      let sequence = 0;
      const firingEnd = Date.now() + 3500;
      while (g.players.get(host.id)!.ammo > magazine - 3) {
        assert(Date.now() < firingEnd, "actual expenditure");
        host.input({ ...idleInput(), sequence: ++sequence, fire: true });
        await new Promise((r) => setTimeout(r, 60));
      }
      host.input({ ...idleInput(), sequence: ++sequence, technique2: true });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "soldier-load" && c.owner === host.id,
          ),
        "public loading",
      );
      const load = ally.view!.classCues.find(
        (c) => c.kind === "soldier-load" && c.owner === host.id,
      )!;
      assert(!("weapon" in load) && !("interval" in load));
      assert.equal(
        ally.view!.players.find((p) => p.id === ally.id)!.kit.soldierLoadUntil,
        undefined,
      );
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused, "host pause");
      const tick = g.combatTick,
        ammo = g.players.get(host.id)!.ammo;
      ally.room!.send("endMatch");
      await new Promise((r) => setTimeout(r, 75));
      assert.equal(g.phase, "combat");
      assert.equal(g.combatTick, tick);
      assert.equal(g.players.get(host.id)!.ammo, ammo);
      await late.connect(
        { ...options, name: "Perrin", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await wait(() => !!late.view?.matchPaused, "late paused observer");
      assert(
        late.view!.classCues.some(
          (c) => c.kind === "soldier-load" && c.id === load.id,
        ),
      );
      assert.equal(
        late.view!.players.find((p) => p.id === late.id)!.skills.length,
        0,
      );
      host.setMatchPaused(false);
      await wait(
        () => g.players.get(host.id)!.ammo > ammo,
        "authority round completion",
      );
      host.input({ ...idleInput(), sequence: ++sequence, technique2: true });
      await wait(
        () =>
          g.players.get(host.id)!.ack === sequence &&
          !ally.view!.classCues.some((c) => c.kind === "soldier-load"),
        "owner stop",
      );
      assert(g.kitStatus(host.id).technique2At! > g.combatTick);
      host.endMatch();
      await wait(
        () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
        "host exit",
      );
      for (const peer of [host, ally, late])
        assert(!peer.view!.classCues.some((c) => c.kind === "soldier-load"));
    } finally {
      host.close();
      ally.close();
      late.close();
      await server.gracefullyShutdown(false);
    }
  },
);
