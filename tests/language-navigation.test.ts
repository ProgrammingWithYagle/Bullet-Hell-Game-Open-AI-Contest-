import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,readFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import english from '../locales/en.json';
import {menuEnvironment,menuBundle} from './helpers/menu-fixture.ts';
import {PROFILE_KEY} from '../src/client/profile.ts';
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const catalog=(id:string)=>({...english,meta:{...english.meta,locale:id,direction:id==='ar'?'rtl':'ltr'},messages:{...english.messages,'ui.profile':'profile-'+id}});
async function languages(t:TestContext,loaders:Record<string,()=>Promise<unknown>>){
  const env=menuEnvironment(t);(globalThis as any).__languageLoaders=Object.fromEntries(Object.entries(loaders).map(([id,load])=>['../../locales/'+id+'.json',load]));t.after(()=>Reflect.deleteProperty(globalThis,'__languageLoaders'));
  // Replace only Vite's generated platform glob map; compile the real catalog/persistence code.
  const marker="const loaders = import.meta.glob<Catalog>('../../locales/*.json', { import: 'default' });";
  const result=await build({entryPoints:['src/client/i18n.ts'],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'controlled-vite-catalog-loaders',setup(builder){builder.onLoad({filter:/[\\/]client[\\/]i18n\.ts$/},args=>{const source=readFileSync(args.path,'utf8');assert(source.includes(marker));return {contents:source.replace(marker,'const loaders = (globalThis as any).__languageLoaders;'),loader:'ts',resolveDir:dirname(args.path)};});}}]});
  const dir=mkdtempSync(join(tmpdir(),'grave-catalog-')),file=join(dir,'catalog.mjs');writeFileSync(file,result.outputFiles[0].text);t.after(()=>{unlinkSync(file);rmdirSync(dir);});
  return {...env,ui:await import(pathToFileURL(file).href)};
}

test('the latest language choice wins even when the older download finishes later',async t=>{
  const french=deferred<unknown>(),german=deferred<unknown>();const env=await languages(t,{fr:()=>french.promise,de:()=>german.promise});
  const older=env.ui.setLanguage('fr'),latest=env.ui.setLanguage('de');german.resolve(catalog('de'));await latest;french.resolve(catalog('fr'));await older;
  assert.equal(env.ui.locale,'de');assert.equal(env.ui.t('ui.profile'),'profile-de');assert.equal(env.saved.get('ga-language'),'de');assert.equal((env.document.documentElement as any).lang,'de');
});

test('choosing English cancels an older RTL language result without reversing document direction',async t=>{
  const arabic=deferred<unknown>(),env=await languages(t,{ar:()=>arabic.promise});const older=env.ui.setLanguage('ar');await env.ui.setLanguage('en');arabic.resolve(catalog('ar'));await older;
  assert.equal(env.ui.locale,'en');assert.equal((env.document.documentElement as any).dir,'ltr');assert.equal(env.saved.get('ga-language'),'en');
});

test('an aborted language request never changes the catalog, page direction or saved preference',async t=>{
  const arabic=deferred<unknown>(),env=await languages(t,{ar:()=>arabic.promise}),controller=new AbortController();
  await env.ui.setLanguage('en');const request=env.ui.setLanguage('ar',controller.signal);controller.abort();arabic.resolve(catalog('ar'));await request;
  assert.equal(env.ui.locale,'en');assert.equal((env.document.documentElement as any).dir,'ltr');assert.equal(env.saved.get('ga-language'),'en');
});

test('obsolete language failures are ignored while a current failure preserves the working language and can retry',async t=>{
  const french=deferred<unknown>();let failGerman=false;const env=await languages(t,{fr:()=>french.promise,de:async()=>{if(failGerman)throw Error('catalog unavailable');return catalog('de');}});
  let oldFailed=false;const older=env.ui.setLanguage('fr').catch(()=>{oldFailed=true;});await env.ui.setLanguage('de');french.reject(Error('older catalog unavailable'));await older;assert.equal(oldFailed,false);
  await env.ui.setLanguage('en');failGerman=true;await assert.rejects(()=>env.ui.setLanguage('de'),/catalog unavailable/);assert.equal(env.ui.locale,'en');assert.equal(env.saved.get('ga-language'),'en');
  failGerman=false;await env.ui.setLanguage('de');assert.equal(env.ui.locale,'de');
});

const setupHooks={resume(){},launch(){},profileChanged:async()=>{},settingsHTML:()=>'',bindSettings(){}};
test('leaving a setup page aborts its pending language choice without saving or redrawing the next page',async t=>{
  const env=menuEnvironment(t),pending=deferred<void>();(globalThis as any).__setupLanguage={pending};t.after(()=>Reflect.deleteProperty(globalThis,'__setupLanguage'));
  const ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':"export let locale='en';export const languages=[['en','English'],['fr','Français']],number=String,t=key=>key;export async function setLanguage(id,signal){await globalThis.__setupLanguage.pending.promise;if(signal?.aborted)return false;locale=id;return true;}"});
  const dispose=ui.mountSetup(env.host,setupHooks);t.after(dispose);const select=env.host.querySelector('#language')!;select.value='fr';const request=select.onchange!({target:select}) as Promise<void>;
  env.host.querySelector('#new-run')!.click();const current=env.host.querySelector('[data-class="medic"]')!;current.focus();pending.resolve();await request;
  assert(env.host.querySelector('[data-class="medic"]')===current,'The next page must not be redrawn');assert(env.document.activeElement===current,'The next page must keep keyboard focus');assert.equal(env.saved.has(PROFILE_KEY),false);
});

