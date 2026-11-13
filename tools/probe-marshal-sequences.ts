import {createPracticeGame} from '../src/shared/practice-start.ts';
import {data} from '../src/shared/game.ts';
import {runtimeArenas} from '../src/shared/arena-layouts.ts';
import {marshalRules as r} from '../src/shared/marshal-chains.ts';
import {distance,segmentRect} from '../src/shared/geometry.ts';
import {PROTOCOL,CONTENT_REVISION} from '../src/shared/protocol.ts';
import {writeFileSync} from 'node:fs';
const rows:object[]=[];let cases=0,ticks=0,peakChains=0,peakBarbs=0,peakHostiles=0;
for(const map of runtimeArenas)for(const difficulty of data.difficulties)for(const selected of ['normal','brutal','crazed']as const)for(const phase of [0,1]){
 const g=createPracticeGame({openingBossId:'chain-marshal',openingArenaId:map.id,mode:'endless',difficulty:difficulty.id,seed:491},'Mara','soldier',selected);g.start();g.boss.deadline=1e9;g.players.get('solo')!.invulnerableUntil=1e9;
 const start={x:g.boss.x,y:g.boss.y};if(phase){g.boss.health=g.boss.maxHealth*.49;g.step();g.accord=null;g.boss.staggerUntil=0;}
 const ids=new Set<number>(),returns=new Set<number>(),locked=new Map<string,string>();let moved=0,maxCaseHostiles=0;
 for(let n=0;n<1800;n++){
  g.step();ticks++;moved=Math.max(moved,distance(g.boss,start));const cues=g.director.civic.marshal.cues(),chains=cues.filter(c=>c.kind==='chain'),barbs=cues.filter(c=>c.kind==='marshal-barbs');
  peakChains=Math.max(peakChains,chains.length);peakBarbs=Math.max(peakBarbs,barbs.length);
  if(chains.length>2||barbs.length>32)throw Error('Owned cue cap exceeded');
  for(const q of chains){
   ids.add(q.id);if(q.leg===2)returns.add(q.id);
   const text=JSON.stringify({x:q.x,y:q.y,at:q.at,endsAt:q.endsAt,start:q.startAngle,sweep:q.sweep,edge:q.edge}),key=q.id+':'+q.leg;
   if(locked.has(key)&&locked.get(key)!==text)throw Error('Warning moved within a leg');locked.set(key,text);
   if(q.edge.length!==76||q.width!==18)throw Error('Warning geometry changed');
   if(g.obstacles.some(o=>segmentRect(q,q,o,q.radius+10)))throw Error('Buried anchor');
   if(g.arena.lavaPits.some(p=>distance(q,p)<=q.radius+p.radius+10))throw Error('Anchor in lava');
  }
  for(const q of barbs){
   const text=JSON.stringify(q),key='barb:'+q.id;
   if(locked.has(key)&&locked.get(key)!==text)throw Error('Barb warning tracked');locked.set(key,text);
   if(q.at-q.beganAt!==36||q.angles.length>8)throw Error('Barb warning shortened or unbounded');
  }
  const hostiles=[...g.shots.values()].filter(s=>s.owner==='hostile').length;
  maxCaseHostiles=Math.max(maxCaseHostiles,hostiles);peakHostiles=Math.max(peakHostiles,hostiles);if(hostiles>4000)throw Error('Hostile cap exceeded');
 }
 if(ids.size<4)throw Error('Multiple signature pairs not observed');
 if(phase&&!returns.size)throw Error('No late return observed');if(!phase&&returns.size)throw Error('Early phase acquired extra return');
 if(phase&&moved<50||!phase&&moved>.001)throw Error('Missing phase movement distinction');
 rows.push({map:map.id,difficulty:difficulty.id,selected,actualForm:g.boss.variant,phase,observedTicks:1800,uniqueAnchors:ids.size,returningAnchors:returns.size,movedPixels:Math.round(moved*100)/100,peakHostiles:maxCaseHostiles});cases++;
 if(cases%36===0)console.log(JSON.stringify({map:map.id,completedCases:cases}));
}
const report={passed:true,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,cases,observedTicks:ticks,peakChains,peakBarbs,peakHostiles,rows,limits:['Actual Game sequences for all maps/difficulties/selected forms/phases with stationary invulnerable survivors. Actual damage and real client checks are separate tests.','Baby/Easy Standard assistance was removed only in late sequence samples; real assistance is checked separately.','No rendered, physical-device, native-language, listening, final balance, FPS, WAN, capacity or full-progression acceptance.']};
writeFileSync('reviews/shifting-writ-2026-10-27/sequences.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
