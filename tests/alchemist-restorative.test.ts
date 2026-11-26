import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { dressingRules, restorativeIds, type RestorativeFitting } from '../src/shared/alchemist-restorative.ts';
import { preparedIds } from '../src/shared/alchemist-prepared.ts';
import { reactiveIds } from '../src/shared/alchemist-reactive.ts';
import type { Recipe } from '../src/shared/alchemist-kit.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

type Options = { fitting?: RestorativeFitting; transforms?: string[]; allies?: number; allRoutes?: boolean; unowned?: boolean };
function fight({fitting='standard',transforms=[],allies=0,allRoutes=false,unowned=false}: Options = {}) {
  const late = fitting !== 'standard' || transforms.length || allRoutes;
  const game = new Game({mode:late ? 'endless' : 'short',difficulty:'normal',seed:41,maxPlayers:1 + allies});
  if (late) game.encounter = 9;
  const owner = game.addPlayer('perrin','Perrin','alchemist');
  const peers = Array.from({length:allies},(_,i) => game.addPlayer('ally-' + i,'Ally ' + i,'soldier'));
  const nodes = new Map([...data.skills,...data.specializationSkills].map(node => [node.id,node]));
  let tx = 0;
  const buy = (item: string) => game.transact(owner.id,{kind:'skill',item,id:'restorative-' + ++tx});
  function learn(id: string) {
    if (owner.skills.includes(id)) return;
    const node = nodes.get(id);
    assert(node,id);
    if (node.prerequisite) learn(node.prerequisite);
    assert(buy(id).ok,id);
  }
  if (!unowned) {
    assert(!buy(restorativeIds.entry).ok);
    learn(restorativeIds.entry);
    if (!late) {
      assert.equal(owner.totalSp,3);
      assert(!buy(restorativeIds.shared).ok && !buy(restorativeIds.quick).ok);
    }
  }
  if (fitting !== 'standard') {
    learn(restorativeIds[fitting]);
    assert.equal(buy(restorativeIds[fitting === 'shared' ? 'quick' : 'shared']).reason,'incompatibleItem');
  }
  if (allRoutes) { learn(reactiveIds.entry); learn(preparedIds.toss); }
  for (const transform of transforms) {
    const match = data.skills.find(node => node.classId === 'alchemist' && node.transform === transform);
    assert(match,transform);
    learn(match.id);
  }
  assert(game.start());
  const obstacles: typeof game.arena.obstacles = [];
  const arena = { ...game.arena, obstacles, lavaPits:[] };
  Object.defineProperty(game,'arena',{get:() => arena});
  Object.defineProperty(game,'obstacles',{get:() => obstacles});
  Object.assign(game.boss,{x:1340,y:792,health:100000,maxHealth:100000,staggerUntil:9999,deadline:12000});
  const place = (actor: typeof owner,x: number,y: number) => Object.assign(actor,{x,y,oldX:x,oldY:y});
  place(owner,800,700);
  peers.forEach((actor,i) => place(actor,800,480+i*70));
  const kit = () => game.kitStatus(owner.id);
  function step(input: Partial<InputFrame> = {}) {
    assert(game.submitInput(owner.id,{...idleInput(),aim:0,...input,sequence:owner.ack + 1,clientTick:game.combatTick}));
    game.step();
  }
  function wait(until: () => boolean) {
    for(let t=0;t<590 && !until();t++) step();
    assert(until());
  }
  const reach = (tick: number) => wait(() => game.combatTick >= tick);
  function brew(recipe: Recipe) {
    reach(owner.qAt);
    if (kit().alchemyRecipe !== recipe) assert(game.selectAlchemy(owner.id,recipe));
    step({q:true});
    assert(kit().alchemyBrewUntil);
    wait(() => !kit().alchemyBrewUntil);
    assert.equal(kit().alchemyPrepared!.at(-1),recipe);
  }
  const dressing = () => game.classCues().flatMap(cue => cue.kind === 'alchemy-dressing' && cue.owner === owner.id ? [cue] : []);
  const flights = () => game.classCues().flatMap(cue => cue.kind === 'alchemy-flask' && cue.owner === owner.id ? [cue] : []);
  function lay() {
    step({technique3:true});
    const file = flights();
    assert(file.length && file.every(row => row.recipe === 'mending'));
    reach(file[0].until);
    return dressing();
  }
  return {game,owner,peers,kit,step,wait,reach,brew,lay,dressing,flights,obstacles,place};
}

