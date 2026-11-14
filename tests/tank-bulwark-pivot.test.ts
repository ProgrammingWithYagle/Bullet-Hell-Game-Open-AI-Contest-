import test from 'node:test';
import assert from 'node:assert/strict';
import {distance} from '../src/shared/geometry.ts';
import {wallFootprintClear} from '../src/shared/tank-bulwark.ts';
import {fixture as portFixture,definitions as build,point,wrap} from './helpers/tank-bulwark-fixture.ts';
const run=(name:string,execute:()=>unknown)=>test(name,()=>{execute();});
const close=(a:number,b:number,label='values differ')=>assert(Math.abs(a-b)<1e-7,label+' '+a+' '+b);
const turn=(v:{x:number;y:number},a:number)=>({x:v.x*Math.cos(a)-v.y*Math.sin(a),y:v.x*Math.sin(a)+v.y*Math.cos(a)});
function fixture({talent,pivot=true,aim}:{talent?:string;pivot?:boolean;aim?:number}={}){
  const f=portFixture({talent,handling:pivot?'pivot':'none',aim});
  const status=()=>f.access.classKits.tankPivotStatus(f.p.id);
  function start(angle=Math.PI/2){const events=f.step({technique2:true,aim:wrap(f.aim+angle)});assert(status().active);
    assert(events.some(e=>e.type==='sound'&&e.id==='tank-wall-pivot'&&e.owner===f.p.id));return status().readyAt;}
  function finish(input:Parameters<typeof f.step>[0]={}){let n=0;while(status().active&&n++<20)f.step(input);assert(!status().active);return n;}
  return {...f,status,start,finish};
}
run('optional fitting omitted keeps the issued carrying heading under Action 2',()=>{
  const f=fixture({pivot:false}),first=f.panels();
  for(let n=0;n<16;n++)f.step({technique2:true,aim:wrap(f.aim+Math.PI/2)});
  assert(!f.status().active&&f.status().readyAt===0&&f.carried());
  close(f.panels()[0].aim,first[0].aim);return {fittingOwned:false,headingPreserved:true};
});
run('captured bearing takes twelve combat intervals while preserving original paid wall state',()=>{
  const f=fixture(),wall=f.panels()[0],body=point(f.p),ammo=f.p.ammo;
  f.access.classKits.hitConstruct(wall.id,17);const health=f.panels()[0].health;
  const at=f.g.combatTick+1,readyAt=f.start();
  close(f.panels()[0].aim,wall.aim);assert.equal(readyAt,at+60);
  const angles=[];
  for(let n=1;n<=12;n++){
    f.step({aim:wrap(f.aim-Math.PI/2),fire:true,q:true,e:true,ultimate:true,reload:true,dodge:true});
    const current=f.panels()[0];assert(current);
    close(wrap(current.aim-wall.aim),Math.PI/2*n/12);angles.push(current.aim);
    close(current.health,health);assert.equal(current.id,wall.id);assert.equal(current.until,wall.until);
    close(distance(f.p,body),0);assert.equal(f.p.ammo,ammo);assert.equal(f.p.qAt,f.qAt);
  }
  assert(!f.status().active);return {angles,originalHealth:health,originalUntil:wall.until,readyAt,capturedAim:true};
});
run('movement input prevents starting a pivot',()=>{
  const f=fixture(),body=point(f.p);
  f.step({technique2:true,moveX:.5,aim:wrap(f.aim+1)});
  assert(!f.status().active&&f.status().readyAt===0);assert(distance(body,f.p)>0);
  return {walked:distance(body,f.p),recoveryUnspent:true};
});
run('separate walking cancels the committed turn without freezing movement',()=>{
  const f=fixture();f.start();f.step();const angle=f.panels()[0].aim,body=point(f.p);
  f.step({moveX:.5});assert(!f.status().active);assert(distance(body,f.p)>0);
  close(f.panels()[0].aim,angle);return {walked:distance(body,f.p),retainedAngle:angle};
});
run('actual service force interrupts and still displaces the carrier',()=>{
  const f=fixture();f.start();f.step();const angle=f.panels()[0].aim,body=point(f.p);
  f.access.director.services.movement=()=>({multiplier:1,x:60,y:0});
  f.step();assert(!f.status().active);assert(distance(body,f.p)>1);
  close(f.panels()[0].aim,angle);return {actualForceMovement:distance(body,f.p)};
});
run('closing-gate ejection interrupts before shield rotation',()=>{
  const f=fixture();f.start();f.step();const angle=f.panels()[0].aim,body=point(f.p);
  f.access.director.civic.solids=()=>[{x:f.p.x-6,y:f.p.y-6,width:12,height:12}];
  f.step();assert(distance(body,f.p)>1,'actual closing gate did not eject');
  assert(!f.status().active,'turn survived closing-gate displacement');
  if(f.panels()[0])close(f.panels()[0].aim,angle);
  return {actualGateEjection:distance(body,f.p),wallRetained:f.carried()};
});
run('Action 1 has priority over a same-frame pivot command',()=>{
  const f=fixture(),angle=f.panels()[0].aim;
  f.step({technique1:true,technique2:true,aim:wrap(f.aim+1)});
  assert(!f.carried()&&!f.status().active&&f.status().readyAt===0);
  close(f.panels()[0].aim,angle);return {setdown:true,recoveryUnspent:true};
});
run('Action 1 interrupts a turn before attempting setdown at the current bearing',()=>{
  const f=fixture();f.start();f.step();const angle=f.panels()[0].aim;
  f.step({technique1:true});assert(!f.carried()&&!f.status().active);
  close(f.panels()[0].aim,angle);return {setdownBearing:angle};
});
run('masonry in the future swept arc stops at the last legal carried frame',()=>{
  const f=fixture(),world=()=>({...f.g.arena,obstacles:f.g.obstacles,tick:f.g.combatTick});
  const normal={x:Math.cos(f.aim),y:Math.sin(f.aim)};
  let blocker;
  for(const angle of [Math.PI/3,Math.PI/2])for(const span of [0,45,-45]){
    const n=turn(normal,angle),center={x:f.p.x+n.x*32-n.y*span,y:f.p.y+n.y*32+n.x*span};
    const test={x:center.x-3,y:center.y-3,width:6,height:6};
    if(wallFootprintClear({...world(),obstacles:[...world().obstacles,test]},f.panels()[0],normal,55))blocker=test;
  }
  assert(blocker);f.g.arena.obstacles.push(blocker);f.start();const intervals=f.finish();
  const wall=f.panels()[0];assert(wall&&f.carried());
  assert(Math.abs(wrap(wall.aim-f.aim))<Math.PI/2-.001);
  assert(wallFootprintClear(world(),wall,{x:Math.cos(wall.aim),y:Math.sin(wall.aim)},55));
  return {intervals,lastLegalAngle:wall.aim,blocker};
});
run('new masonry intersecting the current held frame retires the dependent wall immediately',()=>{
  const f=fixture();f.start();f.step();const wall=f.panels()[0];
  f.g.arena.obstacles.push({x:wall.x-6,y:wall.y-6,width:12,height:12});
  f.step();assert(!f.carried()&&f.panels().length===0,'current blocked shield remained for a tick');
  return {immediatelyRetired:true};
});
run('setdown and pickup cannot reset pivot recovery',()=>{
  const f=fixture(),readyAt=f.start();f.finish();
  f.step({technique1:true});assert(!f.carried());
  f.step({technique1:true});assert(f.carried());assert.equal(f.status().readyAt,readyAt);
  f.step({technique2:true,aim:f.aim});assert(!f.status().active);
  while(f.g.combatTick<readyAt-1)f.step();
  f.step({technique2:true,aim:f.aim});assert(f.status().active);
  return {readyAt,secondStart:f.g.combatTick,originalUntil:f.initial[0].until};
});
run('late commitment is refused and original expiry is unchanged',()=>{
  const f=fixture(),until=f.panels()[0].until;
  while(f.g.combatTick<until-12)f.step();
  f.step({technique2:true,aim:wrap(f.aim+1)});assert(!f.status().active&&f.status().readyAt===0);
  assert.equal(f.panels()[0].until,until);
  while(f.g.combatTick<until)f.step();assert(!f.carried()&&f.panels().length===0);
  return {until,expiredAt:f.g.combatTick};
});
run('losing the used fitting retires its dependent carried work',()=>{
  const f=fixture();f.start();f.step();
  f.p.skills=f.p.skills.filter(id=>id!==build.pivotDefinition.id);f.step();
  assert(!f.carried()&&f.panels().length===0);return {retired:true};
});
for(const reason of ['disconnect','fatal'])run(reason+' immediately cleans an active pivot',()=>{
  const f=fixture();f.start();
  if(reason==='disconnect')f.g.setConnected(f.p.id,false);
  else{while(f.g.combatTick<f.p.invulnerableUntil)f.step();f.access.damage(f.p,100_000);}
  assert(!f.carried()&&f.panels().length===0&&!f.status().active);
  return {ownerStatus:f.p.status,connected:f.p.connected};
});
for(const talent of [undefined,'wake-guard','procession','cornerstone'])run('turn preserves full '+(talent??'base')+' panel layout and damaged setdown',()=>{
  const f=fixture({talent}),old=f.initial,angle=Math.PI/2;
  f.access.classKits.hitConstruct(old[0].id,17);f.start(angle);f.finish();
  f.step({technique1:true});assert(!f.carried());const restored=f.panels();
  assert.equal(restored.length,old.length);
  for(const wall of restored){
    const original=old.find(other=>other.id===wall.id);assert(original);
    close(wrap(wall.aim-original.aim),angle);
    close(wall.health,original.health-(wall.id===old[0].id?17:0));
    assert.equal(wall.until,original.until);assert.equal(wall.halfSpan,original.halfSpan);
  }
  if(old.length===2){
    const expected=turn({x:old[1].x-old[0].x,y:old[1].y-old[0].y},angle);
    close(restored[1].x-restored[0].x,expected.x);close(restored[1].y-restored[0].y,expected.y);
  }
  assert.equal(f.p.qAt,f.qAt);return {talent:talent??'none',originalIds:old.map(w=>w.id),purchases:f.purchases};
});
run('a Cornerstone member destroyed midturn leaves the actual surviving panel',()=>{
  const f=fixture({talent:'cornerstone'}),old=f.panels();assert.equal(old.length,2);
  f.start();f.step();f.access.classKits.hitConstruct(old[0].id,old[0].health+1);f.finish();
  assert(f.carried());assert.deepEqual(f.panels().map(w=>w.id),[old[1].id]);
  f.step({technique1:true});assert(!f.carried());const wall=f.panels()[0];
  close(wrap(wall.aim-old[1].aim),Math.PI/2);assert.equal(wall.until,old[1].until);
  return {survivingPanel:wall.id,originalUntil:wall.until};
});

