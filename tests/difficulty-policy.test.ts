import {build} from 'esbuild';
import {createGameServer} from '../src/server/index.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {Session} from '../src/client/session.ts';
import {parseProfile,exportProfile,recordProfileView,loadProfile} from '../src/client/profile.ts';
import {smallWakesIds} from '../src/shared/small-wakes-director.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,data,type Player} from '../src/shared/game.ts';
import {combatReviveFraction,phaseShieldBreak,encounterPhases,bossPatternPhase,phaseMarkers} from '../src/shared/encounter-policy.ts';
import {bossThreat,classifiedContract} from '../src/shared/boss-threat.ts';
import {createPracticeGame} from '../src/shared/practice-start.ts';
import {idleInput,HZ,PROTOCOL} from '../src/shared/protocol.ts';
import {runtimeArena,runtimeArenas} from '../src/shared/arena-layouts.ts';
import {viewOf} from '../src/shared/view.ts';
import {Prediction} from '../src/client/prediction.ts';
import {BrutalVolley} from '../src/shared/brutal-volley.ts';
import {arenaGroundPlacement} from '../src/client/arena-presentation.ts';
import {arenaCoverPlan} from '../src/client/arena-covers.ts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

function quiet(difficulty='normal',count=2){
  const g=new Game({difficulty,maxPlayers:Math.max(count,2),mode:'endless'});
  for(let n=0;n<count;n++)g.addPlayer('p'+n,'Survivor '+n,n===0?'medic':'soldier');
  assert(g.start());g.boss.staggerUntil=g.boss.deadline=1e9;
  for(const p of g.players.values()){p.invulnerableUntil=1e9;p.x=800;p.y=730;}
  return g;
}
function input(g:Game,p:Player,values:Partial<ReturnType<typeof idleInput>>={}){
  assert(g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,...values}));g.step();
}
function down(g:Game,p:Player){p.invulnerableUntil=0;g.damage(p,10000);assert.equal(p.status,'downed');}

