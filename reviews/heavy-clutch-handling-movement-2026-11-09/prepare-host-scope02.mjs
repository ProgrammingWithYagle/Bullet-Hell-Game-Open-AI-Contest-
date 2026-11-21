import fs from'node:fs';import assert from'node:assert/strict';
const root='C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)',stage=new URL('./',import.meta.url);
let s=fs.readFileSync(root+'/tests/helpers/heavy-clutch-handling-flow.ts','utf8').replaceAll('\r\n','\n');
const one=(a,b)=>{assert.equal(s.split(a).length,2,a.slice(0,100));s=s.replace(a,b);};
one('  let actualHostExit = false;','  let actualHostExit = false;\n  const hostExitCShotIds:number[]=[];\n  const ordinaryPrimaryAliveAtHostExit:number[]=[];');
one('    const alive = shots().filter((s) => !removed(s.id));','    const alive = C().filter((s) => !removed(s.id));\n    hostExitCShotIds.push(...alive.map(s=>s.id));\n    ordinaryPrimaryAliveAtHostExit.push(...primary().filter(s=>!removed(s.id)).map(s=>s.id));');
one('    actualHostExit,','    actualHostExit,\n    hostExitCShotIds,\n    ordinaryPrimaryAliveAtHostExit,');
fs.writeFileSync(new URL('flow02-source.ts',stage),s,{flag:'wx'});
s=s.replaceAll('from "../../src/','from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/').replace('from "./heavy-flak-flow.ts"','from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/tests/helpers/heavy-flak-flow.ts"');fs.writeFileSync(new URL('flow02.mts',stage),s,{flag:'wx'});
let test=fs.readFileSync(root+'/tests/heavy-clutch-handling-round-proof.test.ts','utf8');
test=test.replace('"./helpers/heavy-clutch-handling-flow.ts"','"./flow02.mts"').replaceAll('"./helpers/','"../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/tests/helpers/').replaceAll('"../src/','"../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/');
test=test.replace('  delayedDebt = false,','  delayedDebt = false,');
const at='  try {\n    const result = await heavyClutchHandlingOperation(';assert.equal(test.split(at).length,2);
const call='        pause: async (value) => {\n          f.g.clearInputs();\n          paused = value;\n        },';assert.equal(test.split(call).length,2);
test=test.replace(call,call+'\n        end: async()=>{assert(f.g.endByHost());drain();},');
test=test.replace('    assert.equal(\n      result.actualPrimaryRoundFiringEvents,',`    assert(result.actualHostExit);assert(result.hostExitCShotIds.length>0);assert(result.hostExitCShotIds.every(id=>!f.g.shots.has(id)));
    if(delayedDebt){assert(result.ordinaryPrimaryAliveAtHostExit.length>0);assert(result.ordinaryPrimaryAliveAtHostExit.some(id=>f.g.shots.has(id)));}
    assert.equal(
      result.actualPrimaryRoundFiringEvents,`);
const start=test.indexOf('for (const mode of ["loose", "spade", "floating"] as const)');assert(start>0);test=test.slice(0,start)+`test("actual host exit removes tracked C while ordinary primary keeps its issued authority",{timeout:15000},async()=>{await operation("loose",true);});\n`;
fs.writeFileSync(new URL('host-cleanup02.test.mts',stage),test,{flag:'wx'});
for(const [from,to]of[['round-proof-regression01.test.mts','round-proof-regression02.test.mts'],['slow-walk01.test.mts','slow-walk02.test.mts']])fs.writeFileSync(new URL(to,stage),fs.readFileSync(new URL(from,stage),'utf8').replaceAll('./flow01.mts','./flow02.mts'),{flag:'wx'});
fs.writeFileSync(new URL('host-exit-scope-audit02.json',stage),JSON.stringify({checkedAt:new Date().toISOString(),runtimeChanged:false,canonicalFilesWritten:false,source:'src/shared/game.ts endByHost removes tracked Traverse/Flak/Marksman/Grenadier/Sniper shots; it does not promise ordinary primary removal.',failedGate01:{tests:2151,pass:2149,fail:2,cancelled:0,skipped:0},heavyFailure:'Helper incorrectly included ordinary Open primary in handled C host-exit removal set.',scopeCorrection:'Require actual tracked C removals; retain and report ordinary primary separately without changing its issued authority.',priorDiagnosisCorrection:'The earlier round-proof02-fixture-correction record said direct Game did not supply Room/Session host removal events. That explanation was too broad: Game supplies tracked C removals; the included ordinary primary was outside that cleanup contract. Preserve that historical record and read this clarification.',olderSniperFailure:'Original stopped-cover crossing assertion, unchanged and isolated separately.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({prepared:true,hostRemovalScope:'tracked C',ordinaryPrimaryAuthorityUnchanged:true}));
