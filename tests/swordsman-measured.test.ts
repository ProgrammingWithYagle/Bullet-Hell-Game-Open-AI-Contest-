import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { measuredIds, measuredRules, type MeasuredStanceCue } from '../src/shared/swordsman-measured.ts';
import { viewOf } from '../src/shared/view.ts';

const R = measuredRules;
const action = { technique1: true };
const origin = { x: 500, y: 500 };
const radians = (degrees: number) => degrees * Math.PI / 180;

function setup(fitting?: 'turn' | 'follow') {
  const game = new Game({ mode:'endless', seed:41, difficulty:'normal', arenaSelection:'fixed', openingArenaId:'gatehouse', maxPlayers:2 });
  if (fitting) game.encounter = 9;
  const player = game.addPlayer('dara','Dara','swordsman');
  const ally = game.addPlayer('ally','Lane','soldier');
  const buy = (owner: string, item: string) => game.transact(owner,{ id:item, item, kind:'skill' });
  assert(!buy(ally.id,measuredIds.entry).ok);
  assert(buy(player.id,'swordsman-measure-1').ok);
  assert(buy(player.id,measuredIds.entry).ok);
  if (fitting) {
    assert(buy(player.id,measuredIds[fitting]).ok);
    assert.equal(buy(player.id,measuredIds[fitting === 'turn' ? 'follow' : 'turn']).reason,'incompatibleItem');
  } else {
    assert(!buy(player.id,measuredIds.turn).ok);
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game,'arena',{ get:()=>arena });
  Object.assign(player,{ ...origin, oldX:origin.x, oldY:origin.y });
  Object.assign(ally,{ x:1125, y:690 });
  Object.assign(game.boss,{ x:1290, y:720, staggerUntil:9000, deadline:9000 });
  const history: string[] = [];
  function tick(input: Partial<InputFrame> = {}) {
    if (player.connected) assert(game.submitInput(player.id,{ ...idleInput(), aim:0, sequence:player.ack+1, clientTick:game.combatTick, ...input }));
    game.step();
    const sounds = game.drainEvents().flatMap(event=>event.type==='sound' && event.owner===player.id ? [event.id] : []);
    history.push(...sounds);
    return sounds;
  }
  function wait(count: number, input: Partial<InputFrame> = {}) {
    for (let elapsed=0;elapsed<count;elapsed++) tick(input);
  }
  function victim(id: number, angle = 0, range = 120) {
    const actor = game.minions.spawn(id,{ kind:'ordinary', x:origin.x+Math.cos(angle)*range, y:origin.y+Math.sin(angle)*range,
      health:500, speed:0, radius:14, damage:10 },game.combatTick);
    assert(actor);
    return actor;
  }
  const status = () => game.kitStatus(player.id).measuredStance!;
  const cues = () => game.classCues().filter((cue): cue is MeasuredStanceCue=>cue.kind==='sword-measured-stance');
  const live = () => cues().find(cue=>cue.state!=='cut');
  return { game,player,ally,arena,tick,wait,victim,status,cues,live,history };
}

test('Held Edge is a purchased stationary cut with real recovery and no primary or Long Measure charge during preparation',()=>{
  const f = setup();
  const target = f.victim(91001);
  f.tick({ ultimate:true });
  const cuts = f.game.kitStatus(f.player.id).swordCuts;
  assert(cuts && cuts>0);
  const breath = f.player.ammo;
  assert(f.tick({ ...action,fire:true }).includes('sword-held-edge-set'));
  const recovery = f.player.qAt;
  assert(recovery > f.game.combatTick + 150);
  assert.equal(f.live()?.state,'preparing');
  f.tick({ ...action,fire:true });
  assert.equal(target.health,500);
  f.wait(R.prepareTicks-1,{ fire:true });
  assert.equal(f.status().action,'first');
  assert.equal(f.player.ammo,breath);
  assert(f.tick({ ...action,fire:true }).includes('sword-held-edge-cut'));
  assert(target.health<500);
  assert.equal(f.cues().filter(cue=>cue.state==='cut').length,1);
  assert.deepEqual([f.player.x,f.player.y],[origin.x,origin.y]);
  assert.equal(f.player.qAt,recovery);
  assert.equal(f.player.ammo,breath);
  assert.equal(f.game.kitStatus(f.player.id).swordCuts,cuts);
});

