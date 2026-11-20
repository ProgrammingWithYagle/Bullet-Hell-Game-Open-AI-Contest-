import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { mageBindingIds, pivotSigilId, pivotSigilRules, type PivotCue } from '../src/shared/mage-pivot-sigil.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

const action = { technique1:true };
const near = (a:number,b:number) => assert(Math.abs(a-b)<1e-6, a + ' vs ' + b);
function study(owned = true, party = false, fitting?: 'fixed'|'reverse') {
  const game = new Game({ mode:'short',seed:41,difficulty:'normal',arenaSelection:'fixed',openingArenaId:'gatehouse',
    maxPlayers:party ? 2 : 1 });
  if (fitting) game.encounter = 1;
  const mage = game.addPlayer('mage','Sable','mage');
  const ally = party ? game.addPlayer('ally','Lane','soldier') : undefined;
  assert.equal(mage.totalSp,fitting?9:3);
  const purchase = (item:string) => game.transact(mage.id,{ id:item,kind:'skill',item });
  assert(purchase('mage-control-1').ok);
  if (owned) assert(purchase(pivotSigilId).ok);
  if (fitting) {
    assert(purchase(mageBindingIds[fitting]).ok);
    const opposite = fitting === 'fixed' ? 'reverse' : 'fixed';
    assert.equal(purchase(mageBindingIds[opposite]).reason,'incompatibleItem');
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game,'arena',{ get:()=>arena });
  Object.assign(mage,{ x:630,y:550 });
  if (ally) Object.assign(ally,{ x:580,y:640 });
  Object.assign(game.boss,{ x:1040,y:250,staggerUntil:1000,deadline:1000 });
  function tick(input:Partial<InputFrame> = {}) {
    assert(game.submitInput(mage.id,{ ...idleInput(),aim:mage.aim,sequence:mage.ack+1,clientTick:game.combatTick,...input }));
    if (ally && ally.connected) assert(game.submitInput(ally.id,{ ...idleInput(),sequence:ally.ack+1,clientTick:game.combatTick }));
    game.step();
    return game.drainEvents();
  }
  function wait(n:number,input:Partial<InputFrame> = {}) { for(let i=0;i<n;i++) tick(input); }
  function spawn(x:number,y:number,kind:'ordinary'|'rat' = 'ordinary') {
    game['spawnMinion']({ kind,x,y,goalX:x,goalY:y,speed:0,health:150,damage:0,radius:8,lifeSeconds:30 });
    const actor = [...game.minions.actors.values()].at(-1);
    assert(actor?.x === x && actor.y === y);
    return actor;
  }
  const kit = () => game.kitStatus(mage.id).pivotSigil;
  const cues = () => game.classCues().filter((row): row is PivotCue => row.kind === 'mage-pivot-mark' || row.kind === 'mage-pivot-stroke');
  return { game,mage,ally,arena,tick,wait,spawn,kit,cues };
}

test('Pivot Sigil marks clear ground privately and spends the same Q clock only at a committed stroke',() => {
  const f = study(true,true), baseline = study(false);
  f.tick({ ...action,aim:0 });
  assert.equal(f.kit()?.phase,'marked');
  assert.equal(f.mage.qAt,0);
  assert.equal(f.cues().length,1);
  assert.equal(viewOf(f.game,f.ally!.id).players.find(p=>p.id===f.mage.id)?.kit.pivotSigil,undefined);
  assert(viewOf(f.game,f.ally!.id).classCues.some(cue=>cue.kind==='mage-pivot-mark'));
  baseline.tick(); baseline.tick({ q:true,aim:0 });
  f.tick(action);
  assert.equal(f.kit()?.phase,'sweeping');
  assert.equal(f.mage.qAt,baseline.mage.qAt);
  assert.equal(f.cues()[0].kind,'mage-pivot-stroke');
  assert.equal(f.cues()[0].until,f.game.combatTick+pivotSigilRules.strokeTicks);
});

