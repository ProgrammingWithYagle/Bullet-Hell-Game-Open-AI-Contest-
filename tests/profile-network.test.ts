import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { data } from '../src/shared/game.ts';
import { loadProfile, recordProfileView, summary } from '../src/client/profile.ts';
const until = async (check: () => boolean) => {
  const end = Date.now() + 6500;
  while (!check()) {
    if (Date.now() > end) throw Error('Profile network timeout');
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  'all six difficulties and personal progress cross real WebSockets without exposing seeded schedules or trusting profile power',
  { timeout: 40000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    try {
      for (const difficulty of data.difficulties) {
        const client = new Session('http://127.0.0.1:' + address.port);
        try {
          await client.connect({
            name: 'Profile tester',
            classId: 'soldier',
            mode: 'short',
            difficulty: difficulty.id,
            openingBossId: 'constable',
            profile: { health: 9999, coins: 999999, skills: ['fake-power'] },
          } as any);
          client.start();
          await until(() => client.view?.phase === 'combat');
          const g = liveRooms.get(client.room!.roomId)!.game;
          assert.equal(client.view!.run.id, client.room!.roomId);
          assert.equal(client.view!.run.difficulty, difficulty.id);
          assert.equal(client.view!.players[0].progress.firstEncounter, 0);
          assert.equal(g.players.get(client.id)!.health, data.classes[0].health);
          assert.deepEqual(g.players.get(client.id)!.skills, []);
          assert.equal(g.difficulty.health, difficulty.health);
          assert(!JSON.stringify(client.view).includes('"seed"'));
          assert(!JSON.stringify(client.view).includes('exclusiveBag'));
          g.boss.health = 0;
          await until(() => client.view?.players[0].progress.clears === 1);
          const map = new Map<string, string>(),
            store = {
              getItem: (k: string) => map.get(k) ?? null,
              setItem: (k: string, v: string) => {
                map.set(k, v);
              },
            };
          recordProfileView(client.view!, client.id, store);
          assert.equal(summary(loadProfile(store)).classes.soldier.clears, 1);
          assert(!summary(loadProfile(store)).hardUnlocked);
        } finally {
          await client.close();
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
