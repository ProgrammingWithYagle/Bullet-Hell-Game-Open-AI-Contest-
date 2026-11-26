import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { lamentIds, lamentRules, type LamentCue } from '../src/shared/bard-lament.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';

const action = { technique2:true };
const start = { x:500, y:500 };
const R = lamentRules;

function setup(fitting?: 'cross' | 'closing') {
  const game = new Game({ mode:'endless', seed:41, difficulty:'normal', arenaSelection:'fixed', openingArenaId:'gatehouse', maxPlayers:2 });
  if (fitting) game.encounter = 9;
  const bard = game.addPlayer('bard','Iven','bard');
  const ally = game.addPlayer('ally','Lane','soldier');
  const buy = (item: string) => game.transact(bard.id, { kind:'skill', item, id:item });
  assert(buy('bard-notecraft-1').ok && buy(lamentIds.entry).ok);
  if (fitting) {
    assert(buy(lamentIds[fitting]).ok);
    assert.equal(buy(lamentIds[fitting === 'cross' ? 'closing' : 'cross']).reason,'incompatibleItem');
  }
  assert(game.start());
  const arena = structuredClone(game.arena);
  arena.obstacles = [];
  arena.lavaPits = [];
  Object.defineProperty(game,'arena',{ get:() => arena });
  Object.assign(bard,start);
  Object.assign(ally,{ x:421, y:425 });
  Object.assign(game.boss,{ x:1320, y:720, staggerUntil:9000, deadline:9000 });
  function spawn(id: number, x: number, y: number) {
    const target = game.minions.spawn(id,{ kind:'ordinary', x,y,health:2000,speed:0,radius:15,damage:0 },game.combatTick);
    assert(target);
    return target;
  }
  const hostile = spawn(990001,716,500);
  const history: string[] = [];
  function tick(input: Partial<InputFrame> = {}) {
    if (bard.connected) assert(game.submitInput(bard.id,{ ...idleInput(),aim:0,sequence:bard.ack+1,clientTick:game.combatTick,...input }));
    game.step();
    const sounds = game.drainEvents().flatMap(e => e.type==='sound' && e.owner===bard.id ? [e.id] : []);
    history.push(...sounds);
    return sounds;
  }
  const meter = () => game.kitStatus(bard.id).cadence ?? 0;
  function earn() {
    for (let i=0;i<80 && meter()<R.cadence;i++) tick({fire:true});
    assert(meter() >= R.cadence);
    for (let i=0;i<18;i++) tick();
  }
  const status = () => game.kitStatus(bard.id).lamenting;
  const line = () => game.classCues().find((cue): cue is LamentCue => cue.kind==='bard-lament-line');
  const operations = (id: string) => history.filter(note=>note===`bard-lament-${id}`).length;
  function deliver(number: number, aim = 0) {
    for (let i=0;i<R.firstBeat + (R.beats+1)*R.interval && operations('pulse')<number;i++) tick({ aim,fire:true });
    assert.equal(operations('pulse'),number);
  }
  return { game,bard,ally,arena,hostile,spawn,history,tick,meter,earn,status,line,operations,deliver };
}

test('Mourning Measure spends two real cadence and the issued Cut In recovery for five bounded pulses',()=>{
  const f = setup(), issued = setup();
  assert(!f.tick(action).includes('bard-lament-start'));
  issued.tick();
  f.earn(); issued.earn();
  const charged = f.meter(), ammo = f.bard.ammo, before = f.hostile.health;
  assert(f.status()?.ready);
  assert(f.tick({ ...action,fire:true }).includes('bard-lament-start'));
  assert(issued.tick({e:true}).includes('bard-cut'));
  assert.equal(f.bard.eAt,issued.bard.eAt);
  assert.equal(f.meter(),charged-R.cadence);
  const paid = f.bard.eAt;
  assert(f.line()?.kind==='bard-lament-line');
  assert(f.game.kitStatus(f.bard.id).lamenting?.phase==='sustain');
  f.deliver(R.beats);
  assert.equal(f.bard.ammo,ammo);
  assert.equal(f.bard.eAt,paid);
  assert(!f.line());
  assert.equal(f.status()?.phase,'idle');
  assert(f.hostile.health < before);
  assert.equal(f.operations('chord'),0);
  f.tick({fire:true});
  assert(f.bard.ammo < ammo || f.bard.reloadAt>0);
});

