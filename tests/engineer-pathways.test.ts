import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,data,type Player} from '../src/shared/game.ts';
import {ClassKits,type KitContext} from '../src/shared/class-kits.ts';
import {engineerRules as er,chargeLegal,engineerQNameKey} from '../src/shared/engineer-pathways.ts';
import {conflictingSkill} from '../src/shared/skill-conflicts.ts';
import {idleInput,PROTOCOL,CONTENT_REVISION,HZ} from '../src/shared/protocol.ts';
import {freshProfile,parseProfile} from '../src/client/profile.ts';
const oldRevision='1dd8789a6050eac2ca2f677bc15a8cdbfafaf78d73226d5be7cfbfc3ed70ba04';
const machinery='engineer-machinery-1',traps='engineer-traps-1',foundation='engineer-constructs-1';
function fixture(path=traps){
  const g=new Game({mode:'endless',seed:41,maxPlayers:2}),p=g.addPlayer('p','Tamsin','engineer');
  for(const id of [foundation,path])assert(g.transact(p.id,{id,kind:'skill',item:id}).ok);
  g.start();g.boss.staggerUntil=g.boss.deadline=1e9;g.boss.x=1250;g.boss.y=200;g.boss.health=g.boss.maxHealth=1e6;
  p.x=p.oldX=800;p.y=p.oldY=700;p.aim=0;p.invulnerableUntil=1e9;
  return {g,p};
}
function context(g:Game):KitContext{return {...(g as unknown as {kitContext():KitContext}).kitContext()};}
function cast(g:Game,p:Player){assert(g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:p.aim,q:true}));g.step();g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:p.aim});}
const advance=(g:Game,n:number)=>{for(let i=0;i<n;i++)g.step();};
test('The Engineer pilot adds two early behavioral choices, preserves every foundation and spends the existing three-SP start',()=>{
  assert.equal(data.skills.length,648);assert.equal(data.specializationSkills.length,2);
  for(const id of [machinery,traps]){const {g,p}=fixture(id);assert.equal(p.totalSp,3);assert.equal(p.skills.reduce((n,id)=>n+g.skillCost(id),0),3);assert.equal(data.specializationSkills.find(s=>s.id===id)!.grade,'D-');assert.equal(g.transact(p.id,{id:'other',kind:'skill',item:id===traps?machinery:traps}).ok,false);}
  const g=new Game(),p=g.addPlayer('p','Mara','soldier');assert.equal(g.transact(p.id,{id:'wrong',kind:'skill',item:traps}).ok,false);
  const story=new Game({mode:'story'}),t=story.addPlayer('t','Tamsin','engineer');assert.equal(story.transact(t.id,{id:'deny',kind:'skill',item:traps}).reason,'storyLearningRequired');assert.equal(t.totalSp,0);
});
test('Trap conflicts are symmetric and leave old paired-turret builds available for the machinery choice',()=>{
  const pair=data.skills.find(s=>'transform'in s&&s.transform==='crossfire-pair')!.id;
  const extra=data.skills.find(s=>s.classId==='engineer'&&'extraTurrets'in s.effects)!.id;
  for(const id of [pair,extra,machinery]){assert.equal(conflictingSkill([id],traps),id);assert.equal(conflictingSkill([traps],id),traps);}
  assert.equal(conflictingSkill([pair,extra],machinery),undefined);
});
test('A charge arms, gives its full committed fuse, damages and slows a real ordinary body exactly once, and credits only its owner',()=>{
  const {g,p}=fixture();const ally=g.addPlayer('a','Other','engineer');
  const a=g.minions.spawn(900001,{kind:'ordinary',x:920,y:700,health:1000,speed:0,radius:12,damage:0},g.combatTick)!;
  cast(g,p);const m=g.classCues().find(c=>c.kind==='engineer-charge')!;assert.equal(m.kind,'engineer-charge');
  advance(g,29);assert.equal(a.health,1000);assert.equal(p.damageDealt,0);
  advance(g,1);const pending=g.classCues().find(c=>c.kind==='engineer-charge')!;assert(pending.kind==='engineer-charge');assert.equal(pending.state,'fuse');assert.equal(pending.detonateAt-g.combatTick,15);
  advance(g,14);assert.equal(a.health,1000);advance(g,1);assert.equal(a.health,1000-er.chargeDamage*g.stats(p).ability);assert(a.slowUntil>g.combatTick);assert.equal(a.slowMultiplier,.5);assert(p.damageDealt>0);assert.equal(ally.damageDealt,0);
  const health=a.health;advance(g,20);assert.equal(a.health,health);assert(!g.classCues().some(c=>c.kind==='engineer-charge'));
});
test('Charge capacity and invalid whole-body ground reject without spending a cooldown or replacing another owner’s charges',()=>{
  const {g,p}=fixture(),c=context(g);g.classKits.cast(p,'q',c);g.classKits.cast(p,'q',c);assert.equal(g.classKits.canCast(p,'q',c),false);cast(g,p);assert.equal(p.qAt,0);assert.equal(g.classCues().filter(c=>c.kind==='engineer-charge').length,2);
  g.classKits.clear();const point={x:p.x+er.chargeReach,y:p.y};
  for(const bad of [{...c,obstacles:[{x:point.x-5,y:point.y-5,width:10,height:10}]},{...c,terrain:{bounds:c.terrain!.bounds,lava:[{...point,radius:10}]}},{...c,terrain:{bounds:{x:0,y:0,width:point.x,height:1000},lava:[]}}])assert(!g.classKits.canCast(p,'q',bad));
  assert(!chargeLegal(point,p,{...c,obstacles:[{x:850,y:650,width:20,height:100}]}));
});
test('Charges expire unfired and owner death, disconnect, phase boundaries and pause cancel or suspend pending work',()=>{
  for(const why of ['death','disconnect','boundary','expire'] as const){const {g,p}=fixture();cast(g,p);if(why==='death')p.status='downed';if(why==='disconnect')p.connected=false;if(why==='boundary')g.boss.health=0;advance(g,why==='expire'?36*HZ:2);assert(!g.classCues().some(c=>c.kind==='engineer-charge'));}
});
test('Committed blasts respect cover and bosses take damage without having their attack clocks slowed',()=>{
  const {g,p}=fixture(),kits=new ClassKits(),c=context(g);const hits:unknown[][]=[];
  c.obstacles=[];c.area=(...args)=>hits.push(args);c.targets=[{x:920,y:700,oldX:920,oldY:700,radius:30,health:100}];
  kits.cast(p,'q',c);c.tick=30;kits.step(c);c.tick=44;kits.step(c);assert.equal(hits.length,0);c.tick=45;kits.step(c);assert.equal(hits.length,1);assert.equal(hits[0][7],true);
  const direct=context(g);const bossClock=g.boss.staggerUntil;g.boss.x=920;g.boss.y=700;direct.area(p,{x:920,y:700},100,100,.5,60,undefined,true);assert.equal(g.boss.health,999900);assert.equal(g.boss.staggerUntil,bossClock);
  const actor=g.minions.spawn(900001,{kind:'ordinary',x:980,y:700,health:1000,speed:0,radius:12,damage:0},0)!;g.obstacles.push({x:950,y:650,width:10,height:100});direct.area(p,{x:920,y:700},100,100,.5,60,undefined,true);assert.equal(actor.health,1000);
});
test('A Carriage Sentry relocates at its bounded speed, braces without banking shots, and shoots only clear nearby targets',()=>{
  const {g,p}=fixture(machinery),c=context(g),kits=new ClassKits();c.obstacles=[];let shots=0;c.shoot=()=>{shots++;};c.targets=[{x:1100,y:700,oldX:1100,oldY:700,radius:20,health:1000}];
  kits.cast(p,'q',c);const tower=kits.constructs()[0];assert(tower.machinery);assert.equal(tower.health,80*g.stats(p).ability);
  for(let tick=1;tick<=30;tick++){c.tick=tick;kits.step(c);}assert(shots>0);
  const before=shots,x=tower.x;p.x+=100;c.tick++;kits.step(c);assert(tower.x-x<=er.machineSpeed/HZ+1e-6);assert.equal(shots,before);
  for(let i=0;i<15;i++){c.tick++;p.x+=2;kits.step(c);}assert.equal(shots,before);
  c.targets=[{x:1500,y:900,oldX:1500,oldY:900,radius:20,health:1000}];for(let i=0;i<90;i++){c.tick++;kits.step(c);}assert.equal(shots,before);
  p.connected=false;c.tick++;kits.step(c);assert.equal(kits.constructs().length,0);
});
test('Issued local saves and profiles preserve identities and proofs, reject invented new skills and never become online authority',()=>{
  for(const classId of data.classes.map(c=>c.id)){
    const g=new Game({mode:'story'});g.addPlayer('p','Entrant',classId as Player['classId']);const saved=g.offlineCheckpoint()!;saved.contentRevision=oldRevision;saved.protocolVersion=48;
    const copy=Game.restoreOffline(structuredClone(saved));assert.equal(copy.players.get('solo')!.classId,classId);assert.deepEqual(copy.trainingFor('solo'),g.trainingFor('p'));assert.equal(copy.offlineCheckpoint()!.protocolVersion,PROTOCOL);
    const forged=structuredClone(saved);forged.player.skills.push(machinery);assert.throws(()=>Game.restoreOffline(forged));assert.throws(()=>Game.restoreAuthoritative({...g.authoritativeCheckpoint(),contentRevision:oldRevision,protocolVersion:48}));
  }
  const free=fixture(machinery);free.g.boss.health=0;free.g.step();const impossible=free.g.offlineCheckpoint()!;impossible.contentRevision='8bda5e247f3df132a9c80f244fd8a7c2b3eaf468e2c6a8927f87a35937fbe110';impossible.protocolVersion=48;assert.throws(()=>Game.restoreOffline(impossible));
  const profile=freshProfile();profile.contentRevision=oldRevision;assert.equal(parseProfile(JSON.stringify(profile)).contentRevision,CONTENT_REVISION);
});
test('Current Free Play boundaries restore a purchased pathway but reject dual pathways, conflicts and Campaign injection',()=>{
  for(const id of [machinery,traps]){const {g,p}=fixture(id);g.boss.health=0;g.step();const saved=g.offlineCheckpoint()!;assert(saved);const copy=Game.restoreOffline(structuredClone(saved));assert(copy.players.get('solo')!.skills.includes(id));assert.equal(engineerQNameKey(copy.players.get('solo')!),id);const bad=structuredClone(saved);bad.player.skills.push(id===traps?machinery:traps);assert.throws(()=>Game.restoreOffline(bad));}
});
test('English pilot labels have complete catalog parity and keep their mechanical inspection copy',()=>{
  for(const locale of data.locales){const messages=JSON.parse(readFileSync('locales/'+locale.id+'.json','utf8')).messages;for(const id of [machinery,traps])assert(messages['skill.'+id+'.description'].length>100);}
});

