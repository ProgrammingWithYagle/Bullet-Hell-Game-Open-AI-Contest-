import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {applySwordsman} from '../content/source/swordsman.mjs';
import {addClassTalents} from '../content/source/class-talents.mjs';
const base='61141f9a1c1cee3e2d0258d47308f2593121f6e9';
const old=p=>JSON.parse(execFileSync('git',['-c','core.bare=false','show',base+':'+p],{encoding:'utf8',maxBuffer:32*1024*1024}));
const current=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=old('content/catalog.json'),after=current('content/catalog.json'),withoutSword=structuredClone(after);
for(const key of ['classes','skills','weapons'])withoutSword[key]=withoutSword[key].filter(v=>v.id!=='swordsman'&&v.classId!=='swordsman');
delete withoutSword.rules.swordsman;assert.deepEqual(withoutSword,before,'Existing authored mechanics changed');
const rebuilt=structuredClone(before);applySwordsman(rebuilt);addClassTalents(rebuilt);assert.deepEqual(rebuilt,after,'Sword source is not reproducible');
for(const p of ['assets/production/items/library.json','assets/production/normalized/library.json','assets/delivery/selection-portraits-v1/library.json','assets/delivery/survivor-motion-v1/library.json']){
 const a=old(p).entries,b=current(p).entries;
 for(const entry of a)assert.deepEqual(b.find(v=>(v.id??v.classId)===(entry.id??entry.classId)),entry,'Existing art contract changed: '+p);
}
console.log(JSON.stringify({passed:true,baseline:base,existingMechanicsPreserved:true,existingArtEntriesPreserved:true,authoredSwordsmanReproducible:true,classes:after.classes.length,skills:after.skills.length,weapons:after.weapons.length}));
