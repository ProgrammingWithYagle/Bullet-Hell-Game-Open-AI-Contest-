import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { reactiveIds } from '../src/shared/alchemist-reactive.ts';

async function waitFor(condition: () => boolean, label: string) {
  const deadline = Date.now() + 9000;
  while (!condition()) {
    assert(Date.now() < deadline, label);
    await sleep(20);
  }
}

test('a joined non-host can advance a real flask while host and late observer receive only the public result', { timeout: 35_000 }, async () => {
  const { server, httpServer } = createGameServer({ audience: 'testing' });
  await server.listen(0, '127.0.0.1');
  const address = httpServer.address();
  assert(address && typeof address !== 'string');
  const endpoint = 'http://127.0.0.1:' + address.port;
  const host = new Session(endpoint), owner = new Session(endpoint), late = new Session(endpoint);
  try {
    const settings = { mode: 'short' as const, difficulty: 'normal', maxPlayers: 3 };
    await host.connect({ ...settings, classId: 'soldier', name: 'Mara' });
    const join = { roomId: host.room!.roomId, kind: 'freeplay' as const };
    await owner.connect({ ...settings, classId: 'alchemist', name: 'Perrin' }, join);
    const actor = () => owner.view?.players.find(player => player.id === owner.id);
    await waitFor(() => owner.view?.players.length === 2, 'joined Alchemist lobby');
    assert.equal(actor()?.sp, 3);
    assert.equal(owner.view?.owner, host.id);
    for (const id of ['alchemist-mixtures-1', reactiveIds.entry]) {
      owner.purchase({ kind: 'skill', item: id });
      await waitFor(() => actor()?.skills.includes(id) === true, 'owned ' + id);
    }
    await waitFor(() => actor()?.kit.alchemyReaction?.stage === 'busy', 'owner-only action state in lobby');
    host.start();
    await waitFor(() => owner.view?.phase === 'combat', 'started normal match');
    const game = liveRooms.get(join.roomId)!.game;
    const player = game.players.get(owner.id)!;
    const arena = { ...game.arena, obstacles: [], lavaPits: [] };
    Object.defineProperty(game, 'arena', { get: () => arena });
    Object.defineProperty(game, 'obstacles', { get: () => arena.obstacles });
    Object.assign(game.boss, { x: 1320, y: 750, health: 100_000, maxHealth: 100_000, staggerUntil: 9999, deadline: 12_000 });
    Object.assign(player, { x: 800, y: 700, oldX: 800, oldY: 700 });
    let sequence = 0;
    const send = (input: Partial<InputFrame>) => owner.input({ ...idleInput(), aim: 0, ...input, sequence: ++sequence, clientTick: owner.view!.combatTick });
    async function brew(recipe: 'flare' | 'binding', count: number) {
      await waitFor(() => owner.view!.combatTick >= actor()!.qAt, 'Small Batch cooldown');
      owner.selectAlchemy(recipe);
      await waitFor(() => actor()?.kit.alchemyRecipe === recipe, 'live recipe selection');
      send({ q: true });
      await waitFor(() => actor()?.kit.alchemyPrepared?.length === count, 'real prepared flask');
    }
    await brew('binding', 1);
    await brew('flare', 2);
    owner.throwAlchemy({ x: 929, y: 700 });
    await waitFor(() => actor()?.kit.alchemyReaction?.stage === 'ready', 'private Binding target');
    const target = actor()!.kit.alchemyReaction!.target!;
    const initialClock = actor()!.eAt;
    const enemy = game.minions.spawn(99781, { kind: 'ordinary', x: target.x, y: target.y, health: 1000, speed: 0, radius: 12, damage: 0 }, game.combatTick);
    assert(enemy);
    host.setMatchPaused(true);
    await waitFor(() => owner.view?.matchPaused === true, 'host pause');
    await late.connect({ ...settings, classId: 'soldier', name: 'Late observer' }, join);
    await waitFor(() => late.view?.players.some(row => row.id === owner.id) === true, 'late public state');
    for (const peer of [host, late]) {
      assert.equal(peer.view!.players.find(row => row.id === owner.id)!.kit.alchemyReaction, undefined);
      const raw = peer.room?.state.players.get(owner.id)?.lineworkOwner;
      assert(!raw || JSON.parse(raw).alchemyReaction === undefined);
    }
    const ownerRaw = owner.room?.state.players.get(owner.id)?.lineworkOwner;
    assert(ownerRaw && JSON.parse(ownerRaw).alchemyReaction.target.x === target.x);
    send({ technique1: true });
    await sleep(120);
    assert.equal(game.players.get(owner.id)!.eAt, initialClock);
    assert.deepEqual(actor()?.kit.alchemyPrepared, ['flare']);
    host.setMatchPaused(false);
    await waitFor(() => owner.view?.matchPaused === false, 'host resume');
    send({ technique1: true });
    await waitFor(() => actor()?.kit.alchemyReaction?.stage === 'spent', 'paid local action');
    await waitFor(() => enemy.health < 1000, 'real damaging early flask');
    assert(player.eAt > initialClock && player.damageDealt > 0);
    await waitFor(() => late.view?.classCues.some(cue => cue.kind === 'alchemy-pool' && cue.owner === owner.id && cue.recipe === 'flare') === true, 'public landed Flare');
    assert.equal(late.view!.players.find(row => row.id === owner.id)!.kit.alchemyReaction, undefined);
    await owner.close();
    await waitFor(() => !player.connected && !host.view!.classCues.some(cue => cue.owner === player.id && cue.kind.startsWith('alchemy-')), 'owner loss cleanup');
  } finally {
    await Promise.allSettled([owner.close(), late.close(), host.close()]);
    await server.gracefullyShutdown(false);
  }
});
