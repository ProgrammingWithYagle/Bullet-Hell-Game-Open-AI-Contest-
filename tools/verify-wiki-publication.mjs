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
assert.equal(files.length,15);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const evidence=files.map(file=>{
  const source=git('.','show',sourceCommit+':docs/wiki/'+file),published=git('.wiki-checkout','show',publishedCommit+':'+file);
  assert(source.equals(published),'Published Wiki differs from canonical source: '+file);
  assert.equal(readFileSync('docs/wiki/'+file,'utf8').replaceAll('\r\n','\n'),source.toString('utf8'),'Canonical disk text differs from committed source: '+file);
  return {file,bytes:source.length,sha256:sha(source)};
});
const publicChecks=await Promise.all(['','/Getting-Started'].map(async route=>{
  const url='https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki'+route;
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)}),html=await response.text();
  const result={url,status:response.status,publicPlaytestLinkPresent:html.includes('https://grave-accord-playtest.ivoryflame12.chatgpt.site/')};
  assert.equal(result.status,200);assert(result.publicPlaytestLinkPresent,'Published page is missing the playtest link');return result;
}));
const report={createdAt:new Date().toISOString(),passed:true,sourceCommit,publishedCommit,pages:evidence.length,files:evidence,publicChecks,
  limits:['Canonical committed Markdown blobs match all fifteen published Git Wiki blobs; filesystem CRLF is normalized explicitly.','Two anonymous public HTTP pages checked; no rendered Wiki browser or native-language review claimed.','Runtime PR remains draft and full-game release gates remain open.']};
writeFileSync('reviews/wiki-runtime-publication.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,sourceCommit,publishedCommit,pages:evidence.length,publicChecks}));
