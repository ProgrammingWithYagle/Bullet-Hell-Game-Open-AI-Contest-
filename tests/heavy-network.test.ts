import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { idleInput } from '../src/shared/protocol.ts';

async function until(check: () => boolean) {
  const end = Date.now() + 6000;
  while (!check()) {
    if (Date.now() > end) throw Error('Timed out waiting for Heavy network state');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

test(
  'real Heavy and Soldier clients receive Heavy buffs, actual enemy suppression and boundary identity',
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    const heavy = new Session(endpoint),
      soldier = new Session(endpoint);
    const options = {
      name: 'Hux',
      classId: 'heavy' as const,
      mode: 'endless' as const,
      difficulty: 'normal',
    };
    try {
      await heavy.connect(options);
      await soldier.connect(
        { ...options, name: 'Mara', classId: 'soldier' },
        { roomId: heavy.room!.roomId },
      );
      await until(() => heavy.view?.players.length === 2);
      heavy.start();
      await until(() => heavy.view?.phase === 'combat');
      const room = liveRooms.get(heavy.room!.roomId)!;
      room.game.boss.staggerUntil = 1e9;
      const actor = room.game.players.get(heavy.room!.sessionId)!;
      actor.x = 800;
      actor.y = 700;
      actor.ammo = 0;
      actor.invulnerableUntil = 1e9;
      const target = room.game.spawnMinion({
        kind: 'ordinary',
        x: 870,
        y: 700,
        health: 1000,
        speed: 0,
        radius: 16,
        damage: 10,
      })!;
      let receivedShots = 0;
      heavy.onEvents = (events) => {
        for (const event of events) if (event.type === 'shots') receivedShots += event.shots.length;
      };
      heavy.input({
        ...idleInput(),
        sequence: 1,
        aim: 0,
        q: true,
        e: true,
        ultimate: true,
        fire: true,
      });
      await until(() =>
        soldier.view!.players.some(
          (player) => player.classId === 'heavy' && player.overdriveUntil > 0,
        ),
      );
      await until(() => soldier.view!.minions.some((enemy) => enemy.slowMultiplier === 0.6));
      const remote = soldier.view!.players.find((player) => player.id === actor.id)!;
      assert(remote.braceUntil > soldier.view!.combatTick);
      assert.equal(remote.ammo, 0);
      assert.equal(remote.reloadAt, 0);
      assert(Math.abs(remote.speed - 190 * 0.6) < 0.001);
      assert(target.health < target.maxHealth);
      assert(receivedShots >= 15, 'The real client decoded Heavy suppression and primary shots');
      assert.equal(soldier.view!.minions[0].slowUntil, target.slowUntil);
      room.game.boss.health = 0;
      await until(() => heavy.view?.phase === 'mutationVote');
      await until(() => soldier.view?.minions.length === 0);
      const saved = room.game.authoritativeCheckpoint()!;
      assert.equal(saved.players.find((player) => player.id === actor.id)!.classId, 'heavy');
      assert.equal(saved.players.find((player) => player.id === actor.id)!.overdriveUntil, 0);
    } finally {
      await Promise.allSettled([heavy.close(), soldier.close()]);
      await server.gracefullyShutdown(false);
    }
  },
);
