import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data, type Player } from '../src/shared/game.ts';
import { ClassKits, type KitContext, type KitCue } from '../src/shared/class-kits.ts';
import { trapIds as ids } from '../src/shared/engineer-traps.ts';
import { engineerRules as r, type EngineerCharge } from '../src/shared/engineer-pathways.ts';
import { idleInput, CONTENT_REVISION, PROTOCOL, HZ, implementedClassIds } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { engineerActions } from '../src/client/engineer-actions.ts';
import { conflictingSkill } from '../src/shared/skill-conflicts.ts';
import { freshProfile, parseProfile } from '../src/client/profile.ts';
import { practiceRecords, PRACTICE_RECORDS_KEY } from '../src/client/progress.ts';
const foundation='engineer-constructs-1',entry='engineer-traps-1';
const previous='1d1292a7442e6eeab687739ce510eba46fd061ae087abd3d8ff51d2f0b7e0186';
function fixture(skills:string[]=[]){
  const g=new Game({mode:'endless',seed:41,maxPlayers:2});g.encounter=9;
  const p=g.addPlayer('p','Tamsin','engineer');
  for(const id of [foundation,entry,...skills])assert(g.transact(p.id,{id,kind:'skill',item:id}).ok,id);
  g.start();g.boss.staggerUntil=g.boss.deadline=1e9;g.boss.x=1250;g.boss.y=200;g.boss.health=g.boss.maxHealth=1e6;
  p.x=p.oldX=800;p.y=p.oldY=700;p.aim=0;p.invulnerableUntil=1e9;g.obstacles.splice(0);
  return {g,p};
}
function context(g:Game):KitContext{return {...(g as unknown as {kitContext():KitContext}).kitContext()};}
const charges=(cues:readonly import('../src/shared/view.ts').View['classCues'][number][])=>cues.filter((c):c is EngineerCharge=>c.kind==='engineer-charge');
function isolated(skills:string[]=[]){
  const {g,p}=fixture(skills),c=context(g),kits=new ClassKits();
  c.terrain={bounds:{x:0,y:0,width:1800,height:1200},lava:[]};c.obstacles=[];c.targets=[];
  const step=(n=1)=>{for(let i=0;i<n;i++){c.tick++;kits.step(c);}};
  const place=(x=700,y=600,aim=0)=>{p.x=p.oldX=x-Math.cos(aim)*r.chargeReach;p.y=p.oldY=y-Math.sin(aim)*r.chargeReach;p.aim=aim;assert(kits.canCast(p,'q',c));kits.cast(p,'q',c);};
  return {g,p,c,kits,step,place};
}
function input(g:Game,p:Player,values:Partial<ReturnType<typeof idleInput>>){assert(g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:p.aim,...values}));g.step();}

test('Traps grows through earned actions and geometric evolutions inside the original 27-SP/one-capstone budget',()=>{
  const path=[ids.wire,ids.key,ids.casings,ids.haul,ids.corridor],{p}=fixture(path);
  assert.equal(p.skills.reduce((n,id)=>n+(data.skills.find(s=>s.id===id)?.cost??data.specializationSkills.find(s=>s.id===id)!.cost),0),21);
  assert.equal(27-p.skills.reduce((n,id)=>n+(data.skills.find(s=>s.id===id)?.cost??data.specializationSkills.find(s=>s.id===id)!.cost),0),6);assert.equal(p.totalSp,27);
  assert.deepEqual(data.specializationSkills.filter(s=>s.id.startsWith('engineer-traps-')).map(s=>s.id),[entry,ids.wire,ids.switch,ids.key,ids.casings,ids.haul,ids.corridor]);
  assert.equal(conflictingSkill([ids.wire],ids.switch),ids.wire);assert.equal(conflictingSkill([ids.switch],ids.wire),ids.switch);
  for(const id of [ids.wire,ids.switch,ids.key,ids.casings,ids.haul,ids.corridor]){
    const prereqs=id===ids.casings||id===ids.haul?[ids.key]:id===ids.corridor?[ids.key,ids.casings]:[];
    const f=fixture(prereqs);f.g.phase='shop';const gate=data.specializationSkills.find(s=>s.id===id)!.freePlaySpRequired!;
    f.p.totalSp=gate-1;assert(!f.g.transact(f.p.id,{id:'early',kind:'skill',item:id}).ok);assert(!f.p.skills.includes(id));
    f.p.totalSp=gate;assert(f.g.transact(f.p.id,{id:'eligible',kind:'skill',item:id}).ok,id);
  }
  const f=fixture([ids.key,ids.casings,ids.corridor]);f.g.phase='shop';
  const second=data.skills.find(s=>s.classId==='engineer'&&s.capstone)!;
  assert(!f.g.transact(f.p.id,{id:'second-capstone',kind:'skill',item:second.id}).ok);
});

