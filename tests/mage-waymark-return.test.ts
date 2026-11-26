import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { distance, segmentRect, type Rect } from '../src/shared/geometry.ts';
import { HZ, idleInput, type InputFrame, type Vec } from '../src/shared/protocol.ts';
import { mageBindingIds } from '../src/shared/mage-pivot-sigil.ts';
import { mageSpatialIds, waymarkReturnId, waymarkRules } from '../src/shared/mage-waymark-return.ts';
import { viewOf } from '../src/shared/view.ts';

const action = { technique2:true };
const point = ({x,y}:Vec) => ({x,y});
const close = (a:Vec,b:Vec) => assert(distance(a,b)<1e-4,JSON.stringify({a,b}));
function exercise(owned=true, obstacles:Rect[]=[], fitting?: 'hold' | 'side', binding=false) {
  const game = new Game({ mode:'short',seed:41,difficulty:'normal',arenaSelection:'fixed',openingArenaId:'gatehouse',maxPlayers:2 });
  if(fitting)game.encounter=1;
  const mage=game.addPlayer('mage','Sable','mage'), ally=game.addPlayer('ally','Mara','soldier');
  assert.equal(mage.totalSp,fitting?9:3);
  const buy=(item:string)=>game.transact(mage.id,{ id:item,kind:'skill',item });
  assert(buy('mage-warding-1').ok);
  if(owned)assert(buy(waymarkReturnId).ok);
  if(fitting){
    assert(buy(mageSpatialIds[fitting]).ok);
    assert.equal(buy(mageSpatialIds[fitting==='hold'?'side':'hold']).reason,'incompatibleItem');
  }
  if(binding){
    assert(buy('mage-control-1').ok);
    assert(buy(mageBindingIds.entry).ok);
  }
  assert(game.start());
  const arena=structuredClone(game.arena);
  arena.obstacles=obstacles;
  arena.lavaPits=[];
  Object.defineProperty(game,'arena',{ get:()=>arena });
  Object.assign(mage,{ x:500,y:500 });
  Object.assign(ally,{ x:540,y:680 });
  Object.assign(game.boss,{ x:1300,y:720,staggerUntil:1000,deadline:1000 });
  const status=()=>game.kitStatus(mage.id).waymark;
  const physical=()=>game.classCues().filter(cue=>cue.kind==='mage-waymark');
  function tick(input:Partial<InputFrame>={}) {
    if(mage.connected)assert(game.submitInput(mage.id,{ ...idleInput(),aim:mage.aim,sequence:mage.ack+1,clientTick:game.combatTick,...input }));
    assert(game.submitInput(ally.id,{ ...idleInput(),sequence:ally.ack+1,clientTick:game.combatTick }));
    game.step();
    return game.drainEvents();
  }
  function walk(to:Vec) {
    for(let i=0;i<40 && distance(mage,to)>1e-5;i++) {
      const scale=Math.max(distance(mage,to),game.movementSpeed(mage)/HZ);
      tick({ moveX:(to.x-mage.x)/scale,moveY:(to.y-mage.y)/scale });
    }
    close(mage,to);
  }
  function withinReturn(condition:()=>boolean) {
    for(let i=0;i<waymarkRules.returnTicks&&!condition();i++)tick();
    assert(condition());
  }
  return { game,mage,ally,arena,tick,walk,status,physical,withinReturn };
}

test('Waymark Return pays the issued E clock after an actual bent walk and respects the obstructed chord',()=>{
  const wall={ x:536,y:475,width:39,height:49 }, f=exercise(true,[wall]), issued=exercise(false);
  const origin=point(f.mage);
  f.tick(action);
  assert.equal(f.mage.eAt,0);
  const anchor=f.physical()[0];
  assert(anchor && !anchor.returning);
  close(anchor,origin);
  assert.equal(viewOf(f.game,f.ally.id).players.find(p=>p.id===f.mage.id)?.kit.waymark,undefined);
  assert(viewOf(f.game,f.ally.id).classCues.some(cue=>cue.kind==='mage-waymark'));
  f.walk({x:500,y:445}); f.walk({x:600,y:445}); f.walk({x:600,y:500}); f.tick();
  assert.equal(f.status()?.phase,'marked');
  assert(f.status()!.ready && Math.abs(f.status()!.walked!-210)<1e-4);
  assert(segmentRect(f.mage,origin,wall,0));
  while(issued.game.combatTick<f.game.combatTick)issued.tick();
  const paid=f.tick(action), entry=f.physical()[0], invulnerable=f.mage.invulnerableUntil;
  issued.tick({ e:true });
  assert.equal(f.mage.eAt,issued.mage.eAt);
  assert.equal(f.physical()[0].id,anchor.id);
  assert(entry.returning && entry.until-entry.at===waymarkRules.returnTicks);
  assert(paid.some(event=>event.type==='sound'&&event.id==='mage-waymark-return'));
  let passedNorth=false, arrival=false;
  const recovery=f.mage.eAt;
  while(f.physical().length){
    const previous=point(f.mage);
    const events=f.tick();
    assert(distance(previous,f.mage)<=waymarkRules.returnStride+1e-4);
    assert(!segmentRect(previous,f.mage,wall,0));
    if(f.mage.y<455)passedNorth=true;
    if(events.some(event=>event.type==='sound'&&event.id==='mage-waymark-arrive'))arrival=true;
    assert(f.game.combatTick<=entry.until);
  }
  assert(passedNorth&&arrival);
  close(f.mage,origin);
  assert.equal(f.mage.eAt,recovery);
  assert.equal(f.mage.invulnerableUntil,invulnerable);
});

