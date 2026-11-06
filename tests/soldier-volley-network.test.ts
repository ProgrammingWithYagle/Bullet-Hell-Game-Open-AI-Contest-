import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { skirmisherIds as ids } from "../src/shared/soldier-skirmisher.ts";

test(
  "real peers serialize paid/relay proof and pause/late observation in a clearly controlled legal late-budget server fixture",
  { timeout: 20000 },
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
        const end = Date.now() + 7000;
        while (!check()) {
          assert(Date.now() < end, label);
          await new Promise((r) => setTimeout(r, 6));
        }
      };
    try {
      const options = {
        name: "Mara",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "normal",
        seed: 41,
        arenaSelection: "fixed" as const,
        openingArenaId: "gatehouse",
      };
      await host.connect(options);
      await ally.connect(
        { ...options, name: "Tamsin", classId: "engineer" },
        { roomId: host.room!.roomId },
      );
      const g = liveRooms.get(host.room!.roomId)!.game;
      // UNIT integration fixture only: place this lobby at the issued late budget, then purchase through real authority.
      // No such injection is used by natural runs or represented as ordinary fresh-backend progression.
      g.encounter = 9;
      for (const p of g.players.values()) p.totalSp = (g as any).skillBudget(9);
      for (const item of [
        "soldier-ballistics-1",
        ids.entry,
        ids.drill,
        ids.roving,
        ids.ready,
        ids.volley,
      ]) {
        host.purchase({ kind: "skill", item });
        await wait(
          () => g.players.get(host.id)!.skills.includes(item),
          "actual late legal purchase",
        );
      }
      host.start();
      await wait(() => ally.view?.phase === "combat", "combat");
      let sequence = 0;
      const magazine = g.players.get(host.id)!.ammo,
        end = Date.now() + 4000;
      while (g.players.get(host.id)!.ammo > magazine - 4) {
        assert(Date.now() < end, "actual primary expenditure");
        host.input({
          ...idleInput(),
          sequence: ++sequence,
          fire: true,
          aim: 0,
        });
        await new Promise((r) => setTimeout(r, 60));
      }
      host.input({ ...idleInput(), sequence: ++sequence, technique2: true });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "soldier-ready" && c.owner === host.id,
          ),
        "actual inserted opening",
      );
      host.input({
        ...idleInput(),
        sequence: ++sequence,
        technique1: true,
        moveY: 1,
      });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "soldier-step" && c.loaded && c.owner === host.id,
          ),
        "actual paid step",
      );
      const cue = ally.view!.classCues.find(
        (c) => c.kind === "soldier-step" && c.loaded,
      )!;
      assert(!("paidDrill" in cue) && !("paidLeg" in cue));
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused, "pause proof");
      const tick = g.combatTick;
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(g.combatTick, tick);
      await late.connect(
        { ...options, name: "Perrin", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await wait(() => !!late.view?.matchPaused, "late paused state");
      assert(
        late.view!.classCues.some((c) => c.kind === "soldier-step" && c.loaded),
      );
      assert.equal(
        late.view!.players.find((p) => p.id === late.id)!.skills.length,
        0,
      );
      host.setMatchPaused(false);
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "soldier-ready" && c.relay && c.owner === host.id,
          ),
        "causal public relay",
      );
      const relay = ally.view!.classCues.find(
        (c) => c.kind === "soldier-ready" && c.relay,
      )!;
      assert(!("source" in relay) && !("weapon" in relay));
      const beforeReject = g.kitStatus(host.id);
      host.input({
        ...idleInput(),
        sequence: ++sequence,
        technique1: true,
        moveX: -1,
      });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) =>
              c.kind === "soldier-step-reject" &&
              c.reason === "ground" &&
              c.owner === host.id,
          ),
        "public unspent route rejection",
      );
      assert(g.kitStatus(host.id).soldierReadyUntil! > g.combatTick);
      assert.equal(
        g.kitStatus(host.id).technique1At,
        beforeReject.technique1At,
      );
      const relayFrom = {
        x: g.players.get(host.id)!.x,
        y: g.players.get(host.id)!.y,
      };
      host.input({
        ...idleInput(),
        sequence: ++sequence,
        technique1: true,
        moveY: -1,
      });
      try {
        await wait(
          () =>
            !!ally.view?.classCues.some(
              (c) => c.kind === "soldier-step" && c.relay,
            ),
          "second paid step",
        );
      } catch (error) {
        const p = g.players.get(host.id)!;
        console.error(
          JSON.stringify({
            diagnostic: "second-paid-step",
            relayFrom,
            attemptedTo: { x: relayFrom.x, y: relayFrom.y - 90 },
            tick: g.combatTick,
            player: {
              x: p.x,
              y: p.y,
              ammo: p.ammo,
              health: p.health,
              status: p.status,
              ack: p.ack,
            },
            kit: g.kitStatus(p.id),
            obstacles: g.obstacles,
            lava: g.arena.lavaPits,
            bounds: g.arena.bounds,
          }),
        );
        throw error;
      }
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused, "pause second leg");
      host.endMatch();
      await wait(
        () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
        "host exit",
      );
      for (const peer of [host, ally, late]) {
        assert(
          !peer.view!.classCues.some(
            (c) => c.kind === "soldier-step" || c.kind === "soldier-ready",
          ),
        );
        assert.equal(
          peer.view!.players.find((p) => p.id === host.id)!.kit
            .soldierReadyUntil,
          0,
        );
      }
    } finally {
      host.close();
      ally.close();
      late.close();
      await server.gracefullyShutdown(false);
    }
  },
);