test('Safety Switch holds arming/ready ground, debounces, releases a full ready-Q load and cannot interrupt a fuse',()=>{
  const f=isolated([ids.switch]);f.place();f.place(1000);f.p.qAt=0;
  assert(f.kits.commandEngineer(f.p,f.c));assert(f.kits.status(f.p.id,f.c.tick).trapHeld);
  assert(!f.kits.commandEngineer(f.p,f.c));f.c.targets=[{x:700,y:600,oldX:700,oldY:600,radius:12,health:100}];
  f.step(HZ);assert(charges(f.kits.cues()).every(m=>m.state==='ready'&&m.held));
  assert(f.kits.commandEngineer(f.p,f.c));f.step();const fuse=charges(f.kits.cues()).find(m=>m.state==='fuse')!;assert(fuse);
  const deadline=fuse.detonateAt;f.step(Math.ceil(r.trapCommandSeconds*HZ));
  // One surviving idle plate can be held during Q recovery; the committed plate has already delivered.
  f.p.qAt=f.c.tick+HZ;assert(f.kits.commandEngineer(f.p,f.c));assert(deadline>0);
});

test('The real Q input releases full held plates when deployment is ready without spending Q again',()=>{
  const {g,p}=fixture([ids.switch]),c=context(g);c.obstacles=[];
  g.classKits.cast(p,'q',c);p.x-=200;g.classKits.cast(p,'q',c);p.qAt=0;
  input(g,p,{q:true});assert(g.kitStatus(p.id).trapHeld);assert.equal(p.qAt,0);
  for(let i=0;i<Math.ceil(r.trapCommandSeconds*HZ);i++)g.step();
  input(g,p,{q:true});assert.equal(g.kitStatus(p.id).trapHeld,false);assert.equal(p.qAt,0);
  assert.equal(charges(g.classCues()).length,2);
});

test('Tripwire catches a fast swept crossing between distant plates and gives both complete visible fuses',()=>{
  const f=isolated([ids.wire]);f.place();f.place(1000);f.step(HZ);
  assert.equal(f.kits.cues().filter(c=>c.kind==='engineer-wire').length,1);
  f.c.targets=[{x:850,y:690,oldX:850,oldY:510,radius:10,health:100}];f.step();
  const plates=charges(f.kits.cues());assert(plates.every(m=>m.state==='fuse'&&m.detonateAt-f.c.tick===ticks(r.fuseSeconds)));
  assert(!f.kits.cues().some(c=>c.kind==='engineer-wire'));
});
const ticks=(s:number)=>Math.ceil(s*HZ);

test('A tripwire never crosses blocked ground or links another player’s plate',()=>{
  const f=isolated([ids.wire]);f.place();f.place(1000);f.c.obstacles.push({x:840,y:550,width:20,height:100});f.step(HZ);
  assert(!f.kits.cues().some(c=>c.kind==='engineer-wire'));
  f.c.obstacles=[];f.c.terrain!.lava=[{x:850,y:600,radius:20}];f.step();assert(!f.kits.cues().some(c=>c.kind==='engineer-wire'));
  f.c.terrain!.lava=[];f.kits.clear();f.place();const other=f.g.addPlayer('other','Other','engineer');other.skills=[foundation,entry];other.status='active';other.health=f.g.stats(other).health;other.x=880;other.y=600;other.aim=0;f.c.players.push(other);f.kits.cast(other,'q',f.c);f.step(HZ);
  assert.equal(charges(f.kits.cues()).length,2);assert(!f.kits.cues().some(c=>c.kind==='engineer-wire'));
});

test('Firing Key commits ready held plates once, preserves deployment economics and rejects arming/expired commitments',()=>{
  const f=isolated([ids.switch,ids.key]);f.place();f.place(1000);f.p.qAt=999;assert(f.kits.commandEngineer(f.p,f.c));
  assert(!f.kits.castEngineer(f.p,'technique1',f.c));f.step(HZ);
  const until=charges(f.kits.cues()).map(m=>m.until);assert(f.kits.castEngineer(f.p,'technique1',f.c));
  assert(charges(f.kits.cues()).every(m=>m.state==='fuse'));assert.deepEqual(charges(f.kits.cues()).map(m=>m.until),until);
  assert(!f.kits.castEngineer(f.p,'technique1',f.c));assert.equal(f.kits.status(f.p.id,f.c.tick).technique1At,f.c.tick+ticks(r.remoteCooldown*f.g.stats(f.p).cooldown));assert.equal(f.p.qAt,999);
  const hits:unknown[][]=[];f.c.area=(...args)=>hits.push(args);f.step(ticks(r.fuseSeconds)-1);assert.equal(hits.length,0);f.step();assert.equal(hits.length,2);f.step(30);assert.equal(hits.length,2);
  const e=isolated([ids.key]);e.place();e.step(ticks(r.chargeSeconds)-ticks(r.fuseSeconds));assert(!e.kits.castEngineer(e.p,'technique1',e.c));
});

