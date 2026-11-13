import{catalogAt73,messagesAt73}from'./helpers/issued73-preservation.ts';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{createHash}from'node:crypto';
import catalog from '../content/catalog.json';import baseline from './fixtures/heavy-post-issued72.json';
import {Game,data}from'../src/shared/game.ts';import{viewOf}from'../src/shared/view.ts';
import{lanyardId,traverseIds as ids,clutchId,keyedId,openId}from'../src/shared/heavy-traverse.ts';
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex'),all=[...data.skills,...data.generalSkills,...data.specializationSkills];
const buy=(g:Game,p:{id:string},item:string)=>g.transact(p.id,{id:item,kind:'skill',item});
test('the admitted capstone preserves every source72 catalog value and all63 issued techniques exactly',()=>{
 const node=data.specializationSkills.find(s=>s.id===lanyardId)!;assert(node);assert.equal(node.cost,4);assert.equal(node.freePlaySpRequired,19);assert.equal(node.prerequisite,clutchId);assert.equal(node.capstone,true);assert.equal(node.role,'capstone');assert.deepEqual(node.effects,{});
 const at73=catalogAt73(catalog),old={...at73,specializationSkills:at73.specializationSkills.filter(s=>s.id!==lanyardId)};
 assert.equal(old.specializationSkills.length,63);assert.equal(sha(JSON.stringify(old)),baseline.contentRevision);
 assert.equal(data.skills.length,648);assert.equal(data.generalSkills.length,4);assert.equal(data.classes.length,12);assert.equal(data.specializationSkills.length,69);
});
test('twenty-seven controlled late-Endless builds make actual source purchases for exactly27SP and one capstone, with idempotent transaction retries',()=>{
 for(const mode of['loose','spade','floating']as const)for(const handling of[undefined,keyedId,openId])for(const general of['mantlet','vents','split']){
  const fitted=mode!=='loose',prefix=general==='mantlet'?'heavy-suppression-':general==='vents'?'heavy-suppression-path-1-':'heavy-suppression-path-2-',foundation=['heavy-ordnance-1',ids.entry,...(fitted?[ids[mode]]:[]),clutchId,...(handling?[handling]:[])],generic=[...Array.from({length:handling?4:5},(_,i)=>prefix+(i+1)),...(handling&&!fitted?['general-sprint','heavy-endurance-1']:!handling&&fitted?[]:['heavy-ordnance-2'])];
  const g=new Game({mode:'endless',seed:41});g.encounter=9;const p=g.addPlayer('owner','Hux','heavy');assert.equal(p.totalSp,27);
  for(const item of[...foundation,...generic])assert(buy(g,p,item).ok,item);assert.equal(viewOf(g,p.id).players[0].sp,4);assert(buy(g,p,lanyardId).ok);
  assert.equal(p.skills.reduce((n,id)=>n+all.find(s=>s.id===id)!.cost,0),27);assert.equal(p.skills.filter(id=>all.find(s=>s.id===id)!.capstone).length,1);assert.equal(viewOf(g,p.id).players[0].sp,0);
  const before=[...p.skills];assert(buy(g,p,lanyardId).ok);assert.deepEqual(p.skills,before);assert.equal(viewOf(g,p.id).players[0].sp,0);assert(!g.transact(p.id,{id:'fresh-owned-retry',kind:'skill',item:lanyardId}).ok);
 }
});
test('actual starting Raid12 rejects the19-earned gate on all three carriages despite enough unspent SP',()=>{
 for(const mode of['loose','spade','floating']as const){const g=new Game({mode:'raid',seed:41}),p=g.addPlayer('owner','Hux','heavy');assert.equal(p.totalSp,12);
  for(const item of['heavy-ordnance-1',ids.entry,...(mode==='loose'?[]:[ids[mode]]),clutchId])assert(buy(g,p,item).ok,item);
  const before=viewOf(g,p.id).players[0].sp;assert(before>=4);assert.equal(buy(g,p,lanyardId).reason,'insufficientPoints');assert.equal(viewOf(g,p.id).players[0].sp,before);assert(!p.skills.includes(lanyardId));
 }
});
test('the issued one-capstone limit, required Clutch, class and Campaign restrictions admit no owned benefit on rejection',()=>{
 const g=new Game({mode:'endless',seed:41});g.encounter=9;const p=g.addPlayer('owner','Hux','heavy');for(const item of['heavy-ordnance-1',ids.entry,clutchId,...Array.from({length:6},(_,i)=>'heavy-suppression-'+(i+1))])assert(buy(g,p,item).ok,item);assert.equal(buy(g,p,lanyardId).reason,'capstoneMaximum');
 const missing=new Game({mode:'endless',seed:41});missing.encounter=9;const q=missing.addPlayer('owner','Hux','heavy');for(const item of['heavy-ordnance-1',ids.entry])assert(buy(missing,q,item).ok);assert.equal(buy(missing,q,lanyardId).reason,'prerequisite');
 for(const[mode,classId]of[['raid','soldier'],['story','heavy']]as const){const other=new Game({mode,seed:41}),r=other.addPlayer('other','Other',classId),before=[...r.skills];assert(!buy(other,r,lanyardId).ok);assert.deepEqual(r.skills,before);}
});
test('all fifteen catalogs retain every earlier message value and the new English pilot copy has no empty owned label',()=>{
 for(const row of baseline.locales){const value=JSON.parse(fs.readFileSync(new URL('../locales/'+row.file,import.meta.url),'utf8'));for(const key of baseline.newMessageKeys)assert(typeof value.messages[key]==='string'&&value.messages[key].trim().length>0,key);
  const old=Object.fromEntries(Object.entries(messagesAt73(value.messages)).filter(([key])=>!baseline.newMessageKeys.includes(key)));assert.equal(sha(JSON.stringify(old)),row.messagesSha256,row.file);
 }
 for(const row of baseline.unchangedSoundSources)assert.equal(sha(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,row.file);
});
