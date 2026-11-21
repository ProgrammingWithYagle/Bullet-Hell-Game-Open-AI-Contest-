import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {menuBundle,menuEnvironment} from './helpers/menu-fixture.ts';
import {freshProfile,PROFILE_KEY} from '../src/client/profile.ts';
import {hasLanguagePreference} from '../src/client/language-preference.ts';
import {SetupDisplayName} from '../src/client/display-name.ts';
const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));
const hooks={resume(){},launch(){},profileChanged:async()=>{},settingsHTML:()=>'',bindSettings(){}};
const i18n="export let locale='en';export const languages=[['en','English'],['fr','Français'],['de','Deutsch'],['ar','العربية']],number=String,initialLanguage=()=> 'en';export const t=key=>key==='ui.defaultDisplayName'?({en:'Survivor',fr:'Survivant',de:'Überlebender',ar:'ناجٍ'})[locale]:key;export async function setLanguage(id,signal,persist=true){if(globalThis.__welcomeLoads?.[id])await globalThis.__welcomeLoads[id];if(signal?.aborted)return false;if(globalThis.__welcomeFailure===id)throw Error('unavailable');locale=id;document.documentElement.lang=id;document.documentElement.dir=id==='ar'?'rtl':'ltr';if(persist)localStorage.setItem('ga-language',id);return true;}";
async function changeLanguage(host:ReturnType<typeof menuEnvironment>['host'],id:string){const select=host.querySelector('#language')!;select.value=id;await select.onchange!({target:select});}

test('first-visit detection retains valid existing preferences and recovers from missing or corrupt ones',()=>{
  const saved=new Map<string,string>(),store={getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v)};
  assert.equal(hasLanguagePreference(store),false);saved.set('ga-language','invented');assert.equal(hasLanguagePreference(store),false);
  saved.set('ga-language','ar');assert.equal(hasLanguagePreference(store),true);saved.delete('ga-language');saved.set(PROFILE_KEY,JSON.stringify(freshProfile()));assert.equal(hasLanguagePreference(store),true);
  saved.set(PROFILE_KEY,'{invalid');assert.equal(hasLanguagePreference(store),false);assert.equal(hasLanguagePreference({getItem(){throw Error('unavailable');},setItem(){}}),false);
});

test('automatic names change at new setup boundaries while typed names and mid-setup fallbacks stay fixed',()=>{
  const name=new SetupDisplayName();assert.equal(name.start('Survivor'),'Survivor');assert.equal(name.commit(''),'Survivor');assert.equal(name.start('Survivant'),'Survivant');
  name.edit('Survivant');assert.equal(name.start('Überlebender'),'Survivant','Typing even the exact automatic value makes it an explicit name');name.edit('');assert.equal(name.commit(''),'Überlebender');
  name.edit('明日 🌙');assert.equal(name.start('ناجٍ'),'明日 🌙');assert.equal(name.commit(name.value),'明日 🌙');
});

test('the welcome page precedes setup, previews without saving, and Continue saves once then focuses first-time play',async t=>{
  const env=menuEnvironment(t),ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':i18n});let chosen=0;
  const dispose=ui.mountSetup(env.host,{...hooks,firstVisitLanguage:true,languageChosen:()=>{chosen++;}});t.after(dispose);
  assert(env.host.querySelector('#language-welcome-title'));assert(!env.host.querySelector('#new-run'));assert.equal(env.saved.has(PROFILE_KEY),false);
  env.host.querySelector('[data-welcome-language="fr"]')!.click();await turn();assert.equal((env.document.documentElement as any).lang,'fr');assert.equal(env.saved.has('ga-language'),false);assert.equal(env.saved.has(PROFILE_KEY),false);
  const oldContinue=env.host.querySelector('#language-continue')!;oldContinue.click();oldContinue.click();assert.equal(chosen,1);assert.equal(JSON.parse(env.saved.get(PROFILE_KEY)!).locale,'fr');assert.equal(env.saved.get('ga-language'),'fr');assert(env.host.querySelector('#gentle-start'));assert.equal(env.document.activeElement?.id,'gentle-start');
  env.host.querySelector('#gentle-start')!.click();assert.equal(env.host.querySelector('#name')!.value,'Survivant');
});

test('welcome language failures keep Continue usable and newer choices cancel older downloads',async t=>{
  const env=menuEnvironment(t);let finish!:()=>void;(globalThis as any).__welcomeLoads={fr:new Promise<void>(yes=>{finish=yes;})};t.after(()=>{Reflect.deleteProperty(globalThis,'__welcomeLoads');Reflect.deleteProperty(globalThis,'__welcomeFailure');});
  const ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':i18n});const dispose=ui.mountSetup(env.host,{...hooks,firstVisitLanguage:true});t.after(dispose);
  env.host.querySelector('[data-welcome-language="fr"]')!.click();assert.equal(env.host.querySelector('#language-continue')!.disabled,true);env.host.querySelector('[data-welcome-language="ar"]')!.click();await turn();finish();await turn();
  assert.equal((env.document.documentElement as any).lang,'ar');assert.equal((env.document.documentElement as any).dir,'rtl');assert.equal(env.host.querySelector('#language-continue')!.disabled,false);
  (globalThis as any).__welcomeFailure='de';env.host.querySelector('[data-welcome-language="de"]')!.click();await turn();assert.equal(env.host.querySelector('#notice')!.textContent,'ui.errorLanguage');assert.equal(env.host.querySelector('#language-continue')!.disabled,false);
  env.host.querySelector('#language-continue')!.click();assert.equal(env.saved.get('ga-language'),'ar');
});

