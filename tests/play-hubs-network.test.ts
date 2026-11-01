import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { Session } from "../src/client/session.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Client } from "@colyseus/sdk";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import { randomUUID } from "node:crypto";
async function wait(check: () => boolean) {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Room category or readiness did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
}
test(
  "real public rooms separate Story and Free Play discovery, identify codes and reject cross-category joins",
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer({ audience: "public" });
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    const a = new Session(endpoint),
      b = new Session(endpoint),
      observer = new Session(endpoint),
      query = new Session(endpoint),
      wrong = new Session(endpoint);
    try {
      await a.connect({
        name: "Story host",
        classId: "medic",
        mode: "story",
        difficulty: "easy",
      });
      await b.connect({
        name: "Free host",
        classId: "soldier",
        mode: "raid",
        difficulty: "normal",
        freePlay: { openingBossId: "ash-baker", variant: "brutal", seed: 41 },
      });
      const stories = await query.rooms("story"),
        free = await query.rooms("freeplay");
      assert(stories.some((r) => r.roomId === a.room!.roomId));
      assert(!stories.some((r) => r.roomId === b.room!.roomId));
      assert(free.some((r) => r.roomId === b.room!.roomId));
      assert(!free.some((r) => r.roomId === a.room!.roomId));
      assert.equal((await query.lookupRoom(a.code)).kind, "story");
      assert.equal((await query.lookupRoom(b.code)).kind, "freeplay");
      await assert.rejects(
        wrong.connect(
          {
            name: "Wrong category",
            classId: "soldier",
            mode: "short",
            difficulty: "normal",
          },
          { roomId: a.room!.roomId, kind: "freeplay" },
        ),
        /ui.roomKindMismatch/,
      );
      await observer.connect(
        {
          name: "Reader",
          classId: "soldier",
          mode: "story",
          difficulty: "easy",
        },
        { roomId: a.room!.roomId, kind: "story" },
      );
      await wait(() => a.view?.players.length === 2);
      const custom = liveRooms.get(b.room!.roomId)!.game;
      assert(custom.customized);
      assert.equal(custom.settings.seed, 41);
      assert.equal(custom.settings.openingBossId, "ash-baker");
      b.start();
      await wait(() => b.view?.phase === "combat");
      assert.equal(b.view!.boss.variant, "brutal");
      assert(b.view!.run.customized);
      a.start();
      await wait(() => observer.view?.phase === "combat");
      const g = liveRooms.get(a.room!.roomId)!.game;
      g.boss.health = 0;
      g.step();
      await wait(() => observer.view?.phase === "storyScene");
      assert.equal(g.phase, "storyScene");
      for (let n = 0; n < 1700; n++) g.step();
      assert.equal(g.phase, "storyScene");
      a.vote(1);
      await wait(() => g.votes.has(a.id));
      assert.equal(g.phase, "storyScene");
      observer.vote(1);
      await wait(() => g.phase === "mutationVote");
      await assert.rejects(
        new Client(endpoint).create("grave", {
          name: "Invalid Story",
          classId: "medic",
          mode: "story",
          difficulty: "normal",
          freePlay: { seed: 5 },
          visibility: "public",
          createKey: randomUUID(),
          protocolVersion: PROTOCOL,
          contentRevision: CONTENT_REVISION,
        }),
        /invalidSettings/,
      );
    } finally {
      await query.close();
      await wrong.close();
      await observer.close();
      await a.close();
      await b.close();
      await server.gracefullyShutdown(false);
    }
  },
);
