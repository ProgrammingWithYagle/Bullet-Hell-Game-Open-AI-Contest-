import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { distance, segmentRect, type Rect } from '../src/shared/geometry.ts';
import { fuseSealId, fuseSealRules, mageVolatileIds } from '../src/shared/mage-fuse-seal.ts';
import { pivotSigilId } from '../src/shared/mage-pivot-sigil.ts';
import { waymarkReturnId } from '../src/shared/mage-waymark-return.ts';
import { idleInput, type InputFrame, type Vec } from '../src/shared/protocol.ts';
import { splitLineworkKit, viewOf } from '../src/shared/view.ts';

const action = { technique3:true };
const pos = ({x,y}:Vec) => ({x,y});

function exercise(options: { owned?:boolean; alternate?: 'pivot' | 'waymark' | 'both'; fitting?: 'shunt' | 'twin'; obstacles?: Rect[] }={}) {
  const game = new Game({ mode:'short', seed:41, difficulty:'normal', arenaSelection:'fixed',openingArenaId:'gatehouse',maxPlayers:2 });
  if (options.alternate||options.fitting) game.encounter=1;
  const mage=game.addPlayer('mage','Sable','mage'), ally=game.addPlayer('ally','Mara','soldier');
  assert.equal(mage.totalSp,options.alternate||options.fitting?9:3);
  const buy=(item:string)=>game.transact(mage.id,{id:item,kind:'skill',item});
  assert(buy('mage-hexcraft-1').ok);
  if (options.owned!==false) assert(buy(fuseSealId).ok);
  if(options.fitting){
    assert(buy(mageVolatileIds[options.fitting]).ok);
    assert.equal(buy(mageVolatileIds[options.fitting==='shunt'?'twin':'shunt']).reason,'incompatibleItem');
  }
  if (options.alternate==='pivot'||options.alternate==='both') {
    assert(buy('mage-control-1').ok);
    assert(buy(pivotSigilId).ok);
  }
  if (options.alternate==='waymark'||options.alternate==='both') {
    assert(buy('mage-warding-1').ok);
    assert(buy(waymarkReturnId).ok);
  }
  assert(game.start());
  const arena=structuredClone(game.arena);
  arena.obstacles=options.obstacles??[];
  arena.lavaPits=[];
  Object.defineProperty(game,'arena',{get:()=>arena});
  Object.assign(mage,{x:500,y:500});
  Object.assign(ally,{x:560,y:750});
  Object.assign(game.boss,{x:1220,y:720,staggerUntil:5000,deadline:5000});
  const status=()=>game.kitStatus(mage.id).fuseSeal;
  const points=()=>game.classCues().filter(cue=>cue.kind==='mage-fuse-point');
  const strokes=()=>game.classCues().filter(cue=>cue.kind==='mage-fuse-vent');
  function tick(input:Partial<InputFrame>={}) {
    if(mage.connected) assert(game.submitInput(mage.id,{...idleInput(),aim:mage.aim,sequence:mage.ack+1,clientTick:game.combatTick,...input}));
    assert(game.submitInput(ally.id,{...idleInput(),sequence:ally.ack+1,clientTick:game.combatTick}));
    game.step();
    return game.drainEvents();
  }
  return {game,mage,ally,arena,status,points,strokes,tick};
}

