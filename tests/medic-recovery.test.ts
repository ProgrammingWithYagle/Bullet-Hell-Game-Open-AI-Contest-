import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Game,data,type Player} from '../src/shared/game.ts';
import {idleInput,HZ,PROTOCOL,type ClassId} from '../src/shared/protocol.ts';
import {finishBossDefeat} from './helpers/boss-defeat.ts';
import {createGameServer} from '../src/server/service.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {Session} from '../src/client/session.ts';
import {viewOf} from '../src/shared/view.ts';

function quiet(difficulty:string,party=2,classId:ClassId='medic'){
  const g=new Game({difficulty,maxPlayers:party,mode:'endless'});
  const p=g.addPlayer('medic','Iona',classId);
  for(let n=1;n<party;n++)g.addPlayer('ally'+n,'Mara','soldier');
  g.start();g.boss.staggerUntil=g.boss.deadline=1e9;
  for(const p of g.players.values()){p.x=800;p.y=730;p.invulnerableUntil=1e9;}
  return {g,p};
}
function down(g:Game,p:Player){p.invulnerableUntil=0;g.damage(p,1e6);assert.equal(p.status,'downed');}
function press(g:Game,p:Player,interact=true){assert(g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,interact}));g.step();}

test('a downed Medic can recover an all-downed team on Hard or Insane, spending one charge after the full channel',()=>{
  for(const difficulty of ['hard','insane']){
    const {g,p}=quiet(difficulty);for(const member of g.players.values())down(g,member);
    assert.equal(p.selfRevives,1);
    for(let n=0;n<2*HZ-1;n++){press(g,p);assert.equal(p.status,'downed');assert.equal(g.phase,'combat');}
    press(g,p);assert.equal(p.status,'active');assert.equal(p.health,difficulty==='hard'?p.maxHealth*.3:1);
    assert.equal(p.selfRevives,0);assert.equal(p.progress.rescues,0);
    assert.equal(p.invulnerableUntil-g.combatTick,HZ);
    down(g,p);g.step();assert.equal(g.phase,'defeat','No unlimited team-wipe recovery');
  }
});
test('Medic self-revival cancels when released, and ordinary classes cannot use solo recovery in a team',()=>{
  const {g,p}=quiet('normal');down(g,p);
  for(let n=0;n<HZ;n++)press(g,p);assert.equal(p.reviveProgress,HZ);
  press(g,p,false);assert.equal(p.reviveProgress,0);assert.equal(p.selfRevives,1);
  for(let n=0;n<2*HZ-1;n++)press(g,p);assert.equal(p.status,'downed');
  press(g,p);assert.equal(p.status,'active');assert.equal(p.health,p.maxHealth*.45);
  for(const cl of data.classes.filter(c=>c.id!=='medic')){
    const other=quiet('baby',2,cl.id as ClassId);down(other.g,other.p);
    for(let n=0;n<2*HZ+1;n++)press(other.g,other.p);
    assert.equal(other.p.status,'downed');assert.equal(other.p.selfRevives,1);assert.equal(other.p.reviveProgress,0);
  }
});
test('Baby Medic revival grants a bounded twenty-percent shield rather than stacking shield on repeated rescues',()=>{
  const {g,p}=quiet('baby'),ally=g.players.get('ally1')!;
  for(let rescue=0;rescue<2;rescue++){
    ally.health=0;ally.status='downed';ally.downUntil=1e9;
    p.supplies[0]={id:'revive-kit',count:1};p.supplyAt=0;
    assert(g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,supply:0}));g.step();
    assert.equal(ally.status,'active');assert.equal(ally.health,ally.maxHealth);assert.equal(ally.shield,ally.maxHealth*.2);
  }
  assert.equal(p.progress.rescues,2);
});
test('passive regeneration actually falls by 25%, 50% and 100% for every class while lower difficulties retain their rate',()=>{
  for(const cl of data.classes)for(const [i,difficulty] of ['baby','easy','normal','hard','insane','hellish'].entries()){
    const g=new Game({difficulty,maxPlayers:1}),p=g.addPlayer('solo','Mara',cl.id as ClassId);
    const skill=data.skills.find(s=>s.classId===cl.id&&(s.effects.regeneration??0)>0)!;
    p.skills=[skill.id];g.start();g.boss.staggerUntil=g.boss.deadline=1e9;p.invulnerableUntil=1e9;p.x=800;p.y=730;p.health=20;
    const rate=(skill.effects.regeneration??0)*[1,1,1,.75,.5,0][i];
    assert(Math.abs(g.stats(p).regen-rate)<1e-9);
    for(let n=0;n<HZ;n++)g.step();
    assert(Math.abs(p.health-(20+rate))<1e-6,cl.id+' '+difficulty);
  }
});
test('Hard and Insane revive-kit purchases respect the reviver class and Hellish never consumes a legacy kit',()=>{
  for(const cl of data.classes)for(const difficulty of ['hard','insane','hellish']){
    const {g,p}=quiet(difficulty,2,cl.id as ClassId);g.phase='shop';p.coins=1000;
    const allowed=cl.id==='medic'&&difficulty!=='hellish';
    const result=g.transact(p.id,{id:'recovery-kit',kind:'supply',item:'revive-kit'});
    assert.equal(result.ok,allowed);if(!allowed){assert.equal(p.coins,1000);assert.equal(result.reason,'revivesDisabled');}
    g.phase='combat';const ally=g.players.get('ally1')!;down(g,ally);
    p.supplies[0]={id:'revive-kit',count:1};p.supplyAt=0;
    assert(g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,supply:0}));g.step();
    assert.equal(ally.status,allowed?'active':'downed');assert.equal(p.supplies[0].count,allowed?0:1);
  }
});
test('the next encounter restores the finite Medic recovery allowance, and Hellish still permits deliberate healing without passive regeneration',()=>{
  const {g,p}=quiet('hard',1);down(g,p);for(let n=0;n<2*HZ;n++)press(g,p);assert.equal(p.selfRevives,0);
  g.boss.health=0;g.step();finishBossDefeat(g);
  for(let n=0;g.phase!=='combat'&&n<5;n++){g.phaseEnds=g.tick;g.step();}
  assert.equal(g.phase,'combat');assert.equal(p.selfRevives,1);
  const hell=quiet('hellish',1);hell.p.health=20;
  assert(hell.g.submitInput(hell.p.id,{...idleInput(),sequence:1,q:true}));hell.g.step();
  for(let n=0;n<HZ;n++)hell.g.step();
  assert(hell.p.health>20);assert.equal(hell.g.stats(hell.p).regen,0);assert.equal(hell.p.selfRevives,0);
});
test('known protocol39 local Practice saves retain map choices and progress; server and forged envelopes stay strict',()=>{
  const g=new Game({difficulty:'hard',arenaSelection:'randomRun',maxPlayers:1});
  const p=g.addPlayer('solo','Iona','medic');p.coins=643;
  const old=g.offlineCheckpoint()!;old.protocolVersion=39;
  const copy=Game.restoreOffline(old);assert.equal(PROTOCOL, 43);assert.equal(copy.arena.id,g.arena.id);
  assert.equal(copy.players.get('solo')!.coins,643);assert.equal(copy.settings.arenaSelection,'randomRun');
  assert.throws(()=>Game.restoreOffline({...old,serverOnly:true}),/versionMismatch/);
  assert.throws(()=>Game.restoreOffline({...old,contentRevision:'0'.repeat(64)}),/versionMismatch/);
  assert.throws(()=>Game.restoreAuthoritative({...g.authoritativeCheckpoint(),protocolVersion:39}),/versionMismatch/);
});
test('real Medic and teammate clients receive Hard/Insane recovery health, shields and remaining charges from authority',{timeout:25000},async()=>{
  const {server,httpServer}=createGameServer({audience:'public'});await server.listen(0,'127.0.0.1');
  const address=httpServer.address();assert(address&&typeof address==='object');const endpoint='http://127.0.0.1:'+address.port;
  const until=async(check:()=>boolean,act:()=>void=()=>{})=>{
    const deadline=Date.now()+7000;while(!check()){assert(Date.now()<deadline,'Recovery replication timed out');act();await new Promise(r=>setTimeout(r,25));}
  };
  try{for(const difficulty of ['hard','insane']){
    const medic=new Session(endpoint),guest=new Session(endpoint);
    try{
      const options={name:'Iona',classId:'medic' as const,mode:'endless' as const,difficulty};
      await medic.connect(options);await guest.connect({...options,name:'Mara',classId:'soldier'},{roomId:medic.room!.roomId});
      await until(()=>medic.view?.players.length===2);medic.start();await until(()=>guest.view?.phase==='combat');
      const g=liveRooms.get(medic.room!.roomId)!.game,p=g.players.get(medic.id)!,ally=g.players.get(guest.id)!;
      g.boss.staggerUntil=g.boss.deadline=1e9;for(const a of g.players.values()){a.x=800;a.y=730;a.invulnerableUntil=1e9;}
      down(g,p);await until(()=>guest.view?.players.find(v=>v.id===p.id)?.status==='downed');
      let sequence=p.ack;
      await until(()=>medic.view?.players.find(v=>v.id===p.id)?.status==='active',()=>medic.input({...idleInput(),sequence:++sequence,interact:true}));
      await until(()=>guest.view?.players.find(v=>v.id===p.id)?.selfRevives===0);
      for(const peer of [medic,guest]){
        const v=peer.view!.players.find(v=>v.id===p.id)!;
        assert.equal(v.health,difficulty==='hard'?v.maxHealth*.3:1);assert.equal(v.selfRevives,0);assert.equal(v.shield,0);
        assert.equal(v.maxShield,Math.floor(v.maxHealth*(difficulty==='hard'?.75:.5)));
      }
      down(g,ally);
      await until(()=>guest.view?.players.find(v=>v.id===ally.id)?.status==='downed'&&medic.view?.players.find(v=>v.id===ally.id)?.status==='downed');
      await until(()=>guest.view?.players.find(v=>v.id===ally.id)?.status==='active',()=>medic.input({...idleInput(),sequence:++sequence,interact:true}));
      await until(()=>medic.view?.players.find(v=>v.id===ally.id)?.status==='active');
      for(const peer of [medic,guest]){
        const v=peer.view!.players.find(v=>v.id===ally.id)!;assert.equal(v.health,difficulty==='hard'?v.maxHealth*.3:1);
      }
      assert.equal(p.progress.rescues,1);
    }finally{await Promise.allSettled([medic.close(),guest.close()]);}
  }}finally{await server.gracefullyShutdown(false);}
});
test('actual item descriptions use the Medic fraction, Baby shield and one HP instead of a misleading one-percent value',async()=>{
  const bundle=await build({entryPoints:['src/client/content-text.ts'],bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{
    name:'recovery-localization',setup(b){b.onResolve({filter:/i18n\.ts$/},()=>({path:'i18n',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const t=(key,args={})=>key+JSON.stringify(args);export const number=String;',loader:'js'}));}
  }]});
  const ui=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  assert(ui.supplyText('revive-kit','normal','medic').includes('45'));
  assert(ui.supplyText('revive-kit','easy','medic').includes('75'));
  assert(ui.supplyText('revive-kit','normal','soldier').includes('25'));
  assert(ui.supplyText('revive-kit','hard','medic').includes('30'));
  assert(ui.supplyText('revive-kit','baby','medic').includes('ui.medicBabyShield'));
  assert(ui.supplyText('revive-kit','insane','medic').startsWith('ui.reviveKitOneHealth'));
});
test('every class shares one personal shield budget across all three pools, enforced before damage as well as before views',()=>{
  for(const cl of data.classes)for(const [i,difficulty] of ['baby','easy','normal','hard','insane','hellish'].entries()){
    const {g,p}=quiet(difficulty,1,cl.id as ClassId);
    const capacity=Math.floor(p.maxHealth*[1,1,1,.75,.5,0][i]);
    p.shield=capacity/2;p.supplyShield=500;p.supplyShieldUntil=1e9;
    g.classKits.protect(p.id,500,0,1e9,g.combatTick);
    p.invulnerableUntil=0;g.damage(p,capacity+10,false);
    assert(Math.abs(p.health-(p.maxHealth-10))<1e-6,cl.id+' '+difficulty);
    assert.equal(p.shield+p.supplyShield+g.classKits.status(p.id,g.combatTick).shield,0);
    const v=viewOf(g,p.id).players[0];assert.equal(v.maxShield,capacity);assert.equal(v.shield,0);
  }
});
test('actual Tank shields respect combined caps for the whole team and Hellish keeps physical walls while rejecting plates',()=>{
  for(const difficulty of ['normal','hard','insane','hellish']){
    const {g,p}=quiet(difficulty,2,'tank'),ally=g.players.get('ally1')!;
    ally.shield=30;ally.supplyShield=40;ally.supplyShieldUntil=1e9;
    assert(g.submitInput(p.id,{...idleInput(),sequence:1,ultimate:true}));g.step();
    for(const v of viewOf(g,p.id).players)assert(v.shield<=v.maxShield);
    if(difficulty==='hellish'){
      assert(viewOf(g,p.id).players.every(v=>v.shield===0&&v.maxShield===0));
      assert(g.submitInput(p.id,{...idleInput(),sequence:2,q:true}));g.step();
      assert(g.classKits.constructs().some(c=>c.kind==='wall'&&c.health>0));
      g.phase='shop';p.coins=1000;
      const plates=data.supplies.find(s=>s.effect==='shield')!;
      const result=g.transact(p.id,{id:'hellish-plates',kind:'supply',item:plates.id});
      assert.equal(result.ok,false);assert.equal(result.reason,'shieldsDisabled');assert.equal(p.coins,1000);
      g.phase='combat';p.supplies[0]={id:plates.id,count:1};
      assert(g.submitInput(p.id,{...idleInput(),sequence:3,supply:0}));g.step();
      assert.equal(p.supplies[0].count,1);assert.equal(viewOf(g,p.id).players[0].shield,0);
    }
  }
});
test('boundary recovery trims old shields to the current shared cap without discarding the selected map or class',()=>{
  for(const difficulty of ['normal','hard','insane','hellish']){
    const g=new Game({difficulty,maxPlayers:1,openingArenaId:'crown-crypt'}),p=g.addPlayer('solo','Iona','medic');
    p.shield=100;
    const old=g.offlineCheckpoint()!;old.protocolVersion=39;
    const restored=Game.restoreOffline(old),v=viewOf(restored,'solo').players[0];
    assert.equal(restored.arena.id,'crown-crypt');assert.equal(v.classId,'medic');assert(v.shield<=v.maxShield);
    if(difficulty==='hellish')assert.equal(v.shield,0);
    const authority=Game.restoreAuthoritative(g.authoritativeCheckpoint()),trusted=viewOf(authority,'solo').players[0];
    assert.equal(trusted.shield,Math.min(100,trusted.maxShield));assert.equal(authority.arena.id,'crown-crypt');
  }
});
test('every fight starts Heavy at half capacity, Tank at full, Soldier at fifteen percent and other classes at zero',()=>{
  for(const cl of data.classes)for(const [i,difficulty] of ['baby','easy','normal','hard','insane','hellish'].entries()){
    const {g,p}=quiet(difficulty,1,cl.id as ClassId),v=viewOf(g,p.id).players[0];
    const maximum=Math.floor(p.maxHealth*[1,1,1,.75,.5,0][i]);
    assert.equal(v.maxShield,maximum);
    assert.equal(v.shield,Math.floor(maximum*(cl.id==='heavy'?.5:cl.id==='tank'?1:cl.id==='soldier'?.15:0)),difficulty+' '+cl.id);
  }
});
