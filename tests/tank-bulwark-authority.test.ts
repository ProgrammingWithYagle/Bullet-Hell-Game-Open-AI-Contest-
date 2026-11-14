import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game,data} from '../src/shared/game.ts';
import {distance} from '../src/shared/geometry.ts';
import {fixture,definitions as build,point,wrap} from './helpers/tank-bulwark-fixture.ts';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const run=(name:string,execute:()=>unknown)=>test(name,()=>{execute();});
run('all issued definitions and equipment remain exact in the authored Tank branch',()=>{
  const bindings=JSON.parse(readFileSync(new URL('./fixtures/tank-issued76-bindings.json',import.meta.url),'utf8'));
  assert.deepEqual(data.specializationSkills.slice(0,69).map(node=>node.id),bindings.issuedTechniqueIds);
  assert.equal(digest(data.specializationSkills.slice(0,69)),bindings.issuedTechniquesSha256);
  for(const [field,hash]of Object.entries(bindings.fieldHashes))assert.equal(digest((data as unknown as Record<string,unknown>)[field]),hash,field);
  for(const node of [build.definition,build.pivotDefinition,build.portDefinition]){
    assert.equal(node.classId,'tank');assert.equal(node.branchId,'tank-pathways');assert.equal(node.subbranchName,'Mobile Bulwark');
  }
});
for(const handling of ['port','pivot'] as const)run('actual purchase excludes the other handling after '+handling,()=>{
  let refusal:unknown;fixture({handling,beforeStart(g,p){const id=handling==='port'?build.pivotDefinition.id:build.portDefinition.id;
    const result=g.transact(p.id,{kind:'skill',id:'conflict',item:id});refusal=result;assert(!result.ok&&result.reason==='incompatibleItem');assert(!p.skills.includes(id));}});
  return {handling,refusal};
});
run('port remains unaffordable at the ordinary three-SP start',()=>{
  const g=new Game({mode:'short',difficulty:'baby',seed:41}),p=g.addPlayer('tank','Starting budget','tank');
  for(const id of ['tank-protection-1',build.definition.id])assert(g.transact(p.id,{kind:'skill',id,item:id}).ok);
  const refusal=g.transact(p.id,{kind:'skill',id:'early-port',item:build.portDefinition.id});assert(!refusal.ok&&refusal.reason==='insufficientPoints');
  return {earned:p.totalSp,refusal};
});
run('opening exposes the actual gap before primary is ready and preserves paid state',()=>{
  const f=fixture(),ammo=f.p.ammo,until=f.begin(),initial=f.initial[0];
  assert(f.panels().every(w=>(w.bulwarkPortHalfSpan??0)>0));
  const emitted=[];
  while(f.g.combatTick<until-1){for(const event of f.step({fire:true}))if(event.type==='shots')emitted.push(...event.shots.filter(s=>s.owner===f.p.id));assert.equal(f.p.ammo,ammo);}
  for(const event of f.step({fire:true}))if(event.type==='shots')emitted.push(...event.shots.filter(s=>s.owner===f.p.id));
  assert.equal(f.status().phase,'open');assert.equal(f.p.ammo,ammo-1);assert(emitted.length>0);
  assert.equal(f.panels()[0].id,initial.id);assert.equal(f.panels()[0].until,initial.until);assert.equal(f.panels()[0].health,initial.health);assert.equal(f.p.qAt,f.qAt);
  return {openingReadyAt:until,firstPaidAt:f.g.combatTick,paidRounds:1,emittedPellets:emitted.length,originalUntil:initial.until};
});

run('closed shield catches the central round while an open port exposes the actual body',()=>{
  const closed=fixture(),a=closed.hostile();assert.equal(a.wallLoss,25);assert.equal(a.actorLoss+a.shieldLoss,0);
  const open=fixture();open.open();const b=open.hostile();assert.equal(b.wallLoss,0);assert(b.actorLoss+b.shieldLoss>0);
  return {closed:a,open:b};
});
run('the opening is vulnerable throughout its six-tick preparation',()=>{
  const f=fixture();while(f.g.combatTick<f.p.invulnerableUntil)f.step();
  const ready=f.begin(),hit=f.hostile();assert(f.g.combatTick<ready&&f.status().phase==='opening');
  assert.equal(hit.wallLoss,0);assert(hit.actorLoss+hit.shieldLoss>0);
  return {readyAt:ready,hitAt:f.g.combatTick,hit};
});
for(const threat of [{name:'side rim',along:45,radius:3},{name:'round wider than the opening',along:0,radius:16}])
  run(threat.name+' still strikes a closed physical panel piece',()=>{
    const f=fixture();f.open();const hit=f.hostile(threat);assert.equal(hit.wallLoss,25);assert.equal(hit.actorLoss+hit.shieldLoss,0);
    return {threat,hit};
  });
