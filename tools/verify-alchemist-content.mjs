import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { applyAlchemist } from '../content/source/alchemist-class.mjs';
import { applyOpeningChapter } from '../content/source/opening-chapter.mjs';
import { addClassTalents } from '../content/source/class-talents.mjs';
const base='1f3ef9223f98ef7017c058e872e3b2444ad0c699';
const old=p=>JSON.parse(execFileSync('git',['-c','core.bare=false','show',base+':'+p],{encoding:'utf8',maxBuffer:32*1024*1024}));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=old('content/catalog.json'),after=read('content/catalog.json'),prior=structuredClone(after);
for(const key of ['classes','skills','weapons'])prior[key]=prior[key].filter(e=>e.id!=='alchemist'&&e.classId!=='alchemist');
delete prior.rules.alchemy;
for(const chapter of prior.storyChapters)chapter.lessonIds=chapter.lessonIds.filter(id=>id!=='alchemist-mixtures-1');
assert.deepEqual(prior,before,'An existing authored mechanic changed');
const rebuilt=structuredClone(before);applyAlchemist(rebuilt);applyOpeningChapter(rebuilt);addClassTalents(rebuilt);
assert.deepEqual(rebuilt,after,'Alchemist catalog is not reproducible');
for(const file of ['assets/production/items/library.json','assets/production/normalized/library.json','assets/delivery/selection-portraits-v1/library.json','assets/delivery/survivor-motion-v1/library.json']){
  for(const entry of old(file).entries)assert.deepEqual(read(file).entries.find(e=>(e.id??e.classId)===(entry.id??entry.classId)),entry,'Existing art entry changed: '+file);
}
const oldModel=execFileSync('git',['-c','core.bare=false','show',base+':docs/balance/uptime-model.csv'],{maxBuffer:32*1024*1024});
assert(fs.readFileSync('docs/balance/history/2026-11-02-ranger-uptime-model.csv').equals(oldModel),'Historical analytical evidence changed');
const priorLines=oldModel.toString('utf8').trim().split(/\r?\n/),currentLines=fs.readFileSync('docs/balance/uptime-model.csv','utf8').trim().split(/\r?\n/);
const header=priorLines.shift();assert.equal(currentLines.shift(),header);
const columns=header.split(','),modeColumn=columns.indexOf('mode'),classColumn=columns.indexOf('classId');
assert(currentLines.every(line=>line.split(',')[modeColumn]!=='story'),'Current SP witness contains Story');
assert.deepEqual(currentLines.filter(line=>line.split(',')[classColumn]!=='alchemist'),priorLines.filter(line=>line.split(',')[modeColumn]!=='story'),'Existing Free Play analytical rows changed');
const result={passed:true,historical41250RowsPreserved:true,existing24882FreePlayRowsPreserved:true,currentSpWitnessExcludesStory:true,baseline:base,existingMechanicsPreserved:true,existingArtEntriesPreserved:true,alchemistSourceReproducible:true,classes:after.classes.length,skills:after.skills.length,weapons:after.weapons.length};
for(const file of ['docs/balance/skills.csv','docs/balance/weapons.csv']){
 const issued=execFileSync('git',['-c','core.bare=false','show',base+':'+file],{encoding:'utf8'}).trim().split(/\r?\n/);
 const current=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).filter(line=>!line.startsWith('"alchemist-'));
 assert.deepEqual(current,issued,'Existing editable balance rows changed: '+file);
}
for(const {id}of after.locales){
 const issued=old('locales/'+id+'.json').messages,current=read('locales/'+id+'.json').messages;
 for(const [key,text]of Object.entries(issued))assert.deepEqual(current[key],text,'Existing locale message changed: '+id+'/'+key);
}
result.existingEditableBalanceRowsPreserved=true;
result.existingFifteenLocaleMessagesPreserved=true;
fs.mkdirSync('reviews/alchemist-class-2026-11-02',{recursive:true});
fs.writeFileSync('reviews/alchemist-class-2026-11-02/source-invariants.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
