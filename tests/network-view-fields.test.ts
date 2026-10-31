import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/client/session.ts';
import { createGameServer } from '../src/server/service.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { PlayerState } from '../src/shared/network-state.ts';
import { implementedClassIds } from '../src/shared/protocol.ts';
import { data } from '../src/shared/game.ts';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  const end = Date.now() + 6000;
  while (!check()) {
    assert(Date.now() < end, 'Player view timed out');
    await wait(10);
  }
}
test(
  'real peer views preserve every player wire field and decoded build without serializing the schema twice',
  { timeout: 20000 },
  async (t) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      PlayerState.prototype,
      'toJSON',
    );
    const original = PlayerState.prototype.toJSON;
    let conversions = 0;
    Object.defineProperty(PlayerState.prototype, 'toJSON', {
      configurable: true,
      value: function (this: PlayerState) {
        conversions++;
        return original.call(this);
      },
    });
    const { server, httpServer } = createGameServer({ audience: 'public' }),
      peers: Session[] = [];
    t.after(async () => {
      if (descriptor)
        Object.defineProperty(PlayerState.prototype, 'toJSON', descriptor);
      else Reflect.deleteProperty(PlayerState.prototype, 'toJSON');
      await Promise.allSettled(peers.map((s) => s.close()));
      await server.gracefullyShutdown(false);
    });
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    for (const classId of implementedClassIds) {
      const s = new Session('http://127.0.0.1:' + address.port);
      peers.push(s);
      await s.connect(
        { name: 'QA ' + classId, classId, mode: 'short', difficulty: 'normal' },
        peers.length === 1 ? undefined : { roomId: peers[0].room!.roomId },
      );
    }
    await until(() => peers.every((s) => s.view?.players.length === 7));
    const host = peers[0],
      live = liveRooms.get(host.room!.roomId)!;
    host.start();
    await until(() => peers.every((s) => s.view?.phase === 'combat'));
    for (const p of live.game.players.values()) p.invulnerableUntil = 1e9;
    host.setMatchPaused(true);
    await until(() => peers.every((s) => s.view?.matchPaused === true));
    for (const [index, p] of [...live.game.players.values()].entries()) {
      p.coins = 301 + index;
      p.skills = [
        data.skills.find((s) => s.classId === p.classId && !s.prerequisite)!.id,
      ];
      p.upgrades = { damage: 1 };
      p.shield = 5 + index;
      p.qAt = 14 + index;
      p.eAt = 27 + index;
      p.selfRevives = 1;
    }
    await until(() =>
      peers.every((s) => s.view!.players.every((p) => p.coins >= 301)),
    );
    for (const s of peers)
      for (const wire of s.room!.state.players.values()) {
        const expected = original.call(wire) as Record<string, unknown>;
        const view = s.view!.players.find(
          (p) => p.id === wire.id,
        )! as unknown as Record<string, unknown>;
        for (const [key, value] of Object.entries(expected)) {
          const actual =
            key === 'x' || key === 'y'
              ? Number(value) / 4
              : key === 'aim'
                ? Number(value) / 1000
                : value;
          assert.deepEqual(
            view[key],
            actual,
            'Wire field ' + key + ' differs for ' + wire.classId,
          );
        }
        for (const [key, value] of Object.entries(JSON.parse(wire.build)))
          assert.deepEqual(view[key], value, 'Decoded build field ' + key);
      }
    assert.equal(
      conversions,
      0,
      'Player views must read the wire fields directly',
    );
  },
);
