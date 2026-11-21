import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data, implementedBossIds } from '../src/shared/game.ts';
import { HZ } from '../src/shared/protocol.ts';
import { BOSS_DEFEAT_TICKS, bossDefeatRemaining, showingBossDefeat } from '../src/shared/boss-defeat-flow.ts';
import { openingDefeatArt, bossDefeatFrame } from '../src/client/boss-defeat-presentation.ts';
import { earlyWatchArt } from '../src/client/early-watch-presentation.ts';
import { smallWakesArt } from '../src/client/small-wakes-presentation.ts';
import { constableArt } from '../src/client/constable-presentation.ts';
import { wardenArt } from '../src/client/warden-presentation.ts';
import { encounterFrame } from '../src/client/encounter-presentation.ts';
import { createGameServer } from '../src/server/service.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';

test('every authored falling sequence completes inside the defeat beat, with honest coverage of remaining settled poses',()=>{
  const clips=[...openingDefeatArt.entries,...earlyWatchArt,...smallWakesArt].map(c=>({id:c.bossId,ms:c.defeatFrames/c.defeatFps*1000}));
  clips.push({id:'constable',ms:constableArt.clips.defeat.frames/constableArt.clips.defeat.fps*1000});
  clips.push({id:'lantern-warden',ms:wardenArt.clips.defeat.frameDurationsMs.reduce((a,b)=>a+b,0)});
  const animated=new Set(clips.map(c=>c.id));assert.equal(animated.size,15);
  assert(Math.max(...clips.map(c=>c.ms))+500 <= BOSS_DEFEAT_TICKS/HZ*1000);
  const g=new Game();let settled=0;
  for(const id of implementedBossIds){
    if(animated.has(id))continue;
    const boss={...g.boss,id,health:0,defeatedAt:30};
    assert.equal(encounterFrame(boss,30,[],false),7,id+' settled defeat pose');settled++;
  }
  assert.equal(settled,51);
});

test('the full defeat beat stops combat without repeating rewards and leaves the complete vote duration afterward',()=>{
  const g=new Game({mode:'endless'}),p=g.addPlayer('solo','Mara','soldier');g.start();g.step();
  g.boss.health=0;g.step();
  const tick=g.tick,combat=g.combatTick,coins=p.coins,clears=p.progress.clears;
  assert(showingBossDefeat(g.boss,g.tick));assert.equal(bossDefeatRemaining(g.boss,g.tick),BOSS_DEFEAT_TICKS);
  assert.equal(g.phaseEnds-g.tick,BOSS_DEFEAT_TICKS+data.rules.mutationVoteSeconds*HZ);
  for(let i=1;i<BOSS_DEFEAT_TICKS;i++){g.step();assert(showingBossDefeat(g.boss,g.tick));assert.equal(g.phase,'mutationVote');assert.equal(g.combatTick,combat);assert.equal(p.coins,coins);assert.equal(p.progress.clears,clears);}
  g.step();assert.equal(g.tick,tick+BOSS_DEFEAT_TICKS);assert(!showingBossDefeat(g.boss,g.tick));
  assert.equal(g.phaseEnds-g.tick,data.rules.mutationVoteSeconds*HZ);
  assert.equal(g.shots.size,0);assert.equal(g.warnings.length,0);assert.equal(g.fields.length,0);
  assert(!showingBossDefeat({...g.boss,defeatedAt:0},g.tick));assert(!showingBossDefeat({...g.boss,health:1},g.tick));
});

test('a final campaign clear keeps its banked combat result while the fall finishes before the result screen',()=>{
  const g=new Game({difficulty:'baby'});g.addPlayer('solo','Mara','soldier');g.start();
  for(let fight=0;fight<5;fight++){
    if(fight)for(let i=0;g.phase!=='combat'&&i<8;i++){g.tick=g.phaseEnds;g.step();}
    assert.equal(g.phase,'combat');g.boss.health=0;g.step();
  }
  assert.equal(g.phase,'victory');assert(showingBossDefeat(g.boss,g.tick));
  const bank=structuredClone(g.campaignBank);assert(bank);
  for(let i=0;i<BOSS_DEFEAT_TICKS;i++)g.step();
  assert(!showingBossDefeat(g.boss,g.tick));assert.deepEqual(g.campaignBank,bank);assert.equal(g.combatTick,bank.combatTick);
  const clip=openingDefeatArt.entries[0],boss={...g.boss,id:clip.bossId as typeof g.boss.id};
  assert.equal(bossDefeatFrame(boss,boss.defeatedAt,true),clip.defeatStartFrame+clip.defeatFrames-1);
});