run('closing blocks primary immediately but retains the exposed gap for six intervals',()=>{
  const f=fixture();f.open();const ammo=f.p.ammo;
  f.step({technique2:true,fire:true});assert.equal(f.status().phase,'closing');const until=f.status().until;
  while(f.g.combatTick<until-1){assert((f.panels()[0].bulwarkPortHalfSpan??0)>0);f.step({fire:true});assert.equal(f.p.ammo,ammo);}
  f.step({fire:true});assert.equal(f.status().phase,'closed');assert.equal(f.panels()[0].bulwarkPortHalfSpan,undefined);
  assert.equal(f.p.ammo,ammo);assert.equal(f.p.qAt,f.qAt);return {closedAt:f.g.combatTick,paidRounds:0,originalUntil:f.initial[0].until};
});
run('the carrier keeps the original bearing and must aim through its port',()=>{
  const f=fixture();f.open();const ammo=f.p.ammo,aim=f.panels()[0].aim;
  f.step({aim:wrap(f.aim+.4),fire:true});assert.equal(f.p.ammo,ammo);assert.equal(f.panels()[0].aim,aim);
  f.step({fire:true});assert.equal(f.p.ammo,ammo-1);return {blockedOffBearing:true,paidOnBearing:true,aim};
});
run('unowned port never unlocks primary or creates an opening',()=>{
  const f=fixture({handling:'none'}),ammo=f.p.ammo;
  for(let n=0;n<10;n++)f.step({technique2:true,fire:true});
  assert.equal(f.status().phase,'closed');assert.equal(f.p.ammo,ammo);assert.equal(f.panels()[0].bulwarkPortHalfSpan,undefined);
  return {paidRounds:0,openingCreated:false};
});
run('other occupied-hand actions remain suppressed while the port is open',()=>{
  const f=fixture();f.open();const ammo=f.p.ammo,clocks=[f.p.qAt,f.p.eAt,f.p.ultimateAt];
  f.step({q:true,e:true,ultimate:true,reload:true,dodge:true,fire:true});
  assert.equal(f.p.ammo,ammo);assert.deepEqual([f.p.qAt,f.p.eAt,f.p.ultimateAt],clocks);assert.equal(f.p.reloadAt,0);
  assert.equal(f.status().phase,'open');return {ordinaryAbilitiesSuppressed:true,primarySuppressedForCompetingInput:true};
});
for(const force of ['walking','service force','closing gate'])run(force+' closes the port, blocks primary and preserves actual displacement',()=>{
  const f=fixture();f.open();const ammo=f.p.ammo,body=point(f.p);
  if(force==='service force')f.access.director.services.movement=()=>({multiplier:1,x:60,y:0});
  if(force==='closing gate')f.access.director.civic.solids=()=>[{x:body.x-6,y:body.y-6,width:12,height:12}];
  f.step({fire:true,...(force==='walking'?{moveX:.5}:{})});
  assert(distance(body,f.p)>1);assert.equal(f.status().phase,'closed');assert.equal(f.p.ammo,ammo);
  assert.equal(f.panels()[0].bulwarkPortHalfSpan,undefined);assert.equal(f.panels()[0].until,f.initial[0].until);
  return {moved:distance(body,f.p),paidRounds:0,originalUntil:f.initial[0].until};
});
run('Action 1 has priority and restores the same full-width paid panel',()=>{
  const f=fixture();f.open();const ammo=f.p.ammo;f.step({technique1:true,technique2:true,fire:true});
  assert(!f.carried());assert.equal(f.status().phase,'closed');assert.equal(f.p.ammo,ammo);
  const wall=f.panels()[0];assert.equal(wall.halfSpan,f.initial[0].halfSpan);assert.equal(wall.id,f.initial[0].id);
  assert.equal(wall.bulwarkPortHalfSpan,undefined);assert.equal(wall.until,f.initial[0].until);
  return {samePanel:wall.id,originalUntil:wall.until,fullWidthRestored:true};
});
run('a blocked wide setdown retains the actual exposed port and paid state',()=>{
  const f=fixture();f.open();const wall=f.panels()[0],ammo=f.p.ammo;
  f.g.arena.obstacles.push({x:wall.x+f.side.x*80-3,y:wall.y+f.side.y*80-3,width:6,height:6});
  f.step({technique1:true,fire:true});assert(f.carried());assert.equal(f.status().phase,'open');
  assert((f.panels()[0].bulwarkPortHalfSpan??0)>0);assert.equal(f.p.ammo,ammo);assert.equal(f.panels()[0].until,wall.until);
  return {setdownRefused:true,openingRetained:true,originalUntil:wall.until};
});

