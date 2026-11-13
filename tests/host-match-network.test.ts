import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../src/server/service.ts';
import {TeamRecordStore} from '../src/server/team-record-store.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {Session} from '../src/client/session.ts';
import {idleInput} from '../src/shared/protocol.ts';
import {CloseCode} from '@colyseus/sdk';
import {Game} from '../src/shared/game.ts';
import {RoomJournal} from '../src/server/room-journal.ts';
import type {RunJournal} from '../src/server/run-journal.ts';
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async(check:()=>boolean)=>{const end=Date.now()+6000;while(!check()){assert(Date.now()<end,'Host state timed out');await wait(15);}};
const opts={name:'Mara',classId:'soldier' as const,mode:'short' as const,difficulty:'baby'};

test('host-only pause freezes real peers, chat stays live, leaving resumes and transfers private invite access, end reaches everyone',{timeout:20000},async()=>{
 const records=new TeamRecordStore(':memory:'),{server,httpServer}=createGameServer({audience:'public',records});await server.listen(0,'127.0.0.1');
 const address=httpServer.address();assert(address&&typeof address!=='string');const endpoint='http://127.0.0.1:'+address.port;
 const host=new Session(endpoint),guest=new Session(endpoint),peer=new Session(endpoint),late=new Session(endpoint),sessions=[host,guest,peer,late];
 const password='Host-only test 密碼';
 try {
  for(const s of sessions)s.setChatEnabled(true);
  await host.connect(opts,undefined,'public',password);await until(()=>Boolean(host.code)&&Boolean(host.view));
  const roomId=host.room!.roomId;await guest.connect({...opts,name:'Fin'},{roomId,password});await peer.connect({...opts,name:'Rue'},{roomId,password});
  await until(()=>host.view?.players.length===3&&peer.view?.players.length===3);
  assert.equal(host.hostPassword,password);assert.equal(guest.hostPassword,undefined);assert.equal(peer.hostPassword,undefined);
  assert(!JSON.stringify(host).includes(password));assert(!JSON.stringify(guest).includes(password));
  const live=liveRooms.get(roomId)!;assert(!JSON.stringify(live.state.toJSON()).includes(password));assert(!JSON.stringify(live.game.authoritativeCheckpoint()).includes(password));
  host.start();await until(()=>host.view?.phase==='combat'&&peer.view?.phase==='combat');for(const p of live.game.players.values())p.invulnerableUntil=1e9;
  const moving=live.game.tick;guest.pause(true);guest.setChatEnabled(false);guest.setChatEnabled(true);guest.room!.send('pauseMatch',true);guest.room!.send('endMatch');
  await until(()=>live.game.tick>moving+3);assert.equal(live.state.matchPaused,false);assert.equal(live.game.phase,'combat');
  host.setMatchPaused(true);await until(()=>host.view?.matchPaused===true&&peer.view?.matchPaused===true);
  const frozen=()=>JSON.stringify({tick:live.game.tick,combatTick:live.game.combatTick,boss:live.game.boss,shots:[...live.game.shots.values()],fields:live.game.fields,warnings:live.game.warnings,players:[...live.game.players.values()].map(p=>({x:p.x,y:p.y,hp:p.health,ack:p.ack,revive:p.reviveProgress,pending:p.pending}))});
  const before=frozen();peer.room!.send('pauseMatch',false);peer.room!.send('input',{...idleInput(),sequence:1,moveX:1,fire:true});
  assert(host.sendChat('Chat continues while the match is paused.'));await until(()=>peer.chatMessages.some(m=>m.text==='Chat continues while the match is paused.'));
  await wait(180);assert.equal(frozen(),before);assert.equal(live.state.matchPaused,true);
  await host.close();await until(()=>guest.view?.owner===guest.id&&peer.view?.matchPaused===false);assert.equal(host.hostPassword,undefined);assert.equal(guest.hostPassword,password);assert.equal(peer.hostPassword,undefined);
  const resumed=live.game.tick;await until(()=>live.game.tick>resumed+3);assert.equal(live.game.phase,'combat');
  guest.setMatchPaused(true);await until(()=>guest.view?.matchPaused===true);peer.room!.send('endMatch');await wait(100);assert.equal(live.game.phase,'combat');
  guest.endMatch();await until(()=>guest.view?.endedByHost===true&&peer.view?.endedByHost===true&&peer.view.phase==='defeat');
  assert.equal(live.state.matchPaused,false);assert.equal(live.game.encounter,0);assert.equal(guest.view!.matchPaused,false);
  const board=await (await fetch(endpoint+'/api/leaderboards?mode=short&difficulty=baby&sizeBand=2-4')).json();assert.equal(board.total,0);
  await assert.rejects(late.connect({...opts,name:'Too late'},{roomId,password}),/ui.errorRoomUnavailable/);
 } finally {await Promise.allSettled(sessions.map(s=>s.close()));await server.gracefullyShutdown(false);records.close();}
});

