import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const scope='reviews/browser-release-fixes-2026-10-30',commit=process.argv[2];
assert(/^[a-f0-9]{40}$/.test(commit??''));
const git=(...args)=>execFileSync('git',['-c','core.bare=false',...args],{maxBuffer:16*1024*1024}).toString().trim();
assert.equal(git('rev-parse','HEAD'),commit);
assert.equal(git('diff',commit,'--','src','tests','content','package.json','pnpm-lock.yaml','vite.config.ts','index.html'),'');
const backendSourceCommit='71fc34cfd88a245d7003f16df7a7dc5e90986410';
assert.equal(git('diff','--name-only',backendSourceCommit,commit,'--','src/server','src/shared','content','src/client/session.ts','src/client/offline.worker.ts'),'src/shared/update-history.json','Only journal metadata may differ from the hosted rules');
const priorHistory=JSON.parse(git('show',backendSourceCommit+':src/shared/update-history.json')),currentHistory=JSON.parse(fs.readFileSync('src/shared/update-history.json'));
assert.equal(priorHistory.buildId,currentHistory.buildId);assert.deepEqual(priorHistory.snapshot,currentHistory.snapshot);
const gate=JSON.parse(fs.readFileSync(scope+'/gate-02/runtime-verification.json'));
assert(gate.passed);assert(JSON.parse(fs.readFileSync(scope+'/gate-02/gate-preservation.json')).passed);
const walk=d=>fs.readdirSync(d).sort().flatMap(n=>{const f=d+'/'+n;assert(!fs.lstatSync(f).isSymbolicLink());return fs.statSync(f).isDirectory()?walk(f):[f];});
const sha=b=>createHash('sha256').update(b).digest('hex');
const snapshot=createHash('sha256');for(const file of walk('src').sort())snapshot.update(file+'\0').update(fs.readFileSync(file));
assert.equal(snapshot.digest('hex'),gate.runtimeSourceSha256);
const outputRoot=path.resolve('output')+path.sep,candidate='output/candidate-browser-fixes-site-'+commit.slice(0,7),publication='output/sites-contest-2026-10-30',oldBuild='output/sites-contest-browser-repair-candidate-d5f935a-build-2026-10-30',masters='output/browser-fixes-site-original-masters-'+commit.slice(0,7);
for(const p of[candidate,oldBuild,masters]){assert(path.resolve(p).startsWith(outputRoot));assert(!fs.existsSync(p),'Preserve existing output: '+p);}
assert.equal(JSON.parse(fs.readFileSync(publication+'/.openai/hosting.json')).project_id,'appgprj_6ae537873538819199dd558c63949b10');
const endpoint='https://grave-accord-contest.onrender.com';
const built=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',candidate,'--logLevel','warn'],{encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,VITE_GAME_AUDIENCE:'public',VITE_GAME_SERVER:endpoint}});
fs.writeFileSync(scope+'/site-build-02.log',(built.stdout??'')+(built.stderr??''),{flag:'wx'});assert.equal(built.status,0);
const original=walk(candidate).map(f=>({path:f.slice(candidate.length+1),bytes:fs.statSync(f).size,sha256:sha(fs.readFileSync(f))}));
const js=original.filter(m=>m.path.endsWith('.js')),changes=[],library=JSON.parse(fs.readFileSync('assets/production/audio/delivery/library.json'));
fs.mkdirSync(masters);
for(const track of library.tracks){
  const master=original.filter(m=>m.path.startsWith('assets/'+track.id+'-')&&m.path.endsWith('.wav')),compressed=original.filter(m=>m.path.startsWith('assets/'+track.id+'-')&&m.path.endsWith('.mp3'));
  assert.equal(master.length,1);assert.equal(compressed.length,1);assert.equal(master[0].sha256,track.masterSha256);assert.equal(compressed[0].sha256,track.deliverySha256);
  const name=path.basename(master[0].path),url='https://raw.githubusercontent.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/'+commit+'/'+track.masterPath;
  let count=0;for(const m of js){const file=candidate+'/'+m.path,text=fs.readFileSync(file,'utf8'),hits=text.split(name).length-1;if(hits){count+=hits;fs.writeFileSync(file,text.replaceAll(name,url));}}
  assert.equal(count,1,'Replace only the exact emitted original-master URL: '+name);
  fs.renameSync(candidate+'/'+master[0].path,masters+'/'+name);
  changes.push({id:track.id,emittedMaster:name,masterURL:url,masterSha256:track.masterSha256,masterBytes:master[0].bytes,compressedFile:path.basename(compressed[0].path),compressedSha256:track.deliverySha256,compressedBytes:compressed[0].bytes});
}
assert.equal(changes.length,67);
for(const m of js){let reversed=fs.readFileSync(candidate+'/'+m.path,'utf8');for(const c of changes)reversed=reversed.replaceAll(c.masterURL,c.emittedMaster);assert.equal(sha(Buffer.from(reversed)),m.sha256,'Deployment packaging changed executable behavior');}
const main=fs.readFileSync(candidate+'/'+original.find(m=>/assets\/index-.*\.js$/.test(m.path)).path,'utf8');assert(main.includes(endpoint));
for(const marker of['id="testing-coins"','id="testing-apply"','<select id="opening-boss"','class="setup-build"'])assert(!main.includes(marker));
assert(!fs.readFileSync(candidate+'/'+original.find(m=>/offline\.worker-.*\.js$/.test(m.path)).path,'utf8').includes('testingCommand'));
// Both resolved directories are inside output; preserve the complete old build before replacement.
assert(path.resolve(publication+'/build').startsWith(outputRoot));fs.renameSync(publication+'/build',oldBuild);
fs.cpSync(candidate,publication+'/build',{recursive:true,force:false,errorOnExist:true});
fs.cpSync('docs/licenses',publication+'/build/licenses',{recursive:true,force:false,errorOnExist:true});
fs.copyFileSync('LICENSE',publication+'/build/LICENSE.txt');fs.copyFileSync('THIRD_PARTY_NOTICES.md',publication+'/build/THIRD_PARTY_NOTICES.md');
const members=walk(publication+'/build').map(f=>({path:f.slice((publication+'/build/').length),bytes:fs.statSync(f).size,sha256:sha(fs.readFileSync(f))}));
const manifest={buildId:JSON.parse(fs.readFileSync('src/shared/update-history.json')).buildId,releaseRepair:'browser-compatibility-01',audience:'public',protocol:43,gameSourceCommit:commit,backendSourceCommit,runtimeSourceSha256:gate.runtimeSourceSha256,endpoint,testingUIExcluded:true,testingWorkerCommandsExcluded:true,files:members.length,bytes:members.reduce((n,m)=>n+m.bytes,0),members,audioMasterFallbacks:changes};
fs.writeFileSync(publication+'/build/contest-build.json',JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(publication+'/audio-delivery.json',JSON.stringify({gameSourceCommit:commit,changes},null,2)+'\n');
fs.writeFileSync(publication+'/SOURCE.json',JSON.stringify({gameRepository:'https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-.git',gameSourceCommit:commit,backendSourceCommit,buildId:manifest.buildId,audience:'public',protocol:43,releaseRepair:manifest.releaseRepair,buildEnvironment:{VITE_GAME_AUDIENCE:'public',VITE_GAME_SERVER:endpoint},commands:[['pnpm','install','--frozen-lockfile'],['pnpm','build:public']],binaryAssets:'Complete archive includes all emitted dependencies except bulky original music masters; all67compressed primary tracks remain local. Original-master fallbacks are pinned to the full game source and verified by SHA256. See audio-delivery.json and build/contest-build.json.',verification:'950 local tests and complete content/type/build/atlas gate; API fallback and responsive geometry regressions. Exact-source CI is recorded in the full game repository. No rendered browser/device/listening acceptance is claimed.'},null,2)+'\n');
fs.writeFileSync(publication+'/README.md','# Grave Accord public browser repair\n\nThis public-only snapshot contains the browser sizing, centered boss header and Firefox-compatible music repair from source '+commit+'. Full source, tests, art provenance and review evidence are in https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest- .\n\nSOURCE.json and build/contest-build.json pin exact dependencies and the unchanged compatible protocol43 backend. All67compressed music tracks and every sound effect are packaged locally. Bulky original music masters remain available as hash-verified source-pinned fallbacks. Generated binary media is excluded from Git transport but included in the deployment archive. Only the public browser audience is published.\n');
fs.writeFileSync(scope+'/site-preparation-02.json',JSON.stringify({preparedAt:new Date().toISOString(),passed:true,gameSourceCommit:commit,backendSourceCommit,backendAuthorityUnchanged:true,endpoint,files:members.length+1,bytes:manifest.bytes,originalBuildPreservedAt:oldBuild,originalMastersPreservedAt:masters,compressedTracks:67,changes,jsBehaviorReversedExactly:true,jsFiles:js.length,publicOnly:true,limits:['Static build and exact byte/API/controller verification only; no rendered browser, physical-device or listening acceptance.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,gameSourceCommit:commit,files:members.length+1,bytes:manifest.bytes,compressedTracks:67,backendAuthorityUnchanged:true}));
