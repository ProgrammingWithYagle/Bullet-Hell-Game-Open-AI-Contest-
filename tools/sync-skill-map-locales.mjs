import fs from 'node:fs';
import {skillMapMessages} from '../locales/source/skill-map.mjs';
for(const file of fs.readdirSync('locales').filter(f=>f.endsWith('.json'))){const p='locales/'+file,c=JSON.parse(fs.readFileSync(p));Object.assign(c.messages,skillMapMessages(c.meta.locale));fs.writeFileSync(p,JSON.stringify(c,null,2)+'\n');}
