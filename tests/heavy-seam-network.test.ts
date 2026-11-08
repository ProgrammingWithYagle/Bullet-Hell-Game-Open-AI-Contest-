import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput, type Event } from "../src/shared/protocol.ts";
import {
  seamId,
  validSeamPrivateEvent,
  type SeamPrivateEvent,
} from "../src/shared/heavy-seam.ts";
import { flakIds as ids } from "../src/shared/heavy-flak.ts";
import { restWait } from "./helpers/sniper-rest-flow.ts";

test(
  "real Room serialization delivers controlled Seam paths only to their owner and shares actual contacts with foreign and late peers",
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
      sessions = [host, ally, late],
      events = new Map(sessions.map((s) => [s, [] as Event[]]));
    for (const s of sessions)
      s.onEvents = (batch) => events.get(s)!.push(...structuredClone(batch));
    try {
      const options = {
        name: "Controlled Seam owner",
        classId: "heavy" as const,
        mode: "raid" as const,
        difficulty: "normal",
        maxPlayers: 4,
        arenaSelection: "fixed" as const,
        openingArenaId: "gatehouse",
      };
      await host.connect(options);
      await ally.connect(
        { ...options, name: "Foreign soldier", classId: "soldier" },
        { roomId: host.room!.roomId },
      );
      await restWait(
        () =>
          host.view?.players.length === 2 && ally.view?.players.length === 2,
        "two actual Room peers",
      );
      const room = liveRooms.get(host.room!.roomId)!,
        g = room.game,
        p = g.players.get(host.id)!;
      // Controlled server setup isolates transport. This is not an earned-budget or ordinary-run witness.
      p.totalSp = 19;
      for (const item of ["heavy-ordnance-1", ids.entry, ids.command, seamId])
        assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
      host.start();
      await restWait(() => host.view?.phase === "combat", "actual Room start");
      host.setMatchPaused(true);
      await restWait(
        () => !!host.view?.matchPaused && !!ally.view?.matchPaused,
        "freeze the Room timer for controlled fixed steps",
      );
      Object.defineProperty(g, "arena", { value: structuredClone(g.arena) });
      g.arena.obstacles.length = g.arena.lavaPits.length = 0;
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      g.boss.x = 1200;
      g.boss.y = 200;
      g.boss.health = g.boss.maxHealth = 1e6;
      for (const owner of g.players.values()) {
        owner.x = owner.oldX = owner.id === host.id ? 600 : 1400;
        owner.y = owner.oldY = owner.id === host.id ? 600 : 900;
        owner.invulnerableUntil = 1e9;
      }
      const wireRoom = room as unknown as {
          syncState(): void;
          flushEvents(): void;
        },
        flush = () => {
          wireRoom.syncState();
          wireRoom.flushEvents();
        };
      let sequence = 0;
      const step = (action: object = {}) => {
        assert(
          g.submitInput(p.id, {
            ...idleInput(),
            sequence: ++sequence,
            aim: 0,
            ...action,
          }),
        );
        g.step();
        flush();
      };
      const ammo = p.ammo;
      step({ technique1: true });
      const shell = [...g.shots.values()].find(
        (s) => s.owner === p.id && s.visual === "flak",
      )!;
      assert(shell);
      const recovery = g.kitStatus(p.id).technique1At;
      await restWait(
        () =>
          events
            .get(host)!
            .some((e) => e.type === "private-class-cues" && e.cues.length > 0),
        "separate actual owner path event",
      );
      await late.connect(
        { ...options, name: "Late medic", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await restWait(
        () => !!late.view?.matchPaused,
        "late peer sees actual paused Room state",
      );
      assert.equal(
        late.view!.players.find((x) => x.id === late.id)!.skills.length,
        0,
      );
      for (let n = 0; n < 9; n++) step();
      assert.equal(shell.x, 750);
      (g as any).emitShot("hostile", 615, 600, 0, 0, 0, 3, 0, 10);
      step({ technique1: true });
      const cue = g
        .classCues()
        .find((c) => c.kind === "heavy-flak-seam-contacts");
      assert(cue && cue.kind === "heavy-flak-seam-contacts");
      assert.deepEqual(cue.contacts, [{ x: 615, y: 600 }]);
      await restWait(
        () =>
          sessions.every((s) => s.view?.classCues.some((c) => c.id === cue.id)),
        "actual contact feedback reaches all three real peers",
      );
      await restWait(
        () =>
          events
            .get(host)!
            .some(
              (e) =>
                e.type === "private-class-cues" &&
                e.cues.some((c) => c.stage === "cut"),
            ),
        "separate actual private cut event",
      );
      const paths = events
        .get(host)!
        .filter((e): e is SeamPrivateEvent => e.type === "private-class-cues");
      assert(paths.every(validSeamPrivateEvent));
      const cut = paths.findLast((e) => e.cues.some((c) => c.stage === "cut"))!;
      assert.deepEqual(cut.cues[0].points[0], { x: 600, y: 600 });
      assert.deepEqual(cut.cues[0].points.at(-1), { x: 750, y: 600 });
      assert.equal(cut.run, g.settings.runId);
      for (const peer of [ally, late]) {
        assert(!events.get(peer)!.some((e) => e.type === "private-class-cues"));
        assert(
          !events
            .get(peer)!
            .some(
              (e) =>
                e.type === "shots" && e.shots.some((s) => s.owner === p.id),
            ),
        );
        assert(
          !events
            .get(peer)!
            .some((e) => e.type === "remove" && e.ids.includes(shell.id)),
        );
        assert.deepEqual(
          peer.view!.classCues.find((c) => c.id === cue.id),
          cue,
        );
      }
      assert(!room.state.hazards.includes("heavy-flak-seam-owner"));
      for (const s of sessions)
        assert(
          !s.view!.classCues.some(
            (c) => (c as any).kind === "heavy-flak-seam-owner",
          ),
        );
      assert.deepEqual(
        Object.keys(cue).sort(),
        ["kind", "id", "owner", "at", "until", "contacts"].sort(),
      );
      assert.equal(p.ammo, ammo - 1);
      assert.equal(g.kitStatus(p.id).technique1At, recovery);
      host.endMatch();
      await restWait(
        () =>
          sessions.every((s) => s.view?.endedByHost) &&
          events
            .get(host)!
            .some((e) => e.type === "private-class-cues" && !e.cues.length),
        "host end clears the actual private path",
      );
      assert(!events.get(ally)!.some((e) => e.type === "private-class-cues"));
      assert(!events.get(late)!.some((e) => e.type === "private-class-cues"));
    } finally {
      for (const s of sessions) s.close();
      await server.gracefullyShutdown(false);
    }
  },
);
