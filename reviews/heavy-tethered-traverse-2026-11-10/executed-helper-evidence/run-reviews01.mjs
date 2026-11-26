import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root,scope,write} from './cycle-common11.mjs';
process.chdir(root);
const [audience]=process.argv.slice(2),attempt='native01';
assert(['testing','public'].includes(audience));
const probe=fileURLToPath(new URL('native-probe01.mts',import.meta.url)),checks=[];
const postVariants=['standard','keyed','open'].flatMap(h=>['loose','spade','floating'].map(m=>'post-'+h+'-'+m));
const variants=group=>['cover',group==='worker'?'fuse':'exit','compact','frontal','running','hanging','seam-manual','seam-running','seam-hanging','traverse-loose','traverse-spade','traverse-floating','clutch-loose','clutch-spade','clutch-floating','handling-keyed-loose','handling-keyed-spade','handling-keyed-floating','handling-open-loose','handling-open-spade','handling-open-floating',...postVariants];
async function run(label,file,args,cases) {
  const log=scope+'/'+attempt+'-'+audience+'-'+label+'.log';assert(!fs.existsSync(log));
  const startedAt=new Date().toISOString(),out=fs.createWriteStream(log,{flags:'wx'});
  const child=spawn(process.execPath,['--import','tsx',file,...args],{stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',b=>out.write(b));child.stderr.on('data',b=>out.write(b));
  const status=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
  await new Promise(resolve=>out.end(resolve));
  const row={label,cases,passed:status===0,startedAt,finishedAt:new Date().toISOString(),log};checks.push(row);
  console.log(JSON.stringify({audience,...row,tail:fs.readFileSync(log,'utf8').slice(-300)}));
  if(status!==0)throw Error(label+' failed; preserve and inspect the partial evidence before any retry.');
}
try {
  await run('http','tools/smoke-client-review.mts',[audience,scope],1);
  await run('guide',probe,[audience,'guide'],84);
  const groups=await Promise.allSettled(['worker','room'].map(async group=>{for(const variant of variants(group))await run(group+'-'+variant,probe,[audience,group,variant],1);}));
  for(const group of groups)if(group.status==='rejected')throw group.reason;
  const report={passed:true,checkedAt:new Date().toISOString(),audience,attempt,groups:4,cases:checks.reduce((n,c)=>n+c.cases,0),invocations:checks.length,checks,
    wholeExactServedOptimizedWorkerCases:30,realPeerCases:30,sourceBoundUIControlAndPrivatePresentationCases:84,
    newPostOrdinaryWorkerCases:9,newPostOrdinaryNonhostOwnerPeerCases:9,
    originalTimeoutsAndPoliciesRetained:true,noBrowserAutomation:true,
    limits:[
      'HTTP1 +84 source-bound UI/control/prediction/private-presentation/Scene/sound cases +30 whole exact-served optimized Solo workers +30 real peers. All21 retained worker/peer variants execute again alongside nine new post variants.',
      'Every new post variant earns actual Short3→9→15→21 through three real clears, using actual source MenuDOM purchases for initial3SP, optional fitting, Clutch/optional handling and the later capstone. The Heavy is the nonhost owner in a Soldier-hosted room.',
      'Post proof measures real fixed origins, original slot/round/recovery conservation, separate lift/reengage/stake commands, actual walking while posted, pause rejection, owner-only friendly streams, shared operation sounds, a late peer without ownership and actual host removals. Contacts may be zero.',
      'Controlled source fixtures, actual earned transport proof and natural/replay outcomes remain distinct. No rendered/browser/device/native-language/listening/motion/human enjoyment/final-balance or class/game completion is claimed.',
    ]};
  assert.equal(report.cases,145);assert.equal(report.invocations,62);
  write(scope+'/'+attempt+'-'+audience+'.json',report);
  console.log(JSON.stringify({passed:true,audience,cases:145,groups:4,invocations:62}));
} catch(error) {
  write(scope+'/'+attempt+'-'+audience+'-partial.json',{passed:false,checkedAt:new Date().toISOString(),checks,error:String(error)});throw error;
}
