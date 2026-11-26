import fs from 'node:fs';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)';
const sourceCommit='233e9143300989f43f986fdd5fe800975c3f88db';assert(/^[a-f0-9]{40}$/.test(sourceCommit));
const difficulty=process.argv[2]??'baby',restoreAtBoundaries=process.argv[3]==='restore';assert(['baby','normal'].includes(difficulty));const output=new URL('../../outputs/Traps-control-play-v5-'+difficulty+(restoreAtBoundaries?'-restored':'')+'.json',import.meta.url);assert(!fs.existsSync(output),'Preserve an existing pilot result');
const{chargeLegal,engineerRules:r}=await import(pathToFileURL(root+'/src/shared/engineer-pathways.ts').href);
const{Game,data}=await import(pathToFileURL(root+'/src/shared/game.ts').href),{idleInput,HZ}=await import(pathToFileURL(root+'/src/shared/protocol.ts').href),{moveBody,segmentRect}=await import(pathToFileURL(root+'/src/shared/geometry.ts').href);
const proof=JSON.parse(fs.readFileSync(root+'/reviews/engineer-controls-2026-11-04/source-verification.json','utf8')),walk=(d:string):string[]=>fs.readdirSync(root+'/'+d).sort().flatMap(n=>{const f=d+'/'+n;return fs.statSync(root+'/'+f).isDirectory()?walk(f):[f];}),hash=createHash('sha256');for(const f of walk('src').sort())hash.update(f+'\0').update(fs.readFileSync(root+'/'+f));assert.equal(hash.digest('hex'),proof.runtimeSourceSha256);
const plans=[
  {
    "id": "wire",
    "entry": "engineer-traps-1",
    "path": [
      "engineer-traps-wire-1",
      "engineer-traps-key-1",
      "engineer-traps-casings-1",
      "engineer-traps-haul-1",
      "engineer-traps-corridor-1"
    ],
    "support": [
      "general-sprint",
      "general-course-correction"
    ],
    "range": 220
  },
  {
    "id": "switch",
    "entry": "engineer-traps-1",
    "path": [
      "engineer-traps-switch-1",
      "engineer-traps-key-1",
      "engineer-traps-casings-1",
      "engineer-traps-haul-1",
      "engineer-traps-corridor-1"
    ],
    "support": [
      "general-sprint",
      "general-course-correction"
    ],
    "range": 220
  }
];
const rows=[];for(const plan of plans){
 let g=new Game({mode:'short',difficulty,seed:2209,maxPlayers:1,arenaSelection:'fixed',openingArenaId:'gatehouse'}),p=g.addPlayer('solo','Native pilot','engineer');let serial=0,sequence=0,lastPhase='',lastEncounter=-1,decision={x:0,y:0,danger:0};let goal:any,setupDone=false,setupStarted=0,released=false,hauled=false,before:any,request:any;const signals:any[]=[],seenCues=new Set<string>(),purchases:any[]=[],fights:any[]=[],sounds=new Set<string>(),restoredBoundaries=new Set<string>();
 const buy=(kind:string,item:string)=>{const result=g.transact(p.id,{id:'pilot-'+(++serial),kind,item});if(result.ok)purchases.push({kind,item,encounter:g.encounter,earnedSP:p.totalSp});return result.ok;};
 const shop=()=>{
   for(const item of ['engineer-constructs-1',plan.entry,...plan.path,...plan.support])if(!p.skills.includes(item))buy('skill',item);
   if(!p.supplies.some(s=>s.id==='medkit'&&s.count>0))buy('supply','medkit');
   const current=data.weapons.find(w=>w.id===p.weapon)!;for(const weapon of data.weapons.filter(w=>w.classId==='engineer'&&w.tier>current.tier).toSorted((a,b)=>b.tier-a.tier))if(buy('weapon',weapon.id))break;
   for(const item of ['damage','fire-rate','health','reload','magazine'])buy('upgrade',item);
   if(!p.supplies.some(s=>s.id==='medkit'&&s.count>0))buy('supply','medkit');
 };
 const steer=()=>{
   const boss=g.boss,dx=boss.x-p.x,dy=boss.y-p.y,dist=Math.hypot(dx,dy)||1,tangent={x:-dy/dist,y:dx/dist},speed=g.stats(p).speed,hostile=[...g.shots.values()].filter(s=>!g.players.has(s.owner)&&Math.hypot(s.x-p.x,s.y-p.y)<550);
   const candidates=[{x:0,y:0},...Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)}))];
   return candidates.map(move=>{
     const point=moveBody(p,{x:move.x*speed*.3,y:move.y*speed*.3},18,g.obstacles),vx=(point.x-p.x)/.3,vy=(point.y-p.y)/.3;let danger=0;
     for(const s of hostile){const rx=s.x-p.x,ry=s.y-p.y,ux=s.vx-vx,uy=s.vy-vy,t=Math.max(0,Math.min(.45,-(rx*ux+ry*uy)/(ux*ux+uy*uy||1))),near=Math.hypot(rx+ux*t,ry+uy*t)-s.radius-18;danger+=near<0?600:near<65?150/(near+4):0;}
     for(const warning of g.warnings)if(warning.kind==='zone'&&warning.until-g.combatTick<HZ&&Math.hypot(point.x-warning.x,point.y-warning.y)<warning.radius+24)danger+=350;
     for(const lava of g.arena.lavaPits)if(Math.hypot(point.x-lava.x,point.y-lava.y)<lava.radius+24)danger+=800;
     const range=Math.hypot(point.x-boss.x,point.y-boss.y),blocked=g.obstacles.some(w=>segmentRect(point,boss,w,3)!==null),moving=move.x!==0||move.y!==0;
     const score=(goal?Math.hypot(point.x-goal.x,point.y-goal.y)*.08:0)+danger+Math.abs(range-plan.range)*.035+(range<95?180:0)+(blocked?18:0)+(moving?-.7*(move.x*tangent.x+move.y*tangent.y):Math.abs(dist-plan.range)<55?-1.5:1);
     return{x:move.x,y:move.y,danger,score};
   }).sort((a,b)=>a.score-b.score)[0];
 };
 const limit=30*60*HZ;let iterations=0;while(!['victory','defeat'].includes(g.phase)&&g.combatTick<limit&&iterations++<limit+30000){
   if(g.phase!==lastPhase){lastPhase=g.phase;console.log(JSON.stringify({route:plan.id,phase:g.phase,encounter:g.encounter,seconds:Math.round(g.combatTick/HZ),health:p.health}));}
   if(['lobby','shop'].includes(g.phase))shop();
   if(restoreAtBoundaries&&g.phase!=='combat'&&!restoredBoundaries.has(g.encounter+':'+g.phase)){
     restoredBoundaries.add(g.encounter+':'+g.phase);const boundary=g.offlineCheckpoint();assert(boundary);const copy=Game.restoreOffline(structuredClone(boundary));assert.deepEqual(copy.offlineCheckpoint(),boundary);g=copy;p=g.players.get('solo')!;sequence=p.ack;
   }
   if(g.phase==='lobby'){assert(g.start());continue;}
   if(['mutationVote','contractVote'].includes(g.phase)&&!g.votes.has(p.id))assert(g.vote(p.id,0));
   if(g.phase==='secretOffer'){assert(g.vote(p.id,0));continue;}
   if(g.phase==='combat'){
     const now=g.combatTick,bossRadius=data.bosses.find(b=>b.id===g.boss.id)!.radius;
     if(g.encounter!==lastEncounter){lastEncounter=g.encounter;setupDone=false;setupStarted=Math.max(now,p.qAt);signals.push({type:"setup-start",tick:now,encounter:g.encounter,qReadyAt:p.qAt});released=false;hauled=false;fights.push({encounter:g.encounter,boss:g.boss.id,startedAt:now,earnedSP:p.totalSp,skills:[...p.skills],weapon:p.weapon,startingHealth:p.health});}
     const fork=p.skills.includes('engineer-traps-'+plan.id+'-1'),kit=g.kitStatus(p.id),cues=g.classCues(),plates=cues.filter((c:any)=>c.kind==='engineer-charge'&&c.owner===p.id&&c.state!=='spent'&&c.until>now) as any[],ready=plates.filter(m=>m.state==='ready'),pulse=now%15===0;
     if(!setupDone&&fork&&now-setupStarted>=28*HZ){signals.push({type:'setup-timeout',tick:now,encounter:g.encounter,plates:plates.map(m=>({id:m.id,state:m.state,life:m.until-now}))});setupDone=true;}
     const preparing=fork&&!setupDone;
     goal=undefined;
     if(preparing&&plates.length===1)goal={x:plates[0].x,y:plates[0].y};
     if(now%3===0)decision=steer();
     let aim=Math.atan2(g.boss.y-p.y,g.boss.x-p.x),q=false,one=false,two=false;
     const terrain={bounds:g.arena.bounds,lava:g.arena.lavaPits},context={terrain,obstacles:g.obstacles};
     const choose=(from:any,second:boolean)=>{
       const existing=plates[0],desired=second&&existing?(()=>{const dx=g.boss.x-existing.x,dy=g.boss.y-existing.y,len=Math.hypot(dx,dy)||1;return {x:g.boss.x+dx/len*(bossRadius+r.triggerRadius+8),y:g.boss.y+dy/len*(bossRadius+r.triggerRadius+8)};})():undefined;
       return Array.from({length:32},(_,i)=>{const angle=aim+i*Math.PI/16,point={x:p.x+Math.cos(angle)*r.chargeReach,y:p.y+Math.sin(angle)*r.chargeReach};const safe=!!kit.trapHeld||Math.hypot(point.x-g.boss.x,point.y-g.boss.y)>r.triggerRadius+bossRadius+8;
         const links=!second||!existing||(Math.hypot(point.x-existing.x,point.y-existing.y)<=r.wireReach&&Math.hypot(point.x-existing.x,point.y-existing.y)>r.chargeBodyRadius*2&&chargeLegal(point,existing,context,p.skills.includes('engineer-traps-corridor-1')?r.corridorRadius:r.wireRadius));
         const score=desired?Math.hypot(point.x-desired.x,point.y-desired.y):Math.abs(Math.atan2(Math.sin(angle-aim-Math.PI/6),Math.cos(angle-aim-Math.PI/6)))*100;
         return {angle,point,score,legal:safe&&links&&chargeLegal(point,from,context,r.corridorRadius)};
       }).filter(x=>x.legal).sort((a,b)=>a.score-b.score)[0];
     };
     if(!fork){q=p.qAt<=now&&(g.boss.health>g.boss.maxHealth*.25||g.encounter===4);}
     else if(preparing){
       if(plan.id==='switch'&&plates.length&&plates.some(m=>m.state!=='fuse')&&!kit.trapHeld&&p.qAt>now&&pulse)q=true;
       else if(p.qAt<=now&&plates.length<2&&pulse){const target=choose(p,plates.length===1);if(target){q=true;aim=target.angle;}}
       if(p.skills.includes('engineer-traps-haul-1')&&!hauled&&ready.length===1&&plates.length===1&&now%60===0&&Math.hypot(p.x-ready[0].x,p.y-ready[0].y)<=r.haulReach){const target=choose(ready[0],false);if(target&&Math.hypot(target.point.x-ready[0].x,target.point.y-ready[0].y)>30){q=false;two=true;aim=target.angle;}}
       if(ready.length===2&&pulse){
         if(p.skills.includes('engineer-traps-corridor-1')){q=false;two=false;one=true;}
         else if(plan.id==='switch'&&kit.trapHeld){q=true;two=false;}
       }
     }else{
       q=p.qAt<=now&&plates.length<2&&(g.boss.health>g.boss.maxHealth*.25||g.encounter===4);
       one=p.skills.includes('engineer-traps-key-1')&&pulse&&ready.some(m=>Math.hypot(m.x-g.boss.x,m.y-g.boss.y)<r.blastRadius+bossRadius||m.until-now<3*HZ);
     }
     aim=Math.atan2(Math.sin(aim),Math.cos(aim));
     const supply=p.health<p.maxHealth-35?p.supplies.findIndex(s=>s.id==='medkit'&&s.count>0):-1;
     before={phase:g.phase,encounter:g.encounter,tick:now,held:!!kit.trapHeld,plates,ready:ready.map(m=>m.id),oneAt:kit.technique1At??0};request={q,one,two,preparing};
     assert(g.submitInput(p.id,{...idleInput(),sequence:++sequence,clientTick:now,moveX:decision.x,moveY:decision.y,aim,fire:!preparing,q,e:p.eAt<=now&&(!preparing||decision.danger>500),ultimate:p.ultimateAt<=now&&!preparing,technique1:one,technique2:two,dodge:pulse&&decision.danger>150,sprint:decision.danger>200,supply,interact:p.status==='downed'}));
   }
   g.step();for(const e of g.drainEvents())if(e.type==='sound')sounds.add(e.id);
   if(before&&before.phase==='combat'&&g.phase==='combat'){
     const cues=g.classCues(),plates=cues.filter((c:any)=>c.kind==='engineer-charge'&&c.owner===p.id&&c.state!=='spent') as any[],kit=g.kitStatus(p.id);
     for(const m of plates)if(!before.plates.some((old:any)=>old.id===m.id))signals.push({type:'deployed',tick:g.combatTick,encounter:g.encounter,id:m.id,x:m.x,y:m.y,held:!!m.held});
     if(request.q&&before.held!==!!kit.trapHeld){signals.push({type:kit.trapHeld?'hold':'release',tick:g.combatTick,encounter:g.encounter,plates:plates.map(m=>m.id)});if(!kit.trapHeld){released=true;setupDone=true;}}
     for(const cue of cues){const key=cue.kind+':'+cue.id+':'+('impact'in cue?cue.impact:false);if(!seenCues.has(key)){seenCues.add(key);if(['engineer-wire','engineer-haul','engineer-corridor','engineer-jet'].includes(cue.kind))signals.push({type:cue.kind+('impact'in cue&&cue.impact?'-impact':''),tick:g.combatTick,encounter:g.encounter,id:cue.id});if(cue.kind==='engineer-haul')hauled=true;if(cue.kind==='engineer-wire'&&request.preparing)setupDone=true;}}
     const newFuses=plates.filter(m=>m.state==='fuse'&&before.plates.some((old:any)=>old.id===m.id&&old.state!=='fuse'));
     if(newFuses.length){signals.push({type:request.one?'remote-fuse':'automatic-fuse',tick:g.combatTick,encounter:g.encounter,ids:newFuses.map(m=>m.id)});if(newFuses.length===2||plan.id==='switch'&&released)setupDone=true;}
     if(plates.filter(m=>m.state==='ready').length===2&&!before.plates.every((m:any)=>m.state==='ready'))signals.push({type:'ready-pair',tick:g.combatTick,encounter:g.encounter,ids:plates.map(m=>m.id)});
   }
   before=undefined;

 }
 const result={signals,route:plan.id,sourceCommit:sourceCommit,mode:'short',difficulty,seed:2209,phase:g.phase,completedEncounters:g.encounter,combatSeconds:g.combatTick/HZ,damageDealt:p.damageDealt,damageTaken:p.damageTaken,endingHealth:p.health,earnedSP:p.totalSp,spentSP:p.skills.reduce((n,id)=>n+g.skillCost(id),0),skills:[...p.skills],purchases,fights,sounds:[...sounds].filter(s=>s.startsWith('engineer-')),cleared:g.phase==='victory',restoredBoundaries:[...restoredBoundaries]};rows.push(result);
 console.log(JSON.stringify({route:plan.id,phase:g.phase,clears:g.encounter,seconds:Math.round(g.combatTick/HZ),damageDealt:p.damageDealt,damageTaken:p.damageTaken}));
 fs.writeFileSync(output,JSON.stringify({checkedAt:new Date().toISOString(),sourceCommit:result.sourceCommit,runtimeSourceSha256:proof.runtimeSourceSha256,difficulty,rows,limits:['Autonomous policy trial of real Game inputs, actual damage and natural rewards/intermission clocks. No health/SP/currency injection, forced enemy completion, boss-timer edits, invulnerability or score submission. Fixed-step simulation runs faster than wall time; it is not a human playthrough.','A control-aware preparation policy on one seed/map at a selected difficulty cannot establish human fun or class balance. Failure may reveal policy limitations; do not tune the game merely to make this bot win. Complete human/rendered/device/native-language/listening/motion/final-balance acceptance remains open.']},null,2)+'\n');
}
if(restoreAtBoundaries){
 const baseline=JSON.parse(fs.readFileSync(new URL('../../outputs/Traps-control-play-v5-'+difficulty+'.json',import.meta.url),'utf8'));const comparisons=rows.map(row=>{const prior=baseline.rows.find((r:any)=>r.route===row.route);assert(prior);const fields=['signals','phase','completedEncounters','combatSeconds','damageDealt','damageTaken','endingHealth','earnedSP','spentSP','skills','purchases','fights','sounds'];const mismatches=fields.filter(k=>JSON.stringify((row as any)[k])!==JSON.stringify(prior[k]));return {route:row.route,restoredBoundaryCount:row.restoredBoundaries.length,exactRunOutcomeAndActionsMatch:mismatches.length===0,mismatches};});
 const report={checkedAt:new Date().toISOString(),sourceCommit:sourceCommit,difficulty,comparisons,passed:comparisons.every(c=>c.exactRunOutcomeAndActionsMatch),limits:'Same autonomous policy/seed/map, exact checkpoint restoration at safe phases, actual combat. A mismatch is a replay investigation lead; this is not human or final-balance acceptance.'};fs.writeFileSync(new URL('../../outputs/Traps-control-comparison-v5-'+difficulty+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
