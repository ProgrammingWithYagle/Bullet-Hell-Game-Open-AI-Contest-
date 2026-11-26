import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createGameServer } from '../src/server/service.ts';
import { TeamRecordStore } from '../src/server/team-record-store.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
import { CloseCode } from '@colyseus/sdk';
import { fetchBoard, fetchRoster } from '../src/client/team-records.ts';
const until = async (check: () => boolean, ms = 7000) => {
  const deadline = Date.now() + ms;
  while (!check()) { assert(Date.now() < deadline,'Network state timed out'); await new Promise(r => setTimeout(r,15)); }
};
const options = { name: 'Mara', classId: 'soldier' as const, mode: 'short' as const, difficulty: 'normal' };

test('real private-room peers share a server result, can read its paged roster, and retain it after a complete server restart', { timeout: 30000 }, async () => {
  const dir = mkdtempSync(join(tmpdir(),'grave-record-network-'));
  const store = new TeamRecordStore(join(dir,'records.sqlite'));
  const first = createGameServer({ audience:'public', records:store });
  await first.server.listen(0,'127.0.0.1');
  const addr = first.httpServer.address(); assert(addr && typeof addr === 'object');
  const endpoint = 'http://127.0.0.1:' + addr.port;
  const owner = new Session(endpoint), guest = new Session(endpoint);
  const guestStatuses: string[] = [];
  guest.onStatus = status => guestStatuses.push(status);
  let runId = '';
  try {
    owner.setChatEnabled(true); guest.setChatEnabled(true);
    await owner.connect(options, undefined, 'private');
    await until(() => Boolean(owner.code));
    await guest.connect({ ...options,name:'Iona',classId:'medic' }, { code:owner.code });
    await until(() => owner.view?.players.length === 2 && guest.view?.players.length === 2);
    assert(owner.sendChat('Ready for the next fight?'));
    await until(() => guest.chatMessages.length === 1);
    assert.equal(guest.chatMessages[0].name,'Mara');
    const beforeReconnect = guest.room;
    guest.room!.connection.close(CloseCode.MAY_TRY_RECONNECT,'team-record reconnect fixture');
    await until(() => guest.room !== beforeReconnect && guestStatuses.includes('ui.reconnected') && guest.room?.connection.isOpen === true);
    assert.equal(guest.id,beforeReconnect!.sessionId);
    assert.equal(guest.chatMessages.length,1);
    assert.equal((await fetch(endpoint+'/api/rooms').then(r=>r.json())).length,0,'Private room is not listed');
    const live = liveRooms.get(owner.room!.roomId)!;
    owner.start(); await until(() => live.game.phase === 'combat');
    // Server-owned fast-forward fixture: validates transport and finalization, not human gameplay or a legitimate public entry.
    for(let fight=0;fight<5;fight++) {
      if(fight) for(let step=0;live.game.phase!=='combat'&&step<8;step++) {
        live.game.phaseEnds=live.game.tick+1;
        const before=live.game.phase;
        await until(()=>live.game.phase!==before);
      }
      assert.equal(live.game.phase,'combat');
      for(const p of live.game.players.values())p.invulnerableUntil=1e9;
      live.game.boss.health=0; await until(()=>live.game.phase!=='combat');
    }
    await until(()=>owner.teamRecord?.status==='saved'&&guest.teamRecord?.status==='saved');
    assert.deepEqual(owner.teamRecord,guest.teamRecord);
    if(owner.teamRecord?.status!=='saved')throw Error('Shared team record missing');
    runId=owner.teamRecord.record.runId;
    const query=new URLSearchParams({mode:'short',difficulty:'normal',sizeBand:'2-4'});
    const board=await fetchBoard(endpoint,query), roster=await fetchRoster(endpoint,runId);
    assert.equal(board.total,1);assert.equal(board.rows[0].rank,1);assert.equal(roster.participants.length,2);
    assert.deepEqual(roster.participants.map(p=>p.name).sort(),['Iona','Mara']);
    const serialized=JSON.stringify({board,roster});
    for(const secret of [owner.id,guest.id,owner.code,owner.room!.roomId,owner.room!.reconnectionToken])assert(!serialized.includes(secret),'Private transport identity leaked');
    assert.equal((await fetch(endpoint+'/api/leaderboards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({score:1000000})})).status,405);
    for(const suffix of ['?mode=short&sizeBand=17-50','?offset=-1','?limit=999','?week=2026-10-27','?mode[]=short','?unknown=1'])
      assert.equal((await fetch(endpoint+'/api/leaderboards'+suffix)).status,400,suffix);
  } finally {
    await Promise.allSettled([guest.close(),owner.close()]);
    await first.server.gracefullyShutdown(false); store.close();
  }
  const reopened=new TeamRecordStore(join(dir,'records.sqlite'));
  const second=createGameServer({audience:'public',records:reopened});
  await second.server.listen(0,'127.0.0.1');
  try {
    const addr2=second.httpServer.address();assert(addr2&&typeof addr2==='object');
    const roster=await fetchRoster('http://127.0.0.1:'+addr2.port,runId);
    assert.equal(roster.record.rank,1);assert.equal(roster.participants.length,2);
  } finally {
    await second.server.gracefullyShutdown(false);reopened.close();
    assert(resolve(dir).startsWith(resolve(tmpdir())+'\\grave-record-network-')||resolve(dir).startsWith(resolve(tmpdir())+'/grave-record-network-'));
    rmSync(dir,{recursive:true,force:true});
  }
});

test('only the host may end an endless run during a break; testing servers cannot create team records', {timeout:20000}, async()=>{
  for(const audience of ['public','testing'] as const){
    const store=new TeamRecordStore(':memory:');const {server,httpServer}=createGameServer({audience,records:store});
    await server.listen(0,'127.0.0.1');const addr=httpServer.address();assert(addr&&typeof addr==='object');
    const endpoint='http://127.0.0.1:'+addr.port;
    const owner=new Session(endpoint),guest=new Session(endpoint);
    try{
      const opts={...options,mode:'endless' as const};
      await owner.connect(opts);await guest.connect({...opts,name:'Iona'},{roomId:owner.room!.roomId});
      await until(()=>guest.view?.players.length===2);owner.start();
      const g=liveRooms.get(owner.room!.roomId)!.game;await until(()=>g.phase==='combat');
      owner.endRun();await new Promise(r=>setTimeout(r,80));assert.equal(g.phase,'combat');
      for(const p of g.players.values())p.invulnerableUntil=1e9;
      g.boss.health=0;await until(()=>g.phase==='mutationVote');
      guest.endRun();await new Promise(r=>setTimeout(r,80));assert.equal(g.phase,'mutationVote');
      owner.endRun();await until(()=>g.phase==='victory');
      if(audience==='public'){await until(()=>guest.teamRecord?.status==='saved');assert.equal(store.board({mode:'endless',difficulty:'normal',sizeBand:'2-4'}).total,1);}
      else{assert.equal(store.board({mode:'endless',difficulty:'normal',sizeBand:'2-4'}).total,0);assert.equal(owner.teamRecord,undefined);}
    }finally{await Promise.allSettled([guest.close(),owner.close()]);await server.gracefullyShutdown(false);store.close();}
  }
});
