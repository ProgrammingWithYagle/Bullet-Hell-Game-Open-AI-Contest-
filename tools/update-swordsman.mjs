import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {applySwordsman} from '../content/source/swordsman.mjs';
import {addClassTalents} from '../content/source/class-talents.mjs';
const c=JSON.parse(fs.readFileSync('content/catalog.json','utf8'));
// Rebuild only this class so later authored Sword changes are materialized too.
for(const name of ['classes','skills','weapons'])c[name]=c[name].filter(v=>v.id!=='swordsman'&&v.classId!=='swordsman');
applySwordsman(c);addClassTalents(c);
for(const name of ['rules','classes','skills','weapons'])fs.writeFileSync('content/'+name+'.json',JSON.stringify(c[name],null,2)+'\n');
fs.writeFileSync('content/catalog.json',JSON.stringify(c,null,2)+'\n');
fs.writeFileSync('content/revision.json',JSON.stringify({version:c.rules.contentVersion,sha256:createHash('sha256').update(JSON.stringify(c)).digest('hex'),authoredDate:'2026-11-01'},null,2)+'\n');
console.log('Materialized Swordsman candidate content: nine classes,486nodes,36weapons. Not yet a verified playable release.');
