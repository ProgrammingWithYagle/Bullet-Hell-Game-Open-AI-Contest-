import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { markHunterIds, type CrossingWritStatus } from '../src/shared/assassin-crossing-writ.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const {entry,canted,transfer}=markHunterIds;
const messages=JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons=Object.fromEntries(Object.values(markHunterIds).map(id=>[id,id+'.png']));
const stubs={
  'assets.ts':'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:'+JSON.stringify(icons)+'};',
  'i18n.ts':'const messages='+JSON.stringify(messages)+
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Mark Hunter map shows exactly one live foundation and two exclusive fittings',()=>{
  const path=specializationMapLayout('assassin',entry)!;
  const overview=specializationMapLayout('assassin')!;
  assert.deepEqual(path.nodes.filter(row=>row.reference).map(row=>row.id),['assassin-evasion-1']);
  assert.deepEqual(path.edges,[{from:'assassin-evasion-1',to:entry},{from:entry,to:canted},{from:entry,to:transfer}]);
  assert.deepEqual(path.exclusions,[{a:canted,b:transfer}]);
  assert.equal(specializationFocus(path,entry,'ArrowUp'),'assassin-evasion-1');
  assert.equal(specializationFocus(path,canted,'ArrowRight'),transfer);
  assert(path.nodes.every(node => overview.nodes.some(candidate => candidate.id === node.id)));
  assert(['assassin-called-opening-1', 'assassin-slip-route-1'].every(id => overview.nodes.some(node => node.id === id)));
});

for(const expanded of [false,true])test((expanded?'Expanded':'Compact')+' Mark Hunter shop buys the selected fitting through the remapped guide',async t=>{
  const env=menuEnvironment(t);
  const shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(key:string)=>key}});
  t.after(()=>css?Object.defineProperty(globalThis,'CSS',css):Reflect.deleteProperty(globalThis,'CSS'));
  const game=new Game({mode:'short'});
  game.encounter=1;
  const assassin=game.addPlayer('assassin','Nyx','assassin');
  const controls=defaultControls();
  controls.bindings.technique3=['KeyI','KeyJ'];controls.gamepad.technique3=16;
  assert(validControls(controls));
  const buy=(item:string)=>game.transact(assassin.id,{id:'mark-hunter-ui-'+item,kind:'skill',item});
  assert(buy('assassin-evasion-1').ok);
  const selected=expanded?transfer:canted,rejected=expanded?canted:transfer,purchased:string[]=[];
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
    assert(!env.host.querySelector('[data-kit-action="technique3"]'));
    env.host.querySelector('[data-inspect="'+entry+'"]')!.click();
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased,[entry]);
  }finally{handle.dispose();}
  handle=show();
  try{
    const kit=env.host.querySelector('[data-assassin-kit]')!;
    assert(kit.textContent.includes('Shadow Step'));
    const row=kit.querySelector('[data-kit-action="technique3"]')!.textContent;
    for(const token of ['Crossing Writ','I','J','16'])assert(row.includes(token));
    env.host.querySelector('[data-inspect="'+selected+'"]')!.click();
    assert(env.host.querySelectorAll('img').some(img=>img.getAttribute('src')===selected+'.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased,[entry,selected]);
  }finally{handle.dispose();}
  handle=show();
  try{
    const kit=env.host.querySelector('[data-assassin-kit]')!;
    assert(kit.textContent.includes(expanded?'transfer the writ once':'Turn the line around that point'));
    env.host.querySelector('[data-inspect="'+rejected+'"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  }finally{handle.dispose();}
});

test('Mark Hunter labels the proof, pin and transfer while keeping both earlier actions and Unwritten Passage affordable',async t=>{
  const {assassinActions,assassinWritLabel}=await menuBundle(t,'src/client/assassin-actions.ts',stubs) as typeof import('../src/client/assassin-actions.ts');
  const game=new Game({mode:'short'}),assassin=game.addPlayer('assassin','Nyx','assassin');
  const base=viewOf(game,assassin.id).players[0];
  assert.equal(assassinActions(base).extras.length,0);
  function check(crossingWrit:CrossingWritStatus,label:string,id:string){
    const duel='assassin-called-opening-1', slip='assassin-slip-route-1';
    const player={...base,skills:[duel,slip,entry,id],qAt:102,eAt:156,ultimateAt:204,kit:{...base.kit,crossingWrit}};
    const actions=assassinActions(player);
    assert.equal(actions.qAt,102);
    assert.equal(actions.qNameKey,null);
    assert.equal(player.ultimateAt,204);
    assert.equal(assassinWritLabel(player,55),label);
    assert.deepEqual(actions.extras[0],{key:'technique1',id:duel,at:156,blocked:true});
    assert.deepEqual(actions.extras[1],{key:'technique2',id:slip,at:102,blocked:true});
    assert.deepEqual(actions.extras[2],{key:'technique3',id,at:crossingWrit.ready?0:crossingWrit.until,blocked:!crossingWrit.ready});
  }
  check({phase:'idle',ready:true,until:40},'Mark quarry',entry);
  check({phase:'marked',ready:false,until:108,proof:0},'Land two primary hits',entry);
  check({phase:'marked',ready:false,until:108,proof:1},'One more primary hit',entry);
  check({phase:'confirmed',ready:false,until:108},'Aim at clear ground',entry);
  check({phase:'confirmed',ready:true,until:108},'Set cutoff',entry);
  check({phase:'confirmed',ready:true,until:108},'Pin cutoff position',canted);
  check({phase:'pinned',ready:true,until:108},'Set cutoff',canted);
  check({phase:'laid',ready:false,until:120},'Cutoff waiting',entry);
  check({phase:'laid',ready:true,until:120},'Offer writ to new quarry',transfer);
  check({phase:'transfer',ready:false,until:120},'Hit the new quarry',transfer);
});
