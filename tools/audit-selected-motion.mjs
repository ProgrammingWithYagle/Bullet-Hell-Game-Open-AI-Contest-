import fs from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const sources = [];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function read(file) {
  const raw = fs.readFileSync(file,'utf8');
  sources.push({path:file,lfTextSha256:sha(raw.replaceAll('\r\n','\n'))});
  return JSON.parse(raw);
}
const survivors = ['heavy-library','survivor-library','legacy-survivor-library','survivor-actions/library'].flatMap(name => read('assets/production/motion/' + name + '.json').entries);
const warden = Object.values(read('assets/production/motion/warden-rehearsal.json').clips);
const constable = Object.values(read('assets/production/motion/constable-library.json').clips);
const base = ['encounter','civic','service','district','raid','endless'].flatMap(name => read('assets/production/motion/' + name + '-library.json').entries);
const updated = new Map(read('assets/production/motion/opening-defeats-library.json').entries.map(e => [e.bossId,e]));
const encounters = base.map(e => updated.get(e.bossId) ?? e);
const categories = {survivors,warden,constable,encounters};
const selected = Object.values(categories).flat();
assert.equal(new Set(selected.map(e=>e.atlas)).size, selected.length, 'Duplicate atlas in the actual selected set');
for (const entry of selected) {
  assert.equal(sha(fs.readFileSync(entry.atlas)),entry.atlasSha256);
  assert(Number.isSafeInteger(entry.frames) && entry.frames > 0);
}
const production = selected.filter(e=>e.atlas.startsWith('assets/production/'));
const legacy = selected.filter(e=>!e.atlas.startsWith('assets/production/'));
const summary = entries => ({atlases:entries.length,selectedFrames:entries.reduce((n,e)=>n+e.frames,0)});
const report = {passed:true,sourceTool:'tools/audit-selected-motion.mjs',sourceToolSha256:sha(fs.readFileSync('tools/audit-selected-motion.mjs')),
  selectedAnimation:summary(selected),productionNormalized:summary(production),retainedLegacyProof:summary(legacy),
  categories:Object.fromEntries(Object.entries(categories).map(([key,entries])=>[key,summary(entries)])),sources,
  limits:['Selected animation metadata only; static references and unselected archives are excluded.','Eight retained Constable proof-atlas poses are counted separately from production-path poses.','Engineer north selects four frames even though its original archived atlas has an unused second row.','Counts do not establish rendered or human acceptance.']};
assert.deepEqual(report.selectedAnimation,{atlases:243,selectedFrames:1450});
assert.deepEqual(report.productionNormalized,{atlases:242,selectedFrames:1442});
assert.deepEqual(report.retainedLegacyProof,{atlases:1,selectedFrames:8});
fs.writeFileSync('reviews/opening-defeats-2026-10-25/selected-motion-counts.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,selected:report.selectedAnimation,production:report.productionNormalized,legacy:report.retainedLegacyProof,categories:report.categories}));
