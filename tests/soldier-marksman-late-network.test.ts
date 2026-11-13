import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput, type Event } from "../src/shared/protocol.ts";
import { marksmanIds as ids } from "../src/shared/soldier-marksman.ts";
for (const fork of [ids.carom, ids.line])
  test(
    "late " +
      fork +
      " real peers retain held reload, earned relay, independent owner-only Twin flights and paused host cleanup in a controlled legal27SP authority fixture",
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
        events: Event[] = [],
        other: Event[] = [];
      host.onEvents = (e) => events.push(...e);
      ally.onEvents = (e) => other.push(...e);
      const wait = async (check: () => boolean, label: string) => {
        const end = Date.now() + 6000;
        while (!check()) {
          assert(Date.now() < end, label);
          await new Promise((r) => setTimeout(r, 5));
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
        const g = liveRooms.get(host.room!.roomId)!.game,
          p = g.players.get(host.id)!;
        // Controlled server integration fixture only. No local save is sent to a room or treated as online proof.
        g.encounter = 9;
        for (const member of g.players.values())
          member.totalSp = (g as any).skillBudget(9);
        assert.equal(p.totalSp, 27);
        for (const item of [
          "soldier-ballistics-1",
          ids.entry,
          fork,
          ids.pair,
          ids.reserve,
          ids.relay,
          ids.twin,
        ]) {
          host.purchase({ kind: "skill", item });
          await wait(
            () =>
              p.skills.includes(item) &&
              !!host.view?.players
                .find((q) => q.id === p.id)
                ?.skills.includes(item),
            "real authority and separate view acknowledgment " + item,
          );
        }
        assert.equal(host.view!.players.find((p) => p.id === host.id)!.sp, 7);
        host.start();
        await wait(() => ally.view?.phase === "combat", "combat");
        let sequence = 0;
        const input = (action: object) =>
            host.input({
              ...idleInput(),
              sequence: ++sequence,
              aim: Math.PI,
              ...action,
            }),
          ammo = p.ammo;
        input({ technique1: true, technique2: true });
        await wait(
          () => g.kitStatus(p.id).soldierPairUntil! > g.combatTick,
          "actual first B bank",
        );
        input({ reload: true });
        await wait(
          () =>
            !!ally.view?.players.find((q) => q.id === p.id)?.kit
              .soldierPairHeld,
          "shared held reload status",
        );
        host.setMatchPaused(true);
        await wait(() => !!ally.view?.matchPaused, "held reload pause");
        const tick = g.combatTick,
          until = g.kitStatus(p.id).soldierPairUntil,
          at = g.kitStatus(p.id).technique1At,
          pairAt = g.kitStatus(p.id).technique2At;
        assert.equal(p.ammo, ammo - 2);
        ally.room!.send("pauseMatch", false);
        ally.room!.send("endMatch");
        await new Promise((r) => setTimeout(r, 60));
        assert.equal(g.combatTick, tick);
        assert.equal(g.phase, "combat");
        await late.connect(
          { ...options, name: "Perrin", classId: "medic" },
          { roomId: host.room!.roomId },
        );
        await wait(() => !!late.view?.matchPaused, "late paused observation");
        assert(
          late.view!.players.find((q) => q.id === p.id)!.kit.soldierPairHeld,
        );
        assert.equal(
          late.view!.players.find((q) => q.id === late.id)!.skills.length,
          0,
        );
        input({ technique2: true, technique1: true, fire: true });
        await new Promise((r) => setTimeout(r, 60));
        assert.equal(p.ammo, ammo - 2);
        assert.equal(g.kitStatus(p.id).soldierPairUntil, until);
        host.setMatchPaused(false);
        input({});
        await wait(() => p.reloadAt === 0, "real reload completion");
        const full = p.ammo;
        input({ technique2: true });
        await wait(
          () => g.kitStatus(p.id).soldierRelayUntil! > g.combatTick,
          "second bank earns relay",
        );
        host.setMatchPaused(true);
        await wait(() => !!ally.view?.matchPaused, "relay pause");
        assert.equal(p.ammo, full - 1);
        assert.equal(g.kitStatus(p.id).soldierPairUntil, 0);
        assert.equal(g.kitStatus(p.id).technique2At, pairAt);
        const prior = new Set(g.shots.keys());
        host.setMatchPaused(false);
        input({ technique1: true, aim: -Math.PI / 2 });
        await wait(() => p.ammo === full - 3, "two real Twin cartridges");
        await wait(
          () =>
            new Set(
              events
                .filter((e) => e.type === "shots")
                .flatMap((e) => e.shots)
                .filter(
                  (s) => s.owner === p.id && !prior.has(s.id) && s.vy < -800,
                )
                .map((s) => s.id),
            ).size === 2,
          "both owner-only event messages",
        );
        host.setMatchPaused(true);
        await wait(() => !!ally.view?.matchPaused, "Twin flight pause");
        const twin = [
          ...new Map(
            events
              .filter((e) => e.type === "shots")
              .flatMap((e) => e.shots)
              .filter(
                (s) => s.owner === p.id && !prior.has(s.id) && s.vy < -800,
              )
              .map((s) => [s.id, s]),
          ).values(),
        ];
        assert.equal(twin.length, 2);
        assert(twin.some((s) => s.vx < 0) && twin.some((s) => s.vx > 0));
        assert(twin.every((s) => g.shots.has(s.id)));
        assert.equal(g.kitStatus(p.id).soldierRelayUntil, 0);
        assert(g.kitStatus(p.id).technique1At! > at!);
        assert.equal(p.eAt, 0);
        assert(
          !other.some(
            (e) => e.type === "shots" && e.shots.some((s) => s.owner === p.id),
          ),
        );
        for (const cue of ally.view!.classCues.filter(
          (c) => c.kind === "soldier-bank",
        ))
          for (const key of ["origin", "proof", "earnsRelay", "twin"])
            assert(!(key in cue));
        host.endMatch();
        await wait(
          () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
          "paused host exit",
        );
        await wait(
          () =>
            twin.every((s) =>
              events.some((e) => e.type === "remove" && e.ids.includes(s.id)),
            ),
          "actual owner flight removals",
        );
        assert(twin.every((s) => !g.shots.has(s.id)));
        assert(
          !other.some(
            (e) =>
              e.type === "remove" && twin.some((s) => e.ids.includes(s.id)),
          ),
        );
        assert.equal(p.ammo, full - 3);
        assert.equal(p.skills.length, 7);
      } finally {
        host.close();
        ally.close();
        late.close();
        await server.gracefullyShutdown(false);
      }
    },
  );
