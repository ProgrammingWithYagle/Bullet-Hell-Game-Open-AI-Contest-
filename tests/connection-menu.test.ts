import test from 'node:test';
import assert from 'node:assert/strict';
import {menuBundle,menuEnvironment} from './helpers/menu-fixture.ts';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function until(check:()=>boolean){const deadline=Date.now()+2000;while(!check()){if(Date.now()>deadline)throw Error('Timed out');await tick();}}
const opts={name:'Mara',classId:'soldier',mode:'short',difficulty:'baby'};
const deferred=()=>{let resolve!:(value?:unknown)=>void,reject!:(reason:unknown)=>void;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const mainStubs={
 'setup.ts': `export const setupOptions=()=>({name:'Mara',classId:'soldier',mode:'short',difficulty:'baby'});export function mountSetup(host,hooks){const f=globalThis.__launchFixture;f.menus++;f.hooks=hooks;host.innerHTML='<div id="home-marker"></div><p id="notice"></p>';return ()=>{f.menuDisposals++;};}`,
 'session.ts': `export class Session {constructor(){this.controller=new AbortController();this.signal=this.controller.signal;this.work=globalThis.__launchFixture.deferred();this.view=null;globalThis.__launchFixture.sessions.push(this);}connect(){this.connected=true;return this.work.promise;}offline(){return this.connect();}close(){this.closed=true;this.controller.abort(new DOMException('Cancelled','AbortError'));return Promise.resolve();}}`,
 'scene.ts': `export class CombatScene {constructor(){const f=globalThis.__launchFixture;this.assets=f.deferred();this.prepared=this.assets.promise;f.scenes.push(this);}ingest(){}}`,
 phaser: `export default {AUTO:0,Scale:{FIT:0,CENTER_BOTH:0},Game:class {constructor(){globalThis.__launchFixture.games.push(this);}destroy(){this.destroyed=true;}}};`,
 'audio.ts': `export class AudioBus {unlock(){return globalThis.__launchFixture.audio.promise;}setVolume(){}stop(){}sound(){return Promise.resolve();}}`,
 'controls.ts': `export class Controls {configure(){}clear(){}destroy(){}sample(){return {};}}`,
 'room-chat-ui.ts': `export class RoomChatUI {configure(){}setShortcutEnabled(){}destroy(){}handleShortcut(){globalThis.__launchFixture.shortcutCalls=(globalThis.__launchFixture.shortcutCalls??0)+1;return false;}}`,
 'room-invite-ui.ts': `export class RoomInviteUI {destroy(){}close(){}}export function roomInvitePlacement(){return 'combat';}`,
};
for(const late of ['success','error'] as const)
test(`Cancel keeps a newer load intact after the older join returns ${late}`,{timeout:10000},async t=>{
 const env=menuEnvironment(t),f:any={menus:0,menuDisposals:0,sessions:[],scenes:[],games:[],deferred,audio:deferred()};
 (globalThis as any).__launchFixture=f;env.cleanup.push(()=>Reflect.deleteProperty(globalThis,'__launchFixture'));f.audio.resolve();
 const ui=await menuBundle(t,'src/client/main.ts',mainStubs,'export {begin,leave};');env.cleanup.push(()=>ui.leave());
 const first=ui.begin(true,undefined,'public',opts);assert(env.host.querySelector('#cancel-loading'));
 f.scenes[0].assets.resolve();await until(()=>f.sessions[0].connected);
 const oldCancel=env.host.querySelector('#cancel-loading')!;oldCancel.click();await until(()=>f.menus===2);
 const second=ui.begin(true,undefined,'public',opts);assert.equal(f.scenes.length,2);
 const status=env.host.querySelector('#load-state')!.textContent;
 f.sessions[0].onStatus('ui.errorVersion');f.sessions[0].onView({});f.scenes[0].onLoadProgress(1);oldCancel.click();
 assert.equal(env.host.querySelector('#load-state')!.textContent,status);assert.equal(env.host.querySelector('#assets-progress')!.value,'0');
 late==='success'?f.sessions[0].work.resolve():f.sessions[0].work.reject(Error('ui.errorServer'));await first;
 assert.equal(f.menus,2);assert(env.host.querySelector('#loading-expedition'));assert(!f.games[1].destroyed);
 env.host.querySelector('#cancel-loading')!.click();await second;await until(()=>f.menus===3);
 assert(f.sessions.every((s:any)=>s.closed));assert(f.games.every((g:any)=>g.destroyed));
});
test('Escape cancels before artwork or audio settles and late completions do not reopen the game',{timeout:10000},async t=>{
 const env=menuEnvironment(t),f:any={menus:0,menuDisposals:0,sessions:[],scenes:[],games:[],deferred,audio:deferred()};
 (globalThis as any).__launchFixture=f;env.cleanup.push(()=>Reflect.deleteProperty(globalThis,'__launchFixture'));
 const ui=await menuBundle(t,'src/client/main.ts',mainStubs,'export {begin,leave};');env.cleanup.push(()=>ui.leave());
 const beginning=ui.begin(false,undefined,'public',opts);assert.equal(env.document.activeElement?.id,'loading-heading');
 env.key('Tab');assert.equal(env.document.activeElement?.id,'cancel-loading');assert.equal(env.host.querySelector('#loading-expedition')!.getAttribute('aria-modal'),'true');
 env.key('KeyC');assert.equal(f.shortcutCalls,undefined);assert.equal(env.document.activeElement?.id,'cancel-loading');
 env.document.hidden=true;for(const handler of env.document.listeners.get('visibilitychange')??[])handler({});assert.equal(env.host.querySelector('#pause-menu')!.hidden,true);
 env.key('Escape');await beginning;await until(()=>f.menus===2);
 f.audio.resolve();f.scenes[0].assets.resolve();await tick();assert.equal(f.menus,2);assert(!f.sessions[0].connected);assert(env.host.querySelector('#home-marker'));
});
