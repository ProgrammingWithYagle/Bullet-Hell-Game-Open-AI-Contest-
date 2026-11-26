import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { compoundRules, preparedIds, type CompoundFitting } from '../src/shared/alchemist-prepared.ts';
import { reactiveIds } from '../src/shared/alchemist-reactive.ts';
import type { Recipe } from '../src/shared/alchemist-kit.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

type Options = { fitting?: CompoundFitting; transform?: string; reactive?: boolean; partner?: boolean; unowned?: boolean };
function fight({ fitting = 'standard', transform, reactive = false, partner = false, unowned = false }: Options = {}) {
  const late = fitting !== 'standard' || transform || reactive;
  const game = new Game({ mode:late ? 'endless' : 'short', difficulty:'normal', seed:41, maxPlayers:partner ? 2 : 1 });
  if (late) game.encounter = 9;
  const actor = game.addPlayer('perrin','Perrin','alchemist'), other = partner ? game.addPlayer('heda','Heda','alchemist') : actor;
  const cards = new Map([...data.skills,...data.specializationSkills].map(card => [card.id,card]));
  let serial = 0;
  const buy = (item: string, who = actor) => game.transact(who.id,{ kind:'skill', item, id:'prepared-' + ++serial });
  function learn(id: string, who = actor) {
    if (who.skills.includes(id)) return;
    const card = cards.get(id);
    assert(card,id);
    if (card.prerequisite) learn(card.prerequisite,who);
    assert(buy(id,who).ok,id);
  }
  if (!unowned) {
    assert(!buy(preparedIds.entry).ok);
    learn(preparedIds.entry);
    if (partner) learn(preparedIds.entry,other);
    if (!late) {
      assert.equal(actor.totalSp,3);
      assert(!buy(preparedIds.brew).ok && !buy(preparedIds.toss).ok);
    }
  }
  if (fitting !== 'standard') {
    learn(preparedIds[fitting]);
    assert.equal(buy(preparedIds[fitting === 'brew' ? 'toss' : 'brew']).reason,'incompatibleItem');
  }
  if (transform) {
    const card = data.skills.find(row => row.classId === 'alchemist' && row.transform === transform);
    assert(card);
    learn(card.id);
  }
  if (reactive) learn(reactiveIds.entry);
  assert(game.start());
  const obstacles: typeof game.arena.obstacles = [];
  const arena = { ...game.arena, obstacles, lavaPits:[] };
  Object.defineProperty(game,'arena',{ get:() => arena });
  Object.defineProperty(game,'obstacles',{ get:() => obstacles });
  Object.assign(game.boss,{ x:1340,y:782,health:100000,maxHealth:100000,staggerUntil:9999,deadline:12000 });
  Object.assign(actor,{ x:800,y:700,oldX:800,oldY:700 });
  if (partner) Object.assign(other,{ x:800,y:460,oldX:800,oldY:460 });
  const step = (changes: Partial<InputFrame> = {}, who = actor) => {
    assert(game.submitInput(who.id,{ ...idleInput(),aim:0,...changes,sequence:who.ack + 1,clientTick:game.combatTick }));
    game.step();
  };
  function wait(until: () => boolean) {
    for (let tick = 0; tick < 580 && !until(); tick++) step();
    assert(until());
  }
  const kit = (who = actor) => game.kitStatus(who.id);
  const reserve = (who = actor) => kit(who).alchemyReserve;
  function startBrew(recipe: Recipe, who = actor) {
    wait(() => game.combatTick >= who.qAt);
    if (kit(who).alchemyRecipe !== recipe) assert(game.selectAlchemy(who.id,recipe));
    step({ q:true },who);
  }
  function brew(recipe: Recipe, who = actor) {
    startBrew(recipe,who);
    assert(kit(who).alchemyBrewUntil! > game.combatTick);
    wait(() => !kit(who).alchemyBrewUntil);
    assert.equal(kit(who).alchemyPrepared!.at(-1),recipe);
  }
  const stow = (who = actor) => step({ technique2:true },who);
  const toss = (x = 930,y = 700) => game.throwAlchemy(actor.id,{ x,y });
  const flights = () => game.classCues().flatMap(cue => cue.kind === 'alchemy-flask' && cue.owner === actor.id ? [cue] : []);
  return { game,actor,other,kit,reserve,step,wait,startBrew,brew,stow,toss,flights,obstacles };
}

