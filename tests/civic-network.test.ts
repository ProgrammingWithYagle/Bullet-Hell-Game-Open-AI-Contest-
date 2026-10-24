import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { civicBossIds } from '../src/shared/civic-director.ts';
const until = async (check: () => boolean) => {
  const end = Date.now() + 6000;
  while (!check()) {
    if (Date.now() > end) throw Error('Civic replication timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  'real clients receive all four civic signatures, selected map, breakable anchors and active gates',
  { timeout: 35000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    try {
      for (const openingBossId of civicBossIds) {
        const owner = new Session(endpoint),
          guest = new Session(endpoint);
        try {
          const options = {
            name: 'Host',
            classId: 'heavy' as const,
            mode: 'endless' as const,
            difficulty: 'normal',
            openingBossId,
            openingArenaId: 'crown-crypt',
          };
          await owner.connect(options);
          await guest.connect({ ...options, classId: 'medic' }, { roomId: owner.room!.roomId });
          await until(() => owner.view?.players.length === 2);
          owner.start();
          await until(() => owner.view?.phase === 'combat');
          const room = liveRooms.get(owner.room!.roomId)!;
          for (const p of room.game.players.values()) p.invulnerableUntil = 1e9;
          const cue =
            openingBossId === 'tollkeeper'
              ? 'wheel'
              : openingBossId === 'chain-marshal'
                ? 'chain'
                : openingBossId === 'gate-widow'
                  ? 'gate'
                  : 'charge';
          await until(() => guest.view?.bossCues.some((c) => c.kind === cue) === true);
          assert.equal(guest.view!.arenaId, 'crown-crypt');
          assert.equal(guest.view!.boss.id, openingBossId);
          if (openingBossId === 'chain-marshal') {
            const a = room.game.director.weakPoints()[0];
            room.game.director.hitWeakPoint(90, room.game.combatTick, a.id);
            await until(
              () =>
                guest.view?.bossCues.some(
                  (c) => c.kind === 'chain' && c.id === a.id && c.health === 0,
                ) === true,
            );
          }
          if (openingBossId === 'gate-widow') {
            await until(() => room.game.director.solids(room.game.combatTick).length === 2);
            assert.equal(guest.view!.bossCues.filter((c) => c.kind === 'gate' && c.open).length, 1);
          }
          room.game.boss.health = 0;
          await until(() => guest.view?.phase === 'mutationVote');
          assert.equal(guest.view!.bossCues.length, 0);
        } finally {
          await Promise.allSettled([owner.close(), guest.close()]);
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
