import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type BardCue, type ConductorCue, callAndResponseId, conductorIds, conductorRules } from '../src/shared/bard-kit.ts';
import { Game } from '../src/shared/game.ts';
import { distance } from '../src/shared/geometry.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

const action = { technique1: true };
const start = { x: 500, y: 500 };
const count = (events: readonly string[], prefix: string) => events.filter(id => id.startsWith(prefix)).length;
type Cue = ReturnType<Game['classCues']>[number];
const isStage = (cue: Cue): cue is ConductorCue => cue.kind === 'bard-response-stage';
const isPhrase = (cue: Cue): cue is BardCue => cue.kind === 'bard-phrase';

function setup(owned = true, heldNote = false, secondBard = false, fitting?: 'side' | 'reprise') {
  const game = new Game({ mode: 'endless', seed: 41, difficulty: 'normal', arenaSelection: 'fixed', openingArenaId: 'gatehouse', maxPlayers: 2 });
  if (heldNote || fitting) game.encounter = 9;
  const bard = game.addPlayer('bard', 'Iven', 'bard');
  const ally = game.addPlayer('ally', 'Lane', secondBard ? 'bard' : 'soldier');
  const buy = (item: string) => assert(game.transact(bard.id, { id: item, kind: 'skill', item }).ok, item);
  buy('bard-performance-1');
  if (owned) buy(callAndResponseId);
  if (heldNote) { buy('bard-performance-2'); buy('bard-performance-3'); }
  if (fitting) {
    buy(conductorIds[fitting]);
    const other = conductorIds[fitting === 'side' ? 'reprise' : 'side'];
    assert.equal(game.transact(bard.id, { id: other, kind: 'skill', item: other }).reason, 'incompatibleItem');
  }
  if (secondBard) for (const item of ['bard-performance-1',callAndResponseId]) {
    assert(game.transact(ally.id, { id: 'second-' + item, kind: 'skill', item }).ok);
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game, 'arena', { get: () => arena });
  Object.assign(bard, start);
  Object.assign(ally, { x: 644, y: 597 });
  Object.assign(game.boss, { x: 1320, y: 720, staggerUntil: 5000, deadline: 5000 });
  const hostile = game.minions.spawn(990001, { kind: 'ordinary', x: 771, y: 500, health: 2000,
    speed: 0, radius: 19, damage: 0 }, game.combatTick)!;
  const history: string[] = [];
  function tick(input: Partial<InputFrame> = {}, other: Partial<InputFrame> = {}) {
    for (const player of [bard, ally]) if (player.connected) assert(game.submitInput(player.id, { ...idleInput(), aim: 0,
      sequence: player.ack + 1, clientTick: game.combatTick, ...(player === bard ? input : other) }));
    game.step();
    const notes = game.drainEvents().flatMap(event => event.type === 'sound' && event.owner === bard.id ? [event.id] : []);
    history.push(...notes);
    return notes;
  }
  const meter = () => game.kitStatus(bard.id).cadence!;
  const stage = () => game.kitStatus(bard.id).conducting;
  const reply = () => game.classCues().filter(isStage).find(cue => cue.owner === bard.id);
  const beats = () => game.classCues().filter(isPhrase);
  function earn() {
    for (let i = 0; i < 90 && meter() < conductorRules.cadence; i++) tick({ fire: true });
    assert(meter() >= conductorRules.cadence);
  }
  function walk() {
    const tell = reply();
    assert(tell);
    for (let i = 0; i < 30 && distance(bard, tell) > conductorRules.stageRadius / 3; i++) tick({ moveX: 1 });
    assert(distance(bard, tell) <= conductorRules.stageRadius / 3);
  }
  function confirm() {
    for (let i = 0; i < 40 && stage()?.phase !== 'answer'; i++) tick({ fire: true });
    assert(stage()?.phase === 'answer' && stage()?.ready);
  }
  return { game, bard, ally, arena, hostile, history, tick, meter, stage, reply, beats, earn, walk, confirm };
}

