import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {applySummoner} from '../content/source/summoner.mjs';
import {addClassTalents} from '../content/source/class-talents.mjs';
const base='08acf5f3383ac7899c8dec73d334e9d9d66a5d7b';
const old=p=>JSON.parse(execFileSync('git',['-c','core.bare=false','show',base+':'+p],{encoding:'utf8',maxBuffer:32*1024*1024}));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=old('content/catalog.json'),after=read('content/catalog.json'),prior=structuredClone(after);
for(const key of ['classes','skills','weapons'])prior[key]=prior[key].filter(e=>e.id!=='summoner'&&e.classId!=='summoner');
delete prior.rules.summoner;assert.deepEqual(prior,before,'An existing authored mechanic changed');
const rebuilt=structuredClone(before);applySummoner(rebuilt);addClassTalents(rebuilt);assert.deepEqual(rebuilt,after,'Summoner catalog is not reproducible');
for(const file of ['assets/production/items/library.json','assets/production/normalized/library.json','assets/delivery/selection-portraits-v1/library.json','assets/delivery/survivor-motion-v1/library.json']){
 const previous=old(file).entries,current=read(file).entries;
 for(const entry of previous)assert.deepEqual(current.find(e=>(e.id??e.classId)===(entry.id??entry.classId)),entry,'An existing art entry changed: '+file);
}
const result={passed:true,baseline:base,existingMechanicsPreserved:true,existingArtEntriesPreserved:true,summonerSourceReproducible:true,classes:after.classes.length,skills:after.skills.length,weapons:after.weapons.length};
fs.writeFileSync('reviews/summoner-2026-11-01/source-invariants.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