test('Masonry blocks unpaid placement and closes a paid lane without replacing the owed recovery',()=>{
  const f=setup();
  f.earn();
  f.arena.obstacles.push({ x:560, y:430, width:30, height:140 });
  const cadence=f.meter();
  f.tick(action);
  assert.equal(f.meter(),cadence);
  assert.equal(f.bard.eAt,0);
  assert.equal(f.operations('start'),0);
  f.arena.obstacles.length=0;
  f.tick(action);
  const paid=f.bard.eAt;
  f.arena.obstacles.push({ x:560, y:430, width:30, height:140 });
  for(let i=0;i<R.firstBeat+2;i++)f.tick();
  assert.equal(f.operations('end'),1);
  assert.equal(f.operations('pulse'),0);
  assert.equal(f.bard.eAt,paid);
});

test('Cross Verse turns the same lane after the first pulse and spends one beat without extending the window',()=>{
  const f=setup('cross'), second=f.spawn(990002,645,650);
  f.earn();
  f.tick(action);
  const first=f.line()!;
  f.deliver(1);
  const paid=f.bard.eAt, afterFirst=f.hostile.health;
  assert(f.tick({ ...action,aim:.8 }).includes('bard-lament-turn'));
  const turned=f.line()!;
  assert.deepEqual([turned.id,turned.x,turned.y,turned.until],[first.id,first.x,first.y,first.until]);
  assert(turned.kind==='bard-lament-line' && turned.turned && turned.y2>first.y2);
  f.deliver(R.beats-1,.8);
  assert.equal(f.operations('turn'),1);
  assert.equal(f.bard.eAt,paid);
  assert.equal(f.hostile.health,afterFirst);
  assert(second.health<second.maxHealth);
  assert(!f.line());
});

test('Closing Chord requires two damaging beats and gives up all remaining pulses for a single endpoint hit',()=>{
  const f=setup('closing'), second=f.spawn(990002,start.x+R.reach,start.y+54);
  f.earn();
  const healthy=second.health;
  f.tick(action);
  f.deliver(R.chordProof);
  assert.equal(second.health,healthy);
  assert(f.status()?.closing);
  const paid=f.bard.eAt;
  const cue = f.line()!;
  assert(f.tick(action).includes('bard-lament-chord'));
  const chord = f.game.classCues().find((row): row is LamentCue => row.kind==='bard-lament-chord');
  assert(chord && chord.x2===cue.x2&&chord.y2===cue.y2);
  assert(second.health<healthy);
  for(let i=0;i<R.beats*R.interval;i++)f.tick();
  assert.equal(f.operations('pulse'),R.chordProof);
  assert.equal(f.operations('chord'),1);
  assert.equal(f.bard.eAt,paid);
  assert(!f.line());
});

test('Empty pulses never pay for Closing Chord, and ordinary Q interrupts while keeping its own behavior',()=>{
  const f=setup('closing');
  f.earn();
  Object.assign(f.hostile,{x:746,y:628,oldX:746,oldY:628});
  f.tick(action);
  f.deliver(R.chordProof);
  assert.equal(f.status()?.contacts,0);
  assert(!f.status()?.closing);
  assert(f.tick({q:true}).includes('bard-phrase-0'));
  assert.equal(f.operations('end'),1);
  assert.equal(f.operations('chord'),0);
  assert(!f.line());
});

test('The shared lane has private posture details and disconnect removes it immediately',()=>{
  const f=setup();
  f.earn();
  f.tick(action);
  const publicView=viewOf(f.game,f.ally.id);
  assert.equal(publicView.players.find(row=>row.id===f.bard.id)?.kit.lamenting,undefined);
  assert(publicView.classCues.some(cue=>cue.kind==='bard-lament-line'));
  f.game.setConnected(f.bard.id,false);
  assert(!f.line());
});
