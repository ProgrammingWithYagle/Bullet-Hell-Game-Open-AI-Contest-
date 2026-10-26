import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import {
  HZ,
  idleInput,
  implementedClassIds,
  type ClassId,
  type InputFrame,
  type Shot,
} from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
const steps = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g.step();
};
function game(classId: ClassId, party = false) {
  const g = new Game({ maxPlayers: party ? 8 : 1, seed: 41 });
  const p = g.addPlayer('p', 'Survivor', classId);
  if (party) g.addPlayer('ally', 'Ally', 'soldier');
  g.start();
  g.boss.staggerUntil = 1e9;
  g.boss.deadline = 1e9;
  p.x = 800;
  p.y = 750;
  p.oldX = p.x;
  p.oldY = p.y;
  p.invulnerableUntil = 1e9;
  return { g, p };
}
function press(g: Game, action: Partial<InputFrame>, id = 'p') {
  const p = g.players.get(id)!;
  g.submitInput(id, { ...idleInput(), sequence: p.ack + 1, aim: -Math.PI / 2, ...action });
  g.step();
}
let serial = 1000000;
function shot(g: Game, definition: Partial<Shot>) {
  const s = {
    id: serial++,
    owner: 'hostile',
    x: 800,
    y: 500,
    vx: 0,
    vy: 0,
    radius: 3,
    damage: 40,
    expires: g.combatTick + HZ * 10,
    pierce: 0,
    ...definition,
  };
  g.shots.set(s.id, s);
  return s;
}
function path(g: Game, id: string) {
  const p = g.players.get('p')!;
  g.phase = 'lobby';
  p.totalSp = 27;
  for (const s of data.skills.filter((s) => s.classId === p.classId && s.subbranchId === id))
    assert(g.transact(p.id, { id: s.id, kind: 'skill', item: s.id }).ok);
  g.phase = 'combat';
}

test('all seven survivors are selectable with their own four compatible weapon tiers and 54 purchasable nodes', () => {
  assert.equal(implementedClassIds.length, 7);
  for (const id of implementedClassIds) {
    const { g, p } = game(id);
    assert.equal(p.weapon, id + '-0');
    assert.equal(data.weapons.filter((w) => w.classId === id).length, 4);
    assert.equal(data.skills.filter((s) => s.classId === id).length, 54);
    g.phase = 'shop';
    p.coins = 100000;
    for (const w of data.weapons.filter((w) => w.classId === id && w.price > 0))
      assert(g.transact(p.id, { id: w.id, kind: 'weapon', item: w.id }).ok);
    assert(
      !g.transact(p.id, {
        id: 'foreign',
        kind: 'weapon',
        item: id === 'mage' ? 'soldier-0' : 'mage-0',
      }).ok,
    );
  }
});

test('Tank wall takes finite swept bullet damage while teammates walk through it', () => {
  const { g, p } = game('tank');
  press(g, { q: true });
  const wall = g.classKits.constructs()[0];
  assert.equal(wall.kind, 'wall');
  assert.equal(wall.health, 150);
  p.invulnerableUntil = 0;
  shot(g, { x: 800, y: 550, vy: 6000 });
  g.step();
  assert.equal(wall.health, 110);
  assert.equal(p.health, p.maxHealth);
  press(g, { q: true });
  assert.equal(g.classKits.constructs().length, 1, 'Cooldown must prevent a second cast');
  for (let i = 0; i < 35; i++) press(g, { moveY: -1 });
  assert(p.y < wall.y, 'Friendly walls must never block player movement');
  p.x = 1050;
  shot(g, { x: 800, y: 550, vy: 6000, damage: 200 });
  g.step();
  assert.equal(g.classKits.constructs().length, 0);
});

test('Tank charge moves its authored distance, stops on cover and hits a crossed enemy only once', () => {
  const { g, p } = game('tank');
  p.y = 650;
  g.boss.y = 500;
  const before = g.boss.health;
  press(g, { e: true });
  steps(g, 9);
  assert(Math.abs(p.y - 470) < 1e-7);
  assert.equal(before - g.boss.health, 50);
  assert(p.invulnerableUntil >= g.combatTick);
  const blocked = game('tank');
  blocked.p.x = 400;
  blocked.p.y = 650;
  press(blocked.g, { e: true });
  steps(blocked.g, 9);
  assert(blocked.p.y >= 594);
});

test('The City Holds grants finite team shield and capped armor without stacking identical fields', () => {
  const { g, p } = game('tank', true),
    ally = g.players.get('ally')!;
  ally.x = 820;
  ally.y = 750;
  ally.invulnerableUntil = 0;
  press(g, { ultimate: true });
  assert.equal(viewOf(g, 'p').players.find((p) => p.id === 'ally')!.shield, 120);
  assert.equal(g.classKits.status(ally.id, g.combatTick).armor, 0.35);
  g.damage(ally, 100);
  assert.equal(ally.health, ally.maxHealth);
  assert.equal(g.classKits.status(ally.id, g.combatTick).shield, 55);
  steps(g, 7);
  g.damage(ally, 100);
  assert.equal(ally.health, ally.maxHealth - 10);
  assert.equal(g.classKits.status(ally.id, g.combatTick).shield, 0);
  steps(g, HZ * 8);
  assert.equal(g.classKits.status(ally.id, g.combatTick).armor, 0);
  assert(p.ultimateAt > g.combatTick);
});

