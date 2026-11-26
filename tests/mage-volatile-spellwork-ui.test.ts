import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { mageVolatileIds, type FuseStatus } from '../src/shared/mage-fuse-seal.ts';
import { mageBindingIds } from '../src/shared/mage-pivot-sigil.ts';
import { mageSpatialIds } from '../src/shared/mage-waymark-return.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, shunt, twin } = mageVolatileIds;
const messages = JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons = Object.fromEntries([...Object.values(mageBindingIds),...Object.values(mageSpatialIds),...Object.values(mageVolatileIds)]
  .map(id=>[id,id+'.png']));
const stubs = {
  'assets.ts':'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:'+JSON.stringify(icons)+'};',
  'i18n.ts':'const messages='+JSON.stringify(messages)+
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('Volatile Spellwork is attached to Ash Script with two fitted paths and a collision-free Mage map',()=>{
  const route=specializationMapLayout('mage',entry)!;
  const overview=specializationMapLayout('mage')!;
  assert.deepEqual(route.nodes.filter(node=>node.reference).map(node=>node.id),['mage-hexcraft-1']);
  assert.deepEqual(route.edges,[{from:'mage-hexcraft-1',to:entry},{from:entry,to:shunt},{from:entry,to:twin}]);
  assert.deepEqual(route.exclusions,[{a:shunt,b:twin}]);
  assert.equal(specializationFocus(route,entry,'ArrowUp'),'mage-hexcraft-1');
  assert.equal(specializationFocus(route,shunt,'ArrowRight'),twin);
  assert.equal(new Set(overview.nodes.map(node=>node.x+','+node.y)).size,overview.nodes.length);
  for(const [active,foundation] of [[mageBindingIds.entry,'mage-control-1'],[mageSpatialIds.entry,'mage-warding-1'],[entry,'mage-hexcraft-1']])
    assert.equal(overview.nodes.find(node=>node.id===active)?.x,overview.nodes.find(node=>node.id===foundation)?.x);
});

for(const expanded of [false,true])test((expanded?'Expanded':'Compact')+' Mage shop confirms a Fuse fitting with all three remapped controls',async t=>{
  const env=menuEnvironment(t);
  const shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(key:string)=>key}});
  t.after(()=>css?Object.defineProperty(globalThis,'CSS',css):Reflect.deleteProperty(globalThis,'CSS'));
  const game=new Game({mode:'standard'});
  game.encounter=4;
  const mage=game.addPlayer('solo','Sable','mage');
  assert(mage.totalSp>=11);
  const controls=defaultControls();
  controls.bindings.technique1=['KeyI','KeyJ'];controls.gamepad.technique1=16;
  controls.bindings.technique2=['KeyY','KeyN'];controls.gamepad.technique2=9;
  controls.bindings.technique3=['KeyZ','KeyG'];controls.gamepad.technique3=8;
  assert(validControls(controls));
  const buy=(item:string)=>game.transact(mage.id,{id:'fuse-ui-'+item,kind:'skill',item});
  for(const id of ['mage-control-1',mageBindingIds.entry,'mage-warding-1',mageSpatialIds.entry,'mage-hexcraft-1'])assert(buy(id).ok);
  const selected=expanded?twin:shunt,rejected=expanded?shunt:twin,confirmed:string[]=[];
  function show(){
    const player=viewOf(game,mage.id).players[0], context=[[],expanded,'normal',undefined,true,controls] as const;
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
    assert(!env.host.querySelector('[data-kit-action="technique3"]'));
    env.host.querySelector('[data-inspect="'+entry+'"]')!.click();
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(confirmed,[entry]);
  }finally{binding.dispose();}
  binding=show();
  try{
    const kit=env.host.querySelector('[data-mage-kit]')!;
    for(const [slot,labels] of [['technique1',['Pivot Sigil','I','J','16']],['technique2',['Waymark Return','Y','N','9']],
      ['technique3',['Fuse Seal','Z','G','8']]] as const){
      const row=kit.querySelector('[data-kit-action="'+slot+'"]')!.textContent;
      for(const label of labels)assert(row.includes(label));
    }
    env.host.querySelector('[data-inspect="'+selected+'"]')!.click();
    assert(env.host.querySelectorAll('img').some(img=>img.getAttribute('src')===selected+'.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(confirmed,[entry,selected]);
  }finally{binding.dispose();}
  binding=show();
  try{
    const kit=env.host.querySelector('[data-mage-kit]')!;
    assert(kit.textContent.includes(expanded?'Aim again and press':'while walking once'));
    env.host.querySelector('[data-inspect="'+rejected+'"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  }finally{binding.dispose();}
});

test('Fuse HUD labels the paid shapes, shunt and echo while keeping the issued Q and other technique inputs',async t=>{
  const {mageActions,mageFuseLabel}=await menuBundle(t,'src/client/mage-actions.ts',stubs) as typeof import('../src/client/mage-actions.ts');
  const game=new Game({mode:'short'}),mage=game.addPlayer('solo','Sable','mage');
  const base=viewOf(game,mage.id).players[0];
  function verify(fuseSeal:FuseStatus,label:string,id:string){
    const p={...base,skills:[mageBindingIds.entry,mageSpatialIds.entry,entry,id],qAt:202,eAt:266,ultimateAt:302,
      kit:{...base.kit,fuseSeal,pivotSigil:{phase:'fixed' as const,ready:false,until:67},waymark:{phase:'marked' as const,ready:true}}},
      actions=mageActions(p);
    assert.deepEqual(actions.extras.map(item=>item.key),['technique1','technique2','technique3']);
    assert.equal(actions.qAt,202);
    assert.equal(mageFuseLabel(p,55),label);
    const ready=!!(fuseSeal.ready||fuseSeal.canShunt);
    assert.deepEqual(actions.extras[2],{key:'technique3',id,at:ready?0:fuseSeal.until,blocked:!ready});
  }
  verify({phase:'idle',ready:true,until:40},'Plant seal',entry);
  verify({phase:'prepared',ready:false,until:110},'Cast Binding or Ward',entry);
  verify({phase:'binding',ready:true,until:71},'Release forward stroke',entry);
  verify({phase:'ward',ready:true,until:72},'Release cross stroke',entry);
  verify({phase:'crossed',ready:true,until:71},'Release both strokes',entry);
  verify({phase:'binding',ready:false,until:70,canShunt:true},'Walk and press to shunt',shunt);
  verify({phase:'crossed',ready:true,until:73,split:true},'Aim the first stroke',twin);
  verify({phase:'ward',ready:true,until:73,echo:true},'Aim and release again',twin);
  verify({phase:'ward',ready:true,until:61,risk:true},'Wounded · release soon',entry);
});