test('difficulty assist matrix separates phase shields, revival health and Brutal across every difficulty',()=>{
  const fractions=[1,.5,.25,0,0,0];
  for(const [i,d] of data.difficulties.entries()){
    assert.equal(combatReviveFraction(d.id),fractions[i]);
    assert.equal(phaseShieldBreak(d.id,'normal'),i<2);
    assert.equal(phaseShieldBreak(d.id,'brutal'),false);
  }
  assert.equal(combatReviveFraction('forged'),0);
  assert.equal(phaseShieldBreak('forged','normal'),false);
});
test('actual teammate channels restore full Baby, half Easy or quarter Normal health and cannot revive at Hard+',()=>{
  for(const d of data.difficulties){
    const g=quiet(d.id),caster=g.players.get('p0')!,target=g.players.get('p1')!;
    down(g,target);
    for(let n=0;n<62;n++)input(g,caster,{interact:true});
    const fraction=combatReviveFraction(d.id);
    assert.equal(target.status,fraction?'active':'downed',d.id);
    assert.equal(target.health,target.maxHealth*fraction,d.id);
    assert.equal(caster.progress.rescues,fraction?1:0);
    if(!fraction){assert.equal(caster.reviveProgress,0);assert.equal(caster.reviveTarget,'');}
  }
});
test('solo recovery obeys the same health rule and Hard+ has no hidden recovery grace',()=>{
  for(const d of data.difficulties){
    const g=quiet(d.id,1),p=g.players.get('p0')!;down(g,p);
    for(let n=0;n<60&&g.phase==='combat';n++)input(g,p,{interact:true});
    const fraction=combatReviveFraction(d.id);
    assert.equal(g.phase,fraction?'combat':'defeat');
    assert.equal(p.health,p.maxHealth*fraction);
    assert.equal(p.selfRevives,0);
  }
});
test('Medic resurrection and injected legacy revive supplies cannot bypass the difficulty rule',()=>{
  for(const d of data.difficulties){
    const g=quiet(d.id),caster=g.players.get('p0')!,target=g.players.get('p1')!;
    target.status='eliminated';target.health=0;
    input(g,caster,{ultimate:true});for(let n=0;n<31;n++)g.step();
    const fraction=combatReviveFraction(d.id);
    assert.equal(target.status,fraction?'active':'eliminated');
    assert.equal(target.health,target.maxHealth*fraction);
    target.health=0;target.status='downed';target.downUntil=1e9;
    caster.supplies[0]={id:'revive-kit',count:1};caster.supplyAt=0;
    input(g,caster,{supply:0});
    assert.equal(target.status,fraction?'active':'downed');
    assert.equal(target.health,target.maxHealth*fraction);
    assert.equal(caster.supplies[0].count,fraction?0:1);
  }
});
test('Hard+ rejects revive kit purchases atomically while other supplies remain available',()=>{
  for(const difficulty of ['hard','insane','hellish']){
    const g=new Game({difficulty}),p=g.addPlayer('p','Mara','soldier');p.coins=1000;
    const r=g.transact('p',{id:'kit',kind:'supply',item:'revive-kit'});
    assert.equal(r.ok,false);assert.equal(r.reason,'revivesDisabled');assert.equal(p.coins,1000);
    assert(p.supplies.every(s=>s.count===0));
    assert(g.transact('p',{id:'heal',kind:'supply',item:'medkit'}).ok);
  }
});
test('actual phase transitions offer the shield event only on Baby/Easy Standard and retain in-flight hazards elsewhere',()=>{
  for(const d of data.difficulties)for(const form of ['normal','brutal'] as const){
    const g=createPracticeGame({difficulty:d.id,mode:'endless'},'Mara','soldier',form);assert(g.start());
    g.players.get('solo')!.invulnerableUntil=1e9;
    const emit=Reflect.get(g,'emitShot') as (...a:unknown[])=>{id:number};
    const shot=emit.call(g,'hostile',800,650,0,0,5,5);
    g.fields.push({id:900001,owner:'hostile',kind:'zone',x:800,y:650,radius:25,until:10000,potency:5});
    g.boss.health=g.boss.maxHealth*.49;g.step();
    const assist=phaseShieldBreak(d.id,g.boss.variant);
    assert.equal(g.boss.phase,1);assert.equal(!!g.accord,assist,d.id+form);
    assert.equal(g.shots.has(shot.id),!assist);
    assert.equal(g.fields.some(f=>f.id===900001),!assist);
    assert.equal(g.boss.staggerUntil,0);assert.equal(g.boss.vulnerableUntil,0);
  }
});
test('all entry identities have two half-health phases retaining late authored mechanics, while later threats keep three/four',()=>{
  for(const b of data.bosses)for(const form of ['normal','brutal'] as const){
    const phases=encounterPhases(b.id,form),entry=bossThreat(b.id).level<=2;
    assert.equal(phases.length,entry?2:form==='normal'?3:4);
    assert.deepEqual(phaseMarkers(b.id,form),phases.slice(1).map(p=>p.healthThreshold*100));
    if(entry){assert.deepEqual(phases.map(p=>p.healthThreshold),[1,.5]);assert.equal(bossPatternPhase(b.id,form,1),smallWakesIds.some(id=>id===b.id)?1:form==='normal'?2:3);}
  }
});
test('Brutal repeats locked trajectories twice at entry threat and three times at high threat without recursive echoes',()=>{
  for(const [id,waves] of [['ashen-usher',2],['engine',3]] as const){
    const g=createPracticeGame({openingBossId:id,mode:'endless'},'Mara','soldier','brutal');assert(g.start());
    g.boss.staggerUntil=g.boss.deadline=1e9;g.players.get('solo')!.invulnerableUntil=1e9;
    const cast=Reflect.get(g,'emitBossShot') as (...a:unknown[])=>void;
    for(const angle of [-.6,0,.6])cast.call(g,800,600,angle,70,8,4);
    const original=g.drainEvents().flatMap(e=>e.type==='shots'?e.shots:[]);
    assert.equal(original.length,3);assert.equal(g.brutalVolley.queuedProjectiles,3*(waves-1));
    const cues=viewOf(g,'solo').bossCues.filter(c=>c.kind==='brutal-echo');
    assert.equal(cues.length,waves-1);
    assert(cues.every(c=>c.at-g.combatTick>=Math.ceil(1.05*HZ)));
    assert.deepEqual(cues[0].angles,[-.6,0,.6]);
    let emitted=original.length;
    for(let n=0;n<3*HZ;n++){g.step();emitted+=g.drainEvents().flatMap(e=>e.type==='shots'?e.shots:[]).length;}
    assert.equal(emitted,3*waves);assert.equal(g.brutalVolley.queuedProjectiles,0);
    assert(!g.bossCues().some(c=>c.kind==='brutal-echo'));
  }
});
test('echo queues enforce finite group/projectile budgets and defeat removes future releases and cues',()=>{
  const queue=new BrutalVolley();let id=0;
  for(let i=0;i<10000;i++)queue.capture(1,{x:i%100,y:400},i,70,5,4,10,()=>++id);
  assert(queue.queuedProjectiles<=data.rules.brutal.maximumPendingEchoProjectiles);
  assert(queue.cues().length<=data.rules.brutal.maximumPendingEchoOrigins);
  const g=createPracticeGame({mode:'endless'},'Mara','soldier','brutal');g.start();
  const cast=Reflect.get(g,'emitBossShot') as (...a:unknown[])=>void;cast.call(g,800,600,0,70,5,4);
  assert(g.brutalVolley.queuedProjectiles>0);g.boss.health=0;g.step();
  assert.equal(g.brutalVolley.queuedProjectiles,0);assert(!g.bossCues().some(c=>c.kind==='brutal-echo'));
});
test('cover count, boundary walls and exact presentation agree on every map and difficulty',()=>{
  const before=JSON.stringify(runtimeArenas);
  for(const a of runtimeArenas)for(const d of data.difficulties){
    const map=runtimeArena(a.id,d.id),base=runtimeArena(a.id);
    assert.equal(map.cover.length,['insane','hellish'].includes(d.id)?0:d.id==='hard'?Math.floor(base.cover.length/2):d.id==='baby'?base.cover.length+2:base.cover.length);
    const walls=base.obstacles.filter(r=>!base.cover.includes(r));
    for(const wall of walls)assert(map.obstacles.includes(wall));
    if(a.id!=='gatehouse')assert.deepEqual(arenaCoverPlan(a.id,d.id).map(({texture,...r})=>r),map.cover);
    assert.deepEqual(map.playerSpawn,base.playerSpawn);assert.deepEqual(map.bossSpawn,base.bossSpawn);
    if(d.id==='hellish'){
      assert(map.lavaPits.length>=2);
      for(const pit of map.lavaPits)for(const spawn of [map.playerSpawn,map.bossSpawn])assert(Math.hypot(pit.x-spawn.x,pit.y-spawn.y)>pit.radius+150);
    }else assert.equal(map.lavaPits.length,0);
  }
  assert.equal(JSON.stringify(runtimeArenas),before);
  assert.equal(arenaGroundPlacement('gatehouse','hard').texture,'arena-ground-gatehouse-half');
  assert.equal(arenaGroundPlacement('gatehouse','hellish').texture,'arena-ground-gatehouse-open');
});
test('client prediction and authority both traverse removed cover and stop at retained Hard cover',()=>{
  for(const difficulty of ['normal','hard','insane','hellish']){
    const g=quiet(difficulty,1),p=g.players.get('p0')!,rect=runtimeArena('gatehouse').cover[0];
    p.x=rect.x-15;p.y=rect.y+rect.height/2;
    const v=viewOf(g,p.id),prediction=new Prediction();prediction.acknowledge(v,p.id);
    for(let n=0;n<12;n++){
      const frame={...idleInput(),sequence:p.ack+1,moveX:1};prediction.submit(frame,v);assert(g.submitInput(p.id,frame));g.step();
    }
    assert(Math.abs(prediction.player!.x-p.x)<1e-6,difficulty);
    assert.equal(p.x>rect.x,['insane','hellish'].includes(difficulty));
  }
});
test('Hellish lava has a three-second tell, actual contact damage, a half-second interval and no damage on safe ground',()=>{
  const g=quiet('hellish'),p=g.players.get('p0')!,pit=g.arena.lavaPits[0];
  p.invulnerableUntil=0;p.x=pit.x;p.y=pit.y;
  const cue=g.bossCues().find(c=>c.kind==='arena-lava');assert(cue&&cue.kind==='arena-lava');
  while(g.combatTick<cue.at-1)g.step();assert.equal(p.health,p.maxHealth);
  g.step();assert.equal(p.health,p.maxHealth-12);
  for(let n=0;n<14;n++)g.step();assert.equal(p.health,p.maxHealth-12);
  g.step();assert.equal(p.health,p.maxHealth-24);
  p.x=800;p.y=730;for(let n=0;n<30;n++)g.step();assert.equal(p.health,p.maxHealth-24);
  g.boss.health=0;g.step();assert(!g.bossCues().some(c=>c.kind==='arena-lava'));
});
test('Hellish forces Brutal for every opening identity, ignores Standard requests and offers only Brutal future contracts',()=>{
  for(const b of data.bosses){
    const g=createPracticeGame({difficulty:'hellish',openingBossId:b.id as never,mode:'endless'},'Mara','soldier','normal');
    assert(g.start());assert.equal(g.boss.variant,'brutal',b.id);assert.equal(g.director.cues().some(c=>c.kind==='brutal-echo'),false);
    if(!b.secret){g.boss.health=0;g.step();g.phaseEnds=g.tick;g.step();assert.equal(g.phase,'contractVote');assert(g.contractCards.every(c=>c.variant==='brutal'));}
  }
});
test('issued protocol-15 local saves/profiles migrate without losing run progress while unknown revisions and online envelopes stay strict',()=>{
  const g=new Game({difficulty:'hellish',mode:'endless'}),p=g.addPlayer('solo','Mara','soldier');p.coins=765;
  const save=g.offlineCheckpoint()!;save.protocolVersion=15;save.contentRevision='cbb6b8e68c9fb6f3191a3f0ef4a6411c8a3d3e41e3aeca783c122b07ab73d546';
  Object.assign(save.selectedContract,classifiedContract('constable','normal'));
  const restored=Game.restoreOffline(save),after=restored.offlineCheckpoint()!;
  assert.equal(after.protocolVersion,PROTOCOL);assert.equal(after.settings.runId,save.settings.runId);
  assert.equal(after.player.coins,765);assert.deepEqual(after.player.progress,save.player.progress);assert.equal(after.selectedContract.variant,'brutal');
  assert.throws(()=>Game.restoreOffline({...save,contentRevision:'0'.repeat(64)}),/versionMismatch/);
  assert.throws(()=>Game.restoreOffline({...save,serverOnly:true}),/versionMismatch/);
  assert.throws(()=>Game.restoreOffline({...save,contractCards:[{...save.selectedContract,bounty:999}]}));
  restored.start();restored.boss.health=0;restored.step();
  const memory=new Map<string,string>(),store={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value);}};
  recordProfileView(viewOf(restored,'solo'),'solo',store);
  const prior=JSON.parse(exportProfile(store));prior.contentRevision=save.contentRevision;
  assert.deepEqual(parseProfile(JSON.stringify(prior)).runs,loadProfile(store).runs);

});
test('difficulty cards and phase cues have all fifteen source-backed translations and both new floor natives retain their hashes',()=>{
  for(const d of data.locales){
    const l=JSON.parse(readFileSync('locales/'+d.id+'.json','utf8')).messages;
    for(const key of ['phaseShieldOn','phaseShieldOff','reviveFull','reviveHalf','reviveOff','phaseChanged','brutalWaves','coverLava','allBrutal'])assert.equal(typeof l['ui.'+key],'string');
    assert(l['ui.phaseChanged'].includes('{number}')&&l['ui.phaseChanged'].includes('{total}'));
  }
  const art=JSON.parse(readFileSync('assets/production/generated/difficulty-floor-2026-10-25/requests.json','utf8'));
  assert.equal(art.requests.length,2);
  for(const r of art.requests)assert.equal(createHash('sha256').update(readFileSync(r.projectPath)).digest('hex'),r.sha256);
});

