import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { distance } from '../src/shared/geometry.ts';
import { idleInput, type InputFrame, type Vec } from '../src/shared/protocol.ts';
import { bondIds } from '../src/shared/summoner-bond.ts';
import { cohortIds } from '../src/shared/summoner-cohort.ts';
import { formationIds, formationRules, type FormationFitting } from '../src/shared/summoner-formation.ts';
import { viewOf } from '../src/shared/view.ts';

function fixture(fitting?: FormationFitting, hybrid = false) {
  const game = new Game({ mode: fitting || hybrid ? 'raid' : 'short', difficulty: 'normal',
    seed: 41, openingArenaId: 'gatehouse', arenaSelection: 'fixed', maxPlayers: 2 });
  const joss = game.addPlayer('joss', 'Joss', 'summoner');
  const peer = game.addPlayer('peer', 'Peer', 'summoner');
  const buy = (item: string) => game.transact(joss.id, { id: 'formation-' + item, kind: 'skill', item });
  assert(buy('summoner-bonds-1').ok && buy(formationIds.entry).ok);
  if (fitting) {
    assert(buy(formationIds[fitting]).ok);
    assert.equal(buy(fitting === 'walking' ? formationIds.turn : formationIds.walking).reason, 'incompatibleItem');
  } else if (!hybrid) {
    assert.equal(joss.totalSp, 3);
    assert(!buy(formationIds.walking).ok && !buy(formationIds.turn).ok);
  }
  if (hybrid) assert(buy(cohortIds.entry).ok && buy(bondIds.entry).ok && buy(bondIds.homeward).ok);
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game, 'arena', { get: () => arena });
  Object.assign(joss, { x: 490, y: 500, oldX: 490, oldY: 500 });
  Object.assign(peer, { x: 410, y: 735, oldX: 410, oldY: 735 });
  Object.assign(game.boss, { x: 1360, y: 790, health: 100000, maxHealth: 100000, staggerUntil: 10000, deadline: 10000 });
  function tick(input: Partial<InputFrame> = {}, other: Partial<InputFrame> = {}) {
    for (const [p, frame] of [[joss, input], [peer, other]] as const) if (p.connected) {
      assert(game.submitInput(p.id, { ...idleInput(), aim: 0, sequence: p.ack + 1, clientTick: game.combatTick, ...frame }));
    }
    game.step();
    return game.drainEvents();
  }
  const units = () => game.retinue.owned(joss.id).filter(unit => !unit.temporary);
  const cue = () => game.classCues().find(row => row.kind === 'summoner-formation');
  const status = () => game.kitStatus(joss.id).formation!;
  const settle = () => {
    for (let i = 0; i < 60 && status().stage !== 'set'; i++) tick();
    assert.equal(status().stage, 'set');
    const held = cue();
    assert(held?.state === 'holding');
    return held;
  };
  let next = 997000;
  function shot(from: Vec, to: Vec, damage = 9, owner = 'hostile') {
    const id = ++next;
    game.shots.set(id, { id, owner, ...from, vx: (to.x - from.x) * 30, vy: (to.y - from.y) * 30,
      radius: 2, damage, expires: game.combatTick + 12, pierce: 0 });
    const events = tick();
    return { id, events, caught: events.some(e => e.type === 'sound' && e.id === 'summoner-formation-catch') };
  }
  function catchFront(damage = 9) {
    const form = cue();
    assert(form?.state === 'holding');
    const nx = Math.cos(form.aim), ny = Math.sin(form.aim);
    const at = { x: (form.ax + form.bx) / 2, y: (form.ay + form.by) / 2 };
    return shot({ x: at.x + 34 * nx, y: at.y + 34 * ny }, { x: at.x - 94 * nx, y: at.y - 94 * ny }, damage);
  }
  return { game, joss, peer, arena, tick, units, cue, status, settle, shot, catchFront };
}

