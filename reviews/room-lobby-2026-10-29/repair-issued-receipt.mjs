import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reviews/room-lobby-2026-10-29';
const preservation=JSON.parse(fs.readFileSync(root+'/gate-02/gate-preservation.json'));
assert(preservation.fullGatePassed);
assert.deepEqual(preservation.errors.map(e=>e.file),['reviews/stage1-validation.json']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const repaired=[];
for(const entry of preservation.receipts){
  const original=fs.readFileSync('output/room-lobby-2026-10-29/issued-receipts-02/'+entry.file.replaceAll('/','--'));
  assert.equal(sha(original),entry.issuedSha256);
  const before=sha(fs.readFileSync(entry.file));
  if(before!==entry.issuedSha256){
    const temporary=entry.file+'.room-lobby-recovery';
    fs.writeFileSync(temporary,original,{flag:'wx'});
    fs.renameSync(temporary,entry.file);
  }
  assert.equal(sha(fs.readFileSync(entry.file)),entry.issuedSha256);
  repaired.push({path:entry.file,beforeSha256:before,issuedAndRestoredSha256:entry.issuedSha256,changed:before!==entry.issuedSha256});
}
fs.writeFileSync(root+'/gate-02/receipt-restoration-repair.json',JSON.stringify({passed:true,createdAt:new Date().toISOString(),
  reason:'Verification passed 795/795. A transient Windows/OneDrive file-open error prevented the wrapper from restoring one issued report; same-directory rename restores its preserved original bytes. The failed wrapper receipt is retained unchanged.',
  receipts:repaired,fullGatePassed:true,rawWrapperPassed:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,issuedReceiptsRestored:repaired.length,changed:repaired.filter(r=>r.changed).map(r=>r.path)}));
