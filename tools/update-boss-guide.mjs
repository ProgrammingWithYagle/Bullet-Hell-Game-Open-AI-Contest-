import fs from 'node:fs';
import {bossGuideMessages} from '../locales/source/boss-guide.mjs';
const c=JSON.parse(fs.readFileSync('content/catalog.json'));
fs.writeFileSync('src/client/boss-guide-messages.json',JSON.stringify(Object.fromEntries(c.locales.map(l=>[l.id,bossGuideMessages(l.id)])),null,2)+'\n');
for(const l of c.locales){const file='locales/'+l.id+'.json',value=JSON.parse(fs.readFileSync(file));Object.assign(value.messages,bossGuideMessages(l.id));fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
console.log('Updated optional boss guide controls in fifteen locales.');
