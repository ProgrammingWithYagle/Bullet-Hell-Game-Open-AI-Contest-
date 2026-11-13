import fs from 'node:fs';
import {writeTextAtomic} from './write-text-atomic.mjs';
import {engineerPathwayMessages} from '../locales/source/engineer-pathways.mjs';
const catalog=JSON.parse(fs.readFileSync('content/catalog.json','utf8'));
for(const {id}of catalog.locales){const file='locales/'+id+'.json',v=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(v.messages,engineerPathwayMessages(id));writeTextAtomic(file,JSON.stringify(v,null,2)+'\n');}
console.log('Engineer pilot copy synchronized; detailed copy is English, translations pending.');