test('Action 3 pays for two real posts, then two different living companions each take one intercepted hit', () => {
  const f = fixture();
  assert.equal(f.status().stage, 'company');
  f.tick({ q: true });
  assert.equal(f.status().stage, 'ready');
  const members = f.units(), ammo = f.joss.ammo;
  const before = members.map(unit => ({ x: unit.x, y: unit.y }));
  const cast = f.tick({ technique3: true, fire: true });
  assert(cast.some(event => event.type === 'sound' && event.id === 'summoner-formation-order'));
  assert.equal(f.joss.ammo, ammo - formationRules.focus);
  assert.equal(f.cue()?.state, 'seeking');
  assert(members.every((unit, i) => distance(unit, before[i]) <= unit.speed / 30 * formationRules.marchSpeed + 0.001));
  const line = f.settle(), ready = members.map(unit => unit.health);
  assert(members.every(unit => unit.action !== 'attack' && unit.aim === 0));
  assert.equal(line.until - line.at, formationRules.duration);
  assert.equal(line.radius, formationRules.arrival);
  assert(members.some(unit => distance(unit, { x: line.ax, y: line.ay }) < 0.01));
  assert(members.some(unit => distance(unit, { x: line.bx, y: line.by }) < 0.01));
  const author = viewOf(f.game, f.joss.id), observer = viewOf(f.game, f.peer.id);
  assert(author.players.find(p => p.id === f.joss.id)!.kit.formation);
  assert.equal(observer.players.find(p => p.id === f.joss.id)!.kit.formation, undefined);
  assert.deepEqual(author.classCues, observer.classCues);
  const ownerHealth = f.joss.health;
  const first = f.catchFront();
  assert(first.caught && !f.game.shots.has(first.id));
  assert.equal(f.status().catches, 1);
  assert.equal(members.reduce((n, unit, i) => n + ready[i] - unit.health, 0), 9);
  const second = f.catchFront();
  assert(second.caught && !f.game.shots.has(second.id));
  assert.deepEqual(members.map(unit => unit.health), ready.map(health => health - 9));
  assert(!f.cue());
  assert.equal(f.status().stage, 'recovering');
  assert.equal(f.joss.health, ownerHealth);
  f.joss.invulnerableUntil = 0;
  f.joss.shield = 0;
  const center = { x: (line.ax + line.bx) / 2, y: (line.ay + line.by) / 2 };
  assert(!f.shot({ x: center.x + 34, y: center.y }, f.joss).caught);
  assert(f.joss.health < ownerHealth);
});

test('an unformed, rear-facing, blocked, or friendly shot cannot spend an intercept', () => {
  const f = fixture();
  f.tick({ q: true });
  f.tick({ technique3: true });
  const moving = f.cue()!;
  assert.equal(moving.state, 'seeking');
  assert(!f.shot({ x: moving.x + 25, y: moving.y }, { x: moving.x - 15, y: moving.y }).caught);
  const line = f.settle();
  const center = { x: (line.ax + line.bx) / 2, y: (line.ay + line.by) / 2 };
  const from = { x: center.x + 45, y: center.y }, to = { x: center.x - 35, y: center.y };
  assert(!f.shot(to, from).caught);
  assert(!f.shot(from, to, 9, f.peer.id).caught);
  f.arena.obstacles = [{ x: center.x + 18, y: center.y - 18, width: 10, height: 36 }];
  const blocked = f.shot(from, to);
  assert(!blocked.caught && !f.game.shots.has(blocked.id));
  assert.equal(f.status().catches, 0);
  assert.equal(f.status().stage, 'set');
});

test('illegal posts and full-wall geometry charge no Focus and do not pick a temporary or another owner’s body', () => {
  const f = fixture();
  f.tick({ ultimate: true }, { q: true });
  assert.equal(f.status().stage, 'company');
  f.tick({ q: true });
  f.arena.obstacles = [{ x: f.joss.x + 40, y: f.joss.y - 60, width: 18, height: 120 }];
  const initial = f.joss.ammo;
  assert.equal(f.status().stage, 'ground');
  f.tick({ technique3: true });
  assert(!f.cue());
  assert.equal(f.joss.ammo, initial);
  f.arena.obstacles = [];
  f.joss.ammo = 1;
  assert.equal(f.status().stage, 'focus');
  f.tick({ technique3: true });
  assert.equal(f.joss.ammo, 1);
});