for(const weapon of data.weapons.filter(weapon=>weapon.classId==='tank'))run('paid '+weapon.id+' primary is clipped by its actual port pieces',()=>{
  const f=fixture({weapon:weapon.id});f.open();const ammo=f.p.ammo,wallHealth=f.panels().map(w=>[w.id,w.health]);
  const events=f.step({fire:true,aim:wrap(f.aim+8*Math.PI/180)});
  const emitted=events.flatMap(event=>event.type==='shots'?event.shots.filter(shot=>shot.owner===f.p.id):[]);
  assert.equal(f.p.ammo,ammo-1);assert.equal(emitted.length,weapon.pellets);
  for(let n=0;n<4;n++)f.step();
  const admitted=emitted.filter(shot=>f.g.shots.has(shot.id));
  assert(admitted.length>0);if(weapon.pellets>1)assert(admitted.length<emitted.length,'off-port pellets were not physically clipped');
  assert.deepEqual(f.panels().map(w=>[w.id,w.health]),wallHealth);
  return {weapon:weapon.id,price:weapon.price,issuedPellets:weapon.pellets,paidRounds:1,emitted:emitted.length,throughPort:admitted.length,
    clippedByOwnPanel:emitted.length-admitted.length,retainedWallHealth:true};
});
for(const talent of [undefined,'wake-guard','procession','cornerstone'])run('actual '+(talent??'base')+' transformation retains identity, damage and first expiry',()=>{
  const f=fixture({talent}),original=f.initial;
  f.access.classKits.hitConstruct(original[0].id,17);const health=f.panels().reduce((sum,w)=>sum+w.health,0);
  f.open();assert(f.panels().every(w=>(w.bulwarkPortHalfSpan??0)>0));
  const hit=f.hostile();assert.equal(hit.wallLoss,0);assert(hit.actorLoss+hit.shieldLoss>0);
  f.step({technique1:true});assert(!f.carried());const restored=f.panels();assert.equal(restored.length,original.length);
  for(const wall of restored){const old=original.find(old=>old.id===wall.id);assert(old);
    assert.equal(wall.halfSpan,old.halfSpan);assert.equal(wall.until,old.until);assert.equal(wall.bulwarkPortHalfSpan,undefined);assert.equal(wall.aim,old.aim);}
  assert.equal(restored.reduce((sum,w)=>sum+w.health,0),health);assert.equal(f.p.qAt,f.qAt);
  return {talent:talent??'none',panels:restored.map(w=>w.id),originalExpiry:original[0].until,damageRetained:true,hit};
});
run('one destroyed Cornerstone member leaves the surviving original panel and real opening',()=>{
  const f=fixture({talent:'cornerstone'});assert.equal(f.initial.length,2);f.open();
  f.access.classKits.hitConstruct(f.initial[0].id,f.initial[0].health+1);f.step();
  assert(f.carried());assert.deepEqual(f.panels().map(w=>w.id),[f.initial[1].id]);assert((f.panels()[0].bulwarkPortHalfSpan??0)>0);
  const hit=f.hostile();assert.equal(hit.wallLoss,0);assert(hit.actorLoss+hit.shieldLoss>0);
  f.step({technique1:true});assert(!f.carried());assert.equal(f.panels()[0].id,f.initial[1].id);
  assert.equal(f.panels()[0].until,f.initial[1].until);assert.equal(f.panels()[0].health,f.initial[1].health);
  return {survivingPanel:f.initial[1].id,hit,originalUntil:f.initial[1].until};
});
for(const loss of ['fitting','weapon','disconnect','fatal'])run(loss+' loss retires the dependent port and carried panel',()=>{
  const f=fixture();f.open();
  if(loss==='fitting'){f.p.skills=f.p.skills.filter(id=>id!==build.portDefinition.id);f.step();}
  if(loss==='weapon'){f.p.weapon='tank-1';f.step();}
  if(loss==='disconnect')f.g.setConnected(f.p.id,false);
  if(loss==='fatal'){while(f.g.combatTick<f.p.invulnerableUntil)f.step();f.access.damage(f.p,100_000);}
  assert(!f.carried());assert.equal(f.panels().length,0);assert.equal(f.status().phase,'closed');
  return {retired:true,owner:f.p.status,connected:f.p.connected};
});
run('original wall expiry retires the open port without an uptime extension',()=>{
  const f=fixture();f.open();const until=f.initial[0].until;
  while(f.g.combatTick<until)f.step();assert(!f.carried());assert.equal(f.panels().length,0);assert.equal(f.status().phase,'closed');
  assert.equal(f.p.qAt,f.qAt);return {expiredAt:f.g.combatTick,originalUntil:until,originalRecovery:f.qAt};
});
run('allied friendly rounds keep their issued ability to pass an owned shield',()=>{
  const f=fixture();f.open();f.step({technique2:true});f.settle();assert.equal(f.status().phase,'closed');
  const shot=f.access.emitShot('ally',f.p.x,f.p.y,f.aim,600,10,4);assert(shot);
  for(let n=0;n<4;n++)f.step();assert(f.g.shots.has(shot.id));
  return {alliedShot:shot.id,survivedOwnShieldRegion:true};
});
