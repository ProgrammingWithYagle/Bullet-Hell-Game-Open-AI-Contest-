import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {Session} from '../src/client/session.ts';
import {idleInput} from '../src/shared/protocol.ts';
const [audience,scope]=process.argv.slice(2);assert(['testing','public'].includes(audience));assert(/^reviews\/[a-z0-9-]+$/.test(scope));
const manifest=JSON.parse(fs.readFileSync(scope+'/preview-'+audience+'.json','utf8'));
const members=JSON.parse(fs.readFileSync(manifest.manifestPath,'utf8')).members as {path:string;sha256:string}[];
const wait=async(check:()=>boolean,label='Engineer frozen state')=>{const deadline=Date.now()+12000;while(!check()){assert(Date.now()<deadline,label+' timed out');await new Promise(r=>setTimeout(r,15));}};
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const workerFile=members.find(f=>/offline\.worker-.*\.js$/.test(f.path))!,mainFile=members.find(f=>/\/index-.*\.js$/.test(f.path))!;assert(workerFile&&mainFile);
const bytes=Buffer.from(await(await fetch(new URL(workerFile.path,manifest.url))).arrayBuffer());assert.equal(sha(bytes),workerFile.sha256);
const main=Buffer.from(await(await fetch(new URL(mainFile.path,manifest.url))).arrayBuffer());assert.equal(sha(main),mainFile.sha256);for(const marker of ['pathway-choices','engineer-charge','engineer-machinery-1','engineer-traps-1'])assert(main.includes(Buffer.from(marker)),marker);
const a=new Session(manifest.endpoint),b=new Session(manifest.endpoint),late=new Session(manifest.endpoint);
try{
  const options={name:'Engineer machinery',classId:'engineer' as const,mode:'short' as const,difficulty:'normal'};
  await a.connect(options);await b.connect({...options,name:'Engineer traps'},{roomId:a.room!.roomId});
  for(const [peer,path]of [[a,'engineer-machinery-1'],[b,'engineer-traps-1']] as const){peer.purchase({kind:'skill',item:'engineer-constructs-1'});await wait(()=>!!peer.view?.players.find(p=>p.id===peer.id)?.skills.includes('engineer-constructs-1'));peer.purchase({kind:'skill',item:path});await wait(()=>!!peer.view?.players.find(p=>p.id===peer.id)?.skills.includes(path));assert.equal(peer.view!.players.find(p=>p.id===peer.id)!.sp,0);}
  a.start();await wait(()=>b.view?.phase==='combat');for(const peer of [a,b])peer.input({...idleInput(),sequence:1,aim:-Math.PI/2,q:true});
  await wait(()=>!!b.view?.classCues.some(c=>c.kind==='turret'&&c.machinery&&c.owner===a.id)&&!!b.view?.classCues.some(c=>c.kind==='engineer-charge'&&c.owner===b.id));
  a.setMatchPaused(true);await wait(()=>!!b.view?.matchPaused);const tick=b.view!.combatTick;await new Promise(r=>setTimeout(r,150));assert.equal(b.view!.combatTick,tick);a.setMatchPaused(false);await wait(()=>!b.view?.matchPaused);
  await late.connect({...options,name:'Late Engineer observer',classId:'medic'},{roomId:a.room!.roomId});await wait(()=>!!late.view?.classCues.some(c=>c.kind==='engineer-charge'&&c.owner===b.id));assert(late.view!.classCues.some(c=>c.kind==='turret'&&c.machinery&&c.owner===a.id));assert.equal(late.view!.players.find(p=>p.id===late.id)!.skills.length,0);
}finally{await a.close();await b.close();await late.close();}
const workerRows=[];
for(const path of ['engineer-machinery-1','engineer-traps-1']){
  const source="import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);"+bytes.toString('utf8')+"\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
  const worker=new Worker(new URL('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),{execArgv:[]});let ready=false,view:any,checkpoint:any,error:unknown;const results=new Map<string,boolean>();
  worker.on('error',e=>{error=e;});worker.on('message',m=>{if(m.type==='ready')ready=true;if(m.type==='view')view=m.view;if(m.type==='checkpoint')checkpoint=m.value;if(m.type==='purchaseResult')results.set(m.id,m.ok);if(m.type==='error')error=m;});
  try{
    await wait(()=>ready||!!error);assert(!error);worker.postMessage({type:'init',name:'Native Engineer',classId:'engineer',settings:{mode:'short',difficulty:'normal',freePlay:{seed:2209}}});await wait(()=>!!view||!!error);assert(!error);
    for(const item of ['engineer-constructs-1',path]){worker.postMessage({type:'purchase',request:{id:item,kind:'skill',item}});await wait(()=>results.has(item)||!!error);assert(!error);assert.equal(results.get(item),true);}
    await wait(()=>checkpoint?.player.skills.includes(path));const saved=checkpoint;view=undefined;worker.postMessage({type:'resume',value:saved});await wait(()=>!!view||!!error);assert(!error);assert(view.players[0].skills.includes(path));assert.equal(view.players[0].sp,0);
    worker.postMessage({type:'start'});await wait(()=>view?.phase==='combat');worker.postMessage({type:'input',input:{...idleInput(),sequence:1,aim:-Math.PI/2,q:true}});await wait(()=>view?.classCues.some((c:any)=>path==='engineer-traps-1'?c.kind==='engineer-charge':c.kind==='turret'&&c.machinery));
    worker.postMessage({type:'pause',value:true});await new Promise(r=>setTimeout(r,60));const tick=view.combatTick;await new Promise(r=>setTimeout(r,120));assert.equal(view.combatTick,tick);assert(!error);
    workerRows.push({path,sp:0,purchased:true,actualBoundaryResumed:true,actualCueInCombat:true,pausePreservesCombatTick:true});
  }finally{await worker.terminate();}
}
const receipt={passed:true,checkedAt:new Date().toISOString(),sourceCommit:manifest.sourceCommit,audience,url:manifest.url,endpoint:manifest.endpoint,protocol:manifest.protocol,realPeers:3,contrastingOwnedPurchases:true,lateObserverReplication:true,hostPause:true,actualServedWorker:workerFile.path,workerSha256:workerFile.sha256,actualServedMainSha256:mainFile.sha256,workerRows,limits:['Native execution of the exact HTTP-served optimized worker and real socket peers; no browser or rendered view.','Mechanic damage/terrain/cleanup/conflict/migration checks are source tests. No human fun, device, language, literary or final-balance acceptance.','Probe rooms closed; no production deployment or private database upload.']};
fs.writeFileSync(scope+'/engineer-smoke-'+audience+'.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