test('Walking Rank gives up its protection during a real relocation and keeps the spent catch', () => {
  const f = fixture('walking');
  f.tick({ q: true });
  f.tick({ technique3: true });
  const first = f.settle();
  assert(f.catchFront().caught);
  const before = f.units().map(unit => ({ x: unit.x, y: unit.y }));
  for (let i = 0; i < 6; i++) f.tick({ moveY: 1 });
  const seeking = f.cue()!;
  assert(seeking && seeking.y > first.y + 15);
  assert.equal(seeking.state, 'seeking');
  assert.equal(f.status().catches, 1);
  const second = f.settle();
  assert.equal(second.id, first.id);
  assert.equal(second.until, first.until);
  assert(f.units().every((unit,i) => distance(unit, before[i]) > 15));
  assert(f.catchFront().caught);
  assert(!f.cue());
});

test('Quarter Turn plants a different legal line without extending the first cast or resetting its one spent catch', () => {
  const f = fixture('turn');
  f.tick({ q: true });
  f.tick({ technique3: true });
  f.tick({ technique3: true, aim: Math.PI / 2 });
  assert.equal(f.cue()?.aim, 0);
  const initial = f.settle();
  assert(f.catchFront().caught);
  f.joss.ammo = 0;
  f.tick({ technique3: true, aim: Math.PI / 2 });
  const moving = f.cue()!;
  assert.equal(moving.state, 'seeking');
  assert.equal(moving.aim, Math.PI / 2);
  assert.equal(moving.until, initial.until);
  assert.deepEqual([moving.x, moving.y], [initial.x, initial.y]);
  assert.equal(f.status().catches, 1);
  assert.equal(f.joss.ammo, 0);
  f.settle();
  assert.equal(f.status().canCommand, false);
  f.tick({ technique3: true, aim: Math.PI });
  assert.equal(f.cue()?.aim, Math.PI / 2);
  assert(f.catchFront().caught);
  assert(!f.cue());
});

test('Cohort and Homeward cannot borrow the stationed bodies, while Gather, loss and reconnect release them', () => {
  const f = fixture(undefined, true);
  f.tick({ q: true });
  const old = f.units()[0];
  f.game.retinue.hit(old.id, 16, f.game.combatTick);
  f.tick({ technique3: true });
  const held = f.settle();
  assert.equal(f.game.kitStatus(f.joss.id).bond?.stage, 'formation');
  assert.equal(f.game.kitStatus(f.joss.id).cohort?.canSend, false);
  const ammo = f.joss.ammo;
  f.tick({ technique2: true });
  assert.equal(f.joss.ammo, ammo);
  assert.equal(f.cue()?.id, held.id);
  f.game.setConnected(f.joss.id, false);
  assert(!f.cue() && f.units().length === 0);
  f.game.setConnected(f.joss.id, true);
  f.joss.qAt = 0;
  f.tick({ q: true });
  assert.equal(f.status().stage, 'recovering');
  assert(f.units().every(unit => unit.id !== old.id));
  for (const operation of ['gather', 'ordinary', 'loss', 'phase'] as const) {
    const example = fixture();
    example.tick({ q: true });
    example.tick({ technique3: true });
    assert(example.cue());
    if (operation === 'gather') example.tick({ e: true });
    if (operation === 'ordinary') assert(example.game.orderRetinue(example.joss.id, 'hold'));
    if (operation === 'loss') example.game.retinue.hit(example.units()[0].id, 900, example.game.combatTick);
    if (operation === 'phase') { example.game.boss.health = 0; example.tick(); }
    assert(!example.cue());
  }
});
