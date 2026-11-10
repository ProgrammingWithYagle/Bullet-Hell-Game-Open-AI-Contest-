import fs from 'node:fs';
import assert from 'node:assert/strict';
const stage = new URL('./', import.meta.url);
let s=fs.readFileSync(new URL('prepare-source01.mjs',stage),'utf8');
s=s.replaceAll('gate01.log','gate02.log').replaceAll('gate01-result.json','gate02-result.json').replaceAll('/full-gate01.json','/full-gate02.json');
const from=s.indexOf("for (const name of ['gate02.log'");const to=s.indexOf('\nfs.copyFileSync',from);assert(from>0&&to>from);
s=s.slice(0,from)+"for (const name of ['gate02.log','gate02-result.json','normalize-admission02.mjs','run-gate02.mjs','prepare-lf-cycle03.mjs']) fs.copyFileSync(stage+'/'+name,scope+'/'+name,fs.constants.COPYFILE_EXCL);"+s.slice(to);
const natural="fs.writeFileSync(scope + '/natural-replay-summary.json', naturalBytes, { flag: 'wx' });";assert(s.includes(natural));
s=s.replace(natural,"assert.equal(sha(fs.readFileSync(scope+'/natural-replay-summary.json')),sha(naturalBytes));");
const provStart=s.indexOf("fs.writeFileSync(scope + '/natural-replay-provenance.json'");const provEnd=s.indexOf('\nfor (const f',provStart);assert(provStart>0&&provEnd>provStart);
s=s.slice(0,provStart)+"assert(read(scope+'/natural-replay-provenance.json').runtimeExactlyIdenticalToOriginalExecution);"+s.slice(provEnd);
s=s.replace("'-art.json'", "'-art02.json'");
const at=s.indexOf("fs.appendFileSync('handoff/NEXT_CHAT.md'");const end=s.indexOf('\nconsole.log',at);assert(at>0&&end>at);
s=s.slice(0,at)+"fs.appendFileSync('handoff/NEXT_CHAT.md',"+JSON.stringify('\n\nFinal stat-proof gate02 repeats all2,161tests/all7after removing only13CRbytes from tools/verify.mjs to satisfy the existing LF contract. Gate01and its raw driver/source-preparation receipt remain preserved. Runtime/content/tests are unchanged by this normalization; final verifier207175ba295b17adf64bb9c63c7d00df507c4f0142faf9bcac7ea83dcf66e09b now binds the exact committed bytes. Source publication/CI/fresh5380/5381review remain pending until verified live.\n')+");"+s.slice(end);
fs.writeFileSync(new URL('prepare-source02.mjs',stage),s,{flag:'wx'});
s=fs.readFileSync(new URL('commit-source01.mjs',stage),'utf8').replaceAll('source-commit-plan01','source-commit-plan02');
const marker="for(const f of logs)assert.equal";assert(s.includes(marker));
s=s.replace(marker,"for(const f of code)assert.equal(sha(execFileSync('git',['-c','core.bare=false','show',':'+f],{maxBuffer:32*1024*1024})),sha(fs.readFileSync(f)),f);\n"+marker);
fs.writeFileSync(new URL('commit-source02.mjs',stage),s,{flag:'wx'});
for(const [from,to] of [['freeze-reviews01.mjs','freeze-reviews02.mjs'],['verify-frozen01.mjs','verify-frozen02.mjs']]){
 const raw=fs.readFileSync(new URL(from,stage),'utf8');
 const next=raw.replaceAll("scope+'/full-gate01.json'","scope+'/full-gate02.json'").replace("gate:'full-gate01.json'","gate:'full-gate02.json'");
 assert(raw!==next);fs.writeFileSync(new URL(to,stage),next,{flag:'wx'});
}
console.log(JSON.stringify({preparedOnly:true,gate01Preserved:true,sourceAndDriverIndexHashesGuarded:true,newGate02Required:true}));