test('Too little displacement preserves the unpaid trace and Ward Detonation wins a simultaneous press',()=>{
  const f=exercise(), issued=exercise(false);
  f.tick(action);
  f.walk({x:558,y:500}); f.walk({x:501,y:500});
  f.tick(action);
  assert.equal(f.status()?.phase,'marked');
  assert.equal(f.mage.eAt,0);
  assert((f.status()?.walked??0)>waymarkRules.minimumWalk);
  while(issued.game.combatTick<f.game.combatTick)issued.tick();
  Object.assign(issued.mage,point(f.mage));
  f.tick({...action,e:true}); issued.tick({e:true});
  assert.equal(f.mage.eAt,issued.mage.eAt);
  assert(f.mage.eAt>f.game.combatTick);
  assert.equal(f.status()?.phase,'idle');
  assert.deepEqual(f.physical(),[]);
  assert.deepEqual(f.game.classCues().map(({ id, ...cue })=>cue),issued.game.classCues().map(({ id, ...cue })=>cue));
});

test('A newly closed lane refuses the full trail before payment and halts a later paid return in clear space',()=>{
  const f=exercise(), wall={ x:527,y:475,width:9,height:55 };
  f.tick(action);f.walk({x:612,y:500});
  f.arena.obstacles.push(wall);
  f.tick(action);
  assert.equal(f.mage.eAt,0);
  assert.equal(f.status()?.phase,'marked');
  assert.equal(f.mage.x,612);
  f.arena.obstacles.length=0;
  f.tick(action);
  const recovery=f.mage.eAt;
  assert(recovery>f.game.combatTick);
  f.arena.obstacles.push(wall);
  for(let i=0;i<15&&f.physical().length;i++)f.tick();
  assert.equal(f.status()?.phase,'idle');
  assert(f.mage.x>wall.x+wall.width);
  assert.equal(f.mage.eAt,recovery);
  assert.deepEqual(f.physical(),[]);
});

test('A normal hostile projectile can hit the player during a paid return',()=>{
  const f=exercise();
  while(f.game.combatTick<f.mage.invulnerableUntil)f.tick();
  f.tick(action);f.walk({x:617,y:500});f.tick(action);
  assert.equal(f.status()?.phase,'returning');
  assert(f.mage.invulnerableUntil<=f.game.combatTick);
  const before=f.mage.health, hpDamage=f.mage.damageTaken, beforeX=f.mage.x;
  const shot=f.game['emitShot']('hostile',beforeX-16,500,Math.PI/2,30,25,5,0,1);
  assert(shot);
  f.tick();
  assert(f.mage.x<beforeX);
  assert(f.mage.health<before&&f.mage.damageTaken>hpDamage);
  assert.equal(f.mage.invulnerableUntil,f.game.combatTick+Math.round(.2*HZ));
});

test('Changing the movement order interrupts the paid trace and ordinary movement then takes over',()=>{
  const f=exercise();
  f.tick(action);f.walk({x:615,y:500});f.tick(action);
  const here=point(f.mage), recovery=f.mage.eAt;
  f.tick({moveY:1});
  assert.equal(f.status()?.phase,'idle');
  assert.equal(f.mage.x,here.x);
  assert(f.mage.y>here.y);
  assert.equal(f.mage.eAt,recovery);
});

test('Dodge, expiry and unexpected displacement remove an unpaid waymark',()=>{
  const f=exercise();
  f.tick(action);f.tick({dodge:true});
  assert.deepEqual(f.physical(),[]);
  assert.equal(f.mage.eAt,0);
  while(f.game.combatTick<(f.status()?.until??0)||f.mage.dashUntil>f.game.combatTick)f.tick();
  f.tick(action);
  assert.equal(f.physical().length,1);
  f.mage.x+=16;
  f.tick();
  assert.deepEqual(f.physical(),[]);
  const ready=f.status()?.until??0;
  while(f.game.combatTick<ready)f.tick();
  f.tick(action);
  const expiry=f.physical()[0].until;
  while(f.game.combatTick<expiry)f.tick();
  assert.deepEqual(f.physical(),[]);
  assert.equal(f.mage.eAt,0);
});

