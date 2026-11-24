import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { drawRangerTracks } from '../src/client/ranger-tracker-presentation.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { Game } from '../src/shared/game.ts';
import { rangerSightIds } from '../src/shared/ranger-sight.ts';
import { rangerTrackerIds, type TrackerStatus } from '../src/shared/ranger-tracker.ts';
import { viewOf } from '../src/shared/view.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, stakes, backtrack } = rangerTrackerIds;
const messages = JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons = Object.fromEntries(Object.values(rangerTrackerIds).map(id=>[id,id+'.png']));
const stubs = {
  'assets.ts':'export const assets={items:{},upgrades:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts':'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('Tracker uses the issued Dry Footing root and one mutually exclusive fitting',()=>{
  const map = specializationMapLayout('ranger',entry)!;
  assert.deepEqual(map.nodes.filter(row=>row.reference).map(row=>row.id),['ranger-trailkeeping-1']);
  assert.deepEqual(map.edges,[{from:'ranger-trailkeeping-1',to:entry},{from:entry,to:stakes},{from:entry,to:backtrack}]);
  assert.deepEqual(map.exclusions,[{a:stakes,b:backtrack}]);
});

for (const wide of [false,true]) test('Tracker buys and remaps Action 2 in the ' + (wide ? 'expanded' : 'compact') + ' shop',async t=>{
  const ui=menuEnvironment(t), shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(word: string)=>word}});
  t.after(()=>css?Object.defineProperty(globalThis,'CSS',css):Reflect.deleteProperty(globalThis,'CSS'));
  const game=new Game({mode:'endless'});
  game.encounter=9;
  const actor=game.addPlayer('nela','Nela','ranger');
  const buy=(item: string)=>game.transact(actor.id,{kind:'skill',item,id:item});
  assert(buy('ranger-trailkeeping-1').ok);
  const controls=defaultControls();
  controls.bindings.technique2=['KeyN','KeyY'];
  const spare=[16,15,14,13,12,11,10,9,8].find(value=>!Object.values(controls.gamepad).includes(value))!;
  controls.gamepad.technique2=spare;
  assert(validControls(controls));
  const picked: string[]=[];
  function show() {
    const player=viewOf(game,actor.id).players[0];
    const context=[[],wide,'normal',undefined,true,controls] as const;
    ui.host.innerHTML='<div class="loadout-editor">' + shop.shopMarkup(player,...context) + '</div>';
    const handle=shop.bindShop(ui.host,player,(request:{item:string})=>{assert(buy(request.item).ok);picked.push(request.item);},...context);
    ui.host.querySelector('[data-shop-tab="specializations"]')!.click();
    return handle;
  }
  const inspect=(id: string)=>ui.host.querySelector('[data-inspect="' + id + '"]')!.click();
  const fitting=wide?stakes:backtrack, other=wide?backtrack:stakes;
  let handle=show();
  try {
    assert(!ui.host.querySelector('[data-kit-action="technique2"]'));
    inspect(entry);
    assert(ui.host.textContent.includes('Hit a visible enemy'));
    assert.deepEqual(picked,[]);
    ui.host.querySelector('#buy-selected')!.click();
  } finally {handle.dispose();}
  handle=show();
  try {
    const text=ui.host.querySelector('[data-kit-action="technique2"]')!.textContent;
    for (const label of ['Read the Sign','N','Y',String(spare)]) assert(text.includes(label),label);
    inspect(fitting);
    assert(ui.host.querySelectorAll('img').some(node=>node.getAttribute('src')===fitting+'.png'));
    ui.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(picked,[entry,fitting]);
  } finally {handle.dispose();}
  handle=show();
  try {inspect(other);assert(ui.host.querySelector('#buy-selected')!.disabled);} finally {handle.dispose();}
});

test('Tracker and Sight Draw keep separate live hotbar states',async t=>{
  const ui=await menuBundle(t,'src/client/ranger-sight-actions.ts',stubs) as typeof import('../src/client/ranger-sight-actions.ts');
  const game=new Game({mode:'short'});
  game.addPlayer('nela','Nela','ranger');
  const actor=viewOf(game,'nela').players[0];
  actor.skills=[rangerSightIds.entry,entry,stakes];
  actor.kit.rangerSight={stage:'ready',canAdjust:false,rollAvailable:false,recoveryAt:0,readyAt:0,until:0};
  for (const [stage,label,at] of [
    ['find','Hit with an ordinary arrow',0],['ready','Read the Sign',0],['flank','Change lane or set Tripline',0],
    ['recovering','Trail recovering',278],
  ] as const) {
    const rangerTracker: TrackerStatus={stage,until:0,recoveryAt:278,footprints:[],fitting:'stakes'};
    actor.kit.rangerTracker=rangerTracker;
    assert.equal(ui.rangerTrackerLabel(actor),label);
    assert.equal(ui.rangerSightLabel(actor),'Sight Draw');
    assert.deepEqual(ui.rangerActions(actor).extras,[
      {key:'technique1',id:rangerSightIds.entry,at:0,blocked:false},
      {key:'technique2',id:stakes,at,blocked:stage!=='ready'},
    ]);
  }
});

test('Tracker paints observed points and elapsed guides only within their original time bounds',()=>{
  const circles: number[][]=[], lines: number[][]=[], styles: number[][]=[];
  const graphics={
    lineStyle(...args: number[]){styles.push(args);return this;},
    strokeCircle(...args: number[]){circles.push(args);return this;},
    lineBetween(...args: number[]){lines.push(args);return this;},
  };
  const tracker: TrackerStatus={stage:'flank',until:176,recoveryAt:324,origin:{x:100,y:100},bearing:0,
    footprints:[{x:200,y:182,at:20},{x:210,y:177,at:147}]};
  drawRangerTracks(graphics as never,tracker,150,true);
  assert.deepEqual(circles,[[210,177,7],[100,100,6]]);
  assert.deepEqual(lines,[[88,100,140,100],[90,18,110,18],[90,182,110,182]]);
  assert(styles.every(style=>style[1]===0xffffff));
  circles.length=0;
  lines.length=0;
  drawRangerTracks(graphics as never,tracker,176,false);
  assert.equal(circles.length,0);
  assert.equal(lines.length,0);
});
