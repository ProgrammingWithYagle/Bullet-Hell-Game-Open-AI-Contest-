import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,data} from '../src/shared/game.ts';
import {HZ,CONTENT_REVISION} from '../src/shared/protocol.ts';
import {marksmanIds as ids,marksmanRules as rules} from '../src/shared/soldier-marksman.ts';
import {fixture,buy,near} from './helpers/marksman-depth.ts';
const wall=(x:number)=>({x,y:500,width:1,height:300});
const body=(f:ReturnType<typeof fixture>,x:number)=>f.g.spawnMinion({kind:'ordinary',x,y:600,health:100,speed:0,radius:2,damage:0})!;

test('Marksman forks are real symmetric alternatives, and the later operation keeps earned gates and issued foundations',()=>{
  for(const [first,other] of [[ids.carom,ids.line],[ids.line,ids.carom]]){
    const f=fixture([first,ids.pair]);
    assert.equal(f.g.transact(f.p.id,{id:'excluded',kind:'skill',item:other}).ok,false);
    const save=f.g.offlineCheckpoint();assert.equal(save,null,'combat is not a safe import boundary');
    const g=new Game({mode:'short'}),p=g.addPlayer('p','Mara','soldier');
    buy(g,p.id,'soldier-ballistics-1');buy(g,p.id,ids.entry);
    assert.equal(g.transact(p.id,{id:'too-early',kind:'skill',item:ids.pair}).ok,false);
    assert.equal(g.transact(p.id,{id:'fork-unearned',kind:'skill',item:first}).ok,false);
  }
  assert.equal(data.skills.length,648);assert.equal(data.generalSkills.length,4);assert.equal(data.specializationSkills.length,54);
  assert.equal(data.rules.maximumActiveCapstones,1);
});

test('Double Bank consumes two contact intervals and the exact remaining travel in one tick, then the third wall absorbs it',()=>{
  const f=fixture([ids.carom]);f.g.arena.obstacles.push(wall(610),wall(585));
  f.step({technique1:true});const shot=f.shots()[0];assert(shot);
  near(shot.x,598+2*rules.separation);near(shot.vx,rules.speed);near(shot.y,600);
  assert.equal(f.g.classCues().filter(c=>c.kind==='soldier-bank').length,2,'both finite physical contacts remain visible');
  const sounds=f.g.drainEvents().filter(e=>e.type==='sound'&&e.id==='soldier-bank');assert.equal(sounds.length,2);
  f.step();assert(!f.g.shots.has(shot.id));assert.equal(f.shots().length,0);
});

test('each Double Bank leg receives only its real moving-body time interval and its own last origin',()=>{
  const f=fixture([ids.carom]);f.g.arena.obstacles.push(wall(610),wall(585));
  assert(f.g.marksman.cast(f.p,(f.g as any).marksmanContext()));const shot=f.shots()[0];
  const calls:{from:number;to:number;origin:number}[]=[];
  const r=f.g.marksman.advance(shot,{tick:f.g.combatTick,owner:f.p,obstacles:f.g.arena.obstacles,hit:(_a,_b,_w,window,origin)=>{calls.push({...window,origin:origin.x});return false;},sound:()=>{}});
  assert(r.alive&&r.updated);assert.equal(calls.length,3);near(calls[0].from,0);near(calls[1].from,.2);
  near(calls[2].from,(22-rules.separation)/30);near(calls[2].to,1);
  near(calls[0].origin,600);near(calls[1].origin,606-rules.separation);near(calls[2].origin,590+rules.separation);
});

test('Line Drive earns exactly one ordinary-body penetration after contact; the same bodies intercept before a wall',()=>{
  const f=fixture([ids.line]);f.g.arena.obstacles.push(wall(640));
  const actors=[body(f,570),body(f,545),body(f,520)];f.step({technique1:true});
  for(let n=0;n<10&&f.shots().length;n++)f.step();
  const damage=rules.damage*f.g.stats(f.p).ability;
  near(100-actors[0].health,damage);near(100-actors[1].health,damage);near(actors[2].health,100);assert.equal(f.shots().length,0);
  const before=fixture([ids.line]);before.g.arena.obstacles.push(wall(680));const a=body(before,620),b=body(before,645);
  before.step({technique1:true});assert(a.health<100);near(b.health,100);assert.equal(before.shots().length,0);
  assert(!before.g.classCues().some(c=>c.kind==='soldier-bank'));
});

