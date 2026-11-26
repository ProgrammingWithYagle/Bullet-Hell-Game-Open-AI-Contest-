import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { Game } from '../src/shared/game.ts';
import { idleInput, HZ } from '../src/shared/protocol.ts';
import { chapterLessons } from '../src/shared/story-training.ts';
import { distance } from '../src/shared/geometry.ts';
async function wait(check: () => boolean) {
  const until = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < until, 'Chapter network state did not arrive');
    await new Promise((r) => setTimeout(r, 15));
  }
}
function settle(g: Game, phase: string) {
  for (let n = 0; g.phase === phase && n < 250; n++) g.step();
  assert.notEqual(g.phase, phase);
}
test(
  'Real peers select separate campaign rooms, wait for each other, own their lessons/proofs, and recover a chapter without inheriting the fast campaign',
  { timeout: 45000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    const a = new Session(endpoint),
      b = new Session(endpoint),
      original = new Session(endpoint),
      wrong = new Session(endpoint);
    try {
      const options = {
        name: 'Mara',
        classId: 'soldier' as const,
        mode: 'story' as const,
        difficulty: 'normal',
      };
      await original.connect({ ...options, mode: 'short' });
      await a.connect({ ...options, storyChapterId: 'one-place-left' });
      await b.connect(
        { ...options, name: 'Iona', classId: 'medic' },
        { roomId: a.room!.roomId, kind: 'story' },
      );
      await wait(
        () =>
          a.view?.players.length === 2 &&
          b.view?.chapter?.stage === 'lobby' &&
          original.view?.players.length === 1,
      );
      assert.equal(original.view?.chapter, undefined);
      assert.equal(original.view?.players[0].sp, 3);
      assert.equal(a.view?.players[0].sp, 0);
      const chapterRooms = await a.rooms('story'),
        originalRooms = await a.rooms('freeplay');
      assert(chapterRooms.some((r) => r.roomId === a.room!.roomId));
      assert(!chapterRooms.some((r) => r.roomId === original.room!.roomId));
      assert(originalRooms.some((r) => r.roomId === original.room!.roomId));
      const lookup = await a.lookupRoom(a.code);
      assert.equal(lookup.kind, 'story');
      await assert.rejects(
        wrong.connect(options, { roomId: original.room!.roomId, kind: 'story' }),
        /roomKindMismatch/,
      );
      a.start();
      await wait(() => b.view?.phase === 'combat');
      const g = liveRooms.get(a.room!.roomId)!.game;
      g.boss.health = 0;
      g.step();
      await wait(() => a.view?.phase === 'storyScene' && b.view?.phase === 'storyScene');
      a.vote(1);
      await wait(() => g.votes.has(a.id));
      for (let n = 0; n < 200; n++) g.step();
      assert.equal(g.phase, 'storyScene');
      b.vote(1);
      await wait(() => g.votes.has(b.id) || g.phase !== 'storyScene');
      if (g.phase === 'storyScene') settle(g, 'storyScene');
      await wait(() => b.view?.phase === 'contractVote');
      assert(b.view!.contractCards.every((c) => c.bossId === undefined));
      a.vote(2);
      b.vote(2);
      await wait(() => g.votes.size === 2 || g.phase !== 'contractVote');
      if (String(g.phase) === 'contractVote') settle(g, 'contractVote');
      await wait(() => b.view?.phase === 'shop');
      a.purchase({ kind: 'study', item: chapterLessons.soldier.techniqueId });
      b.purchase({ kind: 'study', item: chapterLessons.medic.techniqueId });
      await wait(() => a.view?.players.every((p) => p.training?.learned.length === 1) === true);
      a.vote(1);
      await wait(() => g.votes.has(a.id));
      for (let n = 0; n < 15; n++) g.step();
      assert.equal(g.phase, 'shop');
      b.vote(1);
      await wait(() => g.votes.size === 2 || g.phase !== 'shop');
      if (g.phase === 'shop') settle(g, 'shop');
      if (g.phase === 'loading') settle(g, 'loading');
      await wait(() => b.view?.objective?.id === 'ward-approach');
      assert.equal(b.view?.arenaId, 'ossuary-works');
      assert.equal(b.view?.patients?.length, 1);
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      for (let n = 0; g.phase === 'combat' && n < HZ * 180; n++) {
        for (const p of g.players.values()) {
          const target = [...g.minions.actors.values()].sort(
            (x, y) => distance(x, p) - distance(y, p),
          )[0];
          g.submitInput(p.id, {
            ...idleInput(),
            sequence: p.ack + 1,
            aim: target ? Math.atan2(target.y - p.y, target.x - p.x) : 0,
            fire: true,
            q: p.classId === 'soldier' ? Boolean(target) : n === 0,
            e: p.classId === 'medic' && n === 0,
          });
        }
        g.step();
      }
      assert.equal(g.phase, 'storyScene');
      assert.equal(g.encounter, 2);
      await wait(
        () =>
          a.view?.chapter?.completedNodes.length === 2 &&
          b.view?.players.every((p) => p.training?.proofs.length === 1) === true,
      );
      const copy = Game.restoreAuthoritative(
        JSON.parse(JSON.stringify(g.authoritativeCheckpoint())),
      );
      assert.deepEqual(copy.chapter, g.chapter);
      for (const p of g.players.values()) {
        assert.equal(p.progress.clears, 1);
        assert.equal(copy.players.get(p.id)?.totalSp, 0);
        assert.deepEqual(copy.trainingFor(p.id), g.trainingFor(p.id));
      }
      assert.equal(g.campaignBank, null);
      assert.equal(g.completedBossIds.size, 1);
      assert.equal(original.view?.players[0].sp, 3);
      assert.equal(original.view?.phase, 'lobby');
    } finally {
      await a.close();
      await b.close();
      await original.close();
      await wrong.close();
      await server.gracefullyShutdown(false);
    }
  },
);
