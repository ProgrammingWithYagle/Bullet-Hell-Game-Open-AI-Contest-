import test from 'node:test';
import assert from 'node:assert/strict';
import {Session} from '../src/client/session.ts';
import {createGameServer} from '../src/server/service.ts';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('quickly hiding and showing chat restores its recent history without another player needing to post',{timeout:16000},async()=>{
 const {server,httpServer}=createGameServer({audience:'public'});await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address==='object');
 const a=new Session('http://127.0.0.1:'+address.port),b=new Session('http://127.0.0.1:'+address.port),wait=async(check:()=>boolean)=>{const end=Date.now()+7000;while(!check()){assert(Date.now()<end,'Chat history did not return');await delay(20);}};
 try{
  a.setChatEnabled(true);b.setChatEnabled(true);const options={name:'Mara',classId:'soldier' as const,mode:'short' as const,difficulty:'baby'};
  await a.connect(options);await b.connect({...options,name:'Iona'},{roomId:a.room!.roomId});await wait(()=>a.status==='ui.ready'&&b.status==='ui.ready');
  assert(a.sendChat('Keep this recent message'));await wait(()=>b.chatMessages.length===1);
  b.setChatEnabled(false);assert.equal(b.chatMessages.length,0);await delay(50);b.setChatEnabled(true);
  await wait(()=>b.chatMessages.length===1);assert.equal(b.chatMessages[0].text,'Keep this recent message');
  assert.equal(a.chatMessages.length,1);
 }finally{await Promise.allSettled([a.close(),b.close()]);await server.gracefullyShutdown(false);}
});
