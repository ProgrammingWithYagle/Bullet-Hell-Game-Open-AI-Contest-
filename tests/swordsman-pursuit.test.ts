import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { counterstrokeIds } from '../src/shared/swordsman-counterstroke.ts';
import { measuredIds } from '../src/shared/swordsman-measured.ts';
import { pursuitIds, pursuitRules } from '../src/shared/swordsman-pursuit.ts';
import { viewOf } from '../src/shared/view.ts';

const passing = { technique3:true };
const start = { x:500, y:500 };

function fixture(fitting?: 'through' | 'cross', hybrid = false) {
  const game = new Game({ mode:fitting || hybrid ? 'raid' : 'standard', seed:41, difficulty:'normal',
    arenaSelection:'fixed', openingArenaId:'gatehouse', maxPlayers:2 });
  const sword = game.addPlayer('dara','Dara','swordsman');
  const ally = game.addPlayer('lane','Lane','soldier');
  const buy = (id: string) => game.transact(sword.id,{ kind:'skill', id, item:id });
  assert(buy('swordsman-footwork-1').ok && buy(pursuitIds.entry).ok);
  if (fitting) {
    assert(buy(pursuitIds[fitting]).ok);
    assert.equal(buy(pursuitIds[fitting === 'through' ? 'cross' : 'through']).reason,'incompatibleItem');
  } else if (!hybrid) assert(!buy(pursuitIds.through).ok);
  if (hybrid) {
    assert(buy('swordsman-measure-1').ok && buy(measuredIds.entry).ok);
    assert(buy('swordsman-edgework-1').ok && buy(counterstrokeIds.entry).ok);
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game,'arena',{ get:() => arena });
  Object.assign(sword,{ ...start, oldX:start.x, oldY:start.y });
  Object.assign(ally,{ x:1190, y:690 });
  Object.assign(game.boss,{ x:1300, y:710, staggerUntil:9000, deadline:9000 });
  const status = () => game.kitStatus(sword.id).pursuit!;
  function tick(input: Partial<InputFrame> = {}) {
    assert(game.submitInput(sword.id,{ ...idleInput(), aim:0, sequence:sword.ack + 1, clientTick:game.combatTick, ...input }));
    game.step();
    return game.drainEvents().flatMap(event => event.type === 'sound' && event.owner === sword.id ? [event.id] : []);
  }
  function walk(heading: number, count: number) {
    for (let i = 0; i < count; i++) tick({ aim:heading, moveX:Math.cos(heading), moveY:Math.sin(heading) });
  }
  function earn(heading: number, follow = false) {
    const distance = follow ? pursuitRules.followStride : pursuitRules.stride;
    for (let i = 0; i < 30 && (follow ? status().followStride : status().stride) < distance; i++) walk(heading,1);
    assert.equal(follow ? status().followStride : status().stride,distance);
  }
  function victim(id: number, x: number, y: number) {
    const target = game.minions.spawn(id,{ kind:'ordinary', x, y, health:500, speed:0, radius:14, damage:1 },game.combatTick);
    assert(target);
    return target;
  }
  return { game, sword, ally, arena, status, tick, walk, earn, victim };
}

test('Passing Cut requires actual walking and spends one primary charge independent of Q and E', () => {
  const f = fixture();
  const target = f.victim(84001,640,500);
  const { ammo, qAt, eAt } = f.sword;
  assert(!f.tick(passing).includes('sword-pursuit-passing'));
  f.earn(0);
  assert(f.status().canStrike);
  assert(!f.tick({ ...passing, aim:Math.PI }).includes('sword-pursuit-passing'));
  assert.equal(f.sword.ammo,ammo);
  assert(f.tick({ ...passing, fire:true }).includes('sword-pursuit-passing'));
  assert(target.health < 500);
  assert.deepEqual([f.sword.ammo,f.sword.qAt,f.sword.eAt],[ammo - 1,qAt,eAt]);
  assert.equal(f.status().recoveryAt,f.game.combatTick + pursuitRules.recoveryTicks);
  assert.equal(f.status().followUntil,0);
  assert(!f.tick(passing).includes('sword-pursuit-passing'));
  assert.equal(f.sword.ammo,ammo - 1);
  const own = viewOf(f.game,f.sword.id), peer = viewOf(f.game,f.ally.id);
  assert(own.players.find(player => player.id === f.sword.id)?.kit.pursuit);
  assert.equal(peer.players.find(player => player.id === f.sword.id)?.kit.pursuit,undefined);
  assert(own.classCues.some(cue => cue.kind === 'sword-passing-cut' && cue.state === 'passing'));
  assert.deepEqual(peer.classCues,own.classCues);
});

