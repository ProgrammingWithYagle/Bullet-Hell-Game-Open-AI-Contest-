import {additionalSourceBinding} from '../../reviews/first-language-2026-10-30/review-inputs.mjs';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const label = process.argv[2] ?? '01';
if (!/^\d{2}$/.test(label)) throw new Error('Use a two-digit gate label');
const root = 'reviews/first-language-2026-10-30/gate-' + label;
const backup = 'output/first-language-2026-10-30/issued-receipts-' + label;
fs.mkdirSync(root, { recursive: true }); fs.mkdirSync(backup, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const paths = ['reviews/resonant-tolls-2026-10-27/art-verification.json',
  'reviews/alchemist-lab-2026-10-27/art-verification.json', 'reviews/warden-patrol-2026-10-25/art-verification.json',
  'reviews/small-wakes-2026-10-26/art-verification.json', 'reviews/resonant-tolls-2026-10-27/emitted-atlases-testing.json',
  'reviews/resonant-tolls-2026-10-27/emitted-atlases-public.json', 'reviews/stage1-validation.json', 'reviews/runtime-verification.json'];
const originals = paths.map(file => ({ file, bytes: fs.readFileSync(file) }));
for (const { file, bytes } of originals) fs.writeFileSync(backup + '/' + file.replaceAll('/', '--'), bytes, { flag: 'wx' });
const additionalBefore=additionalSourceBinding();
const run = spawnSync(process.execPath, ['tools/verify.mjs'], { stdio: 'inherit', env: process.env });
const receipts = [], errors = [];
const additionalAfter=additionalSourceBinding();if(additionalBefore.sha256!==additionalAfter.sha256)errors.push({error:'Additional source inputs changed during verification'});
for (const { file, bytes } of originals) {
  const fresh = fs.readFileSync(file), savedAs = root + '/' + file.slice(8).replaceAll('/', '--');
  fs.writeFileSync(savedAs, fresh, { flag: 'wx' });
  if (!fresh.equals(bytes)) {
    let restored = false;
    for (let attempt = 0; attempt < 3 && !restored; attempt++) {
      try { fs.writeFileSync(file, bytes); restored = fs.readFileSync(file).equals(bytes); }
      catch (error) {
        if(attempt===2){
          try{
            const temporary=file+'.chat-confirmation-gate-'+label;
            fs.writeFileSync(temporary,bytes,{flag:'wx'});fs.renameSync(temporary,file);
            restored=fs.readFileSync(file).equals(bytes);
          }catch(fallback){errors.push({file,error:error.message,atomicRestorationError:fallback.message});}
        }else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);
      }
    }
    if (!restored && !errors.some(e => e.file === file)) errors.push({ file, error: 'Restored bytes differ' });
  }
  receipts.push({ file, issuedSha256: sha(bytes), savedAs, rerunSha256: sha(fresh), restoredSha256: sha(fs.readFileSync(file)) });
}
fs.writeFileSync(root + '/gate-preservation.json', JSON.stringify({ createdAt: new Date().toISOString(),
  passed: run.status === 0 && errors.length === 0, fullGatePassed: run.status === 0, fullGateExitCode: run.status,
  receipts, errors, additionalSourceBinding:additionalBefore, limits: ['Native software gate only. Issued reports remain separate from the current reruns. No browser/rendered, human, audio, native-language or device acceptance.'] }, null, 2) + '\n');
process.exitCode = run.status === 0 && errors.length === 0 ? 0 : 1;
