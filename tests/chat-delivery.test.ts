import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {RoomChat,chatText} from '../src/shared/room-chat.ts';
import {isChatReceipt,type ChatRequest,type ChatReceipt} from '../src/shared/chat-delivery.ts';
import {ChatOutbox} from '../src/client/chat-outbox.ts';
import {Session} from '../src/client/session.ts';
import {createGameServer} from '../src/server/service.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {CloseCode} from '@colyseus/sdk';
const request=(text:string)=>({requestId:randomUUID(),text});
const message=(r:ChatRequest)=>({id:1,senderId:'peer',name:'Mara',text:chatText(r.text)!,at:1000});
const receipt=(r:ChatRequest):ChatReceipt=>({requestId:r.requestId,ok:true,message:message(r)});
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));

test('authority confirms delivery/rejections, binds sender identity and acknowledges duplicate requests without duplicate posts',()=>{
  const chat=new RoomChat(),first=request('Hello');chat.subscribe('peer',true);
  const sent=chat.deliver('peer','Mara',first,1000)!;assert(sent.receipt.ok);assert(sent.message);assert(isChatReceipt(sent.receipt));
  const repeated=chat.deliver('peer','Mara',first,1001)!;assert.deepEqual(repeated.receipt,sent.receipt);assert(!repeated.message);assert.equal(chat.history().length,1);
  assert.deepEqual(chat.deliver('peer','Mara',{...first,text:'Changed'},1002)!.receipt,{requestId:first.requestId,ok:false,reason:'invalid',retryAfterMs:0});
  const quick=request('Keep my second message');assert.deepEqual(chat.deliver('peer','Mara',quick,2000)!.receipt,{requestId:quick.requestId,ok:false,reason:'cooldown',retryAfterMs:500});
  const later=chat.deliver('peer','Mara',quick,2500)!;assert(later.receipt.ok);assert.equal(chat.history().length,2);assert.equal(later.message!.senderId,'peer');
  assert.equal(chat.deliver('peer','Mara',{text:'Missing ID'},4000),null);
  assert.equal(chat.deliver('peer','Mara',{...request('Hello'),senderId:'spoof'},4000)!.receipt.ok,false);
  assert.equal(chat.deliver('peer','Mara',request('<script>'),4000)!.receipt.ok,false);
  chat.subscribe('peer',false);const disabled=chat.deliver('peer','Mara',request('off'),4000)!.receipt;assert(!disabled.ok&&disabled.reason==='disabled');
  const unavailable=chat.deliver('peer','Mara',request('ready?'),4000,false)!.receipt;assert(!unavailable.ok&&unavailable.reason==='unavailable');
  chat.subscribe('peer',true);for(let i=0;i<70;i++)chat.deliver('peer','Mara',request('Message'+i),5000+i*1500);
  assert.equal(chat.history().length,50);assert(chat.deliver('peer','Mara',first,200000)!.message,'Only the latest16 receipts are retained per participant');
  chat.remove('peer');const removed=chat.deliver('peer','Mara',first,300000)!.receipt;assert(!removed.ok&&removed.reason==='disabled');
});

test('outbox waits for confirmation, retains a request after timeout/drop and permits a safe explicit retry or a genuinely new message',async()=>{
  const sent:ChatRequest[]=[],outbox=new ChatOutbox(r=>sent.push(r),20);try{
    assert(outbox.send('  Hello  ',true,true));assert.equal(outbox.state.status,'sending');assert.equal(sent[0].text,'Hello');assert(!outbox.send('Not another pending message',true,true));
    assert(!outbox.receive(receipt(request('Other'))));assert(!outbox.receive({...receipt(sent[0]),message:{...message(sent[0]),text:'Different'}}));
    await delay(35);assert.equal(outbox.state.status,'uncertain');assert.equal(outbox.state.draft,'  Hello  ');
    assert(outbox.send('  Hello  ',true,true));assert.equal(sent[1].requestId,sent[0].requestId);assert(outbox.receive(receipt(sent[1])));assert.equal(outbox.state.status,'sent');
    assert(!outbox.receive(receipt(sent[1])));assert(outbox.send('Next',true,true));assert.notEqual(sent[2].requestId,sent[1].requestId);
    outbox.disconnected();assert.equal(outbox.state.status,'uncertain');assert(!outbox.send('Next',false,true));assert.equal(outbox.state.status,'offline');
    assert(outbox.send('Next',true,true));assert.equal(sent[3].requestId,sent[2].requestId);assert(outbox.receive(receipt(sent[3])));
    assert(!outbox.send('<script>',true,true));assert.equal(outbox.state.status,'invalid');assert(!outbox.send('Valid',true,false));assert.equal(outbox.state.status,'disabled');
  }finally{outbox.destroy();}
});

