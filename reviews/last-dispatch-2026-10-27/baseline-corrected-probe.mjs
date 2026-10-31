import fs from'node:fs';
import{pathToFileURL}from'node:url';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)';
const {createPracticeGame}=await import(pathToFileURL(root+'/src/shared/practice-start.ts').href);
const {data}=await import(pathToFileURL(root+'/src/shared/game.ts').href);
const {runtimeArenas}=await import(pathToFileURL(root+'/src/shared/arena-layouts.ts').href);
const {segmentRect}=await import(pathToFileURL(root+'/src/shared/geometry.ts').href);
const radius=data.bosses.find(b=>b.id==='black-ambulance').radius;
const rows=[];let totalTicks=0,outsideTicks=0,masonryTicks=0;
for(const map of runtimeArenas)for(const difficulty of data.difficulties)for(const form of ['normal','brutal','crazed'])for(const phase of [0,1]){
 const g=createPracticeGame({mode:'endless',openingBossId:'black-ambulance',openingArenaId:map.id,difficulty:difficulty.id,seed:491},'Mara','soldier',form);
 g.start();for(const p of g.players.values())p.invulnerableUntil=1e9;if(phase)g.boss.health=g.boss.maxHealth*.49;
 const row={map:map.id,difficulty:difficulty.id,requestedForm:form,effectiveForm:g.boss.variant,phase,bounds:{...g.arena.bounds},stationaryPatrolTicks:0,longestStationaryPatrol:0,patrolTicks:0,ticks:0,outside:0,masonry:0,driverCues:0,minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,examples:[]};const driverIds=new Set();let consecutive=0;
 for(let i=0;i<1800&&g.phase==='combat';i++){
  const old={x:g.boss.x,y:g.boss.y};g.step();row.ticks++;totalTicks++;const b=g.boss;
  row.minX=Math.min(row.minX,b.x);row.maxX=Math.max(row.maxX,b.x);row.minY=Math.min(row.minY,b.y);row.maxY=Math.max(row.maxY,b.y);
  const bounds=g.arena.bounds;const outside=b.x-radius<bounds.x-.01||b.y-radius<bounds.y-.01||b.x+radius>bounds.x+bounds.width+.01||b.y+radius>bounds.y+bounds.height+.01;const cues=g.bossCues();if(!cues.some(q=>q.kind==="charge"||q.kind==="driver")){row.patrolTicks++;if(Math.hypot(b.x-old.x,b.y-old.y)<.01){row.stationaryPatrolTicks++;consecutive++;row.longestStationaryPatrol=Math.max(row.longestStationaryPatrol,consecutive);}else consecutive=0;}else consecutive=0;
  const masonry=g.arena.obstacles.some(o=>segmentRect(b,b,o,radius-.2));
  if(outside){row.outside++;outsideTicks++;if(row.examples.length<2)row.examples.push({tick:g.combatTick,x:b.x,y:b.y,outside,masonry});}
  if(masonry){row.masonry++;masonryTicks++;}
  for(const q of g.bossCues())if(q.kind==='driver')driverIds.add(q.id);
 }
 row.driverCues=driverIds.size;rows.push(row);
}
const result={kind:'Baseline assessment, not a quality implementation or balance acceptance',sourceCommit:'e84335c97cd4302b0d28e5455f23177286185486',cases:rows.length,totalTicks,outsideTicks,masonryTicks,casesOutside:rows.filter(r=>r.outside).length,casesMasonry:rows.filter(r=>r.masonry).length,rows,limits:['Stationary invulnerable actual-Game sequence sampling; not rendered, a played clear or final balance.','No source change or quality credit. Existing generic form attacks may differ even when the perimeter controller ignores phase.']};
const dest=new URL('./baseline-corrected.json',import.meta.url);fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,rows:undefined}));
