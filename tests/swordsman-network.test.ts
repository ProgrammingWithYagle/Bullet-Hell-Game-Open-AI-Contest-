import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { idleInput } from '../src/shared/protocol.ts';
async function wait(check: () => boolean) {
  const until = Date.now() + 7000;
  while (!check()) {
    assert(Date.now() < until, 'Sword peer state did not arrive');
    await new Promise((r) => setTimeout(r, 15));
  }
}
test(
  'Two real peers observe owned Sword purchases, actual melee damage, empowered charges, an earned parry and disconnect cleanup',
  { timeout: 25000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const a = new Session('http://127.0.0.1:' + address.port),
      b = new Session('http://127.0.0.1:' + address.port);
    try {
      await a.connect({ name: 'Dara', classId: 'swordsman', mode: 'short', difficulty: 'normal' });
      await b.connect(
        { name: 'Another Swordsman', classId: 'swordsman', mode: 'short', difficulty: 'normal' },
        { roomId: a.room!.roomId, kind: 'freeplay' },
      );
      await wait(() => b.view?.players.length === 2);
      a.purchase({ kind: 'skill', item: 'swordsman-measure-1' });
      await wait(
        () =>
          b.view?.players.some((p) => p.id === a.id && p.skills.includes('swordsman-measure-1')) ===
          true,
      );
      assert.equal(b.view!.players.find((p) => p.id === b.id)!.sp, 3);
      a.start();
      await wait(() => b.view?.phase === 'combat');
      const g = liveRooms.get(a.room!.roomId)!.game,
        p = g.players.get(a.id)!,
        other = g.players.get(b.id)!;
      Object.defineProperty(g, 'obstacles', { value: [] });
      g.boss.staggerUntil = g.boss.deadline = 1e9;
      g.boss.health = g.boss.maxHealth = 1e6;
      g.boss.x = 900;
      g.boss.y = 700;
      p.x = p.oldX = 800;
      p.y = p.oldY = 700;
      p.invulnerableUntil = 1e9;
      other.x = 500;
      other.y = 700;
      other.invulnerableUntil = 1e9;
      let sequence = 0;
      a.input({ ...idleInput(), sequence: ++sequence, aim: 0, ultimate: true });
      await wait(() => b.view?.players.find((x) => x.id === a.id)?.kit.swordCuts === 3);
      assert.equal(b.view!.players.find((x) => x.id === b.id)!.kit.swordCuts, 0);
      a.input({ ...idleInput(), sequence: ++sequence, aim: 0, fire: true });
      await wait(() => g.boss.health < g.boss.maxHealth);
      await wait(() => b.view?.players.find((x) => x.id === a.id)?.kit.swordCuts === 2);
      a.input({ ...idleInput(), sequence: ++sequence, aim: 0 });
      await wait(() => p.ack >= sequence);
      assert(
        ![...g.shots.values()].some((s) => s.owner === p.id),
        'A sword cut must not emit a ranged projectile',
      );
      a.input({ ...idleInput(), sequence: ++sequence, aim: 0, e: true });
      await wait(() => b.view?.players.find((x) => x.id === a.id)?.kit.guardActive === true);
      (Reflect.get(g, 'emitShot') as Function).call(g, 'hostile', 870, 700, Math.PI, 2400, 10, 3);
      await wait(
        () => Number(b.view?.players.find((x) => x.id === a.id)?.kit.counterUntil) > g.combatTick,
      );
      assert.equal(b.view!.players.find((x) => x.id === b.id)!.kit.counterUntil, 0);
      await a.close();
      await wait(() => !p.connected);
      await wait(
        () =>
          b.view?.classCues.every((c) => !c.kind.startsWith('sword-') || c.owner !== p.id) === true,
      );
      await wait(() => b.view?.players.find((x) => x.id === p.id)?.kit.swordCuts === 0);
    } finally {
      await a.close();
      await b.close();
      await server.gracefullyShutdown(false);
    }
  },
);