test('Walls, a change of direction, and displaced footing fail to earn the cut', () => {
  const blocked = fixture();
  blocked.arena.obstacles.push({ x:532,y:450,width:20,height:100 });
  blocked.walk(0,22);
  assert(blocked.sword.x - start.x < pursuitRules.stride);
  assert(!blocked.tick(passing).includes('sword-pursuit-passing'));

  const turned = fixture();
  turned.walk(0,4);
  turned.walk(Math.PI / 2,4);
  assert(turned.status().stride < pursuitRules.stride);
  turned.earn(Math.PI / 2);
  turned.sword.x += 24;
  assert(!turned.tick({ ...passing, aim:Math.PI / 2 }).includes('sword-pursuit-passing'));
  assert.equal(turned.status().stride,0);

  const dashed = fixture();
  dashed.earn(0);
  assert(!dashed.tick({ ...passing, moveX:1, dodge:true }).includes('sword-pursuit-passing'));
  assert.equal(dashed.status().stride,0);
});

test('A cut spent against nearer cover cannot open either fitting', () => {
  const f = fixture('through');
  f.earn(0);
  const target = f.victim(84002,640,500);
  f.arena.obstacles.push({ x:600,y:440,width:8,height:120 });
  const ammo = f.sword.ammo;
  assert.deepEqual(f.tick(passing).filter(id => id.startsWith('sword-pursuit-')),['sword-pursuit-passing']);
  assert.equal(target.health,500);
  assert.equal(f.sword.ammo,ammo - 1);
  assert.equal(f.status().followUntil,0);
});

for (const [fitting, heading] of [['through',0],['cross',Math.PI / 2]] as const) {
  test(`${fitting} requires a new approach and spends exactly one more charge on a real cut`, () => {
    const f = fixture(fitting);
    const first = f.victim(84003,640,500), ammo = f.sword.ammo;
    f.earn(0);
    const opening = f.tick(passing);
    assert(opening.includes('sword-pursuit-passing') && opening.includes('sword-pursuit-open-' + fitting));
    assert(first.health < 500);
    const deadline = f.status().followUntil;
    assert.equal(deadline,f.game.combatTick + pursuitRules.followTicks);
    const visible = viewOf(f.game,f.ally.id).classCues.filter(cue => cue.kind === 'sword-passing-cut');
    const cut = visible.find(cue => cue.state === 'passing');
    const follow = visible.find(cue => cue.state === 'open-' + fitting);
    assert(cut && follow && cut.id !== follow.id && cut.at === follow.at && follow.until === deadline);
    assert.equal(f.status().followStride,0);
    assert(!f.tick(passing).includes('sword-pursuit-' + fitting));
    f.walk(fitting === 'through' ? Math.PI / 2 : 0,4);
    assert.equal(f.status().followStride,0);
    assert.equal(f.status().followUntil,deadline);
    const second = f.victim(84004, f.sword.x + Math.cos(heading) * 96, f.sword.y + Math.sin(heading) * 96);
    f.earn(heading,true);
    assert(f.tick({ ...passing, aim:heading, fire:true }).includes('sword-pursuit-' + fitting));
    assert(second.health < 500);
    assert.equal(f.sword.ammo,ammo - 2);
    assert.equal(f.status().followUntil,0);
    assert(!f.tick(passing).includes('sword-pursuit-' + fitting));
  });
}

test('An old footing window expires, and a Swordsman action chord spends neither resource', () => {
  const f = fixture(undefined,true);
  f.earn(0);
  for (let i = 0; i <= pursuitRules.idleTicks; i++) f.tick();
  assert.equal(f.status().stride,0);
  f.earn(0);
  const { ammo,qAt,eAt } = f.sword;
  const sounds = f.tick({ technique1:true, technique2:true, technique3:true });
  assert(!sounds.some(id => /^sword-(pursuit|held-edge|drawn-reply)/.test(id)));
  assert.deepEqual([f.sword.ammo,f.sword.qAt,f.sword.eAt],[ammo,qAt,eAt]);
  assert.equal(f.status().stride,0);
  f.tick({ e:true });
  assert(f.sword.eAt > eAt);
});
