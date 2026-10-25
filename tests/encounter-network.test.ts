import { bossThreat, threatBounty } from '../src/shared/boss-threat.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import type { BossId } from '../src/shared/protocol.ts';
const until = async (check: () => boolean) => {
  const end = Date.now() + 5000;
  while (!check()) {
    if (Date.now() > end) throw Error('New encounter replication timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  'real clients receive charge, rat and stamp cues from each new boss with shared authoritative actor state',
  { timeout: 25000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    try {
      for (const openingBossId of ['courier', 'ratcatcher', 'quarantine-clerk'] as BossId[]) {
        const owner = new Session(endpoint),
          guest = new Session(endpoint);
        try {
          const options = {
            name: 'Host',
            classId: 'heavy' as const,
            mode: 'endless' as const,
            difficulty: 'normal',
            openingBossId,
          };
          await owner.connect(options);
          await guest.connect(
            { ...options, classId: 'medic', openingBossId: 'constable' },
            { roomId: owner.room!.roomId },
          );
          await until(() => owner.view?.players.length === 2);
          owner.start();
          const room = liveRooms.get(owner.room!.roomId)!;
          await until(() => owner.view?.phase === 'combat');
          for (const player of room.game.players.values()) player.invulnerableUntil = 1e9;
          const kind =
            openingBossId === 'courier'
              ? 'charge'
              : openingBossId === 'ratcatcher'
                ? 'scent'
                : 'stamp';
          await until(() => guest.view?.bossCues.some((c) => c.kind === kind) === true);
          assert.equal(guest.view!.boss.id, openingBossId);
          assert.equal(owner.view!.boss.id, openingBossId);
          assert.equal(owner.view!.boss.threat, bossThreat(openingBossId).level);
          assert.equal(guest.view!.boss.threat, bossThreat(openingBossId).level);
          assert(
            JSON.parse(room.state.hazards).bossCues.some((c: { kind: string }) => c.kind === kind),
          );
          if (openingBossId === 'ratcatcher') {
            await until(() => guest.view?.minions.length === 12);
            assert.equal(room.game.minions.actors.size, 12);
            assert(guest.view!.minions.every((r) => r.kind === 'rat' && r.goalX !== undefined));
            assert(guest.view!.bossCues.some((c) => c.kind === 'sack' && c.health === 65));
          }
          room.game.boss.health = 0;
          await until(() => guest.view?.phase === 'mutationVote');
          assert.equal(guest.view!.bossCues.length, 0);
          assert.equal(guest.view!.minions.length, 0);
          room.game.phaseEnds = room.game.tick;
          await until(() => guest.view?.phase === 'contractVote');
          for (const card of guest.view!.contractCards) {
            assert.equal(card.bossId, undefined);
            assert(Number.isInteger(card.subtier));
            assert.equal(card.risk, 0);
          }
          for (const card of room.game.contractCards) {
            assert.equal(card.subtier, bossThreat(card.bossId!).subtier);
            assert.equal(card.bounty, threatBounty(card.bossId!, card.variant));
          }
          assert.deepEqual(guest.view!.contractCards, owner.view!.contractCards);
        } finally {
          await Promise.allSettled([owner.close(), guest.close()]);
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
