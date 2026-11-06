import fs from'node:fs';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)',chat='C:/Users/yigal/Documents/Codex/2026-11-02/continue-developing-grave-accord-in-this';
const {Game,data}=await import(pathToFileURL(root+'/src/shared/game.ts').href),{idleInput,HZ,PROTOCOL,CONTENT_REVISION}=await import(pathToFileURL(root+'/src/shared/protocol.ts').href),{moveBody,segmentRect,segmentCircle}=await import(pathToFileURL(root+'/src/shared/geometry.ts').href);
const walk=(d:string):string[]=>fs.readdirSync(root+'/'+d).sort().flatMap(n=>{const f=d+'/'+n;return fs.statSync(root+'/'+f).isDirectory()?walk(f):[f];}),hash=createHash('sha256');for(const f of walk('src').sort())hash.update(f+'\0').update(fs.readFileSync(root+'/'+f));const runtime=hash.digest('hex');
const restore=process.argv[2]==='restore',seed=Number(process.argv[3]??2209),map=process.argv[4]??'gatehouse';assert([2209,9027].includes(seed));assert(['gatehouse','triage-yard'].includes(map));
const stem='Soldier-marksman-combat-'+map+'-'+seed,output=chat+'/outputs/'+stem+(restore?'-restored':'')+'.json';assert(!fs.existsSync(output));
const fingerprint=chat+'/work/soldier-marksman-stage/runtime-'+map+'-'+seed+'.txt';if(restore)assert.equal(fs.readFileSync(fingerprint,'utf8').trim(),runtime);else fs.writeFileSync(fingerprint,runtime+'\n',{flag:'wx'});
const rows:any[]=[];
for(const route of ['general','skirmisher','marksman']){
  const skills=['soldier-ballistics-1',...(route==='general'?[]:[route==='marksman'?'soldier-marksman-1':'soldier-skirmisher-1']),'soldier-command-1','soldier-command-2','soldier-command-3','general-sprint','general-course-correction','general-brake-step','general-double-dash','soldier-ballistics-2','soldier-command-path-2-1','soldier-command-path-1-1'];
  let g=new Game({mode:'short',difficulty:'normal',seed,maxPlayers:1,arenaSelection:'fixed',openingArenaId:map}),p=g.addPlayer('solo','Native Soldier pilot','soldier'),serial=0,sequence=0,lastPhase='',lastEncounter=-1,decision={x:0,y:0,danger:0};
  const purchases:any[]=[],fights:any[]=[],casts:any[]=[],banks:any[]=[],steps:any[]=[],seen=new Set<number>(),stepSeen=new Set<number>(),boundaries=new Set<string>();
  const buy=(kind:string,item:string)=>{const r=g.transact(p.id,{id:'marksman-pilot-'+(++serial),kind,item});if(r.ok)purchases.push({kind,item,encounter:g.encounter,earnedSP:p.totalSp});return r.ok;};
  const shop=()=>{for(const item of skills)if(!p.skills.includes(item))buy('skill',item);const current=data.weapons.find(w=>w.id===p.weapon)!;for(const w of data.weapons.filter(w=>w.classId==='soldier'&&w.tier>current.tier).toSorted((a,b)=>b.tier-a.tier))if(buy('weapon',w.id))break;for(const u of ['damage','fire-rate','health','reload','magazine'])buy('upgrade',u);if(!p.supplies.some(s=>s.id==='medkit'&&s.count>0))buy('supply','medkit');};
  // Same conservative18px steering heuristic as the preceding Soldier pilot; actual game radius remains9.
  const steer=()=>{
    const boss=g.boss,dx=boss.x-p.x,dy=boss.y-p.y,dist=Math.hypot(dx,dy)||1,tangent={x:-dy/dist,y:dx/dist},speed=g.stats(p).speed,hostile=[...g.shots.values()].filter(s=>!g.players.has(s.owner)&&Math.hypot(s.x-p.x,s.y-p.y)<550);
    return [{x:0,y:0},...Array.from({length:16},(_,i)=>({x:Math.cos(i*Math.PI/8),y:Math.sin(i*Math.PI/8)}))].map(move=>{
      const point=moveBody(p,{x:move.x*speed*.3,y:move.y*speed*.3},18,g.obstacles),vx=(point.x-p.x)/.3,vy=(point.y-p.y)/.3;let danger=0;
      for(const s of hostile){const rx=s.x-p.x,ry=s.y-p.y,ux=s.vx-vx,uy=s.vy-vy,t=Math.max(0,Math.min(.45,-(rx*ux+ry*uy)/(ux*ux+uy*uy||1))),near=Math.hypot(rx+ux*t,ry+uy*t)-s.radius-18;danger+=near<0?600:near<65?150/(near+4):0;}
      for(const w of g.warnings)if(w.kind==='zone'&&w.until-g.combatTick<HZ&&Math.hypot(point.x-w.x,point.y-w.y)<w.radius+24)danger+=350;
      for(const lava of g.arena.lavaPits)if(Math.hypot(point.x-lava.x,point.y-lava.y)<lava.radius+24)danger+=800;
      const range=Math.hypot(point.x-boss.x,point.y-boss.y),blocked=g.obstacles.some(w=>segmentRect(point,boss,w,3)!==null),moving=move.x!==0||move.y!==0;
      return {x:move.x,y:move.y,danger,score:danger+Math.abs(range-300)*.035+(range<95?180:0)+(blocked?18:0)+(moving?-.7*(move.x*tangent.x+move.y*tangent.y):Math.abs(dist-300)<55?-1.5:1)};
    }).sort((a,b)=>a.score-b.score)[0];
  };
  // Harness-only angle planning. The game receives an ordinary aim and has no assisted targeting.
  const bankAim=()=>{
    const target=g.boss,r=4,options:any[]=[];
    for(const wall of g.obstacles)for(const face of [{axis:'x',value:wall.x-r,normal:{x:-1,y:0},lo:wall.y-r,hi:wall.y+wall.height+r},{axis:'x',value:wall.x+wall.width+r,normal:{x:1,y:0},lo:wall.y-r,hi:wall.y+wall.height+r},{axis:'y',value:wall.y-r,normal:{x:0,y:-1},lo:wall.x-r,hi:wall.x+wall.width+r},{axis:'y',value:wall.y+wall.height+r,normal:{x:0,y:1},lo:wall.x-r,hi:wall.x+wall.width+r}]){
      const axis=face.axis as 'x'|'y',other=axis==='x'?'y':'x',side=face.normal[axis];if((p[axis]-face.value)*side<=0||(target[axis]-face.value)*side<=0)continue;
      const mirror={x:target.x,y:target.y};mirror[axis]=2*face.value-target[axis];const t=(face.value-p[axis])/(mirror[axis]-p[axis]);if(t<=0||t>=1)continue;
      const contact={x:p.x+(mirror.x-p.x)*t,y:p.y+(mirror.y-p.y)*t};if(contact[other]<=face.lo+1||contact[other]>=face.hi-1)continue;
      const path=Math.hypot(contact.x-p.x,contact.y-p.y)+Math.hypot(target.x-contact.x,target.y-contact.y);if(path>900*1.6-30)continue;
      const first=g.obstacles.map(w=>({w,hit:segmentRect(p,mirror,w,r)})).filter(row=>row.hit).sort((a,b)=>a.hit!.t-b.hit!.t)[0];if(!first||first.w!==wall||Math.abs(first.hit!.t-t)>1e-5)continue;
      const departure={x:contact.x+face.normal.x*.001,y:contact.y+face.normal.y*.001};if(g.obstacles.some(w=>segmentRect(departure,target,w,r)!==null))continue;
      const radius=data.bosses.find(b=>b.id===g.boss.id)!.radius+r;if(segmentCircle(p,contact,target,radius)!==null)continue;
      options.push({aim:Math.atan2(contact.y-p.y,contact.x-p.x),path,contact});
    }
    return options.sort((a,b)=>a.path-b.path)[0];
  };
  let iterations=0;const limit=30*60*HZ;
  while(!['victory','defeat'].includes(g.phase)&&g.combatTick<limit&&iterations++<limit+30000){
    if(lastPhase!==g.phase){lastPhase=g.phase;console.log(JSON.stringify({route,map,seed,phase:g.phase,encounter:g.encounter,seconds:Math.round(g.combatTick/HZ)}));}
    if(['lobby','shop'].includes(g.phase))shop();
    if(restore&&g.phase!=='combat'&&!boundaries.has(g.encounter+':'+g.phase)){boundaries.add(g.encounter+':'+g.phase);const save=g.offlineCheckpoint();assert(save);const copy=Game.restoreOffline(structuredClone(save));assert.deepEqual(copy.offlineCheckpoint(),save);g=copy;p=g.players.get('solo')!;sequence=p.ack;}
    if(g.phase==='lobby'){assert(g.start());continue;}
    if(['mutationVote','contractVote'].includes(g.phase)&&!g.votes.has(p.id))assert(g.vote(p.id,0));if(g.phase==='secretOffer'){assert(g.vote(p.id,0));continue;}
    if(g.phase==='combat'){
      const now=g.combatTick;if(g.encounter!==lastEncounter){lastEncounter=g.encounter;fights.push({encounter:g.encounter,boss:g.boss.id,startedAt:now,earnedSP:p.totalSp,skills:[...p.skills],weapon:p.weapon,startingHealth:p.health});}
      if(now%3===0)decision=steer();const kit=g.kitStatus(p.id),aim=Math.atan2(g.boss.y-p.y,g.boss.x-p.x),bank=route==='marksman'&&p.skills.includes('soldier-marksman-1')&&(kit.technique1At??0)<=now&&!kit.soldierBankBlocked?bankAim():undefined;
      const footwork=route==='skirmisher'&&(kit.soldierFollowupUntil??0)>now&&(kit.technique1At??0)<=now&&(kit.soldierStepUntil??0)<=now&&decision.danger<150;
      const moving=Math.hypot(decision.x,decision.y)>0,supply=p.health<p.maxHealth-35?p.supplies.findIndex(s=>s.id==='medkit'&&s.count>0):-1;
      assert(g.submitInput(p.id,{...idleInput(),sequence:++sequence,clientTick:now,moveX:footwork&&!moving?-Math.sin(aim):decision.x,moveY:footwork&&!moving?Math.cos(aim):decision.y,aim:bank?.aim??aim,fire:!bank,q:p.qAt<=now,e:p.eAt<=now,ultimate:p.ultimateAt<=now,technique1:!!bank||footwork,dodge:now%15===0&&decision.danger>150,sprint:decision.danger>200,supply,interact:p.status==='downed'}));
    }
    g.step();for(const e of g.drainEvents())if(e.type==='sound'&&e.owner===p.id&&e.id==='soldier-bank-shot')casts.push({encounter:g.encounter,tick:g.combatTick,ammo:p.ammo,recovery:g.kitStatus(p.id).technique1At});
    for(const cue of g.classCues()){
      if(cue.kind==='soldier-bank'&&!seen.has(cue.id)){seen.add(cue.id);banks.push({encounter:g.encounter,...cue});}
      if(cue.kind==='soldier-step'&&!stepSeen.has(cue.id)){stepSeen.add(cue.id);steps.push({encounter:g.encounter,...cue});}
    }
  }
  const row={route,phase:g.phase,completedEncounters:g.encounter,combatSeconds:g.combatTick/HZ,damageDealt:p.damageDealt,damageTaken:p.damageTaken,endingHealth:p.health,earnedSP:p.totalSp,spentSP:p.skills.reduce((sum,id)=>sum+g.skillCost(id),0),skills:[...p.skills],purchases,fights,casts,banks,steps,restoredBoundaryCount:boundaries.size};rows.push(row);console.log(JSON.stringify({route,result:row.phase,clears:row.completedEncounters,seconds:row.combatSeconds,casts:casts.length,banks:banks.length,steps:steps.length,earnedSP:row.earnedSP,spentSP:row.spentSP}));
  fs.writeFileSync(output,JSON.stringify({checkedAt:new Date().toISOString(),baselineMetadata:'036d8f980c28ab3fcbbdb037fa9005148dee2fce',runtimeSourceSha256:runtime,build:'2026.11.04-soldier-bank-shot',protocol:PROTOCOL,contentRevision:CONTENT_REVISION,difficulty:'normal',seed,map,rows,limits:['Actual native shared-Game inputs, real health/completion, natural rewards/purchases and ordinary clocks. No resource/health/position injection, forced clear, deadline edits, invulnerability or score upload.','One autonomous steering policy with18px conservative clearance while actual game radius is9. Different specialization/General spending means these results do not rank builds or establish fun/final balance. General can retain unspentSP.','The harness reflects target coordinates to choose a legal angle; only a manual aim and ordinary C input enter Game. The production ability has no targeting assist. Observed cover contacts are not a claim that every bank hits or that damage can be attributed per shot. Misses and losses remain.','Safe-boundary copies reseed transport input sequence from authoritative acknowledgment. No unfinished flight/recovery is restored; intermission starts its issued fresh combat state.']},null,2)+'\n');
}
if(restore){const original=JSON.parse(fs.readFileSync(chat+'/outputs/'+stem+'.json','utf8'));assert.equal(original.runtimeSourceSha256,runtime);const comparisons=rows.map(row=>{const first=original.rows.find((r:any)=>r.route===row.route);assert(first);const mismatches=Object.keys(row).filter(key=>key!=='restoredBoundaryCount'&&JSON.stringify(row[key])!==JSON.stringify(first[key]));return{route:row.route,safeRestores:row.restoredBoundaryCount,measuredOutcomeAndActionsMatch:!mismatches.length,mismatches};});fs.writeFileSync(chat+'/outputs/'+stem+'-comparison.json',JSON.stringify({checkedAt:new Date().toISOString(),runtimeSourceSha256:runtime,seed,map,passed:comparisons.every(row=>row.measuredOutcomeAndActionsMatch),comparisons},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(comparisons));}
