import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ServiceDirector,
  serviceBeamContact,
  serviceRingContact,
  serviceMovement,
  type ServiceCue,
  type ServiceAttack,
} from '../src/shared/service-director.ts';
import type { SignatureContext } from '../src/shared/boss-director.ts';
import { Game, data } from '../src/shared/game.ts';
import { HZ, idleInput, type BossId } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { Prediction } from '../src/client/prediction.ts';
function fixture(id: BossId, brutal = false) {
  const director = new ServiceDirector();
  director.reset(id, true);
  let serial = 1;
  const hurt: { id: string; amount: number }[] = [],
    spawned: unknown[] = [],
    shots: { angle: number; speed: number; damage: number }[] = [],
    heals: { id: string; amount: number }[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: id,
    boss: { x: 800, y: 250 },
    bossMaximumHealth: 1000,
    radius: 58,
    targets: [
      { id: 'a', x: 800, y: 700, oldX: 800, oldY: 700 },
      { id: 'b', x: 1250, y: 700, oldX: 1250, oldY: 700 },
    ],
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    damageScale: brutal ? 2 : 1,
    brutal,
    phase: 0,
    id: () => serial++,
    damage: (id, amount) => hurt.push({ id, amount }),
    spawnRat: () => {},
    spawnOrdinary: (...args) => spawned.push(args),
    emitHostile: (_p, angle, speed, damage) => shots.push({ angle, speed, damage }),
    restore: (id, amount) => heals.push({ id, amount }),
    interactors: [],
  };
  const attack = data.bosses.find((b) => b.id === id)!.phases[0].attacks[0] as ServiceAttack;
  const cast = () => director.cast(c, c.targets[0], attack),
    step = (tick: number) => {
      c.tick = tick;
      director.step(c);
    };
  return { director, c, hurt, spawned, shots, heals, attack, cast, step };
}
const of = <K extends ServiceCue['kind']>(d: ServiceDirector, kind: K) =>
  d.cues().filter((c): c is Extract<ServiceCue, { kind: K }> => c.kind === kind);
test('Matron nests obey their tell, summon bounded real packs and stop permanently when destroyed', () => {
  const f = fixture('matron');
  assert(f.cast());
  const nest = of(f.director, 'service-prop')[0];
  assert.equal(nest.health, 100);
  assert.equal(f.spawned.length, 0);
  for(let tick=1;tick<nest.at;tick++)f.step(tick);
  assert.equal(f.spawned.length, 0);
  f.step(nest.at);
  assert.equal(f.spawned.length, 2);
  assert.equal(f.director.hit(nest.id, 1000, f.c.tick), 100);
  f.step(nest.at + 6 * HZ);
  assert.equal(f.spawned.length, 2);
  assert.equal(f.director.weakPoints().length, 0);
  const brutal = fixture('matron', true);
  brutal.cast();
  assert.equal(of(brutal.director, 'service-prop')[0].health, 200);
});
test('Alchemist reagent flasks lock full landing warnings before actual harmful pools become active', () => {
  const f=fixture('alchemist');f.cast();const flask=f.director.cues().find(q=>q.kind==='mold-flask');assert(flask&&flask.kind==='mold-flask');
  Object.assign(f.c.targets[0],{x:flask.x,y:flask.y,oldX:flask.x,oldY:flask.y});
  assert.equal(flask.at-flask.beganAt,42);f.step(flask.at-1);assert.equal(f.hurt.length,0);assert.equal(serviceMovement(f.director.cues(),flask,'a',flask.at-1).multiplier,1);
  f.step(flask.at);const pool=f.director.cues().find(q=>q.kind==='mold-pool');assert(pool&&pool.kind==='mold-pool');assert(f.hurt.some(h=>h.id==='a'));assert.equal(serviceMovement(f.director.cues(),pool,'a',pool.at).multiplier,.65);
  f.c.targets[0].x=100;f.step(pool.at+1);const held=f.director.cues().find(q=>q.id===pool.id);assert(held&&held.kind==='mold-pool');assert.equal(held.x,pool.x);
});

