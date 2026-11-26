import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { raidBossIds } from '../src/shared/raid-director.ts';
const until = async (check: () => boolean) => {
  const end = Date.now() + 6500;
  while (!check()) {
    if (Date.now() > end) throw Error('Raid network state timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  'all seven Raid bosses replicate numeric finite signature geometry over real WebSockets',
  { timeout: 60000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const a = httpServer.address();
    assert(a && typeof a === 'object');
    const endpoint = 'http://127.0.0.1:' + a.port;
    try {
      for (const id of raidBossIds) {
        const client = new Session(endpoint);
        try {
          await client.connect({
            name: 'Raid tester',
            classId: 'soldier',
            mode: 'raid',
            difficulty: 'normal',
            openingBossId: id,
          });
          client.start();
          await until(() => client.view?.phase === 'combat');
          const room = liveRooms.get(client.room!.roomId)!;
          for (const p of room.game.players.values()) p.invulnerableUntil = 1e9;
          await until(() => client.view?.bossCues.some((c) => c.kind.startsWith('raid-')) === true);
          assert.equal(client.view!.boss.id, id);
          assert.equal(room.maxClients, 16);
          assert(client.view!.bossCues.every((c) => Number.isSafeInteger(c.id)));
          assert(!JSON.stringify(client.view!.bossCues).includes('null'));
          room.game.boss.health = 0;
          await until(() => client.view?.phase === 'mutationVote');
          assert.equal(client.view!.bossCues.length, 0);
        } finally {
          await client.close();
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
test(
  'Grand Raid admits sixteen real clients and rejects a seventeenth room join',
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const a = httpServer.address();
    assert(a && typeof a === 'object');
    const endpoint = 'http://127.0.0.1:' + a.port,
      clients: Session[] = [];
    const opts = {
      name: 'Raid member',
      classId: 'soldier' as const,
      mode: 'raid' as const,
      difficulty: 'normal',
    };
    try {
      const host = new Session(endpoint);
      clients.push(host);
      await host.connect(opts);
      for (let i = 1; i < 16; i++) {
        const c = new Session(endpoint);
        clients.push(c);
        await c.connect({ ...opts, name: 'Member ' + i }, { roomId: host.room!.roomId });
      }
      await until(() => host.view?.players.length === 16);
      const extra = new Session(endpoint);
      clients.push(extra);
      await assert.rejects(extra.connect(opts, { roomId: host.room!.roomId }));
      host.start();
      await until(() => host.view?.phase === 'combat');
      assert.equal(liveRooms.get(host.room!.roomId)!.game.players.size, 16);
    } finally {
      await Promise.allSettled(clients.map((c) => c.close()));
      await server.gracefullyShutdown(false);
    }
  },
);
