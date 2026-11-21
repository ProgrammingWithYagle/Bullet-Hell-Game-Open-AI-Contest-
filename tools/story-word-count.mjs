import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const opening=read('src/client/story/opening/en.json'),catalog=read('content/catalog.json'),dialogue=read('src/client/story/dialogue.json').en;
const passages=new Map(),legacyPassages=new Map();
function add(id,text){assert(!passages.has(id));assert.equal(typeof text,'string');passages.set(id,text);}
function addLegacy(id,text){assert(!legacyPassages.has(id));assert.equal(typeof text,'string');legacyPassages.set(id,text);}
for(const scene of opening.scenes)add('opening:'+scene.id,scene.pages.map(p=>p.text).join('\n\n'));
const book=catalog.storyCampaign;
const chapter=read('src/client/story/chapter/en.json');
chapter.scenes.forEach(scene=>add('one-place-left:'+scene.id,scene.lines.map(line=>line[1]).join('\n\n')));
chapter.choices.forEach((choice,i)=>add('one-place-left:choice:'+i,choice.title+'\n'+choice.text));
book.acts.forEach((act,i)=>{addLegacy('chapter:'+i,act.text);dialogue.chapters[i].forEach((line,n)=>addLegacy('chapter:'+i+':dialogue:'+n,line[1]));});
book.beats.forEach((beat,i)=>{if(i!==0){addLegacy('report:'+i,beat.text);dialogue.beats[i].forEach((line,n)=>addLegacy('report:'+i+':dialogue:'+n,line[1]));}beat.choices.forEach((choice,n)=>addLegacy('choice:'+i+':'+n,choice.title+'\n'+choice.text));});
book.endings.forEach((ending,i)=>{addLegacy('ending:'+i,ending.text);dialogue.endings[i].forEach((line,n)=>addLegacy('ending:'+i+':dialogue:'+n,line[1]));});
const segmenter=new Intl.Segmenter('en',{granularity:'word'}),count=text=>[...segmenter.segment(text)].filter(s=>s.isWordLike).length;
const sceneWords=opening.scenes.map(scene=>({id:scene.id,words:count(passages.get('opening:'+scene.id))}));
const currentWords=[...passages.values()].reduce((n,t)=>n+count(t),0),legacyWords=[...legacyPassages.values()].reduce((n,t)=>n+count(t),0);
const result={schemaVersion:1,language:'en',method:'Intl.Segmenter English word-like segments',measure:'Fresh Story Campaign prose and all three current route-choice/scene alternatives, counted once; earlier prototype-only passages reported separately',target:5000000,targetAchieved:false,openingScenes:sceneWords,openingWords:sceneWords.reduce((n,s)=>n+s.words,0),authoredPlayableMainStoryWords:currentWords,uniquePassages:passages.size,legacyPrototypeOnlyWords:legacyWords,legacyPrototypeOnlyUniquePassages:legacyPassages.size,totalAuthoredMainStoryIncludingLegacyWords:currentWords+legacyWords,excluded:['UI and guide copy','chapter and scene headings','translated copies','superseded short opening and first report','duplicate archive/transcript displays','optional survivor letters and future personal routes','unimplemented drafts and editorial notes','earlier prototype-only passages from the current-campaign target; reported separately'],limits:['Authored words are not words encountered in a single playthrough.','Word count does not establish literary quality, completed character arcs or a finished main story.']};
result.targetAchieved=result.authoredPlayableMainStoryWords>=result.target;
const target=path.join(root,'reviews/story-word-count.json');
if(process.argv.includes('--write'))fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
if(process.argv.includes('--check'))assert.deepEqual(read('reviews/story-word-count.json'),result,'Story word count is stale');
console.log(JSON.stringify(result));
