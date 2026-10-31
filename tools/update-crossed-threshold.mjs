import fs from 'node:fs';
import crypto from 'node:crypto';
import {applyWidowGates,widowRules} from '../content/source/widow-gates.mjs';
import {applyClerkAppeal,clerkAppealRules} from '../content/source/clerk-appeal.mjs';
import {widowMessages} from '../locales/source/widow-gates.mjs';
import {clerkAppealMessages} from '../locales/source/clerk-appeal.mjs';
const c=JSON.parse(fs.readFileSync('content/catalog.json'));
applyClerkAppeal(c);applyWidowGates(c);
for(const [file,value] of [['content/catalog.json',c],['content/bosses.json',c.bosses],['src/shared/widow-gates-rules.json',widowRules],['src/shared/clerk-appeal-rules.json',clerkAppealRules],['src/client/widow-help.json',Object.fromEntries(c.locales.map(l=>[l.id,widowMessages(l.id)]))],['src/client/clerk-help.json',Object.fromEntries(c.locales.map(l=>[l.id,clerkAppealMessages(l.id)]))]])fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
fs.writeFileSync('content/revision.json',JSON.stringify({version:c.rules.contentVersion,sha256:crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex'),authoredDate:'2026-10-27'},null,2)+'\n');
for(const l of c.locales){const file='locales/'+l.id+'.json',v=JSON.parse(fs.readFileSync(file));Object.assign(v.messages,widowMessages(l.id),clerkAppealMessages(l.id));fs.writeFileSync(file,JSON.stringify(v,null,2)+'\n');}
console.log('Updated Gate Widow and Clerk rules, exact catalog revision and fifteen-locale help.');