test('closing an unfinished welcome page cancels its download and does not invent a saved choice',async t=>{
  const env=menuEnvironment(t);let finish!:()=>void;(globalThis as any).__welcomeLoads={fr:new Promise<void>(yes=>{finish=yes;})};t.after(()=>Reflect.deleteProperty(globalThis,'__welcomeLoads'));
  const ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':i18n});const dispose=ui.mountSetup(env.host,{...hooks,firstVisitLanguage:true});env.host.querySelector('[data-welcome-language="fr"]')!.click();dispose();env.host.innerHTML='<p id="later-page">Later</p>';finish();await turn();
  assert(env.host.querySelector('#later-page'));assert.equal(env.saved.has(PROFILE_KEY),false);assert.equal(env.saved.has('ga-language'),false);assert.notEqual((env.document.documentElement as any).lang,'fr');
});

test('a blocked preference save still allows play and explains the save failure',async t=>{
  const env=menuEnvironment(t),ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':i18n});const dispose=ui.mountSetup(env.host,{...hooks,firstVisitLanguage:true});t.after(dispose);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem(){throw Error('quota');}}});env.host.querySelector('#language-continue')!.click();assert(env.host.querySelector('#new-run'));assert.equal(env.host.querySelector('#notice')!.textContent,'ui.errorSave');
});

test('real setup seeds its automatic name only on new setup and join boundaries, retaining all choices mid-setup',async t=>{
  const env=menuEnvironment(t),ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':i18n});const dispose=ui.mountSetup(env.host,hooks);t.after(dispose);
  await changeLanguage(env.host,'fr');env.host.querySelector('#gentle-start')!.click();assert.equal(env.host.querySelector('#name')!.value,'Survivant');await changeLanguage(env.host,'de');assert.equal(env.host.querySelector('#name')!.value,'Survivant');
  env.host.querySelector('[data-visibility="public"]')!.click();assert.equal(env.host.querySelector('#name')!.value,'Survivant');env.host.querySelector('#brand-home')!.click();env.host.querySelector('#gentle-start')!.click();assert.equal(env.host.querySelector('#name')!.value,'Überlebender');
  const name=env.host.querySelector('#name')!;name.value='明日 🌙';name.dispatch('input');await changeLanguage(env.host,'ar');assert.equal(env.host.querySelector('#name')!.value,'明日 🌙');env.host.querySelector('#brand-home')!.click();env.host.querySelector('#gentle-start')!.click();assert.equal(env.host.querySelector('#name')!.value,'明日 🌙');
  const clear=env.host.querySelector('#name')!;clear.value='';clear.dispatch('input');await changeLanguage(env.host,'fr');env.host.querySelector('[data-visibility="private"]')!.click();assert.equal(env.host.querySelector('#name')!.value,'ناجٍ','Empty mid-setup names use that setup’s original fallback');
  env.host.querySelector('#brand-home')!.click();env.host.querySelector('#join')!.click();assert.equal(env.host.querySelector('#name')!.value,'Survivant');
});

test('first startup requires an explicit language choice once and does not store a detected suggestion',async t=>{
  const env=menuEnvironment(t),ui=await menuBundle(t,'src/client/main.ts',{
    'i18n.ts':i18n, 'scene.ts':'export class CombatScene {}',phaser:'export default {AUTO:0,Scale:{FIT:0,CENTER_BOTH:0}};', 'audio.ts':'export class AudioBus {setVolume(){}stop(){}}',
  },'export {menu,leave};');env.cleanup.push(()=>ui.leave());
  assert(env.host.querySelector('#language-welcome-title'));assert.equal(env.saved.has('ga-language'),false);env.host.querySelector('[data-welcome-language="fr"]')!.click();await turn();env.host.querySelector('#language-continue')!.click();await ui.menu();assert(!env.host.querySelector('#language-welcome-title'));assert(env.host.querySelector('#new-run'));assert.equal(env.saved.get('ga-language'),'fr');
});

test('all fifteen languages provide a short game-safe default name and source-backed welcome text',async()=>{
  const source=await import(pathToFileURL(resolve('locales/source/first-language.mjs')).href);const locales=JSON.parse(readFileSync('content/catalog.json','utf8')).locales;
  for(const {id} of locales){const labels=source.firstLanguageMessages(id),name=labels['ui.defaultDisplayName'];assert(name.trim()&&name.length<=24&&!/[\p{Cc}\p{Cf}<>]/u.test(name),id);const catalog=JSON.parse(readFileSync('locales/'+id+'.json','utf8')).messages;for(const [key,value]of Object.entries(labels))assert.equal(catalog[key],value);}
});
