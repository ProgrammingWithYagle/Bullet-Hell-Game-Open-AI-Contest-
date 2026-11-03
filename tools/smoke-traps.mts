// Exact HTTP-served optimized worker. This is native automation, not browser/rendered or human acceptance.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {Worker} from 'node:worker_threads';
import {Game} from '../src/shared/game.ts';import {idleInput,PROTOCOL,HZ} from '../src/shared/protocol.ts';
import {runtimeArena} from '../src/shared/arena-layouts.ts';import {chargeLegal,engineerRules as r} from '../src/shared/engineer-pathways.ts';
const [audience,scope]=process.argv.slice(2);assert(['testing','public'].includes(audience));assert(/^reviews\/[a-z0-9-]+$/.test(scope??''));
const preview=JSON.parse(fs.readFileSync(scope+'/preview-'+audience+'.json','utf8')),manifest=JSON.parse(fs.readFileSync(preview.manifestPath,'utf8'));assert.equal(preview.protocol,PROTOCOL);
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),load=async(member:any)=>{assert(member);const res=await fetch(new URL(member.path,preview.url));assert(res.ok);const b=Buffer.from(await res.arrayBuffer());assert.equal(sha(b),member.sha256);return b;};
const workerFile=manifest.members.find((m:any)=>/offline\.worker-.*\.js$/.test(m.path)),mainFile=manifest.members.find((m:any)=>/\/index-.*\.js$/.test(m.path)),cssFile=manifest.members.find((m:any)=>/\/index-.*\.css$/.test(m.path));
const bytes=await load(workerFile),main=await load(mainFile),css=await load(cssFile);
for(const marker of ['engineer-traps-wire-1','engineer-traps-corridor-1','engineer-haul','engineer-demolition','ui.engineer.holdTraps','pathway-route-picker'])assert(main.includes(Buffer.from(marker)),marker);
assert(css.includes(Buffer.from('.specialization-sheet')));
const health=await fetch(preview.endpoint+'/api/health').then(r=>r.json());assert.equal(health.sourceCommit,preview.sourceCommit);assert.equal(health.protocolVersion,PROTOCOL);assert.equal(health.contentRevision,preview.contentRevision);
const g=new Game({mode:'endless',difficulty:'baby',maxPlayers:1,seed:41,arenaSelection:'fixed',openingArenaId:'gatehouse'});g.encounter=9;g.addPlayer('solo','Tamsin','engineer');
for(const item of ['engineer-constructs-1','engineer-traps-1'])assert(g.transact('solo',{id:item,kind:'skill',item}).ok);
const boundary=g.offlineCheckpoint()!;assert(Game.restoreOffline(structuredClone(boundary)));
const bridge="import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);"+bytes.toString('utf8')+"\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
const worker=new Worker(new URL('data:text/javascript;base64,'+Buffer.from(bridge).toString('base64')),{execArgv:[]});let ready=false,view:any,error:any,sequence=0,impact=false;const purchases=new Map<string,boolean>(),sounds=new Set<string>();
worker.on('error',e=>error=e);worker.on('message',m=>{if(m.type==='ready')ready=true;if(m.type==='view'){view=m.view;if(view.classCues.some((c:any)=>c.kind==='engineer-corridor'&&c.impact))impact=true;}if(m.type==='error')error=m;if(m.type==='purchaseResult')purchases.set(m.id,m.ok);if(m.type==='events')for(const e of m.events)if(e.type==='sound')sounds.add(e.id);});
const wait=async(check:()=>boolean,label:string,ms=12000)=>{const deadline=Date.now()+ms;while(!check()){assert(!error,JSON.stringify(error));assert(Date.now()<deadline,label+' phase='+view?.phase+' health='+view?.players?.[0]?.health);await new Promise(r=>setTimeout(r,8));}};
const input=(extra:Record<string,unknown>)=>worker.postMessage({type:'input',input:{...idleInput(),sequence:++sequence,...extra}});
try{
  await wait(()=>ready,'worker readiness');worker.postMessage({type:'resume',value:boundary});await wait(()=>!!view,'owned boundary');
  for(const item of ['engineer-traps-switch-1','engineer-traps-key-1','engineer-traps-casings-1','engineer-traps-haul-1','engineer-traps-corridor-1','general-sprint','general-course-correction']){
    worker.postMessage({type:'purchase',request:{id:item,kind:'skill',item}});await wait(()=>purchases.has(item),'purchase '+item);assert.equal(purchases.get(item),true);
  }
  assert.equal(view.players[0].sp,0);
  for(let n=0;n<3;n++){const id='health-'+n;worker.postMessage({type:'purchase',request:{id,kind:'upgrade',item:'health'}});await wait(()=>purchases.has(id),'protective coat');assert(purchases.get(id));}
  worker.postMessage({type:'start'});await wait(()=>view.phase==='combat','combat');
  const p=view.players[0],arena=runtimeArena(view.arenaId,'baby'),context={obstacles:arena.obstacles,terrain:{bounds:arena.bounds,lava:arena.lavaPits}},angles=[-Math.PI/2,0,Math.PI/2,Math.PI];
  const pair=angles.flatMap(a=>angles.filter(b=>a!==b).map(b=>[a,b])).find(([a,b])=>{
    const x={x:p.x+Math.cos(a)*r.chargeReach,y:p.y+Math.sin(a)*r.chargeReach},y={x:p.x+Math.cos(b)*r.chargeReach,y:p.y+Math.sin(b)*r.chargeReach};
    return chargeLegal(x,p,context)&&chargeLegal(y,p,context)&&chargeLegal(x,x,context,r.corridorRadius)&&chargeLegal(y,x,context,r.corridorRadius);
  });assert(pair,'legal authored-map pair');
  input({aim:pair[0],q:true});await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-charge'),'first owned plate');
  input({aim:pair[0],q:true});await wait(()=>view.players[0].kit.trapHeld,'held ground');await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-charge'&&c.state==='ready'),'ready plate');
  const originalUntil=view.classCues.find((c:any)=>c.kind==='engineer-charge').until;
  worker.postMessage({type:'pause',value:true});await new Promise(r=>setTimeout(r,35));const paused=view.combatTick,ack=view.players[0].ack;
  input({technique1:true,technique2:true,moveX:1});await new Promise(r=>setTimeout(r,65));assert.equal(view.combatTick,paused);worker.postMessage({type:'pause',value:false});await wait(()=>view.combatTick>paused+3,'resumption');
  assert.equal(view.players[0].ack,ack);assert.equal(view.players[0].kit.technique1At,0);assert.equal(view.players[0].kit.technique2At,0);
  input({aim:pair[1],technique2:true});await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-haul'),'haul');await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-charge'&&c.state==='ready'),'rearmed haul');assert.equal(view.classCues.find((c:any)=>c.kind==='engineer-charge').until,originalUntil);
  // The actual18-second deployment cooldown elapses on the unchanged worker clock.
  input({aim:pair[0],e:true});await wait(()=>view.combatTick>=view.players[0].qAt,'ordinary deployment recovery',25000);assert.equal(view.phase,'combat');assert.equal(view.players[0].status,'active');
  input({aim:pair[0],q:true});await wait(()=>view.classCues.filter((c:any)=>c.kind==='engineer-charge'&&c.state==='ready').length===2,'two ready owned plates');
  input({aim:pair[0],technique1:true});await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-corridor'&&!c.impact),'committed coordinated warning');
  const cue=view.classCues.find((c:any)=>c.kind==='engineer-corridor'&&!c.impact);assert.equal(cue.radius,r.corridorRadius);assert.equal(cue.until-cue.at,Math.ceil(r.fuseSeconds*HZ)+Math.ceil(r.corridorSeconds*HZ));
  await wait(()=>impact,'actual coordinated impact');assert(sounds.has('engineer-fuse')&&sounds.has('engineer-haul')&&sounds.has('engineer-blast')&&sounds.has('engineer-demolition'));
  const report={passed:true,checkedAt:new Date().toISOString(),audience,sourceCommit:preview.sourceCommit,protocol:PROTOCOL,files:{worker:workerFile,main:mainFile,css:cssFile},actualPurchases:7,spentSP:27,actualHaulAndRearm:true,immutableLifetime:true,pausedInputDiscarded:true,ordinary18SecondDeploymentRecovery:true,actualTwoPlateCorridorWarningAndImpact:true,sounds:[...sounds].filter(s=>s.startsWith('engineer-')),limits:['Native execution of exact HTTP-served optimized worker, on Baby with purchased protective gear. Not human play, final balance, rendered/device/listening/motion acceptance.','No testing command, altered worker clock or invented online proof.']};
  fs.writeFileSync(scope+'/traps-smoke-'+audience+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,audience,protocol:PROTOCOL,sourceCommit:preview.sourceCommit,actualTwoPlateImpact:true,workerSha256:workerFile.sha256}));
}finally{await worker.terminate();}
