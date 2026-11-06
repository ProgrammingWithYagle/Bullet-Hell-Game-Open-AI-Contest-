import fs from 'node:fs';
import crypto from 'node:crypto';
import {applyMatronWard,matronWardRules}from'../content/source/matron-ward.mjs';
import {matronMessages}from'../locales/source/matron-ward.mjs';
const c=JSON.parse(fs.readFileSync('content/catalog.json','utf8'));applyMatronWard(c);
for(const [file,value]of[['content/catalog.json',c],['content/bosses.json',c.bosses],['src/shared/matron-ward-rules.json',matronWardRules],['src/client/matron-help.json',Object.fromEntries(c.locales.map(l=>[l.id,matronMessages(l.id)]))]])fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
fs.writeFileSync('content/revision.json',JSON.stringify({version:c.rules.contentVersion,sha256:crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex'),authoredDate:'2026-10-27'},null,2)+'\n');
for(const l of c.locales){const file='locales/'+l.id+'.json',v=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(v.messages,matronMessages(l.id));fs.writeFileSync(file,JSON.stringify(v,null,2)+'\n');}
console.log('Updated Cradle Relay rules, exact content revision and fifteen-locale help.');
