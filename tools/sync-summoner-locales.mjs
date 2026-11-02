import fs from 'node:fs';
import {writeTextAtomic} from './write-text-atomic.mjs';
import {summonerMessages} from '../locales/source/summoner.mjs';
const catalog=JSON.parse(fs.readFileSync('content/catalog.json','utf8'));
for(const {id}of catalog.locales){const file='locales/'+id+'.json',v=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(v.messages,summonerMessages(id,catalog,v.messages));writeTextAtomic(file,JSON.stringify(v,null,2)+'\n');}
console.log('Synchronized Summoner draft mechanical copy in fifteen catalogs; native-language review remains open.');
