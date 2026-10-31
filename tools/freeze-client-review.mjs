import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {build} from 'esbuild';

const [commit,audience,scope,clientPort,serverPort]=process.argv.slice(2);
assert(/^[a-f0-9]{40}$/.test(commit??''));assert(['testing','public'].includes(audience));assert(/^reviews\/[a-z0-9-]+$/.test(scope??''));
assert([clientPort,serverPort].every(p=>/^\d+$/.test(p)&&Number(p)>1024&&Number(p)<65536));
const git=(...args)=>execFileSync('git',['-c','core.bare=false',...args],{maxBuffer:16*1024*1024}).toString().trim();
assert.equal(git('rev-parse','HEAD'),commit);
const walk=d=>fs.readdirSync(d).sort().flatMap(n=>{const f=d+'/'+n;assert(!fs.lstatSync(f).isSymbolicLink());return fs.statSync(f).isDirectory()?walk(f):[f];});
const sha=b=>createHash('sha256').update(b).digest('hex');
const inputs=[...walk('src'),...walk('tests'),'package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.ts','index.html'].sort();
const fingerprint=()=>{const runtime=createHash('sha256'),snapshot=createHash('sha256');for(const f of inputs){const b=fs.readFileSync(f);snapshot.update(f+'\0').update(b);if(f.startsWith('src/'))runtime.update(f+'\0').update(b);}return {runtimeSourceSha256:runtime.digest('hex'),sourceSnapshotSha256:snapshot.digest('hex')};};
const gate=JSON.parse(fs.readFileSync('reviews/runtime-verification.json')),before=fingerprint();assert(gate.passed);assert.equal(gate.runtimeSourceSha256,before.runtimeSourceSha256);assert.equal(gate.sourceSnapshotSha256,before.sourceSnapshotSha256);
assert.equal(git('diff',commit,'--','src','tests','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.ts','index.html'),'','Uncommitted runtime inputs');
const label=path.basename(scope),root='output/playtest-'+label+'-'+audience+'-'+commit.slice(0,7),outputPrefix=path.resolve('output')+path.sep;
assert(path.resolve(root).startsWith(outputPrefix));assert(!fs.existsSync(root),'Preserve a current review root');
const endpoint='http://127.0.0.1:'+serverPort,url='http://127.0.0.1:'+clientPort+'/';
if(audience==='testing'){
  // Reuse the exact optimized testing output that already passed the complete gate.
  assert.equal(path.resolve('dist'),path.join(process.cwd(),'dist'));assert(fs.existsSync('dist'));
  for(const m of gate.artifacts){assert.equal(sha(fs.readFileSync(m.path)),m.sha256);}
  fs.renameSync('dist',root);
}else{
  const r=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',root,'--logLevel','warn'],{encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,VITE_GAME_AUDIENCE:audience,VITE_GAME_SERVER:endpoint}});
  fs.writeFileSync('output/'+label+'-'+audience+'-build.log',(r.stdout??'')+(r.stderr??''));assert.equal(r.status,0);
}
assert.deepEqual(fingerprint(),before,'Runtime inputs changed during the build');
const js=walk(root).filter(f=>f.endsWith('.js')),main=js.filter(f=>!path.basename(f).startsWith('offline.worker-')).map(f=>fs.readFileSync(f,'utf8')).join('\n'),worker=js.find(f=>path.basename(f).startsWith('offline.worker-'));
assert(main.includes(endpoint));for(const marker of['id="testing-coins"','id="testing-apply"','<select id="opening-boss"','class="setup-build"'])assert.equal(main.includes(marker),audience==='testing',marker);
assert.equal(fs.readFileSync(worker,'utf8').includes('testingCommand'),audience==='testing');
for(const marker of['combat-action-dock','hud-actions','room-invite-hud','data-password-toggle','host-pause-match'])assert(main.includes(marker),marker);
const backend='output/frozen-'+label+'-'+commit.slice(0,7)+'.mjs';
if(!fs.existsSync(backend))await build({entryPoints:['src/server/index.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:backend,logLevel:'silent'});
const identity={sourceCommit:commit,buildId:JSON.parse(fs.readFileSync('src/shared/update-history.json')).buildId,protocol:43,contentRevision:JSON.parse(fs.readFileSync('content/revision.json')).sha256,audience,...before,endpoint};
fs.writeFileSync(root+'/preview-build.json',JSON.stringify(identity,null,2)+'\n');
const members=walk(root).map(f=>({path:f.slice(root.length+1),bytes:fs.statSync(f).size,sha256:sha(fs.readFileSync(f))}));
const manifest={passed:true,...identity,root:path.resolve(root),url,files:members.length,bytes:members.reduce((n,m)=>n+m.bytes,0),members,backend:{path:path.resolve(backend),bytes:fs.statSync(backend).size,sha256:sha(fs.readFileSync(backend)),externalProjectNodeModulesRequired:true}};
const manifestPath='output/'+label+'-'+audience+'-files.json';fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(scope+'/preview-'+audience+'.json',JSON.stringify({passed:true,...identity,url,root:manifest.root,files:manifest.files,bytes:manifest.bytes,backend:manifest.backend,manifestPath:path.resolve(manifestPath),manifestSha256:sha(fs.readFileSync(manifestPath)),testingBranchesIsolated:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,sourceCommit:commit,audience,url,files:manifest.files,runtimeSourceSha256:before.runtimeSourceSha256}));
