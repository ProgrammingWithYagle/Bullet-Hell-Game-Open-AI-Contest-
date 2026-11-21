import fs from 'node:fs';
import { writeTextAtomic } from './write-text-atomic.mjs';
import { alchemistMessages } from '../locales/source/alchemist-class.mjs';
const catalog=JSON.parse(fs.readFileSync('content/catalog.json','utf8'));
for(const {id}of catalog.locales){const file='locales/'+id+'.json',v=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(v.messages,alchemistMessages(id,catalog,v.messages));writeTextAtomic(file,JSON.stringify(v,null,2)+'\n');}
console.log('Alchemist labels and implemented mechanics synchronized in fifteen catalogs. Translation drafts still require native-language and rendered review.');