test('explicit pause holds the real intermission clock, rejects transactions, and Continue restores the same remaining time',{timeout:12000},async()=>{
 const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address!=='string');
 const endpoint='http://127.0.0.1:'+address.port,host=new Session(endpoint),guest=new Session(endpoint);
 try {
  await host.connect(opts);await until(()=>Boolean(host.code));await guest.connect({...opts,name:'Fin'},{code:host.code});await until(()=>guest.view?.players.length===2);
  host.start();await until(()=>guest.view?.phase==='combat');const live=liveRooms.get(host.room!.roomId)!;
  live.game.phase='shop';live.game.phaseEnds=live.game.tick+600;live.game.players.get(guest.id)!.coins=300;
  host.setMatchPaused(true);await until(()=>guest.view?.matchPaused===true);const tick=live.game.tick,ends=live.game.phaseEnds;
  let result:{ok:boolean;reason?:string}|undefined;guest.onPurchase=value=>{result=value;};guest.purchase({kind:'supply',item:'medkit'});await until(()=>Boolean(result));assert.equal(result!.reason,'matchPaused');
  await wait(160);assert.equal(live.game.tick,tick);assert.equal(live.game.phaseEnds,ends);assert.equal(live.game.players.get(guest.id)!.coins,300);
  host.setMatchPaused(false);await until(()=>guest.view?.matchPaused===false&&live.game.tick>tick+2);assert.equal(live.game.phase,'shop');assert.equal(live.game.phaseEnds,ends);
 } finally {await Promise.allSettled([host.close(),guest.close()]);await server.gracefullyShutdown(false);}
});

test('a dropped paused host reconnects without taking host control back or stopping the remaining player',{timeout:15000},async()=>{
 const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address!=='string');
 const endpoint='http://127.0.0.1:'+address.port,host=new Session(endpoint),guest=new Session(endpoint),password='Reconnect-only test';
 try {
  await host.connect(opts,undefined,'private',password);await until(()=>Boolean(host.code));await guest.connect({...opts,name:'Fin'},{code:host.code,password});await until(()=>guest.view?.players.length===2);
  host.start();await until(()=>guest.view?.phase==='combat');const room=liveRooms.get(host.room!.roomId)!;for(const p of room.game.players.values())p.invulnerableUntil=1e9;
  host.setMatchPaused(true);await until(()=>guest.view?.matchPaused===true);const tick=room.game.tick,old=host.room,statuses:string[]=[];host.onStatus=key=>statuses.push(key);
  host.room!.connection.close(CloseCode.MAY_TRY_RECONNECT,'paused host transport interruption');await until(()=>guest.isHost&&guest.view?.matchPaused===false&&room.game.tick>tick+2);
  await until(()=>host.room!==old&&statuses.includes('ui.reconnected')&&host.view?.owner===guest.id);assert.equal(host.hostPassword,undefined);assert.equal(guest.hostPassword,password);assert.equal(host.isHost,false);
  host.room!.send('pauseMatch',true);await wait(100);assert.equal(room.state.matchPaused,false);assert.equal(room.game.phase,'combat');
 } finally {await Promise.allSettled([host.close(),guest.close()]);await server.gracefullyShutdown(false);}
});

test('a manually paused journal renews its lease without stepping the game or its timers',async()=>{
 const game=new Game();game.addPlayer('host','Mara','soldier');game.start();let now=50000,refreshes=0;
 const writer={status:'acknowledged',refreshLease:async()=>{refreshes++;return true;}} as unknown as RunJournal;
 const journal=new RoomJournal(game,writer,()=>{},()=>now),tick=game.tick,combatTick=game.combatTick;
 journal.step(true);await wait(0);assert.equal(refreshes,1);assert.equal(game.tick,tick);assert.equal(game.combatTick,combatTick);
 now+=31000;journal.step(true);await wait(0);assert.equal(refreshes,2);assert.equal(game.tick,tick);
 journal.step(false);assert.equal(game.tick,tick+1);assert.equal(game.combatTick,combatTick+1);journal.dispose();
});
