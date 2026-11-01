import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { Game } from "../src/shared/game.ts";
import { storyArena } from "../src/shared/story-campaign.ts";
async function wait(check: () => boolean) {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, "Story state did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
}
function advance(g: Game) {
  if (g.phase === "storyScene") {
    for (const p of g.players.values())
      if (p.connected && p.eligible) g.vote(p.id, 1);
    for (let n = 0; g.phase === "storyScene" && n < 200; n++) g.step();
    return;
  }

  const phase = g.phase;
  let guard = 0;
  while (g.phase === phase) {
    g.phaseEnds = g.tick;
    g.step();
    assert(++guard < 200);
  }
}
test(
  "real Story peers agree on party route, concealed cards, authority recovery and banked campaign",
  { timeout: 45000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    const a = new Session(endpoint),
      b = new Session(endpoint);
    try {
      const options = {
        name: "Mara",
        classId: "soldier" as const,
        mode: "story" as const,
        difficulty: "easy",
        openingBossId: "uncounted" as const,
        openingArenaId: "bell-foundry",
        arenaSelection: "randomEncounter" as const,
      };
      await a.connect(options);
      await b.connect(
        { ...options, name: "Iona", classId: "medic" },
        { roomId: a.room!.roomId },
      );
      await wait(
        () => a.view?.players.length === 2 && b.view?.run.mode === "story",
      );
      a.start();
      await wait(() => b.view?.phase === "combat");
      const room = liveRooms.get(a.room!.roomId)!,
        g = room.game;
      assert.equal(g.boss.id, "constable");
      assert.equal(g.arena.id, "gatehouse");
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      for (let fight = 0; fight < 15; fight++) {
        g.boss.health = 0;
        g.step();
        if (fight === 14) break;
        advance(g);
        assert.equal(g.phase, "contractVote");
        await wait(
          () =>
            a.view?.encounter === fight + 1 && b.view?.phase === "contractVote",
        );
        assert(
          a.view!.contractCards.every((card) => card.bossId === undefined),
        );
        assert(
          b.view!.contractCards.every((card) => card.bossId === undefined),
        );
        const choice = fight % 3;
        a.vote(choice);
        b.vote(choice);
        await wait(() => g.votes.size === 2);
        advance(g);
        const checkpoint = JSON.parse(
          JSON.stringify(g.authoritativeCheckpoint()),
        );
        const copy = Game.restoreAuthoritative(checkpoint);
        assert.deepEqual(copy.storyChoices, g.storyChoices);
        assert.deepEqual(copy.contractCards, g.contractCards);
        assert.equal(copy.arena.id, g.arena.id);
        for (const [id, p] of g.players) {
          assert.equal(copy.players.get(id)!.connected, false);
          assert.deepEqual(copy.players.get(id)!.progress, p.progress);
          copy.players.get(id)!.connected = true;
        }
        advance(copy);
        advance(copy);
        advance(g);
        advance(g);
        assert.equal(g.arena.id, storyArena(fight + 1, g.storyChoices));
        assert.equal(copy.boss.id, g.boss.id);
        assert.equal(copy.arena.id, g.arena.id);
        await wait(
          () =>
            a.view?.phase === "combat" &&
            b.view?.storyChoices?.length === fight + 1,
        );
        assert.deepEqual(a.view!.storyChoices, b.view!.storyChoices);
        assert.equal(b.view!.arenaId, g.arena.id);
      }
      await wait(
        () =>
          a.view?.campaignBank?.encounters === 15 &&
          b.view?.campaignBank?.encounters === 15,
      );
      assert.equal(g.completedBossIds.size, 15);
      assert.equal(g.storyChoices.length, 14);
      assert.equal(a.view!.run.mode, "story");
    } finally {
      await a.close();
      await b.close();
      await server.gracefullyShutdown(false);
    }
  },
);
