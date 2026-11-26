import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Session } from '../src/client/session.ts';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { idleInput } from '../src/shared/protocol.ts';
import { formationIds } from '../src/shared/summoner-formation.ts';

async function until(check: () => boolean, detail: string) {
  const limit = Date.now() + 7500;
  while (!check()) {
    assert(Date.now() < limit, detail);
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}

test('a joined Summoner purchases a formation and peers see both posts without its private action state', { timeout: 25000 }, async () => {
  const { server, httpServer } = createGameServer();
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const endpoint = 'http://127.0.0.1:' + address.port;
  const host = new Session(endpoint), joined = new Session(endpoint), late = new Session(endpoint);
  try {
    const setup = { mode: 'raid', difficulty: 'normal' } as const;
    await host.connect({ ...setup, name: 'Host', classId: 'soldier' });
    const roomId = host.room!.roomId;
    await joined.connect({ ...setup, name: 'Joss', classId: 'summoner' }, { roomId, kind: 'freeplay' });
    const owner = (peer: Session) => peer.view?.players.find(p => p.id === joined.id);
    const cue = (peer: Session) => peer.view?.classCues.find(p => p.kind === 'summoner-formation');
    await until(() => !!owner(host), 'joined');
    for (const item of ['summoner-bonds-1', formationIds.entry, formationIds.turn]) {
      joined.purchase({ kind: 'skill', item });
      await until(() => owner(joined)?.skills.includes(item) === true, 'purchase ' + item);
    }
    assert.equal(owner(joined)?.kit.formation?.fitting, 'turn');
    assert.equal(owner(host)?.kit.formation, undefined);
    assert(!host.room!.state.players.get(joined.id)!.lineworkOwner);
    host.start();
    await until(() => joined.view?.phase === 'combat', 'combat');
    const game = liveRooms.get(roomId)!.game;
    const player = game.players.get(joined.id)!;
    Object.defineProperty(game, 'obstacles', { value: [] });
    Object.assign(game.boss, { x: 1360, y: 775, health: 100000, maxHealth: 100000, staggerUntil: 10000, deadline: 10000 });
    Object.assign(player, { x: 490, y: 500, oldX: 490, oldY: 500 });
    joined.input({ ...idleInput(), sequence: 1, aim: 0, q: true });
    await until(() => owner(joined)?.kit.formation?.stage === 'ready', 'eligible pair');
    const before = player.ammo;
    host.setMatchPaused(true);
    await until(() => joined.view?.matchPaused === true, 'pause');
    joined.input({ ...idleInput(), sequence: 2, technique3: true });
    await new Promise(resolve => setTimeout(resolve, 140));
    assert.equal(player.ammo, before);
    assert(!cue(joined));
    joined.input({ ...idleInput(), sequence: 3 });
    host.setMatchPaused(false);
    await until(() => joined.view?.matchPaused === false, 'resume');
    joined.input({ ...idleInput(), sequence: 4, aim: 0, technique3: true });
    await until(() => cue(host)?.state === 'holding' && cue(joined)?.state === 'holding', 'both real posts');
    assert.equal(player.ammo, before - 2);
    assert.deepEqual(cue(host), cue(joined));
    assert.equal(owner(host)?.kit.formation, undefined);
    await late.connect({ ...setup, name: 'Late observer', classId: 'soldier' }, { roomId, kind: 'freeplay' });
    await until(() => cue(late)?.id === cue(joined)?.id && !!cue(late), 'late observer');
    assert.equal(owner(late)?.kit.formation, undefined);
    assert(!late.room!.state.players.get(joined.id)!.lineworkOwner);
    await joined.close();
    await until(() => !cue(host) && !cue(late), 'released on leave');
  } finally {
    await joined.close();
    await late.close();
    await host.close();
    await server.gracefullyShutdown(false);
  }
});