test('Ordinary Q wins a simultaneous Action 1 and clears an unpaid mark',() => {
  const f = study(), baseline = study(false);
  f.tick({ ...action,aim:0 }); baseline.tick();
  f.tick({ ...action,q:true }); baseline.tick({ q:true });
  assert.equal(f.mage.qAt,baseline.mage.qAt);
  assert.equal(f.kit()?.phase,'idle');
  assert.deepEqual(f.cues(),[]);
  assert(f.game.classCues().some(cue=>cue.kind==='sigil'));
});

test('A turning stroke damages each admitted minion once and slows an ordinary minion',() => {
  const f = study();
  const first = f.spawn(800,550), later = f.spawn(735,655);
  f.tick({ ...action,aim:0 });
  const signals = f.tick(action);
  assert(signals.some(event=>event.type==='sound' && event.id==='mage-pivot-contact' && event.owner===f.mage.id));
  const firstHit = first.health, wave = f.cues()[0];
  assert(firstHit<150 && later.health===150);
  assert(first.slowUntil > f.game.combatTick);
  assert.equal(first.slowMultiplier,pivotSigilRules.ordinarySlow);
  f.wait(14,{ aim:Math.PI/2 });
  assert.equal(first.health,firstHit);
  assert(later.health<150);
  assert.equal(f.cues()[0].until,wave.until);
  near(f.cues()[0].toX,wave.x);
  assert(f.cues()[0].toY>wave.y);
  const finalHealth = later.health;
  f.wait(8,{ aim:Math.PI/2 });
  assert.equal(later.health,finalHealth);
  assert.equal(f.kit()?.phase,'idle');
});

test('A wall clips the stroke before a covered body and invalid points preserve Q',() => {
  const f = study(), occluded = f.spawn(850,550);
  f.arena.obstacles = [{ x:790,y:490,width:24,height:120 }];
  f.tick({ ...action,aim:0 }); f.tick(action);
  assert.equal(f.kit()?.phase,'sweeping');
  assert(f.cues()[0].toX < 790);
  assert.equal(occluded.health,150);
  const bad = study();
  bad.arena.obstacles = [{ x:715,y:520,width:46,height:60 }];
  bad.tick({ ...action,aim:0 });
  assert.equal(bad.kit()?.phase,'idle');
  assert.equal(bad.mage.qAt,0);
  assert.deepEqual(bad.cues(),[]);
});

test('The stroke hits an ordinary exposed boss once and leaves its status and path untouched',() => {
  const f = study(), boss = f.game.boss;
  Object.assign(boss,{ x:850,y:550 });
  const before={ x:boss.x,y:boss.y,health:boss.health,deadline:boss.deadline,stagger:boss.staggerUntil };
  f.tick({ ...action,aim:0 }); f.tick(action);
  const hit = boss.health;
  assert(hit<before.health);
  f.wait(10);
  assert.equal(boss.health,hit);
  assert.deepEqual({x:boss.x,y:boss.y,deadline:boss.deadline,stagger:boss.staggerUntil},
    {x:before.x,y:before.y,deadline:before.deadline,stagger:before.stagger});
});

test('Leaving the pivot or firing closes the stroke while retaining the paid recovery',() => {
  const f=study(), out=study();
  for(const state of [f,out]){state.tick({ ...action,aim:0 });state.tick(action);}
  const paid=f.mage.qAt, ammo=f.mage.ammo;
  f.tick({ fire:true });
  assert(f.mage.ammo<ammo);
  assert.equal(f.kit()?.phase,'idle');
  assert.equal(f.mage.qAt,paid);
  const old=out.mage.qAt;
  out.wait(9,{ moveX:-1 });
  assert.equal(out.kit()?.phase,'idle');
  assert.equal(out.mage.qAt,old);
});

test('An expired unpaid pivot retains its retry interval, and a clear removes combat cues',() => {
  const f=study();
  f.tick({ ...action,aim:0 });
  f.wait(pivotSigilRules.planTicks);
  assert.equal(f.kit()?.phase,'idle');
  assert.equal(f.mage.qAt,0);
  f.tick(action);
  assert.equal(f.kit()?.phase,'idle');
  f.wait(pivotSigilRules.retryTicks);
  f.tick(action);
  assert.equal(f.kit()?.phase,'marked');
  f.game.boss.health=0;
  f.tick();
  assert.equal(f.game.phase,'mutationVote');
  assert.deepEqual(f.cues(),[]);
});