test('Fuse Seal is earned at three SP, plants unpaid, and keeps the ordinary ultimate available',()=>{
  const f=exercise(), issued=exercise({owned:false});
  f.tick({...action,moveX:1}); issued.tick({moveX:1});
  assert.equal(f.points().length,0);
  f.tick({...action,fire:true}); issued.tick({fire:true});
  assert.equal(f.points().length,0);
  const planted=f.tick(action); issued.tick(action);
  const seal=f.points()[0];
  assert(seal&&seal.phase==='prepared');
  assert.deepEqual(pos(seal),pos(f.mage));
  assert.equal(seal.until-seal.at,fuseSealRules.preparation);
  assert.equal(f.mage.ultimateAt,0);
  assert.equal(issued.status(),undefined);
  assert.deepEqual(issued.points(),[]);
  assert(planted.some(event=>event.type==='sound'&&event.id==='mage-fuse-prepare'&&event.owner===f.mage.id));
  assert.equal(viewOf(f.game,f.ally.id).players.find(p=>p.id===f.mage.id)?.kit.fuseSeal,undefined);
  const privateKit=splitLineworkKit(f.game.kitStatus(f.mage.id)).owner;
  assert(privateKit&&'fuseSeal' in privateKit);
  assert.equal(privateKit.fuseSeal?.phase,'prepared');
  assert(viewOf(f.game,f.ally.id).classCues.some(cue=>cue.kind==='mage-fuse-point'&&cue.id===seal.id));
  const events=f.tick({...action,q:true,ultimate:true});
  issued.tick({q:true,ultimate:true});
  assert.equal(f.mage.ultimateAt,issued.mage.ultimateAt);
  assert.equal(f.mage.qAt,issued.mage.qAt);
  assert.equal(f.status()?.phase,'idle');
  assert.deepEqual(f.points(),[]);
  assert(events.some(event=>event.type==='sound'&&event.id==='ultimate-mage'));
  assert(!events.some(event=>event.type==='sound'&&event.id==='mage-fuse-binding'));
  assert.deepEqual(f.game.classCues().map(({id,...cue})=>cue),issued.game.classCues().map(({id,...cue})=>cue));
});

test('Only a genuinely paid Q charges; the long stroke spends one U and uses the actual clipped lane',()=>{
  const f=exercise(), issued=exercise({owned:false});
  f.tick({q:true}); issued.tick({q:true});
  f.tick(action); issued.tick();
  const unavailable=f.mage.qAt;
  f.tick({q:true}); issued.tick();
  assert.equal(f.mage.qAt,unavailable);
  assert.equal(f.mage.ultimateAt,0);
  assert.equal(f.status()?.phase,'prepared');

  const g=exercise(), old=exercise({owned:false});
  Object.assign(g.game.boss,{x:812,y:500});
  g.tick(action); old.tick();
  g.tick({q:true,aim:Math.PI/2}); old.tick({ultimate:true,aim:Math.PI/2});
  assert.equal(g.status()?.phase,'binding');
  assert.equal(g.mage.ultimateAt,old.mage.ultimateAt);
  assert.equal(g.points()[0]?.until,g.game.combatTick+fuseSealRules.charges);
  const paid=g.mage.ultimateAt, q=g.mage.qAt;
  const before=g.mage.damageDealt, bossHealth=g.game.boss.health;
  const wall={x:673,y:464,width:24,height:72};
  g.arena.obstacles.push(wall);
  const events=g.tick({...action,aim:0});
  const line=g.strokes()[0];
  assert(line?.phase==='binding'&&line.segments.length===1);
  const leg=line.segments[0]!;
  assert(leg.to.x<wall.x-fuseSealRules.width && distance(leg.from,leg.to)>100);
  assert.equal(segmentRect(leg.from,leg.to,wall,fuseSealRules.width),null);
  assert.equal(g.mage.damageDealt,before);
  assert.equal(g.game.boss.health,bossHealth);
  assert.equal(g.mage.ultimateAt,paid);
  assert.equal(g.mage.qAt,q);
  assert(events.some(event=>event.type==='sound'&&event.id==='mage-fuse-vent'));
  g.tick(action);
  assert.equal(g.strokes().length,1);

  const open=exercise();
  Object.assign(open.game.boss,{x:812,y:500});
  open.tick(action);open.tick({q:true,aim:Math.PI/2});
  const damage=open.mage.damageDealt;
  open.tick({...action,aim:0});
  assert.equal(open.mage.damageDealt-damage,fuseSealRules.bindingDamage);
});

