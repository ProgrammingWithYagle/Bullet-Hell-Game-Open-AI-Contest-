import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { mageBindingIds } from '../src/shared/mage-pivot-sigil.ts';
import { mageSpatialIds, type WaymarkStatus } from '../src/shared/mage-waymark-return.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, hold, side } = mageSpatialIds;
const messages = JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons = Object.fromEntries([...Object.values(mageSpatialIds),...Object.values(mageBindingIds)].map(id=>[id,id+'.png']));
const stubs = {
  'assets.ts':'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:'+JSON.stringify(icons)+'};',
  'i18n.ts':'const messages='+JSON.stringify(messages)+
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('Spatial Craft has distinct Paper Seal and Binding foundations with two exclusive landings',()=>{
  const path=specializationMapLayout('mage',entry)!;
  const all=specializationMapLayout('mage')!;
  assert.deepEqual(path.nodes.filter(node=>node.reference).map(node=>node.id),['mage-warding-1']);
  assert.deepEqual(path.edges,[{from:'mage-warding-1',to:entry},{from:entry,to:hold},{from:entry,to:side}]);
  assert.deepEqual(path.exclusions,[{a:hold,b:side}]);
  assert.equal(specializationFocus(path,entry,'ArrowUp'),'mage-warding-1');
  assert.equal(specializationFocus(path,hold,'ArrowRight'),side);
  assert.equal(all.nodes.find(node=>node.id===entry)?.x,all.nodes.find(node=>node.id==='mage-warding-1')?.x);
  assert.equal(all.nodes.find(node=>node.id===mageBindingIds.entry)?.x,all.nodes.find(node=>node.id==='mage-control-1')?.x);
  assert.equal(new Set(all.nodes.map(node=>node.x+','+node.y)).size,all.nodes.length);
});

for (const expanded of [false,true]) test((expanded ? 'Expanded' : 'Compact')+' Mage shop shows both remapped actions and confirms the chosen Spatial Craft fitting',async t=>{
  const env=menuEnvironment(t);
  const shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(key:string)=>key}});
  t.after(()=>css?Object.defineProperty(globalThis,'CSS',css):Reflect.deleteProperty(globalThis,'CSS'));
  const game=new Game({mode:'short'});
  game.encounter=1;
  const mage=game.addPlayer('solo','Sable','mage');
  const controls=defaultControls();
  controls.bindings.technique1=['KeyI','KeyJ']; controls.gamepad.technique1=16;
  controls.bindings.technique2=['KeyY','KeyN']; controls.gamepad.technique2=9;
  assert(validControls(controls));
  const buy=(item:string)=>game.transact(mage.id,{id:'confirm-'+item,kind:'skill',item});
  for(const id of ['mage-control-1',mageBindingIds.entry,'mage-warding-1'])assert(buy(id).ok);
  const selected=expanded?side:hold,rejected=expanded?hold:side,confirmed:string[]=[];
  function show(){
    const player=viewOf(game,mage.id).players[0];
    const context=[[],expanded,'normal',undefined,true,controls] as const;
    env.host.innerHTML='<div class="loadout-editor">'+shop.shopMarkup(player,...context)+'</div>';
    const binding=shop.bindShop(env.host,player,(request:{item:string})=>{
      assert(buy(request.item).ok);
      confirmed.push(request.item);
    },...context);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    env.host.querySelector('[data-specialization-route="'+entry+'"]')!.click();
    return binding;
  }
  let binding=show();
  try{
    assert(env.host.querySelector('[data-kit-action="technique1"]'));
    assert(!env.host.querySelector('[data-kit-action="technique2"]'));
    env.host.querySelector('[data-inspect="'+entry+'"]')!.click();
    assert.equal(env.host.querySelector('#buy-selected')!.disabled,false);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(confirmed,[entry]);
  }finally{binding.dispose();}
  binding=show();
  try{
    const guide=env.host.querySelector('[data-mage-kit]')!;
    for(const [slot,words] of [['technique1',['Pivot Sigil','I','J','16']],['technique2',['Waymark Return','Y','N','9']]] as const){
      const text=guide.querySelector('[data-kit-action="'+slot+'"]')!.textContent;
      for(const word of words)assert(text.includes(word));
    }
    env.host.querySelector('[data-inspect="'+selected+'"]')!.click();
    assert(env.host.querySelectorAll('img').some(img=>img.getAttribute('src')===selected+'.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(confirmed,[entry,selected]);
  }finally{binding.dispose();}
  binding=show();
  try{
    assert(env.host.querySelector('[data-mage-kit]')!.textContent.includes(expanded?'aim across the trail':'Take a shot'));
    env.host.querySelector('[data-inspect="'+rejected+'"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  }finally{binding.dispose();}
});

test('Spatial Craft HUD follows the live state without changing the Binding clock',async t=>{
  const {mageActions,mageBindingLabel,mageWaymarkLabel}=await menuBundle(t,'src/client/mage-actions.ts',stubs) as typeof import('../src/client/mage-actions.ts');
  const game=new Game({mode:'short'}),mage=game.addPlayer('solo','Sable','mage');
  const base=viewOf(game,mage.id).players[0];
  const verify=(waymark:WaymarkStatus,label:string,id:string)=>{
    const player={...base,skills:[mageBindingIds.entry,entry,id],qAt:201,eAt:265,kit:{...base.kit,
      pivotSigil:{phase:'fixed' as const,ready:false,until:67},waymark}};
    const actions=mageActions(player);
    assert.equal(actions.qAt,201);
    assert.equal(mageBindingLabel(player,55),'Line fixed');
    assert.equal(mageWaymarkLabel(player,55),label);
    assert.deepEqual(actions.extras[1],{key:'technique2',id,at:waymark.ready?0:waymark.until,blocked:!waymark.ready});
  };
  verify({phase:'idle',ready:true,until:40},'Set waymark',entry);
  verify({phase:'marked',ready:false,until:118,walked:80},'Walk the trail',entry);
  verify({phase:'marked',ready:true,until:118,walked:101},'Follow the trail',entry);
  verify({phase:'returning',ready:true,until:79,canHold:true,traveled:48},'Hold the trace',hold);
  verify({phase:'resting',ready:true,until:63,traveled:64},'Resume the return',hold);
  verify({phase:'returning',ready:false,until:80,sideWindow:true},'Aim across the trail',side);
  verify({phase:'returning',ready:true,until:80,sideWindow:true,canSide:true},'Take side landing',side);
});
