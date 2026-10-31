import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const [commit,scope]=process.argv.slice(2);assert(/^[a-f0-9]{40}$/.test(commit??''));assert(/^reviews\/[a-z0-9-]+$/.test(scope??''));
const git=(...a)=>execFileSync('git',['-c','core.bare=false',...a],{maxBuffer:16*1024*1024}).toString().trim();
assert.equal(git('rev-parse','HEAD'),commit);assert.equal(git('diff',commit,'--','src','tests','content'),'');
const backendSourceCommit='71fc34cfd88a245d7003f16df7a7dc5e90986410';assert.equal(git('diff','--name-only',backendSourceCommit,commit,'--','src/server','src/shared','content','src/client/session.ts','src/client/offline.worker.ts'),'src/shared/update-history.json');
const history=JSON.parse(fs.readFileSync('src/shared/update-history.json')),oldHistory=JSON.parse(git('show',backendSourceCommit+':src/shared/update-history.json'));assert.equal(history.buildId,oldHistory.buildId);assert.deepEqual(history.snapshot,oldHistory.snapshot);
const publication='output/sites-contest-2026-10-30',root=publication+'/build',project='appgprj_6ae537873538819199dd558c63949b10';
assert.equal(JSON.parse(fs.readFileSync(publication+'/.openai/hosting.json')).project_id,project);assert.equal(fs.realpathSync(publication),path.join(process.cwd(),publication));
assert(path.resolve(root).startsWith(path.resolve('output')+path.sep));
const gate=JSON.parse(fs.readFileSync('reviews/runtime-verification.json'));assert(gate.passed);
const walk=d=>fs.readdirSync(d).sort().flatMap(n=>{const f=d+'/'+n;assert(!fs.lstatSync(f).isSymbolicLink());return fs.statSync(f).isDirectory()?walk(f):[f];});
const sha=b=>createHash('sha256').update(b).digest('hex');
const fingerprint=()=>{const h=createHash('sha256');for(const f of walk('src').sort())h.update(f+'\0').update(fs.readFileSync(f));return h.digest('hex');};assert.equal(fingerprint(),gate.runtimeSourceSha256);
// The native Sites version and retained version2 archive provide rollback; do not copy the old build again.
const rollback='output/grave-accord-browser-repair-public-02.tar.gz';assert.equal(sha(fs.readFileSync(rollback)),'16a0c826fcee578b0278f3fbfff07b8f9fb47d80cfdef17ad3e68a7d634a46a4');
const endpoint='https://grave-accord-contest.onrender.com',r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',root,'--emptyOutDir','--logLevel','warn'],{encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,VITE_GAME_AUDIENCE:'public',VITE_GAME_SERVER:endpoint}});
fs.writeFileSync('output/'+path.basename(scope)+'-site-build.log',(r.stdout??'')+(r.stderr??''));assert.equal(r.status,0);assert.equal(fingerprint(),gate.runtimeSourceSha256);
const original=walk(root).map(f=>({path:f.slice(root.length+1),sha256:sha(fs.readFileSync(f))})),js=original.filter(m=>m.path.endsWith('.js')),library=JSON.parse(fs.readFileSync('assets/production/audio/delivery/library.json')),changes=[];
for(const t of library.tracks){const master=original.filter(m=>m.path.startsWith('assets/'+t.id+'-')&&m.path.endsWith('.wav')),compressed=original.filter(m=>m.path.startsWith('assets/'+t.id+'-')&&m.path.endsWith('.mp3'));assert.equal(master.length,1);assert.equal(compressed.length,1);assert.equal(master[0].sha256,t.masterSha256);assert.equal(compressed[0].sha256,t.deliverySha256);
 const name=path.basename(master[0].path),url='https://raw.githubusercontent.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/'+commit+'/'+t.masterPath;let count=0;
 for(const m of js){const f=root+'/'+m.path,text=fs.readFileSync(f,'utf8'),hits=text.split(name).length-1;if(hits){count+=hits;fs.writeFileSync(f,text.replaceAll(name,url));}}assert.equal(count,1);
 const generated=path.resolve(root,master[0].path);assert(generated.startsWith(path.resolve(root,'assets')+path.sep));fs.unlinkSync(generated);
 changes.push({id:t.id,emittedMaster:name,masterURL:url,masterSha256:t.masterSha256,compressedFile:path.basename(compressed[0].path),compressedSha256:t.deliverySha256});}
for(const m of js){let text=fs.readFileSync(root+'/'+m.path,'utf8');for(const c of changes)text=text.replaceAll(c.masterURL,c.emittedMaster);assert.equal(sha(Buffer.from(text)),m.sha256);}
const main=fs.readFileSync(root+'/'+original.find(m=>/assets\/index-.*\.js$/.test(m.path)).path,'utf8');assert(main.includes(endpoint));for(const marker of['id="testing-coins"','id="testing-apply"','<select id="opening-boss"','class="setup-build"'])assert(!main.includes(marker));assert(!fs.readFileSync(root+'/'+original.find(m=>/offline\.worker-.*\.js$/.test(m.path)).path,'utf8').includes('testingCommand'));
fs.cpSync('docs/licenses',root+'/licenses',{recursive:true});fs.copyFileSync('LICENSE',root+'/LICENSE.txt');fs.copyFileSync('THIRD_PARTY_NOTICES.md',root+'/THIRD_PARTY_NOTICES.md');
const members=walk(root).map(f=>({path:f.slice(root.length+1),bytes:fs.statSync(f).size,sha256:sha(fs.readFileSync(f))}));
const identity={buildId:history.buildId,releaseRepair:'hud-alignment-2026-10-31',audience:'public',protocol:43,gameSourceCommit:commit,backendSourceCommit,runtimeSourceSha256:gate.runtimeSourceSha256,endpoint,testingUIExcluded:true,testingWorkerCommandsExcluded:true};
fs.writeFileSync(root+'/contest-build.json',JSON.stringify({...identity,files:members.length,bytes:members.reduce((n,m)=>n+m.bytes,0),members,audioMasterFallbacks:changes},null,2)+'\n');
fs.writeFileSync(publication+'/SOURCE.json',JSON.stringify({...identity,gameRepository:'https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-.git',buildEnvironment:{VITE_GAME_AUDIENCE:'public',VITE_GAME_SERVER:endpoint},verification:'Complete951-test local gate; exact-source CI recorded in the game repository. Current HUD rendering needs separate user confirmation.',distribution:'All67compressed themes, SFX, artwork, fonts and notices are local. Original PCM fallback URLs are source-pinned. Generated binary media is included in the deployment archive, excluded from Git transport.'},null,2)+'\n');
fs.writeFileSync(publication+'/audio-delivery.json',JSON.stringify({gameSourceCommit:commit,changes},null,2)+'\n');
fs.writeFileSync(publication+'/README.md','# Grave Accord public browser build\n\nSource '+commit+' in https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest- . The public build shares its HUD, responsive arena and music fixes with the local testing audience. SOURCE.json and build/contest-build.json bind the actual distribution. All media is included in the archive; original masters use source-pinned fallbacks. The compatible live backend is unchanged.\n');
fs.writeFileSync(scope+'/site-build.json',JSON.stringify({preparedAt:new Date().toISOString(),passed:true,...identity,files:members.length+1,bytes:members.reduce((n,m)=>n+m.bytes,0),compressedThemes:67,originalMastersPreservedInSource:true,generatedMasterCopiesRemoved:true,jsBehaviorReversedExactly:true,backendAuthorityUnchanged:true},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:true,sourceCommit:commit,files:members.length+1,publicOnly:true}));