test('Stow Flask pays with a real occupied slot and returns the exact front vial only after it settles', () => {
  const f = fight();
  f.brew('flare');
  f.brew('binding');
  const stock = [f.kit().alchemyCinder,f.kit().alchemyChalk,f.kit().alchemySap];
  const clocks = [f.actor.qAt,f.actor.eAt,f.actor.ammo];
  f.step({ technique2:true,fire:true });
  const held = f.reserve()?.held;
  assert(held && held.recipe === 'flare');
  assert.equal(held.until - f.game.combatTick,compoundRules.holdingTicks);
  assert.equal(held.readyAt - f.game.combatTick,compoundRules.settleTicks);
  assert.deepEqual(f.kit().alchemyPrepared,['binding']);
  assert.deepEqual([f.kit().alchemyCinder,f.kit().alchemyChalk,f.kit().alchemySap],stock);
  assert.deepEqual([f.actor.qAt,f.actor.eAt,f.actor.ammo],clocks);
  f.step();
  f.stow();
  assert.deepEqual(f.reserve()?.held,held);
  f.wait(() => f.game.combatTick >= held.readyAt);
  assert.equal(f.reserve()?.stage,'return');
  f.stow();
  assert.equal(f.reserve()?.held,undefined);
  assert.deepEqual(f.kit().alchemyPrepared,['flare','binding']);
  assert(f.toss());
  assert.deepEqual(f.flights().map(row => row.recipe),['flare']);
});

test('a sleeve fills a two-bottle rack, blocks throws from an empty queue, and loses its old dose on expiry', () => {
  const f = fight();
  f.brew('flare');
  f.stow();
  const held = f.reserve()?.held;
  assert(held);
  assert(!f.toss());
  assert.equal(f.actor.eAt,0);
  f.brew('binding');
  const blockedAt = f.actor.qAt;
  f.wait(() => f.game.combatTick === held.until - 1);
  assert.deepEqual(f.kit().alchemyPrepared,['binding']);
  assert.deepEqual(f.reserve()?.held,held);
  f.step();
  assert.equal(f.reserve()?.held,undefined);
  assert.equal(f.actor.qAt,blockedAt);
  assert(f.toss());
  assert.deepEqual(f.flights().map(row => row.recipe),['binding']);
});

test('an early full rack blocks Small Batch even when an alternate recipe and its stock are available', () => {
  const f = fight({ fitting:'toss' });
  f.brew('flare');
  f.brew('binding');
  f.wait(() => f.game.combatTick >= f.actor.qAt);
  f.stow();
  const held = f.reserve()?.held;
  assert(held);
  f.startBrew('mending');
  assert.equal(f.kit().alchemyBrewUntil,0);
  assert.deepEqual(f.kit().alchemyPrepared,['binding']);
  assert.deepEqual(f.reserve()?.held,held);
});

test('Brew Latch waits through a same-recipe brew and an attempted manual return', () => {
  const f = fight({ fitting:'brew' });
  f.brew('flare');
  f.wait(() => f.game.combatTick >= f.actor.qAt);
  f.stow();
  const held = f.reserve()?.held;
  assert(held);
  f.brew('flare');
  f.wait(() => f.game.combatTick >= held.readyAt);
  f.stow();
  assert.deepEqual(f.reserve()?.held,held);
  assert(f.toss());
  assert.deepEqual(f.reserve()?.held,held);
  f.brew('binding');
  assert.equal(f.reserve()?.held,undefined);
  assert.deepEqual(f.kit().alchemyPrepared,['flare','binding']);
});

test('a dodged and paid brew never opens Brew Latch', () => {
  const f = fight({ fitting:'brew' });
  f.brew('flare');
  f.wait(() => f.game.combatTick >= f.actor.qAt);
  f.stow();
  const held = f.reserve()?.held;
  assert(held);
  const stock = f.kit().alchemySap!;
  f.startBrew('binding');
  assert(f.kit().alchemyBrewUntil);
  f.step({ dodge:true,moveX:1 });
  assert.equal(f.kit().alchemySap,stock - 1);
  assert.equal(f.kit().alchemyBrewUntil,0);
  assert.deepEqual(f.reserve()?.held,held);
  assert.deepEqual(f.kit().alchemyPrepared,[]);
});

test('Throw Latch opens only on an accepted different Cast Flask and returns its bottle before the next throw', () => {
  const f = fight({ fitting:'toss' });
  f.brew('flare');
  f.brew('binding');
  f.stow();
  const held = f.reserve()?.held;
  assert(held);
  f.obstacles.push({ x:830,y:680,width:30,height:45 });
  assert(!f.toss());
  assert.deepEqual(f.reserve()?.held,held);
  f.obstacles.length = 0;
  assert(f.toss());
  assert.equal(f.reserve()?.held,undefined);
  assert.deepEqual(f.kit().alchemyPrepared,['flare']);
  assert.deepEqual(f.flights().map(row => row.recipe),['binding']);
  assert(!f.toss());
  f.wait(() => f.game.combatTick >= f.actor.eAt);
  assert(f.toss());
  assert.deepEqual(f.flights().map(row => row.recipe),['flare']);
});