test('Ward charge creates a transverse stroke and newly closed cover holds its release',()=>{
  const f=exercise();
  Object.assign(f.game.boss,{x:710,y:587});
  f.tick(action);f.tick({e:true,aim:-Math.PI/2});
  const paid=f.mage.ultimateAt, before=f.mage.damageDealt;
  assert.equal(f.status()?.phase,'ward');
  const blocker={x:638,y:480,width:18,height:40};
  f.arena.obstacles.push(blocker);
  f.tick({...action,aim:0});
  assert.equal(f.status()?.phase,'ward');
  assert.deepEqual(f.strokes(),[]);
  assert.equal(f.mage.damageDealt,before);
  assert.equal(f.mage.ultimateAt,paid);

  const flank={x:692,y:548,width:39,height:9};
  f.arena.obstacles.splice(0,1,flank);
  f.tick({...action,aim:0});
  const release=f.strokes()[0];
  assert(release?.phase==='ward'&&release.segments.length===1);
  assert.equal(release.segments[0]?.from.x,500+fuseSealRules.wardOffset);
  assert(release.segments[0]!.to.y<500);
  assert.equal(f.mage.damageDealt,before);

  const open=exercise();
  Object.assign(open.game.boss,{x:710,y:587});
  open.tick(action);open.tick({e:true,aim:-Math.PI/2});
  const openBefore=open.mage.damageDealt;
  open.tick({...action,aim:0});
  assert.equal(open.strokes()[0]?.segments.length,2);
  assert.equal(open.mage.damageDealt-openBefore,fuseSealRules.wardDamage);
});

test('Two distinct paid ticks cross the shape, tighten the deadline and hit one target once',()=>{
  const f=exercise();
  Object.assign(f.game.boss,{x:710,y:500});
  f.tick(action);f.tick({q:true,aim:Math.PI/2});
  const paid=f.mage.ultimateAt, original=f.points()[0]?.until;
  f.tick({q:true,aim:Math.PI/2});
  assert.equal(f.status()?.phase,'binding');
  assert.equal(f.points()[0]?.until,original);
  f.tick({e:true,aim:Math.PI/2});
  assert.equal(f.status()?.phase,'crossed');
  assert.equal(f.points()[0]?.until,f.game.combatTick+fuseSealRules.crossed);
  assert.equal(f.mage.ultimateAt,paid);
  const before=f.mage.damageDealt, hp=f.game.boss.health;
  f.tick({...action,aim:0});
  assert.equal(f.strokes()[0]?.segments.length,3);
  assert.equal(f.mage.damageDealt-before,fuseSealRules.combinedDamage);
  assert.equal(hp-f.game.boss.health,fuseSealRules.combinedDamage);

  const simultaneous=exercise();
  simultaneous.tick(action);simultaneous.tick({q:true,e:true});
  assert(simultaneous.mage.qAt>simultaneous.game.combatTick&&simultaneous.mage.eAt>simultaneous.game.combatTick);
  assert.equal(simultaneous.status()?.phase,'binding');
});

test('The accepted projectile wound takes time from a paid fuse and expiry keeps its cooldown',()=>{
  const f=exercise();
  while(f.game.combatTick<f.mage.invulnerableUntil) f.tick();
  f.tick(action);f.tick({q:true});
  const paid=f.mage.ultimateAt, until=f.points()[0]!.until, health=f.mage.health, invulnerable=f.mage.invulnerableUntil;
  assert(f.game['emitShot']('hostile',f.mage.x-5,f.mage.y,0,30,14,4,0,1));
  const events=f.tick();
  assert(f.mage.health<health&&f.mage.invulnerableUntil>invulnerable);
  assert.equal(f.points()[0]!.until,until-fuseSealRules.woundCost);
  assert.equal(f.status()?.risk,true);
  assert(events.some(event=>event.type==='sound'&&event.id==='mage-fuse-wound'));
  while(f.points().length&&f.game.combatTick<until) f.tick();
  assert.equal(f.game.combatTick,until-fuseSealRules.woundCost);
  assert.equal(f.mage.ultimateAt,paid);
  assert.equal(f.status()?.phase,'idle');
  f.tick(action);
  assert.deepEqual(f.points(),[]);
});

