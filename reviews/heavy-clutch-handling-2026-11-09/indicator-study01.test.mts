import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './game-fixture02.mts';
import { handlingIndicator } from './handling-indicator01.mts';
import { keyedId, openId, clutchId, traverseIds } from './handling-candidate01.mts';
import { viewOf } from '../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/view.ts';

test('the short owner marker follows actual stored barrel bearing and never the other Q aim or an invented future shot', () => {
  for (const mode of ['loose', 'spade', 'floating'] as const) for (const handling of [keyedId, openId]) {
    const f = fixture(mode, handling);
    f.step({ technique1: true });
    let view = viewOf(f.g, f.p.id);
    assert.equal(handlingIndicator(view.players, f.p.id, view.phase, view.combatTick), undefined);
    f.step({ technique2: true });
    f.step({ aim: 0.6 });
    view = viewOf(f.g, f.p.id);
    const before = structuredClone(view);
    const lifted = handlingIndicator(view.players, f.p.id, view.phase, view.combatTick)!;
    assert.equal(lifted.state, handling === keyedId ? 'calibrating' : 'open');
    assert.equal(lifted.bearing, f.status().heavyTraverseAim);
    f.step({ technique2: true, aim: 0.6 });
    while (f.g.combatTick < 10) f.step();
    f.step({ q: true, aim: Math.PI });
    view = viewOf(f.g, f.p.id);
    const cue = handlingIndicator(view.players, f.p.id, view.phase, view.combatTick)!;
    assert.equal(cue.state, handling === keyedId ? 'keyed' : 'engaged');
    assert.equal(cue.bearing, f.status().heavyTraverseAim);
    assert.notEqual(cue.bearing, f.p.aim);
    for (const line of cue.lines) for (const point of line) assert(Math.hypot(point.x - f.p.x, point.y - f.p.y) <= 28.000001);
    assert(f.special().some(s => s.admittedAt === 11));
    assert.equal(f.shots.filter(s => s.admittedAt === 11).length, 15); // Actual Q14 and actual C1.
    assert.equal(f.p.ammo, 43); // Q keeps its issued independent recovery, not a C/primary round.
    assert.equal(f.conversions.length, 0);
    assert.deepEqual(before.players.find(p => p.id === f.p.id)!.kit.heavyTraverseUntil, 32);
  }
});
test('the marker uses localId, remains absent for a non-owner or stale scope, and never mutates received player state', () => {
  const f = fixture('floating', keyedId);
  f.step({ technique1: true }); f.step({ technique2: true });
  const view = viewOf(f.g, f.ally.id), before = structuredClone(view);
  assert(handlingIndicator(view.players, f.p.id, view.phase, view.combatTick));
  assert.equal(handlingIndicator(view.players, f.ally.id, view.phase, view.combatTick), undefined);
  assert.equal(handlingIndicator(view.players, 'late-peer', view.phase, view.combatTick), undefined);
  for (const phase of ['lobby', 'shop', 'loading', 'victory', 'defeat']) assert.equal(handlingIndicator(view.players, f.p.id, phase, view.combatTick), undefined);
  assert.equal(handlingIndicator(view.players, f.p.id, view.phase, 32), undefined);
  assert.deepEqual(view, before);
});
test('required ownership, connected body and finite authority guards hide stale geometry without any cleanup history', () => {
  for (const handling of [keyedId, openId]) {
    const f = fixture('spade', handling);
    f.step({ technique1: true }); f.step({ technique2: true });
    const view = viewOf(f.g, f.p.id);
    for (const id of [handling, clutchId, traverseIds.entry, traverseIds.spade]) {
      const players = structuredClone(view.players);
      players[0].skills = players[0].skills.filter(s => s !== id);
      assert.equal(handlingIndicator(players, f.p.id, view.phase, view.combatTick), undefined);
    }
    for (const change of [{ connected: false }, { status: 'downed' }, { health: 0 }, { x: NaN }, { y: Infinity }]) {
      const players = structuredClone(view.players); Object.assign(players[0], change);
      assert.equal(handlingIndicator(players, f.p.id, view.phase, view.combatTick), undefined);
    }
    const players = structuredClone(view.players); players[0].kit.heavyTraverseAim = NaN;
    assert.equal(handlingIndicator(players, f.p.id, view.phase, view.combatTick), undefined);
  }
});
