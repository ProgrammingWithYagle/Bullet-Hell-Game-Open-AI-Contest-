import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { cohortIds, type CohortCue, type CohortStatus } from '../src/shared/summoner-cohort.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { drawCohortCue } from '../src/client/summoner-cohort-presentation.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, cross, relay } = cohortIds;
const messages = JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons = Object.fromEntries(Object.values(cohortIds).map(id=>[id,id+'.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('Cohort Commander displays its issued prerequisite, two choices, and real exclusion', () => {
  const graph=specializationMapLayout('summoner',entry)!;
  assert.deepEqual(graph.nodes.filter(row=>row.reference).map(row=>row.id),['summoner-bonds-1']);
  assert.deepEqual(graph.edges,[{ from:'summoner-bonds-1',to:entry },{ from:entry,to:cross },{ from:entry,to:relay }]);
  assert.deepEqual(graph.exclusions,[{ a:cross,b:relay }]);
  assert.equal(specializationFocus(graph,entry,'ArrowUp'),'summoner-bonds-1');
  assert.equal(specializationFocus(graph,cross,'ArrowRight'),relay);
});

for (const expanded of [false,true]) test((expanded ? 'Expanded' : 'Compact')+' Cohort Commander shop separates inspection and purchase',async t => {
  const env=menuEnvironment(t);
  const shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{ configurable:true,value:{ escape:(key:string)=>key } });
  t.after(()=>css ? Object.defineProperty(globalThis,'CSS',css) : Reflect.deleteProperty(globalThis,'CSS'));
  const game=new Game({ mode:'short',seed:41 });
  game.encounter=1;
  const joss=game.addPlayer('joss','Joss','summoner');
  const controls=defaultControls();
  controls.bindings.technique1=['KeyZ','KeyG'];
  const pad=[16,15,14,13,12,11,10,9,8].find(value=>!Object.values(controls.gamepad).includes(value))!;
  assert(Number.isSafeInteger(pad));
  controls.gamepad.technique1=pad;
  assert(validControls(controls));
  const buy=(item:string)=>game.transact(joss.id,{ id:'cohort-ui-'+item,kind:'skill',item });
  assert(buy('summoner-bonds-1').ok);
  const fitted=expanded?relay:cross, excluded=expanded?cross:relay;
  const purchased:string[]=[];
  function show() {
    const player=viewOf(game,joss.id).players[0];
    const context=[[],expanded,'normal',undefined,true,controls] as const;
    env.host.innerHTML='<div class="loadout-editor">'+shop.shopMarkup(player,...context)+'</div>';
    const handle=shop.bindShop(env.host,player,(request:{ item:string })=>{
      assert(buy(request.item).ok);
      purchased.push(request.item);
    },...context);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    return handle;
  }
  const inspect=(id:string)=>env.host.querySelector('[data-inspect="'+id+'"]')!.click();
  let handle=show();
  try {
    assert(!env.host.querySelector('[data-kit-action="technique1"]'));
    inspect(entry);
    assert.equal(purchased.length,0);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased,[entry]);
  } finally { handle.dispose(); }
  handle=show();
  try {
    const kit=env.host.querySelector('[data-summoner-kit]')!;
    for (const name of ['Call Retinue','Gather','Open Muster']) assert(kit.textContent.includes(name));
    const slot=kit.querySelector('[data-kit-action="technique1"]')!.textContent;
    for (const token of ['Cohort Drive','Z','G',String(pad)]) assert(slot.includes(token));
    inspect(fitted);
    assert(env.host.querySelectorAll('img').some(node=>node.getAttribute('src')===fitted+'.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased,[entry,fitted]);
  } finally { handle.dispose(); }
  handle=show();
  try {
    const kit=env.host.querySelector('[data-summoner-kit]')!;
    assert(kit.textContent.includes(expanded?'lead companion to damage':'opposite approaches'));
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
    assert.deepEqual(purchased,[entry,fitted]);
  } finally { handle.dispose(); }
});

test('The owner HUD shows actionable Cohort signals while party markers stay bounded and readable',async t => {
  const { summonerActions,summonerCohortLabel }=await menuBundle(t,'src/client/summoner-cohort-actions.ts',stubs) as
    typeof import('../src/client/summoner-cohort-actions.ts');
  const game=new Game({ mode:'short' });
  const joss=game.addPlayer('joss','Joss','summoner');
  const base=viewOf(game,joss.id).players[0], now=80;
  assert.deepEqual(summonerActions(base,now).extras,[]);
  function check(changes:Partial<CohortStatus>,name:string,id:string,at:number,blocked:boolean,ammo=3) {
    const cohort={ members:2,targeted:true,canSend:false,stage:'ready',until:0,recoveryAt:0,fitting:undefined,...changes } as CohortStatus;
    const player={ ...base,ammo,qAt:100,skills:[entry],kit:{ ...base.kit,cohort } };
    assert.equal(summonerCohortLabel(player,now),name);
    const model=summonerActions(player,now);
    assert.equal(model.qAt,100);
    assert.deepEqual(model.extras,[{ key:'technique1',id,at,blocked }]);
  }
  check({ members:1 },'Call two permanent companions',entry,0,true);
  check({ targeted:false },'Mark an enemy with your beacon',entry,0,true);
  check({},'Rebind to recover Focus',entry,0,true,0);
  check({ fitting:'cross',canSend:true },'Cross Orders',cross,0,false);
  check({ stage:'march',until:120,recoveryAt:240 },'Companions advancing',entry,0,true);
  check({ stage:'relay',until:120,canSend:true,fitting:'relay',recoveryAt:240 },'Send the second companion',relay,0,false,0);
  check({ recoveryAt:240 },'Cohort Drive recovering',entry,240,true);

  const lines:number[][]=[], colors:number[]=[];
  const graphics={
    lineStyle(_width:number,color:number){ colors.push(color);return this; },
    lineBetween(...points:number[]){ lines.push(points);return this; },
    fillStyle(){ return this; }, fillCircle(){ return this; },
  };
  const cue:CohortCue={ kind:'summoner-cohort',state:'march',owner:joss.id,id:1,unit:2,x:500,y:500,radius:10,at:70,until:105 };
  drawCohortCue(graphics,cue,now,true,false);
  assert.equal(lines.length,7);
  drawCohortCue(graphics,{ ...cue,state:'relay',radius:14 },now,false,true);
  assert.equal(lines.length,11);
  assert.equal(colors.at(-1),0xffffff);
  assert(lines.flat().every(Number.isFinite));
  drawCohortCue(graphics,cue,cue.until,true,false);
  assert.equal(lines.length,11);
});
