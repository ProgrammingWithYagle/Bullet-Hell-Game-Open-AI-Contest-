import { segmentRect, segmentCircle } from '../src/shared/geometry.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import { idleInput } from '../src/shared/protocol.ts';
import { constructHit } from '../src/shared/class-kits.ts';
import { lineworkGeometry } from './helpers/heavy-linework-fixture.ts';
/** Controlled party placement isolates real issued bodies/constructs. No natural-run claim. */
function party() {
  const g: any = new Game({
      mode: 'short',
      difficulty: 'normal',
      seed: 41,
      maxPlayers: 3,
      openingArenaId: 'gatehouse',
      arenaSelection: 'fixed',
    }),
    h = g.addPlayer('heavy', 'Controlled Lineworker', 'heavy'),
    e = g.addPlayer('engineer', 'Controlled wall owner', 'engineer'),
    s = g.addPlayer('summoner', 'Controlled companion owner', 'summoner');
  for (const item of ['heavy-ordnance-1', 'heavy-linework-1'])
    assert(g.transact(h.id, { id: item, kind: 'skill', item }).ok);
  assert(g.start());
  Object.defineProperty(g, 'arena', { value: structuredClone(g.arena) });
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  const target = lineworkGeometry.example.anchor,
    aim = Math.atan2(target.y - h.y, target.x - h.x),
    sequence = new Map<string, number>(),
    events: any[] = [];
  const step = (heavy: any = {}, engineer: any = {}, summoner: any = {}) => {
    for (const [p, props] of [
      [h, heavy],
      [e, engineer],
      [s, summoner],
    ]) {
      const n = (sequence.get(p.id) ?? 0) + 1;
      sequence.set(p.id, n);
      assert(
        g.submitInput(p.id, {
          ...idleInput(),
          aim: p === h ? aim : p.aim,
          ...props,
          sequence: n,
          clientTick: g.combatTick,
        }),
      );
    }
    g.step();
    events.push(...g.drainEvents());
  };
  const status = () => g.linework.status(h, g.combatTick),
    midpoint = () => ({ x: h.x + (target.x - h.x) * 0.45, y: h.y + (target.y - h.y) * 0.45 });
  const wall = () => {
    let placement: any;
    for (const fraction of [0.25, 0.4, 0.55, 0.7])
      for (const bearing of [0, Math.PI / 2, Math.PI, -Math.PI / 2, aim, aim + Math.PI / 2]) {
        const mid = { x: h.x + (target.x - h.x) * fraction, y: h.y + (target.y - h.y) * fraction },
          point = { x: mid.x - Math.cos(bearing) * 100, y: mid.y - Math.sin(bearing) * 100 },
          bounds = g.arena.bounds;
        if (
          point.x < bounds.x + 20 ||
          point.y < bounds.y + 20 ||
          point.x > bounds.x + bounds.width - 20 ||
          point.y > bounds.y + bounds.height - 20 ||
          g.obstacles.some((r: any) => segmentRect(point, point, r, 20) !== null) ||
          segmentCircle(h, target, point, 12) !== null
        )
          continue;
        const actualPoint = g.classKits.point(
          { ...e, ...point, aim: bearing },
          100,
          g.kitContext(),
        );
        if (
          constructHit(
            h,
            target,
            { ...actualPoint, kind: 'wall', aim: bearing, radius: 110, halfSpan: 110 } as any,
            3,
          ) !== null
        ) {
          placement = { ...point, aim: bearing };
          break;
        }
      }
    assert(placement, 'A legal controlled actual-E wall approach must exist');
    e.x = placement.x;
    e.y = placement.y;
    e.aim = placement.aim;
    step({}, { e: true, aim: placement.aim });
    assert(e.eAt > g.combatTick, 'The actual issued E must be admitted');
    const body = g.classKits.constructs().find((b: any) => b.owner === e.id && b.kind === 'wall');
    assert(body);
    assert(
      constructHit(h, target, body, 3) !== null,
      'Actual issued wall must cross the paid anchor ray',
    );
    assert.equal(
      segmentCircle(h, target, e, 12),
      null,
      'Wall owner must stay off the tested anchor ray',
    );
    return body;
  };
  return { g, h, e, s, target, aim, step, status, wall, midpoint, events };
}
test('an actual issued Engineer wall consumes the paid anchor without attachment, damage or a refund', () => {
  const f = party(),
    body = f.wall(),
    health = body.health;
  f.step({ technique1: true });
  const paidAt = f.g.combatTick;
  for (let n = 0; n < 24; n++) f.step();
  assert.equal(f.status().lineworkUntil, 0);
  assert.equal(f.status().lineworkFlight, 0);
  assert.equal(body.health, health);
  assert.equal(f.h.ammo, 44);
  assert.equal(f.status().lineworkRecovery, paidAt + 240);
  assert.equal(f.h.damageDealt, 0);
});
test('a newly issued Engineer wall across an existing lead severs dependent work without harming the wall', () => {
  const f = party();
  f.step({ technique1: true });
  for (let n = 0; n < 20 && !f.status().lineworkUntil; n++) f.step();
  assert(f.status().lineworkUntil);
  const recovery = f.status().lineworkRecovery,
    body = f.wall();
  assert.equal(f.status().lineworkUntil, 0);
  assert.equal(body.health, body.maxHealth);
  assert.equal(f.h.ammo, 44);
  assert.equal(f.status().lineworkRecovery, recovery);
});
test('an active teammate body consumes a physical anchor without damage, attachment or authority transfer', () => {
  const f = party(),
    mid = f.midpoint();
  f.e.x = mid.x;
  f.e.y = mid.y;
  const health = f.e.health,
    shield = f.e.shield;
  f.step({ technique1: true });
  for (let n = 0; n < 24; n++) f.step();
  assert.equal(f.status().lineworkUntil, 0);
  assert.equal(f.status().lineworkFlight, 0);
  assert.equal(f.e.health, health);
  assert.equal(f.e.shield, shield);
  assert.equal(f.h.ammo, 44);
  assert.equal(f.h.damageDealt, 0);
});
test('an actual summoned living companion stops the paid anchor without damage or becoming an attachment', () => {
  const f = party();
  f.step({}, {}, { q: true });
  for (let n = 0; n < 30 && !f.g.retinue.entities.size; n++) f.step();
  const body = [...f.g.retinue.entities.values()][0] as any;
  assert(body, 'Actual issued Summoner Q must create a living companion');
  const health = body.health;
  body.x = f.h.x + Math.cos(f.aim) * 26;
  body.y = f.h.y + Math.sin(f.aim) * 26;
  f.step({ technique1: true });
  for (let n = 0; n < 24; n++) f.step();
  assert.equal(f.status().lineworkUntil, 0);
  assert.equal(f.status().lineworkFlight, 0);
  assert.equal(body.health, health);
  assert.equal(f.h.ammo, 44);
  assert.equal(f.h.damageDealt, 0);
});
