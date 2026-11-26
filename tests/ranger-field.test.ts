import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { fieldRules, rangerFieldIds, type FieldFitting } from '../src/shared/ranger-field.ts';
import type { RangerCue } from '../src/shared/ranger-kit.ts';
import { rangerTrackerIds } from '../src/shared/ranger-tracker.ts';
import { viewOf } from '../src/shared/view.ts';

function fixture(fitting?:FieldFitting,linked=false,tracker=false) {
  const game=new Game({mode:linked?'endless':fitting?'raid':'short',difficulty:'normal',seed:41,
    openingArenaId:'gatehouse',arenaSelection:'fixed',maxPlayers:2});
  if (linked) game.encounter=9;
  const ranger=game.addPlayer('nela','Nela','ranger');
  const other=game.addPlayer('peer','Rue','ranger');
  let transaction=0;
  function buy(item:string) {
    return game.transact(ranger.id,{kind:'skill',item,id:'field-' + ++transaction});
  }
  assert(!buy(rangerFieldIds.entry).ok);
  assert(buy('ranger-fieldcraft-1').ok);
  assert(buy(rangerFieldIds.entry).ok);
  if (fitting) {
    assert(buy(rangerFieldIds[fitting]).ok);
    assert.equal(buy(rangerFieldIds[fitting==='pivot'?'short':'pivot']).reason,'incompatibleItem');
  } else if (!linked) {
    assert.equal(ranger.totalSp,3);
    assert(!buy(rangerFieldIds.pivot).ok && !buy(rangerFieldIds.short).ok);
  }
  if (linked) {
    const path:string[]=[];
    for (let item=data.skills.find(s=>s.classId==='ranger'&&s.transform==='linked-stakes');item;
      item=data.skills.find(s=>s.id===item!.prerequisite)) path.unshift(item.id);
    for (const item of path) if (!ranger.skills.includes(item)) assert(buy(item).ok,item);
  }
  if (tracker) {
    for (const item of ['ranger-trailkeeping-1',rangerTrackerIds.entry,rangerTrackerIds.stakes]) assert(buy(item).ok,item);
  }
  assert(game.start());
  const arena={...game.arena,obstacles:[] as typeof game.arena.obstacles,lavaPits:[]};
  Object.defineProperty(game,'arena',{get:()=>arena});
  Object.assign(game.boss,{x:1350,y:766,health:100000,maxHealth:100000,staggerUntil:9999,deadline:12000});
  Object.assign(ranger,{x:490,y:500,oldX:490,oldY:500});
  Object.assign(other,{x:410,y:750,oldX:410,oldY:750});
  function step(input:Partial<InputFrame>={}) {
    assert(game.submitInput(ranger.id,{...idleInput(),sequence:ranger.ack+1,clientTick:game.combatTick,aim:0,...input}));
    game.step();
    return game.drainEvents();
  }
  const kit=()=>game.kitStatus(ranger.id);
  const state=()=>kit().rangerField!;
  const cue=()=>game.classCues().find((row):row is RangerCue & {kind:'ranger-trap'}=>row.kind==='ranger-trap' && row.owner===ranger.id);
  function wait(check:()=>boolean,input:Partial<InputFrame>={},ticks=80) {
    for (let i=0;i<ticks && !check();i++) step(input);
    assert(check(),'Field Controller wait reached its limit at ' + state().stage);
  }
  let enemyId=91230;
  const enemy=(x:number,y:number)=>game.minions.spawn(++enemyId,{kind:'ordinary',x,y,health:700,speed:0,radius:16,damage:1},game.combatTick)!;
  return {game,ranger,other,arena,kit,state,cue,step,wait,enemy};
}

test('Re-stake buys at three points and moves the same paid cable through ordinary combat',()=>{
  const f=fixture();
  const before=f.enemy(635,500);
  const arrows=f.ranger.ammo, speed=f.game.movementSpeed(f.ranger);
  assert.equal(f.state().stage,'find');
  f.step({e:true});
  const original=f.cue()!;
  assert(original.kind==='ranger-trap' && !original.active);
  f.step({technique3:true});
  assert(!f.cue());
  assert.equal(f.kit().rangerTraps,1);
  assert.equal(f.ranger.ammo,arrows-1);
  assert.equal(f.game.movementSpeed(f.ranger),speed*fieldRules.movement);
  const local=viewOf(f.game,f.ranger.id).players.find(actor=>actor.id===f.ranger.id)!;
  const remote=viewOf(f.game,f.other.id).players.find(actor=>actor.id===f.ranger.id)!;
  assert(local.kit.rangerField?.until);
  assert.equal(remote.kit.rangerField,undefined);
  f.wait(()=>f.game.combatTick>original.at,{fire:true});
  assert.equal(before.health,700);
  assert.equal(f.game.shots.size,0);
  f.wait(()=>f.ranger.y>=599,{moveY:1});
  const events=f.step({technique3:true});
  assert(events.some(event=>event.type==='sound' && event.id==='ranger-cable-set'));
  const moved=f.cue()!;
  assert(moved.kind==='ranger-trap');
  assert.equal(moved.id,original.id);
  assert.equal(moved.until,original.until);
  assert.equal(moved.remaining,original.remaining);
  assert.equal(moved.at-f.game.combatTick,24);
  assert(moved.y>=599 && moved.y2>=599);
  assert.equal(f.ranger.ammo,arrows-1);
  assert.equal(f.game.movementSpeed(f.ranger),speed);
  const after=f.enemy((moved.x+moved.x2)/2,moved.y);
  f.wait(()=>after.health<700);
  assert.equal(before.health,700);
  assert.equal(f.cue(),undefined);
});