test('Call and Response spends one real Q and answers only after an actual primary note from its stage', () => {
  const f = setup(), normal = setup(false);
  assert(!f.tick(action).includes('bard-answer-call'));
  normal.tick();
  for (const game of [f, normal]) game.earn();
  const consumed = f.meter();
  assert.equal(normal.meter(), consumed);
  assert(f.stage()?.ready);
  assert(f.tick(action).includes('bard-answer-call'));
  assert(normal.tick({ q: true }).includes('bard-phrase-0'));
  const paid = f.bard.qAt;
  assert.equal(paid, normal.bard.qAt);
  assert.equal(f.meter(), 0);
  assert.equal(f.stage()?.phase, 'listening');
  const stage = f.reply()!;
  assert.equal(stage.kind, 'bard-response-stage');
  assert.equal(stage.x, start.x + conductorRules.reach);
  assert.equal(stage.until - stage.at, conductorRules.stageTicks);
  assert.equal(f.game.kitStatus(f.ally.id).shield, 0);
  assert(!f.tick(action).includes('bard-answer-release'));
  for (let i = 0; i < 14; i++) f.tick({ fire: true });
  assert.equal(f.stage()?.phase, 'listening');
  f.walk();
  f.confirm();
  assert.equal(count(f.history, 'bard-answer-proof'), 1);
  const nextCadence = f.meter();
  const health = f.hostile.health;
  const at = f.game.combatTick;
  const sounded = f.tick(action);
  assert(sounded.includes('bard-answer-release') && sounded.includes('bard-phrase-1'));
  assert(f.beats().some(cue => cue.at > at && cue.x === stage.x && cue.y === stage.y));
  assert(f.hostile.health < health && f.game.kitStatus(f.ally.id).shield > 0);
  assert.equal(f.bard.qAt, paid);
  assert.equal(f.meter(), nextCadence);
  assert.equal(f.reply(), undefined);
  for (let i = 0; i < 70; i++) { f.tick(); normal.tick(); }
  assert.equal(count(f.history,'bard-phrase-'), 2);
  assert.equal(count(normal.history,'bard-phrase-'), 3);
});

test('Masonry rejects an unpaid stage and closes a paid stage while normal Q retains priority', () => {
  const f = setup();
  f.earn();
  const cadence = f.meter();
  const wall = { x: 570, y: 455, width: 40, height: 90 };
  f.arena.obstacles.push(wall);
  assert(!f.tick(action).includes('bard-answer-call'));
  assert.equal(f.meter(), cadence);
  assert.equal(f.bard.qAt, 0);
  f.arena.obstacles.pop();
  assert(f.tick(action).includes('bard-answer-call'));
  const paid = f.bard.qAt;
  f.arena.obstacles.push(wall);
  assert(f.tick().includes('bard-answer-close'));
  assert.equal(f.reply(), undefined);
  assert.equal(f.bard.qAt, paid);

  const ordinary = setup();
  ordinary.earn();
  const opened = ordinary.tick({ ...action, q: true });
  assert(opened.includes('bard-phrase-0') && !opened.includes('bard-answer-call') && !ordinary.reply());
});

test('Ally and untagged projectile damage cannot answer and expiration clears the paid stage', () => {
  const f = setup();
  f.earn();
  f.tick(action);
  const mark = f.reply()!;
  assert.equal(mark.kind, 'bard-response-stage');
  const health = f.hostile.health;
  Object.assign(f.ally, { x: mark.x, y: mark.y + 25 });
  const aim = Math.atan2(f.hostile.y-f.ally.y, f.hostile.x-f.ally.x);
  for (let i = 0; i < 20; i++) f.tick({}, { fire: true, aim });
  assert(f.hostile.health < health && f.stage()?.phase === 'listening');
  const before = f.hostile.health;
  assert(f.game['emitShot'](f.bard.id, mark.x, mark.y, 0, 700, 20, 4, 0, 1));
  for (let i = 0; i < 8; i++) f.tick();
  assert(f.hostile.health < before && f.stage()?.phase === 'listening');
  while (f.game.combatTick < mark.until) f.tick();
  assert(f.history.includes('bard-answer-close') && !f.reply());
  assert(!f.tick(action).includes('bard-answer-release'));
});

test('Held Note uses the final real answer and a disconnected Bard removes the physical stage', () => {
  const f = setup(true, true);
  f.earn();
  f.tick(action);
  const initial = f.beats()[0];
  assert(initial?.kind === 'bard-phrase');
  f.walk();
  f.confirm();
  assert(f.tick(action).includes('bard-answer-release'));
  const answer = f.beats().find(cue => cue.kind === 'bard-phrase' && cue.beat === 1);
  assert(answer?.kind === 'bard-phrase' && answer.radius === initial.radius * 1.4);

  const gone = setup();
  gone.earn();
  gone.tick(action);
  assert(viewOf(gone.game,gone.ally.id).classCues.some(cue => cue.kind === 'bard-response-stage'));
  gone.game.setConnected(gone.bard.id, false);
  assert.equal(gone.reply(), undefined);
});

