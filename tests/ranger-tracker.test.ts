import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { rangerTrackerIds, trackerRules, type TrackerFitting } from '../src/shared/ranger-tracker.ts';
import { viewOf } from '../src/shared/view.ts';

function fixture(fitting?: TrackerFitting) {
  const game = new Game({ mode:fitting ? 'raid' : 'short', difficulty:'normal', seed:41,
    openingArenaId:'gatehouse', arenaSelection:'fixed', maxPlayers:2 });
  const ranger = game.addPlayer('nela','Nela','ranger');
  const other = game.addPlayer('peer','Rue','ranger');
  let purchase = 0;
  function buy(item: string) {
    return game.transact(ranger.id,{ id:'tracker-' + ++purchase,kind:'skill',item });
  }
  assert(!buy(rangerTrackerIds.entry).ok);
  assert(buy('ranger-trailkeeping-1').ok);
  assert(buy(rangerTrackerIds.entry).ok);
  if (fitting) {
    assert(buy(rangerTrackerIds[fitting]).ok);
    assert.equal(buy(rangerTrackerIds[fitting === 'stakes' ? 'backtrack' : 'stakes']).reason,'incompatibleItem');
  } else {
    assert.equal(ranger.totalSp,3);
    assert(!buy(rangerTrackerIds.stakes).ok && !buy(rangerTrackerIds.backtrack).ok);
  }
  assert(game.start());
  const arena = { ...game.arena, obstacles:[] as typeof game.arena.obstacles, lavaPits:[] };
  Object.defineProperty(game,'arena',{get:()=>arena});
  Object.assign(game.boss,{x:1350,y:766,health:100000,maxHealth:100000,staggerUntil:9999,deadline:12000});
  Object.assign(ranger,{x:490,y:500,oldX:490,oldY:500});
  Object.assign(other,{x:410,y:750,oldX:410,oldY:750});
  const target = game.minions.spawn(978231,{kind:'ordinary',x:635,y:500,health:700,speed:0,radius:16,damage:1},game.combatTick)!;
  function step(input: Partial<InputFrame> = {}) {
    const aim = Math.atan2(target.y-ranger.y,target.x-ranger.x);
    assert(game.submitInput(ranger.id,{...idleInput(),sequence:ranger.ack+1,clientTick:game.combatTick,aim,...input}));
    game.step();
    return game.drainEvents();
  }
  const kit = () => game.kitStatus(ranger.id).rangerTracker!;
  function wait(condition: () => boolean,input: Partial<InputFrame> = {},max=80) {
    for (let i=0;i<max && !condition();i++) step(input);
    assert(condition(),'Tracker wait reached its limit at ' + kit().stage);
  }
  function arrow() {
    const health = target.health;
    step({fire:true});
    wait(()=>target.health < health);
  }
  return {game,ranger,other,target,arena,kit,step,wait,arrow};
}

test('Short buys at three earned points and a real lateral hit recovers one paid arrow',()=>{
  const f=fixture();
  const capacity=f.game.kitStatus(f.ranger.id).rangerQuiverCapacity!;
  assert.equal(f.kit().stage,'find');
  f.step({technique2:true});
  assert.equal(f.kit().stage,'find');
  f.arrow();
  assert.equal(f.ranger.ammo,capacity-1);
  assert.equal(f.kit().stage,'ready');
  assert.deepEqual(f.kit().footprints.map(({x,y})=>({x,y})),[{x:f.target.x,y:f.target.y}]);
  f.step({technique2:true});
  assert.equal(f.kit().stage,'flank');
  assert.equal(f.kit().until - f.game.combatTick,trackerRules.duration);
  const local=viewOf(f.game,f.ranger.id).players.find(p=>p.id===f.ranger.id)!;
  const remote=viewOf(f.game,f.other.id).players.find(p=>p.id===f.ranger.id)!;
  assert.equal(local.kit.rangerTracker?.stage,'flank');
  assert.equal(remote.kit.rangerTracker,undefined);
  f.wait(()=>f.kit().stage==='follow',{moveY:1});
  f.arrow();
  assert.equal(f.kit().stage,'recovering');
  assert.equal(f.ranger.ammo,capacity-1);
});

test('issued Drawn Line damage never creates a Tracker opening',()=>{
  const f=fixture();
  const health=f.target.health;
  f.step({q:true});
  f.wait(()=>f.target.health < health);
  assert.equal(f.kit().stage,'find');
});

test('masonry stops live sightings and an old arrow contact stays fixed',()=>{
  const f=fixture();
  f.arrow();
  const last=f.kit().footprints;
  f.arena.obstacles.push({x:566,y:420,width:34,height:210});
  Object.assign(f.target,{x:659,y:529,oldX:659,oldY:529});
  f.step({technique2:true});
  assert.equal(f.kit().stage,'flank');
  for (let i=0;i<28;i++) f.step();
  assert.deepEqual(f.kit().footprints,last);
  assert(f.target.x!==last[0].x && f.target.y!==last[0].y);
});

test('Trail Stakes recovers one arrow only when the real newly placed Tripline hits',()=>{
  const f=fixture('stakes');
  f.arrow();
  const ammo=f.ranger.ammo;
  f.step({technique2:true});
  f.step({e:true});
  const trap=f.game.classCues().find(c=>c.kind==='ranger-trap'&&c.owner===f.ranger.id)!;
  assert(trap.kind==='ranger-trap');
  assert.equal(f.kit().stage,'flank');
  assert.equal(f.ranger.ammo,ammo);
  const health=f.target.health;
  f.wait(()=>f.kit().stage==='recovering');
  assert(f.target.health < health);
  assert.equal(f.ranger.ammo,ammo+1);
});

test('Backtrack accepts an ordinary arrow from a real return to the original firing point',()=>{
  const f=fixture('backtrack');
  f.arrow();
  const ammo=f.ranger.ammo;
  f.step({technique2:true});
  assert.equal(f.kit().stage,'leave');
  f.wait(()=>f.kit().stage==='return',{moveY:1});
  f.wait(()=>f.kit().stage==='follow',{moveY:-1});
  f.arrow();
  assert.equal(f.kit().stage,'recovering');
  assert.equal(f.ranger.ammo,ammo);
});