test('a language load error remains on the current page with a retry and the current selection',async t=>{
  const env=menuEnvironment(t),ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':"export const locale='en',languages=[['en','English'],['fr','Français']],number=String,t=key=>key;let attempt=0;export async function setLanguage(){if(++attempt===1)throw Error('catalog unavailable');return true;}"});
  const dispose=ui.mountSetup(env.host,setupHooks);t.after(dispose);const select=env.host.querySelector('#language')!;select.value='fr';await select.onchange!({target:select});
  assert.equal(select.value,'en');assert.equal(env.host.querySelector('#notice')!.textContent,'ui.errorLanguage');assert(env.host.querySelector('#new-run'));
  select.value='fr';await select.onchange!({target:select});assert(env.host.querySelector('#new-run'));
});

test('a completed language change keeps the current text draft, cursor and focused field',async t=>{
  const env=menuEnvironment(t),pending=deferred<void>();(globalThis as any).__setupLanguage={pending};t.after(()=>Reflect.deleteProperty(globalThis,'__setupLanguage'));
  const ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':"export let locale='en';export const languages=[['en','English'],['fr','Français']],number=String,t=key=>key;export async function setLanguage(id){await globalThis.__setupLanguage.pending.promise;locale=id;return true;}"});
  const dispose=ui.mountSetup(env.host,setupHooks);t.after(dispose);env.host.querySelector('#gentle-start')!.click();
  const select=env.host.querySelector('#language')!;select.value='fr';const request=select.onchange!({target:select}) as Promise<void>;
  const name=env.host.querySelector('#name')!;name.value='Keep this draft';name.dispatch('input');name.focus();name.setSelectionRange(2,7);pending.resolve();await request;
  const current=env.host.querySelector('#name')!;assert.equal(current.value,'Keep this draft');assert(env.document.activeElement===current,'Editing focus must survive translation');assert.equal(current.selectionStart,2);assert.equal(current.selectionEnd,7);
});

test('a working language change reports a storage error without reverting to an inconsistent menu',async t=>{
  const env=menuEnvironment(t),ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':"export let locale='en';export const languages=[['en','English'],['fr','Français']],number=String,t=key=>key;export async function setLanguage(id){locale=id;return true;}"});
  const dispose=ui.mountSetup(env.host,setupHooks);t.after(dispose);Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>env.saved.get(key)??null,setItem:()=>{throw Error('quota');}}});
  const select=env.host.querySelector('#language')!;select.value='fr';await select.onchange!({target:select});assert.equal(env.host.querySelector('#language')!.value,'fr');assert.equal(env.host.querySelector('#notice')!.textContent,'ui.errorSave');assert(env.host.querySelector('#new-run'));
});

test('a cosmetic profile refresh keeps an unrelated pending language choice active',async t=>{
  const french=deferred<unknown>(),env=await languages(t,{fr:()=>french.promise});(globalThis as any).__profileLanguageCore=env.ui;
  t.after(()=>{for(const key of ['__profileLanguageCore','__profileMenuHooks','__requestProfileLanguage'])Reflect.deleteProperty(globalThis,key);});
  const ui=await menuBundle(t,'src/client/main.ts',{
    'setup.ts':"export const setupOptions=()=>({name:'Mara',classId:'soldier',mode:'short',difficulty:'baby'});export function mountSetup(host,hooks){globalThis.__profileMenuHooks=hooks;host.innerHTML='<p id=\"notice\"></p>';return ()=>{};}",
    'scene.ts':"export class CombatScene {}",
    phaser:"export default {AUTO:0,Scale:{FIT:0,CENTER_BOTH:0}};",
    'audio.ts':"export class AudioBus {setVolume(){}stop(){}}",
    'i18n.ts':"export let locale='en';export const languages=[['en','English'],['fr','Français']],number=(...args)=>globalThis.__profileLanguageCore.number(...args),t=(...args)=>globalThis.__profileLanguageCore.t(...args),initialLanguage=()=> 'en';export async function setLanguage(...args){const result=await globalThis.__profileLanguageCore.setLanguage(...args);locale=globalThis.__profileLanguageCore.locale;return result;}globalThis.__requestProfileLanguage=setLanguage;",
  },'export {leave};');env.cleanup.push(()=>ui.leave());
  const pending=(globalThis as any).__requestProfileLanguage('fr');await (globalThis as any).__profileMenuHooks.profileChanged();french.resolve(catalog('fr'));await pending;
  assert.equal(env.ui.locale,'fr');assert.equal(env.saved.get('ga-language'),'fr');assert.equal(env.ui.t('ui.profile'),'profile-fr');
});
