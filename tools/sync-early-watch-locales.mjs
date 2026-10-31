import fs from 'node:fs';
import {earlyWatchMessages} from '../locales/source/early-watch.mjs';
for(const file of fs.readdirSync('locales').filter(f=>f.endsWith('.json'))){const p='locales/'+file,c=JSON.parse(fs.readFileSync(p));Object.assign(c.messages,earlyWatchMessages(c.meta.locale));fs.writeFileSync(p,JSON.stringify(c,null,2)+'\n');}
const help=Object.fromEntries(JSON.parse(fs.readFileSync('content/locales.json')).map(l=>[l.id,earlyWatchMessages(l.id)]));
fs.writeFileSync('src/client/early-watch-help.json',JSON.stringify(help,null,2)+'\n');
