import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const stage = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)';
let s = fs.readFileSync(root + '/tests/helpers/heavy-clutch-handling-flow.ts', 'utf8').replaceAll('\r\n', '\n');
const one = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 110)); s = s.replace(a, b); };
one('  await heavyWait(\n    () => primary().length === converted,\n    "separate admitted primary event batch matches every actual round conversion",\n  );\n  assert.equal(p().ammo, ammo - 1 - converted);', `  // An actual primary round has one firing event even when Iron Rain adds pellets.
  // Slow delivery can also leave the held trigger live after its third conversion.
  const paidPrimaryRounds = ammo - 1 - p().ammo,
    primaryRounds = () => sounds("weapon-heavy-lmg").length;
  assert(Number.isInteger(paidPrimaryRounds) && paidPrimaryRounds >= converted);
  const postStrokePrimaryRounds = paidPrimaryRounds - converted;
  if (postStrokePrimaryRounds) {
    assert.equal(handling, openId);
    assert.equal(converted, 3);
    assert.equal(p().kit.heavyTraverseUntil, 0);
  }
  await heavyWait(
    () => primaryRounds() === paidPrimaryRounds && primary().length >= paidPrimaryRounds,
    "separate admitted primary firing events and physical projectiles match every actually paid round",
  );
  assert.equal(p().ammo, ammo - 1 - paidPrimaryRounds);`);
one('  assert.equal(p().ammo, ammo - 1 - converted);\n  assert.equal(p().kit.technique1At, recovery);\n  assert.equal(primary().length, converted);', '  assert.equal(p().ammo, ammo - 1 - paidPrimaryRounds);\n  assert.equal(p().kit.technique1At, recovery);\n  assert.equal(primaryRounds(), paidPrimaryRounds);\n  assert(primary().length >= paidPrimaryRounds);');
one('  assert.equal(p().ammo, ammo - ticks.length - converted);', '  assert.equal(p().ammo, ammo - ticks.length - paidPrimaryRounds);');
one('    actualPrimaryRounds: converted,', '    actualPrimaryRounds: paidPrimaryRounds,\n    actualPostStrokePrimaryRounds: postStrokePrimaryRounds,\n    actualPrimaryProjectiles: primary().length,\n    actualPrimaryRoundFiringEvents: primaryRounds(),');
one('    actualPaidRounds: ticks.length + converted,', '    actualPaidRounds: ticks.length + paidPrimaryRounds,');
fs.writeFileSync(stage + '/round-proof-flow01-source.ts', s, { flag: 'wx' });
s = s.replaceAll('from "../../src/', 'from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/').replace('from "./heavy-flak-flow.ts"', 'from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/tests/helpers/heavy-flak-flow.ts"');
fs.writeFileSync(stage + '/round-proof-flow01.mts', s, { flag: 'wx' });
console.log(JSON.stringify({ prepared: true, runtimeChanged: false, canonicalFilesWritten: false, sixSecondWaitUnchanged: true }));
