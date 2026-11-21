import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { build } from 'esbuild';
import { Game } from '../src/shared/game.ts';
import { inspectLocalChapterCheckpoint } from '../src/shared/chapter-transfer.ts';
import { inspectChapterCandidate } from '../src/client/chapter-transfer.ts';
function checkpoint(){
 const g=new Game({mode:'story',maxPlayers:1,seed:41});g.addPlayer('solo','Perrin','alchemist');return g.offlineCheckpoint()!;
}
function receive(worker:Worker,check:(value:any)=>boolean){
 return new Promise<any>((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);worker.off('message',onMessage);worker.off('error',onError);};
  const onMessage=(value:any)=>{if(check(value)){cleanup();resolve(value);}};
  const onError=(error:Error)=>{cleanup();reject(error);};
  const timer=setTimeout(()=>{cleanup();reject(Error('Worker response timed out'));},8000);
  worker.on('message',onMessage);worker.on('error',onError);
 });
}
for(const testing of [false,true])test('Actual '+(testing?'testing':'public')+' Solo worker inspects a portable chapter without starting or replacing a running game, then resumes its validated packet',{timeout:20000},async()=>{
 const bundle=await build({entryPoints:['src/client/offline.worker.ts'],bundle:true,platform:'node',format:'esm',write:false,define:{__GA_TESTING_BUILD__:String(testing)},logLevel:'silent'});
 const shim="import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=value=>parentPort.postMessage(value);";
 const tail="parentPort.on('message',value=>self.onmessage({data:value}));parentPort.postMessage({type:'ready'});";
 const worker=new Worker(new URL('data:text/javascript;base64,'+Buffer.from(shim+bundle.outputFiles[0].text+'\n'+tail).toString('base64')),{execArgv:[]});
 try{
  let views=0;worker.on('message',m=>{if(m.type==='view')views++;});
  await receive(worker,m=>m.type==='ready');
  const first=receive(worker,m=>m.type==='chapterCheckpointInspection');
  worker.postMessage({type:'inspectChapterCheckpoint',value:checkpoint()});
  const inspected=await first;assert(inspected.ok);assert.equal(inspected.value.summary.classId,'alchemist');
  await new Promise(resolve=>setTimeout(resolve,60));assert.equal(views,0,'Read-only inspection cannot initialize the game loop');
  const initialized=receive(worker,m=>m.type==='view');
  worker.postMessage({type:'init',settings:{mode:'endless',difficulty:'normal',maxPlayers:1,seed:71,runId:'worker-original'},name:'Nela',classId:'ranger'});
  await initialized;
  const paused=receive(worker,m=>m.type==='view');
  worker.postMessage({type:'pause',value:true});const before=(await paused).view;
  const bad=receive(worker,m=>m.type==='chapterCheckpointInspection');
  worker.postMessage({type:'inspectChapterCheckpoint',value:{bad:true}});assert.equal((await bad).ok,false);
  const again=receive(worker,m=>m.type==='chapterCheckpointInspection');
  worker.postMessage({type:'inspectChapterCheckpoint',value:checkpoint()});assert((await again).ok);
  const unchanged=receive(worker,m=>m.type==='view');
  worker.postMessage({type:'pause',value:true});assert.deepEqual((await unchanged).view,before);
  const resumed=receive(worker,m=>m.type==='view');
  worker.postMessage({type:'resume',value:inspected.value.checkpoint});
  const view=(await resumed).view;assert.equal(view.players[0].classId,'alchemist');
  assert.equal(view.players[0].sp,0);assert.equal(view.chapter.id,'one-place-left');
 }finally{await worker.terminate();}
});
test('The client inspector terminates isolated workers on success, rejection, abort and posting failure, ignoring late responses',async context=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'Worker'),instances:any[]=[];
 let mode='success';
 class Inspector{
  onmessage:any;onerror:any;request:any;terminated=0;
  constructor(){instances.push(this);}
  terminate(){this.terminated++;}
  postMessage(value:any){
   this.request=value;
   if(mode==='throw')throw Error('clone');
   if(mode==='pending')return;
   queueMicrotask(()=>this.onmessage?.({data:mode==='reject'?{type:'chapterCheckpointInspection',ok:false}:{type:'chapterCheckpointInspection',ok:true,value:inspectLocalChapterCheckpoint(value.value)}}));
  }
 }
 Object.defineProperty(globalThis,'Worker',{configurable:true,value:Inspector});
 context.after(()=>descriptor?Object.defineProperty(globalThis,'Worker',descriptor):Reflect.deleteProperty(globalThis,'Worker'));
 const value=await inspectChapterCandidate(checkpoint());assert.equal(value.summary.classId,'alchemist');assert.equal(instances[0].terminated,1);
 mode='reject';await assert.rejects(inspectChapterCandidate(checkpoint()));assert.equal(instances[1].terminated,1);
 mode='pending';const controller=new AbortController(),promise=inspectChapterCandidate(checkpoint(),controller.signal),pending=instances[2];
 controller.abort();await assert.rejects(promise,{name:'AbortError'});assert.equal(pending.terminated,1);
 pending.onmessage({data:{type:'chapterCheckpointInspection',ok:true,value}});assert.equal(pending.terminated,1);
 mode='throw';await assert.rejects(inspectChapterCandidate(checkpoint()),/clone/);assert.equal(instances[3].terminated,1);
 const pre=new AbortController();pre.abort();await assert.rejects(inspectChapterCandidate(checkpoint(),pre.signal),{name:'AbortError'});
 assert.equal(instances.length,4);
});
