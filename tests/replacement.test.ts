import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
test('an expired departure frees a waiting slot without immediately changing the boss health', () => {
  const g = new Game({ maxPlayers: 2 }),
    a = g.addPlayer('a', 'Mara', 'soldier'),
    b = g.addPlayer('b', 'Iona', 'medic');
  g.start();
  const health = g.boss.maxHealth;
  b.expired = true;
  b.connected = false;
  const replacement = g.addPlayer('c', 'New survivor', 'medic');
  assert.equal(replacement.status, 'waiting');
  assert.equal(g.players.size, 2);
  assert.equal(g.boss.maxHealth, health);
  assert(!g.players.has(b.id));
  assert(g.players.has(a.id));
});
