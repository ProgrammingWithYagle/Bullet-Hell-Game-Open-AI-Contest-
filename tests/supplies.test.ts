import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Player } from '../src/shared/game.ts';
import { idleInput } from '../src/shared/protocol.ts';

function setup(items: string[], teammates = 0) {
  const g = new Game({ seed: 702, maxPlayers: 1 + teammates });
  const p = g.addPlayer('a', 'Mara', 'soldier');
  p.coins = 10000;
  for (const [n, item] of items.entries())
    assert(g.transact(p.id, { id: 'buy-' + n, kind: 'supply', item }).ok);
  for (let n = 0; n < teammates; n++) g.addPlayer('ally-' + n, 'Iona', 'medic');
  g.start();
  for (const player of g.players.values()) player.invulnerableUntil = 1e9;
  g.boss.health = g.boss.maxHealth = 1e9;
  g.boss.deadline = 1e9;
  return { g, p };
}
function use(g: Game, p: Player, index: number) {
  assert(g.submitInput(p.id, { ...idleInput(), sequence: p.ack + 1, supply: index }));
  g.step();
}

test('supply purchases are atomic, stack to two, preserve three slots and reject forged/full requests', () => {
  const g = new Game(),
    p = g.addPlayer('a', 'Mara', 'soldier');
  p.coins = 1000;
  const request = { id: 'one', kind: 'supply', item: 'medkit' };
  assert(g.transact(p.id, request).ok);
  assert(g.transact(p.id, request).ok);
  assert.equal(p.coins, 910);
  assert.equal(p.supplies[0].count, 1);
  assert(!g.transact(p.id, { ...request, item: 'adrenaline' }).ok);
  assert(g.transact(p.id, { ...request, id: 'two' }).ok);
  assert(!g.transact(p.id, { ...request, id: 'three' }).ok);
  for (const item of ['adrenaline', 'armor-plate'])
    assert(g.transact(p.id, { id: item, kind: 'supply', item }).ok);
  const before = p.coins;
  assert(!g.transact(p.id, { id: 'full', kind: 'supply', item: 'antidote' }).ok);
  assert(!g.transact(p.id, { id: 'fake', kind: 'supply', item: 'fake' }).ok);
  assert.equal(p.coins, before);
  g.start();
  assert(!g.transact(p.id, { id: 'combat', kind: 'supply', item: 'antidote' }).ok);
});

test('medkits do not waste charges at full health, respect cooldown and consume a one-shot input once', () => {
  const { g, p } = setup(['medkit', 'medkit']);
  use(g, p, 0);
  assert.equal(p.supplies[0].count, 2);
  p.health = 10;
  use(g, p, 0);
  assert.equal(p.health, 55);
  assert.equal(p.supplies[0].count, 1);
  use(g, p, 0);
  assert.equal(p.supplies[0].count, 1);
  for (let n = 0; n < 100; n++) g.step();
  assert.equal(p.supplies[0].count, 1);
  use(g, p, 0);
  assert.equal(p.health, 100);
  assert.deepEqual(p.supplies[0], { id: '', count: 0 });
});

test('adrenaline expires on combat ticks and the authoritative view speed respects the movement cap', () => {
  const { g, p } = setup(['adrenaline']);
  const base = g.movementSpeed(p);
  use(g, p, 0);
  assert.equal(g.movementSpeed(p), base * 1.25);
  for (let n = 0; n < 180; n++) g.step();
  assert.equal(g.movementSpeed(p), base);
});

test('armor plates expire independently and absorb damage before permanent shield and health', () => {
  const { g, p } = setup(['armor-plate']);
  use(g, p, 0);
  p.shield = 10;
  p.invulnerableUntil = 0;
  g.damage(p, 60);
  assert.equal(p.supplyShield, 0);
  assert.equal(p.shield, 0);
  assert.equal(p.health, 105);
  p.supplyShield = 20;
  p.supplyShieldUntil = g.combatTick + 1;
  g.step();
  assert.equal(p.supplyShield, 0);
});

