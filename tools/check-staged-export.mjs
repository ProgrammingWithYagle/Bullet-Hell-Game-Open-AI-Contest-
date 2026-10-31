import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const target=process.argv[2];assert(/^reviews\/[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(target??''));assert(!fs.existsSync(target));
const git=(...a)=>execFileSync('git',['-c','core.bare=false',...a],{maxBuffer:32*1024*1024});
const names=git('diff','--cached','--name-only','-z','--diff-filter=ACMR').toString().split('\0').filter(n=>n&&n!==target);
const removed=git('diff','--cached','--name-only','-z','--diff-filter=D').toString().split('\0').filter(Boolean);
const patterns=[/gh[pousr]_[A-Za-z0-9]{20,}/,/github_pat_[A-Za-z0-9_]{20,}/,/AKIA[0-9A-Z]{16}/,/sk-(?:proj-)?[A-Za-z0-9_-]{32,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const objects=execFileSync('git',['-c','core.bare=false','cat-file','--batch'],{input:names.map(n=>':'+n+'\n').join(''),maxBuffer:256*1024*1024}),hash=createHash('sha256'),findings=[];
let cursor=0,bytes=0,textFiles=0;
for(const name of names){assert(!/[\r\n]/.test(name));const end=objects.indexOf(10,cursor),match=objects.subarray(cursor,end).toString().match(/^[a-f0-9]{40} blob (\d+)$/);assert(match);const length=Number(match[1]),start=end+1,b=objects.subarray(start,start+length);cursor=start+length+1;bytes+=length;hash.update(name+'\0').update(b);if(!b.includes(0)){textFiles++;if(patterns.some(p=>p.test(b.toString())))findings.push(name);}}
assert.equal(cursor,objects.length);assert.equal(findings.length,0,'Potential credential patterns: '+findings.join(','));
const report={checkedAt:new Date().toISOString(),passed:true,files:names.length,bytes,textFiles,deletedFiles:removed.length,stagedPayloadSha256:hash.digest('hex'),findings,scope:'Bounded pattern scan of staged additions/changes, excluding this receipt. This is not complete secret detection. Compact fingerprint; no copied resource inventory.'};
fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
