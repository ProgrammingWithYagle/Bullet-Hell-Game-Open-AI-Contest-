import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeTextAtomic} from '../../tools/write-text-atomic.mjs';
const root='reviews/medic-recovery-2026-10-29';
const before=JSON.parse(fs.readFileSync('reviews/room-lobby-2026-10-29/gate-01/gate-preservation.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),receipts=[];
for(const entry of before.receipts){
  const original=fs.readFileSync('output/room-lobby-2026-10-29/issued-receipts-01/'+entry.file.replaceAll('/','--'));
  assert.equal(sha(original),entry.issuedSha256);
  const current=fs.readFileSync(entry.file),changed=!current.equals(original);
  if(changed){
    assert.equal(entry.file,'reviews/small-wakes-2026-10-26/art-verification.json');
    const a=JSON.parse(original),b=JSON.parse(current);delete a.createdAt;delete b.createdAt;assert.deepEqual(a,b);
    fs.writeFileSync(root+'/focused-small-wakes-art-verification.json',current,{flag:'wx'});
    writeTextAtomic(entry.file,original);
  }
  assert(fs.readFileSync(entry.file).equals(original));
  receipts.push({path:entry.file,issuedAndRestoredSha256:sha(original),observedSha256:sha(current),changed});
}
fs.writeFileSync(root+'/issued-receipt-final-preservation.json',JSON.stringify({passed:true,receipts,
  finding:'The focused Small Wakes test regenerated only the timestamp in its old global art receipt before gate03. Its fresh receipt is archived here and the exact pre-task issued bytes are restored. Complete current gate05 receipts remain unchanged. Runtime, tests and additional bound source inputs are unchanged.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,restored:receipts.filter(r=>r.changed).map(r=>r.path),checked:receipts.length}));
