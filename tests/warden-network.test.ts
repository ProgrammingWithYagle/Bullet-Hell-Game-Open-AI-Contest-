import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@colyseus/sdk';
import { randomUUID } from 'node:crypto';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { PROTOCOL, CONTENT_REVISION } from '../src/shared/protocol.ts';

const until = async (check: () => boolean, timeout = 5000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw Error('Timed out waiting for Warden network state');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

test(
  'real clients select Warden, receive authoritative sweeps and never receive concealed future boss IDs',
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    const owner = new Session(endpoint),
      guest = new Session(endpoint);
    const options = {
      name: 'Warden host',
      classId: 'soldier' as const,
      mode: 'endless' as const,
      difficulty: 'normal',
      openingBossId: 'lantern-warden' as const,
    };
    try {
      await assert.rejects(
        new Client(endpoint).create('grave', {
          ...options,
          visibility: 'public',
          createKey: randomUUID(),
          protocolVersion: 4,
          contentRevision: CONTENT_REVISION,
        }),
        /versionMismatch/,
      );
      await owner.connect(options);
      await guest.connect(
        {
          ...options,
          name: 'Iona',
          classId: 'medic',
          openingBossId: 'constable',
        },
        { roomId: owner.room!.roomId },
      );
      await until(() => owner.view?.players.length === 2);
      assert.equal(PROTOCOL, 20);
      owner.start();
      await until(() => owner.view?.phase === 'combat' && guest.view?.signatures.length === 1);
      assert.equal(owner.view!.boss.id, 'lantern-warden');
      assert.equal(
        guest.view!.boss.id,
        'lantern-warden',
        'a joining guest cannot change the opening boss',
      );
      const room = liveRooms.get(owner.room!.roomId)!;
      assert.equal(room.game.boss.id, 'lantern-warden');
      assert.equal(owner.view!.signatures[0].phase, 'warning');
      await until(() => owner.view?.signatures[0]?.phase === 'active');
      assert.equal(owner.view!.signatures[0].cone.arc, (55 * Math.PI) / 180);
      assert.equal(owner.view!.signatures[0].cone.x, room.game.boss.x + 55);
      assert.equal(guest.view!.boss.maxHealth, Math.fround(room.game.boss.maxHealth));
      room.game.boss.health = 0;
      await until(() => owner.view?.phase === 'mutationVote' && guest.view?.boss.defeatedAt! > 0);
      room.game.phaseEnds = room.game.tick;
      await until(() => owner.view?.phase === 'contractVote');
      assert(
        room.game.contractCards.every(
          (card) => card.bossId !== 'lantern-warden' && card.variant === 'normal',
        ),
      );
      assert(owner.view!.contractCards.every((card) => !('bossId' in card)));
      assert(guest.view!.contractCards.every((card) => !('bossId' in card)));
      assert(
        JSON.parse(room.state.intermission).contractCards.every(
          (card: object) => !('bossId' in card),
        ),
      );
      const boundary = room.game.authoritativeCheckpoint()!;
      assert.deepEqual(boundary.completedBossIds, ['lantern-warden']);
      assert.equal(boundary.settings.openingBossId, 'lantern-warden');
    } finally {
      await Promise.allSettled([owner.close(), guest.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
