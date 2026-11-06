import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {menuBundle,menuEnvironment} from './helpers/menu-fixture.ts';
import {freshProfile,PROFILE_KEY,PROFILE_BACKUP_KEY} from '../src/client/profile.ts';

const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes;});return {promise,resolve};}
function file(element:object,text:()=>Promise<string>){Object.defineProperty(element,'files',{configurable:true,value:[{size:100,text}]});}
async function profile(t:TestContext,changed:()=>Promise<unknown>=async()=>{}){
  const env=menuEnvironment(t),ui=await menuBundle(t,'src/client/ui/profile.ts');
  env.saved.set(PROFILE_KEY,JSON.stringify(freshProfile()));
  let backs=0;const dispose=ui.mountProfile(env.host,()=>{backs++;},changed);t.after(()=>dispose?.());
  return {...env,dispose,backs:()=>backs};
}

test('leaving Profile while a file is read prevents a late import from replacing saved progress',async t=>{
  const read=deferred<string>(),env=await profile(t);const before=env.saved.get(PROFILE_KEY)!;
  const input=env.host.querySelector('[data-import-profile]')!;file(input,()=>read.promise);input.dispatch('change');
  env.host.querySelector('[data-profile-back]')!.click();env.host.innerHTML='<p id="next-screen">Next screen</p>';
  const incoming=freshProfile();incoming.locale='fr';read.resolve(JSON.stringify(incoming));await turn();await turn();
  assert.equal(env.saved.get(PROFILE_KEY),before);assert.equal(env.saved.has(PROFILE_BACKUP_KEY),false);assert(env.host.querySelector('#next-screen'));assert.equal(env.backs(),1);
});

test('a pending profile import ignores conflicting file and cosmetic actions and remains usable afterwards',async t=>{
  const read=deferred<string>();let changes=0;const env=await profile(t,async()=>{changes++;});
  const input=env.host.querySelector('[data-import-profile]')!;file(input,()=>read.promise);input.dispatch('change');assert.equal(input.disabled,true);
  const second=freshProfile();second.locale='de';file(input,async()=>JSON.stringify(second));input.dispatch('change');env.host.querySelector('[data-cosmetic="field-mark"]')!.click();
  const first=freshProfile();first.locale='fr';read.resolve(JSON.stringify(first));await turn();await turn();
  assert.equal(JSON.parse(env.saved.get(PROFILE_KEY)!).locale,'fr');assert.equal(changes,1);assert.equal(env.host.querySelector('[data-import-profile]')!.disabled,false);
});

test('valid profile files report storage failures accurately and keep the previous bytes available to export',async t=>{
  const env=await profile(t),before=env.saved.get(PROFILE_KEY)!;let fail=true;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>env.saved.get(key)??null,setItem:(key:string,value:string)=>{if(key===PROFILE_KEY&&fail)throw Error('quota');env.saved.set(key,value);}}});
  const incoming=freshProfile();incoming.locale='fr';const input=env.host.querySelector('[data-import-profile]')!;file(input,async()=>JSON.stringify(incoming));input.dispatch('change');await turn();await turn();
  assert.equal(env.host.querySelector('[data-profile-status]')!.textContent,'ui.errorSave');assert.equal(env.saved.get(PROFILE_KEY),before);assert.equal(env.host.querySelector('[data-export-profile]')!.disabled,false);assert.equal(input.disabled,false);
  fail=false;input.dispatch('change');await turn();await turn();assert.equal(JSON.parse(env.saved.get(PROFILE_KEY)!).locale,'fr');
});

test('a disposed profile cannot save from its detached cosmetic or file controls',async t=>{
  let changes=0;const env=await profile(t,async()=>{changes++;}),before=env.saved.get(PROFILE_KEY)!;
  const cosmetic=env.host.querySelector('[data-cosmetic="field-mark"]')!,input=env.host.querySelector('[data-import-profile]')!;
  env.dispose?.();const incoming=freshProfile();incoming.locale='fr';file(input,async()=>JSON.stringify(incoming));input.dispatch('change');cosmetic.click();await turn();await turn();
  assert.equal(changes,0);assert.equal(env.saved.get(PROFILE_KEY),before);
});

test('a successful profile import keeps its notice and returns focus to the current import control',async t=>{
  const env=await profile(t),incoming=freshProfile();incoming.locale='fr';const input=env.host.querySelector('[data-import-profile]')!;input.focus();file(input,async()=>JSON.stringify(incoming));input.dispatch('change');await turn();await turn();
  assert.equal(env.saved.get(PROFILE_BACKUP_KEY),JSON.stringify(freshProfile()));assert(env.document.activeElement===env.host.querySelector('[data-import-profile]'),'Focus should return to the current import control');
  assert(env.host.querySelector('[data-profile-status]')!.textContent.length>0);
});

test('actual setup ignores an older profile refresh after moving to a different page',async t=>{
  const env=menuEnvironment(t),changed=deferred<void>();let changes=0;const ui=await menuBundle(t,'src/client/ui/setup.ts');
  const dispose=ui.mountSetup(env.host,{resume(){},launch(){},profileChanged:()=>{changes++;return changed.promise;},settingsHTML:()=>'',bindSettings(){}});t.after(dispose);
  env.host.querySelector('#profile')!.click();env.host.querySelector('[data-cosmetic="field-mark"]')!.click();assert.equal(changes,1);
  env.host.querySelector('#brand-home')!.click();env.host.querySelector('#new-run')!.click();const current=env.host.querySelector('[data-class="medic"]')!;current.focus();changed.resolve();await turn();await turn();
  assert(env.host.querySelector('[data-class="medic"]')===current,'The later page must keep its controls');assert(env.document.activeElement===current,'The later page must keep keyboard focus');assert(!env.host.querySelector('[data-profile-status]'));
});

test('an imported language refreshes its owning setup and keeps the success notice and import focus',async t=>{
  const env=menuEnvironment(t);t.after(()=>Reflect.deleteProperty(globalThis,'__profileLanguage'));
  const ui=await menuBundle(t,'src/client/ui/setup.ts',{'i18n.ts':"export let locale='en';export const languages=[['en','English'],['fr','Français']],number=String,t=key=>key;export async function setLanguage(id){locale=id;return true;}globalThis.__profileLanguage=setLanguage;"});
  const dispose=ui.mountSetup(env.host,{resume(){},launch(){},profileChanged:async()=>{await (globalThis as any).__profileLanguage(JSON.parse(env.saved.get(PROFILE_KEY)!).locale);},settingsHTML:()=>'',bindSettings(){}});t.after(dispose);
  env.host.querySelector('#profile')!.click();const input=env.host.querySelector('[data-import-profile]')!,incoming=freshProfile();incoming.locale='fr';input.focus();file(input,async()=>JSON.stringify(incoming));input.dispatch('change');await turn();await turn();
  assert.equal(env.host.querySelector('#language')!.value,'fr');assert(env.host.querySelector('[data-profile-status]')!.textContent.length>0);assert(env.document.activeElement===env.host.querySelector('[data-import-profile]'),'Focus should move only to the owned replacement');
});
