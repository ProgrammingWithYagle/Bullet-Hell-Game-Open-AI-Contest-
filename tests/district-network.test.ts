import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { districtBossIds } from '../src/shared/district-director.ts';
const until = async (check: () => boolean) => {
  const end = Date.now() + 6500;
  while (!check()) {
    if (Date.now() > end) throw Error('Pilgrimage network state timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  'all twenty Pilgrimage identities launch real Pilgrimage rooms and replicate the same finite signature shapes to clients',
  { timeout: 100000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    try {
      for (const id of districtBossIds) {
        const client = new Session(endpoint);
        try {
          await client.connect({
            name: 'Pilgrimage tester',
            classId: 'engineer',
            mode: 'long',
            difficulty: 'normal',
            openingBossId: id,
            openingArenaId: 'sunken-chapel',
          });
          client.start();
          await until(() => client.view?.phase === 'combat');
          const room = liveRooms.get(client.room!.roomId)!;
          for (const p of room.game.players.values()) p.invulnerableUntil = 1e9;
          await until(
            () => client.view?.bossCues.some((c) => c.kind.startsWith('district-')) === true,
          );
          const v = client.view!;
          assert.equal(v.boss.id, id);
          assert.equal(v.arenaId, 'sunken-chapel');
          assert(v.bossCues.every((c) => Number.isSafeInteger(c.id)));
          assert(
            !JSON.stringify(v.bossCues).includes('null'),
            'All replicated numerical geometry must be finite',
          );
          room.game.boss.health = 0;
          await until(() => client.view?.phase === 'mutationVote');
          assert.equal(client.view!.bossCues.length, 0);
          assert.equal(client.view!.minions.length, 0);
          assert(client.view!.contractCards.every((c) => c.bossId === undefined));
        } finally {
          await client.close();
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
