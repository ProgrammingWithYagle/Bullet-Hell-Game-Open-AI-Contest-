// Publish the reviewed preproduction packet. No playable-release claim or credentials in assets.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const repo='ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-';
const target='c3f60ca4125bea31d94c9d3f6ea0c9d3f0853df1',tag='v0.2.0-stage1';
const credential=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
const token=credential.stdout?.split('\n').find(x=>x.startsWith('password='))?.slice(9);
if(!token)throw Error('Configured repository credential unavailable.');
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'};
async function api(route,body){
  const res=await fetch('https://api.github.com/repos/'+repo+route,{headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});
  if(res.status===404&&!body)return null;
  const result=await res.json();if(!res.ok)throw Error(res.status+' '+result.message);return result;
}
const evidence=JSON.parse(fs.readFileSync('reviews/stage1-delivery-review.json','utf8'));
if(!evidence.passed||evidence.version!=='0.2.0')throw Error('Current validated delivery evidence required.');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if(hash(evidence.pdf.path)!==evidence.pdf.sha256||hash(evidence.archive.path)!==evidence.archive.sha256)throw Error('Sealed release artifact changed.');
const files=[evidence.archive.path,evidence.pdf.path,'reviews/stage1-delivery-review.json'];
const checksums='output/stage1/RELEASE-SHA256SUMS-v0.2.0.txt';
fs.writeFileSync(checksums,files.map(f=>hash(f)+'  '+path.basename(f)).join('\n')+'\n');files.push(checksums);
let release=await api('/releases/tags/'+tag);
release??=await api('/releases',{tag_name:tag,target_commitish:target,name:'Grave Accord - Stage 1 production packet 0.2.0',prerelease:true,draft:false,make_latest:'false',body:'A downloadable preproduction design, art and audio packet. **This is not a playable game build.**\n\nThe expanded specification authors sixty distinct bosses: fifty in separate timed-route pools, nine Endless exclusives and The Uncounted. Includes a 72-page illustrated bible, editable definitions and balance tables, fifteen AI-authored language catalogs, original art/animation proofs, two music loops and twenty-five SFX.\n\nSource, secure fresh extraction and a normal Windows copy passed per-file size and SHA-256 checks. See the attached verification report and checksums. Gameplay, networking/performance, complete production assets, physical-device checks and human/native-speaker review remain subsequent gates.\n\nSource: '+target+'.'});
const ref=await api('/git/ref/tags/'+tag);if(ref?.object.sha!==target)throw Error('Release tag does not identify the validated source commit.');
const assets=[];
for(const file of files){
  const name=path.basename(file),size=fs.statSync(file).size,sha=hash(file);
  let asset=release.assets.find(a=>a.name===name);
  if(!asset){
    const url=new URL(release.upload_url.replace(/\{.*$/,''));
    if(url.hostname!=='uploads.github.com'||!url.pathname.startsWith('/repos/'+repo+'/releases/'))throw Error('Unexpected upload destination.');
    url.searchParams.set('name',name);
    const res=await fetch(url,{method:'POST',headers:{...headers,'Content-Type':file.endsWith('.zip')?'application/zip':file.endsWith('.pdf')?'application/pdf':'application/octet-stream','Content-Length':String(size)},body:fs.createReadStream(file),duplex:'half'});
    asset=await res.json();if(!res.ok)throw Error('Upload '+name+': '+res.status+' '+asset.message);
  }
  if(asset.size!==size||asset.state!=='uploaded'||asset.digest!=='sha256:'+sha)throw Error('Remote asset digest/size/state mismatch: '+name);
  assets.push({name,bytes:size,sha256:sha,url:asset.browser_download_url,remoteDigestVerified:true});
  console.log(JSON.stringify({name,bytes:size,verified:true}));
}
const report={schemaVersion:1,release:release.html_url,tag,sourceCommit:target,prerelease:release.prerelease,playableGame:false,assets};
fs.writeFileSync('reviews/github-stage1-release.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({release:release.html_url,assets:assets.length}));
