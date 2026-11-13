import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { build } from 'esbuild';
import { Game } from '../src/shared/game.ts';
import { idleInput, HZ } from '../src/shared/protocol.ts';
const skills=['engineer-constructs-1','engineer-traps-1','engineer-traps-switch-1','engineer-traps-key-1','engineer-traps-casings-1','engineer-traps-haul-1','engineer-traps-corridor-1'];
function checkpoint(){
  const g=new Game({mode:'endless',seed:41,maxPlayers:1,arenaSelection:'fixed',openingArenaId:'gatehouse'});g.encounter=9;
  const p=g.addPlayer('solo','Tamsin','engineer');for(const item of skills)assert(g.transact(p.id,{id:item,kind:'skill',item}).ok);
  const value=g.offlineCheckpoint()!;assert(Game.restoreOffline(structuredClone(value)));return value;
}
for(const testing of [false,true])test('Actual '+(testing?'testing':'public')+' optimized Solo worker deploys, holds, hauls, rearms and fires owned Traps while discarding paused actions',{timeout:20000},async()=>{
  const bundle=await build({entryPoints:['src/client/offline.worker.ts'],bundle:true,minify:true,write:false,platform:'browser',format:'esm',define:{__GA_TESTING_BUILD__:String(testing),'import.meta.env.DEV':'false'},logLevel:'silent'});
  const worker=new Worker(new URL('data:text/javascript;base64,'+Buffer.from("import {parentPort} from 'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);"+bundle.outputFiles[0].text+"\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});").toString('base64')),{execArgv:[]});
  let ready=false,view:any,error:any;worker.on('message',m=>{if(m.type==='ready')ready=true;if(m.type==='view')view=m.view;if(m.type==='error')error=m;});worker.on('error',e=>error=e);
  const wait=async(check:()=>boolean,label:string)=>{const deadline=Date.now()+8000;while(!check()){assert(!error,JSON.stringify(error));assert(Date.now()<deadline,label);await new Promise(r=>setTimeout(r,8));}};
  try{
    await wait(()=>ready,'worker readiness');worker.postMessage({type:'resume',value:checkpoint()});await wait(()=>!!view,'owned boundary');
    assert(skills.every(id=>view.players[0].skills.includes(id)));worker.postMessage({type:'start'});await wait(()=>view.phase==='combat','combat');
    worker.postMessage({type:'input',input:{...idleInput(),sequence:1,aim:-Math.PI/2,q:true}});
    await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-charge'),'owned plate');
    const original=view.classCues.find((c:any)=>c.kind==='engineer-charge');
    worker.postMessage({type:'input',input:{...idleInput(),sequence:2,aim:0,q:true}});
    await wait(()=>view.players[0].kit.trapHeld,'held control');await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-charge'&&c.state==='ready'),'ready held plate');
    worker.postMessage({type:'pause',value:true});await new Promise(r=>setTimeout(r,30));const tick=view.combatTick;
    worker.postMessage({type:'input',input:{...idleInput(),sequence:3,aim:0,technique1:true,technique2:true}});
    await new Promise(r=>setTimeout(r,70));assert.equal(view.combatTick,tick);worker.postMessage({type:'pause',value:false});
    await wait(()=>view.combatTick>tick+3,'resume');assert.equal(view.players[0].ack,2);assert.equal(view.players[0].kit.technique1At,0);assert.equal(view.players[0].kit.technique2At,0);
    assert(view.classCues.some((c:any)=>c.kind==='engineer-charge'&&c.state==='ready'));
    worker.postMessage({type:'input',input:{...idleInput(),sequence:4,aim:0,technique2:true}});
    await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-haul'),'actual haul');
    assert(view.players[0].kit.technique2At>view.combatTick);
    await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-charge'&&c.state==='ready'&&c.x!==original.x),'rearmed destination');
    const moved=view.classCues.find((c:any)=>c.kind==='engineer-charge');assert.equal(moved.until,original.until);assert(moved.held);
    worker.postMessage({type:'input',input:{...idleInput(),sequence:5,aim:Math.PI,technique1:true}});
    await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-jet'&&!c.impact),'committed shaped warning');
    const warning=view.classCues.find((c:any)=>c.kind==='engineer-jet'&&!c.impact),commit=view.classCues.find((c:any)=>c.kind==='engineer-charge');
    assert(warning.toX>warning.x,'haul placed east even though remote aim is west');assert.equal(commit.detonateAt-warning.at,Math.ceil(.5*HZ));
    await wait(()=>view.classCues.some((c:any)=>c.kind==='engineer-jet'&&c.impact),'actual shaped blast');
    assert(view.players[0].kit.technique1At>view.combatTick);assert.equal(view.players[0].ack,5);
    await wait(()=>!view.classCues.some((c:any)=>c.kind==='engineer-charge'),'spent charge cleanup');
  }finally{await worker.terminate();}
});
