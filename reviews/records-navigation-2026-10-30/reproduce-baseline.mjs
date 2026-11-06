import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeTextAtomic} from '../../tools/write-text-atomic.mjs';
const reference='7d01e6dd0370c6368f2f712e633229cbbc27f5db',root='output/records-navigation-2026-10-30/baseline-01';
assert(!fs.existsSync(root));fs.mkdirSync(root,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const files=['src/client/ui/leaderboards.ts','src/client/ui/team-records.ts'].map(file=>({file,candidate:fs.readFileSync(file),baseline:execFileSync('git',['-c','core.bare=false','show',reference+':'+file])}));
for(const f of files)fs.writeFileSync(root+'/'+f.file.split('/').at(-1),f.candidate,{flag:'wx'});
let run;
try{
 for(const f of files)writeTextAtomic(f.file,f.baseline);
 run=spawnSync(process.execPath,['--import','tsx','--test','tests/records-navigation.test.ts'],{stdio:'inherit',timeout:30000});
}finally{
 for(const f of files){writeTextAtomic(f.file,f.candidate);assert(fs.readFileSync(f.file).equals(f.candidate),'Candidate restoration failed');}
}
const receipt={createdAt:new Date().toISOString(),reference,baselineExit:run?.status,candidateRestored:true,selectFixtureUsesBrowserOptionReplacementSemantics:true,files:files.map(f=>({file:f.file,baselineSha256:sha(f.baseline),candidateSha256:sha(f.candidate),restoredSha256:sha(fs.readFileSync(f.file))})),limits:['Native controller baseline only; all active previews use their existing frozen roots. No rendered or human acceptance.']};
fs.writeFileSync('reviews/records-navigation-2026-10-30/corrected-baseline-01.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
assert.equal(run.status,1,'The prior UI must still fail the corrected baseline');console.log(JSON.stringify(receipt));
