import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { infiltratorIds, type SlipRouteStatus } from '../src/shared/assassin-slip-route.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const {entry,relay,threshold}=infiltratorIds;
const messages=JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons=Object.fromEntries(Object.values(infiltratorIds).map(id=>[id,id+'.png']));
const stubs={
  'assets.ts':'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:'+JSON.stringify(icons)+'};',
  'i18n.ts':'const messages='+JSON.stringify(messages)+
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Infiltrator map shows exactly one live foundation and two exclusive fittings',()=>{
  const path=specializationMapLayout('assassin',entry)!;
  const overview=specializationMapLayout('assassin')!;
  assert.deepEqual(path.nodes.filter(row=>row.reference).map(row=>row.id),['assassin-ambush-1']);
  assert.deepEqual(path.edges,[{from:'assassin-ambush-1',to:entry},{from:entry,to:relay},{from:entry,to:threshold}]);
  assert.deepEqual(path.exclusions,[{a:relay,b:threshold}]);
  assert.equal(specializationFocus(path,entry,'ArrowUp'),'assassin-ambush-1');
  assert.equal(specializationFocus(path,relay,'ArrowRight'),threshold);
  assert(path.nodes.every(node => overview.nodes.some(candidate => candidate.id === node.id)));
  assert(overview.nodes.some(node => node.id === 'assassin-called-opening-1'));
});

for(const expanded of [false,true])test((expanded?'Expanded':'Compact')+' Infiltrator shop buys the selected fitting through the remapped guide',async t=>{
  const env=menuEnvironment(t);
  const shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(key:string)=>key}});
  t.after(()=>css?Object.defineProperty(globalThis,'CSS',css):Reflect.deleteProperty(globalThis,'CSS'));
  const game=new Game({mode:'short'});
  game.encounter=1;
  const assassin=game.addPlayer('assassin','Nyx','assassin');
  const controls=defaultControls();
  controls.bindings.technique2=['KeyN','KeyY'];controls.gamepad.technique2=9;
  assert(validControls(controls));
  const buy=(item:string)=>game.transact(assassin.id,{id:'infiltrator-ui-'+item,kind:'skill',item});
  assert(buy('assassin-ambush-1').ok);
  const selected=expanded?threshold:relay,rejected=expanded?relay:threshold,purchased:string[]=[];
  function show(){
    const player=viewOf(game,assassin.id).players[0], context=[[],expanded,'normal',undefined,true,controls] as const;
    env.host.innerHTML='<div class="loadout-editor">'+shop.shopMarkup(player,...context)+'</div>';
    const handle=shop.bindShop(env.host,player,(request:{item:string})=>{
      assert(buy(request.item).ok);
      purchased.push(request.item);
    },...context);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    return handle;
  }
  let handle=show();
  try{
    assert(!env.host.querySelector('[data-kit-action="technique2"]'));
    env.host.querySelector('[data-inspect="'+entry+'"]')!.click();
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased,[entry]);
  }finally{handle.dispose();}
  handle=show();
  try{
    const kit=env.host.querySelector('[data-assassin-kit]')!;
    assert(kit.textContent.includes('Shadow Step'));
    const row=kit.querySelector('[data-kit-action="technique2"]')!.textContent;
    for(const token of ['Slip Route','N','Y','9'])assert(row.includes(token));
    env.host.querySelector('[data-inspect="'+selected+'"]')!.click();
    assert(env.host.querySelectorAll('img').some(img=>img.getAttribute('src')===selected+'.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased,[entry,selected]);
  }finally{handle.dispose();}
  handle=show();
  try{
    const kit=env.host.querySelector('[data-assassin-kit]')!;
    assert(kit.textContent.includes(expanded?'wakes when a hostile walks':'follows your walked ground'));
    env.host.querySelector('[data-inspect="'+rejected+'"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  }finally{handle.dispose();}
});

test('The Infiltrator HUD keeps Invisibility and Duelist available and labels the live route states',async t=>{
  const {assassinActions,assassinSlipLabel}=await menuBundle(t,'src/client/assassin-actions.ts',stubs) as typeof import('../src/client/assassin-actions.ts');
  const game=new Game({mode:'short'}),assassin=game.addPlayer('assassin','Nyx','assassin');
  const base=viewOf(game,assassin.id).players[0];
  assert.equal(assassinActions(base).extras.length,0);
  function check(slipRoute:SlipRouteStatus,label:string,id:string){
    const duel='assassin-called-opening-1';
    const player={...base,skills:[duel,entry,id],qAt:102,eAt:156,ultimateAt:204,kit:{...base.kit,slipRoute}};
    const actions=assassinActions(player);
    assert.equal(actions.qAt,102);
    assert.equal(actions.qNameKey,null);
    assert.equal(assassinSlipLabel(player,55),label);
    assert.deepEqual(actions.extras[0],{key:'technique1',id:duel,at:156,blocked:true});
    assert.deepEqual(actions.extras[1],{key:'technique2',id,at:slipRoute.ready?0:slipRoute.until,blocked:!slipRoute.ready});
  }
  check({phase:'idle',ready:true,until:40},'Start Slip Route',entry);
  check({phase:'walk',ready:false,until:108,progress:.35},'Walk behind cover',entry);
  check({phase:'exit',ready:false,until:108},'Stop at the exit',entry);
  check({phase:'exit',ready:true,until:108},'Leave an echo',entry);
  check({phase:'exit',ready:true,until:108},'Watch the entrance',threshold);
  check({phase:'watch',ready:true,until:108},'Call echo early',threshold);
  check({phase:'watch',ready:false,until:108},'Echo waiting',threshold);
  check({phase:'relay',ready:true,until:108},'Send echo along route',relay);
  check({phase:'relaying',ready:false,until:108},'Echo following steps',relay);
});