test('antidote, ammo pouch and focus tonic apply their actual effects without changing ultimate cooldown', () => {
  const { g, p } = setup(['antidote', 'ammo-pouch', 'focus-tonic']);
  p.health = 50;
  p.slowUntil = 500;
  use(g, p, 0);
  assert.equal(p.health, 70);
  assert.equal(p.slowUntil, 0);
  p.supplyAt = 0;
  p.ammo = 0;
  p.reloadAt = 500;
  use(g, p, 1);
  assert.equal(p.ammo, g.stats(p).magazine);
  assert.equal(p.reloadAt, 0);
  p.supplyAt = 0;
  p.qAt = g.combatTick + 300;
  p.eAt = g.combatTick + 120;
  p.ultimateAt = 9999;
  use(g, p, 2);
  assert.equal(p.qAt - g.combatTick, 150);
  assert.equal(p.eAt - g.combatTick, 60);
  assert.equal(p.ultimateAt, 9999);
});

test('revive kit requires a nearby downed teammate and never restores an eliminated player', () => {
  const { g, p } = setup(['revive-kit', 'revive-kit'], 1),
    ally = g.players.get('ally-0')!;
  use(g, p, 0);
  assert.equal(p.supplies[0].count, 2);
  ally.status = 'downed';
  ally.health = 0;
  ally.downUntil = 9999;
  ally.x = p.x + 50;
  ally.y = p.y;
  use(g, p, 0);
  assert.equal(ally.status, 'active');
  assert.equal(ally.health, ally.maxHealth * 0.25);
  ally.status = 'eliminated';
  p.supplyAt = 0;
  use(g, p, 0);
  assert.equal(p.supplies[0].count, 1);
});

test('barrier blocks swept hostile shots, loses finite health and permits teammate movement', () => {
  const { g, p } = setup(['barrier-charge']);
  p.x = 800;
  p.y = 750;
  use(g, p, 0);
  const barrier = g.fields.find((f) => f.kind === 'barrier')!;
  const emit = Reflect.get(g, 'emitShot') as (...args: unknown[]) => void;
  emit.call(g, 'hostile', 600, 750, 0, 12000, 80, 4);
  g.step();
  assert.equal(p.health, p.maxHealth);
  assert.equal(barrier.potency, 20);
  emit.call(g, 'hostile', 600, 750, 0, 12000, 80, 4);
  g.step();
  assert.equal(barrier.potency, 0);
  g.step();
  assert(!g.fields.includes(barrier));
  p.invulnerableUntil = 0;
  emit.call(g, 'hostile', 600, 750, 0, 12000, 20, 4);
  g.step();
  assert.equal(p.health, p.maxHealth - 20);
  g.fields.push({ ...barrier, id: 99999, potency: 100, until: 9999 });
  assert(g.submitInput(p.id, { ...idleInput(), sequence: p.ack + 1, moveX: 1 }));
  for (let n = 0; n < 5; n++) g.step();
  assert(p.x > 800);
});

test('practice boundary saves preserve supplies and reject duplicate, unknown or over-stacked inventory', () => {
  const { g, p } = setup(['medkit', 'medkit', 'adrenaline']);
  g.boss.health = 0;
  g.step();
  const save = JSON.parse(JSON.stringify(g.offlineCheckpoint()));
  const restored = Game.restoreOffline(save);
  assert.deepEqual(restored.players.get('solo')!.supplies, p.supplies);
  for (const inventory of [
    [
      { id: 'medkit', count: 3 },
      { id: '', count: 0 },
      { id: '', count: 0 },
    ],
    [
      { id: 'medkit', count: 1 },
      { id: 'medkit', count: 1 },
      { id: '', count: 0 },
    ],
    [
      { id: 'forged', count: 1 },
      { id: '', count: 0 },
      { id: '', count: 0 },
    ],
  ])
    assert.throws(() =>
      Game.restoreOffline({ ...save, player: { ...save.player, supplies: inventory } }),
    );
});