test('Mage sigil deals one burst and slows ordinary enemies without slowing the boss', () => {
  const { g, p } = game('mage');
  p.y = 700;
  g.boss.y = 480;
  const before = g.boss.health;
  const actor = g.spawnMinion({
    kind: 'ordinary',
    x: 800,
    y: 520,
    radius: 12,
    speed: 0,
    health: 100,
    damage: 0,
  })!;
  press(g, { q: true });
  assert.equal(before - g.boss.health, 35);
  assert.equal(actor.health, 65);
  assert.equal(actor.slowMultiplier, 0.45);
  steps(g, 20);
  assert.equal(actor.health, 65, 'Sigil damage must not repeat every tick');
  assert.equal(g.boss.y, 480);
  steps(g, HZ * 4);
  assert(!g.classKits.cues().some((c) => c.kind === 'sigil'));
});

test('Mage ward detonates at the locked aim point and grants nearby allies a temporary shield', () => {
  const { g, p } = game('mage', true),
    ally = g.players.get('ally')!;
  p.y = 700;
  ally.x = 800;
  ally.y = 520;
  g.boss.y = 480;
  const before = g.boss.health;
  press(g, { e: true });
  assert.equal(before - g.boss.health, 65);
  assert.equal(g.classKits.status(ally.id, g.combatTick).shield, 35);
  assert.equal(g.classKits.status(p.id, g.combatTick).shield, 0);
  steps(g, HZ * 6);
  assert.equal(g.classKits.status(ally.id, g.combatTick).shield, 0);
});

test('Silent Twelfth releases three timed pulses and clears only nearby hostile projectiles', () => {
  const { g, p } = game('mage');
  p.y = 500;
  const before = g.boss.health;
  const near = shot(g, { x: 800, y: 550 }),
    far = shot(g, { x: 1000, y: 900 }),
    friendly = shot(g, { owner: p.id, x: 1000, y: 850 });
  press(g, { ultimate: true });
  assert(!g.shots.has(near.id));
  assert(g.shots.has(far.id));
  assert(g.shots.has(friendly.id));
  assert.equal(before - g.boss.health, 120);
  steps(g, HZ * 2);
  assert.equal(before - g.boss.health, 360);
  steps(g, HZ);
  assert(!g.classKits.cues().some((c) => c.kind === 'requiem'));
  const upgraded = game('mage');
  path(upgraded.g, 'control-path-1');
  upgraded.p.y = 500;
  const hp = upgraded.g.boss.health;
  press(upgraded.g, { ultimate: true });
  steps(upgraded.g, HZ * 3);
  const damage = hp - upgraded.g.boss.health;
  assert(damage > 0 && damage <= 4 * 120 * (1 + (upgraded.g.stats(upgraded.p).effects.ultimatePotency ?? 0)), 'Orbital geometry retains the original maximum pulse budget');
});

test('Engineer deploys an 80-HP turret with real owned projectiles; cover still blocks its fire', () => {
  const { g, p } = game('engineer');
  const before = g.boss.health;
  press(g, { q: true });
  const turret = g.classKits.constructs()[0];
  assert.equal(turret.kind, 'turret');
  assert.equal(turret.health, 80);
  steps(g, HZ * 3);
  assert(g.boss.health < before);
  assert(p.damageDealt > 0);
  shot(g, { x: turret.x - 100, y: turret.y, vx: 6000, damage: 100 });
  g.step();
  assert(!g.classKits.constructs().some((c) => c.id === turret.id));
  const blocked = game('engineer');
  blocked.p.x = 400;
  blocked.p.y = 750;
  blocked.g.boss.x = 400;
  const hp = blocked.g.boss.health;
  press(blocked.g, { q: true });
  steps(blocked.g, HZ * 2);
  assert.equal(blocked.g.boss.health, hp, 'Turret projectiles cannot teleport through masonry');
});

test('Engineer siege and skill paths change actual construct count, health, damage and duration', () => {
  const { g, p } = game('engineer');
  path(g, 'constructs-foundation');
  press(g, { q: true });
  p.qAt = 0;
  press(g, { q: true });
  assert.equal(g.classKits.constructs().filter((c) => c.kind === 'turret').length, 2);
  press(g, { ultimate: true });
  const siege = g.classKits.constructs().find((c) => c.kind === 'siege')!;
  assert(siege.health >= 200);
  assert.equal(siege.until - siege.at, HZ * 20);
  const before = g.boss.health;
  steps(g, HZ * 2);
  assert(g.boss.health < before);
  g.boss.health = 0;
  g.step();
  assert.equal(g.classKits.cues().length, 0);
  assert.equal(viewOf(g, p.id).classCues.length, 0);
});