for(const force of ['service','closing gate'])run(force+' displacement prevents initial commitment without spending recovery',()=>{
  const f=fixture(),body=point(f.p);
  if(force==='service')f.access.director.services.movement=()=>({multiplier:1,x:60,y:0});
  else f.access.director.civic.solids=()=>[{x:body.x-6,y:body.y-6,width:12,height:12}];
  f.step({technique2:true,aim:wrap(f.aim+1)});
  assert(distance(body,f.p)>1);assert(!f.status().active&&f.status().readyAt===0);
  return {actualDisplacement:distance(body,f.p),recoveryUnspent:true};
});
for(const aim of [-3.05,3.05])run('captured turn crosses '+aim+' through the short angular path',()=>{
  const f=fixture({aim}),goal=-aim,angle=wrap(goal-aim),wall=f.panels()[0];
  assert(Math.abs(angle)<.2);f.start(angle);const measured=[];
  for(let n=1;n<=12;n++){
    f.step({aim});const current=f.panels()[0];assert(current);
    close(wrap(current.aim-wall.aim),angle*n/12);measured.push(wrap(current.aim-wall.aim));
  }
  assert(!f.status().active);close(wrap(f.panels()[0].aim-goal),0);
  return {aim,goal,angle,measured,originalUntil:wall.until};
});
run('lava in the swept footprint stops the turn before the hazardous frame',()=>{
  const f=fixture(),normal={x:Math.cos(f.aim+Math.PI/2),y:Math.sin(f.aim+Math.PI/2)};
  const pit={x:f.p.x+normal.x*32,y:f.p.y+normal.y*32,radius:3};
  f.g.arena.lavaPits.push(pit);
  const world=()=>({...f.g.arena,obstacles:f.g.obstacles,tick:f.g.combatTick});
  assert(wallFootprintClear(world(),f.panels()[0],{x:Math.cos(f.aim),y:Math.sin(f.aim)},55));
  f.start();f.finish();const wall=f.panels()[0];assert(wall&&f.carried());
  assert(Math.abs(wrap(wall.aim-f.aim))<Math.PI/2-.001);
  assert(wallFootprintClear(world(),wall,{x:Math.cos(wall.aim),y:Math.sin(wall.aim)},55));
  return {pit,lastLegalAim:wall.aim};
});
run('arena bounds stop the swept shield without moving the carrier',()=>{
  const f=fixture(),body=point(f.p);
  f.g.arena.bounds={x:body.x-85,y:body.y-90,width:170,height:110};
  const world=()=>({...f.g.arena,obstacles:f.g.obstacles,tick:f.g.combatTick});
  assert(wallFootprintClear(world(),f.panels()[0],{x:Math.cos(f.aim),y:Math.sin(f.aim)},55));
  f.start();f.finish();const wall=f.panels()[0];assert(wall&&f.carried());
  assert(Math.abs(wrap(wall.aim-f.aim))<Math.PI/2-.001);
  assert(wallFootprintClear(world(),wall,{x:Math.cos(wall.aim),y:Math.sin(wall.aim)},55));
  assert.deepEqual(point(f.p),body);return {bounds:f.g.arena.bounds,lastLegalAim:wall.aim};
});
