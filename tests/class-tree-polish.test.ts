import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,data} from '../src/shared/game.ts';
import {viewOf} from '../src/shared/view.ts';
import {specializationMapLayout,specializationMapMarkup,specializationFocus,prepareSpecializationMap} from '../src/client/ui/specialization-map.ts';
import {menuEnvironment,menuBundle} from './helpers/menu-fixture.ts';

async function fixture(t:TestContext){
  const env=menuEnvironment(t),messages=JSON.parse(readFileSync('locales/en.json','utf8')).messages;
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(s:string)=>s}});
  t.after(()=>{css?Object.defineProperty(globalThis,'CSS',css):Reflect.deleteProperty(globalThis,'CSS');});
  const shop=await menuBundle(t,'src/client/ui/shop.ts',{
    'assets.ts':'export const assets={upgrades:{},items:{}};',
    'i18n.ts':'const messages='+JSON.stringify(messages)+';export const locale="en";export const number=String;export const t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),messages[key]??key);',
  });
  return {...env,shop,messages};
}
test('The specialization graph contains only real techniques, their General reference and the shared Q exclusion',()=>{
  const map=specializationMapLayout('engineer')!;assert(map);
  assert.deepEqual(map.nodes.filter(n=>n.reference).map(n=>n.id),['engineer-constructs-1']);
  assert.deepEqual(new Set(map.nodes.filter(n=>!n.reference).map(n=>n.id)),new Set(data.specializationSkills.map(s=>s.id)));
  assert.deepEqual(map.edges,data.specializationSkills.map(s=>({from:s.prerequisite,to:s.id})));
  assert.deepEqual(map.exclusions,[{a:'engineer-machinery-1',b:'engineer-traps-1'},{a:'engineer-machinery-anchor-1',b:'engineer-machinery-survey-1'}]);
  for(const cl of data.classes.filter(c=>c.id!=='engineer'))assert.equal(specializationMapLayout(cl.id),null);
  const html=specializationMapMarkup(map,['engineer-constructs-1','engineer-machinery-1'],(id,ref)=>'<button data-graph-focus="'+id+'">'+(ref?'General':'Technique')+'</button>');
  assert.equal((html.match(/data-from=/g)??[]).length,data.specializationSkills.length);assert(html.includes('conflicting-route'));assert(!html.includes('Field Works'));assert(!html.includes('data-purchase'));
});
test('Graph arrows follow authored positions and normal Tab can leave the graph without purchasing',t=>{
  const {host,document}=menuEnvironment(t),map=specializationMapLayout('engineer')!,root='engineer-constructs-1',left='engineer-machinery-1',right='engineer-traps-1';
  host.innerHTML=specializationMapMarkup(map,[],id=>'<button data-graph-focus="'+id+'">'+id+'</button>')+'<button id="outside">Leave tree</button>';
  prepareSpecializationMap(host as unknown as HTMLElement,map);
  const buttons=host.querySelectorAll('[data-graph-focus]'),graph=host.querySelector('.specialization-graph')!;assert.equal(buttons.filter(b=>b.tabIndex===0).length,1);assert.equal(host.querySelector('#outside')!.tabIndex,0);
  assert.equal(specializationFocus(map,left,'ArrowRight'),right);assert.equal(specializationFocus(map,right,'ArrowLeft'),left);assert.equal(specializationFocus(map,left,'ArrowUp'),root);assert.equal(specializationFocus(map,root,'ArrowDown'),left);
  assert.equal(specializationFocus(map,right,'Home'),root);assert.equal(specializationFocus(map,root,'End'),'engineer-machinery-convergence-1');assert.equal(specializationFocus(map,'missing','ArrowDown'),null);
  let prevented=false;graph.onkeydown!({key:'ArrowRight',target:buttons[1],preventDefault(){prevented=true;}});assert(prevented);assert.equal(document.activeElement?.dataset.graphFocus,right);assert.equal(buttons.filter(b=>b.tabIndex===0).length,1);
  prevented=false;graph.onkeydown!({key:'Tab',target:buttons[2],preventDefault(){prevented=true;}});assert(!prevented);
});
test('Both General views lead to the actual prerequisite purchase, then the distinct Engineer tab spends once and rejects its conflicting Q',async t=>{
  const f=await fixture(t);
  for(const expanded of [false,true]){
    const g=new Game(),p=g.addPlayer('p','Tamsin','engineer'),v=viewOf(g,p.id).players[0],requests:{kind:string;item:string}[]=[];
    let binding:ReturnType<typeof f.shop.bindShop>|undefined;
    const render=()=>{
      binding?.dispose();f.host.innerHTML='<div class="loadout-editor">'+f.shop.shopMarkup(v,[],expanded)+'</div>';
      const viewport=f.host.querySelector('.skill-map-viewport');if(viewport)Object.assign(viewport,{clientWidth:600,clientHeight:400});
      binding=f.shop.bindShop(f.host,v,(r:any)=>{assert(g.transact(p.id,{id:'purchase-'+requests.length,...r}).ok);requests.push(r);Object.assign(v,viewOf(g,p.id).players[0]);},[],expanded);
    };
    render();f.host.querySelector('[data-shop-tab="general"]')!.click();
    assert(!f.host.querySelector('[data-inspect="engineer-machinery-1"]'));assert(!f.host.querySelector('[data-inspect="general-sprint"]'));
    f.host.querySelector('[data-branch="general"]')!.click();assert(f.host.querySelector('[data-inspect="general-sprint"]'));
    f.host.querySelector('[data-branch="'+data.classes.find(c=>c.id==='engineer')!.branches[0].id+'"]')!.click();
    const scroller=f.host.querySelector('.skill-scroll') as any;Object.assign(scroller,{scrollTop:123,scrollLeft:45});
    f.host.querySelector('[data-shop-tab="specializations"]')!.click();f.host.querySelector('[data-shop-tab="general"]')!.click();
    const returned=f.host.querySelector('.skill-scroll') as any;assert.equal(returned.scrollTop,123);assert.equal(returned.scrollLeft,45);
    if(!expanded)f.host.querySelectorAll('[data-branch]')[3].click();
    f.host.querySelector('[data-shop-tab="specializations"]')!.click();assert(f.host.querySelector('.specialization-graph'));assert.equal(f.host.querySelectorAll('[data-inspect]').length,data.specializationSkills.length);
    f.host.querySelector('[data-inspect="engineer-machinery-1"]')!.click();assert(f.host.querySelector('#buy-selected')!.disabled);assert.equal(requests.length,0);
    f.host.querySelector('.pathway-foundation')!.click();assert.equal(f.host.querySelector('[data-shop-tab="general"]')!.getAttribute('aria-selected'),'true');assert.equal(f.document.activeElement?.dataset.inspect,'engineer-constructs-1');
    f.host.querySelector('#buy-selected')!.click();assert.deepEqual(requests,[{kind:'skill',item:'engineer-constructs-1'}]);render();
    f.host.querySelector('[data-shop-tab="specializations"]')!.click();f.host.querySelector('[data-inspect="engineer-machinery-1"]')!.click();assert(f.host.querySelector('#item-details')!.textContent.includes('deployment offset'));f.host.querySelector('#buy-selected')!.click();render();
    assert.equal(p.totalSp,3);assert.equal(v.sp,0);assert.deepEqual(p.skills,['engineer-constructs-1','engineer-machinery-1']);assert(f.host.querySelector('[data-inspect="engineer-machinery-1"]')!.classList.contains('owned'));
    f.host.querySelector('[data-inspect="engineer-traps-1"]')!.click();assert(f.host.querySelector('#item-details')!.textContent.includes('Carriage Sentry'));assert(f.host.querySelector('#buy-selected')!.disabled);
    v.sp=100;f.host.querySelector('#buy-selected')!.disabled=false;f.host.querySelector('#buy-selected')!.click();assert.equal(requests.length,2);binding?.dispose();
  }
});
test('Campaign training and archived SP Story do not expose the Free Play specialization tab or numerical purchases',async t=>{
  const {shop}=await fixture(t),g=new Game({mode:'story'}),p=g.addPlayer('p','Tamsin','engineer'),v=viewOf(g,p.id).players[0];
  const campaign=shop.shopMarkup(v);assert(campaign.includes('data-shop-tab="tree"'));assert(!campaign.includes('data-shop-tab="specializations"'));assert(!campaign.includes('data-inspect="engineer-constructs-1"'));assert(!campaign.includes('data-inspect="general-sprint"'));
  const free=new Game(),q=free.addPlayer('q','Tamsin','engineer'),old=shop.shopMarkup(viewOf(free,q.id).players[0],[],true,'normal',undefined,false);assert(!old.includes('data-shop-tab="specializations"'));assert(!old.includes('pathway-choices'));
  const soldier=new Game(),s=soldier.addPlayer('s','Mara','soldier'),other=shop.shopMarkup(viewOf(soldier,s.id).players[0]);assert(!other.includes('data-shop-tab="specializations"'));assert(other.includes('data-inspect="soldier-ballistics-1"'));
});
