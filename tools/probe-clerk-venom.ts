import {createPracticeGame} from '../src/shared/practice-start.ts';
import {data} from '../src/shared/game.ts';
import {runtimeArenas} from '../src/shared/arena-layouts.ts';
import {clerkAppealRules} from '../src/shared/clerk-appeal.ts';
import {distance,segmentRect} from '../src/shared/geometry.ts';
import {PROTOCOL,CONTENT_REVISION} from '../src/shared/protocol.ts';
import {writeFileSync} from 'node:fs';
const rows:object[]=[];
let combinations=0,observedTicks=0,peakHostiles=0,peakStamps=0,peakWheels=0,peakBlocks=0;
for(const boss of ['tollkeeper','quarantine-clerk'] as const)for(const map of runtimeArenas){
 for(const difficulty of data.difficulties)for(const form of ['normal','brutal','crazed'] as const)for(const phase of [0,1]){
  const g=createPracticeGame({openingBossId:boss,openingArenaId:map.id,difficulty:difficulty.id,mode:'endless',seed:981},'Sequence audit','soldier',form);g.start();
  const player=g.players.get('solo')!;player.invulnerableUntil=1e9;g.boss.deadline=1e9;
  if(phase){g.boss.health=g.boss.maxHealth*.49;g.step();g.accord=null;}
  const b=g.arena.bounds,ids=new Set<number>(),locked=new Map<number,string>(),activeCounts=new Set<number>();
  let moved=0,banks=0,casePeakHostiles=0,casePeakStamps=0,casePeakWheels=0;
  const bankIds=new Set<number>();
  for(let n=0;n<1800;n++){
   const old={x:g.boss.x,y:g.boss.y};g.step();observedTicks++;
   const delta=distance(old,g.boss),radius=data.bosses.find(x=>x.id===boss)!.radius;
   moved+=delta;
   if(delta>(boss==='tollkeeper'?78:72)/30+.02)throw Error('Boss motion exceeds authored speed');
   if(delta&&g.obstacles.some(o=>segmentRect(old,g.boss,o,radius)))throw Error('Boss patrol crosses masonry');
   const cues=g.director.cues(),stamps=cues.filter(c=>c.kind==='stamp'),wheels=cues.filter(c=>c.kind==='wheel');
   casePeakStamps=Math.max(casePeakStamps,stamps.length);casePeakWheels=Math.max(casePeakWheels,wheels.length);
   peakStamps=Math.max(peakStamps,stamps.length);peakWheels=Math.max(peakWheels,wheels.length);
   peakBlocks=Math.max(peakBlocks,cues.filter(c=>c.kind==='clerk-block').length);
   if(stamps.length>clerkAppealRules.stampCounts[g.boss.variant]||wheels.length>1)throw Error('Live field/body cap exceeded');
   if(stamps.length)activeCounts.add(stamps.filter(s=>g.combatTick>=s.at&&g.combatTick<s.until).length);
   for(const s of stamps){
    ids.add(s.id);const text=JSON.stringify(s);if(locked.has(s.id)&&locked.get(s.id)!==text)throw Error('Stamp retargeted');locked.set(s.id,text);
    if(s.x-s.radius<b.x||s.y-s.radius<b.y||s.x+s.radius>b.x+b.width||s.y+s.radius>b.y+b.height)throw Error('Stamp outside board');
    if(g.obstacles.some(o=>segmentRect(s,s,o,s.radius+10)))throw Error('Stamp intersects masonry');
    if(g.arena.lavaPits.some(l=>distance(s,l)<=s.radius+l.radius+10))throw Error('Stamp intersects lava');
   }
   for(const w of wheels){
    ids.add(w.id);const geometry=JSON.stringify({path:w.path,at:w.at,until:w.until,radius:w.radius,banked:w.banked});
    if(locked.has(w.id)&&locked.get(w.id)!==geometry)throw Error('Wheel warning retargeted');locked.set(w.id,geometry);
    if(w.x-w.radius<b.x-.1||w.y-w.radius<b.y-.1||w.x+w.radius>b.x+b.width+.1||w.y+w.radius>b.y+b.height+.1)throw Error('Wheel leaves board');
    for(const point of w.path){
     if(Object.keys(point).sort().join(',')!=='x,y')throw Error('Wheel path exposes non-geometry state');
     if(point.x-w.radius<b.x-.1||point.y-w.radius<b.y-.1||point.x+w.radius>b.x+b.width+.1||point.y+w.radius>b.y+b.height+.1)throw Error('Wheel route outside board');
    }
   }
   for(const c of cues)if(c.kind==='tollkeeper-bank'){
    bankIds.add(c.id);if(c.at-c.beganAt!==36)throw Error('Bank warning shortened');
    const text=JSON.stringify(c);if(locked.has(c.id)&&locked.get(c.id)!==text)throw Error('Bank warning retargeted');locked.set(c.id,text);
   }
   const hostile=[...g.shots.values()].filter(s=>s.owner==='hostile').length;
   peakHostiles=Math.max(peakHostiles,hostile);casePeakHostiles=Math.max(casePeakHostiles,hostile);
   if(hostile>4000)throw Error('Hostile cap exceeded');
  }
  banks=bankIds.size;
  const expected=clerkAppealRules.stampCounts[g.boss.variant];
  if(ids.size<(boss==='quarantine-clerk'?expected*2:2))throw Error('Multiple sequences not observed');
  if(boss==='quarantine-clerk'&&!activeCounts.has(expected))throw Error('Requested simultaneous active field count not observed');
  if(phase&&moved<50||!phase&&moved>.001)throw Error('Phase movement distinction missing');
  if(boss==='tollkeeper'&&(phase||g.boss.variant!=='normal')&&!banks)throw Error('Bank stop never observed');
  rows.push({boss,map:map.id,difficulty:difficulty.id,selectedForm:form,actualForm:g.boss.variant,phase,observedTicks:1800,uniqueSignatureIds:ids.size,movedPixels:Math.round(moved*100)/100,banks,peakHostiles:casePeakHostiles,peakStamps:casePeakStamps,peakWheels:casePeakWheels});combinations++;
 }
 console.log(JSON.stringify({boss,map:map.id,completedCases:combinations}));
}
const report={passed:true,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,combinations,observedTicks,peakHostiles,peakStamps,peakWheels,peakBlocks,rows,limits:[
 'Actual Game sequences, geometry, warnings and finite caps. No rendered, final balance, native-language, listening, device, FPS, WAN, capacity or full-progression acceptance.',
 'Optional Baby/Easy Standard phase assistance removed only in sequence samples; real assistance is tested separately.',
 'Invulnerable stationary survivors isolate sequence geometry. Actual black damage, shielding, exposure and network replication are separate tests.',
]};
writeFileSync('reviews/clerk-venom-2026-10-27/all-sequences.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