test('late success still confirms the pending text; cooldown, disable, send failure and destroyed lifetimes preserve bounded state',async()=>{
  const sent:ChatRequest[]=[],outbox=new ChatOutbox(r=>sent.push(r),20);try{
    outbox.send('Late',true,true);await delay(35);assert.equal(outbox.state.status,'uncertain');assert(outbox.receive(receipt(sent[0])));assert.equal(outbox.state.status,'sent');
    outbox.send('Too quick',true,true);assert(outbox.receive({requestId:sent[1].requestId,ok:false,reason:'cooldown',retryAfterMs:20}));assert.equal(outbox.state.status,'cooldown');await delay(35);assert.equal(outbox.state.status,'idle');
    outbox.send('Too quick',true,true);assert.equal(sent[2].requestId,sent[1].requestId);outbox.disabled();assert.equal(outbox.state.status,'disabled');assert(outbox.receive(receipt(sent[2])));
    outbox.destroy();assert(!outbox.send('closed',true,true));assert(!outbox.receive(receipt(sent[2])));
    const failed=new ChatOutbox(()=>{throw Error('socket ended');},20);failed.send('Keep draft',true,true);assert.equal(failed.state.status,'uncertain');failed.destroy();
  }finally{outbox.destroy();}
});

test('actual peers receive explicit cooldown and reconnect retry acknowledges a lost confirmation without a duplicate broadcast',{timeout:20000},async()=>{
  const {server,httpServer}=createGameServer({audience:'public'});await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address==='object');
  const endpoint='http://127.0.0.1:'+address.port,a=new Session(endpoint),b=new Session(endpoint),wait=async(check:()=>boolean)=>{const end=Date.now()+7000;while(!check()){assert(Date.now()<end,'Chat transport timed out');await delay(15);}};
  a.setChatEnabled(true);b.setChatEnabled(true);
  try{
    const options={name:'Mara',classId:'soldier' as const,mode:'short' as const,difficulty:'baby'};await a.connect(options);await b.connect({...options,name:'Iona'},{roomId:a.room!.roomId});await wait(()=>a.status==='ui.ready'&&b.status==='ui.ready');
    assert(a.sendChat('First'));await wait(()=>a.chatDelivery.status==='sent'&&b.chatMessages.length===1);assert.equal(a.chatMessages.length,1);
    assert(a.sendChat('Second draft'));await wait(()=>a.chatDelivery.status==='cooldown');assert.equal(a.chatDelivery.draft,'Second draft');assert.equal(b.chatMessages.length,1);
    await delay(1600);assert(a.sendChat('Second draft'));await wait(()=>a.chatDelivery.status==='sent'&&b.chatMessages.length===2);
    await delay(1550);
    const authority=liveRooms.get(a.room!.roomId)!,peer=authority.clients.find(c=>c.sessionId===a.id)!,send=peer.send.bind(peer),lost:ChatReceipt[]=[];
    peer.send=((type:string|number,payload:unknown,options?:unknown)=>{
      if(type==='chatReceipt'&&isChatReceipt(payload)&&payload.ok&&payload.message.text==='Confirm once after reconnect')lost.push(payload);
      else send(type,payload,options as never);
    }) as typeof peer.send;
    const original=a.room!;
    assert(a.sendChat('Confirm once after reconnect'));await wait(()=>lost.length===1&&b.chatMessages.length===3);assert.equal(a.chatDelivery.status,'sending');
    peer.send=send;original.connection.close(CloseCode.MAY_TRY_RECONNECT,'chat fixture lost confirmation');await wait(()=>a.chatDelivery.status==='uncertain');
    await wait(()=>a.room!==original&&a.room!.connection.isOpen);await delay(100);
    const sentBefore=b.chatMessages.filter(m=>m.text==='Confirm once after reconnect').length;
    assert(a.sendChat('Confirm once after reconnect'));await wait(()=>a.chatDelivery.status==='sent');await delay(100);
    assert.equal(b.chatMessages.filter(m=>m.text==='Confirm once after reconnect').length,1);assert.equal(sentBefore,1);assert.equal(a.chatDelivery.requestId,lost[0].requestId);assert.equal(a.chatMessages.filter(m=>m.text==='Confirm once after reconnect').length,1);
    const live=liveRooms.get(a.room!.roomId)!;assert.equal(live.game.players.size,2);assert.equal(live.game.phase,'lobby');
  }finally{await Promise.allSettled([a.close(),b.close()]);await server.gracefullyShutdown(false);}
});
