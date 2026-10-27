// Portable file integrity for this issued production packet; no rendered/human acceptance.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const manifestPath='docs/small-wakes-integration-2026-10-26.json';
const manifest=JSON.parse(fs.readFileSync(path.join(root,manifestPath),'utf8'));
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
assert.equal(manifest.files.length,91);assert.equal(manifest.selectedPoses,36);assert.equal(manifest.renderedAccepted,false);
const seen=new Set();
for(const file of manifest.files){
 assert(!path.isAbsolute(file.path)&&!file.path.split(/[\\/]/).includes('..'));assert(!seen.has(file.path));seen.add(file.path);
 const target=path.resolve(root,file.path);assert(target.startsWith(root+path.sep));const bytes=fs.readFileSync(target);assert.equal(bytes.length,file.bytes,file.path);assert.equal(hash(bytes),file.sha256,file.path);
}
const catalog=JSON.parse(fs.readFileSync(path.join(root,'content/catalog.json'),'utf8'));
for(const id of manifest.bossesAdded)assert(catalog.bosses.some(b=>b.id===id&&!b.secret));
const report={createdAt:new Date().toISOString(),passed:true,manifest:manifestPath,manifestSha256:hash(fs.readFileSync(path.join(root,manifestPath))),files:manifest.files.length,selectedPoses:36,bossesAdded:manifest.bossesAdded,currentRoster:catalog.bosses.length,renderedAccepted:false,humanAccepted:false,limits:['Exact immutable packet file sizes and SHA-256; independent full-RGBA reconstruction is a separate Python audit and runtime/CI evidence is separate.','Mutable global music registries and runtime help belong to the current source/CI receipt, so future roster additions do not invalidate this historical production packet.']};
fs.writeFileSync(path.join(root,'reviews/small-wakes-2026-10-26/production-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,files:91,selectedPoses:36,currentRoster:catalog.bosses.length}));
