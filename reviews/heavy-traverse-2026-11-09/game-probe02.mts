import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import{fileURLToPath}from'node:url';
import{Game}from'./game-study02.mjs';
import{traverseIds as ids,studyRules as r}from'./traverse-candidate02.mts';
import{idleInput,HZ}from'../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/protocol.ts';
const base=path.dirname(fileURLToPath(import.meta.url)),report:any={checkedAt:new Date().toISOString(),source:'4392f466 / metadata ca72abb1',registered:false,canonicalFilesWritten:false,onlineProof:false,fixtures:'Controlled boss/geometry/minions/resources; prototype ids resolve to empty effects only inside a derived Game bundle. Actual Game shot pool, geometry, armor, damage, input and combat clock.',cases:[]};
const near=(a:number,b:number)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture(mode:'loose'|'spade'|'floating'='loose'){
 const g:any=new Game({mode:'short',difficulty:'normal',seed:41,maxPlayers:2,arenaSelection:'fixed',openingArenaId:'gatehouse'}),p=g.addPlayer('owner','Hux','heavy'),ally=g.addPlayer('ally','Mara','soldier');
 assert.equal(p.totalSp,3);assert(g.transact(p.id,{id:'foundation',kind:'skill',item:'heavy-ordnance-1'}).ok);p.skills.push(ids.entry,...(mode==='loose'?[]:[ids[mode]]));assert(g.start());g.boss.id='constable';g.director.reset('constable');Object.assign(g.boss,{x:1200,y:200,health:1e6,maxHealth:1e6,staggerUntil:1e9,deadline:1e9});Object.defineProperty(g,'arena',{value:structuredClone(g.arena)});g.arena.obstacles.length=g.arena.lavaPits.length=0;Object.assign(p,{x:600,y:600,oldX:600,oldY:600});Object.assign(ally,{x:1400,y:900,oldX:1400,oldY:900});g.drainEvents();let sequence=0;const emitted:any[]=[],events:any[]=[];
 const step=(input:any={})=>{assert(g.submitInput(p.id,{...idleInput(),sequence:++sequence,aim:0,...input}));g.step();const batch=g.drainEvents();events.push(...batch);for(const e of batch)if(e.type==='shots')emitted.push(...e.shots.filter((s:any)=>s.owner===p.id).map((s:any)=>({...s,admittedAt:g.combatTick})));return batch;};
 const target=(x:number,y:number,health=1000)=>g.spawnMinion({kind:'ordinary',x,y,health,speed:0,radius:16,damage:0})!;
 return{g,p,ally,step,target,emitted,events,status:()=>g.traverse.status(p,g.combatTick),stroke:()=>emitted.filter(s=>Math.abs(s.damage-r.damage*g.stats(p).damage)<1e-6)};
}
function check(name:string,run:()=>unknown){try{report.cases.push({name,passed:true,details:run()});}catch(e:any){report.cases.push({name,passed:false,error:e.stack});}}
check('actual fixed-step controller pays exactly four actual physical shots and exposes primary only afterward',()=>{
 const f=fixture();f.step({technique1:true,fire:true});for(let i=0;i<29;i++)f.step({fire:true});assert.equal(f.emitted.length,3);assert.equal(f.p.ammo,42);f.step({fire:true});assert.equal(f.emitted.length,4);assert.equal(f.p.ammo,41);f.step({fire:true});assert(f.emitted.length>4);assert.deepEqual(f.stroke().map(s=>s.admittedAt),[1,11,21,31]);return{strokeTicks:f.stroke().map(s=>s.admittedAt),ordinaryFirstAt:f.emitted[4].admittedAt,ammo:f.p.ammo};
});
check('the two fittings have different ground and aim contracts under actual movement',()=>{
 const rows=[];for(const mode of['loose','spade','floating']as const){const f=fixture(mode);f.step({technique1:true});for(let i=0;i<35;i++)f.step({moveY:1,aim:.8});assert.equal(f.stroke().length,4);const a=f.stroke().map(s=>Math.atan2(s.vy,s.vx));if(mode==='floating'){assert(f.p.y>810);assert(a.every(n=>n===0));}else{const recoilY=mode==='spade'?0:f.stroke().reduce((n,s)=>n+Math.sin(Math.atan2(s.vy,s.vx))*r.recoilDistance,0);near(f.p.y,600+190*5/HZ-recoilY);assert(a[1]>.7);}if(mode==='spade')near(f.p.x,600);else assert(f.p.x<590);rows.push({mode,x:f.p.x,y:f.p.y,shotAngles:a,paid:45-f.p.ammo});}return rows;
});
check('Floating can walk beyond actual cover and engage separate physical lanes while planted strokes stay occluded',()=>{
 const rows=[];for(const mode of['loose','spade','floating']as const){const f=fixture(mode);f.g.arena.obstacles.push({x:700,y:500,width:20,height:200});const targets=[600,600+190/3,600+380/3,790].map(y=>f.target(900,y,r.damage*f.g.stats(f.p).damage));f.step({technique1:true});for(let i=0;i<60;i++)f.step({moveY:1});const losses=targets.map(t=>t.maxHealth-t.health);if(mode==='floating'){assert.equal(losses.filter(n=>n>0).length,2);assert(f.p.damageDealt>89);}else assert.equal(f.p.damageDealt,0);rows.push({mode,losses,damage:f.p.damageDealt,shots:f.stroke().length});}return rows;
});
check('manual slew can redirect later actual rounds while Floating keeps its birth bearing',()=>{
 const rows=[];for(const mode of['loose','spade','floating']as const){const f=fixture(mode),first=f.target(850,600),second=f.target(850,800),aim=Math.atan2(200,250);f.step({technique1:true});for(let i=0;i<55;i++)f.step({aim});assert(first.health<first.maxHealth);if(mode==='floating')near(second.health,second.maxHealth);else assert(second.health<second.maxHealth);rows.push({mode,firstDamage:first.maxHealth-first.health,turnedDamage:second.maxHealth-second.health,angles:f.stroke().map(s=>Math.atan2(s.vy,s.vx))});}return rows;
});
check('real environmental displacement breaks Set Spade and preserves already fired physical work',()=>{
 const f=fixture('spade');f.step({technique1:true});const until=f.status().technique1At;f.g.director.services.movement=()=>({multiplier:1,x:30,y:0});f.step();assert(f.p.x>600);assert.equal(f.status().heavyTraverseUntil,0);for(let i=0;i<33;i++)f.step();assert.equal(f.stroke().length,1);assert.equal(f.status().technique1At,until);return{shots:f.stroke().length,x:f.p.x,recovery:until};
});
check('paid physical shots use their copied emission origin for source-sensitive armor after the owner moves',()=>{
 const f=fixture('floating');Object.assign(f.g.boss,{x:1000,y:600});const origins:any[]=[];f.g.director.district.bodyMultiplier=(p:any)=>{origins.push({x:p.x,y:p.y});return .5;};f.step({technique1:true});f.step({technique1:true,moveY:1});for(let i=0;i<16;i++)f.step({moveY:1});assert.equal(origins.length,1);near(origins[0].x,600);near(origins[0].y,600);return{origins,owner:{x:f.p.x,y:f.p.y},damage:f.p.damageDealt};
});
check('actual downing and disconnect remove tracked physical shots with no recovery refund',()=>{
 for(const kind of['damage','disconnect']){const f=fixture();f.step({technique1:true});const until=f.status().technique1At;assert([...f.g.shots.values()].some((s:any)=>s.owner===f.p.id));if(kind==='damage'){f.p.shield=0;f.p.invulnerableUntil=0;f.g.damage(f.p,1e6);}else f.g.setConnected(f.p.id,false);assert.equal([...f.g.shots.values()].filter((s:any)=>s.owner===f.p.id).length,0,kind);assert.equal(f.status().technique1At,until,kind);}return{downing:true,disconnect:true};
});
check('actual host exit removes all physical stroke shots rather than merely clearing controller metadata',()=>{
 const f=fixture();f.step({technique1:true});assert(f.g.endByHost());assert.equal([...f.g.shots.values()].filter((s:any)=>s.owner===f.p.id).length,0);return{actualHostExit:true};
});
check('actual recoil collides with cover while Braced Firing retains its issued window without new protection',()=>{
 const f=fixture();f.g.arena.obstacles.push({x:575,y:500,width:10,height:200});f.step({technique1:true,e:true});for(let i=0;i<35;i++)f.step();assert(f.p.x>=594-1e-3&&f.p.x<594.01);assert.equal(f.p.braceUntil,1+5*HZ);assert.equal(f.stroke().length,4);assert.equal(f.p.invulnerableUntil,HZ);return{x:f.p.x,braceUntil:f.p.braceUntil,shots:f.stroke().length,damagePerShot:f.stroke()[0].damage};
});
report.passed=report.cases.every((c:any)=>c.passed);report.passedCount=report.cases.filter((c:any)=>c.passed).length;report.failedCount=report.cases.length-report.passedCount;
const destination=process.env.TRAVERSE_REPORT??path.resolve(base,'../../outputs/Heavy-traverse-game-study02.json');fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({report:destination,passed:report.passed,passedCount:report.passedCount,failedCount:report.failedCount,cases:report.cases.map((c:any)=>({name:c.name,passed:c.passed,error:c.error?.split('\n').slice(0,3).join(' '),details:c.details}))}));if(!report.passed)process.exitCode=1;
