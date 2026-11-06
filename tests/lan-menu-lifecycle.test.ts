import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import type {DesktopBridge, LanState} from '../src/shared/lan.ts';
import {menuBundle,menuEnvironment} from './helpers/menu-fixture.ts';

const idle:LanState={active:false,port:null,endpoints:[]};
const active:LanState={active:true,port:2568,endpoints:['http://192.168.1.20:2568']};
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));
async function fixture(t:TestContext,bridge:DesktopBridge){
  const env=menuEnvironment(t);window.graveDesktop=bridge;
  const ui=await menuBundle(t,'src/client/ui/lan.ts');
  const created:string[]=[],joined:string[]=[];let backs=0;
  const dispose=ui.mountLan(env.host,(endpoint:string)=>created.push(endpoint),(endpoint:string)=>joined.push(endpoint),()=>{backs++;});
  t.after(()=>dispose?.());
  return {...env,created,joined,dispose,backs:()=>backs};
}

test('leaving a connected LAN menu prevents delayed responses and detached controls from changing the next page',async t=>{
  const status=deferred<LanState>();let starts=0;
  const env=await fixture(t,{platform:'windows',lanStatus:()=>status.promise,startLan:async()=>{starts++;return {ok:true,state:active};},stopLan:async()=>idle});
  const oldStart=env.host.querySelector('[data-lan-host]')!;
  env.host.querySelector('[data-lan-back]')!.click();env.host.innerHTML='<p id="next-screen">Next screen</p>';
  status.resolve(active);await turn();oldStart.click();await turn();
  assert(env.host.querySelector('#next-screen'));assert.equal(starts,0);assert.equal(env.backs(),1);
});

test('a late initial status cannot undo a completed hosting request',async t=>{
  const status=deferred<LanState>(),start=deferred<Awaited<ReturnType<DesktopBridge['startLan']>>>();
  const env=await fixture(t,{platform:'windows',lanStatus:()=>status.promise,startLan:()=>start.promise,stopLan:async()=>idle});
  env.host.querySelector('[data-lan-host]')!.click();start.resolve({ok:true,state:active});await turn();
  status.resolve(idle);await turn();assert(env.host.querySelector('[data-lan-stop]'));assert(!env.host.querySelector('[data-lan-host]'));
  env.host.querySelector('[data-lan-create]')!.click();assert.deepEqual(env.created,['http://127.0.0.1:2568']);
});

test('a delayed LAN status keeps the typed address and keyboard editing position',async t=>{
  const status=deferred<LanState>();
  const env=await fixture(t,{platform:'windows',lanStatus:()=>status.promise,startLan:async()=>({ok:true,state:active}),stopLan:async()=>idle});
  const address=env.host.querySelector('[data-lan-address]')!;address.value='192.168.1.73:2666';address.focus();address.setSelectionRange(5,10);
  status.resolve(active);await turn();const current=env.host.querySelector('[data-lan-address]')!;
  assert.equal(current.value,'192.168.1.73:2666');assert.equal(env.document.activeElement,current);assert.equal(current.selectionStart,5);assert.equal(current.selectionEnd,10);
  env.host.querySelector('[data-lan-join]')!.click();assert.deepEqual(env.joined,['http://192.168.1.73:2666']);
});

test('failed Stop hosting requests leave a usable retry without erasing the address draft',async t=>{
  let stops=0;const env=await fixture(t,{platform:'windows',lanStatus:async()=>active,startLan:async()=>({ok:true,state:active}),stopLan:async()=>{if(++stops===1)throw Error('temporary failure');return idle;}});
  await turn();env.host.querySelector('[data-lan-address]')!.value='192.168.1.44:2568';env.host.querySelector('[data-lan-stop]')!.click();await turn();
  const retry=env.host.querySelector('[data-lan-stop]')!;assert.equal(retry.disabled,false);assert.equal(env.host.querySelector('[data-lan-status]')!.textContent,'ui.errorServer');
  retry.click();await turn();assert.equal(stops,2);assert(env.host.querySelector('[data-lan-host]'));assert.equal(env.host.querySelector('[data-lan-address]')!.value,'192.168.1.44:2568');
});

test('pending hosting blocks duplicate actions while Back still leaves safely',async t=>{
  const start=deferred<Awaited<ReturnType<DesktopBridge['startLan']>>>();let starts=0;
  const env=await fixture(t,{platform:'windows',lanStatus:async()=>idle,startLan:()=>{starts++;return start.promise;},stopLan:async()=>idle});await turn();
  env.host.querySelector('[data-lan-address]')!.value='192.168.1.44:2568';const button=env.host.querySelector('[data-lan-host]')!;button.click();button.click();env.host.querySelector('[data-lan-join]')!.click();
  assert.equal(starts,1);assert.deepEqual(env.joined,[]);env.host.querySelector('[data-lan-back]')!.click();env.host.innerHTML='<p id="next-screen">Next screen</p>';
  start.resolve({ok:true,state:active});await turn();assert(env.host.querySelector('#next-screen'));assert.equal(env.backs(),1);
});

test('the real setup disposes local-network actions before mounting another menu',async t=>{
  const env=menuEnvironment(t),status=deferred<LanState>();let starts=0;
  window.graveDesktop={platform:'windows',lanStatus:()=>status.promise,startLan:async()=>{starts++;return {ok:true,state:active};},stopLan:async()=>idle};
  const ui=await menuBundle(t,'src/client/ui/setup.ts');const dispose=ui.mountSetup(env.host,{resume(){},launch(){},profileChanged:async()=>{},settingsHTML:()=>'',bindSettings(){}});t.after(dispose);
  env.host.querySelector('#lan')!.click();const oldStart=env.host.querySelector('[data-lan-host]')!;env.host.querySelector('#brand-home')!.click();oldStart.click();status.resolve(active);await turn();
  assert.equal(starts,0);assert(env.host.querySelector('#new-run'));assert(env.host.querySelector('[data-home-gallery]'));
});