test('Loss of the real anchor before payment, outside its leash, and after disconnect behaves correctly',()=>{
  const f=exercise();
  f.tick(action);
  for(let i=0;i<36&&f.points().length;i++) f.tick({moveX:1});
  assert.equal(f.mage.ultimateAt,0);
  assert.deepEqual(f.points(),[]);
  f.tick(action);
  assert.deepEqual(f.points(),[]);
  for(let i=0;i<fuseSealRules.retry;i++)f.tick();
  f.tick(action);f.tick({q:true});
  const paid=f.mage.ultimateAt;
  assert(paid>f.game.combatTick&&f.points().length===1);
  f.game.setConnected(f.mage.id,false);
  assert(!f.mage.connected);
  assert.deepEqual(f.points(),[]);
  assert.equal(f.mage.ultimateAt,paid);
  f.game.setConnected(f.mage.id,true);f.tick(action);
  assert.equal(f.status()?.phase,'idle');
});

test('An actual paid Pivot Sigil or Waymark Return can charge the same seal',()=>{
  const pivot=exercise({alternate:'pivot'});
  pivot.tick(action);
  pivot.tick({technique1:true,aim:0});
  assert.equal(pivot.status()?.phase,'prepared');
  assert.equal(pivot.mage.qAt,0);
  pivot.tick({technique1:true,aim:0});
  assert(pivot.mage.qAt>pivot.game.combatTick);
  assert.equal(pivot.status()?.phase,'binding');

  const waymark=exercise({alternate:'waymark'});
  const origin=pos(waymark.mage);
  waymark.tick({technique2:true});
  for(let i=0;i<22 && distance(waymark.mage,origin)<120;i++) waymark.tick({moveX:1});
  assert(distance(waymark.mage,origin)>=100);
  waymark.tick(action);
  waymark.tick({technique2:true});
  assert(waymark.mage.eAt>waymark.game.combatTick);
  assert.equal(waymark.status()?.phase,'ward');
  assert.equal(waymark.game.kitStatus(waymark.mage.id).waymark?.phase,'returning');
  for(let i=0;i<25 && waymark.game.kitStatus(waymark.mage.id).waymark?.phase==='returning';i++) waymark.tick();
  assert(distance(waymark.mage,origin)<.01);
  assert.equal(waymark.status()?.phase,'ward');
  waymark.tick({...action,aim:0});
  assert.equal(waymark.strokes()[0]?.phase,'ward');
});

test('A legal nine-point Mage crosses a seal by paying for its pivot and its genuine walked return',()=>{
  const f=exercise({alternate:'both'}),origin=pos(f.mage);
  f.tick({technique2:true});
  for(let i=0;i<25&&distance(f.mage,origin)<116;i++) f.tick({moveX:1});
  assert(distance(f.mage,origin)>=116);
  f.tick(action); f.tick({technique1:true,aim:Math.PI}); f.tick({technique1:true,aim:Math.PI});
  const q=f.mage.qAt,u=f.mage.ultimateAt;
  assert(q>f.game.combatTick&&u>f.game.combatTick&&f.status()?.phase==='binding');
  assert(f.game.classCues().some(cue=>cue.kind==='mage-pivot-stroke'));
  f.tick({technique2:true,aim:Math.PI});
  const e=f.mage.eAt,until=f.points()[0]!.until;
  assert(e>f.game.combatTick&&f.status()?.phase==='crossed');
  assert.equal(until-f.game.combatTick,fuseSealRules.crossed);
  for(let i=0;i<12&&f.game.kitStatus(f.mage.id).waymark?.phase==='returning';i++) f.tick();
  assert(distance(f.mage,origin)<.01&&f.game.combatTick<until);
  f.tick({...action,aim:0});
  assert.equal(f.strokes()[0]?.phase,'crossed');
  assert.deepEqual([f.mage.qAt,f.mage.eAt,f.mage.ultimateAt],[q,e,u]);
});