test('Hold the Trace allows an ordinary shot and resumes once before the original deadline',()=>{
  const f=exercise(true,[],'hold'), origin=point(f.mage);
  f.tick(action);f.walk({x:651,y:500});f.tick(action);
  const paid=f.mage.eAt, live=f.physical()[0];
  f.tick(action);
  assert.equal(f.status()?.phase,'returning');
  f.withinReturn(()=>!!f.status()?.canHold);
  const at=point(f.mage);
  const hold=f.tick(action);
  assert(hold.some(event=>event.type==='sound'&&event.id==='mage-waymark-hold'));
  assert.equal(f.status()?.phase,'resting');
  assert(f.physical()[0].resting);
  close(f.mage,at);
  const fire=f.tick({fire:true});
  assert(fire.some(event=>event.type==='shots'&&event.shots.some(shot=>shot.owner===f.mage.id)));
  close(f.mage,at);
  const resume=f.tick(action);
  assert(resume.some(event=>event.type==='sound'&&event.id==='mage-waymark-resume'));
  assert.equal(f.physical()[0].id,live.id);
  assert.equal(f.physical()[0].until,live.until);
  const second=f.tick(action);
  assert(!second.some(event=>event.type==='sound'&&event.id==='mage-waymark-hold'));
  while(f.physical().length)f.tick();
  close(f.mage,origin);
  assert.equal(f.mage.eAt,paid);
});

test('Side Landing redirects one bounded last leg and retains the original E cost and deadline',()=>{
  const f=exercise(true,[],'side');
  f.tick(action);f.walk({x:645,y:500});f.tick(action);
  const paid=f.mage.eAt, first=f.physical()[0];
  f.withinReturn(()=>!!f.status()?.sideWindow);
  const current=point(f.mage);
  const directed=f.tick({...action,aim:Math.PI/2});
  assert(directed.some(event=>event.type==='sound'&&event.id==='mage-waymark-side'));
  const changed=f.physical()[0];
  assert(changed.exit && distance(changed.exit,current)<=waymarkRules.sideMaximum+1e-5);
  assert.equal(changed.id,first.id);
  assert.equal(changed.until,first.until);
  const again=f.tick({...action,aim:-Math.PI/2});
  assert(!again.some(event=>event.type==='sound'&&event.id==='mage-waymark-side'));
  while(f.physical().length)f.tick();
  close(f.mage,changed.exit);
  assert.equal(f.mage.eAt,paid);
});

test('A covered side landing keeps the ordinary return and an unresumed hold safely ends in place',()=>{
  const f=exercise(true,[],'side');
  f.tick(action);f.walk({x:645,y:500});f.tick(action);
  f.withinReturn(()=>!!f.status()?.sideWindow);
  f.arena.obstacles.push({x:555,y:521,width:88,height:20});
  const signals=f.tick({...action,aim:Math.PI/2});
  assert(!signals.some(event=>event.type==='sound'&&event.id==='mage-waymark-side'));
  assert(!f.physical()[0].exit);
  while(f.physical().length)f.tick();
  close(f.mage,{x:500,y:500});

  const parked=exercise(true,[],'hold');
  parked.tick(action);parked.walk({x:645,y:500});parked.tick(action);
  parked.withinReturn(()=>!!parked.status()?.canHold);
  parked.tick(action);
  const rest=point(parked.mage),paid=parked.mage.eAt,deadline=parked.status()!.until!;
  while(parked.game.combatTick<deadline)parked.tick();
  close(parked.mage,rest);
  assert.deepEqual(parked.physical(),[]);
  assert.equal(parked.mage.eAt,paid);
});

test('The 9-SP hybrid can spend Binding Sigil while parked and finish the same paid Waymark Return',()=>{
  const f=exercise(true,[],'hold',true), anchor=point(f.mage);
  f.tick(action);f.walk({x:645,y:500});f.tick(action);
  const deadline=f.physical()[0].until, recovery=f.mage.eAt;
  f.withinReturn(()=>!!f.status()?.canHold);
  f.tick(action);
  const parked=point(f.mage);
  f.tick({technique1:true,aim:0});
  assert.equal(f.game.kitStatus(f.mage.id).pivotSigil?.phase,'marked');
  assert.equal(f.mage.qAt,0);
  f.tick({technique1:true,aim:0});
  assert.equal(f.game.kitStatus(f.mage.id).pivotSigil?.phase,'sweeping');
  assert(f.mage.qAt>f.game.combatTick);
  const qRecovery=f.mage.qAt;
  close(f.mage,parked);
  assert.equal(f.status()?.phase,'resting');
  assert.equal(f.mage.eAt,recovery);
  f.tick(action);
  assert.equal(f.status()?.phase,'returning');
  assert.equal(f.physical()[0].until,deadline);
  f.withinReturn(()=>!f.physical().length);
  close(f.mage,anchor);
  assert.equal(f.mage.eAt,recovery);
  assert.equal(f.mage.qAt,qRecovery);
});
