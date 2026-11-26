import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { drawRangerFieldGuide } from '../src/client/ranger-field-presentation.ts';
import { rangerCommitBlocked } from '../src/client/ranger-presentation.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { rangerFieldIds, type RangerFieldStatus } from '../src/shared/ranger-field.ts';
import { Game } from '../src/shared/game.ts';
import { rangerSightIds } from '../src/shared/ranger-sight.ts';
import { rangerTrackerIds } from '../src/shared/ranger-tracker.ts';
import { viewOf } from '../src/shared/view.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry,pivot,short }=rangerFieldIds;
const messages=JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons=Object.fromEntries(Object.values(rangerFieldIds).map(id=>[id,id+'.png']));
const stubs={
  'assets.ts':'export const assets={items:{},upgrades:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts':'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('Field Controller branches from Read the Ground and the two fits exclude each other',()=>{
  const map=specializationMapLayout('ranger',entry)!;
  assert.deepEqual(map.nodes.filter(row=>row.reference).map(row=>row.id),['ranger-fieldcraft-1']);
  assert.deepEqual(map.edges,[{from:'ranger-fieldcraft-1',to:entry},{from:entry,to:pivot},{from:entry,to:short}]);
  assert.deepEqual(map.exclusions,[{a:pivot,b:short}]);
});

for (const wide of [false,true]) test('Field Controller buys and remaps Action 3 in the ' + (wide?'expanded':'compact') + ' shop',async t=>{
  const ui=menuEnvironment(t),shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(value:string)=>value}});
  t.after(()=>css?Object.defineProperty(globalThis,'CSS',css):Reflect.deleteProperty(globalThis,'CSS'));
  const game=new Game({mode:'endless'});
  game.encounter=9;
  const actor=game.addPlayer('nela','Nela','ranger');
  const buy=(item:string)=>game.transact(actor.id,{kind:'skill',item,id:item});
  assert(buy('ranger-fieldcraft-1').ok);
  const controls=defaultControls();
  controls.bindings.technique3=['KeyI','KeyJ'];
  const spare=[16,15,14,13,12,11,10,9,8].find(value=>!Object.values(controls.gamepad).includes(value))!;
  controls.gamepad.technique3=spare;
  assert(validControls(controls));
  const picked:string[]=[];
  function show() {
    const player=viewOf(game,actor.id).players[0];
    const context=[[],wide,'normal',undefined,true,controls] as const;
    ui.host.innerHTML='<div class="loadout-editor">' + shop.shopMarkup(player,...context) + '</div>';
    const handle=shop.bindShop(ui.host,player,(request:{item:string})=>{assert(buy(request.item).ok);picked.push(request.item);},...context);
    ui.host.querySelector('[data-shop-tab="specializations"]')!.click();
    return handle;
  }
  const inspect=(id:string)=>ui.host.querySelector('[data-inspect="'+id+'"]')!.click();
  const fitting=wide?pivot:short, other=wide?short:pivot;
  let handle=show();
  try {
    assert(!ui.host.querySelector('[data-kit-action="technique3"]'));
    inspect(entry);
    assert(ui.host.textContent.includes('spend one arrow'));
    ui.host.querySelector('#buy-selected')!.click();
  } finally {handle.dispose();}
  handle=show();
  try {
    const text=ui.host.querySelector('[data-kit-action="technique3"]')!.textContent;
    for (const label of ['Re-stake','I','J',String(spare)]) assert(text.includes(label),label);
    inspect(fitting);
    assert(ui.host.querySelectorAll('img').some(node=>node.getAttribute('src')===fitting+'.png'));
    ui.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(picked,[entry,fitting]);
  } finally {handle.dispose();}
  handle=show();
  try {inspect(other);assert(ui.host.querySelector('#buy-selected')!.disabled);} finally {handle.dispose();}
});

test('the Ranger hotbar keeps three action slots and shows real field readiness',async t=>{
  const ui=await menuBundle(t,'src/client/ranger-sight-actions.ts',stubs) as typeof import('../src/client/ranger-sight-actions.ts');
  const game=new Game({mode:'short'});
  game.addPlayer('nela','Nela','ranger');
  const actor=viewOf(game,'nela').players[0];
  actor.skills=[rangerSightIds.entry,rangerTrackerIds.entry,entry,pivot];
  const ordered=['technique1','technique2','technique3'];
  for (const [stage,label,at,until,blocked] of [
    ['ready','Re-stake',0,0,false],['carrying','Find a legal cable line',0,120,true],
    ['place','Press again to replant',0,120,false],['recovering','Re-stake recovering',294,0,true],
  ] as const) {
    actor.kit.rangerField={stage,until,recoveryAt:294,fitting:'pivot'};
    assert.equal(ui.rangerFieldLabel(actor),label);
    const slots=ui.rangerActions(actor).extras;
    assert.deepEqual(slots.map(row=>row.key),ordered);
    assert.deepEqual(slots[2],{key:'technique3',id:pivot,at,blocked});
    if (until) assert(['q','e','ultimate'].every(key=>rangerCommitBlocked(actor,key,100)));
  }
});

test('the predicted cable guide uses the permitted endpoints and expires at the carry deadline',()=>{
  const circles:number[][]=[],lines:number[][]=[],styles:number[][]=[];
  const graphics={
    lineStyle(...args:number[]){styles.push(args);return this;},
    strokeCircle(...args:number[]){circles.push(args);return this;},
    lineBetween(...args:number[]){lines.push(args);return this;},
  };
  const field:RangerFieldStatus={stage:'place',fitting:'pivot',until:170,recoveryAt:294,
    anchor:{x:100,y:150},placement:{start:{x:100,y:150},end:{x:184,y:150}}};
  drawRangerFieldGuide(graphics as never,field,160,true);
  assert.deepEqual(circles,[[100,150,6],[184,150,5]]);
  assert.equal(lines.length,6);
  assert(styles.every(row=>row[1]===0xffffff));
  const log=JSON.stringify({circles,lines,styles});
  drawRangerFieldGuide(graphics as never,field,170,true);
  assert.equal(JSON.stringify({circles,lines,styles}),log);
});
