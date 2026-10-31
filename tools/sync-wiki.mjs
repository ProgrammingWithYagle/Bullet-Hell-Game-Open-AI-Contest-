// Publish committed canonical pages, then verify all published page and image blobs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [source,scope]=process.argv.slice(2);
assert(/^[a-f0-9]{40}$/.test(source??''));assert(/^reviews\/[a-z0-9-]+$/.test(scope??''));
const repository='https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-';
const git=(dir,...args)=>execFileSync('git',['-c','core.bare=false','-C',dir,...args],{maxBuffer:32*1024*1024});
const text=(dir,...args)=>git(dir,...args).toString().trim();
assert.equal(text('.','remote','get-url','origin'),repository+'.git');
assert.equal(text('.wiki-checkout','remote','get-url','origin'),repository+'.wiki.git');
assert.equal(text('.wiki-checkout','status','--porcelain'),'','Wiki working tree must be clean');
assert.equal(text('.','ls-remote','origin','refs/heads/feat/first-playable-loop').split(/\s+/)[0],source,'Push canonical source first');
const before=text('.wiki-checkout','rev-parse','HEAD');
assert.equal(text('.wiki-checkout','ls-remote','origin','refs/heads/master').split(/\s+/)[0],before,'Remote Wiki changed; inspect before updating');
const pages=fs.readdirSync('docs/wiki').filter(n=>n.endsWith('.md')).sort();assert.equal(pages.length,18);
const imageManifest=JSON.parse(git('.','show',source+':docs/wiki-images.json'));
const images=imageManifest.files.map(f=>{assert(/^images\/[a-z0-9-]+\.(png|jpg)$/.test(f.path));return f.path;});assert.equal(images.length,34);
const names=[...pages,...images],sha=b=>createHash('sha256').update(b).digest('hex');
function blobs(dir,revision,prefix=''){
  const bytes=execFileSync('git',['-c','core.bare=false','-C',dir,'cat-file','--batch'],{input:names.map(n=>revision+':'+prefix+n+'\n').join(''),maxBuffer:32*1024*1024});
  const result=new Map();let cursor=0;
  for(const name of names){const end=bytes.indexOf(10,cursor),header=bytes.subarray(cursor,end).toString().match(/^[a-f0-9]{40} blob (\d+)$/);assert(header,name);const start=end+1,length=Number(header[1]);result.set(name,bytes.subarray(start,start+length));cursor=start+length+1;}
  assert.equal(cursor,bytes.length);return result;
}
const canonical=blobs('.',source,'docs/wiki/'),old=blobs('.wiki-checkout',before),changed=[];
for(const name of pages){const bytes=canonical.get(name);assert.equal(fs.readFileSync('docs/wiki/'+name,'utf8').replaceAll('\r\n','\n'),bytes.toString(),'Uncommitted canonical page '+name);if(!bytes.equals(old.get(name)))changed.push(name);}
for(const image of imageManifest.files){assert.equal(sha(canonical.get(image.path)),image.sha256);assert(canonical.get(image.path).equals(old.get(image.path)),'This update does not replace Wiki artwork');}
const allowed=new Set(['Audio.md','Changelog.md','Getting-Started.md','Home.md','Hosting-and-Recovery.md','Leaderboards.md']);
for(const name of changed)assert(allowed.has(name),'Unexpected changed page '+name);
if(changed.length){for(const name of changed)fs.writeFileSync('.wiki-checkout/'+name,canonical.get(name));git('.wiki-checkout','add','--',...changed);git('.wiki-checkout','commit','-m','Document the final public polish and retained limits');git('.wiki-checkout','push','origin','HEAD:master');}
const publishedCommit=text('.wiki-checkout','rev-parse','HEAD');assert.equal(text('.wiki-checkout','ls-remote','origin','refs/heads/master').split(/\s+/)[0],publishedCommit);
const published=blobs('.wiki-checkout',publishedCommit),aggregate=createHash('sha256');
for(const name of names){assert(canonical.get(name).equals(published.get(name)),'Published blob differs '+name);aggregate.update(name+'\0').update(canonical.get(name));}
const http=await Promise.all(['','/Getting-Started','/Art-Gallery','/Bosses'].map(async route=>{const url=repository+'/wiki'+route,response=await fetch(url,{signal:AbortSignal.timeout(25000)}),html=await response.text();assert.equal(response.status,200,url);if(!route||route==='/Getting-Started')assert(html.includes('https://grave-accord.yigallin0423.chatgpt.site/'));return {url,status:response.status};}));
const report={verifiedAt:new Date().toISOString(),passed:true,sourceCommit:source,before,publishedCommit,pagesChanged:changed,pages:pages.length,images:images.length,publishedPayloadSha256:aggregate.digest('hex'),remoteHeadVerified:true,http,scope:'All eighteen committed page blobs and thirty-four existing image blobs match the published Wiki. Four anonymous page responses checked. No rendered or native-language acceptance; compact fingerprint without copied resources.'};
fs.writeFileSync(scope+'/wiki-publication.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,sourceCommit:source,publishedCommit,pages:pages.length,images:images.length,pagesChanged:changed}));