test('Two Bards pay and confirm their own stages through separate actual primary notes', () => {
  const f = setup(true, false, true);
  f.earn();
  assert(f.tick(action).includes('bard-answer-call'));
  const first = f.reply()!;
  Object.assign(f.ally, { x: 500, y: 654 });
  const target = f.game.minions.spawn(990002, { kind: 'ordinary', x: 767, y: 654, health: 2000,
    speed: 0, radius: 19, damage: 0 }, f.game.combatTick)!;
  const secondState = () => f.game.kitStatus(f.ally.id);
  for (let i = 0; i < 60 && secondState().cadence! < conductorRules.cadence; i++) f.tick({}, { fire: true });
  assert(secondState().cadence! >= conductorRules.cadence && target.health < 2000);
  f.tick({}, action);
  const second = f.game.classCues().filter(isStage).find(cue => cue.owner === f.ally.id)!;
  assert(second.id !== first.id && second.at > first.at && f.ally.qAt > f.bard.qAt);
  for (let i = 0; i < 30 && distance(f.ally, second) > 24; i++) f.tick({}, { moveX: 1 });
  for (let i = 0; i < 28 && secondState().conducting?.phase !== 'answer'; i++) f.tick({}, { fire: true });
  assert.equal(secondState().conducting?.phase, 'answer');
  assert.equal(f.stage()?.phase, 'listening');
  assert.equal(f.reply()?.id, first.id);
  f.game.setConnected(f.bard.id, false);
  assert(f.game.classCues().some(cue => cue.kind === 'bard-response-stage' && cue.id === second.id));
});

test('Side Stage spends one fresh cadence and reserves the same deadline for a new qualifying note', () => {
  const f = setup(true, false, false, 'side');
  f.earn();
  f.tick(action);
  const original = f.reply()!, paid = f.bard.qAt, turned = Math.PI / 5;
  assert(!f.tick({ ...action, aim: turned }).includes('bard-answer-shift'));
  for (let i = 0; i < 26 && f.meter() < 1; i++) f.tick({ fire: true });
  for (let i = 0; i < 16 && [...f.game.shots.values()].some(shot => shot.owner === f.bard.id); i++) f.tick();
  assert(f.meter() >= 1);
  const destination = { x: start.x + Math.cos(turned) * conductorRules.reach, y: start.y + Math.sin(turned) * conductorRules.reach };
  const overlap = { x: (original.x + destination.x) / 2, y: (original.y + destination.y) / 2 };
  for (let i = 0; i < 40 && distance(f.bard, overlap) > 8; i++) {
    const aim = Math.atan2(overlap.y - f.bard.y, overlap.x - f.bard.x);
    f.tick({ moveX: Math.cos(aim), moveY: Math.sin(aim) });
  }
  assert(distance(f.bard, original) < conductorRules.stageRadius && distance(f.bard,destination) < conductorRules.stageRadius);
  const bearing = Math.atan2(f.hostile.y - f.bard.y, f.hostile.x - f.bard.x);
  const before = f.hostile.health;
  f.tick({ fire: true, aim: bearing });
  assert(f.hostile.health === before && f.stage()?.phase === 'listening');
  const cadence = f.meter();
  assert(f.tick({ ...action, aim: turned }).includes('bard-answer-shift'));
  const shifted = f.reply()!;
  assert.deepEqual({ x: shifted.x, y: shifted.y },destination);
  assert(shifted.shifted && shifted.id === original.id && shifted.until === original.until && shifted.at === original.at);
  assert.equal(f.meter(),cadence - 1);
  assert.equal(f.bard.qAt,paid);
  for (let i = 0; i < 13; i++) f.tick();
  assert(f.hostile.health < before && f.stage()?.phase === 'listening');
  assert(!f.tick({ ...action, aim: Math.PI / 8 }).includes('bard-answer-shift'));
  for (let i = 0; i < 22 && f.stage()?.phase !== 'answer'; i++) f.tick({ fire: true, aim: bearing });
  assert(f.stage()?.phase === 'answer');
  assert(f.tick(action).includes('bard-answer-release'));
  assert(f.beats().some(cue => cue.beat === 1 && cue.x === shifted.x && cue.y === shifted.y));
  assert.equal(f.bard.qAt,paid);
});

test('Reprise can answer at the original call after proof while paying only the original Q', () => {
  const f = setup(true, false, false, 'reprise');
  f.earn();
  f.tick(action);
  const paid = f.bard.qAt;
  f.walk();
  f.confirm();
  const flank = f.game.minions.spawn(990003, { kind: 'ordinary', x: 480, y: 616, health: 1000, speed: 0,
    radius: 10, damage: 0 }, f.game.combatTick)!;
  const front = f.hostile.health;
  const release = f.tick({ ...action, aim: Math.PI });
  assert(release.includes('bard-answer-reprise') && release.includes('bard-answer-release'));
  assert(f.beats().some(cue => cue.beat === 1 && cue.x === start.x && cue.y === start.y));
  assert(flank.health < 1000 && f.hostile.health === front);
  assert.equal(f.bard.qAt,paid);
});
