import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createPracticeGame} from '../src/shared/practice-start.ts';
import {data} from '../src/shared/game.ts';
import {PROTOCOL,CONTENT_REVISION} from '../src/shared/protocol.ts';
import {runtimeArenas} from '../src/shared/arena-layouts.ts';
import {encounterPhases,encounterVariant} from '../src/shared/encounter-policy.ts';
import {moldWalls} from '../src/shared/mold-mixing.ts';
import {distance,segmentRect} from '../src/shared/geometry.ts';
import {moldFrame} from '../src/client/mold-presentation.ts';
const output=process.argv[2]??'reviews/alchemist-lab-2026-10-27/sequences.json';
const rows=[];let observedTicks=0,walkVertices=0,activeWalkTicks=0,stationaryWalkTicks=0,primaryThrows=0,primaryThrowsAwayFromBoss=0;
for(const map of runtimeArenas)for(const difficulty of data.difficulties)for(const requestedForm of ['normal','brutal','crazed']){
 const effective=encounterVariant(difficulty.id,requestedForm),phases=encounterPhases('alchemist',effective);
 for(let phase=0;phase<phases.length;phase++){
  if(process.env.MOLD_PROBE_CASE&&process.env.MOLD_PROBE_CASE!==[map.id,difficulty.id,requestedForm,phase].join('/'))continue;
  const g=createPracticeGame({mode:'endless',openingBossId:'alchemist',openingArenaId:map.id,difficulty:difficulty.id,seed:491},'Mara','soldier',requestedForm);g.start();g.boss.deadline=1e9;
  for(const p of g.players.values())p.invulnerableUntil=1e9;
  if(phase)g.boss.health=g.boss.maxHealth*(phases[phase].healthThreshold-.01);
  while(g.boss.phase<phase)g.step();
  const known=new Map(),poolIds=new Set(),cooled=new Set(),spent=new Set(),kinds=new Set(),gait=new Set(),techniques=new Set();
  let peakPools=0,peakReactions=0,peakReactors=0,peakHostiles=0,walks=0,flasks=0,water=0,catalysts=0,coupled=0,catalytic=0,gasBanks=0,secondGasBanks=0,reactors=0,rowWalkTicks=0,rowStalls=0,minimumPrimaryDistance=Infinity;
  for(let n=0;n<1800;n++){
   const before=g.bossCues().find(q=>q.kind==='mold-walk'),old={x:g.boss.x,y:g.boss.y};g.step();observedTicks++;assert.equal(g.phase,'combat');assert.equal(g.boss.phase,phase);
   const c=g.signatureContext(),walls=moldWalls(c),cues=g.bossCues().filter(q=>q.kind.startsWith('mold-'));
   assert(g.bossCues().every(q=>q.kind.startsWith('mold-')||q.kind==='arena-lava'),'Unexpected generic bullet/laser pressure');
   assert(walls.every(o=>segmentRect(g.boss,g.boss,o,c.radius-.2)===null),'Boss body left safe connected geometry');
   if(before&&g.combatTick>=before.at){const travel=distance(old,g.boss);assert(travel<=before.speed/30+.01);if(g.combatTick<before.until-1){activeWalkTicks++;rowWalkTicks++;if(travel<.0001){stationaryWalkTicks++;rowStalls++;}}}
   const hostile=[...g.shots.values()].filter(q=>q.owner==='hostile').length;peakHostiles=Math.max(peakHostiles,hostile);assert.equal(hostile,0);
   assert.equal(new Set(cues.map(q=>q.id)).size,cues.length);
   peakPools=Math.max(peakPools,cues.filter(q=>q.kind==='mold-pool').length);peakReactions=Math.max(peakReactions,cues.filter(q=>q.kind==='mold-reaction').length);peakReactors=Math.max(peakReactors,cues.filter(q=>q.kind==='mold-reactor').length);
   const frame=moldFrame(cues,g.combatTick);if(frame>=8)gait.add(frame);assert.equal(moldFrame(cues,g.combatTick,true),0);
   for(const q of cues){
    kinds.add(q.kind);assert(Number.isSafeInteger(q.id));
    for(const value of Object.values(q))if(typeof value==='number')assert(Number.isFinite(value));
    if(q.kind==='mold-pool'&&!poolIds.has(q.id)){poolIds.add(q.id);assert(walls.every(o=>segmentRect(q,q,o,q.radius-.2)===null),'Reagent/coolant footprint violates actual bounds/masonry/lava');if(q.reagent==='water')water++;}
    if(q.kind==='mold-reactor'&&q.state==='cooled')cooled.add(q.id);
    if(q.kind==='mold-pool'&&q.spentAt)spent.add(q.id);
    const previous=known.get(q.id);
    if(previous){
     if(q.kind==='mold-flask')assert.deepEqual(q,previous);
     if(q.kind==='mold-gas')for(const k of ['axis','start','end','x','y','width','height','at','until'])assert.equal(q[k],previous[k]);
     continue;
    }
    known.set(q.id,structuredClone(q));
    if(q.kind==='mold-walk'){
     walks++;walkVertices+=q.path.length;for(let i=0;i<q.path.length;i++){assert.deepEqual(Object.keys(q.path[i]).sort(),['x','y']);if(i)assert(walls.every(o=>segmentRect(q.path[i-1],q.path[i],o,c.radius-.2)===null));}
    }else if(q.kind==='mold-flask'){
     flasks++;assert.equal(q.at-q.beganAt,42);assert(walls.every(o=>segmentRect(q,q,o,q.radius-.2)===null));
     if(q.reagent==='catalyst')catalysts++;if(q.slot===0){primaryThrows++;const d=distance(q,{x:q.fromX,y:q.fromY+40});minimumPrimaryDistance=Math.min(minimumPrimaryDistance,d);if(d>=100)primaryThrowsAwayFromBoss++;}
    }else if(q.kind==='mold-reaction'){
     if(q.type==='coupled'){coupled++;assert(q.at-q.beganAt>=78);assert.equal(q.sources.length,2);}else{catalytic++;assert.equal(q.at-q.beganAt,45);}
    }else if(q.kind==='mold-gas'){
     gasBanks++;if(q.index===2)secondGasBanks++;assert.equal(q.at-q.beganAt,60);assert.deepEqual({x:q.x,y:q.y,width:q.width,height:q.height},g.arena.bounds);assert.equal(q.count,phase>=3?2:1);techniques.add('vapor');
    }else if(q.kind==='mold-reactor'){
     reactors++;assert.equal(q.burstAt-q.ruptureAt,45);assert(walls.every(o=>segmentRect(q,q,o,q.radius-.2)===null));techniques.add('pressure');
    }
   }
  }
  assert(walks>0&&flasks>0);assert.equal(gait.size,8);assert(water>0,'No actual neutralization witnessed');
  if(phase===0)assert.equal(gasBanks,0);else assert(gasBanks>0);
  if(phase>=2&&!(reactors>0&&cooled.size>0)){
   const diagnostic={map:map.id,difficulty:difficulty.id,requestedForm,effective,phase,reactors,water,cooled:cooled.size,reactorCues:[...known.values()].filter(q=>q.kind==='mold-reactor'),waterCues:[...known.values()].filter(q=>q.kind==='mold-pool'&&q.reagent==='water')};
   fs.writeFileSync(output+'.failure.json',JSON.stringify(diagnostic,null,2)+'\n');assert.fail('No vessel cooling in sample; exact case and cue geometry saved to '+output+'.failure.json');
  }else if(phase<2)assert.equal(reactors,0);
  if(phase>=3)assert(secondGasBanks>0);
  if(effective==='normal'){assert.equal(coupled,0);assert.equal(catalysts,0);}else assert(coupled>0,'Advanced form never produced actual coupling');
  if(effective==='crazed')assert(catalysts>0);else assert.equal(catalysts,0);
  g.boss.health=0;g.step();assert(!g.bossCues().some(q=>q.kind.startsWith('mold-')));
  rows.push({map:map.id,difficulty:difficulty.id,requestedForm,effectiveForm:effective,phase,walks,flasks,water,catalysts,coupled,catalytic,gasBanks,secondGasBanks,reactors,cooledReactors:cooled.size,spentCoolant:spent.size,walkFrames:[...gait].sort((a,b)=>a-b),activeWalkTicks:rowWalkTicks,stationaryWalkTicks:rowStalls,minimumPrimaryThrowDistance:minimumPrimaryDistance,peakPools,peakReactions,peakReactors,peakHostiles,techniques:[...techniques],cueKinds:[...kinds].sort()});
 }
}
const max=k=>Math.max(...rows.map(r=>r[k])),report={passed:true,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,cases:rows.length,observedTicks,walkVertices,activeWalkTicks,stationaryWalkTicks,primaryThrows,primaryThrowsAwayFromBoss,peakPools:max('peakPools'),peakReactions:max('peakReactions'),peakReactors:max('peakReactors'),peakHostiles:max('peakHostiles'),stationaryCrazedCasesWithoutAutomaticQuench:rows.filter(r=>r.effectiveForm==='crazed'&&!r.spentCoolant).length,rows,limits:['Actual-Game stationary invulnerable mechanics samples, 60 seconds per map/difficulty/requested-form/effective-phase. Not a personally played clear or final rendered/human balance/performance/device acceptance.','Every actual body, complete walk path, landing/pool and vessel footprint is checked against full offset bounds, masonry and conservative lava footprints. Blast radii and vapor intentionally cross arena space.','Stationary Crazed samples report actual spent coolant without assuming an automatic quench. Explicit controlled baiting for both catalyst outcomes is verified separately by probe-alchemist-counterplay.mjs.','Separate focused tests provide controlled baiting/neutralization, cancellation, vapor contact, pressure/catalyst counterplay, local prediction and actual owner/observer replication.']};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
