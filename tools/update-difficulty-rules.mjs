import fs from 'node:fs';
import crypto from 'node:crypto';
import {applyEncounterPacing} from '../content/source/encounter-pacing.mjs';
import {difficultyRuleMessages} from '../locales/source/difficulty-rules.mjs';
const c=JSON.parse(fs.readFileSync('content/catalog.json'));
applyEncounterPacing(c);
for(const key of ['rules','bosses','classes','supplies','difficulties'])fs.writeFileSync('content/'+key+'.json',JSON.stringify(c[key],null,2)+'\n');
fs.writeFileSync('content/catalog.json',JSON.stringify(c,null,2)+'\n');
fs.writeFileSync('content/revision.json',JSON.stringify({version:c.rules.contentVersion,sha256:crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex'),authoredDate:'2026-10-25'},null,2)+'\n');
for(const file of fs.readdirSync('locales').filter(f=>f.endsWith('.json'))){const p='locales/'+file,l=JSON.parse(fs.readFileSync(p));Object.assign(l.messages,difficultyRuleMessages(l.meta.locale));fs.writeFileSync(p,JSON.stringify(l,null,2)+'\n');}
console.log(JSON.stringify({bosses:c.bosses.length,entryPhases:c.bosses.find(b=>b.id==='constable').phases.length}));
