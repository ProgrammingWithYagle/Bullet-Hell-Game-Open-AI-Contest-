import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url);
let source=fs.readFileSync(new URL('combat-pilot01.mts',dir),'utf8');
function replace(before,after){assert.equal(source.split(before).length,2,'Unique guard: '+before.slice(0,80));source=source.replace(before,after);}
source=source.replaceAll('policy01','policy02');
replace('      burstReports: any[] = [],','      burstReports: any[] = [],\n      combatExits: any[] = [],\n      restoreShieldObservations: any[] = [],');
replace('        const copy = Game.restoreOffline(structuredClone(save));','        assert(!Object.hasOwn(save.player, "shield"), "Issued safe saves omit transient personal shield.");\n        const beforeShield = p.shield;\n        const copy = Game.restoreOffline(structuredClone(save));\n        restoreShieldObservations.push({encounter:g.encounter, phase:g.phase, beforeShield, afterShield:copy.players.get("solo")!.shield});\n        assert.equal(copy.players.get("solo")!.shield,0);');
replace('      g.step();\n      const events = g.drainEvents();','      const wasCombat = g.phase === "combat";\n      g.step();\n      if(wasCombat && g.phase !== "combat") combatExits.push({encounter, nextPhase:g.phase, combatTick:g.combatTick, health:p.health, shield:p.shield, damageTaken:p.damageTaken, damageDealt:p.damageDealt});\n      const events = g.drainEvents();');
replace('      burstReports,\n      actualInterceptions:', '      burstReports,\n      combatExits,\n      restoreShieldObservations,\n      actualInterceptions:');
replace('    "Safe noncombat checkpoints preserve ownership rather than unfinished flight/burst/recovery. Replay resumes input sequence from actual ack. Every measured row field except restore count is compared. Runtime and policy hashes bind original execution provenance. A burst cleared by an encounter transition before a public cue is sampled is not retroactively assigned contact marks.",','    "Safe noncombat checkpoints preserve ownership rather than unfinished flight/burst/recovery or transient personal shield. Replay resumes input sequence from actual ack. Every combat/progression field, including shield at each actual combat exit, is compared exactly. Raw terminal shield is also compared and any difference is retained; a difference is accepted only when the final secretOffer restore explicitly demonstrates the issued unsaved shield reset to zero. Restore-specific observations/counts are reported separately. No claim of all measured fields matching is made when terminal shield differs. Runtime and policy hashes bind original execution provenance. A burst cleared by an encounter transition before a public cue is sampled is not retroactively assigned contact marks.",');
const start=source.indexOf('  const comparisons = rows.map((row) => {');
assert(start>0);
source=source.slice(0,start)+`  const comparisons = rows.map((row) => {
    const first = natural.rows.find((r: any) => r.route === row.route);
    const mismatches=Object.keys(row).filter(k=>!['restoredBoundaryCount','restoreShieldObservations'].includes(k)&&JSON.stringify(row[k])!==JSON.stringify(first[k]));
    const lastRestore=row.restoreShieldObservations.at(-1);
    const shieldDiffers=mismatches.includes('endingShield');
    const expectedTerminalShieldNormalization=shieldDiffers && row.phase==='victory' && first.phase==='victory' && lastRestore?.phase==='secretOffer' && lastRestore.beforeShield===first.endingShield && lastRestore.afterShield===0 && row.endingShield===0 && row.combatExits.at(-1)?.shield===first.endingShield;
    const combatAndProgressionFieldsMatch=mismatches.every(k=>k==='endingShield');
    return {route:row.route,safeRestores:row.restoredBoundaryCount,allMeasuredFieldsMatch:!mismatches.length,combatAndProgressionFieldsMatch,mismatches,terminalShield:{natural:first.endingShield,restored:row.endingShield},expectedTerminalShieldNormalization,passed:combatAndProgressionFieldsMatch&&(!shieldDiffers||expectedTerminalShieldNormalization)};
  });
  const report={checkedAt:new Date().toISOString(),runtimeSourceSha256:runtime,policySourceSha256:policyHash,seed,map,passed:comparisons.every(c=>c.passed),allMeasuredFieldsMatch:comparisons.every(c=>c.allMeasuredFieldsMatch),combatAndProgressionFieldsMatch:comparisons.every(c=>c.combatAndProgressionFieldsMatch),comparisons,limits:['Original policy01 failed comparisons remain. This measurement revision retains raw terminal shield and explicitly checks the existing Practice reset; it does not alter gameplay, steering, purchases or deadlines.']};
  fs.writeFileSync(chat+'/outputs/'+stem+'-comparison.json',JSON.stringify(report,null,2)+'\\n',{flag:'wx'});
  assert(report.passed,JSON.stringify(comparisons));
  console.log(JSON.stringify(report));
}
`;
fs.writeFileSync(new URL('combat-pilot02.mts',dir),source,{flag:'wx'});
let runner=fs.readFileSync(new URL('run-pilots01.mjs',dir),'utf8').replaceAll('policy01','policy02').replace('combat-pilot01.mts','combat-pilot02.mts');
fs.writeFileSync(new URL('run-pilots02.mjs',dir),runner,{flag:'wx'});
console.log(JSON.stringify({prepared:true,steeringAndPurchasesUnchanged:true,priorEvidencePreserved:true,newMeasurement:'actual combat exits and explicit transient shield normalization'}));
