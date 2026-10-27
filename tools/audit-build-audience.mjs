import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const walk=dir=>fs.readdirSync(dir).sort().flatMap(name=>{const p=path.join(dir,name);return fs.statSync(p).isDirectory()?walk(p):[p]});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const builds={};
for(const [audience,dir,endpoint] of [['testing','dist','http://127.0.0.1:2568'],['public','dist-public','http://127.0.0.1:2569']]){
 const files=walk(dir),js=files.filter(p=>p.endsWith('.js'));
 const workers=js.filter(p=>path.basename(p).startsWith('offline.worker-'));
 assert.equal(workers.length,1);
 const worker=fs.readFileSync(workers[0],'utf8');
 const main=js.filter(p=>!workers.includes(p)).map(p=>fs.readFileSync(p,'utf8')).join('\n');
 const exposed=Object.fromEntries(['testing-tools-panel','testing-coins','testing-sp','testing-apply','testing-unlock-home','ga-testing-difficulties'].map(id=>[id,main.includes(id)]));
 assert(Object.values(exposed).every(value=>value===(audience==='testing')),'Wrong exposed audience menu ids: '+JSON.stringify(exposed));
 assert.equal(worker.includes('testingCommand'),audience==='testing','Wrong worker command audience');
 assert(main.includes(endpoint),'Expected matching local QA endpoint missing');
 if(audience==='public')assert(!main.includes('id="opening-boss"'),'Public boss selector markup leaked');
 const artifacts=files.map(p=>{const body=fs.readFileSync(p);return {path:p.replaceAll('\\','/'),bytes:body.length,sha256:sha(body)}});
 builds[audience]={passed:true,audience,endpoint,files:files.length,bytes:artifacts.reduce((n,f)=>n+f.bytes,0),worker:path.basename(workers[0]),workerCommandPresent:worker.includes('testingCommand'),exposedMenuIds:exposed,artifacts};
}
const report={passed:true,createdAt:new Date().toISOString(),buildId:'2026.10.27-crossed-threshold',protocol:29,builds,limits:['Local build artifacts only; neither target has been deployed.','Unused translated label strings are permitted; public menu DOM ids and worker command branches are absent.','DOM/browser and matching backend checks are separate receipts.']};
fs.writeFileSync(process.argv[2]??'reviews/build-audience-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,builds:Object.fromEntries(Object.entries(builds).map(([k,v])=>[k,{...v,artifacts:undefined}]))}));
