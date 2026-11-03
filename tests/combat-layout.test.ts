import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {freshProfile,parseProfile,saveProfile,loadProfile,changeProfile,PROFILE_KEY,PROFILE_BACKUP_KEY,summary} from '../src/client/profile.ts';
import {defaultPreferences,migratePreferences,validPreferences} from '../src/client/preferences.ts';
import {data} from '../src/shared/game.ts';

test('existing eleven-field profiles retain progress, controls and language while adding the layout default',()=>{
  const profile=freshProfile();profile.locale='ja';profile.settings.volume=.7;profile.controls.bindings.dodge=['KeyG'];
  profile.runs=[{runId:'layout-migration',playerId:'solo',mode:'short',difficulty:'normal',classId:'medic',clears:1,rescues:0,firstEncounter:0,campaignClears:1,bossIds:['ashen-usher'],teamClears:1,combatTicks:3000,fullCampaign:false,memorial:false}];
  const old=structuredClone(profile) as any;delete old.settings.combatLayout;const raw=JSON.stringify(old),restored=parseProfile(raw);
  assert.equal(restored.settings.combatLayout,'grouped');assert.deepEqual(restored.runs,profile.runs);assert.deepEqual(restored.controls,profile.controls);assert.equal(restored.locale,'ja');assert.equal(summary(restored).totalClears,1);
  const values=new Map([[PROFILE_KEY,raw]]),store={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
  changeProfile(store,p=>{p.settings.combatLayout='separate';});assert.equal(loadProfile(store).settings.combatLayout,'separate');assert.equal(values.get(PROFILE_BACKUP_KEY),raw);assert.deepEqual(loadProfile(store).runs,profile.runs);
});

test('both panel choices persist and invalid layout values cannot replace a valid profile',()=>{
  const values=new Map<string,string>(),store={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
  const p=freshProfile();saveProfile(store,p);for(const layout of ['separate','grouped']as const){changeProfile(store,p=>{p.settings.combatLayout=layout;});assert.equal(loadProfile(store).settings.combatLayout,layout);}
  const before=values.get(PROFILE_KEY);assert.throws(()=>parseProfile(JSON.stringify({...p,settings:{...p.settings,combatLayout:'unknown'}})));assert.equal(values.get(PROFILE_KEY),before);
  assert(validPreferences(defaultPreferences()));assert(!validPreferences({...defaultPreferences(),combatLayout:'unknown'}));assert.equal(migratePreferences({combatLayout:'separate'}).combatLayout,'separate');assert.equal(migratePreferences({combatLayout:'unknown'}).combatLayout,'grouped');
});

test('all fifteen catalogs contain the exact authored equipment/ability layout labels',async()=>{
  const {combatLayoutMessages}=await import(pathToFileURL(resolve('locales/source/combat-layout.mjs')).href);
  for(const {id}of data.locales){const catalog=JSON.parse(readFileSync('locales/'+id+'.json','utf8')).messages;for(const[k,v]of Object.entries(combatLayoutMessages(id)))assert.equal(catalog[k],v);}
});
