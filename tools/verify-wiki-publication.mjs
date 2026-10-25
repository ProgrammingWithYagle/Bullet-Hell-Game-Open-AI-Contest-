// Native Wiki publication evidence. Git/HTTP verification is not browser QA.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const sourceCommit=process.argv[2];
assert(/^[a-f0-9]{40}$/.test(sourceCommit??''),'Supply the committed canonical Wiki source SHA');
const git=(directory,...args)=>execFileSync('git',['-C',directory,...args],{encoding:null});
const text=(directory,...args)=>git(directory,...args).toString('utf8').trim();
assert.equal(text('.wiki-checkout','remote','get-url','origin'),'https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-.wiki.git');
const publishedCommit=text('.wiki-checkout','ls-remote','origin','refs/heads/master').split(/\s+/)[0];
assert.equal(text('.wiki-checkout','rev-parse','HEAD'),publishedCommit,'Remote Wiki head differs from the inspected checkout');
const files=readdirSync('docs/wiki').filter(n=>n.endsWith('.md')).sort();
assert.equal(files.length,17);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const evidence=files.map(file=>{
  const source=git('.','show',sourceCommit+':docs/wiki/'+file),published=git('.wiki-checkout','show',publishedCommit+':'+file);
  assert(source.equals(published),'Published Wiki differs from canonical source: '+file);
  assert.equal(readFileSync('docs/wiki/'+file,'utf8').replaceAll('\r\n','\n'),source.toString('utf8'),'Canonical disk text differs from committed source: '+file);
  return {file,bytes:source.length,sha256:sha(source)};
});
const imageManifest=JSON.parse(readFileSync('docs/wiki-images.json','utf8'));
const imageFiles=imageManifest.files.map(file=>{
  assert(/^images\/[a-z0-9-]+\.jpg$/.test(file.path));
  const source=git('.','show',sourceCommit+':docs/wiki/'+file.path),published=git('.wiki-checkout','show',publishedCommit+':'+file.path);
  assert(source.equals(published),'Published image differs: '+file.path);assert.equal(sha(source),file.sha256);
  return {file:file.path,bytes:source.length,sha256:sha(source)};
});
const imageChecks=[];
for(const file of imageFiles){
  const url='https://raw.githubusercontent.com/wiki/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/'+file.file;
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,url);
  const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),file.sha256,'Public image bytes: '+file.file);
  imageChecks.push({url,status:response.status,bytes:bytes.length,sha256:sha(bytes)});
}
const publicChecks=await Promise.all(['','/Getting-Started','/Art-Gallery','/Bosses'].map(async route=>{
  const url='https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki'+route;
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)}),html=await response.text();
  const result={url,status:response.status,publicPlaytestLinkPresent:html.includes('https://grave-accord-playtest.ivoryflame12.chatgpt.site/')};
  assert.equal(result.status,200);if(!route||route==='/Getting-Started')assert(result.publicPlaytestLinkPresent,'Published page is missing the playtest link');
  if(route==='/Art-Gallery'||route==='/Bosses')assert(html.includes('raw.githubusercontent.com/wiki/ProgrammingWithYagle/'),'Published gallery is missing image references');return result;
}));
const report={createdAt:new Date().toISOString(),passed:true,sourceCommit,publishedCommit,pages:evidence.length,files:evidence,images:imageFiles,imageChecks,publicChecks,
  limits:['Canonical committed Markdown blobs match all seventeen published Git Wiki Markdown blobs and all eleven image blobs; filesystem CRLF is normalized explicitly.','Four anonymous public HTTP pages and eleven exact public image responses checked; no rendered Wiki browser or native-language review claimed.','Runtime PR remains draft and full-game release gates remain open.']};
writeFileSync('reviews/wiki-runtime-publication.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,sourceCommit,publishedCommit,pages:evidence.length,images:imageFiles.length,publicChecks}));
