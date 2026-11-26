import assert from 'node:assert/strict';
import { test } from 'node:test';
import { misdirectionIds, misdirectionRules, type MisdirectionCue } from '../src/shared/bard-misdirection.ts';
import { Game } from '../src/shared/game.ts';
import { distance } from '../src/shared/geometry.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

const R=misdirectionRules;
const action={technique3:true};
const origin={x:500,y:500};

function setup(fitting?:'wrong'|'second') {
  const game=new Game({mode:'endless',seed:41,difficulty:'normal',arenaSelection:'fixed',openingArenaId:'gatehouse',maxPlayers:2});
  if(fitting)game.encounter=9;
  const bard=game.addPlayer('bard','Iven','bard'), ally=game.addPlayer('ally','Lane','soldier');
  const buy=(item:string)=>game.transact(bard.id,{id:item,item,kind:'skill'});
  assert(buy('bard-company-1').ok&&buy(misdirectionIds.entry).ok);
  if(fitting){
    assert(buy(misdirectionIds[fitting]).ok);
    assert.equal(buy(misdirectionIds[fitting==='wrong'?'second':'wrong']).reason,'incompatibleItem');
  }
  assert(game.start());
  const arena=structuredClone(game.arena);
  arena.obstacles=[];
  arena.lavaPits=[];
  Object.defineProperty(game,'arena',{get:()=>arena});
  Object.assign(bard,origin);
  Object.assign(ally,{x:1150,y:650});
  Object.assign(game.boss,{x:1320,y:720,staggerUntil:9000,deadline:9000});
  function spawn(id:number,x:number,y:number,speed=85,kind:'ordinary'|'rat'='ordinary',goalX?:number,goalY?:number){
    const actor=game.minions.spawn(id,{kind,x,y,health:1600,speed,radius:14,damage:12,goalX,goalY},game.combatTick);
    assert(actor);
    return actor;
  }
  const noteTarget=spawn(990001,785,500,0);
  const history:string[]=[];
  function tick(input:Partial<InputFrame>={}){
    if(bard.connected)assert(game.submitInput(bard.id,{...idleInput(),aim:0,sequence:bard.ack+1,clientTick:game.combatTick,...input}));
    game.step();
    const notes=game.drainEvents().flatMap(e=>e.type==='sound'&&e.owner===bard.id?[e.id]:[]);
    history.push(...notes);
    return notes;
  }
  const meter=()=>game.kitStatus(bard.id).cadence??0;
  const status=()=>game.kitStatus(bard.id).misdirecting;
  const cue=()=>game.classCues().find((cue):cue is MisdirectionCue=>cue.kind==='bard-false-entrance');
  const ended=(event:string)=>history.filter(id=>id==='bard-entrance-'+event).length;
  function earn(){
    for(let i=0;i<90&&meter()<R.cadence;i++)tick({fire:true});
    assert(meter()>=R.cadence);
    for(let i=0;i<17;i++)tick();
  }
  function walkUntilArmed(){
    for(let i=0;i<20&&!cue()?.armed;i++)tick({moveX:-1,fire:true});
    assert(cue()?.armed&&distance(bard,origin)>=R.walked);
  }
  return {game,bard,ally,arena,noteTarget,spawn,tick,meter,status,cue,ended,earn,walkUntilArmed};
}

test('False Entrance needs owned primary cadence and ordinary walking, then diverts a real pursuer on the live map',()=>{
  const f=setup();
  assert(!f.tick(action).includes('bard-entrance-set'));
  f.earn();
  const e=f.bard.eAt,u=f.bard.ultimateAt,cadence=f.meter();
  assert(f.tick(action).includes('bard-entrance-set'));
  const original=f.cue()!;
  assert.deepEqual([f.bard.eAt,f.bard.ultimateAt,f.meter()],[e,u,cadence-R.cadence]);
  assert.equal(original.until-original.at,R.cueDuration);
  const target=f.spawn(990002,751,560);
  for(let i=0;i<5;i++)f.tick();
  assert.equal(f.status()?.target,undefined);
  assert(!f.cue()?.armed);
  f.walkUntilArmed();
  for(let i=0;i<8&&f.status()?.target===undefined;i++)f.tick();
  assert.equal(f.status()?.target,target.id);
  assert(f.ended('take')===1);
  const before=distance(target,original), first={x:target.x,y:target.y};
  f.tick();
  assert(distance(target,original)<before);
  assert(distance(target,first)>0);
  assert.equal(f.cue()?.id,original.id);
  assert.equal(f.cue()?.until,original.until);
});