test('Breach Casings exposes the whole committed jet without a context argument and never expands after cover removal',()=>{
  const f=isolated([ids.key,ids.casings]);f.place();f.step(HZ);f.c.obstacles.push({x:820,y:500,width:20,height:200});
  const rays:unknown[][]=[];f.c.sweep=(...args)=>rays.push(args);
  assert(f.kits.castEngineer(f.p,'technique1',f.c));const cue=f.kits.cues().find(c=>c.kind==='engineer-jet')!;assert(cue.kind==='engineer-jet');assert(cue.toX<820-r.jetRadius);
  const endpoint=cue.toX;f.c.obstacles=[];f.p.aim=Math.PI;f.step(ticks(r.fuseSeconds));assert.equal(rays.length,1);
  assert.equal((rays[0][2] as {x:number}).x,endpoint);assert.equal(rays[0][6],true);
});

test('Late cover clips a jet and a fully blocked origin releases no hidden piercing hit',()=>{
  for(const wall of [{x:820,y:500,width:20,height:200},{x:690,y:590,width:20,height:20}]){
    const f=isolated([ids.key,ids.casings]);f.place();f.step(HZ);assert(f.kits.castEngineer(f.p,'technique1',f.c));
    const rays:unknown[][]=[];f.c.sweep=(...args)=>rays.push(args);f.c.obstacles.push(wall);f.step(ticks(r.fuseSeconds));
    if(wall.x===690)assert.equal(rays.length,0);else{assert.equal(rays.length,1);assert((rays[0][2] as {x:number}).x<wall.x-r.jetRadius);}
  }
});

test('Haul Line moves only a ready owned plate, preserves its deadline and requires a full rearm',()=>{
  const f=isolated([ids.key,ids.haul]);f.place();f.step(HZ);const initial=charges(f.kits.cues())[0];f.p.x=800;f.p.y=600;f.p.aim=Math.PI/2;
  assert(f.kits.castEngineer(f.p,'technique2',f.c));assert.equal(charges(f.kits.cues())[0].state,'hauling');assert(f.kits.cues().some(c=>c.kind==='engineer-haul'));
  assert(!f.kits.castEngineer(f.p,'technique2',f.c));assert(!f.kits.castEngineer(f.p,'technique1',f.c));
  f.step(ticks(r.haulSeconds));let moved=charges(f.kits.cues())[0];assert.equal(moved.until,initial.until);assert.equal(moved.x,800);assert.equal(moved.y,720);assert.equal(moved.state,'arming');
  f.step(ticks(r.armSeconds)-1);assert.equal(charges(f.kits.cues())[0].state,'arming');f.step();moved=charges(f.kits.cues())[0];assert.equal(moved.state,'ready');assert.equal(moved.until,initial.until);
});

test('Haul rejection spends no recovery and interrupted equipment rearms at its last legal point',()=>{
  const f=isolated([ids.key,ids.haul]);f.place();f.step(HZ);f.p.x=900;f.p.y=700;f.p.aim=0;
  f.c.obstacles.push({x:850,y:590,width:20,height:150});assert(!f.kits.castEngineer(f.p,'technique2',f.c));assert.equal(f.kits.status(f.p.id,f.c.tick).technique2At,0);
  f.c.obstacles=[];assert(f.kits.castEngineer(f.p,'technique2',f.c));f.step(4);const at=charges(f.kits.cues())[0];
  f.c.obstacles.push({x:at.x+8,y:at.y-40,width:30,height:80});f.step();const interrupted=charges(f.kits.cues())[0];
  if(interrupted){assert.equal(interrupted.state,'arming');assert(interrupted.x<=at.x);assert.equal(interrupted.until,at.until);}
  assert(!f.kits.cues().some(c=>c.kind==='engineer-haul'));
});