test('walking or dodging drops the paid preparation and Q can be used again after its issued recovery',()=>{
  for (const interruption of [{ moveX:-1 }, { dodge:true,moveY:1 }]) {
    const f = setup();
    f.tick(action);
    const recovery = f.player.qAt;
    f.tick({ ...interruption,...action });
    assert(!f.live());
    assert.equal(f.player.qAt,recovery);
    assert(!f.tick({ q:true }).includes('sword-cut'));
    f.wait(recovery-f.game.combatTick);
    f.tick({ q:true });
    assert(f.game.classCues().some(cue=>cue.kind==='sword-windup'&&cue.owner===f.player.id));
  }
});

test('Turn the Edge changes one actual cut heading, preserves its deadline and requires the new settle',()=>{
  const f = setup('turn');
  const missed = f.victim(91001,0);
  const hit = f.victim(91002,radians(75));
  f.tick(action);
  const initial = f.live()!;
  f.wait(R.prepareTicks);
  assert(f.tick({ ...action,aim:radians(75) }).includes('sword-held-edge-turn'));
  const turned = f.live()!;
  assert.deepEqual([turned.id,turned.x,turned.y,turned.until],[initial.id,initial.x,initial.y,initial.until]);
  assert.equal(turned.aim,radians(75));
  f.tick({ ...action,aim:radians(75) });
  assert.equal(hit.health,500);
  f.wait(R.turnTicks,{ aim:radians(75) });
  f.tick({ ...action,aim:radians(145) });
  assert.equal(f.live()?.aim,radians(75));
  assert(f.tick({ ...action,aim:radians(75) }).includes('sword-held-edge-cut'));
  assert.equal(missed.health,500);
  assert(hit.health<500);
  assert.equal(f.history.filter(id=>id==='sword-held-edge-turn').length,1);
});

test('Second Line follows real first damage and resolves a single smaller cut beside the original heading',()=>{
  const f = setup('follow');
  const first = f.victim(91001,0);
  const second = f.victim(91002,radians(77));
  f.tick(action);
  const recovery = f.player.qAt;
  f.wait(R.prepareTicks);
  assert(f.tick(action).includes('sword-held-edge-follow'));
  assert(first.health<500 && second.health===500);
  assert(f.status().following);
  f.tick(action);
  assert.equal(second.health,500);
  assert(f.tick({ ...action,aim:radians(77) }).includes('sword-held-edge-second'));
  assert(500-second.health>0 && 500-second.health<500-first.health);
  assert(!f.live());
  assert.equal(f.player.qAt,recovery);
  f.tick({ ...action,aim:radians(77) });
  assert.equal(f.history.filter(id=>id==='sword-held-edge-second').length,1);
});

test('cover blocks the held strike and a missed or expired Held Edge grants no follow-up',()=>{
  const f = setup('follow');
  f.arena.obstacles.push({ x:555,y:450,width:21,height:100 });
  const target = f.victim(91001,0);
  f.tick(action);
  f.wait(R.prepareTicks);
  assert(f.tick(action).includes('sword-held-edge-cut'));
  assert.equal(target.health,500);
  assert(!f.live());
  assert(!f.history.includes('sword-held-edge-follow'));
  f.wait(f.player.qAt-f.game.combatTick);
  f.tick(action);
  f.wait(R.holdTicks);
  assert(!f.live());
  assert(!f.history.includes('sword-held-edge-follow'));
});

test('peers see the held arc while only the owner has input guidance, and disconnect clears the paid posture',()=>{
  const f = setup();
  f.tick(action);
  const owner = viewOf(f.game,f.player.id);
  const peer = viewOf(f.game,f.ally.id);
  assert(owner.players.find(player=>player.id===f.player.id)?.kit.measuredStance?.readyAt);
  assert.equal(peer.players.find(player=>player.id===f.player.id)?.kit.measuredStance,undefined);
  assert(peer.classCues.some(cue=>cue.kind==='sword-measured-stance'&&cue.owner===f.player.id));
  const recovery = f.player.qAt;
  f.game.setConnected(f.player.id,false);
  assert(!f.live());
  f.game.setConnected(f.player.id,true);
  f.tick(action);
  assert(!f.live());
  assert.equal(f.player.qAt,recovery);
});