test('Dashes give no walking proof and masonry can cancel a paid cue without returning cadence',()=>{
  const f=setup();
  f.earn();
  const before=f.meter();
  f.arena.obstacles.push({x:550,y:433,width:30,height:134});
  f.tick(action);
  assert.equal(f.meter(),before);
  assert.equal(f.cue(),undefined);
  f.arena.obstacles.length=0;
  f.tick(action);
  const original=f.cue()!;
  f.tick({moveY:-1,dodge:true});
  for(let i=0;i<16;i++)f.tick();
  assert.equal(f.status()?.walked,0);
  assert(!f.cue()?.armed);
  f.arena.obstacles.push({x:639,y:473,width:35,height:51});
  f.tick();
  assert.equal(f.cue(),undefined);
  assert(f.status()!.until!>f.game.combatTick&&f.status()!.until!>original.until);
});

test('Rats, directed objectives and a pursuer whose normal target is a teammate keep their original aims',()=>{
  const f=setup();
  f.earn(); f.tick(action);
  f.spawn(990002,730,530,56,'rat');
  const directed=f.spawn(990003,735,564,60,'ordinary',900,564);
  Object.assign(f.ally,{x:752,y:568});
  f.spawn(990004,780,564,60);
  f.walkUntilArmed();
  for(let i=0;i<15;i++)f.tick();
  assert.equal(f.ended('take'),0);
  assert.equal(f.status()?.target,undefined);
  assert(directed.x>735);
  assert.equal(directed.goalX,900);
});

test('A diverted pursuer keeps its ordinary physical contact and damage',()=>{
  const f=setup();
  f.earn();
  while(f.game.combatTick<f.ally.invulnerableUntil)f.tick();
  f.tick(action);
  const actor=f.spawn(990002,741,557,88);
  f.walkUntilArmed();
  for(let i=0;i<15&&f.status()?.target!==actor.id;i++)f.tick();
  assert.equal(f.status()?.target,actor.id);
  const reserve=f.ally.health+f.ally.shield;
  Object.assign(f.ally,{x:actor.x,y:actor.y});
  f.tick();
  assert(actor.attackAt>f.game.combatTick);
  assert(f.ally.health+f.ally.shield<reserve,JSON.stringify({reserve,health:f.ally.health,shield:f.ally.shield,
    status:f.ally.status,player:{x:f.ally.x,y:f.ally.y},actor:{x:actor.x,y:actor.y,damage:actor.damage},
    now:f.game.combatTick,protectedUntil:f.ally.invulnerableUntil}));
});

test('Wrong Door spends one fresh note to turn the same live pursuer and deadline',()=>{
  const f=setup('wrong');
  f.earn(); f.tick(action);
  const original=f.cue()!;
  const target=f.spawn(990002,752,562,73);
  f.walkUntilArmed();
  for(let i=0;i<24&&!(f.meter()>=1&&f.status()?.target===target.id);i++)f.tick({fire:true});
  assert.equal(f.status()?.target,target.id);
  const before=f.meter();
  assert(before>=1);
  assert(f.tick({...action,aim:.45}).includes('bard-entrance-turn'));
  const turned=f.cue()!;
  assert.deepEqual([turned.id,turned.target,turned.until],[original.id,target.id,original.until]);
  assert(turned.moved&&distance(turned,original)>=R.turnMinimum);
  assert.equal(f.meter(),before-1);
  const toward=distance(target,turned);
  f.tick({aim:.45});
  assert(distance(target,turned)<toward);
  assert.equal(f.ended('turn'),1);
});

test('Second Entrance waits for a real arrival, then uses one fresh cadence for a different pursuer',()=>{
  const f=setup('second');
  f.earn(); f.tick(action);
  const original=f.cue()!;
  const first=f.spawn(990002,739,554,118);
  f.walkUntilArmed();
  for(let i=0;i<42&&f.status()?.phase!=='second';i++)f.tick({fire:true});
  assert(f.ended('arrive')===1&&distance(first,original)<=first.radius+R.arrive+5);
  assert(f.status()?.phase==='second'&&f.meter()>=1);
  const before=f.meter(), next=f.spawn(990003,700,578,95);
  assert(f.tick(action).includes('bard-entrance-second'));
  assert.deepEqual([f.cue()!.id,f.cue()!.until,f.meter()],[original.id,original.until,before-1]);
  assert.equal(f.status()?.target,next.id);
  assert(f.cue()?.repeats);
  assert.equal(f.ended('take'),2);
});

test('Teammates see the shared floor cue and disconnect removes it without touching the issued kit',()=>{
  const f=setup();
  f.earn(); f.tick(action);
  const seen=viewOf(f.game,f.ally.id);
  assert(seen.classCues.some(cue=>cue.kind==='bard-false-entrance'));
  const remote=seen.players.find(row=>row.id===f.bard.id)!;
  assert.equal(remote.kit.misdirecting,undefined);
  assert.equal(f.bard.ultimateAt,0);
  f.game.setConnected(f.bard.id,false);
  assert.equal(f.cue(),undefined);
});