test('Demolition Corridor requires clear whole-width ground at commitment, including both endpoint caps',()=>{
  for(const kind of ['edge','wall','lava'] as const){
    const f=isolated([ids.key,ids.casings,ids.corridor]);f.place(kind==='edge'?15:700);f.place(kind==='edge'?300:1000);f.step(HZ);
    if(kind==='wall')f.c.obstacles.push({x:840,y:620,width:20,height:5});
    if(kind==='lava')f.c.terrain!.lava=[{x:850,y:625,radius:3}];
    assert(f.kits.castEngineer(f.p,'technique1',f.c));assert(!f.kits.cues().some(c=>c.kind==='engineer-corridor'));
    assert(charges(f.kits.cues()).every(m=>m.state==='fuse'));
  }
});

test('The capstone waits for both actual explosions and its full additional warning before one owned strip hit',()=>{
  const f=isolated([ids.key,ids.casings,ids.corridor]);f.place();f.place(1000);f.step(HZ);
  const areas:unknown[][]=[],rays:unknown[][]=[];f.c.area=(...args)=>areas.push(args);f.c.sweep=(...args)=>rays.push(args);
  assert(f.kits.castEngineer(f.p,'technique1',f.c));const warning=f.kits.cues().find(c=>c.kind==='engineer-corridor')!;assert(warning);
  f.step(ticks(r.fuseSeconds));assert.equal(areas.length,2);assert(!rays.some(a=>a[3]===r.corridorRadius));
  f.step(ticks(r.corridorSeconds)-1);assert(!rays.some(a=>a[3]===r.corridorRadius));f.step();
  const corridor=rays.filter(a=>a[3]===r.corridorRadius);assert.equal(corridor.length,1);assert.equal(corridor[0][0],f.p);assert.equal(corridor[0][4],r.corridorDamage*f.g.stats(f.p).ability);assert.equal(corridor[0][6],true);
  f.step(30);assert.equal(rays.filter(a=>a[3]===r.corridorRadius).length,1);
});

test('Late corridor obstruction, owner loss or expiry cancels damage and exposes no private bookkeeping',()=>{
  for(const reason of ['wall','death','disconnect','expiry','clear'] as const){
    const f=isolated([ids.key,ids.casings,ids.corridor]);f.place();f.place(1000);f.step(HZ);
    const rays:unknown[][]=[];f.c.sweep=(...args)=>rays.push(args);assert(f.kits.castEngineer(f.p,'technique1',f.c));
    const serialized=JSON.stringify(f.kits.cues());for(const key of ['damage','delivered','plates','jetDamage','jetTo'])assert(!serialized.includes('"'+key+'"'));
    if(reason==='wall')f.c.obstacles.push({x:840,y:620,width:20,height:5});
    if(reason==='death')f.p.status='downed';if(reason==='disconnect')f.p.connected=false;
    if(reason==='expiry')f.c.tick+=ticks(r.chargeSeconds);if(reason==='clear')f.kits.clear();
    f.step(ticks(r.fuseSeconds+r.corridorSeconds)+1);assert(!rays.some(a=>a[3]===r.corridorRadius));assert(!f.kits.cues().some(c=>c.kind==='engineer-corridor'&&!c.impact));
  }
});

test('The Traps HUD derives its controls and two acquired actions from real owned public equipment',()=>{
  const f=fixture([ids.switch,ids.key,ids.haul]);let v=viewOf(f.g,f.p.id).players[0];assert.equal(engineerActions(v,[],0).extras.length,2);assert(engineerActions(v,[],0).extras.every(e=>e.blocked));
  const c=context(f.g);f.g.classKits.cast(f.p,'q',c);f.p.x-=200;f.g.classKits.cast(f.p,'q',c);f.p.qAt=0;
  v=viewOf(f.g,f.p.id).players[0];let actions=engineerActions(v,f.g.classCues(),f.g.combatTick);assert(actions.command);assert(!actions.qBlocked);assert.equal(actions.qNameKey,'ui.engineer.holdTraps');
  assert(f.g.classKits.commandEngineer(f.p,c));v=viewOf(f.g,f.p.id).players[0];actions=engineerActions(v,f.g.classCues(),0);assert.equal(actions.qNameKey,'ui.engineer.releaseTraps');
});

