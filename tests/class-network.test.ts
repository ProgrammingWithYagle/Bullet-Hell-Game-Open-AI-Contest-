import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { implementedClassIds, idleInput } from '../src/shared/protocol.ts';
const until = async (check: () => boolean) => {
  const end = Date.now() + 6000;
  while (!check()) {
    if (Date.now() > end) throw Error('Seven-class network state timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};
test(
  'seven real clients keep every class identity and replicate constructs, veil, charges and temporary team shields',
  { timeout: 22000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    const endpoint = 'http://127.0.0.1:' + address.port;
    const clients: Session[] = [];
    try {
      for (const classId of implementedClassIds) {
        const client = new Session(endpoint);
        clients.push(client);
        await client.connect(
          {
            name: classId,
            classId,
            mode: 'short',
            difficulty: 'normal',
            openingArenaId: 'triage-yard',
          },
          clients.length > 1 ? { roomId: clients[0].room!.roomId } : undefined,
        );
      }
      const owner = clients[0],
        observer = clients[1];
      await until(() => owner.view?.players.length === 7);
      owner.start();
      await until(() => observer.view?.phase === 'combat');
      const room = liveRooms.get(owner.room!.roomId)!;
      room.game.boss.staggerUntil = 1e9;
      for (const [index, p] of [...room.game.players.values()].entries()) {
        p.x = 740 + index * 20;
        p.y = 700;
        p.oldX = p.x;
        p.oldY = p.y;
        p.invulnerableUntil = 1e9;
      }
      for (const client of clients)
        client.input({ ...idleInput(), sequence: 1, aim: -Math.PI / 2, q: true, ultimate: true });
      await until(
        () =>
          observer.view?.classCues.some((c) => c.kind === 'siege') === true &&
          observer.view.players.some((p) => p.classId === 'assassin' && p.kit.stepCharges === 3),
      );
      assert.deepEqual(
        new Set(observer.view!.players.map((p) => p.classId)),
        new Set(implementedClassIds),
      );
      assert.equal(observer.view!.arenaId, 'triage-yard');
      for (const kind of ['wall', 'turret', 'siege', 'sigil', 'requiem', 'citadel'])
        assert(
          observer.view!.classCues.some((c) => c.kind === kind),
          kind + ' cue missing',
        );
      const assassin = [...room.game.players.values()].find((p) => p.classId === 'assassin')!;
      assert(room.game.classKits.untargetable(assassin.id, room.game.combatTick));
      assassin.invulnerableUntil = 0;
      room.game.damage(assassin, 100);
      await until(
        () =>
          observer.view?.players.some((p) => p.id === assassin.id && p.kit.shield === 55) === true,
      );
      assert.equal(observer.view!.players.find((p) => p.id === assassin.id)!.shield, 55);
      room.game.boss.health = 0;
      await until(() => observer.view?.phase === 'mutationVote');
      assert.equal(observer.view!.classCues.length, 0);
      assert(observer.view!.players.every((p) => p.kit.shield === 0 && p.kit.stepCharges === 0));
      const save = room.game.authoritativeCheckpoint()!;
      assert.deepEqual(new Set(save.players.map((p) => p.classId)), new Set(implementedClassIds));
    } finally {
      await Promise.allSettled(clients.map((c) => c.close()));
      await server.gracefullyShutdown(false);
    }
  },
);
