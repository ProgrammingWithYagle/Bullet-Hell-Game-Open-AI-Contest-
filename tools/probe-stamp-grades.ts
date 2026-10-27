import {runtimeArena,runtimeArenas} from '../src/shared/arena-layouts.ts';
import {data} from '../src/shared/game.ts';
import {clerkStampCenters} from '../src/shared/clerk-placement.ts';
import {clerkAppealRules as r} from '../src/shared/clerk-appeal.ts';
import {distance,segmentRect} from '../src/shared/geometry.ts';
import {writeFileSync,mkdirSync} from 'node:fs';
const failures:object[]=[],rows:object[]=[];
let samples=0;
for(const map of runtimeArenas)for(const d of data.difficulties){
 const a=runtimeArena(map.id,d.id),b=a.bounds;
 for(const nx of [.15,.5,.85])for(const ny of [.25,.5,.75]){
  const target={x:b.x+b.width*nx,y:b.y+b.height*ny};
  if(a.obstacles.some(o=>segmentRect(target,target,o,9)))continue;
  for(const form of ['normal','brutal','crazed'] as const){
   const radius=r.stampRadii[form],count=r.stampCounts[form],gap=form==='normal'?radius*2+r.stampSeparation:r.advancedPreviousCenterGap,
    first=clerkStampCenters(b,a.obstacles,target,a.lavaPits,[],radius,count,gap),
    second=clerkStampCenters(b,a.obstacles,target,a.lavaPits,first,radius,count,gap);
   if(first.length!==count||second.length!==count)failures.push({map:map.id,difficulty:d.id,form,target,first:first.length,second:second.length});
   for(const set of [first,second])for(const p of set){
    if(a.obstacles.some(o=>segmentRect(p,p,o,radius+10)))throw Error('Stamp intersects masonry');
    if(a.lavaPits.some(l=>distance(p,l)<=radius+l.radius+10))throw Error('Stamp intersects lava');
    if(set.some(q=>p!==q&&distance(p,q)<=radius*2+r.stampSeparation))throw Error('Stamp packing overlaps');
   }
   rows.push({map:map.id,difficulty:d.id,form,first:first.length,second:second.length});samples++;
  }
 }
}
const report={passed:failures.length===0,samples,validTargets:samples/3,failures,rows,limits:['Connected placement only. No rendered, balance or device acceptance.']};
mkdirSync('reviews/banked-verdicts-2026-10-27',{recursive:true});
writeFileSync('reviews/banked-verdicts-2026-10-27/stamp-placement.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined}));if(!report.passed)process.exitCode=1;
