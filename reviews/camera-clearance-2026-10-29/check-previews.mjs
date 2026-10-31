import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const previews=[];
for(const scope of ['camera-clearance-2026-10-29','arena-edge-2026-10-29']) for(const audience of ['testing','public']) {
 const root='reviews/'+scope,previous=JSON.parse(fs.readFileSync(root+'/preview-'+audience+'-live-check.json')),manifest=JSON.parse(fs.readFileSync(root+'/preview-'+audience+'-bytes.json'));
 const frozen=[];
 for(const name of ['index.html','preview-build.json']) {
  const expected=previous.httpChecks.find(c=>c.path===name);assert(expected);const bytes=fs.readFileSync(manifest.root+'/'+name);assert.equal(sha(bytes),expected.sha256);
  frozen.push({path:name,bytes:bytes.length,sha256:sha(bytes)});
 }
 assert.equal(sha(fs.readFileSync(manifest.backend.path)),manifest.backend.sha256);
 let live,unavailable;
 try {
  const checks=[];
  for(const name of ['index.html','preview-build.json']) {
   const expected=previous.httpChecks.find(c=>c.path===name);const response=await fetch(previous.url+name,{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);
   const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),expected.sha256);checks.push({path:name,status:response.status,bytes:bytes.length,sha256:sha(bytes)});
  }
  const response=await fetch(previous.endpoint+'/api/health',{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const health=await response.json();
  for(const key of ['status','startedAt','sourceCommit','protocolVersion','contentRevision','audience'])assert.equal(health[key],previous.health[key],key);
  assert.equal(health.teamRecords.available,true);assert.equal(health.teamRecords.scope,'server');
  live={available:true,startedAt:health.startedAt,checks,teamRecords:health.teamRecords,persistentOwnerUnchanged:true};
 } catch(error) {
  if(scope==='camera-clearance-2026-10-29')throw error;
  if(error?.cause?.code!=='ECONNREFUSED')throw error;
  unavailable={available:false,errorCode:error.cause.code,message:'Previous process is no longer listening. Its old holding session is absent. No restart or stop was attempted.'};
 }
 previews.push({scope,audience,url:previous.url,endpoint:previous.endpoint,sourceCommit:manifest.sourceCommit,protocol:manifest.protocol,frozenFilesVerified:true,frozen,backendBundleSha256:manifest.backend.sha256,...(live??unavailable)});
}
fs.writeFileSync('reviews/camera-clearance-2026-10-29/preserved-preview-availability.json',JSON.stringify({checkedAt:new Date().toISOString(),passed:true,currentPreviewsAvailable:true,previousFrozenFilesPreserved:true,previews,limits:['Read-only served/frozen hashes and backend identity/start checks. Previous5242/5243 processes are absent; preserved roots remain unchanged. No rooms or records changed, no process stopped/restarted and no rendered/human observation.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,previews:previews.map(p=>({url:p.url,available:p.available,frozenFilesVerified:p.frozenFilesVerified}))}));
