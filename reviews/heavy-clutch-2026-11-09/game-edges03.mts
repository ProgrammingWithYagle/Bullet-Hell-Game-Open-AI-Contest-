import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{fileURLToPath}from'node:url';import{Game}from'./game-study01.mjs';import{traverseIds as ids,clutchId}from'./clutch-candidate01.mts';import{idleInput}from'../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/protocol.ts';
const stage=path.dirname(fileURLToPath(import.meta.url)),report:any={checkedAt:new Date().toISOString(),registered:false,canonicalFilesWritten:false,onlineProof:false,countsAs2044Tests:false,controlledPrototypeOwnershipOnly:true,sourceBinding:JSON.parse(fs.readFileSync(stage+'/game-study01-binding.json','utf8')),cases:[]};
function fixture(mode:'loose'|'spade'|'floating'='loose'){
 const g:any=new Game({mode:'raid',seed:41,maxPlayers:2,arenaSelection:'fixed',openingArenaId:'gatehouse'}),p=g.addPlayer('owner','Hux','heavy'),ally=g.addPlayer('ally','Mara','soldier');for(const item of['heavy-ordnance-1',ids.entry,...(mode==='loose'?[]:[ids[mode]])])assert(g.transact(p.id,{id:item,kind:'skill',item}).ok);p.skills.push(clutchId);assert(g.start());g.boss.id='constable';g.director.reset('constable');Object.assign(g.boss,{x:1200,y:200,health:1e6,maxHealth:1e6,staggerUntil:1e9,deadline:1e9});Object.defineProperty(g,'arena',{value:structuredClone(g.arena)});g.arena.obstacles.length=g.arena.lavaPits.length=0;Object.assign(p,{x:600,y:600,oldX:600,oldY:600});Object.assign(ally,{x:1400,y:900,oldX:1400,oldY:900});g.drainEvents();let sequence=0;const emitted:any[]=[],events:any[]=[];
 const step=(input:any={})=>{assert(g.submitInput(p.id,{...idleInput(),sequence:++sequence,aim:0,...input}));g.step();for(const e of g.drainEvents()){events.push(e);if(e.type==='shots')emitted.push(...e.shots.filter((s:any)=>s.owner===p.id).map((s:any)=>({...s})));}};return{g,p,ally,step,emitted,events,status:()=>g.traverse.status(p,g.combatTick),flights:()=>[...g.shots.values()].filter((s:any)=>g.traverse.has(s.id))};
}

function check(name:string, fn:()=>unknown) { try { report.cases.push({name,passed:true,details:fn()}); } catch(e:any) { report.cases.push({name,passed:false,error:e.stack}); } }
check('lifted walking retains paid recoil through actual body/cover collision',()=>{
 const f=fixture();f.g.arena.obstacles.push({x:575,y:500,width:10,height:200});f.step({technique1:true});
 for(let tick=2;tick<=5;tick++)f.step({technique2:tick===2,moveY:1});
 assert(Math.abs(f.p.x-594)<0.01);assert(Math.abs(f.p.y-(600+190*4/30))<0.002);
 assert.equal(f.p.ammo,44);assert.equal(f.status().heavyClutchLifted,true);assert.equal(f.status().technique1At,241);
 return {x:f.p.x,y:f.p.y,paidRounds:1,recovery:241};
});
check('Spade lifts, moves, and replants at its actual new body point; later actual displacement breaks it',()=>{
 const f=fixture('spade');f.step({technique1:true});f.step({technique2:true,moveY:1});f.step({moveY:1});
 const post={x:f.p.x,y:f.p.y};f.step({technique2:true});assert.equal(f.status().heavyClutchLifted,false);
 assert.equal(f.status().heavyTraversePostX,post.x);assert.equal(f.status().heavyTraversePostY,post.y);
 f.g.director.services.movement=()=>({multiplier:1,x:0,y:60});f.step();
 assert(Math.hypot(f.p.x-post.x,f.p.y-post.y)>1);assert.equal(f.status().heavyTraverseUntil,0);
 assert.equal(f.p.ammo,44);assert.equal(f.status().technique1At,241);
 return {replantedAt:post,afterControlledExternalForce:{x:f.p.x,y:f.p.y},paidRounds:1};
});
check('required fitting or weapon loss removes the actual base and post-clutch flights without changing recovery',()=>{
 const rows=[];for(const mode of ['spade','floating'] as const)for(const loss of ['fitting','weapon']){
  const f=fixture(mode);f.step({technique1:true});f.step({technique2:true});f.step({technique2:true});while(f.g.combatTick<12)f.step();
  const ids=f.flights().map((s:any)=>s.id);assert.equal(ids.length,2);
  if(loss==='fitting')f.p.skills=f.p.skills.filter((id:string)=>id!==('heavy-traverse-'+mode+'-1'));else f.p.weapon='heavy-1';
  f.step();assert(ids.every((id:number)=>!f.g.shots.has(id)));assert.equal(f.status().heavyTraverseUntil,0);assert.equal(f.status().technique1At,241);
  rows.push({mode,loss,actualFlightIdsRemoved:ids,recovery:241});
 }return rows;
});
check('a post-clutch round keeps its copied emission origin for actual armor dispatch after the owner walks away',()=>{
 const f=fixture('floating'),origins:any[]=[];Object.assign(f.g.boss,{x:1000,y:600});
 f.g.director.district.bodyMultiplier=(p:any)=>{origins.push({x:p.x,y:p.y});return 0.5;};
 f.step({technique1:true});f.step({technique2:true,moveY:1});f.step({technique2:true,moveY:-1});
 while(f.g.combatTick<11)f.step();const later=f.flights().find((s:any)=>s.id!==f.emitted[0].id)!;assert(later);
 const emission={...f.g.traverse.origin(later.id)};f.step({technique1:true,moveY:1});while(f.g.combatTick<28)f.step({moveY:1});
 assert.equal(origins.length,2);assert(Math.abs(origins[0].y-600)<1e-6);assert(Math.abs(origins[1].x-emission.x)<1e-6);assert(Math.abs(origins[1].y-emission.y)<1e-6);
 assert(Math.abs(f.p.y-origins[1].y)>50);assert(Math.abs(f.p.damageDealt-48.6)<1e-6);
 return {controlledArmorMultiplier:0.5,origins,owner:{x:f.p.x,y:f.p.y},damage:f.p.damageDealt};
});
check('holding the lift through all original slots ends the stroke and permits ordinary primary without a delayed C shot',()=>{
 const f=fixture();f.step({technique1:true});f.step({technique2:true});while(f.g.combatTick<30)f.step({fire:true});
 assert.equal(f.emitted.length,1);f.step({fire:true});assert.equal(f.status().heavyTraverseUntil,0);
 assert.equal(f.status().technique1At,241);assert.equal(f.emitted.length,2);assert.equal(f.p.ammo,43);
 assert(f.emitted[1].damage<48.6);return {lastOriginalSlot:31,actualCShots:1,ordinaryShotAt:31,recovery:241};
});
report.passed=report.cases.every((c:any)=>c.passed);report.passedCount=report.cases.filter((c:any)=>c.passed).length;report.failedCount=report.cases.length-report.passedCount;
fs.writeFileSync(path.resolve(stage,'../../outputs/Heavy-clutch-game-edges03.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
