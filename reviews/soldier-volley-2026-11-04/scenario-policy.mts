import fs from'node:fs';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)',chat='C:/Users/yigal/Documents/Codex/2026-11-02/continue-developing-grave-accord-in-this';
const{Game,data}=await import(pathToFileURL(root+'/src/shared/game.ts').href),{idleInput,HZ}=await import(pathToFileURL(root+'/src/shared/protocol.ts').href),{moveBody,segmentRect}=await import(pathToFileURL(root+'/src/shared/geometry.ts').href);
const walk=(d:string):string[]=>fs.readdirSync(root+'/'+d).sort().flatMap(n=>{const f=d+'/'+n;return fs.statSync(root+'/'+f).isDirectory()?walk(f):[f];}),hasher=createHash('sha256');for(const f of walk('src').sort())hasher.update(f+'\0').update(fs.readFileSync(root+'/'+f));const runtime=hasher.digest('hex');
const scenarioSeed=Number(process.argv[2]),scenarioMap=process.argv[3];assert([3113,9027].includes(scenarioSeed)&&['gatehouse','triage-yard'].includes(scenarioMap));
const label=scenarioMap+'-'+scenarioSeed;
const restore=false,output=chat+'/outputs/Soldier-volley-scenario-v2-'+label+(restore?'-restored':'')+'.json';assert(!fs.existsSync(output),'Preserve previous report');
const fingerprint=chat+'/work/soldier-volley-stage/scenario-runtime-v2-'+label+'.txt';if(restore)assert.equal(fs.readFileSync(fingerprint,'utf8').trim(),runtime);else fs.writeFileSync(fingerprint,runtime+'\n',{flag:'wx'});
const rows=[];for(const route of['full-reload','ready','passing','advance','rear']){
 const base=['soldier-ballistics-1','soldier-skirmisher-1','soldier-command-1','soldier-command-2','soldier-command-3'];
 const skills=route==='full-reload'?[...base,'general-sprint','general-course-correction','general-brake-step','general-double-dash','soldier-ballistics-2','soldier-command-path-2-1','soldier-command-path-1-1']:
 route==='ready'?[...base,'soldier-skirmisher-drill-1','general-sprint','soldier-skirmisher-roving-1','general-course-correction','soldier-skirmisher-ready-1','general-brake-step','soldier-command-path-1-1']:
 route==='passing'?[...base,'soldier-skirmisher-drill-1','general-sprint','soldier-skirmisher-roving-1','soldier-skirmisher-ready-1','soldier-skirmisher-volley-1']:
 ['soldier-ballistics-1','soldier-skirmisher-1','soldier-skirmisher-'+route+'-1','general-sprint','soldier-command-1','soldier-skirmisher-drill-1','general-course-correction','soldier-skirmisher-roving-1','soldier-skirmisher-ready-1','soldier-skirmisher-volley-1'];
 const loadingSignals:any[]=[],rounds:any[]=[],loadById=new Map<number,any>(),readySignals:any[]=[],readySeen=new Set<number>();

 let g=new Game({mode:'short',difficulty:'normal',seed:scenarioSeed,maxPlayers:1,arenaSelection:'fixed',openingArenaId:scenarioMap}),p=g.addPlayer('solo','Native Soldier pilot','soldier'),serial=0,sequence=0,lastPhase='',lastEncounter=-1,decision={x:0,y:0,danger:0};const purchases:any[]=[],fights:any[]=[],signals:any[]=[],seen=new Set<number>(),boundaries=new Set<string>();
 const buy=(kind:string,item:string)=>{const r=g.transact(p.id,{id:'soldier-pilot-'+(++serial),kind,item});if(r.ok)purchases.push({kind,item,encounter:g.encounter,earnedSP:p.totalSp});return r.ok;};
 const shop=()=>{for(const item of skills)if(!p.skills.includes(item))buy('skill',item);const current=data.weapons.find(w=>w.id===p.weapon)!;for(const w of data.weapons.filter(w=>w.classId==='soldier'&&w.tier>current.tier).toSorted((a,b)=>b.tier-a.tier))if(buy('weapon',w.id))break;for(const u of['damage','fire-rate','health','reload','magazine'])buy('upgrade',u);if(!p.supplies.some(s=>s.id==='medkit'&&s.count>0))buy('supply','medkit');};
 const steer=()=>{
  const boss=g.boss,dx=boss.x-p.x,dy=boss.y-p.y,dist=Math.hypot(dx,dy)||1,tangent={x:-dy/dist,y:dx/dist},speed=g.stats(p).speed,hostile=[...g.shots.values()].filter(s=>!g.players.has(s.owner)&&Math.hypot(s.x-p.x,s.y-p.y)<550);
  return[{x:0,y:0},...Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)}))].map(move=>{
   const point=moveBody(p,{x:move.x*speed*.3,y:move.y*speed*.3},18,g.obstacles),vx=(point.x-p.x)/.3,vy=(point.y-p.y)/.3;let danger=0;
   for(const s of hostile){const rx=s.x-p.x,ry=s.y-p.y,ux=s.vx-vx,uy=s.vy-vy,t=Math.max(0,Math.min(.45,-(rx*ux+ry*uy)/(ux*ux+uy*uy||1))),near=Math.hypot(rx+ux*t,ry+uy*t)-s.radius-18;danger+=near<0?600:near<65?150/(near+4):0;}
   for(const w of g.warnings)if(w.kind==='zone'&&w.until-g.combatTick<HZ&&Math.hypot(point.x-w.x,point.y-w.y)<w.radius+24)danger+=350;
   for(const lava of g.arena.lavaPits)if(Math.hypot(point.x-lava.x,point.y-lava.y)<lava.radius+24)danger+=800;
   const range=Math.hypot(point.x-boss.x,point.y-boss.y),blocked=g.obstacles.some(w=>segmentRect(point,boss,w,3)!==null),moving=move.x!==0||move.y!==0;
   return{x:move.x,y:move.y,danger,score:danger+Math.abs(range-300)*.035+(range<95?180:0)+(blocked?18:0)+(moving?-.7*(move.x*tangent.x+move.y*tangent.y):Math.abs(dist-300)<55?-1.5:1)};
  }).sort((a,b)=>a.score-b.score)[0];
 };
 let iterations=0;const limit=30*60*HZ;while(!['victory','defeat'].includes(g.phase)&&g.combatTick<limit&&iterations++<limit+30000){
  if(lastPhase!==g.phase){lastPhase=g.phase;console.log(JSON.stringify({route,phase:g.phase,encounter:g.encounter,seconds:Math.round(g.combatTick/HZ)}));}
  if(['lobby','shop'].includes(g.phase))shop();
  if(restore&&g.phase!=='combat'&&!boundaries.has(g.encounter+':'+g.phase)){boundaries.add(g.encounter+':'+g.phase);const save=g.offlineCheckpoint();assert(save);const copy=Game.restoreOffline(structuredClone(save));assert.deepEqual(copy.offlineCheckpoint(),save);g=copy;p=g.players.get('solo')!;sequence=p.ack;}
  if(g.phase==='lobby'){assert(g.start());continue;}
  if(['mutationVote','contractVote'].includes(g.phase)&&!g.votes.has(p.id))assert(g.vote(p.id,0));if(g.phase==='secretOffer'){assert(g.vote(p.id,0));continue;}
  if(g.phase==='combat'){
   const now=g.combatTick;if(g.encounter!==lastEncounter){lastEncounter=g.encounter;fights.push({encounter:g.encounter,boss:g.boss.id,startedAt:now,earnedSP:p.totalSp,skills:[...p.skills],weapon:p.weapon,startingHealth:p.health});}
   if(now%3===0)decision=steer();const aim=Math.atan2(g.boss.y-p.y,g.boss.x-p.x),kit=g.kitStatus(p.id),range=Math.hypot(g.boss.x-p.x,g.boss.y-p.y),opening=(kit.soldierFollowupUntil??0)>now;
   const cap=p.skills.includes('soldier-skirmisher-volley-1'),paid=(kit.soldierReadyUntil??0)>now&&p.ammo>0&&((kit.technique1At??0)<=now||cap),
     normal=opening&&(kit.technique1At??0)<=now,one=(normal||paid)&&(kit.soldierStepUntil??0)<=now&&decision.danger<150&&(route!=='advance'||range>200)&&(route!=='rear'||range<580),moving=Math.hypot(decision.x,decision.y)>0;
   const loading=(kit.soldierLoadUntil??0)>now,stop=loading&&!cap&&(kit.soldierLoadInserted??0)>=2,
     begin=route!=='full-reload'&&p.skills.includes('soldier-skirmisher-drill-1')&&!loading&&(kit.technique2At??0)<=now&&p.ammo<=2&&p.overdriveUntil<=now;
   const freshBurst=p.eAt<=now&&(!loading||p.skills.includes('soldier-skirmisher-roving-1'))&&!(one&&paid);
   const moveX=one&&!moving?-Math.sin(aim):decision.x,moveY=one&&!moving?Math.cos(aim):decision.y,
     castAim=one&&route==='advance'&&range<300?Math.atan2(moveY,moveX):aim,
     supply=p.health<p.maxHealth-35?p.supplies.findIndex(s=>s.id==='medkit'&&s.count>0):-1;
   assert(g.submitInput(p.id,{...idleInput(),sequence:++sequence,clientTick:now,moveX,moveY,aim:castAim,fire:true,q:p.qAt<=now,e:freshBurst,ultimate:p.ultimateAt<=now,technique1:one,technique2:begin||stop,dodge:now%15===0&&decision.danger>150,sprint:decision.danger>200,supply,interact:p.status==='downed'}));
  }
  g.step();for(const event of g.drainEvents())if(event.type==='sound'&&event.owner===p.id&&event.id==='soldier-load-round')rounds.push({encounter:g.encounter,tick:g.combatTick});
  for(const cue of g.classCues()){
    if(cue.kind==='soldier-step'&&!seen.has(cue.id)){seen.add(cue.id);signals.push({encounter:g.encounter,tick:g.combatTick,mode:cue.mode,at:cue.at,until:cue.until,loaded:cue.loaded??false,relay:cue.relay??false});}
    if(cue.kind==='soldier-ready'&&!readySeen.has(cue.id)){readySeen.add(cue.id);readySignals.push({encounter:g.encounter,id:cue.id,at:cue.at,until:cue.until,relay:cue.relay});}
    if(cue.kind==='soldier-load'){
      let row=loadById.get(cue.id);if(!row){row={encounter:g.encounter,id:cue.id,at:cue.at,until:cue.until,total:cue.total,roving:cue.roving,maxObservedInserted:0};loadById.set(cue.id,row);loadingSignals.push(row);}
      row.maxObservedInserted=Math.max(row.maxObservedInserted,cue.loaded);
    }
  }
 }
 const row={route,phase:g.phase,completedEncounters:g.encounter,combatSeconds:g.combatTick/HZ,damageDealt:p.damageDealt,damageTaken:p.damageTaken,endingHealth:p.health,earnedSP:p.totalSp,spentSP:p.skills.reduce((n,id)=>n+g.skillCost(id),0),skills:[...p.skills],purchases,fights,signals,loadingSignals,rounds,readySignals,restoredBoundaryCount:boundaries.size};rows.push(row);console.log(JSON.stringify({route,phase:g.phase,clears:g.encounter,seconds:row.combatSeconds,steps:signals.length,drills:loadingSignals.length,insertedRounds:rounds.length,paidSteps:signals.filter(s=>s.loaded).length,relaySteps:signals.filter(s=>s.relay).length}));
 fs.writeFileSync(output,JSON.stringify({checkedAt:new Date().toISOString(),baseMetadata:'7fa20d0612b158f8d3ad9c6064d53e98a92ae3ff',runtimeSourceSha256:runtime,build:'2026.11.04-soldier-running-volley',protocol:57,difficulty:'normal',seed:scenarioSeed,arena:scenarioMap,rows,limits:['Actual native shared-Game inputs, real health/enemy completion, natural rewards/purchases and intermission clocks. No resource/health injection, forced completion, deadline edits, invulnerability or score upload. Fixed-step policy is not human play.','One seed/map/policy cannot establish route balance or enjoyment. These compare ordinary full reload, Ready Round with General support and three Running Volley variants. Support spending and route commitments differ. They are one Skirmisher region, not a complete Soldier class. Clear times do not rank the choices.','Input sequence is reseeded from the restored player acknowledgment at safe boundaries; this is transport harness state, not gameplay ownership.']},null,2)+'\n');
 }
 if(restore){const baseline=JSON.parse(fs.readFileSync(chat+'/outputs/Soldier-volley-combat-normal.json','utf8'));assert.equal(baseline.runtimeSourceSha256,runtime);const comparisons=rows.map(row=>{const original=baseline.rows.find((r:any)=>r.route===row.route);assert(original);const mismatches=Object.keys(row).filter(k=>k!=='restoredBoundaryCount'&&JSON.stringify((row as any)[k])!==JSON.stringify(original[k]));return{route:row.route,safeRestores:row.restoredBoundaryCount,measuredOutcomeAndActionsMatch:!mismatches.length,mismatches};});const report={checkedAt:new Date().toISOString(),runtimeSourceSha256:runtime,build:'2026.11.04-soldier-running-volley',comparisons,passed:comparisons.every(r=>r.measuredOutcomeAndActionsMatch),limits:'Same autonomous policy and fixed seed; no human/rendered/device/final-balance acceptance is inferred.'};fs.writeFileSync(chat+'/outputs/Soldier-volley-combat-comparison.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
