import fs from'node:fs';
import{pathToFileURL}from'node:url';
import{spawnSync}from'node:child_process';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)';
const source='c5c1b2c317cbf3b0f338a6be997f7bd3ee8221be';
const git=(args)=>{const r=spawnSync('git',['-c','core.bare=false',...args],{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error('Source guard failed');return r.stdout.trim();};
const head=git(['rev-parse','HEAD']);if(head!=='d6528fe8b18ab78efd7851c7d4c7bca31e6e00ab'||git(['diff',source,'--','src','content','locales']))throw Error('Unexpected baseline source');
const {createPracticeGame}=await import(pathToFileURL(root+'/src/shared/practice-start.ts').href);
const {data}=await import(pathToFileURL(root+'/src/shared/game.ts').href);
const {runtimeArenas}=await import(pathToFileURL(root+'/src/shared/arena-layouts.ts').href);
const {segmentRect}=await import(pathToFileURL(root+'/src/shared/geometry.ts').href);
const {PROTOCOL,CONTENT_REVISION}=await import(pathToFileURL(root+'/src/shared/protocol.ts').href);
const radius=data.bosses.find(b=>b.id==='matron').radius;
const rows=[];let totalTicks=0;
for(const map of runtimeArenas)for(const difficulty of data.difficulties)for(const form of['normal','brutal','crazed'])for(const phase of[0,1]){
 const g=createPracticeGame({mode:'endless',openingBossId:'matron',openingArenaId:map.id,difficulty:difficulty.id,seed:491},'Mara','soldier',form);g.start();for(const p of g.players.values())p.invulnerableUntil=1e9;if(phase)g.boss.health=g.boss.maxHealth*.49;
 const b=g.arena.bounds,origin={x:g.boss.x,y:g.boss.y};const nestIds=new Set(),minionIds=new Set(),healths=new Set(),speeds=new Set(),kinds=new Set();
 const row={map:map.id,difficulty:difficulty.id,requestedForm:form,effectiveForm:g.boss.variant,requestedPhase:phase,observedPhase:0,bounds:{...b},ticks:0,maximumBossDisplacement:0,peakNests:0,peakMinions:0,peakHostiles:0,bossOutsideTicks:0,bossMasonryTicks:0,nestOutsideIds:[],nestMasonryIds:[],minimumNestWarningTicks:Infinity};
 for(let i=0;i<1800&&g.phase==='combat';i++){
  g.step();row.ticks++;totalTicks++;row.observedPhase=g.boss.phase;row.maximumBossDisplacement=Math.max(row.maximumBossDisplacement,Math.hypot(g.boss.x-origin.x,g.boss.y-origin.y));
  if(g.boss.x-radius<b.x-.01||g.boss.x+radius>b.x+b.width+.01||g.boss.y-radius<b.y-.01||g.boss.y+radius>b.y+b.height+.01)row.bossOutsideTicks++;
  if(g.arena.obstacles.some(o=>segmentRect(g.boss,g.boss,o,radius-.2)!==null))row.bossMasonryTicks++;
  const cues=g.bossCues(),nests=cues.filter(c=>c.kind==='service-prop'&&c.role==='nest'&&c.health>0);row.peakNests=Math.max(row.peakNests,nests.length);row.peakMinions=Math.max(row.peakMinions,g.minions.actors.size);row.peakHostiles=Math.max(row.peakHostiles,[...g.shots.values()].filter(s=>s.owner==='hostile').length);
  for(const c of cues)kinds.add(c.kind);
  for(const nest of nests)if(!nestIds.has(nest.id)){
   nestIds.add(nest.id);healths.add(nest.maxHealth);row.minimumNestWarningTicks=Math.min(row.minimumNestWarningTicks,nest.at-g.combatTick);
   if(nest.x-nest.radius<b.x-.01||nest.x+nest.radius>b.x+b.width+.01||nest.y-nest.radius<b.y-.01||nest.y+nest.radius>b.y+b.height+.01)row.nestOutsideIds.push(nest.id);
   if(g.arena.obstacles.some(o=>segmentRect(nest,nest,o,nest.radius-.2)!==null))row.nestMasonryIds.push(nest.id);
  }
  for(const m of g.minions.actors.values())if(!minionIds.has(m.id)){minionIds.add(m.id);speeds.add(m.speed);}
 }
 Object.assign(row,{uniqueNests:nestIds.size,uniqueMinions:minionIds.size,nestMaximumHealth:[...healths].sort((a,b)=>a-b),minionSpeeds:[...speeds].sort((a,b)=>a-b),cueKinds:[...kinds].sort()});rows.push(row);
}
const report={kind:'Read-only Cradle Matron assessment; no implementation or quality credit',sourceCommit:source,metadataHead:head,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,cases:rows.length,totalTicks,peakNests:Math.max(...rows.map(r=>r.peakNests)),peakMinions:Math.max(...rows.map(r=>r.peakMinions)),peakHostiles:Math.max(...rows.map(r=>r.peakHostiles)),maximumBossDisplacement:Math.max(...rows.map(r=>r.maximumBossDisplacement)),bossOutsideTicks:rows.reduce((a,r)=>a+r.bossOutsideTicks,0),bossMasonryTicks:rows.reduce((a,r)=>a+r.bossMasonryTicks,0),casesWithNestOutside:rows.filter(r=>r.nestOutsideIds.length).length,casesWithNestMasonry:rows.filter(r=>r.nestMasonryIds.length).length,minimumNestWarningTicks:Math.min(...rows.map(r=>r.minimumNestWarningTicks)),rows,limits:['Stationary invulnerable actual-Game sequences; no rendered, played-clear, performance/capacity or final balance acceptance.','Full offset arena bounds and static masonry are measured. Existing generic phase/form/projectile pressure still applies.','No source changes, roster addition, new asset or quality credit.']};
fs.writeFileSync(new URL('./baseline.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
