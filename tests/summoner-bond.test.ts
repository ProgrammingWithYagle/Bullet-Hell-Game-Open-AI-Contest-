import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { distance, segmentRect } from '../src/shared/geometry.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { bondIds, bondRules, type BondFitting } from '../src/shared/summoner-bond.ts';
import { cohortIds } from '../src/shared/summoner-cohort.ts';
import { viewOf } from '../src/shared/view.ts';

function fixture(fitting?: BondFitting, options: { cohort?: boolean; transform?: string } = {}) {
  const game = new Game({ mode: fitting || options.cohort || options.transform ? 'raid' : 'short',
    seed: 41, openingArenaId: 'gatehouse', arenaSelection: 'fixed', maxPlayers: 2 });
  const joss = game.addPlayer('joss', 'Joss', 'summoner');
  const peer = game.addPlayer('peer', 'Peer', 'summoner');
  const buy = (item: string) => game.transact(joss.id, { id: 'buy-' + item, kind: 'skill', item });
  assert(buy('summoner-bonds-1').ok && buy(bondIds.entry).ok);
  if (fitting) {
    assert(buy(bondIds[fitting]).ok);
    assert.equal(buy(fitting === 'close' ? bondIds.homeward : bondIds.close).reason, 'incompatibleItem');
  }
  if (options.cohort) assert(buy(cohortIds.entry).ok);
  if (options.transform) {
    function learn(id: string) {
      if (joss.skills.includes(id)) return;
      const node = data.skills.find(s => s.id === id)!;
      if (node.prerequisite) learn(node.prerequisite);
      assert(buy(id).ok, id);
    }
    learn(data.skills.find(s => s.classId === 'summoner' && s.transform === options.transform)!.id);
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game, 'arena', { get: () => arena });
  Object.assign(joss, { x: 480, y: 500, oldX: 480, oldY: 500 });
  Object.assign(peer, { x: 480, y: 720, oldX: 480, oldY: 720 });
  Object.assign(game.boss, { x: 1340, y: 730, health: 100000, maxHealth: 100000, staggerUntil: 10000, deadline: 10000 });
  function tick(input: Partial<InputFrame> = {}, ally: Partial<InputFrame> = {}) {
    for (const [p, frame] of [[joss,input],[peer,ally]] as const) if (p.connected) {
      assert(game.submitInput(p.id, { ...idleInput(), sequence: p.ack + 1, clientTick: game.combatTick, aim: 0, ...frame }));
    }
    game.step();
    return game.drainEvents();
  }
  function until(check: () => boolean, limit = 110) {
    for (let i = 0; i < limit && !check(); i++) tick();
    assert(check());
  }
  let next = 810000;
  function target(x: number, y: number) {
    const actor = game.minions.spawn(++next, { kind: 'ordinary', x, y, health: 3000, speed: 0, radius: 16, damage: 1 }, game.combatTick);
    assert(actor);
    return actor;
  }
  function mark(actor: ReturnType<typeof target>) {
    const key = 'ordinary:' + actor.id;
    const before = actor.health;
    tick({ fire: true, aim: Math.atan2(actor.y - joss.y, actor.x - joss.x) });
    until(() => game.kitStatus(joss.id).retinueMarkKey === key, 45);
    assert(actor.health < before);
    return key;
  }
  function call() {
    tick({ q: true }, { q: true });
    const units = game.retinue.owned(joss.id);
    assert.equal(units.length, 2);
    for (const unit of units) unit.attackAt = 10000;
    return units;
  }
  function wound(unit: ReturnType<typeof call>[number], amount = 26) {
    assert.equal(game.retinue.hit(unit.id, amount, game.combatTick), amount);
  }
  const status = () => game.kitStatus(joss.id).bond!;
  const cues = () => game.classCues().filter(row => row.kind === 'summoner-bond');
  return { game, joss, peer, arena, tick, call, wound, mark, target, until, status, cues };
}

test('the smaller company keeps both issued body types and temporary Warders', () => {
  const f = fixture();
  assert.equal(f.game.kitStatus(f.joss.id).retinueCapacity, 2);
  assert.equal(f.game.kitStatus(f.peer.id).retinueCapacity, 4);
  const units = f.call();
  assert.deepEqual(units.map(unit => unit.kind), ['hound', 'wing']);
  f.joss.qAt = f.peer.qAt = 0;
  f.tick({ q: true }, { q: true });
  assert.equal(f.joss.qAt, 0);
  assert.equal(f.game.retinue.owned(f.joss.id).length, 2);
  assert.equal(f.game.retinue.owned(f.peer.id).length, 4);
  f.tick({ ultimate: true });
  assert.equal(f.game.kitStatus(f.joss.id).retinuePermanent, 2);
  assert.equal(f.game.retinue.owned(f.joss.id).filter(unit => unit.temporary && unit.kind === 'ward').length, 2);
});

