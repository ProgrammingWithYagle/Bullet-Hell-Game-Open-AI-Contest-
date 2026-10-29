import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,data} from '../src/shared/game.ts';
import {PROTOCOL,CONTENT_REVISION} from '../src/shared/protocol.ts';
import {BOSS_DEFEAT_TICKS} from '../src/shared/boss-defeat-flow.ts';
import {finishBossDefeat} from './helpers/boss-defeat.ts';
import {viewOf} from '../src/shared/view.ts';
import {waitingRoomMarkup,mapChoiceLabel} from '../src/client/ui/waiting-room.ts';
import {createGameServer} from '../src/server/service.ts';
import {liveRooms,roomCodes} from '../src/server/GraveRoom.ts';
import {Session} from '../src/client/session.ts';
import {formatMessage,type Message} from '../src/shared/messages.ts';
import {readFileSync} from 'node:fs';

function nextFight(g:Game){finishBossDefeat(g);for(let n=0;g.phase!=='combat'&&n<5;n++){g.phaseEnds=g.tick;g.step();}assert.equal(g.phase,'combat');}
test('an explicitly selected map stays fixed in every mode, through falls, choices, saves and later fights',()=>{
  for(const map of data.arenas)for(const mode of data.modes){
    let g=new Game({mode:mode.id as 'short',openingArenaId:map.id,difficulty:'baby',maxPlayers:1});g.addPlayer('solo','Mara','soldier');g.start();
    for(let fight=0;fight<3;fight++){
      assert.equal(g.arena.id,map.id);g.boss.x=711;g.boss.y=330;g.boss.health=0;g.step();
      const point={x:g.boss.x,y:g.boss.y},combat=g.combatTick;
      assert.equal(g.arena.id,map.id);if(g.phase==='mutationVote')assert.equal(g.phaseEnds-g.tick,BOSS_DEFEAT_TICKS+data.rules.mutationVoteSeconds*30,mode.id);
      const save=g.offlineCheckpoint();if(save){g=Game.restoreOffline(save);assert.equal(g.arena.id,map.id);assert.deepEqual({x:g.boss.x,y:g.boss.y},point);}
      finishBossDefeat(g);assert.equal(g.combatTick,combat);assert.equal(g.arena.id,map.id);
      if(g.phase==='victory'||g.phase==='secretOffer')break;nextFight(g);
    }
  }
});
test('random-run maps stay fixed and random-each-fight changes only on deployment, reproducibly across saves',()=>{
  for(const arenaSelection of ['randomRun','randomEncounter'] as const){
    let g=new Game({mode:'endless',seed:829,maxPlayers:1,arenaSelection});g.addPlayer('solo','Mara','soldier');g.start();
    const maps=new Set<string>(),first=g.arena.id;
    for(let fight=0;fight<10;fight++){
      const map=g.arena.id;maps.add(map);if(arenaSelection==='randomRun')assert.equal(map,first);
      g.boss.health=0;g.step();assert.equal(g.arena.id,map);
      const copy=Game.restoreOffline(g.offlineCheckpoint()!);nextFight(g);nextFight(copy);
      assert.equal(copy.arena.id,g.arena.id);assert.equal(copy.boss.id,g.boss.id);g=copy;
    }
    assert.equal(arenaSelection==='randomRun'?maps.size===1:maps.size>2,true);
  }
});
test('authored route floors remain still throughout a fall; one defeat cue is emitted and old local saves retain the chosen map',()=>{
  const g=new Game({mode:'endless'});g.addPlayer('solo','Mara','soldier');g.start();
  const before=g.arena.id;g.drainEvents();g.boss.health=0;g.step();assert.equal(g.arena.id,before);
  assert.equal(g.drainEvents().filter(e=>e.type==='sound'&&e.id==='boss-defeated').length,1);
  finishBossDefeat(g);assert.equal(g.arena.id,before);assert(!g.drainEvents().some(e=>e.type==='sound'&&e.id==='boss-defeated'));
  const old=g.offlineCheckpoint()! as unknown as Record<string,unknown>;old.protocolVersion=38;
  delete old.arenaId;delete (old.settings as Record<string,unknown>).arenaSelection;
  const restored=Game.restoreOffline(old);assert.equal(restored.settings.arenaSelection,'fixed');assert.equal(PROTOCOL, 40);
  assert.throws(()=>Game.restoreOffline({...old,serverOnly:true}),/versionMismatch/);
  assert.throws(()=>Game.restoreAuthoritative({...g.authoritativeCheckpoint(),protocolVersion:38}),/versionMismatch/);
  assert.equal(restored.offlineCheckpoint()!.contentRevision,CONTENT_REVISION);
});
test('waiting-room names, classes, host status, map choice and counts are readable and escaped in all fifteen catalogs',()=>{
  const g=new Game({arenaSelection:'randomEncounter'});g.addPlayer('host','<Mara>','soldier');g.addPlayer('guest','Iona','medic');g.setConnected('guest',false);
  const view=viewOf(g,'host');
  for(const locale of data.locales){
    const catalog=JSON.parse(readFileSync('locales/'+locale.id+'.json','utf8'));
    const t=(key:string,args:Record<string,string|number>={})=>formatMessage(catalog.messages[key] as Message,locale.id,args);
    const html=waitingRoomMarkup(view,'host','ABC234',t,String);
    assert(html.includes('&lt;Mara&gt;'));assert(!html.includes('<Mara>'));assert(html.includes('ABC234'));
    assert(html.includes(t('class.medic.name')));assert(html.includes(t('ui.lobbyHost')));
    assert(html.includes(t('ui.lobbyDisconnected')));assert.equal(mapChoiceLabel(view,t),t('ui.randomMapEncounter'));
    assert(!html.includes('undefined'));assert(!html.includes('Room settings'));
  }
});
test('public and private rooms wait for their host, accept their code during play and retain one map and defeat position for both peers',{timeout:25000},async()=>{
  const {server,httpServer}=createGameServer({audience:'public'});await server.listen(0,'127.0.0.1');
  const address=httpServer.address();assert(address&&typeof address==='object');const endpoint='http://127.0.0.1:'+address.port;
  const wait=async(check:()=>boolean)=>{const end=Date.now()+7000;while(!check()){assert(Date.now()<end,'Room state timed out');await new Promise(r=>setTimeout(r,15));}};
  try{for(const visibility of ['public','private'] as const){
    const host=new Session(endpoint),guest=new Session(endpoint),late=new Session(endpoint);let code='';
    try{
      const opts={name:'Mara',classId:'soldier' as const,mode:'endless' as const,difficulty:'baby',openingArenaId:'sunken-chapel',arenaSelection:'fixed' as const};
      await host.connect(opts,undefined,visibility);await wait(()=>Boolean(host.code));code=host.code;
      assert.match(code,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      await guest.connect({...opts,name:'Iona',classId:'medic'}, {code});await wait(()=>host.view?.players.length===2);
      guest.start();await new Promise(r=>setTimeout(r,250));assert.equal(host.view!.phase,'lobby');assert.equal(guest.view!.phase,'lobby');
      const listing=await fetch(endpoint+'/api/rooms').then(r=>r.json());assert.equal(listing.some((r:{roomId:string})=>r.roomId===host.room!.roomId),visibility==='public');
      host.start();await wait(()=>host.view?.phase==='combat'&&guest.view?.phase==='combat');
      assert.equal(host.view!.arenaId,'sunken-chapel');assert.equal(guest.view!.arenaId,'sunken-chapel');
      const game=liveRooms.get(host.room!.roomId)!.game;game.boss.x=1103;game.boss.y=470;for(const p of game.players.values())p.invulnerableUntil=1e9;
      game.boss.health=0;await wait(()=>Boolean(host.view?.boss.defeatedAt&&guest.view?.boss.defeatedAt));
      assert.equal(host.view!.boss.x,1103);assert.equal(host.view!.boss.y,470);assert.equal(guest.view!.boss.x,1103);
      assert.equal(host.view!.arenaId,'sunken-chapel');assert.equal(guest.view!.arenaId,'sunken-chapel');
      await late.connect({...opts,name:'Tess'}, {code});
      await wait(()=>host.view?.players.length===3&&late.code===code&&late.view?.arenaId==='sunken-chapel');
      assert.equal(late.code,code);assert.equal(late.view!.arenaId,'sunken-chapel');
      assert(roomCodes.has(code));
    }finally{await Promise.allSettled([late.close(),guest.close(),host.close()]);}
  }}finally{await server.gracefullyShutdown(false);}
});
