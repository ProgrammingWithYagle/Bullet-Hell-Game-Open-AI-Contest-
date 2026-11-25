import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { reactiveIds, reactiveRules, type ReactiveFitting } from '../src/shared/alchemist-reactive.ts';
import type { Recipe } from '../src/shared/alchemist-kit.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

type Choice = { fitting?: ReactiveFitting; transform?: string; peer?: boolean; unowned?: boolean };

function fixture({ fitting = 'standard', transform, peer = false, unowned = false }: Choice = {}) {
  const late = fitting !== 'standard' || !!transform;
  const game = new Game({ mode: late ? 'endless' : 'short', difficulty: 'normal', seed: 41, maxPlayers: peer ? 2 : 1 });
  if (late) game.encounter = 9;
  const owner = game.addPlayer('perrin', 'Perrin', 'alchemist');
  const ally = peer ? game.addPlayer('heda', 'Heda', 'alchemist') : undefined;
  const cards = new Map([...data.skills, ...data.specializationSkills].map(card => [card.id, card]));
  let serial = 0;
  const buy = (id: string) => game.transact(owner.id, { kind: 'skill', item: id, id: 'reactive-' + ++serial });
  function learn(id: string) {
    if (owner.skills.includes(id)) return;
    const card = cards.get(id);
    assert(card, id);
    if (card.prerequisite) learn(card.prerequisite);
    assert(buy(id).ok, id);
  }
  if (!unowned) {
    assert(!buy(reactiveIds.entry).ok);
    learn(reactiveIds.entry);
    if (!late) {
      assert.equal(owner.totalSp, 3);
      assert(!buy(reactiveIds.wick).ok && !buy(reactiveIds.vent).ok);
    }
  }
  if (fitting !== 'standard') {
    learn(reactiveIds[fitting]);
    assert.equal(buy(reactiveIds[fitting === 'wick' ? 'vent' : 'wick']).reason, 'incompatibleItem');
  }
  if (transform) {
    const card = data.skills.find(node => node.classId === 'alchemist' && node.transform === transform);
    assert(card);
    learn(card.id);
  }
  assert(game.start());
  const obstacles: typeof game.arena.obstacles = [];
  const arena = { ...game.arena, obstacles, lavaPits: [] };
  Object.defineProperty(game, 'arena', { get: () => arena });
  Object.defineProperty(game, 'obstacles', { get: () => obstacles });
  Object.assign(game.boss, { x: 1340, y: 782, health: 100000, maxHealth: 100000, staggerUntil: 9999, deadline: 12000 });
  Object.assign(owner, { x: 800, y: 700, oldX: 800, oldY: 700 });
  if (ally) Object.assign(ally, { x: 800, y: 460, oldX: 800, oldY: 460 });

  function step(frame: Partial<InputFrame> = {}, actor = owner) {
    assert(game.submitInput(actor.id, { ...idleInput(), aim: 0, ...frame, sequence: actor.ack + 1, clientTick: game.combatTick }));
    game.step();
  }
  function wait(ready: () => boolean, actor = owner) {
    for (let t = 0; t < 580 && !ready(); t++) step({}, actor);
    assert(ready());
  }
  const kit = (actor = owner) => game.kitStatus(actor.id);
  function brew(recipe: Recipe, actor = owner) {
    wait(() => game.combatTick >= actor.qAt, actor);
    if (kit(actor).alchemyRecipe !== recipe) assert(game.selectAlchemy(actor.id, recipe));
    const before = kit(actor).alchemyPrepared!.length;
    step({ q: true }, actor);
    assert(kit(actor).alchemyBrewUntil! > game.combatTick);
    wait(() => kit(actor).alchemyPrepared!.length === before + 1, actor);
    assert.equal(kit(actor).alchemyPrepared!.at(-1), recipe);
  }
  const cues = (kind: 'alchemy-pool' | 'alchemy-flask' | 'alchemy-combination', actor = owner) =>
    game.classCues().flatMap(cue => cue.kind === kind && cue.owner === actor.id ? [cue] : []);
  const binding = (actor = owner) => cues('alchemy-pool', actor).filter(cue => cue.recipe === 'binding');
  function throwAt(x: number, y: number, actor = owner) {
    wait(() => game.combatTick >= actor.eAt, actor);
    assert(game.throwAlchemy(actor.id, { x, y }));
    return actor.eAt - game.combatTick;
  }
  let targetId = 98100;
  function enemy(x: number, y: number) {
    const target = game.minions.spawn(++targetId, { kind: 'ordinary', x, y, health: 1000, speed: 0, radius: 10, damage: 0 }, game.combatTick);
    assert(target);
    return target;
  }
  return { game, owner, ally, obstacles, kit, step, wait, brew, cues, binding, throwAt, enemy };
}

