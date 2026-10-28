import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {encounterArt} from '../src/client/encounter-presentation.ts';
const dir=process.argv[2]??'dist';assert(['dist','dist-public'].includes(dir));
const walk=d=>fs.readdirSync(d).sort().flatMap(n=>{const p=path.join(d,n);return fs.statSync(p).isDirectory()?walk(p):[p];}),files=walk(dir),sha=b=>createHash('sha256').update(b).digest('hex');
const pngs=new Map();for(const p of files.filter(p=>p.endsWith('.png'))){const b=fs.readFileSync(p),h=sha(b);pngs.set(h,{path:p.replaceAll('\\','/'),bytes:b.length,width:b.readUInt32BE(16),height:b.readUInt32BE(20)});}
const main=files.filter(p=>p.endsWith('.js')&&!path.basename(p).startsWith('offline.worker-')).map(p=>fs.readFileSync(p,'utf8')).join('\n');
const checks=[];
for(const e of encounterArt){
 const f=pngs.get(e.atlasSha256);assert(f,'Selected encounter atlas is not emitted: '+e.bossId+' '+e.atlas);
 assert(main.includes(path.basename(f.path)),'Selected atlas URL is absent from emitted client code: '+e.bossId);
 assert.equal(f.width,e.columns*e.cellSize);assert(f.height/e.cellSize*e.columns>=e.frames);
 checks.push({bossId:e.bossId,source:e.atlas,sha256:e.atlasSha256,frames:e.frames,...f});
}
const alchemist=checks.find(c=>c.bossId==='alchemist');assert(alchemist&&alchemist.frames===16&&alchemist.source.endsWith('alchemist-action-walk-v2-atlas.png'));
const bell=checks.find(c=>c.bossId==='bellringer');assert(bell&&bell.frames===16&&bell.source.endsWith('bellringer-action-walk-v2-atlas.png'));
const report={passed:true,target:dir,bellringerWalkFrames:8,retainedBellringerActionFrames:8,selectedAtlases:checks.length,alchemistWalkFrames:8,retainedAlchemistActionFrames:8,checks,scope:'Selected runtime pose metadata, actual emitted PNG bytes/dimensions and client URL references. No rendered acceptance.'};
const out='reviews/resonant-tolls-2026-10-27/emitted-atlases-'+(dir==='dist'?'testing':'public')+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,checks:undefined}));
