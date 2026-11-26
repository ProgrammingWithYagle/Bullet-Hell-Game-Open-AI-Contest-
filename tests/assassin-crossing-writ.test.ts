import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crossingWritId, crossingWritRules, markHunterIds } from '../src/shared/assassin-crossing-writ.ts';
import { Game } from '../src/shared/game.ts';
import type { Rect } from '../src/shared/geometry.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

const action = { technique3: true };

function scenario(owns = true, fitting?: 'canted' | 'transfer') {
  const game = new Game({ mode: 'short', seed: 41, difficulty: 'normal', arenaSelection: 'fixed', openingArenaId: 'gatehouse', maxPlayers: 2 });
  if (fitting) game.encounter = 1;
  const nyx = game.addPlayer('nyx', 'Nyx', 'assassin');
  const ally = game.addPlayer('ally', 'Lane', 'soldier');
  const buy = (item: string) => assert(game.transact(nyx.id, { id: item, kind: 'skill', item }).ok);
  buy('assassin-evasion-1');
  if (owns) buy(crossingWritId);
  if (fitting) {
    buy(markHunterIds[fitting]);
    const alternative = markHunterIds[fitting === 'canted' ? 'transfer' : 'canted'];
    assert.equal(game.transact(nyx.id, { id: alternative, kind: 'skill', item: alternative }).reason, 'incompatibleItem');
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [] as Rect[];
  arena.lavaPits = [];
  Object.defineProperty(game, 'arena', { get: () => arena });
  Object.assign(nyx, { x: 500, y: 500 });
  Object.assign(ally, { x: 450, y: 605 });
  Object.assign(game.boss, { x: 1290, y: 740, staggerUntil: 5000, deadline: 5000 });
  const body = (id: number, x: number, y: number) => game.minions.spawn(id, { kind: 'ordinary', x, y, health: 1500, speed: 0,
    radius: 19, damage: 0 }, game.combatTick)!;
  const quarry = body(990001, 742, 500);
  const passer = body(990002, 695, 555);

  function tick(input: Partial<InputFrame> = {}, other: Partial<InputFrame> = {}) {
    for (const actor of [nyx, ally]) assert(game.submitInput(actor.id, { ...idleInput(), aim: 0, sequence: actor.ack + 1,
      clientTick: game.combatTick, ...(actor === nyx ? input : other) }));
    game.step();
    return game.drainEvents().flatMap(event => event.type === 'sound' && event.owner === nyx.id ? [event.id] : []);
  }
  const status = () => game.kitStatus(nyx.id).crossingWrit;
  const lines = () => game.classCues().filter(cue => cue.kind === 'assassin-writ-cutoff');
  function confirm() {
    const notes: string[] = [];
    for (let i = 0; i < 75 && status()?.phase !== 'confirmed'; i++) notes.push(...tick({ fire: true, aim: 0 }));
    assert(notes.includes('assassin-writ-proof') && notes.includes('assassin-writ-confirm'));
    assert.equal(status()?.phase, 'confirmed');
    for (let i = 0; i < 20 && [...game.shots.values()].some(shot => shot.owner === nyx.id); i++) tick();
    assert.equal(status()?.phase, 'confirmed');
  }
  return { game, nyx, ally, quarry, passer, arena, tick, status, lines, confirm };
}

test('Crossing Writ confirms with actual primary hits and spends one U on the selected enemy’s physical crossing', () => {
  const f = scenario(), ordinary = scenario(false);
  assert(f.tick(action).includes('assassin-writ-mark'));
  assert.equal(f.nyx.ultimateAt, 0);
  f.confirm();
  const before = f.quarry.health;
  while (ordinary.game.combatTick < f.game.combatTick) ordinary.tick();
  ordinary.tick({ ultimate: true });
  assert(f.tick(action).includes('assassin-writ-set'));
  assert.equal(f.nyx.ultimateAt, ordinary.nyx.ultimateAt);
  assert.equal(f.game.kitStatus(f.nyx.id).passageUntil, 0);
  const line = f.lines()[0];
  assert.equal(line.until - line.at, crossingWritRules.cutoffTicks);
  f.passer.x = line.x + 24;
  f.passer.speed = 210;
  for (let i = 0; i < 13; i++) assert(!f.tick().includes('assassin-writ-strike'));
  assert(f.passer.x < line.x);
  assert.equal(f.passer.health, 1500);
  assert.equal(f.quarry.health, before);
  f.quarry.speed = 220;
  const notes = [];
  for (let i = 0; i < 20 && f.lines()[0]?.outcome !== 'strike'; i++) notes.push(...f.tick());
  assert(notes.includes('assassin-writ-strike'));
  assert.equal(f.quarry.health, before - crossingWritRules.strike);
  assert.equal(f.passer.health, 1500);
  assert.equal(f.lines()[0].id, line.id);
  assert.equal(f.nyx.ultimateAt, ordinary.nyx.ultimateAt);
});

test('Ally and synthetic damage do not prove the writ and ordinary Passage takes its own input', () => {
  const f = scenario();
  f.tick(action);
  const aim = Math.atan2(f.quarry.y - f.ally.y, f.quarry.x - f.ally.x);
  for (let i = 0; i < 28; i++) f.tick({}, { fire: true, aim });
  assert(f.quarry.health < 1500);
  assert.equal(f.status()?.proof, 0);
  assert(f.game['emitShot'](f.nyx.id, f.quarry.x - 20, f.quarry.y, 0, 700, 16, 4, 0, 1));
  f.tick();
  assert.equal(f.status()?.proof, 0);
  const own = viewOf(f.game, f.nyx.id), peer = viewOf(f.game, f.ally.id);
  assert(own.players.find(p => p.id === f.nyx.id)?.kit.crossingWrit);
  assert.equal(peer.players.find(p => p.id === f.nyx.id)?.kit.crossingWrit, undefined);
  assert.deepEqual(own.classCues, peer.classCues);
  assert(f.tick({ ...action, ultimate: true }).includes('assassin-writ-lost'));
  assert(f.game.kitStatus(f.nyx.id).passageUntil > f.game.combatTick);
  assert.equal(f.lines().length, 0);
});

test('New cover blocks a cutoff before payment and can close an already placed line', () => {
  const f = scenario();
  f.tick(action);
  f.confirm();
  const guide = f.status()!.guide!;
  const wall = { x: guide.from.x - 6, y: 519, width: 14, height: 40 };
  f.arena.obstacles.push(wall);
  assert(!f.tick(action).includes('assassin-writ-set'));
  assert.equal(f.nyx.ultimateAt, 0);
  f.arena.obstacles.pop();
  assert(f.tick(action).includes('assassin-writ-set'));
  const clock = f.nyx.ultimateAt, health = f.quarry.health;
  f.arena.obstacles.push(wall);
  assert(f.tick().includes('assassin-writ-lost'));
  assert.equal(f.lines().length, 0);
  assert.equal(f.quarry.health, health);
  assert.equal(f.nyx.ultimateAt, clock);
});

test('Canted Cutoff keeps its unpaid pin while the Assassin chooses an independent angle', () => {
  const f = scenario(true, 'canted');
  assert(f.tick(action).includes('assassin-writ-mark'));
  f.confirm();
  const until = f.status()!.until;
  assert(f.tick(action).includes('assassin-writ-pin'));
  const pin = f.status()!.pin!;
  assert.equal(f.status()?.phase, 'pinned');
  assert.equal(f.status()?.until, until);
  assert.equal(f.nyx.ultimateAt, 0);
  for (let i = 0; i < 4; i++) f.tick({ moveY: 1, aim: Math.PI / 7 });
  assert.deepEqual(f.status()?.pin, pin);
  assert(f.tick({ ...action, aim: Math.PI / 7 }).includes('assassin-writ-set'));
  const line = f.lines()[0];
  assert.deepEqual({ x: line.x, y: line.y }, pin);
  assert(Math.abs(line.from.x - line.to.x) > 40);
  assert.equal(line.until - line.at, crossingWritRules.cutoffTicks);
  assert(f.nyx.ultimateAt > line.until);
});

test('Transfer Writ reassigns the same paid line once through an actual new primary hit', () => {
  const f = scenario(true, 'transfer');
  f.tick(action);
  f.confirm();
  assert(f.tick(action).includes('assassin-writ-set'));
  const base = f.lines()[0], clock = f.nyx.ultimateAt;
  Object.assign(f.passer, { x: base.x + 47, y: base.y + 44 });
  const angle = Math.atan2(f.passer.y - f.nyx.y, f.passer.x - f.nyx.x);
  assert(f.tick({ ...action, aim: angle }).includes('assassin-writ-proposal'));
  assert.equal(f.status()?.phase, 'transfer');
  assert.equal(f.status()?.until, base.until);
  assert.equal(f.nyx.ultimateAt, clock);
  const sounds = [];
  for (let i = 0; i < 20 && f.status()?.phase === 'transfer'; i++) sounds.push(...f.tick({ fire: true, aim: angle }));
  assert(sounds.includes('assassin-writ-transfer'));
  assert.equal(f.status()?.phase, 'laid');
  assert(!f.tick(action).includes('assassin-writ-proposal'));
  const transferred = f.lines()[0];
  assert.deepEqual(transferred, base);
  const marked = viewOf(f.game, f.ally.id).classCues.find(cue => cue.kind === 'assassin-writ-quarry');
  assert(marked?.kind === 'assassin-writ-quarry' && marked.paid);
  assert(marked.x === f.passer.x && marked.y === f.passer.y && marked.until === base.until);
  assert.equal(viewOf(f.game, f.ally.id).players.find(player => player.id === f.nyx.id)?.kit.crossingWrit, undefined);
  const oldQuarry = f.quarry.health;
  const candidate = f.passer.health;
  f.passer.speed = 220;
  for (let i = 0; i < 19 && f.lines()[0]?.outcome !== 'strike'; i++) f.tick();
  assert.equal(f.lines()[0]?.outcome, 'strike');
  assert.equal(f.quarry.health, oldQuarry);
  assert.equal(f.passer.health, candidate - crossingWritRules.strike);
  assert.equal(f.nyx.ultimateAt, clock);
});
