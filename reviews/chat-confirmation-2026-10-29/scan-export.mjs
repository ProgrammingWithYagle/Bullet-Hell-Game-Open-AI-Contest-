import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const label=process.argv[2]??'source';assert(/^(source(?:-\d{2})?|metadata-\d{2})$/.test(label));
const target='reviews/chat-confirmation-2026-10-29/'+(label==='source'?'export-payload-check':label+'-export-check')+'.json';
assert(!fs.existsSync(target),'Preserve an existing scan; choose a new metadata label');
const git=(...args)=>execFileSync('git',['-c','core.bare=false',...args],{maxBuffer:32*1024*1024});
const names=git('diff','--cached','--name-only','-z','--diff-filter=ACMR').toString().split('\0').filter(n=>n&&n!==target);
const patterns=[/gh[pousr]_[A-Za-z0-9]{20,}/,/github_pat_[A-Za-z0-9_]{20,}/,/AKIA[0-9A-Z]{16}/,/sk-(?:proj-)?[A-Za-z0-9_-]{32,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const members=[],findings=[];
for(const name of names){const bytes=git('show',':'+name),isText=!bytes.includes(0);if(isText&&patterns.some(p=>p.test(bytes.toString('utf8'))))findings.push(name);members.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),textScanned:isText});}
assert.equal(findings.length,0,'Credential-pattern findings: '+findings.join(','));
fs.writeFileSync(target,JSON.stringify({checkedAt:new Date().toISOString(),passed:true,label,scope:'Current staged changes excluding this receipt; bounded pattern scan, not complete secret detection.',branch:git('branch','--show-current').toString().trim(),findings,members},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,label,files:members.length,findings:0,receipt:target}));
