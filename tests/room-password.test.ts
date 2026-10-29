import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Client,CloseCode} from '@colyseus/sdk';
import {createGameServer} from '../src/server/service.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {createRoomPassword,matchesRoomPassword} from '../src/server/room-password.ts';
import {validRoomPassword} from '../src/shared/room-password-policy.ts';
import {Session} from '../src/client/session.ts';
import {Game} from '../src/shared/game.ts';
import {PROTOCOL,CONTENT_REVISION} from '../src/shared/protocol.ts';
import {capacity} from '../src/server/capacity.ts';
const until=async(check:()=>boolean)=>{const end=Date.now()+8000;while(!check()){assert(Date.now()<end,'Password room state timed out');await new Promise(r=>setTimeout(r,20));}};

test('room passwords use separate salted verifiers, bounded Unicode text and exact case/space matching',async()=>{
  for(const bad of [null,{},['hello'],123,true,'abc','a'.repeat(65)]){assert(!validRoomPassword(bad));await assert.rejects(()=>createRoomPassword(bad),/invalidPasswordSetting/);}
  assert(validRoomPassword('',true));assert(!validRoomPassword(''));assert(validRoomPassword('🙂'.repeat(64)));assert(!validRoomPassword('🙂'.repeat(65)));
  assert.equal(await createRoomPassword(undefined),null);assert.equal(await createRoomPassword(''),null);
  const a=(await createRoomPassword(' Abcd 密碼 '))!,b=(await createRoomPassword(' Abcd 密碼 '))!;
  assert.notDeepEqual(a.salt,b.salt);assert.notDeepEqual(a.digest,b.digest);assert(!JSON.stringify(a).includes('Abcd'));
  assert(await matchesRoomPassword(a,' Abcd 密碼 '));assert(!await matchesRoomPassword(a,' abcd 密碼 '));assert(!await matchesRoomPassword(a,'Abcd 密碼'));assert(!await matchesRoomPassword(a,{}));
});

test('real public/private password rooms reject missing/wrong passwords, prompt lookup safely, reconnect and keep host authority',{timeout:35000},async()=>{
  const {server,httpServer}=createGameServer({audience:'public'});await server.listen(0,'127.0.0.1');
  const address=httpServer.address();assert(address&&typeof address==='object');const endpoint='http://127.0.0.1:'+address.port;
  const password='Test-only 密碼 42';
  const opts={name:'Mara',classId:'soldier' as const,mode:'endless' as const,difficulty:'baby',openingArenaId:'triage-yard',arenaSelection:'fixed' as const};
  const sessions:Session[]=[];
  try{for(const visibility of ['public','private'] as const){
    const host=new Session(endpoint),guest=new Session(endpoint),late=new Session(endpoint),failed=new Session(endpoint);sessions.push(host,guest,late,failed);
    try{
      await host.connect(opts,undefined,visibility,password);await until(()=>Boolean(host.code&&host.view));assert(host.hasPassword);
      const id=host.room!.roomId,authority=liveRooms.get(id)!;
      const lookup=await guest.lookupRoom(host.code);assert.deepEqual(lookup,{roomId:id,hasPassword:true});
      const listing=await host.rooms();assert.equal(listing.some(r=>r.roomId===id),visibility==='public');
      if(visibility==='public'){assert.equal(listing.find(r=>r.roomId===id)!.hasPassword,true);assert.equal(listing.find(r=>r.roomId===id)!.name,'Mara');assert.equal(Object.keys(listing.find(r=>r.roomId===id)!).sort().join(','),'contentRevision,difficulty,hasPassword,maximumPlayers,mode,name,phase,players,roomId');}
      assert(!JSON.stringify(listing).includes(password));assert(!JSON.stringify(lookup).includes(password));
      await assert.rejects(()=>failed.connect({...opts,name:'Wrong'},{code:host.code,password:'wrong'}),/ui.errorRoomPassword/);
      const raw=new Client(endpoint),settings={...opts,createKey:randomUUID(),protocolVersion:PROTOCOL,contentRevision:CONTENT_REVISION,visibility,code:host.code};
      await assert.rejects(()=>raw.joinById(id,settings),/passwordRequired/);
      await assert.rejects(()=>raw.joinById(id,{...settings,password:'test-only 密碼 42'}),/invalidPassword/);
      if(visibility==='private')await assert.rejects(()=>raw.joinById(id,{...settings,code:undefined,password}),/invalidCode/);
      assert.equal(authority.clients.length,1);assert.equal(authority.game.players.size,1);
      await guest.connect({...opts,name:'Iona',classId:'medic'},{roomId:lookup.roomId,code:host.code,password});await until(()=>host.view?.players.length===2&&guest.hasPassword);
      guest.start();await new Promise(r=>setTimeout(r,150));assert.equal(host.view!.phase,'lobby');
      host.start();await until(()=>host.view?.phase==='combat'&&guest.view?.phase==='combat');
      assert(!JSON.stringify(authority.game.authoritativeCheckpoint()).includes(password));assert(!JSON.stringify(authority.state.toJSON()).includes(password));assert(!JSON.stringify(authority.metadata).includes(password));
      for(const p of authority.game.players.values())p.invulnerableUntil=1e9;
      const statuses:string[]=[];guest.onStatus=key=>statuses.push(key);
      const original=guest.room!,guestId=guest.id;original.connection.close(CloseCode.MAY_TRY_RECONNECT,'password fixture reconnect');
      await until(()=>guest.room!==original&&statuses.includes('ui.reconnected'));assert.equal(guest.id,guestId);assert(guest.hasPassword);assert.equal(authority.game.players.size,2);
      await late.connect({...opts,name:'Tess'},{code:host.code,password});await until(()=>host.view?.players.length===3&&late.hasPassword);
    }finally{await Promise.allSettled([host.close(),guest.close(),late.close(),failed.close()]);}
  }
  const open=new Session(endpoint);sessions.push(open);await open.connect(opts);await until(()=>Boolean(open.code));assert.equal(open.hasPassword,false);
  assert.equal((await open.lookupRoom(open.code)).hasPassword,false);
  }finally{await Promise.allSettled(sessions.map(s=>s.close()));await server.gracefullyShutdown(false);}
  assert.equal(capacity.slots.size,0);assert.equal(capacity.rooms.size,0);
});

test('protocol40 local saves keep equipment, economy, selected map and identity; server checkpoints stay strict',()=>{
  const g=new Game({maxPlayers:1,mode:'endless',arenaSelection:'randomRun',openingArenaId:'crown-crypt'});const p=g.addPlayer('solo','Mara','medic');p.coins=1983;
  const old=g.offlineCheckpoint()!;old.protocolVersion=40;const restored=Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL,41);assert.equal(restored.protocolVersion,41);assert.equal(restored.contentRevision,CONTENT_REVISION);
  assert.deepEqual(restored.settings,old.settings);assert.deepEqual(restored.player,old.player);assert.equal(restored.arenaId,old.arenaId);
  assert.throws(()=>Game.restoreOffline({...old,contentRevision:'unknown'}),/versionMismatch/);
  assert.throws(()=>Game.restoreOffline({...old,serverOnly:true}),/versionMismatch/);
  assert.throws(()=>Game.restoreAuthoritative({...g.authoritativeCheckpoint(),protocolVersion:40}),/versionMismatch/);
});
