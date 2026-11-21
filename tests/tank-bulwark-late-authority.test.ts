import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bulwarkIds } from '../src/shared/tank-bulwark.ts';
import { viewOf } from '../src/shared/view.ts';
import { fixture, wrap } from './helpers/tank-bulwark-fixture.ts';

test('Folded Setdown leaves both damaged Cornerstone panels with their original relative frame', () => {
  const f = fixture({ handling: 'pivot', talent: 'cornerstone', beforeStart: (_g, _p, buy) => buy(bulwarkIds.foldedSetdown) });
  const { g, p } = f;
  const kit = () => g.kitStatus(p.id);
  const before = f.panels();
  assert.equal(before.length, 2);
  assert(kit().bulwarkCanSet);
  assert(!kit().bulwarkCanSetFolded);
  // Put a small hazard well beyond the compact edge on one original panel.
  const panel = before.find(wall => wall.source === 'corner-1')!;
  g.arena.lavaPits.push({
    x: p.x + 32 * f.normal.x + 55 * f.side.x - 35 * Math.sin(panel.aim),
    y: p.y + 32 * f.normal.y + 55 * f.side.y + 35 * Math.cos(panel.aim),
    radius: 2,
  });
  f.access.classKits.hitConstruct(panel.id, 17);
  const damaged = f.panels();
  f.step();
  assert(kit().bulwarkCanSet && kit().bulwarkCanSetFolded);
  assert(!Object.hasOwn(viewOf(g, 'ally').players.find(actor => actor.id === p.id)!.kit, 'bulwarkCanSetFolded'));

  const events = f.step({ technique1: true });
  assert(events.some(event => event.type === 'sound' && event.id === 'tank-wall-set-folded' && event.owner === p.id));
  assert(!f.carried() && !kit().bulwarkCanLift);
  assert.deepEqual(f.panels(), damaged);
  assert(f.panels().every(wall => wall.halfSpan === 27.5));
  assert.equal(p.qAt, f.qAt);
  const ammo = p.ammo;
  f.step({ fire: true });
  assert.equal(p.ammo, ammo - 1);
  f.step({ technique1: true });
  assert(!f.carried());
  assert.deepEqual(f.panels(), damaged);
});

for (const direction of [-1, 1]) test('Side Port opens a clear slit on one of two Cornerstone panels toward ' + direction, () => {
  const f = fixture({ talent: 'cornerstone', beforeStart: (_g, _p, buy) => buy(bulwarkIds.sidePort) });
  const { g, p } = f;
  const kit = () => g.kitStatus(p.id);
  const desired = wrap(f.aim + direction * Math.PI * 32 / 180);
  f.open();
  const original = f.panels();
  assert.equal(original.length, 2);
  assert(original.every(wall => (wall.bulwarkPortHalfSpan ?? 0) > 0));
  f.step({ aim: wrap(f.aim + direction * Math.PI / 12) });
  assert(!kit().bulwarkCanShiftPort, 'A slit grazing the edge cannot shift');
  f.step({ aim: desired });
  assert(kit().bulwarkCanShiftPort);
  assert(!Object.hasOwn(viewOf(g, 'ally').players.find(actor => actor.id === p.id)!.kit, 'bulwarkCanShiftPort'));

  const events = f.step({ aim: desired, technique2: true });
  assert(events.some(event => event.type === 'sound' && event.id === 'tank-wall-port-shift' && event.owner === p.id));
  const deadline = g.combatTick + 6, ammo = p.ammo;
  assert.equal(kit().bulwarkPortPhase, 'shifting');
  assert.deepEqual(f.panels(), original);
  while (g.combatTick < deadline - 1) {
    f.step({ aim: desired, fire: true });
    assert.equal(p.ammo, ammo);
    assert.deepEqual(f.panels(), original);
  }
  f.step({ aim: desired });
  assert.equal(g.combatTick, deadline);
  assert.equal(kit().bulwarkPortPhase, 'open');
  assert(kit().bulwarkPrimaryReady && !kit().bulwarkCanShiftPort);
  const shifted = f.panels();
  for (let i = 0; i < original.length; i++) {
    const { id, aim, health, until, halfSpan } = original[i];
    const wall = shifted[i];
    assert.deepEqual([wall.id, wall.aim, wall.health, wall.until, wall.halfSpan], [id, aim, health, until, halfSpan]);
    if (wall.source === 'corner-' + direction) assert((wall.bulwarkPortHalfSpan ?? 0) > 0);
    else assert.equal(wall.bulwarkPortHalfSpan, undefined);
  }
  const fired = f.step({ aim: desired, fire: true });
  const rounds = fired.flatMap(event => event.type === 'shots' ? event.shots.filter(shot => shot.owner === p.id) : []);
  assert.equal(p.ammo, ammo - 1);
  assert(rounds.length);
  for (let i = 0; i < 4; i++) f.step({ aim: desired });
  assert(rounds.some(round => g.shots.has(round.id)));
  assert.equal(p.qAt, f.qAt);
});

test('destroying the shifted panel during its wind leaves the other panel solid', () => {
  const f = fixture({ talent: 'cornerstone', beforeStart: (_g, _p, buy) => buy(bulwarkIds.sidePort) });
  const desired = wrap(f.aim + Math.PI * 32 / 180);
  f.open();
  f.step({ aim: desired, technique2: true });
  assert.equal(f.g.kitStatus(f.p.id).bulwarkPortPhase, 'shifting');
  const lost = f.panels().find(wall => wall.source === 'corner-1')!;
  f.access.classKits.hitConstruct(lost.id, lost.health + 1);
  f.settle();
  const kit = f.g.kitStatus(f.p.id);
  assert(f.carried() && !kit.bulwarkPrimaryReady);
  assert.equal(kit.bulwarkPortPhase, 'closed');
  assert.equal(f.panels().length, 1);
  assert.equal(f.panels()[0].bulwarkPortHalfSpan, undefined);
});