test('Throw Latch stays closed when ordinary Cast Flask launches the same recipe', () => {
  const f = fight({ fitting:'toss' });
  f.brew('flare');
  f.brew('flare');
  f.stow();
  const held = f.reserve()?.held;
  assert(held?.recipe === 'flare');
  assert(f.toss());
  assert.deepEqual(f.reserve()?.held,held);
  assert.deepEqual(f.kit().alchemyPrepared,[]);
});

test('Throw Latch and Flash Reaction share the real rack without releasing the stowed vial twice', () => {
  const f = fight({ fitting:'toss',reactive:true,transform:'settled-batch' });
  f.brew('mending');
  f.brew('binding');
  f.brew('flare');
  f.stow();
  assert.deepEqual(f.kit().alchemyPrepared,['binding','flare']);
  assert(f.toss());
  assert.deepEqual(f.kit().alchemyPrepared,['mending','flare']);
  f.stow();
  const held = f.reserve()?.held;
  assert(held?.recipe === 'mending');
  f.wait(() => f.reserve()?.stage === 'toss' && f.kit().alchemyReaction?.stage === 'ready');
  f.step({ technique1:true });
  assert.equal(f.kit().alchemyReaction?.stage,'spent');
  assert.deepEqual(f.reserve()?.held,held);
  assert.deepEqual(f.kit().alchemyPrepared,[]);
  assert(f.flights().some(row => row.recipe === 'flare'));
});

test('a returned Settled Batch keeps potency, and Split Pour spends one returned bottle and its single batch charge', () => {
  for (const transform of ['settled-batch','split-pour']) {
    const damage = [false,true].map(stowed => {
      const f = fight({ transform });
      f.brew('flare');
      const targetTick = f.game.combatTick + 2 + compoundRules.settleTicks;
      if (stowed) {
        f.stow();
        const held = f.reserve()?.held;
        assert(held);
        f.wait(() => f.game.combatTick >= held.readyAt);
        f.stow();
      } else f.wait(() => f.game.combatTick >= targetTick);
      assert.equal(f.game.combatTick,targetTick);
      f.step({ ultimate:true });
      const charges = f.kit().alchemyBatchCharges!;
      const enemy = f.game.minions.spawn(99991,{ kind:'ordinary',x:930,y:700,health:1000,speed:0,radius:10,damage:0 },f.game.combatTick);
      assert(enemy && f.toss());
      assert.equal(f.flights().length,transform === 'split-pour' ? 2 : 1);
      assert.equal(f.kit().alchemyBatchCharges,charges - 1);
      assert.deepEqual(f.kit().alchemyPrepared,[]);
      f.wait(() => enemy.health < 1000);
      return 1000 - enemy.health;
    });
    assert.equal(damage[0],damage[1]);
  }
});

test('a returned Flask still pays the issued Second Extraction recovery and refunds only a useful initial hit', () => {
  for (const target of [false,true]) {
    const f = fight({ fitting:'brew',transform:'second-extraction' });
    f.brew('flare');
    f.stow();
    f.brew('binding');
    assert.deepEqual(f.kit().alchemyPrepared,['flare','binding']);
    const enemy = target && f.game.minions.spawn(99993,{ kind:'ordinary',x:930,y:700,health:1000,speed:0,radius:10,damage:0 },f.game.combatTick);
    const before = f.kit().alchemyCinder!;
    assert(f.toss());
    const recovery = f.actor.eAt - f.game.combatTick;
    assert(recovery > 180);
    const [flight] = f.flights();
    assert(flight.recipe === 'flare' && flight.until < 150);
    f.wait(() => f.game.combatTick >= flight.until);
    assert.equal(f.kit().alchemyCinder,before + Number(target));
    if (enemy) assert(enemy.health < 1000);
  }
});

test('stowing is owned and owner-private and disconnect clears only that sleeve', () => {
  const f = fight({ partner:true });
  f.brew('flare');
  f.stow();
  f.brew('binding',f.other);
  f.stow(f.other);
  const privateView = viewOf(f.game,f.actor.id), witness = viewOf(f.game,f.other.id);
  assert.equal(privateView.players.find(row => row.id === f.actor.id)?.kit.alchemyReserve?.held?.recipe,'flare');
  assert.equal(witness.players.find(row => row.id === f.actor.id)?.kit.alchemyReserve,undefined);
  const other = f.reserve(f.other)?.held;
  assert(other?.recipe === 'binding');
  f.game.setConnected(f.actor.id,false);
  assert.equal(f.reserve()?.held,undefined);
  assert.deepEqual(f.reserve(f.other)?.held,other);
  const issued = fight({ unowned:true });
  issued.brew('flare');
  issued.stow();
  assert.deepEqual(issued.kit().alchemyPrepared,['flare']);
  assert.equal(issued.reserve(),undefined);
});
