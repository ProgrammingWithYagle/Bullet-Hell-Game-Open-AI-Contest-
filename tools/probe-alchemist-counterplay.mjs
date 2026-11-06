import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createPracticeGame} from '../src/shared/practice-start.ts';
import {data} from '../src/shared/game.ts';
import {runtimeArenas} from '../src/shared/arena-layouts.ts';
import {encounterVariant,encounterPhases} from '../src/shared/encounter-policy.ts';
import {moldFree,moldWalls} from '../src/shared/mold-mixing.ts';
import {distance,segmentRect} from '../src/shared/geometry.ts';
import {PROTOCOL,CONTENT_REVISION} from '../src/shared/protocol.ts';
const output=process.argv[2]??'reviews/alchemist-lab-2026-10-27/counterplay.json',rows=[];let ticks=0;
function witness(map,difficulty,form,mode){
 const effective=encounterVariant(difficulty,form),g=createPracticeGame({mode:'endless',openingBossId:'alchemist',openingArenaId:map,difficulty,seed:491},'Mara','soldier',form);g.start();g.boss.deadline=1e9;for(const p of g.players.values())p.invulnerableUntil=1e9;
 g.boss.health=g.boss.maxHealth*(encounterPhases('alchemist',effective)[2].healthThreshold-.01);while(g.boss.phase<2)g.step();
 let acid=null,far=null,baseLocked=false,waterSeen=false,cooled=false,quench=false,eruption=false,coupledSeen=false,firstPair=[],canceledPair=false,placements=0,maximumPlacement=0;
 const place=point=>{if(!point)return;const walls=moldWalls(g.signatureContext());assert(walls.every(o=>segmentRect(point,point,o,9)===null),'Controlled bait point is not body-clear');for(const p of g.players.values()){maximumPlacement=Math.max(maximumPlacement,distance(p,point));p.x=point.x;p.y=point.y;p.oldX=point.x;p.oldY=point.y;}placements++;};
 for(let n=0;n<900;n++){
  const before=g.bossCues(),pools=before.filter(q=>q.kind==='mold-pool'&&q.until>g.combatTick),water=pools.find(q=>q.reagent==='water'&&!q.spentAt);
  acid??=pools.find(q=>q.reagent==='acid'&&q.index===0);
  if(mode==='eruption'&&acid){
   if(before.some(q=>q.kind==='mold-flask'&&q.reagent==='alkali'))baseLocked=true;
   if(!baseLocked){
    if(!far){const context=g.signatureContext();for(let i=0;i<32&&!far;i++){const a=i*Math.PI/16,candidate=moldFree(context,{x:acid.x+Math.cos(a)*500,y:acid.y+Math.sin(a)*500},78);if(candidate&&pools.filter(q=>q.reagent==='acid').every(q=>distance(q,candidate)>360))far=candidate;}assert(far,'No clear opposite-throw bait point');}
    place(far);
   }else place(acid);
  }else if(water)place(water);else if(acid)place(acid);
  g.step();ticks++;const cues=g.bossCues();assert.equal([...g.shots.values()].filter(q=>q.owner==='hostile').length,0);
  const pair=cues.find(q=>q.kind==='mold-reaction'&&q.type==='coupled');if(pair&&!firstPair.length){firstPair=[...pair.sources];coupledSeen=true;}
  waterSeen ||= cues.some(q=>q.kind==='mold-pool'&&q.reagent==='water');cooled ||= cues.some(q=>q.kind==='mold-reactor'&&q.state==='cooled');quench ||= cues.some(q=>q.kind==='mold-pool'&&q.reagent==='water'&&q.spentAt>0);
  const reaction=cues.find(q=>q.kind==='mold-reaction'&&q.type==='catalytic');if(reaction){assert.equal(reaction.at-reaction.beganAt,45);eruption=true;}
  if(waterSeen&&firstPair.length&&!cues.some(q=>q.kind==='mold-reaction'&&q.sources.some(id=>firstPair.includes(id))))canceledPair=true;
  if(mode==='mix'&&waterSeen&&cooled&&(effective==='normal'||canceledPair))break;
  if(mode==='quench'&&quench&&cooled)break;
  if(mode==='eruption'&&eruption)break;
 }
 const row={map,difficulty,requestedForm:form,effectiveForm:effective,phase:2,mode,waterSeen,cooled,quench,eruption,coupledSeen,canceledPair,placements,maximumPlacement,headlessControlledPlacement:true};
 if(mode==='mix')assert(waterSeen&&cooled&&(effective==='normal'||canceledPair),JSON.stringify(row));
 if(mode==='quench')assert(quench&&waterSeen&&cooled,JSON.stringify(row));
 if(mode==='eruption')assert(eruption,JSON.stringify(row));rows.push(row);
}
for(const map of runtimeArenas)for(const d of data.difficulties){
 for(const form of ['normal','brutal','crazed'])witness(map.id,d.id,form,'mix');
 if(encounterVariant(d.id,'crazed')==='crazed'){witness(map.id,d.id,'crazed','quench');witness(map.id,d.id,'crazed','eruption');}
}
const report={passed:true,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,cases:rows.length,ticks,mixingCases:rows.filter(r=>r.mode==='mix').length,quenchingCases:rows.filter(r=>r.mode==='quench').length,eruptionCases:rows.filter(r=>r.mode==='eruption').length,rows,limits:['Actual Game mechanics with controlled repositioning onto verified body-clear bait points. This verifies reaction outcomes, not a player-controlled route, personally played clear or final balance.','Mixing/cooling and advanced pair cancellation cover all maps/difficulties/requested forms. Catalyst choices cover every map/global difficulty that actually admits Crazed; Insane forces Brutal.','Invulnerability and controlled positioning are explicit. No rendered, physical-device, native-language, listening, WAN/capacity or performance acceptance.']};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
