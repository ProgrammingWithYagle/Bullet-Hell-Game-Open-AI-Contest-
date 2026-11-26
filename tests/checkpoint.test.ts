import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { idleInput } from '../src/shared/protocol.ts';
const serialize = (value: unknown) => JSON.parse(JSON.stringify(value));
function boundary() {
  const g = new Game({ seed: 81, maxPlayers: 1 }),
    p = g.addPlayer('solo', 'Iona', 'medic');
  g.transact(p.id, { id: 'spend', kind: 'upgrade', item: 'damage' });
  g.start();
  g.boss.health = 0;
  g.step();
  return g;
}
test('offline checkpoint round-trip preserves purchased power, rewards, voting timers and deterministic choices', () => {
  const original = boundary(),
    restored = Game.restoreOffline(serialize(original.offlineCheckpoint()));
  assert.equal(restored.phase, 'mutationVote');
  assert.equal(restored.players.get('solo')!.coins, 668);
  assert.equal(restored.players.get('solo')!.upgrades.damage, 1);
  assert.equal(restored.phaseEnds, original.phaseEnds);
  original.vote('solo', 2);
  restored.vote('solo', 2);
  for (let i = 0; i < 450; i++) {
    original.step();
    restored.step();
  }
  assert.deepEqual(restored.contractCards, original.contractCards);
  assert.deepEqual(restored.mutations, original.mutations);
  assert.equal(new Game({ maxPlayers: 1 }).offlineCheckpoint(), null);
});
test('restoring resets the input sequence so a new client can move without replaying stale combat input', () => {
  const g = boundary();
  g.players.get('solo')!.ack = 12000;
  const restored = Game.restoreOffline(serialize(g.offlineCheckpoint()));
  assert.equal(restored.players.get('solo')!.ack, 0);
  assert(restored.submitInput('solo', { ...idleInput(), sequence: 1, moveX: 1 }));
});
test('malformed, stale, cross-class, over-budget and incompatible boundary saves are rejected', () => {
  const source = serialize(boundary().offlineCheckpoint());
  const invalid = [
    { ...source, contentRevision: 'old' },
    { ...source, phase: 'combat' },
    { ...source, phaseEnds: source.tick + 10000 },
    { ...source, player: { ...source.player, coins: -1 } },
    { ...source, player: { ...source.player, weapon: 'soldier-3' } },
    { ...source, player: { ...source.player, skills: ['medic-chemistry-6'] } },
    { ...source, player: { ...source.player, totalSp: 100 } },
    {
      ...source,
      mutations: [
        { id: 'glass-pact', remaining: 3 },
        { id: 'salt-circle', remaining: 3 },
      ],
    },
  ];
  for (const save of invalid) assert.throws(() => Game.restoreOffline(save));
  const g = new Game({ maxPlayers: 2 });
  g.addPlayer('a', 'Mara', 'soldier');
  g.addPlayer('b', 'Iona', 'medic');
  assert.equal(g.offlineCheckpoint(), null);
});
