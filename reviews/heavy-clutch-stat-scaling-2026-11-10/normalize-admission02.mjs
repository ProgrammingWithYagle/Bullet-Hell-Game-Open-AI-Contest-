import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const stage = path.dirname(fileURLToPath(import.meta.url));
const root = 'C:/Users/yigal/OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)';
const scope = root + '/reviews/heavy-clutch-stat-scaling-2026-11-10';
const sha = b => createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', ['-c','core.bare=false',...a], { cwd:root,encoding:'utf8',maxBuffer:32*1024*1024 }).trim();
assert.equal(git('rev-parse','HEAD'),'205d1bd35db96f0b9a4054514f887e6865b5a660');assert.equal(git('diff','--cached'),'');
const gate=JSON.parse(fs.readFileSync(stage+'/gate01-result.json','utf8'));assert.equal(gate.exitCode,0);
const files=['tests/helpers/heavy-clutch-flow.ts','tests/helpers/heavy-traverse-flow.ts','tests/helpers/heavy-stat-proof-fixture.ts','tests/heavy-traverse-stat-proof.test.ts','tools/verify.mjs'];
const rows=[];
for(const f of files){const original=fs.readFileSync(root+'/'+f),text=original.toString(),normalized=Buffer.from(text.replaceAll('\r\n','\n'));assert(!normalized.includes(13));if(!original.equals(normalized)){
 const record='pre-lf-'+path.basename(f)+'.txt';fs.writeFileSync(stage+'/'+record,original,{flag:'wx'});fs.writeFileSync(scope+'/'+record,original,{flag:'wx'});fs.writeFileSync(root+'/'+f,normalized);
 }rows.push({file:f,originalSha256:sha(original),normalizedSha256:sha(normalized),onlyCRLFRemoved:true,removedCR:original.length-normalized.length});}
assert(rows.some(r=>r.removedCR>0));
assert(!fs.existsSync(scope+'/source-preparation-gate01.json'));fs.renameSync(scope+'/source-verification.json',scope+'/source-preparation-gate01.json');
const report={checkedAt:new Date().toISOString(),passedGate01Preserved:true,rows,expectedTests:2161,verificationDriverSha256:sha(fs.readFileSync(root+'/tools/verify.mjs')),runtimeAndContentUnchanged:true,allFivePathsNowLF:true,noSemanticChange:true,requiresNewAllSevenGate:true};
fs.writeFileSync(stage+'/admission02.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});fs.writeFileSync(scope+'/lf-admission02.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
let run=fs.readFileSync(stage+'/run-gate01.mjs','utf8').replaceAll('admission01.json','admission02.json').replaceAll('gate01','gate02');run=run.replace("assert(admission.expectedTests === 2161 && !admission.gameplayAndContentChanges && !admission.timeoutAndDeadlineChanges);","assert(admission.expectedTests===2161 && admission.allFivePathsNowLF && admission.noSemanticChange && admission.requiresNewAllSevenGate);");fs.writeFileSync(stage+'/run-gate02.mjs',run,{flag:'wx'});
console.log(JSON.stringify({normalized:rows.filter(r=>r.removedCR>0),newDriver:report.verificationDriverSha256,gate01Preserved:true,newFullGateRequired:true}));
