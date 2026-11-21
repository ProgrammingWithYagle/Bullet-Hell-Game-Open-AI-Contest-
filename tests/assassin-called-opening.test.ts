import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { distance, type Rect } from '../src/shared/geometry.ts';
import { idleInput, type InputFrame, type Vec } from '../src/shared/protocol.ts';
import { calledOpeningId, calledOpeningRules, duelistIds } from '../src/shared/assassin-called-opening.ts';
import { viewOf } from '../src/shared/view.ts';

const action={technique1:true};
const point=({x,y}:Vec)=>({x,y});
const aim=(from:Vec,to:Vec)=>Math.atan2(to.y-from.y,to.x-from.x);
function trial(owned=true,fitting?:'passing'|'counter'){
  const game=new Game({mode:'short',seed:41,difficulty:'normal',arenaSelection:'fixed',openingArenaId:'gatehouse',maxPlayers:2});
  if(fitting)game.encounter=1;
  const assassin=game.addPlayer('assassin','Nyx','assassin'),ally=game.addPlayer('ally','Lane','soldier');
  const buy=(item:string)=>game.transact(assassin.id,{id:item,kind:'skill',item});
  assert.equal(assassin.totalSp,fitting?9:3);
  assert(buy('assassin-precision-1').ok);
  if(owned)assert(buy(calledOpeningId).ok);
  if(fitting){
    assert(buy(duelistIds[fitting]).ok);
    assert.equal(buy(duelistIds[fitting==='passing'?'counter':'passing']).reason,'incompatibleItem');
  }
  assert(game.start());
  const arena=structuredClone(game.arena);
  arena.obstacles=[] as Rect[];arena.lavaPits=[];
  Object.defineProperty(game,'arena',{get:()=>arena});
  Object.assign(assassin,{x:500,y:500});
  Object.assign(ally,{x:520,y:760});
  Object.assign(game.boss,{x:1240,y:715,staggerUntil:5000,deadline:5000});
  const enemy=(id:number,x:number,y:number)=>game.minions.spawn(id,{kind:'ordinary',x,y,health:1000,
    speed:0,radius:10,damage:0},game.combatTick)!;
  const target=enemy(990001,660,500),next=enemy(990002,700,500);
  function tick(input:Partial<InputFrame>={}){
    if(assassin.connected)assert(game.submitInput(assassin.id,{...idleInput(),aim:assassin.aim,sequence:assassin.ack+1,clientTick:game.combatTick,...input}));
    assert(game.submitInput(ally.id,{...idleInput(),sequence:ally.ack+1,clientTick:game.combatTick}));
    game.step();
    return game.drainEvents().filter(event=>event.type==='sound').map(event=>event.id);
  }
  const status=()=>game.kitStatus(assassin.id).calledOpening;
  const focuses=()=>game.classCues().filter(cue=>cue.kind==='assassin-duel-focus');
  const cuts=()=>game.classCues().filter(cue=>cue.kind==='assassin-duel-strike');
  function getOpen(side=1){
    for(let i=0;i<18&&status()?.phase!=='open';i++)tick({moveY:side});
    assert.equal(status()?.phase,'open');
  }
  return {game,assassin,ally,arena,target,next,tick,status,focuses,cuts,getOpen};
}