function stageBinding(f: ReturnType<typeof fixture>, reach = 130) {
  f.brew('binding');
  f.brew('flare');
  const recovery = f.throwAt(f.owner.x + reach, f.owner.y);
  f.wait(() => f.binding().length > 0);
  return { pool: f.binding()[0], recovery };
}

test('Flash Reaction pays one flask, extra chalk and one full future throw recovery at three earned SP', () => {
  const f = fixture();
  const { pool, recovery } = stageBinding(f);
  const target = f.enemy(pool.x, pool.y);
  const before = f.owner.eAt;
  const chalk = f.kit().alchemyChalk!;
  const samples = f.owner.ammo;
  assert.equal(f.kit().alchemyReaction?.stage, 'ready');
  f.step({ technique1: true, fire: true });
  assert.equal(f.kit().alchemyChalk, chalk - reactiveRules.chalk);
  assert.deepEqual(f.kit().alchemyPrepared, []);
  assert.equal(f.owner.ammo, samples);
  assert.equal(f.owner.eAt, before + recovery);
  const [flight] = f.cues('alchemy-flask');
  assert(flight && flight.recipe === 'flare' && flight.x2 === pool.x && flight.y2 === pool.y);
  assert.equal(flight.until - flight.at, 15);
  assert.equal(f.kit().alchemyReaction?.stage, 'spent');
  f.wait(() => target.health < 1000);
  assert.equal(f.binding().length, 0);
  assert(f.cues('alchemy-combination').some(cue => cue.recipe === 'flare'));
  assert(Math.abs(1000 - target.health - 85 * f.game.stats(f.owner).ability) < .001);
});

test('a closed ray rejects the advance and a new wall stops a launched Flask on its fixed line', () => {
  const f = fixture();
  const { pool, recovery } = stageBinding(f);
  const before = f.owner.eAt;
  const target = f.enemy(pool.x, pool.y);
  const wall = { x: 845, y: 676, width: 20, height: 48 };
  f.obstacles.push(wall);
  const chalk = f.kit().alchemyChalk;
  f.step({ technique1: true });
  assert.equal(f.owner.eAt, before);
  assert.equal(f.kit().alchemyChalk, chalk);
  assert.deepEqual(f.kit().alchemyPrepared, ['flare']);
  assert.equal(f.kit().alchemyReaction?.stage, 'aim');
  f.obstacles.length = 0;
  f.step();
  f.step({ technique1: true });
  const [flight] = f.cues('alchemy-flask');
  assert(flight);
  f.obstacles.push(wall);
  f.wait(() => f.game.combatTick > flight.until);
  assert.equal(f.owner.eAt, before + recovery);
  assert.equal(target.health, 1000);
  assert(f.binding().some(cue => cue.id === pool.id && cue.until === pool.until));
  assert.equal(f.cues('alchemy-combination').length, 0);
});

test('Short Wick spends the same throw recovery and trades reach for a nine-tick actual flight', () => {
  const f = fixture({ fitting: 'wick' });
  const { pool, recovery } = stageBinding(f, 232);
  const eAt = f.owner.eAt;
  assert.equal(f.kit().alchemyReaction?.stage, 'aim');
  f.step({ technique1: true });
  assert.equal(f.owner.eAt, eAt);
  for (let t = 0; t < 18 && pool.x - f.owner.x > reactiveRules.wickRange; t++) f.step({ moveX: 1 });
  assert.equal(f.kit().alchemyReaction?.stage, 'ready');
  f.step({ technique1: true });
  const [flight] = f.cues('alchemy-flask');
  assert(flight && flight.until - flight.at === reactiveRules.wickFlightTicks);
  assert.equal(f.owner.eAt, eAt + recovery);
});

test('Vent Cap keeps the original Binding and permits one advance per ordinary Cast Flask', () => {
  const f = fixture({ fitting: 'vent' });
  const { pool } = stageBinding(f);
  const target = f.enemy(pool.x, pool.y);
  f.step({ technique1: true });
  f.wait(() => target.health < 1000);
  assert(f.binding().some(cue => cue.id === pool.id && cue.until === pool.until));
  assert.equal(f.cues('alchemy-combination').length, 0);
  assert(Math.abs(1000 - target.health - 55 * f.game.stats(f.owner).ability) < .001);
  f.brew('flare');
  const eAt = f.owner.eAt;
  const chalk = f.kit().alchemyChalk;
  f.step({ technique1: true });
  assert.equal(f.kit().alchemyReaction?.stage, 'spent');
  assert.equal(f.owner.eAt, eAt);
  assert.equal(f.kit().alchemyChalk, chalk);
  assert.deepEqual(f.kit().alchemyPrepared, ['flare']);
});

