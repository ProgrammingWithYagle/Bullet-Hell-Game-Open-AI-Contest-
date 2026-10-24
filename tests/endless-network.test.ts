import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { finalBossIds } from '../src/shared/endless-director.ts';
const until = async (check: () => boolean) => {
  const end = Date.now() + 6500;
  while (!check()) {
    if (Date.now() > end) throw Error('Endless network state timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  'all ten new boss identities replicate finite numeric signatures over actual WebSockets',
  { timeout: 90000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const a = httpServer.address();
    assert(a && typeof a === 'object');
    const endpoint = 'http://127.0.0.1:' + a.port;
    try {
      for (const id of finalBossIds) {
        const client = new Session(endpoint);
        try {
          await client.connect({
            name: 'Night tester',
            classId: 'engineer',
            mode: 'endless',
            difficulty: 'normal',
            openingBossId: id,
          });
          client.start();
          await until(() => client.view?.phase === 'combat');
          const room = liveRooms.get(client.room!.roomId)!;
          for (const p of room.game.players.values()) p.invulnerableUntil = 1e9;
          await until(
            () => client.view?.bossCues.some((c) => c.kind.startsWith('endless-')) === true,
          );
          assert.equal(client.view!.boss.id, id);
          assert(client.view!.bossCues.every((c) => Number.isSafeInteger(c.id)));
          assert(!JSON.stringify(client.view!.bossCues).includes('null'));
          assert.equal(client.view!.campaignBank, null);
          room.game.boss.health = 0;
          await until(
            () => client.view?.phase === (id === 'uncounted' ? 'victory' : 'mutationVote'),
          );
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
  'network campaign banks its victory before unanimous secret consent; decline and extension defeat retain it',
  { timeout: 45000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const a = httpServer.address();
    assert(a && typeof a === 'object');
    const endpoint = 'http://127.0.0.1:' + a.port;
    const opts = {
      name: 'Bank tester',
      classId: 'soldier' as const,
      mode: 'raid' as const,
      difficulty: 'normal',
    };
    try {
      for (const accept of [false, true]) {
        const host = new Session(endpoint),
          guest = new Session(endpoint);
        try {
          await host.connect(opts);
          await guest.connect({ ...opts, name: 'Consent tester' }, { roomId: host.room!.roomId });
          await until(() => host.view?.players.length === 2);
          host.start();
          await until(() => host.view?.phase === 'combat');
          const g = liveRooms.get(host.room!.roomId)!.game;
          g.accords = 3;
          for (let n = 0; n < 3; n++) {
            g.boss.health = 0;
            await until(() => host.view?.phase !== 'combat');
            if (n < 2) {
              for (const phase of ['mutationVote', 'contractVote', 'shop', 'loading']) {
                await until(() => g.phase === phase);
                g.phaseEnds = g.tick;
              }
              await until(() => host.view?.phase === 'combat');
            }
          }
          await until(
            () => host.view?.phase === 'secretOffer' && guest.view?.phase === 'secretOffer',
          );
          assert.equal(host.view!.campaignBank!.encounters, 3);
          const bank = structuredClone(host.view!.campaignBank);
          host.vote(1);
          await until(() => g.votes.get(host.id) === 1);
          assert.equal(g.phase, 'secretOffer');
          guest.vote(accept ? 1 : 0);
          if (!accept) {
            await until(() => host.view?.phase === 'victory');
            assert.equal(host.view!.secretStatus, 'declined');
          } else {
            await until(() => g.phase === 'loading');
            g.phaseEnds = g.tick;
            await until(() => host.view?.boss.id === 'uncounted' && host.view?.phase === 'combat');
            g.boss.deadline = g.combatTick;
            await until(() => host.view?.phase === 'victory');
            assert.equal(host.view!.secretStatus, 'failed');
          }
          assert.deepEqual(host.view!.campaignBank, bank);
          assert.deepEqual(guest.view!.campaignBank, bank);
        } finally {
          await Promise.allSettled([host.close(), guest.close()]);
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
