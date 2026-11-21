import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data, type Player } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import type { Recipe } from '../src/shared/alchemist-kit.ts';

function fixture() {
  const g = new Game({mode:'endless',maxPlayers:2,seed:41});
  const p = g.addPlayer('p','Perrin','alchemist');
  const ally = g.addPlayer('ally','Another Alchemist','alchemist');
  g.start();
  Object.defineProperty(g,'obstacles',{value:[],configurable:true});
  Object.defineProperty(g,'arena',{value:{...g.arena,obstacles:[],lavaPits:[]},configurable:true});
  g.boss.health = g.boss.maxHealth = 1e6;
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  g.boss.x = 1300; g.boss.y = 700;
  for (const a of g.players.values()) {a.x=a.oldX=800;a.y=a.oldY=700;a.invulnerableUntil=1e9;}
  Reflect.get(g,'rng').next=()=>.99;
  return {g,p,ally};
}
function step(g:Game,n:number){for(let i=0;i<n;i++)g.step();}
function press(g:Game,p:Player,patch:Partial<InputFrame>){g.submitInput(p.id,{...idleInput(),sequence:p.ack+1,aim:0,...patch});g.step();}
function brew(g:Game,p:Player,recipe:Recipe='flare'){
  while(g.combatTick<p.qAt)g.step();
  if(g.kitStatus(p.id).alchemyRecipe!==recipe){assert(g.selectAlchemy(p.id,recipe));step(g,6);}
  press(g,p,{q:true});step(g,12);
  assert.equal(g.kitStatus(p.id).alchemyPrepared?.at(-1),recipe);
}
function actor(g:Game,x:number,y:number){return g.minions.spawn(999000+g.minions.actors.size,{kind:'ordinary',x,y,health:1000,speed:0,radius:10,damage:0},g.combatTick)!;}
function talent(g:Game,p:Player,lane:number){
  g.phase='shop';p.totalSp=27;
  for(const n of data.skills.filter(n=>n.classId==='alchemist'&&n.branchId==='mixtures'&&n.lane===lane&&n.depth<=3).sort((a,b)=>a.depth-b.depth))assert(g.transact(p.id,{id:n.id,kind:'skill',item:n.id}).ok);
  g.phase='combat';
}