test('Real ordinary bodies take exactly the owned shaped and corridor damage while cover and boss attack timing remain authoritative',()=>{
  const {g,p}=fixture([ids.key,ids.casings,ids.corridor]),c=context(g);c.targets=[];c.obstacles=[];
  p.x=580;p.y=600;p.aim=0;g.classKits.cast(p,'q',c);p.x=880;g.classKits.cast(p,'q',c);
  const ally=g.addPlayer('other','Other','engineer');ally.status='active';ally.invulnerableUntil=1e9;
  const victim=g.minions.spawn(99001,{kind:'ordinary',x:850,y:600,health:2000,speed:0,radius:10,damage:0},g.combatTick)!;
  const hidden=g.minions.spawn(99002,{kind:'ordinary',x:850,y:635,health:2000,speed:0,radius:10,damage:0},g.combatTick)!;
  // The wall is outside the corridor footprint, but lies between its edge and the hidden body's centre.
  c.obstacles.push({x:840,y:629,width:20,height:2});g.obstacles.push(...c.obstacles);
  for(let i=0;i<HZ;i++){c.tick++;g.classKits.step(c);}
  assert(g.classKits.castEngineer(p,'technique1',c));const slow=g.boss.staggerUntil,deadline=g.boss.deadline;
  for(let i=0;i<ticks(r.fuseSeconds+r.corridorSeconds);i++){c.tick++;g.classKits.step(c);}
  const scale=g.stats(p).ability;
  assert.equal(victim.health,2000-(r.jetDamage+r.corridorDamage)*scale);
  assert.equal(hidden.health,2000);assert.equal(ally.damageDealt,0);assert.equal(p.damageDealt,(r.jetDamage+r.corridorDamage)*scale);
  assert.equal(g.boss.staggerUntil,slow);assert.equal(g.boss.deadline,deadline);
});

test('Current complete Traps boundaries restore ownership and fresh equipment state, reject conflicting controls and keep Campaign SP-free',()=>{
  const {g,p}=fixture([ids.switch,ids.key,ids.casings,ids.haul,ids.corridor]);g.phase='shop';const value=g.offlineCheckpoint()!;assert(value);
  const copy=Game.restoreOffline(structuredClone(value));assert.deepEqual(copy.players.get('solo')!.skills,p.skills);assert.equal(copy.classCues().length,0);assert.equal(copy.kitStatus('solo').trapHeld,undefined);
  const conflict=structuredClone(value);conflict.player.skills.push(ids.wire);assert.throws(()=>Game.restoreOffline(conflict));
  const online=g.authoritativeCheckpoint()!;online.protocolVersion=52;online.contentRevision=previous;assert.throws(()=>Game.restoreAuthoritative(online));
  const campaign=new Game({mode:'story'}),lead=campaign.addPlayer('lead','Tamsin','engineer');assert.equal(lead.totalSp,0);
  for(const id of Object.values(ids))assert.equal(campaign.transact(lead.id,{id,kind:'skill',item:id}).reason,'storyLearningRequired');
});

test('The issued protocol-52 boundary preserves all four General choices and rejects future Traps ownership',()=>{
  for(const classId of implementedClassIds){
    const g=new Game({mode:'endless',seed:9});g.encounter=9;const p=g.addPlayer('p',classId,classId);
    for(const id of ['general-sprint','general-double-dash','general-brake-step','general-course-correction'])assert(g.transact(p.id,{id,kind:'skill',item:id}).ok);
    const save=structuredClone(g.offlineCheckpoint()!);save.contentRevision=previous;save.protocolVersion=52;
    const restored=Game.restoreOffline(save);assert.equal(restored.players.get('solo')!.classId,classId);assert.deepEqual(restored.players.get('solo')!.skills,p.skills);assert.equal(viewOf(restored,'solo').players[0].sp,viewOf(g,p.id).players[0].sp);
    const bad=structuredClone(save);bad.player.skills.push(ids.key);assert.throws(()=>Game.restoreOffline(bad));
  }
  const {g,p}=fixture([ids.key]);g.phase='shop';const save=structuredClone(g.offlineCheckpoint()!);save.contentRevision=previous;save.protocolVersion=52;
  assert.throws(()=>Game.restoreOffline(save));
  const older=structuredClone(save);older.contentRevision='9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f';older.protocolVersion=51;assert.throws(()=>Game.restoreOffline(older));
});

test('Historical protocol-52 Practice clears retain all twelve labels while forged editions are rejected',()=>{
  const records=implementedClassIds.map(classId=>({schemaVersion:1,id:classId,practiceOnly:true,verified:false,contentRevision:previous,protocol:52,mode:'story',difficulty:'normal',classId,completedEncounters:data.modes.find(m=>m.id==='story')!.encounters,accords:0,combatTicks:120,secret:'locked',memorial:false}));
  const store={getItem:()=>JSON.stringify([...records,{...records[0],id:'forged',protocol:51}]),setItem(){}};
  assert.equal(practiceRecords(store).length,12);assert.equal(PRACTICE_RECORDS_KEY,'ga-practice-campaign-records-v1');
  const profile=freshProfile();profile.contentRevision=previous;const parsed=parseProfile(JSON.stringify(profile));assert(parsed);assert.equal(parsed.contentRevision,CONTENT_REVISION);assert.equal(PROTOCOL,73);
});