test('set one real dressing at three earned points, pay the normal throw clock, and heal only after the dwell', () => {
  const f = fight({allies:1}), ally = f.peers[0];
  f.brew('mending');
  const status = f.kit().alchemyDressing;
  assert(status?.stage === 'ready' && status.targets?.length === 1);
  const target = status.targets[0];
  assert.equal(target.x - f.owner.x,dressingRules.range);
  assert.equal(target.radius,76 * dressingRules.radiusScale);
  f.place(ally,target.x,target.y);
  ally.health = ally.maxHealth - 40;
  const health = ally.health, primary = f.owner.ammo;
  f.step({technique3:true,fire:true});
  assert.equal(f.owner.ammo,primary);
  assert.deepEqual(f.kit().alchemyPrepared,[]);
  assert.equal(f.owner.eAt - f.game.combatTick,180);
  assert.equal(f.kit().alchemyDressing?.stage,'placed');
  const [flask] = f.flights();
  assert(flask && f.dressing().length === 0 && flask.until - flask.at === 15);
  f.reach(flask.until);
  const [field] = f.dressing();
  assert(field && field.radius === target.radius && field.uses === 1 && field.until === field.at + dressingRules.lifeTicks);
  assert.equal(ally.health,health);
  f.reach(field.at + dressingRules.useTicks - 1);
  assert.equal(ally.health,health);
  f.step();
  assert.equal(ally.health,health + 18);
  assert.equal(f.owner.healing,18);
  assert.equal(f.dressing().length,0);
});

test('a healthy or downed survivor cannot start a dwell, and leaving the circle resets an injured survivor’s wait', () => {
  const f = fight({allies:2}), [ally,downed] = f.peers;
  f.brew('mending');
  const [field] = f.lay();
  f.place(ally,field.x,field.y);
  f.place(downed,field.x,field.y+10);
  downed.status = 'downed';
  downed.health = 1;
  f.reach(field.at + dressingRules.useTicks + 2);
  assert.equal(f.dressing()[0].uses,1);
  assert.equal(downed.health,1);
  ally.health = ally.maxHealth - 40;
  const health = ally.health;
  const start = f.game.combatTick;
  f.reach(start + dressingRules.useTicks - 2);
  f.place(ally,field.x,field.y+field.radius+12);
  f.step();
  f.place(ally,field.x,field.y);
  const entered = f.game.combatTick + 1;
  f.reach(entered + dressingRules.useTicks - 1);
  assert.equal(ally.health,health);
  f.step();
  assert.equal(ally.health,health + 18);
});

test('an obstructed flight loses its paid vial and a new obstruction blocks a pending patient’s dwell', () => {
  const stopped = fight();
  stopped.brew('mending');
  const wall = {x:828,y:675,width:24,height:60};
  stopped.obstacles.push(wall);
  stopped.step({technique3:true});
  assert.equal(stopped.owner.eAt,0);
  assert.deepEqual(stopped.kit().alchemyPrepared,['mending']);
  stopped.obstacles.length = 0;
  stopped.step({technique3:true});
  const [flask] = stopped.flights();
  stopped.obstacles.push(wall);
  stopped.reach(flask.until);
  assert.equal(stopped.dressing().length,0);
  assert(stopped.owner.eAt > stopped.game.combatTick);
  assert.deepEqual(stopped.kit().alchemyPrepared,[]);

  const f = fight({allies:1}), [ally] = f.peers;
  f.brew('mending');
  const [field] = f.lay();
  ally.health -= 40;
  const health = ally.health;
  f.place(ally,field.x-36,field.y);
  f.step();
  f.obstacles.push({x:field.x-22,y:field.y-14,width:5,height:28});
  f.reach(field.at + dressingRules.useTicks * 2);
  assert.equal(ally.health,health);
  assert.equal(f.dressing()[0].uses,1);
  f.obstacles.length = 0;
  f.wait(() => ally.health > health);
  assert.equal(ally.health,health + 18);
});

test('Shared Roll gives two actual half portions and won’t let one patient claim both', () => {
  const f = fight({fitting:'shared',allies:2}), [first,second] = f.peers;
  f.brew('mending');
  const [field] = f.lay();
  assert.equal(field.uses,2);
  first.health -= 40;
  const health = first.health;
  f.place(first,field.x,field.y);
  f.wait(() => first.health > health);
  assert.equal(first.health,health + 9);
  f.reach(f.game.combatTick + dressingRules.useTicks + 2);
  assert.equal(first.health,health + 9);
  assert.equal(f.dressing()[0].uses,1);
  second.health -= 30;
  const other = second.health;
  f.place(second,field.x,field.y+8);
  f.wait(() => second.health > other);
  assert.equal(second.health,other + 9);
  assert.equal(f.owner.healing,18);
  assert.deepEqual(f.dressing(),[]);
});

