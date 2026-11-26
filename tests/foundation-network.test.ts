import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { idleInput } from "../src/shared/protocol.ts";
const wait = async (check: () => boolean, label: string) => {
  const end = Date.now() + 7000;
  while (!check()) {
    assert(Date.now() < end, label);
    await new Promise((r) => setTimeout(r, 2));
  }
};
test(
  "Real peers retain owned course/brake state, show a late observer the same state and freeze it on host pause",
  { timeout: 25000 },
  async () => {
    const { server, httpServer } = createGameServer({ audience: "testing" });
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port,
      a = new Session(endpoint),
      b = new Session(endpoint),
      late = new Session(endpoint);
    try {
      const options = {
        name: "Runner",
        classId: "engineer" as const,
        mode: "raid" as const,
        difficulty: "normal",
        openingBossId: "constable" as const,
      };
      await a.connect(options);
      await b.connect(
        { ...options, classId: "medic" },
        { roomId: a.room!.roomId },
      );
      await wait(() => a.view?.players.length === 2, "two peers");
      for (const item of [
        "general-sprint",
        "general-course-correction",
        "general-brake-step",
      ]) {
        let response: { ok: boolean } | undefined;
        a.onPurchase = (r) => (response = r);
        a.purchase({ kind: "skill", item });
        await wait(() => !!response, "purchase " + item);
        assert(response!.ok);
      }
      a.start();
      await wait(() => b.view?.phase === "combat", "combat");
      const g = liveRooms.get(a.room!.roomId)!.game,
        p = g.players.get(a.id)!;
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      a.input({ ...idleInput(), sequence: 1, dodge: true, moveX: 1 });
      await wait(() => (p.dodgeControlUntil ?? 0) > 0, "owned dodge input");
      assert(
        p.dashUntil > g.combatTick,
        "The input sequence must run within the real dodge window",
      );
      a.input({ ...idleInput(), sequence: 2, sprint: true, moveY: 1 });
      await wait(() => p.dodgeSteered === true, "owned course correction");
      a.input({ ...idleInput(), sequence: 3, dodge: true });
      await wait(() => p.dashUntil < (p.dodgeControlUntil ?? 0), "owned brake");
      await wait(
        () => b.view?.players.find((v) => v.id === a.id)?.dodgeSteered === true,
        "replicated turn",
      );
      const remote = b.view!.players.find((v) => v.id === a.id)!;
      assert(remote.skills.includes("general-course-correction"));
      assert(
        !b
          .view!.players.find((v) => v.id === b.id)!
          .skills.includes("general-course-correction"),
      );
      await late.connect(
        { ...options, name: "Observer", classId: "soldier" },
        { roomId: a.room!.roomId },
      );
      await wait(
        () =>
          late.view?.players.some(
            (v) => v.id === a.id && v.dodgeSteered === true,
          ) === true,
        "late state",
      );
      a.setMatchPaused(true);
      await wait(() => a.view?.matchPaused === true, "pause");
      const tick = g.combatTick,
        stamina = p.sprintStamina,
        at = p.dodgeAt;
      await new Promise((r) => setTimeout(r, 100));
      assert.equal(g.combatTick, tick);
      assert.equal(p.sprintStamina, stamina);
      assert.equal(p.dodgeAt, at);
      a.setMatchPaused(false);
      await wait(() => a.view?.matchPaused === false, "resume");
    } finally {
      await late.close();
      await b.close();
      await a.close();
      await server.gracefullyShutdown(false);
    }
  },
);
