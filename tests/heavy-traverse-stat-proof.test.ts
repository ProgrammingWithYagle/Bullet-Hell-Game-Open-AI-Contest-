import test from 'node:test';
import assert from 'node:assert/strict';
import { statAdapter } from './helpers/heavy-stat-proof-fixture.ts';
import { heavyClutchOperation } from './helpers/heavy-clutch-flow.ts';
import { heavyTraverseFlow } from './helpers/heavy-traverse-flow.ts';
import { heavyTraverseRules as rules } from '../src/shared/heavy-traverse.ts';
for (const mode of ['loose', 'spade', 'floating'] as const) {
  for (const mutation of ['lifeline', 'iron-rain'] as const)
    test('real Clutch operation preserves exact reduced stat-scaled physical damage and paid slots: ' + mode + '/' + mutation, async () => {
      const f = statAdapter(mode, 'clutch', mutation);
      try {
        await f.prepareClutch();
        const expected = rules.damage * f.g.stats(f.p).damage;
        assert(expected > 0 && expected < rules.damage);
        const result = await heavyClutchOperation(f.adapter, mode);
        assert(result.shots.every(s => Math.abs(s.damage - expected) < 1e-9));
        assert.equal(result.actualPaidRounds + result.actualForfeitedSlots, 4);
        assert(result.actualHostExit);
        assert.deepEqual(result.statContextAtStrokeStart.mutations, [{ id: mutation, remaining: 2 }]);
      } finally { f.dispose(); }
    });
  test('real entry operation preserves four separate reduced-damage rounds and physical host cleanup: ' + mode, async () => {
    const f = statAdapter(mode, 'entry', 'iron-rain');
    try {
      const result = await heavyTraverseFlow(f.adapter, mode);
      const expected = rules.damage * f.g.stats(f.p).damage;
      assert(expected > 0 && expected < rules.damage);
      assert.equal(result.shots.length, 4);
      assert(result.shots.every(s => Math.abs(s.damage - expected) < 1e-9));
      assert.deepEqual(result.actualAdmissionTicks.map(t => t - result.actualAdmissionTicks[0]), [0, 10, 20, 30]);
      assert(result.actualHostExit);
      assert.deepEqual(result.statContextAtStrokeStart.mutations, [{ id: 'iron-rain', remaining: 2 }]);
    } finally { f.dispose(); }
  });
}
