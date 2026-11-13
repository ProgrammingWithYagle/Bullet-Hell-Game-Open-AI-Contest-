import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const stage = path.dirname(fileURLToPath(import.meta.url)), prior = path.resolve(stage, '../heavy-clutch-handling-movement-stage');
const oldScope = 'reviews/heavy-clutch-handling-movement-2026-11-09', scope = 'reviews/heavy-clutch-stat-scaling-2026-11-10';
const pairs = [
  ['prepare-source02.mjs','prepare-source01.mjs'], ['commit-source02.mjs','commit-source01.mjs'], ['push-source0102.mjs','push-source01.mjs'],
  ['freeze-reviews02.mjs','freeze-reviews01.mjs'], ['check-ci02.mjs','check-ci01.mjs'], ['verify-frozen02.mjs','verify-frozen01.mjs'],
  ['launch-reviews.ps1','launch-reviews.ps1'], ['await-review-readiness.mjs','await-review-readiness.mjs'], ['capture-identities.ps1','capture-identities.ps1'],
  ...['native-probe.mts','run-reviews.mjs','earned-menu-flow.mts','retained-clutch-flow.mts','retained-clutch-peer.mts','retained-clutch-worker.mts','retained-seam-flow.mts','retained-seam-peer.mts','retained-seam-worker.mts','retained-traverse-flow.mts','retained-traverse-peer.mts','retained-traverse-worker.mts'].map(n=>[n,n]),
];
const prepared=[];
for(const [from,to] of pairs){
  let s=fs.readFileSync(prior+'/'+from,'utf8');
  s=s.replaceAll(oldScope,scope).replaceAll('Heavy-clutch-handling-movement','Heavy-clutch-stat-scaling')
    .replaceAll('heavy-clutch-handling-movement-testing','heavy-clutch-stat-scaling-testing').replaceAll('heavy-clutch-handling-movement-public','heavy-clutch-stat-scaling-public')
    .replaceAll('5378','5380').replaceAll('5379','5381').replaceAll('2754','2756').replaceAll('2755','2757')
    .replaceAll('2152','2161').replaceAll('2,152','2,161').replaceAll('d2386943ce6d2fbf077ee1a2aa40a55b8bc7f8e2','205d1bd35db96f0b9a4054514f887e6865b5a660');
  if(to==='prepare-source01.mjs'){
    s=s.replace("oldScope = 'reviews/heavy-clutch-handling-rounds-2026-11-09'", "oldScope = '"+oldScope+"'");
    s=s.replace("'locales', 'assets', 'tools',", "'locales', 'assets',");
    s=s.replace("assert(!fs.existsSync(scope + '/source-verification.json'));", "assert.deepEqual(git('diff', base, '--name-only', '--', 'tools').trim().split(/\\r?\\n/), ['tools/verify.mjs']);\nassert(!fs.existsSync(scope + '/source-verification.json'));" );
    s=s.replaceAll('gate02.log','gate01.log').replaceAll('gate02-result.json','gate01-result.json').replaceAll('/full-gate02.json','/full-gate01.json');
    const copyStart=s.indexOf("for (const name of ['gate01.log'");const copyEnd=s.indexOf('\nfs.copyFileSync',copyStart);assert(copyStart>0&&copyEnd>copyStart);
    s=s.slice(0,copyStart)+"for (const name of ['gate01.log', 'gate01-result.json', 'admit-stat-proof01.mjs', 'run-gate01.mjs', 'prepare-cycle-tools01.mjs']) fs.copyFileSync(stage + '/' + name, scope + '/' + name, fs.constants.COPYFILE_EXCL);"+s.slice(copyEnd);
    s=s.replace('newRegressionCases: 3',"newRegressionCases: 9, verificationDriverSha256: gate.verificationDriverSha256, testFileConcurrency: gate.testFileConcurrency, allTestCasesAndSevenChecksRetained: true");
    const h=s.indexOf("fs.appendFileSync('handoff/NEXT_CHAT.md'");const hEnd=s.indexOf('\nconsole.log',h);assert(h>0&&hEnd>h);
    const note='\n\n### Current stat-scaled proof correction\n\nCurrent candidate retains runtime9703aee1/contentcc0f9202/protocol72/build2026.11.09-heavy-clutch-handling. Source205d1bd passes2,152 locally/all7, but its original exact push/PR CI runs are preserved cancelled during the unchanged20-minute workflow; neither is success. Both5378/2754and5379/2755reviews preserve99passes/one older ClutchFloating base-damage assertion failure outof100executed,38invocations; six later handling peer cases each were not executed. Controlled actual Iron Rain reproduces a valid34.02round below the45base in both retained Clutch and entry helpers. Original failed peer mutation snapshots were not retained, so exact original mutation is unknown. Those helpers now accept positive finite actual scaled damage and record original owned/mutation context. Nine actual-Game regressions compare exact real stats across all carriages/Lifeline/Iron Rain and preserve round costs/slots/host cleanup. Full suite uses bounded4–8file concurrency to overlap real peer waits, with no test skipped, timeout/deadline extension or gameplay/content change. New gate01passes2,161/all7; exact-source CI and fresh5380/2756and5381/2757reviews remain pending. Preserve63registered predecessors plus the failed unregisteredSeamroot, privateSQLite and116prior process identities. All72natural/replay reports retain original18da execution provenance under the exact runtime. Only the user decides completion; development continues.\n';
    s=s.slice(0,h)+"fs.appendFileSync('handoff/NEXT_CHAT.md',"+JSON.stringify(note)+");"+s.slice(hEnd);
    s=s.replace("assert.equal(gate.outputFiles, 2051);", "assert.equal(gate.outputFiles, 2051);\nassert(gate.testFileConcurrency >= 4 && gate.testFileConcurrency <= 8);\nassert.equal(sha(fs.readFileSync('tools/verify.mjs')), gate.verificationDriverSha256);");
  }
  if(to==='commit-source01.mjs'){
    s=s.replace("'locales', 'assets', 'tools',", "'locales', 'assets',");
    s=s.replace("const code = new Set(['tests/helpers/heavy-clutch-handling-flow.ts', 'tests/heavy-clutch-handling-slow-walk.test.ts', 'tests/heavy-clutch-handling-host-cleanup.test.ts']);", "const code = new Set(['tests/helpers/heavy-clutch-flow.ts','tests/helpers/heavy-traverse-flow.ts','tests/helpers/heavy-stat-proof-fixture.ts','tests/heavy-traverse-stat-proof.test.ts','tools/verify.mjs']);");
    s=s.replace("oldScope = 'reviews/heavy-clutch-handling-rounds-2026-11-09'", "oldScope = '"+oldScope+"'");
    s=s.replaceAll('source-commit-plan02','source-commit-plan01').replaceAll('onlyThreeTestCodePathsChanged','onlyFourTestPathsAndOneVerificationDriverChanged').replace('Observe actual lifted walking through slow and paid recoil','Verify Heavy rounds under actual mutation damage scaling');
  }
  if(to==='freeze-reviews01.mjs')s=s.replaceAll('/full-gate02.json','/full-gate01.json').replaceAll("gate:'full-gate02.json'","gate:'full-gate01.json'").replace('registeredPredecessorRoots:61','registeredPredecessorRoots:63').replace('priorRecordedProcessIdentities:112','priorRecordedProcessIdentities:116');
  if(to==='capture-identities.ps1'){
    s=s.replace("'reviews/heavy-clutch-handling-rounds-2026-11-09/process-identities.json'", "'"+oldScope+"/process-identities.json'").replaceAll('112','116').replaceAll('heavy-clutch-handling-movement-2026-11-09','heavy-clutch-stat-scaling-2026-11-10');
  }
  if(to==='verify-frozen01.mjs'){
    s=s.replace("read(scope+'/full-gate02.json')", "read(scope+'/full-gate01.json')");
    const extra="...['testing','public'].map(audience=>({scope:'"+oldScope+"',audience}))";
    const at="...['testing','public'].map(audience=>({scope:'reviews/heavy-clutch-handling-rounds-2026-11-09',audience}))";
    assert(s.includes(at));s=s.replace(at,at+','+extra).replace('preserved.length,61','preserved.length,63').replace('olderRecordedCount===112','olderRecordedCount===116').replace('All61older','All63older').replace('olderRegisteredRootsPreserved:61','olderRegisteredRootsPreserved:63');
  }
  fs.writeFileSync(stage+'/'+to,s,{flag:'wx'});prepared.push(to);
}
fs.writeFileSync(stage+'/cycle-tools-prepared.json',JSON.stringify({checkedAt:new Date().toISOString(),prepared,executed:false,newScope:scope,tests:2161,previousRoots:63,previousIdentities:116},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({prepared:prepared.length,executed:false}));