test('Bracing sentries retain Crossfire Pair and siege overclock while charge repeats and owner loss cannot replay a committed blast',()=>{
  const {g,p}=fixture(machinery);const pair=data.skills.find(s=>'transform'in s&&s.transform==='crossfire-pair')!;p.skills.push(pair.id);
  const c=context(g),kits=new ClassKits();c.obstacles=[];let shots=0;c.shoot=()=>{shots++;};c.targets=[{x:1100,y:700,oldX:1100,oldY:700,radius:20,health:1000}];
  kits.cast(p,'q',c);assert.equal(kits.constructs().length,2);assert(kits.constructs().every(t=>t.machinery&&t.health===40*g.stats(p).ability));
  for(let tick=1;tick<=30;tick++){c.tick=tick;kits.step(c);}assert(shots>0);assert.notEqual(kits.constructs()[0].y,kits.constructs()[1].y);
  kits.cast(p,'ultimate',c);const before=shots;for(let i=0;i<30;i++){c.tick++;kits.step(c);}assert(shots>before);
  const trap=fixture(),tc=context(trap.g),charges=new ClassKits();let blasts=0;tc.area=()=>{blasts++;};tc.targets=[{x:920,y:700,oldX:920,oldY:700,radius:12,health:1000}];charges.cast(trap.p,'q',tc);tc.tick=30;charges.step(tc);charges.step(tc);tc.tick=45;charges.step(tc);charges.step(tc);assert.equal(blasts,1);
  charges.clear();tc.tick=0;charges.cast(trap.p,'q',tc);tc.tick=30;charges.step(tc);trap.p.connected=false;tc.tick=45;charges.step(tc);assert.equal(blasts,1);assert.equal(charges.cues().length,0);
});
test('All fixed maps and difficulties admit the new placement rules only outside complete cover and lava footprints',()=>{
  for(const arena of data.arenas)for(const difficulty of data.difficulties){const g=new Game({mode:'short',openingArenaId:arena.id,difficulty:difficulty.id}),p=g.addPlayer('p','Tamsin','engineer');g.start();const c=context(g);for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){p.aim=angle;const point={x:p.x+Math.cos(angle)*120,y:p.y+Math.sin(angle)*120};if(chargeLegal(point,p,c)){assert(!c.terrain!.lava.some(l=>Math.hypot(point.x-l.x,point.y-l.y)<=l.radius+12));assert(point.x>=c.terrain!.bounds.x+12);}}}
});

