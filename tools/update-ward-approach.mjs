import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {applyWardApproach} from '../content/source/ward-approach.mjs';
const c=JSON.parse(fs.readFileSync('content/catalog.json','utf8'));applyWardApproach(c);
for(const [name,value]of[['catalog',c],['skirmishes',c.skirmishes]])fs.writeFileSync('content/'+name+'.json',JSON.stringify(value,null,2)+'\n');
fs.writeFileSync('content/revision.json',JSON.stringify({version:c.rules.contentVersion,sha256:createHash('sha256').update(JSON.stringify(c)).digest('hex'),authoredDate:'2026-10-31'},null,2)+'\n');
console.log('Updated shared Ward Approach objective; no new boss or class is counted.');
