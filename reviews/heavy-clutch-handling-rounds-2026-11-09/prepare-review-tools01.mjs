import fs from 'node:fs';
import assert from 'node:assert/strict';
const stage = new URL('./', import.meta.url), old = new URL('../heavy-clutch-handling-stage/', stage);
const names = ['freeze-reviews.mjs', 'launch-reviews.ps1', 'await-review-readiness.mjs', 'capture-identities.ps1', 'check-ci.mjs', 'native-probe.mts', 'run-reviews.mjs', 'verify-frozen.mjs', 'earned-menu-flow.mts', ...fs.readdirSync(old).filter(n => /^retained-.*\.mts$/.test(n))];
const copies = [];
for (const name of names) {
  let s = fs.readFileSync(new URL(name, old), 'utf8');
  s = s.replaceAll('reviews/heavy-clutch-handling-2026-11-09', 'reviews/heavy-clutch-handling-rounds-2026-11-09')
    .replaceAll('Heavy-clutch-handling-', 'Heavy-clutch-handling-rounds-')
    .replaceAll('output/heavy-clutch-handling-', 'output/heavy-clutch-handling-rounds-')
    .replaceAll('2145', '2149').replaceAll('full-gate02.json', 'full-gate01.json')
    .replaceAll('5374', '5376').replaceAll('2750', '2752').replaceAll('5375', '5377').replaceAll('2751', '2753');
  if (name === 'capture-identities.ps1') s = s.replaceAll('reviews/heavy-clutch-2026-11-09/process-identities.json', 'reviews/heavy-clutch-handling-2026-11-09/process-identities.json').replaceAll('104', '108');
  if (name === 'freeze-reviews.mjs') s = s.replace('registeredPredecessorRoots:57', 'registeredPredecessorRoots:59').replace('priorRecordedProcessIdentities:104', 'priorRecordedProcessIdentities:108');
  if (name === 'verify-frozen.mjs') {
    const insertion = "...['testing','public'].map(audience=>({scope:priorScope,audience}))]";
    assert(s.includes(insertion));
    s = s.replace(insertion, "...['testing','public'].map(audience=>({scope:priorScope,audience})),...['testing','public'].map(audience=>({scope:'reviews/heavy-clutch-handling-2026-11-09',audience}))]");
    s = s.replaceAll('preserved.length,57', 'preserved.length,59').replaceAll('All57older', 'All59older').replaceAll('olderRegisteredRootsPreserved:57', 'olderRegisteredRootsPreserved:59').replaceAll('olderRecordedCount===104', 'olderRecordedCount===108').replaceAll('expectedprior104', 'expectedprior108');
    s = s.replace('assert.equal(r.actualTradedSlots,r.actualPrimaryRounds);', 'assert.equal(r.actualPrimaryRounds,r.actualTradedSlots+r.actualPostStrokePrimaryRounds);assert.equal(r.actualPrimaryRoundFiringEvents,r.actualPrimaryRounds);assert(r.actualPrimaryProjectiles>=r.actualPrimaryRounds);');
    s = s.replace("assert.equal(r.actualPrimaryRounds,3);assert.equal(r.actualPassedSlots,0);", "assert.equal(r.actualTradedSlots,3);assert(r.actualPrimaryRounds>=3);assert.equal(r.actualPassedSlots,0);");
    s = s.replace('else assert(r.actualPrimaryRounds>=1&&r.actualPrimaryRounds<=3);', 'else assert(r.actualTradedSlots>=1&&r.actualTradedSlots<=3&&r.actualPrimaryRounds>=r.actualTradedSlots);');
    s = s.replace('actualPrimaryRounds:r.actualPrimaryRounds,actualPassedSlots:', 'actualPrimaryRounds:r.actualPrimaryRounds,actualPrimaryProjectiles:r.actualPrimaryProjectiles,actualPostStrokePrimaryRounds:r.actualPostStrokePrimaryRounds,actualPassedSlots:');
    assert(s.includes('preserved.length,59') && s.includes('actualPrimaryRoundFiringEvents'));
  }
  assert(!fs.existsSync(new URL(name, stage)), name);
  fs.writeFileSync(new URL(name, stage), s.trimEnd() + '\n', { flag: 'wx' });
  copies.push(name);
}
console.log(JSON.stringify({ preparedWorkspaceTools: copies.length, scope: 'heavy-clutch-handling-rounds-2026-11-09', priorRegisteredRoots: 59, priorRecordedIdentities: 108, noCanonicalWrites: true }));