test('Bellringer rings have a real rotating 35-degree gap, swept radial contact and no tell damage', () => {
  const f = fixture('bellringer');
  f.cast();
  let ring = of(f.director, 'service-ring')[0];
  f.step(ring.at - 1);
  assert.equal(f.hurt.length, 0);
  assert(
    !serviceRingContact(
      { x: 930, y: 250 },
      { x: 930, y: 250 },
      { ...ring, oldRadius: 120, radius: 140 },
    ),
  );
  assert(
    serviceRingContact(
      { x: 670, y: 250 },
      { x: 670, y: 250 },
      { ...ring, oldRadius: 120, radius: 140 },
    ),
  );
  assert(
    serviceRingContact(
      { x: 800, y: 20 },
      { x: 800, y: 600 },
      { ...ring, oldRadius: 130, radius: 130 },
    ),
  );
  f.c.tick = 200;
  f.cast();
  ring = of(f.director, 'service-ring')[1];
  assert.equal(ring.gapAngle, Math.PI / 6);
  assert.equal(ring.gap, (35 * Math.PI) / 180);
});
test('Stitchwright has destructible tethers, a one-second neutral rescue and a dodgeable attachment', () => {
  const f = fixture('stitchwright');
  f.cast();
  const tether = of(f.director, 'service-tether')[0];
  f.step(tether.at);
  assert(of(f.director, 'service-tether')[0].attached);
  assert.equal(f.director.movement(f.c.targets[0], 'a', tether.at).multiplier, 0.5);
  f.c.targets[0].x = tether.x;
  f.c.targets[0].y = tether.y;
  f.c.interactors = ['a'];
  for (let tick = tether.at + 1; tick <= tether.at + HZ; tick++) f.step(tick);
  assert.equal(of(f.director, 'service-tether').length, 0);
  const shot = fixture('stitchwright');
  shot.cast();
  const peg = of(shot.director, 'service-tether')[0];
  assert.equal(shot.director.hit(peg.id, 999, 1), 45);
  shot.step(peg.at);
  assert.equal(shot.hurt.length, 0);
  const missed = fixture('stitchwright');
  missed.cast();
  missed.c.targets[0].x += 200;
  missed.step(30);
  assert.equal(of(missed.director, 'service-tether').length, 0);
  assert.equal(missed.hurt.length, 0);
});
test('Glass Surgeon leaves an actual missing edge and breaking one needle cancels only its connected sides', () => {
  const f = fixture('glass-surgeon');
  f.cast();
  const needles = of(f.director, 'service-prop'),
    beams = of(f.director, 'service-beam');
  assert.equal(needles.length, 4);
  assert.equal(beams.length, 3);
  const midpoint = { x: (needles[0].x + needles[1].x) / 2, y: (needles[0].y + needles[1].y) / 2 };
  assert(beams.every((b) => !serviceBeamContact(midpoint, midpoint, b)));
  assert.equal(f.director.hit(needles[2].id, 999, 1), 35);
  assert.equal(of(f.director, 'service-beam').filter((b) => !b.disabled).length, 1);
  assert(
    serviceBeamContact(
      { x: 10, y: -100 },
      { x: 10, y: 100 },
      { x1: 0, y1: 0, x2: 100, y2: 0, width: 14 },
    ),
  );
});
test('Ash Baker loaves split exactly once into two real crumbs per loaf and show their split directions first', () => {
  const f = fixture('ash-baker', true);
  f.cast();
  const loaves = of(f.director, 'service-loaf');
  assert.equal(loaves.length, 3);
  assert(loaves.every((l) => l.splitAt > l.at));
  f.step(loaves[0].at - 1);
  assert.equal(f.shots.length, 0);
  f.step(loaves[0].splitAt);
  assert.equal(f.shots.length, 6);
  assert(f.shots.every((s) => s.speed === 165 && s.damage === 18));
  f.step(loaves[0].splitAt + 1);
  assert.equal(f.shots.length, 6);
  assert.equal(of(f.director, 'service-loaf').length, 0);
});
test('Sluice currents push without damage and prediction uses exactly the same force and dry strips', () => {
  const f = fixture('sluice-keeper');
  f.cast();
  const current = of(f.director, 'service-current')[0];
  assert.equal(f.director.movement({ x: 800, y: current.y + 95 }, 'a', current.at - 1).x, 0);
  assert.equal(Math.abs(f.director.movement({ x: 800, y: current.y + 95 }, 'a', current.at).x), 65);
  assert.equal(f.director.movement({ x: 800, y: 100 }, 'a', current.at).x, 0);
  f.step(current.at);
  assert.equal(f.hurt.length, 0);
  const g = new Game({ openingBossId: 'sluice-keeper' }),
    p = g.addPlayer('p', 'Mara', 'soldier');
  g.start();
  p.invulnerableUntil = 1e9;
  for (let i = 0; i < 65; i++) g.step();
  assert(g.director.cues().some((c) => c.kind === 'service-current'));
  p.y = 500;
  p.x = 800;
  const prediction = new Prediction();
  prediction.acknowledge(viewOf(g, 'p'), 'p');
  for (let i = 1; i <= 100; i++) {
    const input = { ...idleInput(), sequence: i, moveX: 1, moveY: 0.3 };
    prediction.submit(input, viewOf(g, 'p'));
    g.submitInput('p', input);
    g.step();
    assert(Math.abs(prediction.player!.x - p.x) < 1e-6);
    assert(Math.abs(prediction.player!.y - p.y) < 1e-6);
  }
});
test('Stationmaster alternates two distinct signals and swept trains never hit the open track', () => {
  const f = fixture('stationmaster');
  f.cast();
  const rails = of(f.director, 'service-rail'),
    closed = rails.find((r) => !r.open)!,
    open = rails.find((r) => r.open)!;
  f.c.targets[0].x = closed.x;
  f.c.targets[0].oldX = closed.x;
  f.c.targets[0].y = 50;
  f.c.targets[0].oldY = 50;
  f.c.targets[1].x = open.x;
  f.c.targets[1].oldX = open.x;
  f.c.targets[1].y = 50;
  f.c.targets[1].oldY = 50;
  f.step(closed.at - 1);
  assert.equal(f.hurt.length, 0);
  f.step(closed.at + 24);
  assert.deepEqual(
    f.hurt.map((h) => h.id),
    ['a'],
  );
  f.c.tick = 500;
  f.cast();
  assert.equal(
    of(f.director, 'service-rail')
      .filter((r) => !r.open)
      .at(-1)!.x,
    open.x,
  );
});
test('Lamplighter protects three outlined pockets during its pulse and preserves tell safety', () => {
  const f = fixture('lamplighter');
  f.cast();
  const safe = of(f.director, 'service-sanctuary')[0];
  f.c.targets[0].x = safe.ends[0].x;
  f.c.targets[0].y = safe.ends[0].y;
  f.c.targets[1].x = 100;
  f.c.targets[1].y = 100;
  f.step(safe.at - 1);
  assert.equal(f.hurt.length, 0);
  f.step(safe.at);
  assert.deepEqual(
    f.hurt.map((h) => h.id),
    ['b'],
  );
  assert.equal(of(f.director, 'service-sanctuary')[0].pads.length, 3);
});
test('Anatomist tracks only for 0.7 seconds, then keeps two fixed caliper marks until release', () => {
  const f = fixture('anatomist');
  f.cast();
  assert.equal(of(f.director, 'service-caliper').length, 2);
  f.c.targets[0].x = 900;
  f.step(20);
  assert.equal(of(f.director, 'service-caliper')[0].x, 900);
  f.c.targets[0].x = 1100;
  f.step(21);
  assert.equal(of(f.director, 'service-caliper')[0].x, 1100);
  f.c.targets[0].x = 1500;
  f.step(22);
  assert.equal(of(f.director, 'service-caliper')[0].x, 1100);
  f.c.targets[0].oldX = f.c.targets[0].x;
  f.step(47);
  assert.equal(f.hurt.length, 0);
  f.step(48);
  assert(!f.hurt.some((h) => h.id === 'a'));
  assert(f.hurt.some((h) => h.id === 'b'));
});
test('Gardener roots can be cut early into a restorative strip without canceling the other vines', () => {
  const f = fixture('plague-gardener');
  f.cast();
  const roots = of(f.director, 'service-prop'),
    root = roots[2],
    beam = of(f.director, 'service-beam').find((b) => b.dependencies.includes(root.id))!;
  f.c.targets[0].x = (beam.x1 + beam.x2) / 2;
  f.c.targets[0].y = (beam.y1 + beam.y2) / 2;
  f.c.targets[0].oldX = f.c.targets[0].x;
  f.c.targets[0].oldY = f.c.targets[0].y;
  f.c.tick = beam.at;
  assert.equal(f.director.hit(root.id, 999, f.c.tick), 70);
  f.step(beam.at);
  assert.deepEqual(f.heals, [{ id: 'a', amount: 10 }]);
  f.step(beam.at + 1);
  assert.equal(f.heals.length, 1);
  assert.equal(of(f.director, 'service-beam').filter((b) => b.cutAt === 0).length, 2);
});
test('Choir casters have separate health and ordered locked beams; one defeated singer cancels only its own release', () => {
  const f = fixture('choir');
  f.cast();
  const casters = of(f.director, 'service-prop'),
    beams = of(f.director, 'service-beam');
  assert.equal(casters.length, 3);
  assert(casters.every((c) => c.health === 340));
  assert.deepEqual(
    beams.map((b) => b.at),
    [39, 53, 66],
  );
  assert(f.director.transfersDamage(casters[0].id));
  f.director.hit(casters[0].id, 1000, 1);
  assert.equal(of(f.director, 'service-beam').filter((b) => !b.disabled).length, 2);
  const health = casters[1].health;
  f.director.hit(casters[1].id, 50, 2);
  f.director.reset('choir');
  assert.equal(f.director.weakPoints().find((c) => c.id === casters[1].id)!.health, health - 50);
});
test('Abbess moves two sanctuaries during the tell and any survivor can neutralize the incoming wave', () => {
  const f = fixture('red-abbess');
  f.cast();
  let safe = of(f.director, 'service-sanctuary')[0];
  const initial = safe.pads[0].x;
  f.step(safe.at - 1);
  safe = of(f.director, 'service-sanctuary')[0];
  assert.notEqual(safe.pads[0].x, initial);
  assert.equal(f.hurt.length, 0);
  f.c.targets[0].x = safe.ends[0].x;
  f.c.targets[0].y = safe.ends[0].y;
  for (let t = safe.at; t < safe.at + 36; t++) f.step(t);
  assert(of(f.director, 'service-sanctuary')[0].neutralized);
});
test('Judge damages only its announced half, includes fast crossings and alternates the open half next cast', () => {
  const f = fixture('vesper-judge');
  f.cast();
  const verdict = of(f.director, 'service-verdict')[0];
  f.c.targets[0].x = 400;
  f.c.targets[0].oldX = 400;
  f.c.targets[1].x = 1200;
  f.c.targets[1].oldX = 1200;
  f.step(verdict.at - 1);
  assert.equal(f.hurt.length, 0);
  f.step(verdict.at);
  assert.deepEqual(
    f.hurt.map((h) => h.id),
    ['a'],
  );
  f.step(verdict.at + 1);
  assert.equal(f.hurt.length, 1);
  f.c.tick = 500;
  f.cast();
  assert.equal(of(f.director, 'service-verdict').at(-1)!.side, 1);
});
test('timed spiral emitters create a sequence of actual projectiles, not fallback pools', () => {
  const f = fixture('bellringer');
  assert(
    f.director.supplement(f.c, f.c.targets[0], {
      kind: 'spiral',
      count: 12,
      speed: 150,
      damage: 11,
      telegraph: 1,
    }),
  );
  f.step(29);
  assert.equal(f.shots.length, 0);
  f.step(30);
  assert.equal(f.shots.length, 1);
  f.step(54);
  assert.equal(f.shots.length, 12);
  assert.equal(new Set(f.shots.map((s) => s.angle)).size, 12);
});
