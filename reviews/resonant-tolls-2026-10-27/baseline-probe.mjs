import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)',source='71692ed82f7a790ab3e3e860eb8221263b2e64ca',metadata='7217c59a402d9cd3c8ecf4fea8e3848e0f8ff998';
const git=args=>{const r=spawnSync('git',['-c','core.bare=false',...args],{cwd:root,encoding:'utf8'});assert.equal(r.status,0);return r.stdout.trim();};
assert.equal(git(['rev-parse','HEAD']),metadata);assert.equal(git(['diff',source,'--','src','content','locales']),'');
const load=p=>import(pathToFileURL(root+'/src/shared/'+p+'.ts').href);
const {createPracticeGame}=await load('practice-start'),{data}=await load('game'),{runtimeArenas}=await load('arena-layouts'),{encounterPhases,encounterVariant}=await load('encounter-policy'),{segmentRect}=await load('geometry'),{PROTOCOL,CONTENT_REVISION}=await load('protocol');
const rows=[],radius=data.bosses.find(b=>b.id==='bellringer').radius;let totalTicks=0;
for(const map of runtimeArenas)for(const difficulty of data.difficulties)for(const form of ['normal','brutal','crazed']){
 const effective=encounterVariant(difficulty.id,form),phases=encounterPhases('bellringer',effective);
 for(let phase=0;phase<phases.length;phase++){
  const g=createPracticeGame({mode:'endless',openingBossId:'bellringer',openingArenaId:map.id,difficulty:difficulty.id,seed:491},'Mara','soldier',form);
  g.start();for(const p of g.players.values())p.invulnerableUntil=1e9;if(phase)g.boss.health=g.boss.maxHealth*(phases[phase].healthThreshold-.01);
  const b=g.arena.bounds,origin={x:g.boss.x,y:g.boss.y},rings=new Map(),kinds=new Set();
  let peakRings=0,peakHostiles=0,maximumBossDisplacement=0,bossOutsideTicks=0,bossMasonryTicks=0,minimumRingWarningTicks=Infinity,changingGapAngleTicks=0,nonmonotonicRadiusTicks=0;
  for(let i=0;i<900&&g.phase==='combat';i++){
   g.step();totalTicks++;maximumBossDisplacement=Math.max(maximumBossDisplacement,Math.hypot(g.boss.x-origin.x,g.boss.y-origin.y));
   if(g.boss.x-radius<b.x-.01||g.boss.x+radius>b.x+b.width+.01||g.boss.y-radius<b.y-.01||g.boss.y+radius>b.y+b.height+.01)bossOutsideTicks++;
   if(g.arena.obstacles.some(o=>segmentRect(g.boss,g.boss,o,radius-.2)!==null))bossMasonryTicks++;
   const cues=g.bossCues(),current=cues.filter(q=>q.kind==='service-ring');peakRings=Math.max(peakRings,current.length);
   peakHostiles=Math.max(peakHostiles,[...g.shots.values()].filter(s=>s.owner==='hostile').length);
   for(const q of cues)kinds.add(q.kind);
   for(const q of current){
    assert(Number.isSafeInteger(q.id));assert([q.x,q.y,q.radius,q.oldRadius,q.gapAngle,q.gap,q.width,q.speed,q.damage,q.at,q.until].every(Number.isFinite));
    if(!rings.has(q.id)){
     minimumRingWarningTicks=Math.min(minimumRingWarningTicks,q.at-g.combatTick);
     rings.set(q.id,{x:q.x,y:q.y,at:q.at,until:q.until,gapAngle:q.gapAngle,gap:q.gap,speed:q.speed,damage:q.damage,lastRadius:q.radius,firstObserved:g.combatTick});
    }
    const previous=rings.get(q.id);assert.equal(q.x,previous.x);assert.equal(q.y,previous.y);
    if(Math.abs(q.gapAngle-previous.gapAngle)>1e-9)changingGapAngleTicks++;
    if(q.radius<previous.lastRadius-1e-9)nonmonotonicRadiusTicks++;
    previous.lastRadius=q.radius;
   }
  }
  assert.equal(g.boss.phase,phase);assert(rings.size>0);assert.equal(nonmonotonicRadiusTicks,0);
  rows.push({map:map.id,difficulty:difficulty.id,requestedForm:form,effectiveForm:g.boss.variant,requestedPhase:phase,observedPhase:g.boss.phase,bounds:{...b},maximumBossDisplacement,bossOutsideTicks,bossMasonryTicks,minimumRingWarningTicks,uniqueRings:rings.size,peakRings,changingGapAngleTicks,nonmonotonicRadiusTicks,peakHostiles,cueKinds:[...kinds].sort(),rings:[...rings.values()].map(({lastRadius,...q})=>q)});
 }
}
const sum=k=>rows.reduce((n,r)=>n+r[k],0),max=k=>Math.max(...rows.map(r=>r[k]));
const report={kind:'Read-only Bellringer assessment; no implementation or quality credit',sourceCommit:source,metadataHead:metadata,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,cases:rows.length,totalTicks,maximumBossDisplacement:max('maximumBossDisplacement'),bossOutsideTicks:sum('bossOutsideTicks'),bossMasonryTicks:sum('bossMasonryTicks'),minimumRingWarningTicks:Math.min(...rows.map(r=>r.minimumRingWarningTicks)),peakRings:max('peakRings'),peakHostiles:max('peakHostiles'),changingGapAngleTicks:sum('changingGapAngleTicks'),nonmonotonicRadiusTicks:sum('nonmonotonicRadiusTicks'),allRequestedPhasesObserved:rows.every(r=>r.observedPhase===r.requestedPhase),rows,limits:['Actual-Game stationary invulnerable samples: 30 seconds per map/difficulty/requested-form/effective-phase. No rendered, personally played clear, final balance, performance/device/capacity or listening acceptance.','Expanding rings intentionally extend beyond the playable rectangle; this probe only checks the boss body against actual offset bounds/masonry.','Gap direction changes between casts are distinct from rotation during one ring lifetime. No old attack is called broken merely because it is stationary or uses shared generic emissions.','Read-only workspace evidence; no game source, asset, roster or quality-ledger credit.']};
fs.writeFileSync(new URL('./baseline.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