test('Assassin veil prevents new target locks but still takes existing projectile and contact damage', () => {
  const { g, p } = game('assassin', true),
    ally = g.players.get('ally')!;
  g.boss.staggerUntil = 0;
  ally.x = 1100;
  ally.y = 750;
  p.x = 600;
  p.y = 750;
  press(g, { q: true });
  assert(g.classKits.untargetable(p.id, g.combatTick));
  p.invulnerableUntil = 0;
  shot(g, { x: p.x - 80, y: p.y, vx: 6000, damage: 10 });
  g.step();
  assert.equal(p.health, p.maxHealth - 10);
  steps(g, 7);
  g.spawnMinion({
    kind: 'ordinary',
    x: p.x,
    y: p.y,
    radius: 12,
    speed: 0,
    health: 100,
    damage: 10,
  });
  g.step();
  assert(p.health <= p.maxHealth - 20);
  steps(g, 55);
  const fan = g.warnings.find((w) => w.kind === 'fan');
  if (fan) {
    assert(Math.abs(fan.aim - Math.atan2(ally.y - fan.y, ally.x - fan.x)) < 1e-7);
  }
});

test('Assassin Shadow Step sweeps enemies, respects masonry and ultimate provides three free empowered steps', () => {
  const { g, p } = game('assassin');
  p.y = 650;
  g.boss.y = 500;
  let before = g.boss.health;
  press(g, { e: true });
  assert.equal(p.y, 470);
  assert.equal(before - g.boss.health, 50);
  const cooldown = p.eAt;
  press(g, { ultimate: true });
  assert.equal(g.classKits.status(p.id, g.combatTick).stepCharges, 3);
  before = g.boss.health;
  press(g, { e: true });
  assert.equal(p.eAt, cooldown);
  assert.equal(g.classKits.status(p.id, g.combatTick).stepCharges, 2);
  assert.equal(before - g.boss.health, 100);
  press(g, { e: true, aim: Math.PI / 2 });
  press(g, { e: true });
  assert.equal(g.classKits.status(p.id, g.combatTick).stepCharges, 0);
  const x = p.x,
    y = p.y;
  press(g, { e: true });
  assert.equal(p.x, x);
  assert.equal(p.y, y, 'Spent free steps must respect regular cooldown');
  const blocked = game('assassin');
  blocked.p.x = 400;
  blocked.p.y = 650;
  press(blocked.g, { e: true });
  assert(blocked.p.y >= 594);
});

test('new class-specific skills affect barrier health, sigil radius, veil duration and extra ultimate charges', () => {
  const tank = game('tank');
  path(tank.g, 'protection-path-2');
  press(tank.g, { q: true });
  assert(tank.g.classKits.constructs()[0].health > 150);
  const mage = game('mage');
  path(mage.g, 'control-path-2');
  press(mage.g, { q: true });
  const sigils=mage.g.classKits.cues().filter(c=>c.kind==='sigil');
  assert.equal(sigils.length,2);
  assert(sigils.every(c=>c.radius>80), 'Twin Sigils retain the purchased radius modifier');
  const assassin = game('assassin');
  path(assassin.g, 'ambush-foundation');
  press(assassin.g, { q: true });
  assert(
    assassin.g.classKits.status('p', assassin.g.combatTick).veilUntil >
      assassin.g.combatTick + 6 * HZ,
  );
  press(assassin.g, { ultimate: true });
  assert.equal(assassin.g.classKits.status('p', assassin.g.combatTick).stepCharges, 4);
});

test('Last Passage guarantees critical primary damage and Siege Engine accelerates owned turrets', () => {
  const assassin = game('assassin');
  press(assassin.g, { ultimate: true });
  press(assassin.g, { fire: true });
  const primary = [...assassin.g.shots.values()].filter((s) => s.owner === assassin.p.id);
  assert(primary.length > 0);
  const w = data.weapons.find((w) => w.id === assassin.p.weapon)!,
    stats = assassin.g.stats(assassin.p);
  for (const shot of primary)
    assert.equal(shot.damage, w.damage * stats.damage * stats.critMultiplier);
  const normal = game('engineer');
  press(normal.g, { q: true });
  steps(normal.g, 22);
  const slow = [...normal.g.shots.values()].filter(
    (s) => s.owner === normal.p.id && Math.abs(s.damage - 10) < 1e-6,
  ).length;
  const fast = game('engineer');
  press(fast.g, { q: true });
  press(fast.g, { ultimate: true });
  steps(fast.g, 21);
  const quick = [...fast.g.shots.values()].filter(
    (s) => s.owner === fast.p.id && Math.abs(s.damage - 10) < 1e-6,
  ).length;
  assert(quick > slow, 'Siege Engine must raise actual turret firing cadence');
});
