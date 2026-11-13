import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{fileURLToPath}from'node:url';
import {menuEnvironment,menuBundle}from"./helpers/menu-fixture.ts";
import {defaultControls,validControls}from"../src/client/input-bindings.ts";
import {viewOf}from"../src/shared/view.ts";
import {fixture}from"./helpers/heavy-post-game-fixture.ts";import{keyedId,openId,lanyardId}from"../src/shared/heavy-traverse.ts";import{heavyActions}from"../src/client/heavy-actions.ts";
const root=fileURLToPath(new URL('../',import.meta.url)).replaceAll('\\','/').replace(/\/$/,'');
const messages=JSON.parse(fs.readFileSync(root+'/locales/en.json','utf8')).messages;
const stubs={'i18n.ts':'const m='+JSON.stringify(messages)+';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);'};
const state=(f:ReturnType<typeof fixture>)=>{const v=viewOf(f.g,f.p.id);return{p:v.players.find(p=>p.id===f.p.id)!,now:v.combatTick};};
const controls=()=>{const c=defaultControls();c.bindings.technique1=['KeyZ','KeyG'];c.bindings.technique2=['KeyN','KeyY'];c.gamepad.technique1=8;c.gamepad.technique3=6;c.gamepad.technique2=9;assert(validControls(c));return c;};

test('controlled canonical purchases renders five actual independently remapped rows and replaces contradictory base guide prose',async t=>{
  const env=menuEnvironment(t),ui=await menuBundle(t,fileURLToPath(new URL('../src/client/ui/heavy-controls.ts',import.meta.url)),stubs);
  for(const mode of ['loose','spade','floating']as const)for(const handling of[undefined,keyedId,openId]){
    const f=fixture(mode,true,handling),s=state(f);env.host.innerHTML=ui.heavyKitMarkup(s.p,controls(),true);
    assert.equal(env.host.querySelectorAll('[data-kit-action]').length,5);
    const b=env.host.querySelector('[data-kit-action="technique2"]')!,c=env.host.querySelector('[data-kit-action="technique1"]')!;
    for(const text of['Tethered Traverse','N','Y','9'])assert(b.textContent.includes(text),text);
    for(const text of['Z','G','8'])assert(c.textContent.includes(text),text);
    const prose=env.host.querySelector('p')!.textContent;
    assert(prose.includes('another separate Action 2'));assert(prose.includes('at least two original firing opportunities'));assert(prose.includes('unavailable ability leaves it posted'));
    assert(!prose.includes(messages['ui.heavy.traverseHelp']));assert(!prose.includes(messages['ui.heavy.clutchHelp']));
    assert.equal(heavyActions(s.p,s.now).extras.length,2);assert.equal(heavyActions(s.p,s.now).extras[1].id,lanyardId);
  }
});

test('actual sequential state selects lift, re-engage, stake, posted and release labels without admitting a new action row',async t=>{
  menuEnvironment(t);const ui=await menuBundle(t,fileURLToPath(new URL('../src/client/ui/heavy-controls.ts',import.meta.url)),stubs);
  for(const mode of ['loose','spade','floating']as const)for(const handling of[undefined,keyedId,openId]){
    const f=fixture(mode,true,handling);let s=state(f);assert.equal(ui.heavyHudLabel(s.p,'technique2',s.now),'Needs an active Traverse Stroke');
    f.step({technique1:true});s=state(f);assert.equal(ui.heavyHudLabel(s.p,'technique2',s.now),'Lift feed');
    f.step({technique2:true});s=state(f);assert(ui.heavyHudLabel(s.p,'technique2',s.now).startsWith('Re-engage feed'));
    f.step({technique2:true});s=state(f);assert(ui.heavyHudLabel(s.p,'technique2',s.now).startsWith('Stake the gun'));assert(!heavyActions(s.p,s.now).extras[1].blocked);
    f.step({technique2:true});s=state(f);assert(ui.heavyHudLabel(s.p,'technique2',s.now).startsWith('Gun posted'));assert(ui.heavyHudLabel(s.p,'technique1',s.now).startsWith('Release posted stroke'));assert(heavyActions(s.p,s.now).extras[1].blocked);
    f.step({technique1:true});s=state(f);assert.equal(ui.heavyHudLabel(s.p,'technique2',s.now),'Needs an active Traverse Stroke');
  }
});

test('one original opportunity left advertises a spent stake command and an actual rejected command cannot change that label',async t=>{
  menuEnvironment(t);const ui=await menuBundle(t,fileURLToPath(new URL('../src/client/ui/heavy-controls.ts',import.meta.url)),stubs),f=fixture('floating');
  f.step({technique1:true});f.step({technique2:true});while(f.g.combatTick<21)f.step();f.step({technique2:true});let s=state(f);
  assert.equal(ui.heavyHudLabel(s.p,'technique2',s.now),'Too late to stake this stroke');assert(heavyActions(s.p,s.now).extras[1].blocked);
  f.step({technique2:true});s=state(f);assert.equal(ui.heavyHudLabel(s.p,'technique2',s.now),'Too late to stake this stroke');assert.equal(f.status().heavyLanyardAt,0);
});