test('Stationary sentries keep firing through aim sweeps at every deployment heading, including Crossfire Pair',()=>{
  const pairId=data.skills.find(s=>'transform'in s&&s.transform==='crossfire-pair')!.id;
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const pair of [false,true]){
    const run=(sweep:boolean)=>{
      const {g,p}=fixture(machinery);p.aim=heading;if(pair)p.skills.push(pairId);
      const c=context(g),kits=new ClassKits();c.obstacles=[];let shots=0,travel=0;
      c.shoot=()=>{shots++;};c.targets=[{x:p.x+200*Math.cos(heading),y:p.y+200*Math.sin(heading),oldX:0,oldY:0,radius:20,health:1000}];
      kits.cast(p,'q',c);const starts=kits.constructs().map(t=>({x:t.x,y:t.y}));
      for(let tick=1;tick<=6*HZ;tick++){
        c.tick=tick;p.aim=heading+(sweep?Math.sin(tick/HZ)*.6:0);kits.step(c);
        kits.constructs().forEach((tower,i)=>{travel+=Math.hypot(tower.x-starts[i].x,tower.y-starts[i].y);});
      }
      assert.equal(kits.constructs().length,pair?2:1);if(pair)assert.notDeepEqual(starts[0],starts[1]);
      return {shots,travel};
    };
    const fixed=run(false),sweeping=run(true);assert(fixed.shots>0);assert.equal(sweeping.shots,fixed.shots,'Changing aim alone must not restart bracing');assert.equal(sweeping.travel,0);
  }
});

