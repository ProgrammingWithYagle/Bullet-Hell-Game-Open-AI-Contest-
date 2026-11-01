import fs from 'node:fs';
import {writeTextAtomic} from './write-text-atomic.mjs';
import {swordsmanMessages} from '../locales/source/swordsman.mjs';
const c=JSON.parse(fs.readFileSync('content/catalog.json','utf8'));
for(const l of c.locales){const file='locales/'+l.id+'.json',v=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(v.messages,swordsmanMessages(l.id,c,v.messages));writeTextAtomic(file,JSON.stringify(v,null,2)+'\n');}
console.log('Synchronized Swordsman candidate copy in fifteen locales; native-language review pending.');