test('Quick Knot is smaller, waits only eight ticks, and keeps its only portion for the Alchemist', () => {
  const f = fight({fitting:'quick',allies:1}), [ally] = f.peers;
  f.brew('mending');
  const [field] = f.lay();
  assert.equal(field.radius,76 * dressingRules.quickScale);
  f.place(ally,field.x,field.y);
  ally.health -= 50;
  const allyHealth = ally.health;
  f.reach(field.at + dressingRules.useTicks + 3);
  assert.equal(ally.health,allyHealth);
  assert.equal(f.dressing()[0].uses,1);
  f.owner.health -= 40;
  const health = f.owner.health, arrives = f.game.combatTick + 1;
  f.place(f.owner,field.x,field.y);
  f.reach(arrives + dressingRules.quickTicks - 1);
  assert.equal(f.owner.health,health);
  f.step();
  assert.equal(f.owner.health,health + 18);
  assert.equal(ally.health,allyHealth);
});

test('Settled Batch potency survives placement, and split dressings share one Standard Batch charge and one actual extraction refund', () => {
  const settled = fight({transforms:['settled-batch']});
  settled.brew('mending');
  const [field] = settled.lay();
  settled.owner.health -= 60;
  const health = settled.owner.health;
  settled.place(settled.owner,field.x,field.y);
  settled.wait(() => settled.owner.health > health);
  assert(Math.abs(settled.owner.health - health - 18*1.25*settled.game.stats(settled.owner).ability) < .001);

  const f = fight({transforms:['split-pour','second-extraction'],allies:2});
  f.brew('mending');
  f.step({ultimate:true});
  const charges = f.kit().alchemyBatchCharges!;
  const cinder = f.kit().alchemyCinder!;
  const [first,second] = f.lay();
  assert(first && second && first.y !== second.y && first.empowered && second.empowered);
  assert(f.owner.eAt - first.at > 180 - 15);
  assert.equal(f.kit().alchemyBatchCharges,charges-1);
  assert.equal(f.kit().alchemyCinder,cinder);
  f.place(f.peers[0],first.x,first.y);
  f.place(f.peers[1],second.x,second.y);
  for (const patient of f.peers) patient.health -= 65;
  f.wait(() => !f.dressing().length);
  assert(f.owner.healing > 0 && f.owner.healing < 50);
  assert.equal(f.kit().alchemyCinder,cinder + 1);
});

test('Action 3 shares the issued rack and recovery without opening Throw Latch or creating a new Flash Reaction window', () => {
  const f = fight({allRoutes:true,transforms:['settled-batch']});
  f.brew('binding');
  f.brew('mending');
  f.brew('flare');
  f.step({technique2:true});
  const reserve = f.kit().alchemyReserve?.held;
  assert(reserve?.recipe === 'binding');
  assert.deepEqual(f.kit().alchemyPrepared,['mending','flare']);
  f.step({technique2:true,technique3:true});
  assert.equal(f.owner.eAt,0);
  assert.deepEqual(f.kit().alchemyPrepared,['mending','flare']);
  f.lay();
  assert.deepEqual(f.kit().alchemyReserve?.held,reserve);
  assert.deepEqual(f.kit().alchemyPrepared,['flare']);
  assert.equal(f.kit().alchemyReaction?.stage,'spent');
});

test('the placement guide is owner-private and losing the owner removes its public dressing', () => {
  const f = fight({allies:1}), [viewer] = f.peers;
  f.brew('mending');
  assert.equal(viewOf(f.game,viewer.id).players.find(row => row.id === f.owner.id)?.kit.alchemyDressing,undefined);
  assert(viewOf(f.game,f.owner.id).players.find(row => row.id === f.owner.id)?.kit.alchemyDressing?.targets?.length);
  const [field] = f.lay();
  assert(viewOf(f.game,viewer.id).classCues.some(cue => cue.id === field.id && cue.kind === 'alchemy-dressing'));
  f.game.setConnected(f.owner.id,false);
  assert(!viewOf(f.game,viewer.id).classCues.some(cue => cue.id === field.id));
  const issued = fight({unowned:true});
  issued.brew('mending');
  issued.step({technique3:true});
  assert.equal(issued.owner.eAt,0);
  assert.deepEqual(issued.kit().alchemyPrepared,['mending']);
});

test('the paid dressing stays bounded to one placement group and its unused portion expires', () => {
  const f = fight();
  f.brew('mending');
  f.brew('mending');
  const [field] = f.lay();
  const eAt = f.owner.eAt;
  f.reach(eAt);
  f.step({technique3:true});
  assert.equal(f.owner.eAt,eAt);
  assert.deepEqual(f.kit().alchemyPrepared,['mending']);
  assert.equal(f.dressing()[0].id,field.id);
  f.reach(field.until);
  assert.deepEqual(f.dressing(),[]);
  f.step({technique3:true});
  assert(f.owner.eAt > eAt);
});