test('Called Opening spends E only after real footwork and manually strikes exactly the marked target',()=>{
  const f=trial(),base=trial(false);
  f.tick({...action,moveY:1});base.tick({moveY:1});
  assert.deepEqual(f.focuses(),[]);
  const focus=f.tick({...action,aim:aim(f.assassin,f.target)});base.tick(action);
  assert(focus.includes('assassin-duel-focus'));
  assert.equal(f.assassin.eAt,0);
  assert.equal(base.status(),undefined);
  assert.deepEqual(base.focuses(),[]);
  const cue=f.focuses()[0]!;
  assert.equal(cue.until-cue.at,calledOpeningRules.prepare);
  assert.deepEqual(point(cue),point(f.target));
  const paidEarly=f.tick({...action,aim:0});
  assert(!paidEarly.includes('assassin-duel-hit'));
  assert.equal(f.assassin.eAt,0);
  f.getOpen();
  const before=point(f.assassin), invulnerable=f.assassin.invulnerableUntil;
  const missed=f.tick({...action,aim:Math.PI});
  assert(!missed.includes('assassin-duel-hit'));
  assert.equal(f.assassin.eAt,0);
  while(base.game.combatTick<f.game.combatTick)base.tick();
  base.tick({e:true,aim:.2});
  const attack=f.tick({...action,aim:aim(f.assassin,f.target)});
  assert(attack.includes('assassin-duel-hit'));
  assert.equal(f.assassin.eAt,base.assassin.eAt);
  assert.deepEqual(point(f.assassin),before);
  assert.equal(f.assassin.invulnerableUntil,invulnerable);
  assert.equal(f.target.health,1000-calledOpeningRules.hit);
  assert.equal(f.next.health,1000);
  const stroke=f.cuts()[0]!;
  assert(stroke.landed&&stroke.id===cue.id&&stroke.toX===f.target.x&&stroke.toY===f.target.y);
});

test('Walking straight, target motion and backtracking fail to manufacture a measured opening',()=>{
  const f=trial();
  f.tick({...action,aim:0});
  for(let i=0;i<4;i++)f.tick({moveX:1});
  assert.equal(f.status()?.progress,0);
  for(let i=0;i<5;i++)f.tick({moveY:1});
  const progress=f.status()!.progress!;
  assert(progress>0&&progress<1);
  f.target.y+=33;
  f.tick();
  assert.equal(f.status()?.progress,progress);
  for(let i=0;i<4;i++)f.tick({moveY:-1});
  assert(f.status()!.progress!<progress);
  f.tick({...action,aim:aim(f.assassin,f.target)});
  assert.equal(f.assassin.eAt,0);
  assert.equal(f.target.health,1000);
});

test('New masonry and target loss close the paid opening opportunity without retargeting or spending',()=>{
  const f=trial();
  f.tick({...action,aim:0});
  f.getOpen();
  const wall={x:573,y:440,width:15,height:180};
  f.arena.obstacles.push(wall);
  const denied=f.tick({...action,aim:aim(f.assassin,f.target)});
  assert(denied.includes('assassin-duel-lost'));
  assert.equal(f.assassin.eAt,0);
  assert.deepEqual(f.focuses(),[]);
  assert.equal(f.next.health,1000);

  const g=trial();
  g.tick({...action,aim:0});
  g.getOpen();
  g.game.minions.actors.delete(g.target.id);
  const lost=g.tick({...action,aim:aim(g.assassin,g.next)});
  assert(lost.includes('assassin-duel-lost'));
  assert.equal(g.next.health,1000);
  assert.equal(g.assassin.eAt,0);
});

test('An ordinary Shadow Step wins a simultaneous Duelist input and Passage keeps its original free steps',()=>{
  const f=trial(),reference=trial(false);
  f.tick({...action,aim:0});reference.tick();
  const before=f.assassin.x;
  const original=f.tick({...action,e:true,aim:0});
  reference.tick({e:true,aim:0});
  assert(original.includes('assassin-duel-lost')&&!original.includes('assassin-duel-hit'));
  assert(f.assassin.x>before);
  assert.deepEqual(point(f.assassin),point(reference.assassin));
  assert.equal(f.assassin.eAt,reference.assassin.eAt);
  assert.equal(f.assassin.invulnerableUntil,reference.assassin.invulnerableUntil);
  assert.equal(f.target.health,reference.target.health);

  const passage=trial();
  passage.tick({...action,ultimate:true});
  assert.deepEqual(passage.focuses(),[]);
  const long=passage.assassin.ultimateAt;
  passage.tick({e:true,aim:0});
  assert.equal(passage.assassin.eAt,0);
  assert.equal(passage.assassin.ultimateAt,long);
  assert.equal(passage.game.kitStatus(passage.assassin.id).stepCharges,2);
});

