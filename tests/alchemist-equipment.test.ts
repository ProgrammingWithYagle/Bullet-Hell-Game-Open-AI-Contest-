import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import { idleInput } from '../src/shared/protocol.ts';
import { viewOf } from '../src/shared/view.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';
import english from '../locales/en.json';

test('Bought bellows capacity and sample supplies affect only primary samples, preserving ingredients, prepared vials, batch charges and ability clocks',()=>{
  const g=new Game(),p=g.addPlayer('p','Perrin','alchemist');p.coins=p.incomeGranted=3000;
  assert(g.transact(p.id,{id:'better',kind:'weapon',item:'alchemist-3'}).ok);
  assert(g.transact(p.id,{id:'capacity',kind:'upgrade',item:'magazine'}).ok);
  assert(g.transact(p.id,{id:'samples',kind:'supply',item:'ammo-pouch'}).ok);
  g.start();p.invulnerableUntil=1e9;g.boss.staggerUntil=g.boss.deadline=1e9;
  assert(g.kitStatus(p.id).alchemySamplesCapacity!>16);
  g.submitInput(p.id,{...idleInput(),sequence:1,q:true});g.step();for(let n=0;n<12;n++)g.step();
  g.submitInput(p.id,{...idleInput(),sequence:2,ultimate:true});g.step();
  const before=structuredClone(g.kitStatus(p.id)),clocks=[p.qAt,p.eAt,p.ultimateAt];p.ammo=1;
  assert.equal(p.supplies[0]?.id,'ammo-pouch');
  g.submitInput(p.id,{...idleInput(),sequence:3,supply:0});g.step();
  assert.equal(p.ammo,g.stats(p).magazine);
  const after=g.kitStatus(p.id);
  for(const key of ['alchemyCinder','alchemyChalk','alchemySap','alchemyPrepared','alchemyBatchCharges','alchemyBatchUntil'] as const)assert.deepEqual(after[key],before[key]);
  assert.deepEqual([p.qAt,p.eAt,p.ultimateAt],clocks);
});
test('Alchemy gear explains actual samples and recipe recovery while using unchanged authoritative equipment item IDs',async context=>{
  const env=menuEnvironment(context),messages=english.messages;
  const ui=await menuBundle(context,'src/client/ui/shop.ts',{
    'i18n.ts':'const m='+JSON.stringify(messages)+';export const locale="en",number=String,t=(key)=>m[key]??key;',
    'assets.ts':'export const assets={resourceIcons:{},upgrades:{},items:{"weapon/alchemist-0":"/bellows.png","supply/alchemist-sample-case":"/samples.png","upgrade/alchemist-magazine":"/chamber.png"}};',
  });
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'CSS');Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(v:string)=>v}});
  context.after(()=>descriptor?Object.defineProperty(globalThis,'CSS',descriptor):Reflect.deleteProperty(globalThis,'CSS'));
  const g=new Game(),p=g.addPlayer('p','Perrin','alchemist');p.coins=1000;
  const player=viewOf(g,p.id).players[0],requests:unknown[]=[];
  env.host.innerHTML='<div class="loadout-editor">'+ui.shopMarkup(player)+'</div>';
  const binding=ui.bindShop(env.host,player,(request:unknown)=>requests.push(request));env.cleanup.push(()=>binding.dispose());
  env.host.querySelector('[data-shop-tab="gear"]')!.click();
  assert.equal(env.host.querySelector('[data-inspect="ammo-pouch"] img')!.getAttribute('src'),'/samples.png');
  assert.equal(env.host.querySelector('[data-inspect="magazine"] img')!.getAttribute('src'),'/chamber.png');
  env.host.querySelector('[data-inspect="alchemist-0"]')!.click();
  for(const label of ['Samples','Refill bellows','Actual positive primary hits','every five seconds'])assert(env.host.textContent.includes(label));
  env.host.querySelector('[data-inspect="ammo-pouch"]')!.click();assert(env.host.textContent.includes('Does not restore ingredients'));
  env.host.querySelector('#buy-selected')!.click();assert.deepEqual(requests,[{kind:'supply',item:'ammo-pouch'}]);
});
