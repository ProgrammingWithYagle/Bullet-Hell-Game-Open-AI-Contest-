import fs from 'node:fs';
import assert from 'node:assert/strict';
import { statAdapter } from './stat-adapter01.mts';
import { heavyClutchOperation } from '../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/tests/helpers/heavy-clutch-flow.ts';
import { heavyTraverseFlow } from '../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/tests/helpers/heavy-traverse-flow.ts';
import { heavyTraverseRules as rules } from '../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/heavy-traverse.ts';
const rows = [];
for (const operation of ['clutch', 'entry'] as const) {
  const f = statAdapter('floating', operation, 'iron-rain');
  try {
    if (operation === 'clutch') await f.prepareClutch();
    const expectedDamage = () => rules.damage * f.g.stats(f.p).damage;
    let failure: unknown;
    try { await (operation === 'clutch' ? heavyClutchOperation(f.adapter, 'floating') : heavyTraverseFlow(f.adapter, 'floating')); } catch (e) { failure = e; }
    assert(failure instanceof assert.AssertionError && /damage\s*>=/.test(failure.message));
    const shots = f.adapter.events.flatMap(e => e.type === 'shots' ? e.shots : []).filter(s => s.owner === f.p.id);
    assert(shots.length > 0 && shots.every(s => s.damage > 0 && s.damage < rules.damage && Math.abs(s.damage - expectedDamage()) < 1e-9));
    rows.push({ operation, mutation: 'iron-rain', actualBaseDamage: rules.damage, actualDamageMultiplier: f.g.stats(f.p).damage, actualShotDamage: shots.map(s => s.damage), expectedDamage: expectedDamage(), failure: failure.stack, allOtherRuntimeBytesUnchanged: true });
  } finally { f.dispose(); }
}
const report = { checkedAt: new Date().toISOString(), passed: true, currentSource: '205d1bd35db96f0b9a4054514f887e6865b5a660', rows, originalFailedPeerMutationSnapshotsRetained: false, limits: 'Controlled actual Game reproduces the invalid base-damage floor. It does not identify the original failed sessions mutation. No helper or gameplay source has yet changed.' };
fs.writeFileSync(new URL('damage-floor-reproduction01.json', import.meta.url), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ reproduced: rows.length, actualDamage: rows.map(r => r.actualShotDamage), originalMutationsNotAsserted: true }));