test('A normal hostile shot can injure the Assassin during the focus and the focus is private state',()=>{
  const f=trial();
  while(f.game.combatTick<f.assassin.invulnerableUntil)f.tick();
  f.tick({...action,aim:0});
  const before=f.assassin.health;
  assert(f.game['emitShot']('hostile',f.assassin.x-4,f.assassin.y,0,30,14,4,0,1));
  f.tick();
  assert(f.assassin.health<before);
  assert.equal(f.status()?.phase,'measuring');
  const actual=viewOf(f.game,f.assassin.id),party=viewOf(f.game,f.ally.id);
  assert.deepEqual(actual.classCues,party.classCues);
  assert.equal(party.players.find(row=>row.id===f.assassin.id)?.kit.calledOpening,undefined);
  assert.equal(actual.players.find(row=>row.id===f.assassin.id)?.kit.calledOpening?.phase,'measuring');
  f.game.setConnected(f.assassin.id,false);
  assert.deepEqual(f.focuses(),[]);
  assert(distance(f.assassin,{x:500,y:500})<.01);
});

test('Passing Cut pays after a real walking stride on the earned side and refuses the other direction',()=>{
  const f=trial(true,'passing');
  f.tick({...action,aim:0});
  f.getOpen();
  assert(f.status()?.canPass);
  f.tick({...action,moveY:-1,aim:aim(f.assassin,f.target)});
  assert.equal(f.assassin.eAt,0);
  f.getOpen();
  const body=point(f.assassin), invulnerable=f.assassin.invulnerableUntil;
  const notes=f.tick({...action,moveY:1,aim:aim(f.assassin,f.target)});
  assert(notes.includes('assassin-duel-pass')&&notes.includes('assassin-duel-hit'));
  assert(f.cuts()[0]?.passing);
  assert(f.assassin.eAt>f.game.combatTick&&f.assassin.y>body.y);
  assert(distance(body,f.assassin)<=f.game.movementSpeed(f.assassin)/30+.01);
  assert.equal(f.assassin.invulnerableUntil,invulnerable);
  assert.equal(f.target.health,1000-calledOpeningRules.hit);
  assert.equal(f.next.health,1000);
});

test('Counterturn trades an earned opening for a genuine reverse measure on the same deadline',()=>{
  const f=trial(true,'counter');
  f.tick({...action,aim:0});
  f.getOpen();
  const open=point(f.assassin), first=f.focuses()[0]!;
  assert(f.status()?.canCounter);
  const turned=f.tick({...action,moveY:-1,aim:aim(f.assassin,f.target)});
  assert(turned.includes('assassin-duel-turn')&&!turned.includes('assassin-duel-hit'));
  assert(f.focuses()[0]?.countering&&f.focuses()[0]?.id===first.id);
  assert.equal(f.status()?.phase,'reposition');
  assert.equal(f.status()?.until,first.until);
  const reverseProgress=f.status()!.progress!;
  f.tick({moveY:1,aim:aim(f.assassin,f.target)});
  assert(f.status()!.progress!<reverseProgress);
  f.getOpen(-1);
  assert(f.assassin.y<open.y-calledOpeningRules.counterMeasure+2);
  assert.equal(f.assassin.eAt,0);
  const ready=point(f.assassin);
  const release=f.tick({...action,aim:aim(f.assassin,f.target)});
  assert(release.includes('assassin-duel-hit')&&!release.includes('assassin-duel-pass'));
  assert(f.cuts()[0]?.turned&&!f.cuts()[0]?.passing);
  assert.deepEqual(point(f.assassin),ready);
  assert.equal(f.target.health,1000-calledOpeningRules.hit);
  assert.equal(f.next.health,1000);
});