test('Action 2 spends Focus once and repairs the same wounded companion on an ordinary legal hit', () => {
  const f = fixture();
  const [hound, wing] = f.call();
  const actor = f.target(590, 500);
  f.wound(hound);
  f.wound(wing, 5);
  assert.equal(f.status().stage, 'mark');
  f.mark(actor);
  assert.equal(f.status().unit, hound.id);
  const saved = f.joss.ammo;
  f.joss.ammo = 1;
  assert.equal(f.status().stage, 'focus');
  f.tick({ technique2: true });
  assert.equal(f.joss.ammo, 1);
  f.joss.ammo = saved;
  const initial = hound.health;
  const messages = f.tick({ technique2: true, fire: true });
  assert(messages.some(event => event.type === 'sound' && event.id === 'summoner-bond-cast'));
  assert.equal(f.joss.ammo, saved - bondRules.focus);
  const [cue] = f.cues();
  assert.equal(cue.unit, hound.id);
  assert.equal(cue.until - cue.at, bondRules.duration);
  assert.equal(cue.radius, hound.radius + 5);
  const own = viewOf(f.game, f.joss.id), observer = viewOf(f.game, f.peer.id);
  assert.equal(own.players.find(p => p.id === f.joss.id)?.kit.bond?.stage, 'linked');
  assert.equal(observer.players.find(p => p.id === f.joss.id)?.kit.bond, undefined);
  assert.deepEqual(own.classCues, observer.classCues);
  f.tick({ technique2: true });
  assert.equal(f.joss.ammo, saved - bondRules.focus);
  Object.assign(hound, { x: 550, y: 500, attackAt: f.game.combatTick });
  const hp = actor.health;
  const done = f.tick();
  assert(actor.health < hp);
  assert.equal(hound.health, initial + 20);
  assert(done.some(event => event.type === 'sound' && event.id === 'summoner-bond-mend'));
  assert.equal(f.status().stage, 'recovering');
  assert.equal(f.cues().length, 0);
  assert.equal(wing.health, wing.maxHealth - 5);
});

test('a Lanternwing projectile must reach the fixed mark from the same living unit', () => {
  const f = fixture();
  const [, wing] = f.call();
  const actor = f.target(624, 500);
  f.wound(wing, 26);
  f.mark(actor);
  const start = wing.health;
  f.tick({ technique2: true });
  Object.assign(wing, { x: 526, y: 500, attackAt: f.game.combatTick });
  const bossBefore = actor.health;
  f.tick();
  assert.equal(wing.health, start);
  assert.equal(actor.health, bossBefore);
  f.until(() => wing.health > start);
  assert.equal(wing.health, start + 20);
  assert(actor.health < bossBefore);
});

test('Close Stitch follows the player’s beacon and uses a shorter clear leash', () => {
  const f = fixture('close');
  const [hound] = f.call();
  const actor = f.target(599, 500);
  f.mark(actor);
  f.wound(hound);
  const start = hound.health;
  Object.assign(hound, { x: f.joss.x - 140, y: f.joss.y });
  assert.equal(f.status().stage, 'companion');
  Object.assign(hound, { x: 553, y: 500 });
  assert.equal(f.status().stage, 'ready');
  f.tick({ technique2: true });
  Object.assign(hound, { x: 554, y: 500, attackAt: f.game.combatTick });
  const hp = actor.health;
  f.tick();
  assert(actor.health < hp);
  assert.equal(hound.health, start);
  hound.attackAt = 10000;
  f.until(() => f.game.combatTick >= f.joss.fireAt);
  f.tick({ fire: true });
  f.until(() => hound.health > start);
  assert.equal(hound.health, start + 14);
});

test('Homeward Thread follows a legal path through cover and never heals on the far side', () => {
  const f = fixture('homeward');
  const [hound] = f.call();
  const wall = { x: 505, y: 462, width: 25, height: 76 };
  f.arena.obstacles = [wall];
  Object.assign(hound, { x: 620, y: 500 });
  f.wound(hound);
  const start = hound.health;
  assert.equal(f.status().stage, 'ready');
  f.tick({ technique2: true });
  assert.equal(f.status().stage, 'returning');
  assert.equal(hound.health, start);
  let crossed = false;
  for (let step = 0; step < 80 && hound.health === start; step++) {
    const from = { x: hound.x, y: hound.y };
    f.tick();
    assert.equal(segmentRect(from, hound, wall, hound.radius - 0.1), null);
    assert(distance(from, hound) <= hound.speed / 30 * 1.4 + 0.001);
    assert.notEqual(hound.action, 'attack');
    crossed ||= hound.x < wall.x;
    if (segmentRect(hound, f.joss, wall, hound.radius)) assert.equal(hound.health, start);
  }
  assert(crossed);
  assert.equal(hound.health, start + 18);
  assert(distance(hound, f.joss) <= bondRules.arrival);
  assert.equal(f.cues().length, 0);
});