test('Pivot Stake holds a real original endpoint and waits for a legal new path',()=>{
  const f=fixture('pivot');
  f.step({e:true});
  const original=f.cue()!;
  assert(original.kind==='ranger-trap');
  f.step({technique3:true});
  assert.equal(f.state().stage,'carrying');
  assert.deepEqual(f.state().anchor,{x:original.x,y:original.y});
  f.wait(()=>f.ranger.y>=573,{moveY:1});
  f.arena.obstacles.push({x:492,y:529,width:44,height:12});
  f.step({technique3:true});
  assert(!f.cue());
  assert.equal(f.state().stage,'carrying');
  f.arena.obstacles.length=0;
  f.step();
  const point={x:f.ranger.x,y:f.ranger.y};
  f.step({technique3:true});
  const moved=f.cue()!;
  assert(moved.kind==='ranger-trap');
  assert.equal(moved.id,original.id);
  assert.deepEqual({x:moved.x,y:moved.y},{x:original.x,y:original.y});
  assert(Math.hypot(moved.x2-point.x,moved.y2-point.y)<3);
});

test('Short Lash arms sooner while giving up coverage',()=>{
  const f=fixture('short');
  f.step({e:true});
  const original=f.cue()!;
  assert(original.kind==='ranger-trap');
  f.step({technique3:true});f.step();f.step({technique3:true});
  const moved=f.cue()!;
  assert(moved.kind==='ranger-trap');
  assert.equal(moved.id,original.id);
  assert.equal(moved.at-f.game.combatTick,fieldRules.shortArm);
  assert.equal(moved.until,original.until);
  assert(Math.hypot(moved.x2-moved.x,moved.y2-moved.y)<Math.hypot(original.x2-original.x,original.y2-original.y));
});

test('Linked Stakes retains the charges and targets from an actual prior Tripline hit',()=>{
  const f=fixture(undefined,true);
  const oldTarget=f.enemy(635,500);
  f.step({e:true});
  const original=f.cue()!;
  assert(original.kind==='ranger-trap' && original.remaining===3);
  f.wait(()=>oldTarget.health<700);
  const damaged=oldTarget.health;
  assert(f.cue()?.kind==='ranger-trap' && f.cue()!.remaining===2);
  f.step({technique3:true});f.step();f.step({technique3:true});
  const moved=f.cue()!;
  assert(moved.kind==='ranger-trap' && moved.id===original.id && moved.remaining===2);
  f.wait(()=>f.game.combatTick>moved.at+5);
  assert.equal(oldTarget.health,damaged);
  const newTarget=f.enemy(619,500);
  f.wait(()=>newTarget.health<700);
  assert.equal(f.cue()?.remaining,1);
  assert.equal(oldTarget.health,damaged);
});

test('a real dodge interrupts the paid lift and releases its original slot',()=>{
  const f=fixture();
  const arrows=f.ranger.ammo;
  f.step({e:true});f.step({technique3:true});
  assert.equal(f.kit().rangerTraps,1);
  f.step({moveY:1,dodge:true});
  assert(!f.state().until);
  assert.equal(f.kit().rangerTraps,0);
  assert.equal(f.ranger.ammo,arrows-1);
  assert(!f.cue());
});

test('re-staking an earlier cable keeps its original placement for Trail Stakes',()=>{
  const f=fixture('short',false,true);
  const target=f.enemy(570,500);
  f.step({e:true});
  const original=f.cue()!;
  f.step({fire:true});
  f.wait(()=>f.kit().rangerTracker?.stage==='ready');
  f.step({technique2:true});
  assert.equal(f.kit().rangerTracker?.stage,'flank');
  f.step({technique3:true});f.step();f.step({technique3:true});
  const moved=f.cue()!;
  assert.equal(moved.id,original.id);
  const health=target.health, ammo=f.ranger.ammo;
  f.wait(()=>target.health<health);
  assert.equal(f.ranger.ammo,ammo);
  assert.equal(f.kit().rangerTracker?.stage,'flank');
});