test('Moving sentries preserve their formation, respect relocation speed and rebrace after movement while aim keeps changing',()=>{
  const {g,p}=fixture(machinery),pair=data.skills.find(s=>'transform'in s&&s.transform==='crossfire-pair')!.id;p.skills.push(pair);
  const c=context(g),kits=new ClassKits();c.obstacles=[];let shots=0;c.shoot=()=>{shots++;};
  c.targets=[{x:1100,y:700,oldX:1100,oldY:700,radius:20,health:1000}];kits.cast(p,'q',c);
  const start=kits.constructs().map(t=>({x:t.x,y:t.y}));
  for(let tick=1;tick<=HZ;tick++){
    const before=kits.constructs().map(t=>({x:t.x,y:t.y}));p.x+=3;p.aim=Math.sin(tick)*2;c.tick=tick;kits.step(c);
    kits.constructs().forEach((tower,i)=>assert(Math.hypot(tower.x-before[i].x,tower.y-before[i].y)<=er.machineSpeed/HZ+1e-9));assert.equal(shots,0);
  }
  const stopped=kits.constructs().map(t=>({x:t.x,y:t.y}));stopped.forEach((t,i)=>{assert.equal(t.x-start[i].x,90);assert.equal(t.y,start[i].y);});
  for(let tick=HZ+1;tick<1.5*HZ;tick++){p.aim+=.4;c.tick=tick;kits.step(c);assert.equal(shots,0);}
  c.tick=1.5*HZ;kits.step(c);assert(shots>0);assert.deepEqual(kits.constructs().map(t=>({x:t.x,y:t.y})),stopped);
  p.x+=200;c.obstacles=[{x:stopped[0].x+25,y:600,width:20,height:200}];
  for(let i=0;i<60;i++){c.tick++;kits.step(c);}assert(kits.constructs().every(t=>t.x<=c.obstacles[0].x-t.radius+1e-6));
});

test('The issued protocol-49 boundaries preserve every class and owned Engineer choice locally, without online authority',()=>{
  const issuedRevision='a6a17f1935ebd8e91d8d5916a7c8ee920190e13bc42a07e09dec98723e94390f';
  for(const classId of data.classes.map(c=>c.id)){
    const g=new Game({mode:'story'});g.addPlayer('p','Entrant',classId as Player['classId']);
    const saved=g.offlineCheckpoint()!;saved.protocolVersion=49;saved.contentRevision=issuedRevision;
    const copy=Game.restoreOffline(structuredClone(saved)),restored=copy.offlineCheckpoint()!;
    assert.equal(restored.protocolVersion,PROTOCOL);assert.deepEqual(restored.player,{...saved.player,id:'solo'});assert.deepEqual(restored.chapter,saved.chapter);
  }
  for(const choice of [machinery,traps]){
    const {g,p}=fixture(choice);p.coins=37;g.boss.health=0;g.step();const saved=g.offlineCheckpoint()!;assert(saved);saved.protocolVersion=49;saved.contentRevision=issuedRevision;
    const copy=Game.restoreOffline(structuredClone(saved));assert.deepEqual(copy.offlineCheckpoint()!.player,{...saved.player,id:'solo'});assert(copy.players.get('solo')!.skills.includes(choice));
    const online=new Game(),owner=online.addPlayer('owner','Tamsin','engineer');
    for(const id of [foundation,choice])assert(online.transact(owner.id,{id,kind:'skill',item:id}).ok);
    const server=online.authoritativeCheckpoint();assert(server);assert.deepEqual(Game.restoreAuthoritative(structuredClone(server)).players.get('owner')!.skills,owner.skills);
    server.protocolVersion=49;assert.throws(()=>Game.restoreAuthoritative(server),/versionMismatch/);
    for(const patch of [{serverOnly:true},{players:[]},{transactions:[]},{schemaVersion:99}])assert.throws(()=>Game.restoreOffline({...saved,...patch}));
  }
});
