import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { cohortIds, cohortRules } from '../src/shared/summoner-cohort.ts';
import { viewOf } from '../src/shared/view.ts';

function fixture(fitting?: 'cross' | 'relay') {
  const game = new Game({ mode: fitting ? 'raid' : 'short', seed:41, openingArenaId:'gatehouse', arenaSelection:'fixed', maxPlayers:2 });
  const joss = game.addPlayer('joss','Joss','summoner');
  const peer = game.addPlayer('peer','Peer','summoner');
  const buy = (item: string) => game.transact(joss.id,{ id:item, kind:'skill', item });
  assert(buy('summoner-bonds-1').ok && buy(cohortIds.entry).ok);
  if (fitting) {
    assert(buy(cohortIds[fitting]).ok);
    assert.equal(buy(cohortIds[fitting === 'cross' ? 'relay' : 'cross']).reason,'incompatibleItem');
  } else assert(!buy(cohortIds.cross).ok);
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game,'arena',{ get:() => arena });
  Object.assign(joss,{ x:480, y:500, oldX:480, oldY:500 });
  Object.assign(peer,{ x:470, y:720, oldX:470, oldY:720 });
  Object.assign(game.boss,{ x:1340, y:730, health:100000, maxHealth:100000, staggerUntil:10000, deadline:10000 });

  function tick(input: Partial<InputFrame> = {}, peerInput: Partial<InputFrame> = {}) {
    for (const [p, frame] of [[joss,input],[peer,peerInput]] as const) if (p.connected) {
      assert(game.submitInput(p.id,{ ...idleInput(), sequence:p.ack+1, clientTick:game.combatTick, aim:0, ...frame }));
    }
    game.step();
    return game.drainEvents();
  }

  let targetId = 91100;
  function target(x: number, y: number) {
    const actor = game.minions.spawn(++targetId,{ kind:'ordinary', x, y, health:3000, speed:0, radius:16, damage:1 },game.combatTick);
    assert(actor);
    return actor;
  }

  function wait(forward: () => boolean, limit = 100) {
    for (let i=0; i<limit && !forward(); i++) tick();
    assert(forward());
  }

  function mark(actor: ReturnType<typeof target>) {
    const key = 'ordinary:' + actor.id;
    const before = actor.health;
    const aim = Math.atan2(actor.y-joss.y,actor.x-joss.x);
    tick({ fire:true, aim });
    wait(() => game.kitStatus(joss.id).retinueMarkKey === key, 36);
    assert(actor.health < before);
    return key;
  }

  const cue = () => game.classCues().filter(row => row.kind === 'summoner-cohort');
  const status = () => game.kitStatus(joss.id).cohort!;
  return { game,joss,peer,arena,buy,tick,target,wait,mark,cue,status };
}

test('Cohort Drive spends one Focus for two existing bodies after a real own mark', () => {
  const f = fixture();
  const mark = f.target(718,500);
  f.tick({ q:true },{ q:true });
  const companions = f.game.retinue.owned(f.joss.id);
  const peers = f.game.retinue.owned(f.peer.id);
  assert.equal(companions.length,2);
  const base = f.joss.ammo;
  f.tick({ technique1:true });
  assert.equal(f.joss.ammo,base);
  assert(!f.cue().length);
  f.mark(mark);
  assert(f.status().canSend);
  const before = new Map(companions.map(unit => [unit.id,{ x:unit.x,y:unit.y,health:unit.health }]));
  const paid = { ammo:f.joss.ammo, q:f.joss.qAt, e:f.joss.eAt, ultimate:f.joss.ultimateAt };
  const events = f.tick({ technique1:true, fire:true });
  assert(events.some(event => event.type==='sound' && event.id==='summoner-cohort-drive'));
  assert.deepEqual([f.joss.ammo,f.joss.qAt,f.joss.eAt,f.joss.ultimateAt],[paid.ammo-1,paid.q,paid.e,paid.ultimate]);
  const order = f.cue();
  assert.equal(order.length,2);
  assert.equal(new Set(order.map(row=>row.id)).size,2);
  assert(order.every(row=>row.owner===f.joss.id && row.until-row.at===cohortRules.duration));
  assert.deepEqual(order.map(row=>row.unit),companions.map(unit=>unit.id));
  for (const unit of companions) {
    const origin = before.get(unit.id)!;
    const travelled = Math.hypot(unit.x-origin.x,unit.y-origin.y);
    assert(travelled > 0 && travelled <= unit.speed / 30 * cohortRules.marchSpeed + 0.000001);
    assert.equal(unit.health,origin.health);
  }
  assert(peers.every(unit=>!order.some(row=>row.unit===unit.id)));
  const own = viewOf(f.game,f.joss.id), other = viewOf(f.game,f.peer.id);
  assert(own.players.find(p=>p.id===f.joss.id)?.kit.cohort);
  assert.equal(other.players.find(p=>p.id===f.joss.id)?.kit.cohort,undefined);
  assert.deepEqual(own.classCues,other.classCues);
  const hp = mark.health;
  f.wait(()=>f.cue().length===0);
  assert(mark.health<hp && companions.every(unit=>unit.actionAt>=order[0].at));
  assert.equal(f.game.retinue.owned(f.joss.id).length,2);
  assert(f.status().recoveryAt>f.game.combatTick);
});