test('foreign, full, fallen, and temporary bodies never receive the bond', () => {
  const f = fixture('homeward');
  const [hound] = f.call();
  f.tick({ ultimate: true });
  const foreign = f.game.retinue.owned(f.peer.id)[0];
  const temporary = f.game.retinue.owned(f.joss.id).find(unit => unit.temporary)!;
  Object.assign(foreign, { x: 480, y: 520 });
  f.wound(foreign);
  f.wound(temporary);
  f.game.retinue.hit(hound.id, 3000, f.game.combatTick);
  const ammo = f.joss.ammo;
  f.tick({ technique2: true });
  assert.equal(f.status().stage, 'companion');
  assert.equal(f.joss.ammo, ammo);
  assert.equal(f.cues().length, 0);
});

test('a mark change or blocked companion line breaks a paid bond without carrying it forward', () => {
  for (const reason of ['mark', 'wall'] as const) {
    const f = fixture();
    const [hound] = f.call();
    const focus = f.target(598, 500);
    const other = f.target(480, 650);
    f.mark(focus);
    f.wound(hound);
    const initial = hound.health;
    f.tick({ technique2: true });
    assert.equal(f.cues().length, 1);
    if (reason === 'mark') {
      f.until(() => f.game.combatTick >= f.joss.fireAt);
      f.mark(other);
    } else {
      Object.assign(hound, { x: 560, y: 500 });
      f.arena.obstacles = [{ x: 515, y: 450, width: 15, height: 100 }];
      f.tick();
    }
    assert.equal(f.cues().length, 0, reason);
    assert.equal(hound.health, initial);
    assert.equal(f.status().stage, 'recovering');
  }
});

test('earned SP gates the entry at three and fittings at five', () => {
  const game = new Game({ mode: 'short' });
  const player = game.addPlayer('solo', 'Joss', 'summoner');
  const buy = (id: string) => game.transact(player.id, { id: player.totalSp + '-' + id, kind: 'skill', item: id });
  assert(buy('summoner-bonds-1').ok);
  assert(buy(bondIds.entry).ok);
  assert.equal(player.totalSp, 3);
  assert(!buy(bondIds.close).ok);
  assert(!buy(bondIds.homeward).ok);
  game.encounter = 1;
  player.totalSp = 5;
  assert(buy(bondIds.close).ok);
  assert.equal(buy(bondIds.homeward).reason, 'incompatibleItem');
});

test('Gather, ordinary orders, loss and disconnect clear the commitment; replacements keep their own IDs', () => {
  for (const action of ['gather', 'order', 'death', 'disconnect'] as const) {
    const f = fixture('homeward');
    const [hound] = f.call();
    Object.assign(hound, { x: 634, y: 500 });
    f.wound(hound);
    f.tick({ technique2: true });
    assert.equal(f.status().stage, 'returning');
    if (action === 'gather') f.tick({ e: true });
    else if (action === 'order') assert(f.game.orderRetinue(f.joss.id, 'hold'));
    else if (action === 'death') f.game.retinue.hit(hound.id, 1000, f.game.combatTick);
    else { f.joss.connected = false; f.tick(); }
    assert.equal(f.cues().length, 0, action);
    if (action === 'death') {
      f.joss.qAt = 0;
      f.tick({ q: true });
      assert.equal(f.game.retinue.owned(f.joss.id).length, 2);
      assert(f.game.retinue.owned(f.joss.id).every(unit => unit.id !== hound.id));
      assert.equal(f.status().stage, 'recovering');
    }
  }
});

test('Cohort remains legal with two companions and keeps its own action when a Bond is fitted', () => {
  const f = fixture('homeward', { cohort: true, transform: 'running-pack' });
  const [first, second] = f.call();
  assert.equal(first.kind, 'hound');
  assert.equal(second.kind, 'hound');
  const actor = f.target(660, 500);
  f.mark(actor);
  f.wound(first);
  f.tick({ technique1: true, technique2: true });
  assert(!f.game.classCues().length);
  f.tick({ technique1: true });
  assert.equal(f.status().stage, 'cohort');
  const ammo = f.joss.ammo;
  f.tick({ technique2: true });
  assert.equal(f.joss.ammo, ammo);
  assert(f.game.orderRetinue(f.joss.id, 'escort'));
  f.game.retinue.hit(second.id, 800, f.game.combatTick);
  assert.equal(f.game.kitStatus(f.joss.id).cohort?.members, 1);
  assert.equal(f.game.kitStatus(f.joss.id).cohort?.canSend, false);
});
