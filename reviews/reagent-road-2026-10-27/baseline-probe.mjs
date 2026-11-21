import fs from'node:fs';import{pathToFileURL}from'node:url';import{spawnSync}from'node:child_process';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)',source='2f144868b114befcc39460241239c33dffbb3a78',metadata='e8ae1e09f0626cc0a2704ede25cc568f28f6d422';
const git=args=>{const r=spawnSync('git',['-c','core.bare=false',...args],{cwd:root,encoding:'utf8'});if(r.status)throw Error('Source guard failed');return r.stdout.trim();};if(git(['rev-parse','HEAD'])!==metadata||git(['diff',source,'--','src','content','locales']))throw Error('Unexpected current baseline source');
const{createPracticeGame}=await import(pathToFileURL(root+'/src/shared/practice-start.ts').href),{data}=await import(pathToFileURL(root+'/src/shared/game.ts').href),{runtimeArenas}=await import(pathToFileURL(root+'/src/shared/arena-layouts.ts').href),{encounterPhases,encounterVariant}=await import(pathToFileURL(root+'/src/shared/encounter-policy.ts').href),{segmentRect}=await import(pathToFileURL(root+'/src/shared/geometry.ts').href),{PROTOCOL,CONTENT_REVISION}=await import(pathToFileURL(root+'/src/shared/protocol.ts').href);
const rows=[];let totalTicks=0;const radius=data.bosses.find(b=>b.id==='alchemist').radius;
for(const map of runtimeArenas)for(const difficulty of data.difficulties)for(const form of['normal','brutal','crazed']){
 const effective=encounterVariant(difficulty.id,form),phases=encounterPhases('alchemist',effective);
 for(let phase=0;phase<phases.length;phase++){
  const g=createPracticeGame({mode:'endless',openingBossId:'alchemist',openingArenaId:map.id,difficulty:difficulty.id,seed:491},'Mara','soldier',form);g.start();for(const p of g.players.values())p.invulnerableUntil=1e9;if(phase)g.boss.health=g.boss.maxHealth*(phases[phase].healthThreshold-.01);
  const b=g.arena.bounds,origin={x:g.boss.x,y:g.boss.y},pools=new Map(),batches=new Map(),kinds=new Set();let peakPools=0,peakUniquePoolCenters=0,peakHostiles=0,maximumBossDisplacement=0,bossOutsideTicks=0,bossMasonryTicks=0,poolPlacementOutside=0,poolPlacementMasonry=0,minimumPoolWarningTicks=Infinity,duplicateLiveCentersTicks=0;
  for(let i=0;i<900&&g.phase==='combat';i++){
   g.step();totalTicks++;maximumBossDisplacement=Math.max(maximumBossDisplacement,Math.hypot(g.boss.x-origin.x,g.boss.y-origin.y));
   if(g.boss.x-radius<b.x-.01||g.boss.x+radius>b.x+b.width+.01||g.boss.y-radius<b.y-.01||g.boss.y+radius>b.y+b.height+.01)bossOutsideTicks++;
   if(g.arena.obstacles.some(o=>segmentRect(g.boss,g.boss,o,radius-.2)!==null))bossMasonryTicks++;
   const cues=g.bossCues(),current=cues.filter(q=>q.kind==='service-pool');peakPools=Math.max(peakPools,current.length);const centers=new Set(current.map(q=>q.x.toFixed(5)+':'+q.y.toFixed(5)));peakUniquePoolCenters=Math.max(peakUniquePoolCenters,centers.size);if(centers.size<current.length)duplicateLiveCentersTicks++;peakHostiles=Math.max(peakHostiles,[...g.shots.values()].filter(s=>s.owner==='hostile').length);
   for(const q of cues)kinds.add(q.kind);
   for(const q of current)if(!pools.has(q.id)){
    pools.set(q.id,{x:q.x,y:q.y,at:q.at,until:q.until});minimumPoolWarningTicks=Math.min(minimumPoolWarningTicks,q.at-g.combatTick);batches.set(q.at,(batches.get(q.at)??0)+1);
    if(q.x-q.radius<b.x-.01||q.x+q.radius>b.x+b.width+.01||q.y-q.radius<b.y-.01||q.y+q.radius>b.y+b.height+.01)poolPlacementOutside++;
    if(g.arena.obstacles.some(o=>segmentRect(q,q,o,q.radius-.2)!==null))poolPlacementMasonry++;
   }
  }
  rows.push({map:map.id,difficulty:difficulty.id,requestedForm:form,effectiveForm:g.boss.variant,requestedPhase:phase,observedPhase:g.boss.phase,bounds:{...b},maximumBossDisplacement,bossOutsideTicks,bossMasonryTicks,poolPlacementOutside,poolPlacementMasonry,minimumPoolWarningTicks,uniquePools:pools.size,batches:[...batches.values()],peakPools,peakUniquePoolCenters,duplicateLiveCentersTicks,peakHostiles,cueKinds:[...kinds].sort()});
 }
}
const sum=key=>rows.reduce((sum,r)=>sum+r[key],0),max=key=>Math.max(...rows.map(r=>r[key]));
const report={kind:'Read-only Mold Alchemist assessment; no implementation or quality credit',sourceCommit:source,metadataHead:metadata,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,cases:rows.length,totalTicks,maximumBossDisplacement:max('maximumBossDisplacement'),bossOutsideTicks:sum('bossOutsideTicks'),bossMasonryTicks:sum('bossMasonryTicks'),poolPlacementOutside:sum('poolPlacementOutside'),poolPlacementMasonry:sum('poolPlacementMasonry'),peakPools:max('peakPools'),peakHostiles:max('peakHostiles'),casesWithDuplicateLiveCenters:rows.filter(r=>r.duplicateLiveCentersTicks).length,minimumPoolWarningTicks:Math.min(...rows.map(r=>r.minimumPoolWarningTicks)),allRequestedPhasesObserved:rows.every(r=>r.observedPhase===r.requestedPhase),rows,limits:['Stationary invulnerable actual-Game samples, 30 seconds per effective form/phase/map/difficulty. No rendered observation, played clear, performance/capacity or final balance acceptance.','Full actual offset bounds and static masonry are measured. Repeated pool centers are an observation, not by themselves proof of a gameplay defect.','Existing generic projectile/form attacks still differ. No gameplay, asset, roster or quality credit.']};fs.writeFileSync(new URL('./baseline.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