test('solo saves and trusted room boundaries resume the remaining fall without losing menu time or accepting forged fall state',()=>{
  const g=new Game({mode:'endless',maxPlayers:1}),p=g.addPlayer('solo','Mara','soldier');g.start();
  g.boss.x=721;g.boss.y=318;g.boss.health=0;g.step();
  for(let i=0;i<17;i++)g.step();
  const save=g.offlineCheckpoint()!,room=g.authoritativeCheckpoint()!;
  const copies=[Game.restoreOffline(save),Game.restoreAuthoritative(room)];
  for(const copy of copies){
    assert.equal(bossDefeatRemaining(copy.boss,copy.tick),BOSS_DEFEAT_TICKS-17);
    assert.equal(copy.boss.x,g.boss.x);assert.equal(copy.boss.y,g.boss.y);
    const coins=[...copy.players.values()][0].coins;
    for(let i=0;i<BOSS_DEFEAT_TICKS-17;i++)copy.step();
    assert.equal(copy.phaseEnds-copy.tick,data.rules.mutationVoteSeconds*HZ);
    assert.equal([...copy.players.values()][0].coins,coins);assert.equal(coins,p.coins);
  }
  assert.throws(()=>Game.restoreOffline({...save,defeatedBoss:{...save.defeatedBoss!,defeatedAt:g.tick+1}}),/invalidBossDefeat/);
  assert.throws(()=>Game.restoreAuthoritative({...room,defeatedBoss:{...room.defeatedBoss!,x:Infinity}}),/invalidBossDefeat/);
  assert.throws(()=>Game.restoreOffline({...save,defeatedBoss:{...save.defeatedBoss!,defeatedAt:0}}),/invalidBossDefeat/);
  const older={...save};delete (older as Partial<typeof older>).defeatedBoss;
  assert.equal(Game.restoreOffline(older).phase,'mutationVote');
});

test('real multiplayer peers observe the same defeat window and a full voting period after it', {timeout:15000}, async()=>{
  const {server,httpServer}=createGameServer({audience:'public'});await server.listen(0,'127.0.0.1');
  const address=httpServer.address();assert(address&&typeof address==='object');
  const owner=new Session('http://127.0.0.1:'+address.port),guest=new Session(owner.endpoint);
  const until=async(check:()=>boolean)=>{const end=Date.now()+6000;while(!check()){assert(Date.now()<end,'Defeat state timed out');await new Promise(r=>setTimeout(r,15));}};
  try{
    const opts={name:'Mara',classId:'soldier' as const,mode:'short' as const,difficulty:'baby'};
    await owner.connect(opts);await guest.connect({...opts,name:'Iona',classId:'medic'},{roomId:owner.room!.roomId});
    await until(()=>guest.view?.players.length===2);owner.start();await until(()=>owner.view?.phase==='combat');
    const g=liveRooms.get(owner.room!.roomId)!.game;for(const p of g.players.values())p.invulnerableUntil=1e9;
    // Dedicated temporary transport fixture, not a player clear or a live ranking submission.
    g.boss.health=0;
    await until(()=>Boolean(owner.view?.boss.defeatedAt&&guest.view?.boss.defeatedAt));
    assert.equal(owner.view!.boss.defeatedAt,guest.view!.boss.defeatedAt);assert.equal(owner.view!.phaseEnds,guest.view!.phaseEnds);
    assert(showingBossDefeat(owner.view!.boss,owner.view!.tick));assert(showingBossDefeat(guest.view!.boss,guest.view!.tick));
    const combat=owner.view!.combatTick;
    await until(()=>!showingBossDefeat(owner.view!.boss,owner.view!.tick)&&!showingBossDefeat(guest.view!.boss,guest.view!.tick));
    assert.equal(owner.view!.combatTick,combat);assert.equal(guest.view!.combatTick,combat);
    assert(owner.view!.phaseEnds-owner.view!.tick>=data.rules.mutationVoteSeconds*HZ-8);
  }finally{await Promise.allSettled([guest.close(),owner.close()]);await server.gracefullyShutdown(false);}
});