test('Cross Orders plots both physical sides and a fully obstructed mark spends nothing', () => {
  const f = fixture('cross');
  const mark = f.target(740,500);
  f.tick({ q:true });
  f.mark(mark);
  const wall = { x:600,y:275,width:330,height:450 };
  f.arena.obstacles.push(wall);
  const ammo = f.joss.ammo;
  assert(!f.status().canSend);
  f.tick({ technique1:true });
  assert.deepEqual([f.joss.ammo,f.status().recoveryAt,f.cue().length],[ammo,0,0]);
  f.arena.obstacles.length = 0;
  f.tick({ technique1:true });
  const [a,b] = f.cue();
  assert(a && b && a.y>mark.y !== (b.y>mark.y));
  assert(a.x>mark.x && b.x>mark.x);
  assert.equal(f.joss.ammo,ammo-1);
  const before = mark.health;
  f.wait(()=>!f.cue().length);
  assert(mark.health<before);
});

test('Relay Orders earns a single retargetable second order on actual lead damage', () => {
  const f = fixture('relay');
  const first = f.target(725,500);
  f.tick({ q:true });
  const [lead,follower] = f.game.retinue.owned(f.joss.id);
  assert(lead.kind==='hound' && follower.kind==='wing');
  const firstMark = f.mark(first);
  const before = f.joss.ammo;
  f.tick({ technique1:true });
  const leadCue = f.cue()[0];
  assert.equal(leadCue.unit,lead.id);
  assert.equal(f.cue().length,1);
  assert.equal(f.status().stage,'march');
  assert.equal(f.joss.ammo,before-1);
  const recovery = f.status().recoveryAt;
  const hp=first.health;
  f.wait(()=>f.status().stage==='relay');
  assert(first.health<hp);
  const ready = f.cue()[0];
  assert.equal(ready.unit,follower.id);
  assert.equal(ready.until-ready.at,cohortRules.relayWindow);
  assert.notEqual(ready.id,leadCue.id);
  const next=f.target(629,429);
  assert.notEqual(f.mark(next),firstMark);
  const charge=f.joss.ammo;
  f.tick({ technique1:true, fire:true });
  const second=f.cue()[0];
  assert(second && second.unit===follower.id && second.state==='march' && second.id!==ready.id);
  assert(Math.hypot(second.x-next.x,second.y-next.y)<follower.range+next.radius);
  assert.equal(f.status().recoveryAt,recovery);
  assert.equal(f.joss.ammo,charge);
  const secondHp=next.health;
  f.wait(()=>!f.cue().length);
  f.wait(()=>next.health<secondHp,38);
  f.tick({ technique1:true });
  assert.equal(f.joss.ammo,charge);
});

test('Gather, loss, and disconnect clear paid commands without giving a replacement or refund', () => {
  const f = fixture('relay');
  const first=f.target(770,500);
  f.tick({ q:true },{ q:true });
  f.mark(first);
  f.tick({ technique1:true });
  const leader=f.cue()[0].unit;
  const cooldown=f.status().recoveryAt;
  const paid=f.joss.ammo;
  f.game.retinue.hit(leader,10000,f.game.combatTick);
  f.tick();
  assert.equal(f.cue().length,0);
  assert.equal(f.status().recoveryAt,cooldown);
  assert.equal(f.joss.ammo,paid);
  assert.equal(f.game.retinue.owned(f.peer.id).length,2);

  const gather=fixture();
  const mark=gather.target(755,500);
  gather.tick({ q:true });
  gather.mark(mark);
  gather.tick({ technique1:true });
  assert.equal(gather.cue().length,2);
  gather.tick({ e:true });
  assert.equal(gather.cue().length,0);
  assert((gather.game.kitStatus(gather.joss.id).retinueGatherUntil ?? 0)>gather.game.combatTick);
  gather.game.setConnected(gather.joss.id,false);
  assert.equal(gather.game.retinue.owned(gather.joss.id).length,0);
  gather.game.setConnected(gather.joss.id,true);
  assert(gather.status().recoveryAt>gather.game.combatTick);
  assert(!gather.status().canSend);
});

test('Temporary Warders alone cannot start an order and another caller cannot use its owner’s mark', () => {
  const f=fixture();
  const mark=f.target(715,500);
  f.tick({ ultimate:true },{ q:true });
  assert.equal(f.game.retinue.owned(f.joss.id).length,2);
  assert.equal(f.status().members,0);
  f.mark(mark);
  const before=f.joss.ammo;
  f.tick({ technique1:true },{ technique1:true });
  assert.equal(f.joss.ammo,before);
  assert.equal(f.cue().length,0);
  assert.equal(f.status().recoveryAt,0);
  assert.equal(f.game.kitStatus(f.peer.id).cohort,undefined);
});

test('A Lanternwing must land its exact ordered projectile before the Relay opens', () => {
  for (const blocked of [true,false]) {
    const f=fixture('relay');
    f.tick({ q:true });
    f.wait(()=>f.game.combatTick>=f.joss.qAt,270);
    f.tick({ q:true });
    const units=f.game.retinue.owned(f.joss.id);
    assert.equal(units.length,4);
    for (const unit of units) if (unit.kind==='hound') f.game.retinue.hit(unit.id,10000,f.game.combatTick);
    const [lead,second]=f.game.retinue.owned(f.joss.id);
    assert(lead.kind==='wing' && second.kind==='wing');
    const mark=f.target(720,500);
    f.mark(mark);
    f.tick({ technique1:true });
    assert.equal(f.cue()[0].unit,lead.id);
    f.wait(()=>!f.cue().some(row=>row.state==='march'));
    assert.equal(f.status().stage,'march');
    assert.equal(lead.action,'attack');
    if (blocked) {
      f.arena.obstacles.push({ x:(lead.x+mark.x)/2-12,y:(lead.y+mark.y)/2-12,width:24,height:24 });
      for (let i=0;i<18;i++) f.tick();
      assert.equal(f.status().stage,'march');
      assert.equal(f.cue().length,0);
    } else {
      f.wait(()=>f.status().stage==='relay',24);
      assert.equal(f.cue()[0].unit,second.id);
    }
  }
});
