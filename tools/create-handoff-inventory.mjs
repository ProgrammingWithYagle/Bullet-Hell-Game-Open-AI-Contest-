// A local working-tree checkpoint, not a release package or a replacement for Git.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const target=process.argv[2]??'reviews/handoff/2026-10-23-protocol4-working-tree.json';
assert(/^reviews\/handoff\/[a-z0-9-]+\.json$/.test(target),'Expected a new inventory filename under reviews/handoff/');
assert(!existsSync(target),'Preserve prior inventories; choose a new filename.');
const required=[
  'START_NEXT_CHAT.txt','docs/HANDOFF_NEXT_CHAT.md','docs/IMPLEMENTATION_STATE.md',
  'docs/IMPLEMENTATION_BACKLOG.md','docs/FIRST_PLAYABLE.md','docs/ACCEPTANCE.md',
  'CHANGELOG.md','docs/direction-art-provenance.json',
  'assets/proofs/directions/normalization.json','reviews/runtime-verification.json',
  'docs/handoff-inputs/inputs.json',
];
for(const file of required)assert(existsSync(file),'Missing handoff dependency: '+file);
const docs=readFileSync('docs/HANDOFF_NEXT_CHAT.md','utf8');
for(const match of docs.matchAll(/\]\(([^)]+)\)/g))if(!/^[a-z]+:|^#/i.test(match[1]))assert(existsSync('docs/'+match[1]),'Broken handoff link: '+match[1]);
const names=[...new Set(execFileSync('git',['ls-files','-c','-o','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))].filter(p=>p!==target&&existsSync(p)).sort();
const files=names.map(path=>({path,bytes:statSync(path).size,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
const runtime=JSON.parse(readFileSync('reviews/runtime-verification.json','utf8'));
assert.equal(runtime.passed,true,'Latest full verification did not pass');
const note={schemaVersion:1,createdAt:new Date().toISOString(),purpose:'Local continuation checkpoint; includes tracked and non-ignored untracked files. Dependencies, dist, historical output/ delivery archives, temporary edit canvases and this inventory itself are excluded by Git ignore rules or explicit self exclusion. This is not a game release or archive.',branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingChanges:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim().split('\n'),contentRevision:JSON.parse(readFileSync('content/revision.json','utf8')).sha256,latestRuntimeVerification:{passed:runtime.passed,createdAt:runtime.createdAt,sourceSnapshotSha256:runtime.sourceSnapshotSha256},requiredHandoffFiles:required,fileCount:files.length,totalBytes:files.reduce((n,f)=>n+f.bytes,0),files};
mkdirSync('reviews/handoff',{recursive:true});writeFileSync(target,JSON.stringify(note,null,2)+'\n');
for(const f of files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256,'Changed while checkpointing: '+f.path);
console.log(JSON.stringify({passed:true,inventory:target,files:files.length,bytes:note.totalBytes,requiredFiles:required.length,uncommitted:true}));
