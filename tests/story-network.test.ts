import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { Session } from '../src/client/session.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
async function wait(check: () => boolean) {
  const end = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < end, 'Story default did not replicate');
    await new Promise((r) => setTimeout(r, 15));
  }
}
test(
  'Fresh Story rooms default to chapter learning even when clients omit chapter options; Free Play keeps spendable SP',
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    const story = new Session(endpoint),
      peer = new Session(endpoint),
      free = new Session(endpoint);
    try {
      const options = {
        name: 'Mara',
        classId: 'soldier' as const,
        difficulty: 'normal',
        mode: 'story' as const,
      };
      await story.connect(options);
      await peer.connect(
        { ...options, name: 'Iona', classId: 'medic' },
        { roomId: story.room!.roomId, kind: 'story' },
      );
      await free.connect({ ...options, mode: 'short' });
      await wait(
        () =>
          story.view?.players.length === 2 &&
          peer.view?.chapter?.id === 'one-place-left' &&
          free.view?.players.length === 1,
      );
      assert(story.view!.players.every((p) => p.sp === 0 && p.training));
      assert.equal(free.view?.chapter, undefined);
      assert.equal(free.view?.players[0].sp, 3);
      const game = liveRooms.get(story.room!.roomId)!.game;
      assert.equal(game.settings.storyChapterId, 'one-place-left');
      assert.equal(game.bossDeadlineMultiplier, 2);
      assert(!game.transact(story.id, { id: 'sp', kind: 'skill', item: 'soldier-command-1' }).ok);
      assert.equal(game.trainingFor(story.id)?.learned.length, 0);
      story.start();
      await wait(() => peer.view?.phase === 'combat');
      assert.equal(peer.view?.boss.id, 'constable');
      assert.equal(peer.view?.run.bossDeadlineMultiplier, 2);
      game.boss.health = 0;
      game.step();
      await wait(() => peer.view?.phase === 'storyScene');
      assert.equal(peer.view?.chapter?.completedNodes[0], 'gate-constable');
      assert(peer.view!.players.every((p) => p.sp === 0));
    } finally {
      await story.close();
      await peer.close();
      await free.close();
      await server.gracefullyShutdown(false);
    }
  },
);