test('actual difficulty-card markup presents shield, revive, cover and forced-Brutal distinctions for all six choices',async()=>{
  const bundle=await build({entryPoints:['src/client/ui/difficulty-rules.ts'],bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{
    name:'localized-markup-fixture',setup(b){b.onResolve({filter:/i18n\.ts$/},()=>({path:'i18n',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"export const t=(key)=>key;export const number=(n)=>String(n);",loader:'js'}));}
  }]});
  const ui=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  for(const d of data.difficulties){
    const markup=ui.difficultyRulesMarkup(d.id),revive=combatReviveFraction(d.id);
    assert(markup.includes('ui.'+(phaseShieldBreak(d.id,'normal')?'phaseShieldOn':'phaseShieldOff')));
    assert(markup.includes('ui.'+(revive===1?'reviveFull':revive===.25?'reviveQuarter':revive?'reviveHalf':'reviveOff')));
    assert.equal(markup.includes('ui.allBrutal'),d.id==='hellish');
    assert(markup.includes('ui.'+(d.id==='hellish'?'coverLava':d.id==='insane'?'coverNone':d.id==='hard'?'coverHalf':d.id==='baby'?'coverExtra':'coverFull')));
  }
});
test('real two-client Hellish room replicates forced Brutal, warned echoes/lava, rejects revive channels and cleans on defeat', {timeout:20000},async()=>{
  const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');
  const address=httpServer.address();assert(address&&typeof address==='object');
  const owner=new Session('http://127.0.0.1:'+address.port),guest=new Session('http://127.0.0.1:'+address.port);
  const until=async(check:()=>boolean)=>{const end=Date.now()+6500;while(!check()){if(Date.now()>end)throw Error('Difficulty replication timed out');await new Promise(r=>setTimeout(r,15));}};
  try{
    const options={name:'Host',classId:'medic' as const,mode:'endless' as const,difficulty:'hellish',openingBossId:'ashen-usher' as const,openingArenaId:'gatehouse'};
    await owner.connect(options);await guest.connect({...options,name:'Guest',classId:'soldier'},{roomId:owner.room!.roomId});
    await until(()=>owner.view?.players.length===2);owner.start();await until(()=>guest.view?.phase==='combat');
    const g=liveRooms.get(owner.room!.roomId)!.game;g.boss.staggerUntil=g.boss.deadline=1e9;
    for(const p of g.players.values())p.invulnerableUntil=1e9;
    const cast=Reflect.get(g,'emitBossShot') as (...a:unknown[])=>void;
    for(const angle of [-.5,0,.5])cast.call(g,800,600,angle,70,8,4);
    await until(()=>!!guest.view?.bossCues.some(c=>c.kind==='brutal-echo'));
    for(const session of [owner,guest]){
      assert.equal(session.view!.boss.variant,'brutal');assert.equal(session.view!.accord,null);
      assert(session.view!.bossCues.some(c=>c.kind==='arena-lava'));
      const echo=session.view!.bossCues.find(c=>c.kind==='brutal-echo');assert(echo&&echo.kind==='brutal-echo');assert.deepEqual(echo.angles,[-.5,0,.5]);
    }
    const rescuer=g.players.get(owner.room!.sessionId)!,target=g.players.get(guest.room!.sessionId)!;
    target.x=rescuer.x;target.y=rescuer.y;down(g,target);
    const end=g.combatTick+65;
    while(g.combatTick<end){owner.input({...idleInput(),sequence:rescuer.ack+1,interact:true});await new Promise(r=>setTimeout(r,35));}
    assert.equal(target.status,'downed');assert.equal(target.health,0);assert.equal(rescuer.progress.rescues,0);
    assert.equal(g.brutalVolley.queuedProjectiles,0);
    g.boss.health=0;await until(()=>guest.view?.phase!=='combat');
    assert(!guest.view!.bossCues.some(c=>c.kind==='brutal-echo'||c.kind==='arena-lava'));
  }finally{await Promise.allSettled([owner.close(),guest.close()]);await server.gracefullyShutdown(false);}
});