test('A real Small Batch reserves ingredients and cooldown, slows movement once, blocks basic shots, and dodge cancels without a refund',()=>{
  const {g,p}=fixture(), speed=g.movementSpeed(p), ammo=p.ammo;
  press(g,p,{q:true,fire:true});
  assert.equal(p.ammo,ammo);
  assert.equal(g.shots.size,0);
  assert.equal(g.kitStatus(p.id).alchemyCinder,2);
  assert.equal(g.kitStatus(p.id).alchemyChalk,2);
  assert.equal(g.movementSpeed(p),speed*.8);
  assert.equal(p.qAt,g.combatTick+120);
  const cooldown=p.qAt;
  press(g,p,{dodge:true,ultimate:true,fire:true});
  assert.equal(p.ammo,ammo);
  press(g,p,{});step(g,13);
  assert.equal(p.ammo,ammo);
  assert.equal(p.qAt,cooldown);
  assert.equal(p.ultimateAt,0);
  assert.deepEqual(g.kitStatus(p.id).alchemyPrepared,[]);
  assert.equal(g.kitStatus(p.id).alchemyCinder,2);
  assert.equal(g.movementSpeed(p),speed);
});
test('A chosen close landing is delayed, immutable and credits only its actual ordinary splash and finite pulses',()=>{
  const {g,p,ally}=fixture();brew(g,p);
  const enemy=actor(g,880,700), hp=enemy.health;
  assert(g.throwAlchemy(p.id,{x:880,y:700}));
  assert(!g.throwAlchemy(p.id,{x:880,y:700}));
  assert.equal(p.eAt,g.combatTick+180);
  assert.equal(enemy.health,hp);
  assert(g.selectAlchemy(p.id,'mending'));
  p.y=p.oldY=800;p.aim=Math.PI;
  step(g,14);assert.equal(enemy.health,hp);
  const flight=viewOf(g,p.id).classCues.find(c=>c.kind==='alchemy-flask')!;
  assert(flight.kind==='alchemy-flask');
  assert.equal(flight.x2,880);assert.equal(flight.y2,700);
  step(g,1);assert.equal(enemy.health,hp-55);
  assert.equal(p.damageDealt,55);assert.equal(ally.damageDealt,0);
  step(g,240);assert.equal(enemy.health,hp-75);assert.equal(p.damageDealt,75);
  assert(!viewOf(g,p.id).classCues.some(c=>c.kind==='alchemy-pool'));
});
test('Mending accepts self placement, restores only actual missing health and cannot heal an ally through cover',()=>{
  const {g,p,ally}=fixture();brew(g,p,'mending');
  p.health=p.maxHealth-9;ally.health=ally.maxHealth-40;ally.x=850;
  Object.defineProperty(g,'obstacles',{value:[{x:820,y:650,width:10,height:100}],configurable:true});
  assert(g.throwAlchemy(p.id,{x:p.x,y:p.y}));
  step(g,15);
  assert.equal(p.health,p.maxHealth);assert.equal(p.healing,9);
  assert.equal(ally.health,ally.maxHealth-40);assert.equal(p.damageDealt,0);
  assert(!viewOf(g,p.id).classCues.some(c=>c.kind==='alchemy-pool'));
});
test('Binding slows only real ordinary bodies, splash respects cover and blocked or malformed throws spend no clock or vial',()=>{
  const {g,p}=fixture();brew(g,p,'binding');
  const near=actor(g,900,700), covered=actor(g,950,700);
  Object.defineProperty(g,'obstacles',{value:[{x:925,y:650,width:10,height:100}],configurable:true});
  assert(!g.throwAlchemy('missing',{x:900,y:700}));
  assert(!g.throwAlchemy(p.id,{x:NaN,y:700}));
  assert(!g.throwAlchemy(p.id,{x:Infinity,y:700}));
  assert.equal(p.eAt,0);
  assert(g.throwAlchemy(p.id,{x:900,y:700}));step(g,15);
  assert.equal(near.health,975);assert.equal(near.slowMultiplier,.6);
  assert(near.slowUntil>g.combatTick);assert.equal(covered.health,1000);
  const blocked=fixture();brew(blocked.g,blocked.p);
  Object.defineProperty(blocked.g,'obstacles',{value:[{x:815,y:600,width:200,height:200}]});
  assert(!blocked.g.throwAlchemy(blocked.p.id,{x:1100,y:700}));
  assert.equal(blocked.p.eAt,0);assert.equal(blocked.g.kitStatus(blocked.p.id).alchemyPrepared?.length,1);
});
test('Binding followed by Flare reacts on the ordinary six-second cooldown and consumes the owned pool for actual bonus damage',()=>{
  const {g,p}=fixture();brew(g,p,'binding');brew(g,p,'flare');const enemy=actor(g,900,700);
  assert(g.throwAlchemy(p.id,{x:900,y:700}));step(g,15);assert.equal(enemy.health,975);
  const first=viewOf(g,p.id).classCues.find(c=>c.kind==='alchemy-pool'&&c.recipe==='binding')!;
  assert.equal(first.until-first.at,240);
  while(g.combatTick<p.eAt)g.step();
  assert(g.throwAlchemy(p.id,{x:900,y:700}));step(g,15);
  assert.equal(enemy.health,890);assert.equal(p.damageDealt,110);
  assert(!viewOf(g,p.id).classCues.some(c=>c.kind==='alchemy-pool'&&c.recipe==='binding'));
  assert(viewOf(g,p.id).classCues.some(c=>c.kind==='alchemy-combination'));
});
test('A legal Flare then Mending sequence heals within the field and forfeits two still-pending fire pulses without extra healing',()=>{
  const {g,p}=fixture();brew(g,p,'flare');brew(g,p,'mending');const enemy=actor(g,900,700);
  assert(g.throwAlchemy(p.id,{x:900,y:700}));step(g,15);
  // Reach the field through ordinary movement while the actual throw clock recovers.
  for(let i=0;i<13;i++)press(g,p,{moveX:1});press(g,p,{});
  while(g.combatTick<p.eAt)g.step();
  p.health=p.maxHealth-18;
  assert(g.throwAlchemy(p.id,{x:900,y:700}));step(g,15);
  assert.equal(p.health,p.maxHealth);assert.equal(p.healing,18);
  assert.equal(p.damageDealt,67);assert.equal(enemy.health,933);
  assert(!viewOf(g,p.id).classCues.some(c=>c.kind==='alchemy-pool'&&c.recipe==='flare'));
  step(g,240);assert.equal(p.damageDealt,67,'Quenching removes remaining pulses rather than only an expired decoration');
});
test('Only actual owned primary delivery restores ingredients and the recovery interval rejects repeated hits and empty fire',()=>{
  const {g,p,ally}=fixture();brew(g,p);
  const enemy=actor(g,850,700);
  assert.equal(g.kitStatus(p.id).alchemyCinder,2);
  press(g,p,{fire:true});step(g,4);press(g,p,{});
  assert(enemy.health<1000);
  const stock=g.kitStatus(p.id);
  assert.equal((stock.alchemyCinder??0)+(stock.alchemyChalk??0)+(stock.alchemySap??0),8);
  p.fireAt=0;press(g,p,{fire:true});step(g,4);press(g,p,{});
  const repeated=g.kitStatus(p.id);
  assert.equal((repeated.alchemyCinder??0)+(repeated.alchemyChalk??0)+(repeated.alchemySap??0),8);
  assert.equal(ally.damageDealt,0);
  p.aim=Math.PI;p.fireAt=0;press(g,p,{fire:true,aim:Math.PI});step(g,5);press(g,p,{});
  assert.equal(g.kitStatus(p.id).alchemyCinder,repeated.alchemyCinder);
});
test('Standard Batch spends a finite charge on a miss, preserves hostile warnings and grants no invulnerability',()=>{
  const {g,p}=fixture();brew(g,p);
  const invulnerable=p.invulnerableUntil;
  const warning={id:12345,kind:'zone' as const,x:1200,y:800,radius:30,at:g.combatTick+100,until:g.combatTick+110,damage:5,aim:0,count:1,arc:0,speed:100};
  g.warnings.push(warning);
  press(g,p,{ultimate:true});
  assert.equal(g.kitStatus(p.id).alchemyBatchCharges,3);
  assert.equal(p.invulnerableUntil,invulnerable);assert(g.warnings.includes(warning));
  assert(g.throwAlchemy(p.id,{x:800,y:900}));
  assert.equal(g.kitStatus(p.id).alchemyBatchCharges,2);
  step(g,15);assert.equal(p.damageDealt,0);assert.equal(p.healing,0);
  assert(viewOf(g,p.id).classCues.some(c=>c.kind==='alchemy-pool'&&c.empowered));
});
test('A base kit can prepare and throw all three empowered vials within Standard Batch using actual Q/E cooldowns',()=>{
  const {g,p}=fixture();brew(g,p);brew(g,p);
  press(g,p,{ultimate:true});const began=g.combatTick,until=g.kitStatus(p.id).alchemyBatchUntil!;
  assert.equal(until-began,420);
  const thrown:number[]=[];
  for(let i=0;i<3;i++){
    while(g.combatTick<p.eAt)g.step();
    assert(g.combatTick<until);
    assert(g.throwAlchemy(p.id,{x:800,y:900}));thrown.push(g.combatTick);
    assert.equal(g.kitStatus(p.id).alchemyBatchCharges,2-i);
    assert(viewOf(g,p.id).classCues.some(c=>c.kind==='alchemy-flask'&&c.at===g.combatTick&&c.empowered));
    if(i===0)brew(g,p);
  }
  assert.deepEqual(thrown.map(t=>t-began),[0,180,360]);
  assert.equal(p.damageDealt,0,'A legal missed burst still earns no damage or chapter proof');
});
test('The three purchased mixture transformations affect actual split landings, brew commitment and extraction cooldown',()=>{
  for(const lane of [0,1,2]){
    const {g,p}=fixture();talent(g,p,lane);
    press(g,p,{q:true});
    const status=g.kitStatus(p.id);
    assert.equal(status.alchemyBrewUntil,g.combatTick+(lane===1?24:12));
    assert.equal(status.alchemyCapacity,lane===1?3:2);
    step(g,lane===1?24:12);
    assert(g.throwAlchemy(p.id,{x:900,y:700}));
    assert.equal(viewOf(g,p.id).classCues.filter(c=>c.kind==='alchemy-flask').length,lane===0?2:1);
    assert.equal(p.eAt,g.combatTick+Math.ceil((lane===2?8:6)*g.stats(p).cooldown*30));
  }
});
test('Owner loss and encounter exit clear flasks, pools, reagents and primary shots without taking another owner’s vial',()=>{
  const {g,p,ally}=fixture();brew(g,p);brew(g,ally);
  assert(g.throwAlchemy(p.id,{x:900,y:700}));
  press(g,p,{fire:true});assert([...g.shots.values()].some(s=>s.owner===p.id));
  g.setConnected(p.id,false);
  assert(!viewOf(g,ally.id).classCues.some(c=>c.owner===p.id&&c.kind.startsWith('alchemy-')));
  assert(![...g.shots.values()].some(s=>s.owner===p.id));
  assert.equal(g.kitStatus(ally.id).alchemyPrepared?.length,1);
  g.boss.health=0;g.step();
  assert(!viewOf(g,ally.id).classCues.some(c=>c.kind.startsWith('alchemy-')));
  assert.deepEqual(g.kitStatus(ally.id).alchemyPrepared,[]);
});
