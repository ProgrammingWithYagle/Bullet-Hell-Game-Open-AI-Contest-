import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput, PROTOCOL } from "../src/shared/protocol.ts";
async function wait(check: () => boolean) {
  const end = Date.now() + 10000;
  while (!check()) {
    assert(Date.now() < end, "Ranger peer state did not arrive");
    await new Promise((r) => setTimeout(r, 15));
  }
}
test(
  "Real Ranger peers retain owned SP, actual delayed damage, finite ground, paused clocks, late observation and separate chapter identity",
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      a = new Session(endpoint),
      b = new Session(endpoint),
      late = new Session(endpoint),
      story = new Session(endpoint);
    try {
      const options = {
        name: "Nela",
        classId: "ranger" as const,
        mode: "raid" as const,
        difficulty: "normal",
      };
      await a.connect(options);
      await b.connect(
        { ...options, name: "Another Ranger" },
        { roomId: a.room!.roomId, kind: "freeplay" },
      );
      await wait(() => b.view?.players.length === 2);
      a.purchase({ kind: "skill", item: "ranger-fieldcraft-1" });
      await wait(
        () =>
          b.view?.players.some(
            (p) => p.id === a.id && p.skills.includes("ranger-fieldcraft-1"),
          ) === true,
      );
      assert.equal(b.view!.players.find((p) => p.id === b.id)!.sp, 12);
      assert.equal(
        b.view!.players.find((p) => p.id === a.id)!.kit.rangerQuiverCapacity,
        10,
      );
      a.start();
      await wait(() => b.view?.phase === "combat");
      const room = liveRooms.get(a.room!.roomId)!,
        g = room.game,
        p = g.players.get(a.id)!;
      Object.defineProperty(g, "arena", {
        value: { ...g.arena, obstacles: [], lavaPits: [] },
      });
      Object.defineProperty(g, "obstacles", { value: [] });
      g.boss.health = g.boss.maxHealth = 1e6;
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      g.boss.x = 1100;
      g.boss.y = 700;
      for (const other of g.players.values()) {
        other.x = other.oldX = 800;
        other.y = other.oldY = 700;
        other.invulnerableUntil = 1e9;
      }
      a.input({ ...idleInput(), sequence: 1, aim: 0, q: true });
      await wait(() => g.boss.health < 1e6);
      assert.equal(p.ammo, 9);
      assert(p.qAt > g.combatTick);
      assert(p.damageDealt > 0);
      assert.equal(g.players.get(b.id)!.damageDealt, 0);
      a.input({ ...idleInput(), sequence: 2, aim: 0, e: true });
      await wait(
        () => b.view?.players.find((p) => p.id === a.id)?.kit.rangerTraps === 1,
      );
      b.input({ ...idleInput(), sequence: 1, aim: Math.PI, e: true });
      await wait(
        () => b.view?.players.find((p) => p.id === b.id)?.kit.rangerTraps === 1,
      );
      a.input({ ...idleInput(), sequence: 3, aim: 0, ultimate: true });
      await wait(
        () =>
          b.view?.players.find((p) => p.id === a.id)?.kit
            .rangerSurveyCharges === 6,
      );
      assert.equal(
        b.view!.classCues.filter(
          (c) => c.kind === "ranger-survey" && c.owner === a.id,
        ).length,
        2,
      );
      assert(
        b.view!.classCues.some(
          (c) => c.kind === "ranger-trap" && c.owner === a.id,
        ),
      );
      a.setMatchPaused(true);
      await wait(
        () =>
          b.view?.matchPaused === true && b.view.combatTick === g.combatTick,
      );
      const tick = g.combatTick,
        ammo = p.ammo,
        cues = JSON.stringify(b.view!.classCues),
        status = g.ranger.status(p.id, g.combatTick);
      a.input({
        ...idleInput(),
        sequence: 4,
        aim: Math.PI / 2,
        fire: true,
        q: true,
        e: true,
        ultimate: true,
      });
      await new Promise((r) => setTimeout(r, 180));
      assert.equal(g.combatTick, tick);
      assert.equal(p.ammo, ammo);
      assert.equal(JSON.stringify(b.view!.classCues), cues);
      assert.deepEqual(g.ranger.status(p.id, g.combatTick), status);
      await late.connect(
        { ...options, name: "Late observer", classId: "soldier" },
        { roomId: a.room!.roomId, kind: "freeplay" },
      );
      await wait(
        () => late.view?.matchPaused === true && late.view.players.length === 3,
      );
      assert.equal(
        late.view!.players.find((p) => p.id === a.id)!.kit.rangerSurveyCharges,
        6,
      );
      assert.equal(
        late.view!.classCues.filter((c) => c.kind === "ranger-trap").length,
        2,
      );
      assert.equal(room.state.players.size, 3);
      assert.equal(PROTOCOL, 48);
      await a.close();
      await wait(
        () =>
          !p.connected &&
          b.view?.classCues.every((c) => c.owner !== a.id) === true,
      );
      assert(
        b.view!.classCues.some(
          (c) => c.kind === "ranger-trap" && c.owner === b.id,
        ),
      );
      await story.connect({ ...options, mode: "story" });
      await wait(() => story.view?.players.length === 1);
      const chapter = story.view!.players[0];
      assert(story.view!.chapter);
      assert.equal(chapter.sp, 0);
      assert.equal(chapter.training?.characterId, "nela-venn");
      assert.equal(chapter.training?.proofs.length, 0);
    } finally {
      await Promise.allSettled([
        a.close(),
        b.close(),
        late.close(),
        story.close(),
      ]);
      await server.gracefullyShutdown(false);
    }
  },
);