test('an ally’s Binding is ineligible and the selected pool stays private to the actual owner', () => {
  const f = fixture({ peer: true });
  const ally = f.ally!;
  f.brew('binding', ally);
  const { pool } = stageBinding(f);
  f.throwAt(800, 505, ally);
  f.wait(() => f.binding(ally).length === 1);
  const foreign = f.binding(ally)[0];
  const eAt = f.owner.eAt;
  f.step({ aim: -Math.PI / 2, technique1: true });
  assert.equal(f.owner.eAt, eAt);
  assert.equal(f.kit().alchemyReaction?.stage, 'aim');
  f.step();
  assert.equal(f.kit().alchemyReaction?.target?.x, pool.x);
  const witness = viewOf(f.game, ally.id).players.find(player => player.id === f.owner.id);
  assert(witness && !witness.kit.alchemyReaction);
  f.step({ technique1: true });
  f.wait(() => f.binding().length === 0);
  assert(f.binding(ally).some(cue => cue.id === foreign.id));
});

test('an issued Alchemist without the new purchase still needs ordinary E recovery', () => {
  const f = fixture({ unowned: true });
  stageBinding(f);
  const until = f.owner.eAt;
  f.step({ technique1: true });
  assert.equal(f.kit().alchemyReaction, undefined);
  assert.deepEqual(f.kit().alchemyPrepared, ['flare']);
  assert.equal(f.owner.eAt, until);
});

test('an empowered early Split Pour spends one charge and reacts with only the chosen real Binding', () => {
  const f = fixture({ transform: 'split-pour' });
  stageBinding(f);
  assert.equal(f.binding().length, 2);
  f.step({ ultimate: true });
  const [first, second] = f.binding();
  const aim = Math.atan2(first.y - f.owner.y, first.x - f.owner.x);
  f.step({ aim });
  assert.equal(f.kit().alchemyReaction?.target?.y, first.y);
  const target = f.enemy(first.x, first.y);
  const charges = f.kit().alchemyBatchCharges!;
  f.step({ technique1: true, aim });
  const flights = f.cues('alchemy-flask');
  assert.equal(flights.length, 2);
  assert(flights.every(cue => cue.empowered));
  assert.equal(f.kit().alchemyBatchCharges, charges - 1);
  f.wait(() => target.health < 1000);
  assert.deepEqual(f.binding().map(cue => cue.id), [second.id]);
  assert.equal(f.cues('alchemy-combination').length, 1);
});

test('Vent Cap protects the selected split Binding when the ordinary four-pool limit forces retirement', () => {
  const f = fixture({ fitting: 'vent', transform: 'split-pour' });
  stageBinding(f);
  const [first, second] = f.binding();
  f.brew('flare');
  f.throwAt(800, 850);
  f.wait(() => f.cues('alchemy-pool').length === 4);
  const aim = Math.atan2(first.y - f.owner.y, first.x - f.owner.x);
  f.step({ aim });
  assert.equal(f.kit().alchemyReaction?.target?.y, first.y);
  f.step({ technique1: true, aim });
  assert.equal(f.cues('alchemy-flask').length, 2);
  f.wait(() => f.cues('alchemy-flask').length === 0);
  assert.equal(f.cues('alchemy-pool').length, 4);
  assert(f.binding().some(cue => cue.id === first.id && cue.until === first.until));
  assert(!f.binding().some(cue => cue.id === second.id));
  assert.equal(f.cues('alchemy-combination').length, 0);
});

test('Settled Batch carries its preparation potency into the early landing', () => {
  const f = fixture({ transform: 'settled-batch' });
  const { pool } = stageBinding(f);
  const target = f.enemy(pool.x, pool.y);
  f.step({ technique1: true });
  f.wait(() => target.health < 1000);
  assert(Math.abs(1000 - target.health - 85 * f.game.stats(f.owner).ability * 1.25) < .001);
});

test('Second Extraction extends the borrowed cooldown and refunds only after a useful early landing', () => {
  const f = fixture({ transform: 'second-extraction' });
  const { pool, recovery } = stageBinding(f);
  assert.equal(recovery, Math.ceil(8 * 30 * f.game.stats(f.owner).cooldown));
  const eAt = f.owner.eAt;
  const target = f.enemy(pool.x, pool.y);
  const before = f.kit().alchemyCinder!;
  f.step({ technique1: true });
  assert.equal(f.owner.eAt, eAt + recovery);
  assert.equal(f.kit().alchemyCinder, before);
  f.wait(() => target.health < 1000);
  assert.equal(f.kit().alchemyCinder, before + 1);
});
