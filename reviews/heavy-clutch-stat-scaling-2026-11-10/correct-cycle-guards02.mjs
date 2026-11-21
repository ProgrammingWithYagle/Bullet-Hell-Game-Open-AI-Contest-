import fs from 'node:fs';
import assert from 'node:assert/strict';
const stage = new URL('./', import.meta.url);
for (const name of ['prepare-source01.mjs','commit-source01.mjs','push-source01.mjs','freeze-reviews01.mjs','verify-frozen01.mjs']) {
  let s=fs.readFileSync(new URL(name,stage),'utf8');
  if(name==='prepare-source01.mjs') {
    s=s.replace("'prepare-cycle-tools01.mjs']) fs.copyFileSync", "'prepare-cycle-tools01.mjs', 'correct-cycle-guards02.mjs', 'ci-cancellation-audit01.json', 'inspect-cancellations01.mjs']) fs.copyFileSync");
    assert(s.includes("'ci-cancellation-audit01.json'"));
    s=s.replace('testOnlyCorrection: true,', "testOnlyCorrection: true, originalFeatureSourceCommit: '18da7f9267710090ea9566fc49728d44c8f26dbe', previousTestProofSourceCommit: base,");
  }
  if(name==='commit-source01.mjs')s=s.replace("assert(proof.passed &&", "assert.equal(sha(fs.readFileSync('tools/verify.mjs')),proof.verificationDriverSha256);\nassert(proof.passed &&");
  if(name==='push-source01.mjs')s=s.replace("assert.equal(git('rev-parse','HEAD'),source);", "assert.equal(createHash('sha256').update(fs.readFileSync('tools/verify.mjs')).digest('hex'),proof.verificationDriverSha256);assert.equal(git('rev-parse','HEAD'),source);");
  if(name==='freeze-reviews01.mjs')s=s.replace("assert.equal(proof.testResults.pass,2161);", "assert.equal(proof.testResults.pass,2161);assert.equal(sha(fs.readFileSync('tools/verify.mjs')),gate.verificationDriverSha256);assert.equal(proof.verificationDriverSha256,gate.verificationDriverSha256);");
  if(name==='verify-frozen01.mjs') {
    s=s.replace("gate=read(scope+'/full-gate01.json');", "gate=read(scope+'/full-gate01.json');assert.equal(sha(fs.readFileSync('tools/verify.mjs')),gate.verificationDriverSha256);assert(gate.testFileConcurrency>=4&&gate.testFileConcurrency<=8);");
    for(const variant of ['clutch-','traverse-']){
      const marker="else if(variant.startsWith('"+variant+"')){";
      assert(s.includes(marker));s=s.replace(marker,marker+"assert(r.statContextAtStrokeStart&&Array.isArray(r.statContextAtStrokeStart.mutations)&&Array.isArray(r.statContextAtStrokeStart.skills)&&r.shots.every(s=>Number.isFinite(s.damage)&&s.damage>0));");
    }
  }
  fs.writeFileSync(new URL(name,stage),s);
}
console.log(JSON.stringify({preparedOnly:true,verificationDriverBound:true,originalCICancellationAnnotationsPreserved:true}));
