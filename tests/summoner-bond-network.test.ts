import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Session } from '../src/client/session.ts';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { idleInput } from '../src/shared/protocol.ts';
import { bondIds } from '../src/shared/summoner-bond.ts';

async function waitUntil(condition: () => boolean, reason: string) {
  const deadline = Date.now() + 7500;
  while (!condition()) {
    assert(Date.now() < deadline, reason);
    await new Promise(resolve => setTimeout(resolve, 15));
  }
}

test('a joined Summoner buys and uses Action 2 while peers receive only the public tether', { timeout: 25000 }, async () => {
  const { server, httpServer } = createGameServer();
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address === 'object');
  const endpoint = 'http://127.0.0.1:' + address.port;
  const host = new Session(endpoint), joined = new Session(endpoint), late = new Session(endpoint);
  try {
    await host.connect({ name: 'Host', classId: 'soldier', mode: 'raid', difficulty: 'normal' });
    const roomId = host.room!.roomId;
    const options = { name: 'Bonded Joss', classId: 'summoner' as const, mode: 'raid' as const, difficulty: 'normal' };
    await joined.connect(options, { roomId, kind: 'freeplay' });
    const actorIn = (session: Session) => session.view?.players.find(p => p.id === joined.id);
    await waitUntil(() => !!actorIn(host), 'joined player');
    for (const item of ['summoner-bonds-1', bondIds.entry, bondIds.homeward]) {
      joined.purchase({ kind: 'skill', item });
      await waitUntil(() => actorIn(joined)?.skills.includes(item) === true, 'shop ' + item);
    }
    assert.equal(actorIn(joined)?.kit.bond?.fitting, 'homeward');
    assert.equal(actorIn(host)?.kit.bond, undefined);
    assert(!host.room!.state.players.get(joined.id)!.lineworkOwner);
    host.start();
    await waitUntil(() => joined.view?.phase === 'combat', 'combat');
    const game = liveRooms.get(roomId)!.game;
    const player = game.players.get(joined.id)!;
    Object.defineProperty(game, 'obstacles', { value: [] });
    Object.assign(game.boss, { x: 1260, y: 800, health: 100000, maxHealth: 100000, staggerUntil: 10000, deadline: 10000 });
    Object.assign(player, { x: 500, y: 500, oldX: 500, oldY: 500 });
    joined.input({ ...idleInput(), sequence: 1, q: true });
    await waitUntil(() => game.retinue.owned(joined.id).length === 2, 'issued bodies');
    const [hound] = game.retinue.owned(joined.id);
    Object.assign(hound, { x: 669, y: 500, attackAt: 10000, speed: 78 });
    assert.equal(game.retinue.hit(hound.id, 27, game.combatTick), 27);
    await waitUntil(() => actorIn(joined)?.kit.bond?.stage === 'ready', 'eligible wound');
    const ammo = player.ammo, health = hound.health;
    host.setMatchPaused(true);
    await waitUntil(() => joined.view?.matchPaused === true, 'pause');
    joined.input({ ...idleInput(), sequence: 2, technique2: true });
    await new Promise(resolve => setTimeout(resolve, 160));
    assert.equal(player.ammo, ammo);
    assert.equal(game.classCues().filter(cue => cue.kind === 'summoner-bond').length, 0);
    joined.input({ ...idleInput(), sequence: 3 });
    host.setMatchPaused(false);
    await waitUntil(() => joined.view?.matchPaused === false, 'resume');
    joined.input({ ...idleInput(), sequence: 4, technique2: true });
    const tether = (session: Session) => session.view?.classCues.find(cue => cue.kind === 'summoner-bond');
    await waitUntil(() => !!tether(host) && !!tether(joined), 'shared tether');
    assert.equal(tether(host)?.unit, hound.id);
    assert.equal(tether(host)?.radius, hound.radius + 5);
    assert.equal(actorIn(joined)?.kit.bond?.stage, 'returning');
    assert.equal(actorIn(host)?.kit.bond, undefined);
    assert(!host.room!.state.players.get(joined.id)!.lineworkOwner);
    assert.equal(player.ammo, ammo - 2);

    await late.connect({ ...options, name: 'Late observer', classId: 'soldier' }, { roomId, kind: 'freeplay' });
    await waitUntil(() => !!tether(late), 'late shared tether');
    assert.equal(tether(late)?.id, tether(host)?.id);
    assert.equal(actorIn(late)?.kit.bond, undefined);
    assert(!late.room!.state.players.get(joined.id)!.lineworkOwner);
    await waitUntil(() => hound.health > health, 'physical return');
    assert.equal(hound.health, health + 18);
    await waitUntil(() => !tether(host) && actorIn(joined)?.kit.bond?.stage === 'recovering', 'settled owner and peer');
    const joinedId = joined.id;
    await joined.close();
    await waitUntil(() => !host.view?.retinue?.some(unit => unit.owner === joinedId), 'disconnect clears bodies');
  } finally {
    await joined.close();
    await late.close();
    await host.close();
    await server.gracefullyShutdown(false);
  }
});
