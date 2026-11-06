// Synthetic authority workload. Legal purchases/cooldowns; no FPS, WAN, human-balance or host-capacity claim.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Game, data } from '../src/shared/game.ts';
import { idleInput, CONTENT_REVISION, PROTOCOL, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { bossFloorPosition } from '../src/shared/boss-body-bounds.ts';
import { distance, segmentRect } from '../src/shared/geometry.ts';
const output=process.argv[2];
assert(/^reviews\/alchemist-2026-11-02\/performance-[a-z0-9-]+\.json$/.test(output??''));
assert(!fs.existsSync(output),'Preserve earlier workload evidence');
const percentile=(values:number[],p:number)=>values.toSorted((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];
const rows:Record<string,number|string|boolean>[]=[];
for(const arena of ['gatehouse','triage-yard'])for(const count of [1,8,50])for(const ordinary of [0,60]){
 const g=new Game({mode:'endless',maxPlayers:50,seed:41,openingArenaId:arena,arenaSelection:'fixed'});
 g.testingModified=true;
 for(let i=0;i<count;i++){
  const p=g.addPlayer('alchemist-owner-'+i,'Synthetic Alchemist '+i,'alchemist');
  p.totalSp=27;p.coins=p.incomeGranted=5000;
  // 21 SP primary foundation + 6 SP Split Pour, bought through real transactions.
  for(const [branch,depth]of [['reagents',6],['mixtures',3]]as const)
   for(const n of data.skills.filter(n=>n.classId==='alchemist'&&n.branchId===branch&&n.lane===0&&n.depth<=depth).sort((a,b)=>a.depth-b.depth))
    assert(g.transact(p.id,{id:n.id,kind:'skill',item:n.id}).ok);
  assert(g.transact(p.id,{id:'bellows',kind:'weapon',item:'alchemist-3'}).ok);
  for(const id of ['damage','fire-rate'])for(let j=0;j<5;j++)
   assert(g.transact(p.id,{id:id+j,kind:'upgrade',item:id}).ok);
 }
 assert(g.start());g.boss.health=g.boss.maxHealth=1e9;g.boss.staggerUntil=g.boss.deadline=1e9;
 for(const p of g.players.values())p.invulnerableUntil=1e9;
 const first=[...g.players.values()][0],radius=data.bosses.find(b=>b.id===g.boss.id)!.radius;
 const position=Array.from({length:32},(_,i)=>{
  const a=i*Math.PI/16;
  return bossFloorPosition(g.boss.id,{x:first.x+Math.cos(a)*260,y:first.y+Math.sin(a)*260},radius,g.arena.bounds,g.obstacles);
 }).find(p=>distance(first,p)>=220&&!g.obstacles.some(w=>segmentRect(first,p,w,3)));
 assert(position,'A covered map needs a legal primary lane');g.boss.x=position.x;g.boss.y=position.y;
 const step=(n:number)=>{for(let i=0;i<n;i++)g.step();};
 const press=(patch:Partial<InputFrame>)=>{
  for(const p of g.players.values())g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:0,...patch});
  g.step();
  for(const p of g.players.values())g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:0});
  g.step();
 };
 press({ultimate:true});
 for(let round=0;round<2;round++){
  while(g.combatTick<Math.max(...[...g.players.values()].map(p=>p.qAt)))g.step();
  press({q:true});step(13);
  assert([...g.players.values()].every(p=>g.kitStatus(p.id).alchemyPrepared?.length===1),JSON.stringify({arena,count,ordinary,round,tick:g.combatTick,owners:[...g.players.values()].slice(0,8).map(p=>({id:p.id,qAt:p.qAt,ack:p.ack,kit:g.kitStatus(p.id)}))}));
  while(g.combatTick<Math.max(...[...g.players.values()].map(p=>p.eAt)))g.step();
  for(const p of g.players.values()){
   // Some actual fifty-player spawn slots border cover. Find ground where both
   // split landings really fit rather than removing walls or fabricating a pool.
   const candidates=[{x:p.x,y:p.y},...Array.from({length:96},(_,i)=>{
    const angle=(i%32)*Math.PI/16,reach=48*(1+Math.floor(i/32));
    return {x:p.x+Math.cos(angle)*reach,y:p.y+Math.sin(angle)*reach};
   })];
   const point=candidates.find(center=>{
    const angle=distance(p,center)>0?Math.atan2(center.y-p.y,center.x-p.x):p.aim;
    return [-1,1].every(side=>{
     const target={x:center.x-Math.sin(angle)*24*side,y:center.y+Math.cos(angle)*24*side},b=g.arena.bounds;
     return target.x>=b.x+8&&target.x<=b.x+b.width-8&&target.y>=b.y+8&&target.y<=b.y+b.height-8&&!g.obstacles.some(w=>segmentRect(target,target,w,8)||segmentRect(p,target,w,8));
    });
   });
   assert(point,'No legal two-landing placement from an actual spawn');
   assert(g.throwAlchemy(p.id,point));
   assert.equal(g.classCues().filter(c=>c.kind==='alchemy-flask'&&c.owner===p.id).length,2,'Both actual split flights must exist');
  }
  step(15);
  assert.equal(g.classCues().filter(c=>c.kind==='alchemy-pool').length,count*2*(round+1),'No pool is fabricated or extended to reach the workload');
 }
 for(let i=0;i<ordinary;i++){
  const point=bossFloorPosition(g.boss.id,{x:position.x+((i%6)-3)*12,y:position.y+Math.floor(i/6)*8},10,g.arena.bounds,g.obstacles);
  assert(g.spawnMinion({kind:'ordinary',...point,health:1e6,speed:0,radius:10,damage:0,lifeSeconds:1200}));
 }
 const samples:number[]=[],views:number[]=[];
 let maxPools=0,maxCues=0,maxCueBytes=0,maxViewBytes=0;
 const before=[...g.players.values()].reduce((n,p)=>n+p.damageDealt,0);
 for(let tick=0;tick<60;tick++){
  for(const p of g.players.values())g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:Math.atan2(g.boss.y-p.y,g.boss.x-p.x),fire:true});
  let at=performance.now();g.step();samples.push(performance.now()-at);
  at=performance.now();const view=viewOf(g,first.id);views.push(performance.now()-at);
  maxPools=Math.max(maxPools,view.classCues.filter(c=>c.kind==='alchemy-pool').length);
  maxCues=Math.max(maxCues,view.classCues.length);
  maxCueBytes=Math.max(maxCueBytes,Buffer.byteLength(JSON.stringify(view.classCues)));
  maxViewBytes=Math.max(maxViewBytes,Buffer.byteLength(JSON.stringify(view)));
 }
 const actualDamage=[...g.players.values()].reduce((n,p)=>n+p.damageDealt,0)-before;
 assert(actualDamage>0,'Actual primary damage must occur');assert.equal(maxPools,count*4);
 rows.push({arena,players:count,ordinary,measuredTicks:60,ownedPoolsAtPeak:maxPools,maxClassCues:maxCues,rawClassCueJsonBytes:maxCueBytes,rawViewJsonBytes:maxViewBytes,actualCreditedDamage:actualDamage,meanStepMs:samples.reduce((n,v)=>n+v,0)/samples.length,p95StepMs:percentile(samples,.95),p99StepMs:percentile(samples,.99),maxStepMs:Math.max(...samples),p95ViewMs:percentile(views,.95)});
}
const report={checkedAt:new Date().toISOString(),passed:true,contentRevision:CONTENT_REVISION,protocol:PROTOCOL,rows,conditions:{maps:2,rosters:[1,8,50],ordinaryActors:[0,60],legalSkillBudget:27,syntheticEquipmentWallet:5000,bossCastingHeld:true,playersInvulnerable:true,ordinarySpeed:0,ordinaryDamage:0,measuredTicksPerCase:60,realPrimaryAttacks:true,legalCooldownWarmup:true,actualSplitPourFields:true},limits:[
 'Authority CPU and raw diagnostic JSON only. No rendered clients, encoded transport, outgoing fanout, WAN, device, human, hostile-pressure, balance or free-host capacity acceptance.',
 'Two actual Split Pour throws per owner overlap after legal brew/throw cooldowns on covered maps. Existing pool lifetimes are not extended; later pools expire normally.',
 'The scene holds boss casting and uses invulnerable owners, synthetic equipment money and stationary harmless ordinary actors. It is a reproducible workload rather than a played clear.',
 'Raw JSON sizes are diagnostic view strings, not measured traffic or bandwidth.'
]};
fs.mkdirSync('reviews/alchemist-2026-11-02',{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,cases:rows.length,worstP99Ms:Math.max(...rows.map(r=>r.p99StepMs as number)),peakActualPools:Math.max(...rows.map(r=>r.ownedPoolsAtPeak as number))}));
