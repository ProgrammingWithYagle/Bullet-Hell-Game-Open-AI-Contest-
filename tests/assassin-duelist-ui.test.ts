import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { duelistIds, type CalledOpeningStatus } from '../src/shared/assassin-called-opening.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const {entry,passing,counter}=duelistIds;
const messages=JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons=Object.fromEntries(Object.values(duelistIds).map(id=>[id,id+'.png']));
const stubs={
  'assets.ts':'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:'+JSON.stringify(icons)+'};',
  'i18n.ts':'const messages='+JSON.stringify(messages)+
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Duelist map shows exactly one live foundation and two exclusive fittings',()=>{
  const path=specializationMapLayout('assassin',entry)!;
  const overview=specializationMapLayout('assassin')!;
  assert.deepEqual(path.nodes.filter(row=>row.reference).map(row=>row.id),['assassin-precision-1']);
  assert.deepEqual(path.edges,[{from:'assassin-precision-1',to:entry},{from:entry,to:passing},{from:entry,to:counter}]);
  assert.deepEqual(path.exclusions,[{a:passing,b:counter}]);
  assert.equal(specializationFocus(path,entry,'ArrowUp'),'assassin-precision-1');
  assert.equal(specializationFocus(path,passing,'ArrowRight'),counter);
  assert.deepEqual(overview.nodes.map(n=>n.id),path.nodes.map(n=>n.id));
});

for(const expanded of [false,true])test((expanded?'Expanded':'Compact')+' Duelist shop buys the selected fitting through the remapped guide',async t=>{
  const env=menuEnvironment(t);
  const shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(key:string)=>key}});
  t.after(()=>css?Object.defineProperty(globalThis,'CSS',css):Reflect.deleteProperty(globalThis,'CSS'));
  const game=new Game({mode:'short'});
  game.encounter=1;
  const assassin=game.addPlayer('assassin','Nyx','assassin');
  const controls=defaultControls();
  controls.bindings.technique1=['KeyI','KeyJ'];controls.gamepad.technique1=16;
  assert(validControls(controls));
  const buy=(item:string)=>game.transact(assassin.id,{id:'duelist-ui-'+item,kind:'skill',item});
  assert(buy('assassin-precision-1').ok);
  const selected=expanded?counter:passing,rejected=expanded?passing:counter,purchased:string[]=[];
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
    assert(!env.host.querySelector('[data-kit-action="technique1"]'));
    env.host.querySelector('[data-inspect="'+entry+'"]')!.click();
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased,[entry]);
  }finally{handle.dispose();}
  handle=show();
  try{
    const kit=env.host.querySelector('[data-assassin-kit]')!;
    assert(kit.textContent.includes('Shadow Step'));
    const row=kit.querySelector('[data-kit-action="technique1"]')!.textContent;
    for(const token of ['Called Opening','I','J','16'])assert(row.includes(token));
    env.host.querySelector('[data-inspect="'+selected+'"]')!.click();
    assert(env.host.querySelectorAll('img').some(img=>img.getAttribute('src')===selected+'.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased,[entry,selected]);
  }finally{handle.dispose();}
  handle=show();
  try{
    const kit=env.host.querySelector('[data-assassin-kit]')!;
    assert(kit.textContent.includes(expanded?'press while stepping the other way':'another sideways step'));
    env.host.querySelector('[data-inspect="'+rejected+'"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  }finally{handle.dispose();}
});

test('The Duelist HUD retains ordinary Invisibility and uses the exact current opening state',async t=>{
  const {assassinActions,assassinDuelLabel}=await menuBundle(t,'src/client/assassin-actions.ts',stubs) as typeof import('../src/client/assassin-actions.ts');
  const game=new Game({mode:'short'}),assassin=game.addPlayer('assassin','Nyx','assassin');
  const base=viewOf(game,assassin.id).players[0];
  assert.equal(assassinActions(base).extras.length,0);
  function check(calledOpening:CalledOpeningStatus,label:string,id:string){
    const player={...base,skills:[entry,id],qAt:102,eAt:156,ultimateAt:204,kit:{...base.kit,calledOpening}};
    const actions=assassinActions(player);
    assert.equal(actions.qAt,102);
    assert.equal(actions.qNameKey,null);
    assert.equal(assassinDuelLabel(player,55),label);
    assert.deepEqual(actions.extras,[{key:'technique1',id,at:calledOpening.ready?0:calledOpening.until,blocked:!calledOpening.ready}]);
  }
  check({phase:'idle',ready:true,until:40},'Mark one enemy',entry);
  check({phase:'measuring',ready:false,until:108,progress:.35},'Walk past one shoulder',entry);
  check({phase:'open',ready:false,until:108},'Stop and aim',entry);
  check({phase:'open',ready:true,until:108},'Strike the opening',entry);
  check({phase:'open',ready:true,until:108,canPass:true},'Cut on the next step',passing);
  check({phase:'reposition',ready:false,until:108,progress:.45},'Walk back across the line',counter);
});