test('Fixed Angle releases the Mage to shoot as the pinned lane admits a later enemy',() => {
  const f=study(true,false,'fixed');
  f.tick({ ...action,aim:0 }); f.tick(action);
  const original=f.cues()[0],paid=f.mage.qAt;
  f.tick({ technique1:true,aim:Math.PI/2 });
  assert.equal(f.kit()?.phase,'sweeping');
  f.wait(3,{ aim:Math.PI/2 });
  assert(f.kit()?.canFix);
  const before=f.cues()[0];
  const signals=f.tick(action);
  assert(signals.some(event=>event.type==='sound' && event.id==='mage-pivot-fixed'));
  assert.equal(f.kit()?.phase,'fixed');
  const fixed=f.cues()[0];
  near(before.toX,fixed.toX); near(before.toY,fixed.toY);
  assert.equal(fixed.id,original.id);
  assert.equal(fixed.until,original.until);
  const arrival=f.spawn(fixed.x+(fixed.toX-fixed.x)*.6,fixed.y+(fixed.toY-fixed.y)*.6);
  const ammo=f.mage.ammo;
  f.tick({ moveX:-1,aim:Math.PI,fire:true });
  assert(f.mage.ammo<ammo);
  assert(arrival.health<150);
  f.wait(11,{ moveX:-1,aim:Math.PI });
  assert.equal(f.kit()?.phase,'fixed');
  near(f.cues()[0].toX,fixed.toX);
  near(f.cues()[0].toY,fixed.toY);
  assert.equal(f.mage.qAt,paid);
});

test('Reverse Face admits the opposite ray once without striking intervening angles or repeating an old contact',() => {
  const f=study(true,false,'reverse');
  const center=f.spawn(734,550);
  f.tick({ ...action,aim:0 }); f.tick(action);
  const first=f.cues()[0],paid=f.mage.qAt,hit=center.health;
  assert(hit<150);
  f.wait(5,{ aim:Math.PI/2 });
  const line=f.cues()[0],angle=Math.atan2(line.toY-line.y,line.toX-line.x);
  const behind=f.spawn(line.x+94*Math.cos(angle+Math.PI),line.y+94*Math.sin(angle+Math.PI));
  const between=f.spawn(line.x+94*Math.cos(angle+Math.PI/2),line.y+94*Math.sin(angle+Math.PI/2));
  const allowance=f.kit()?.steeringLeft;
  const signals=f.tick({ ...action,aim:angle-Math.PI });
  assert(signals.some(event=>event.type==='sound' && event.id==='mage-pivot-reverse'));
  assert(behind.health<150 && between.health===150);
  assert.equal(center.health,hit);
  near(f.kit()?.steeringLeft??0,allowance??0);
  assert.equal(f.cues()[0].reversed,true);
  assert.equal(f.cues()[0].until,first.until);
  assert.equal(f.cues()[0].id,first.id);
  const second=f.tick({ ...action,aim:angle });
  assert(!second.some(event=>event.type==='sound' && event.id==='mage-pivot-reverse'));
  assert.equal(f.mage.qAt,paid);
});

test('An obstructed opposite face leaves the paid line and its single reversal unused',() => {
  const f=study(true,false,'reverse');
  f.tick({ ...action,aim:0 }); f.tick(action);
  f.wait(5,{ aim:Math.PI/2 });
  const line=f.cues()[0],angle=Math.atan2(line.toY-line.y,line.toX-line.x);
  const pad=31,p={x:line.x+pad*Math.cos(angle+Math.PI),y:line.y+pad*Math.sin(angle+Math.PI)};
  f.arena.obstacles=[{x:p.x-5,y:p.y-5,width:10,height:10}];
  const paid=f.mage.qAt, events=f.tick({ ...action,aim:angle-Math.PI });
  assert(!events.some(event=>event.type==='sound' && event.id==='mage-pivot-reverse'));
  assert.equal(f.cues()[0].reversed,undefined);
  assert.equal(f.mage.qAt,paid);
});