test('Shunt Fuse carries a single paid seal once while voluntarily walking and keeps its bought recovery',()=>{
  const f=exercise({fitting:'shunt'});
  f.tick(action); const mark=f.points()[0]!;
  for(let i=0;i<12&&distance(f.mage,mark)<fuseSealRules.shuntMinimum;i++) f.tick({moveX:1});
  f.tick({...action,moveX:1});
  assert.deepEqual(pos(f.points()[0]!),pos(mark));
  f.tick({q:true,aim:Math.PI/2});
  const paid=f.mage.ultimateAt, until=f.points()[0]!.until;
  assert(f.status()?.canShunt);
  f.tick({...action,moveX:1,fire:true});
  assert.deepEqual(pos(f.points()[0]!),pos(mark));
  const moved=f.tick({...action,moveX:1,aim:0});
  const shifted=f.points()[0]!;
  assert(moved.some(e=>e.type==='sound'&&e.id==='mage-fuse-shunt'));
  assert.equal(shifted.id,mark.id);
  assert.equal(shifted.until,until-fuseSealRules.shuntCost);
  assert.deepEqual(pos(f.mage),pos(shifted));
  assert(fuseSealRules.shuntMinimum<=distance(shifted,mark)&&distance(shifted,mark)<=fuseSealRules.shuntMaximum);
  assert.equal(f.mage.ultimateAt,paid);
  for(let i=0;i<15&&distance(f.mage,mark)<=fuseSealRules.leash+3;i++) f.tick({...action,moveX:1});
  assert(distance(f.mage,mark)>fuseSealRules.leash);
  assert.deepEqual(pos(f.points()[0]!),pos(shifted));
  assert(!f.status()?.canShunt);
  f.tick({...action,aim:0});
  assert.equal(f.strokes()[0]?.phase,'binding');
  assert.equal(f.mage.ultimateAt,paid);
});

test('Twin Vent aims two distinct strokes on the shared deadline and keeps their one-hit-per-target limit',()=>{
  const f=exercise({fitting:'twin'});
  Object.assign(f.game.boss,{x:710,y:500});
  f.tick(action);f.tick({q:true,aim:Math.PI/2});f.tick({e:true,aim:Math.PI/2});
  const paid=f.mage.ultimateAt, until=f.points()[0]!.until, originalHealth=f.game.boss.health;
  assert.equal(until,f.game.combatTick+fuseSealRules.twinCrossed);
  assert.equal(f.status()?.split,true);
  const first=f.tick({...action,aim:0});
  assert(first.some(e=>e.type==='sound'&&e.id==='mage-fuse-split'));
  assert.equal(f.points()[0]?.phase,'ward');
  assert.equal(f.points()[0]?.until,until);
  assert.equal(f.status()?.echo,true);
  assert.equal(f.status()?.guide?.length,2);
  assert.equal(originalHealth-f.game.boss.health,fuseSealRules.twinBindingDamage);
  const next=f.tick({...action,aim:0});
  assert(next.some(e=>e.type==='sound'&&e.id==='mage-fuse-echo'));
  assert.equal(originalHealth-f.game.boss.health,fuseSealRules.twinBindingDamage);
  assert.deepEqual(f.strokes().map(c=>[c.phase,c.part]),[['binding','first'],['ward','echo']]);
  assert.equal(new Set(f.strokes().map(c=>c.id)).size,2);
  assert.equal(f.mage.ultimateAt,paid);

  const turned=exercise({fitting:'twin'});
  turned.tick(action);turned.tick({e:true,aim:Math.PI/2});turned.tick({q:true,aim:Math.PI/2});
  const actor=turned.game.minions.spawn(990001,{kind:'ordinary',x:500,y:765,health:1000,speed:0,radius:10,damage:0},turned.game.combatTick);
  assert(actor);
  turned.tick({...action,aim:0});
  assert.equal(turned.strokes()[0]?.phase,'ward');
  assert.equal(actor.health,1000);
  turned.tick({...action,aim:Math.PI/2});
  assert.equal(turned.strokes()[1]?.phase,'binding');
  assert.equal(actor.health,1000-fuseSealRules.twinBindingDamage);
});
