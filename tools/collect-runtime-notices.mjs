import {createRequire} from 'node:module';
import {readFileSync,readdirSync,existsSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=JSON.parse(readFileSync('package.json','utf8')),seen=new Map();
const extra=JSON.parse(readFileSync('docs/licenses/extra-notice-sources.json','utf8'));
function visit(name,from){
  const require=createRequire(from);let entry;try{entry=require.resolve(name);}catch{return;}
  let dir=dirname(entry),manifest;
  while(dirname(dir)!==dir){const path=join(dir,'package.json');if(existsSync(path)){const value=JSON.parse(readFileSync(path,'utf8'));if(value.name===name){manifest=value;break;}}dir=dirname(dir);}
  if(!manifest)throw Error('Cannot identify runtime package '+name);const id=manifest.name+'@'+manifest.version;if(seen.has(id))return;
  const notices=readdirSync(dir).filter(n=>/^(licen[cs]e|copying|notice)(\..*)?$/i.test(n));
  const target='docs/licenses/runtime/'+manifest.name.replaceAll('@','').replaceAll('/','--')+'-'+manifest.version;mkdirSync(target,{recursive:true});
  for(const name of notices)copyFileSync(join(dir,name),target+'/'+name);
  const copied=notices.map(n=>target+'/'+n),fallback=extra.find(e=>e.name===manifest.name&&e.version===manifest.version);
  if(!copied.length&&fallback){if(createHash('sha256').update(readFileSync(fallback.path)).digest('hex')!==fallback.sha256)throw Error('Changed extra copyright notice');copied.push(fallback.path);}
  seen.set(id,{name:manifest.name,version:manifest.version,license:manifest.license??null,notices:copied,...(fallback?{upstreamNotice:fallback.url}:{})});
  for(const dependency of Object.keys(manifest.dependencies??{}))visit(dependency,join(dir,'package.json'));
}
for(const name of Object.keys(root.dependencies))visit(name,new URL('../package.json',import.meta.url));
const packages=[...seen.values()].sort((a,b)=>(a.name+'@'+a.version).localeCompare(b.name+'@'+b.version));
writeFileSync('docs/licenses/runtime-inventory.json',JSON.stringify({scope:'Installed runtime dependency tree; browser and server packaging may use different subsets.',packages},null,2)+'\n');
console.log(JSON.stringify({packages:packages.length,noticeFiles:packages.reduce((n,p)=>n+p.notices.length,0),missing:packages.filter(p=>!p.notices.length).map(p=>p.name)}));