test('Line Drive cannot pass a boss, weak point or another wall after its bank',()=>{
  const f=fixture([ids.line]);f.g.arena.obstacles.push(wall(640));f.g.boss.x=480;f.g.boss.y=600;
  const behind=body(f,350);f.step({technique1:true});for(let n=0;n<20&&f.shots().length;n++)f.step();
  assert.equal(f.shots().length,0);near(behind.health,100);assert(f.g.boss.health<f.g.boss.maxHealth);
  const cover=fixture([ids.line]);cover.g.arena.obstacles.push(wall(610),wall(585));cover.step({technique1:true});assert.equal(cover.shots().length,0);
  const weak=fixture([ids.line]);weak.g.arena.obstacles.push(wall(640));
  const director=(weak.g as any).director;director.weakPoints=()=>[{kind:'pin',id:999,x:570,y:600,radius:2,health:100}];
  let hits=0;director.hitWeakPoint=()=>{hits++;return 10;};director.damageTransfer=()=>null;
  weak.step({technique1:true});for(let n=0;n<10&&weak.shots().length;n++)weak.step();assert.equal(hits,1);assert.equal(weak.shots().length,0);
});

test('Measured Pair needs its own first physical bank, a second press and a second round; its follow-up cannot recurse',()=>{
  const f=fixture([ids.pair]);f.g.arena.obstacles.push(wall(610));const ammo=f.p.ammo;
  f.step({technique2:true});const first=f.shots()[0],status=f.g.kitStatus(f.p.id);assert(first);
  assert.equal(f.p.ammo,ammo-1);assert.equal(status.technique1At,0);assert.equal(f.p.eAt,0);
  assert.equal(status.soldierPairUntil,f.g.combatTick+Math.ceil(rules.pairWindow*HZ));
  const recovery=status.technique2At;assert(recovery!>f.g.combatTick);
  f.step({technique2:true,aim:Math.PI/2});const second=f.shots().find(s=>s.id!==first.id);assert(second);near(second.vy,rules.speed);near(second.vx,0);
  assert.equal(f.p.ammo,ammo-2);assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,0);assert.equal(f.g.kitStatus(f.p.id).technique2At,recovery);
  f.step({technique2:true});assert.equal(f.p.ammo,ammo-2);assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,0);
});

test('a direct interception or an ordinary C bank cannot manufacture Measured Pair follow-up proof',()=>{
  const f=fixture([ids.pair]);body(f,620);f.g.arena.obstacles.push(wall(680));const ammo=f.p.ammo;
  f.step({technique2:true});assert.equal(f.shots().length,0);assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,0);
  f.step({technique2:true});assert.equal(f.p.ammo,ammo-1);
  const c=fixture([ids.pair]);c.g.arena.obstacles.push(wall(610));c.step({technique1:true});assert.equal(c.g.kitStatus(c.p.id).soldierPairUntil,0);assert.equal(c.g.kitStatus(c.p.id).technique2At,0);
});

test('both measured shots inherit the actual fork and later contacts never renew the first contact window',()=>{
  for(const variant of [ids.carom,ids.line]){
    const f=fixture([variant,ids.pair]);f.g.arena.obstacles.push(wall(640),wall(480));f.step({technique2:true});
    while(!f.g.kitStatus(f.p.id).soldierPairUntil)f.step();const until=f.g.kitStatus(f.p.id).soldierPairUntil!;
    if(variant===ids.line)assert.equal(f.shots()[0].pierce,1);
    for(let n=0;n<7;n++)f.step();assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,until);
    f.step({technique2:true});assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,0);
    for(let n=0;n<12;n++)f.step();assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,0);
  }
});

test('ammo, reload, dodge, channel, overdrive and pool rejection preserve a paid follow-up and both recoveries',()=>{
  for(const reason of ['ammo','reloadAt','dashUntil','channelUntil','overdriveUntil','pool'] as const){
    const f=fixture([ids.pair]);f.g.arena.obstacles.push(wall(610));f.step({technique2:true});
    const before=f.g.kitStatus(f.p.id),ammo=f.p.ammo,c=(f.g as any).marksmanContext();
    if(reason==='ammo')f.p.ammo=0;else if(reason==='pool')c.shoot=()=>undefined;else f.p[reason]=f.g.combatTick+30;
    assert.equal(f.g.marksman.castPair(f.p,c),false,reason);
    assert.equal(f.p.ammo,reason==='ammo'?0:ammo);assert.equal(f.g.kitStatus(f.p.id).technique2At,before.technique2At);
    assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,before.soldierPairUntil);
    if(reason==='ammo')f.p.ammo=ammo;else if(reason!=='pool')f.p[reason]=0;
    assert(f.g.marksman.castPair(f.p,(f.g as any).marksmanContext()),reason+' retry');assert.equal(f.p.ammo,ammo-1);
  }
});

