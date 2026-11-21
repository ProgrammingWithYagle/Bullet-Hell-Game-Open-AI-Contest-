// Native execution of the actual served optimized Solo worker. No browser/rendering.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { Game } from '../src/shared/game.ts';
import { implementedClassIds } from '../src/shared/protocol.ts';
import { decodeChapterTransfer, encodeChapterTransfer } from '../src/shared/chapter-transfer-format.ts';
import { inspectLocalChapterCheckpoint } from '../src/shared/chapter-transfer.ts';
const [audience,scope]=process.argv.slice(2);
assert(['testing','public'].includes(audience));assert(/^reviews\/[a-z0-9-]+$/.test(scope??''));
const manifest=JSON.parse(fs.readFileSync(scope+'/preview-'+audience+'.json','utf8'));
const files=JSON.parse(fs.readFileSync(manifest.manifestPath,'utf8')).members as {path:string;sha256:string}[];
const workerFile=files.find(f=>/offline\.worker-.*\.js$/.test(f.path));assert(workerFile);
const response=await fetch(new URL(workerFile.path,manifest.url));assert(response.ok);
const bytes=Buffer.from(await response.arrayBuffer());
assert.equal(createHash('sha256').update(bytes).digest('hex'),workerFile.sha256);
assert.equal(bytes.includes(Buffer.from('testingCommand')),audience==='testing');
const rootHtml=await fetch(manifest.url).then(r=>r.text());
const mainPath=rootHtml.match(/src="([^"]+\.js)"/)?.[1];assert(mainPath);
const mainUrl=new URL(mainPath,manifest.url);
const mainFile=files.find(f=>new URL(f.path,manifest.url).href===mainUrl.href);assert(mainFile);
const mainResponse=await fetch(mainUrl);assert(mainResponse.ok);
const mainBytes=Buffer.from(await mainResponse.arrayBuffer());
assert.equal(createHash('sha256').update(mainBytes).digest('hex'),mainFile.sha256);
for(const marker of ['data-checkpoint-use','data-checkpoint-import','data-checkpoint-export','data-class-id'])assert(mainBytes.includes(Buffer.from(marker)),marker);
const shim="import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=value=>parentPort.postMessage(value);";
const tail="parentPort.on('message',value=>self.onmessage({data:value}));parentPort.postMessage({type:'ready'});";
const worker=new Worker(new URL('data:text/javascript;base64,'+Buffer.from(shim+bytes.toString('utf8')+'\n'+tail).toString('base64')),{execArgv:[]});
const receive=(check:(value:any)=>boolean)=>new Promise<any>((resolve,reject)=>{
 const cleanup=()=>{clearTimeout(timer);worker.off('message',message);worker.off('error',error);};
 const message=(value:any)=>{if(check(value)){cleanup();resolve(value);}};
 const error=(value:Error)=>{cleanup();reject(value);};
 const timer=setTimeout(()=>{cleanup();reject(Error('Emitted worker response timed out'));},10000);
 worker.on('message',message);worker.on('error',error);
});
const inspect=async(value:unknown)=>{
 const reply=receive(m=>m.type==='chapterCheckpointInspection');
 worker.postMessage({type:'inspectChapterCheckpoint',value});return reply;
};
try{
 let views=0;worker.on('message',m=>{if(m.type==='view')views++;});
 await receive(m=>m.type==='ready');
 let last:any;
 for(const classId of implementedClassIds){
  const g=new Game({mode:'story',seed:41,maxPlayers:1,runId:'frozen-chapter-'+classId});
  g.addPlayer('solo','Frozen '+classId,classId);
  const packet=encodeChapterTransfer(inspectLocalChapterCheckpoint(g.offlineCheckpoint()));
  const result=await inspect(decodeChapterTransfer(packet));
  assert(result.ok);assert.equal(result.value.summary.classId,classId);
  assert.equal(result.value.summary.proven,0);assert.equal(result.value.checkpoint.player.totalSp,0);
  last=result.value;
 }
 assert.equal(last.summary.classId,'alchemist');
 const free=new Game();free.addPlayer('solo','Free Play','soldier');
 assert.equal((await inspect(free.offlineCheckpoint())).ok,false);
 assert.equal((await inspect({...last.checkpoint,phase:'combat'})).ok,false);
 const forged=structuredClone(last.checkpoint);forged.player.totalSp=27;
 assert.equal((await inspect(forged)).ok,false);
 await new Promise(resolve=>setTimeout(resolve,60));assert.equal(views,0);
 const resumed=receive(m=>m.type==='view');
 worker.postMessage({type:'resume',value:last.checkpoint});
 const view=(await resumed).view;
 assert.equal(view.chapter.id,'one-place-left');assert.equal(view.players[0].classId,'alchemist');
 assert.equal(view.players[0].sp,0);
 const started=receive(m=>m.type==='view'&&m.view.phase==='combat');
 worker.postMessage({type:'start'});const combat=(await started).view;
 assert.equal(combat.players[0].kit.alchemyCinder,3);
 assert.equal(combat.players[0].training.proofs.length,0);
 const receipt={passed:true,checkedAt:new Date().toISOString(),sourceCommit:manifest.sourceCommit,audience,url:manifest.url,actualServedWorker:workerFile.path,workerSha256:workerFile.sha256,actualServedMainSha256:createHash('sha256').update(mainBytes).digest('hex'),identitiesInspected:implementedClassIds.length,inspectionStartsNoGame:true,freePlayRejected:true,combatRejected:true,storySpForgeryRejected:true,actualOptimizedWorkerResume:true,actualChapterCombatStart:true,storySpZero:true,noFabricatedProof:true,limits:[
  'Native Node worker execution of the exact HTTP-served optimized Solo worker, plus actual served main marker/hash checks. No browser, rendered UI, physical-device, native-language, personal-clear or final UX acceptance.',
  'Frozen samples start from empty introductory learning. Real earned proof/equipment preservation and cancelled/stale/storage-failed controller behavior are separate source tests.',
  'No online proof, team score or server account is created.'
 ]};
 fs.writeFileSync(scope+'/chapter-transfer-smoke-'+audience+'.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}finally{await worker.terminate();}