test('expiry spends no second round, and owner/technique loss removes the opportunity without recovery refunds',()=>{
  const f=fixture([ids.pair]);f.g.arena.obstacles.push(wall(610));f.step({technique2:true});const ammo=f.p.ammo,at=f.g.kitStatus(f.p.id).technique2At;
  f.until(f.g.kitStatus(f.p.id).soldierPairUntil!);assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,0);assert.equal(f.p.ammo,ammo);assert.equal(f.g.kitStatus(f.p.id).technique2At,at);
  for(const loss of ['disconnect','down','technique'] as const){
    const q=fixture([ids.pair]);q.g.arena.obstacles.push(wall(610));q.step({technique2:true});const recovery=q.g.kitStatus(q.p.id).technique2At;
    if(loss==='disconnect')q.g.setConnected(q.p.id,false);else if(loss==='down'){q.p.health=0;q.p.status='downed';}else q.p.skills=q.p.skills.filter(s=>s!==ids.pair);
    q.g.step();assert.equal(q.shots().length,0);assert.equal(q.g.marksman.status(q.p,q.g.combatTick).soldierPairUntil,0);assert.equal(q.g.marksman.status(q.p,q.g.combatTick).technique2At,recovery);
  }
});

test('host exit removes both Measured Pair physical flight and unfinished contact opportunity',()=>{
  const f=fixture([ids.pair]);f.g.arena.obstacles.push(wall(610));f.step({technique2:true});
  assert(f.shots().length>0);assert(f.g.kitStatus(f.p.id).soldierPairUntil!>f.g.combatTick);
  assert(f.g.endByHost());assert.equal(f.shots().length,0);assert.equal(f.g.kitStatus(f.p.id).soldierPairUntil,0);
});

test('exact issued58 admits thirty techniques and four General purchases while rejecting invented depth and online claims',()=>{
  const previous='78d78be91de271588e2c3a35baac583f5f2f93412a89160bff3b58832c4c13f7';
  const g=new Game({mode:'endless'});g.encounter=9;const p=g.addPlayer('p','Mara','soldier');
  for(const id of ['soldier-ballistics-1',ids.entry,'general-sprint','general-double-dash','general-brake-step','general-course-correction'])buy(g,p.id,id);
  const save=g.offlineCheckpoint()!;assert(save);const old={...save,protocolVersion:58,contentRevision:previous};
  const copy=Game.restoreOffline(structuredClone(old)),q=copy.players.get('solo')!;
  assert.equal(copy.offlineCheckpoint()!.contentRevision,CONTENT_REVISION);assert.deepEqual(q.skills,p.skills);assert.equal(q.coins,p.coins);assert.equal(q.weapon,p.weapon);
  for(const id of [ids.carom,ids.line,ids.pair]){const forged=structuredClone(old);forged.player.skills.push(id);assert.throws(()=>Game.restoreOffline(forged),/versionMismatch/);}
  for(const delta of [{protocolVersion:57},{protocolVersion:59},{contentRevision:'f'.repeat(64)},{practiceOnly:false},{serverOnly:true}])assert.throws(()=>Game.restoreOffline({...old,...delta}),/versionMismatch/);
  assert.equal(copy.kitStatus('solo').soldierPairUntil,0);assert.equal(copy.kitStatus('solo').technique2At,0);
});

 test('an actual third-leg Double Bank hit supplies the second physical contact origin to source-sensitive armor',()=>{
  const f=fixture([ids.carom]);f.g.arena.obstacles.push({x:640,y:500,width:20,height:300},{x:300,y:650,width:400,height:20});
  f.g.boss.x=470;f.g.boss.y=490;const origins:{x:number;y:number}[]=[];
  (f.g as any).director.district.bodyMultiplier=(p:any)=>{origins.push({x:p.x,y:p.y});return .5;};
  const health=f.g.boss.health;f.step({technique1:true,aim:Math.PI/4});
  for(let n=0;n<25&&f.shots().length;n++)f.step();assert.equal(f.shots().length,0);assert.equal(origins.length,1);
  near(origins[0].x,626-rules.separation);near(origins[0].y,646-rules.separation);
  near(health-f.g.boss.health,rules.damage*f.g.stats(f.p).ability*.5);
});
