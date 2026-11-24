import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { rangerSightIds, type RangerSightCue, type RangerSightStatus } from '../src/shared/ranger-sight.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { cancelPredictedRangerDraw, drawRangerCue, rangerAttackFrame } from '../src/client/ranger-presentation.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, roll, bearing } = rangerSightIds;
const messages = JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons = Object.fromEntries(Object.values(rangerSightIds).map(id=>[id,id+'.png']));
const stubs = {
  'assets.ts':'export const assets={items:{},upgrades:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts':'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('the Ranger map places Sight Draw after Set the Nock and shows the fitting exclusion', () => {
  const map = specializationMapLayout('ranger',entry)!;
  assert.deepEqual(map.nodes.filter(row=>row.reference).map(row=>row.id),['ranger-bowcraft-1']);
  assert.deepEqual(map.edges,[{from:'ranger-bowcraft-1',to:entry},{from:entry,to:roll},{from:entry,to:bearing}]);
  assert.deepEqual(map.exclusions,[{a:roll,b:bearing}]);
});

for (const wide of [false,true]) test('Sight Draw purchase and actual binding in the ' + (wide ? 'expanded' : 'compact') + ' shop',async t => {
  const ui = menuEnvironment(t), shop = await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{ configurable:true,value:{ escape:(word: string)=>word } });
  t.after(()=>css ? Object.defineProperty(globalThis,'CSS',css) : Reflect.deleteProperty(globalThis,'CSS'));
  const game = new Game({mode:'endless'});
  game.encounter=9;
  const actor=game.addPlayer('nela','Nela','ranger');
  const buy=(item: string)=>game.transact(actor.id,{ kind:'skill',item,id:item });
  assert(buy('ranger-bowcraft-1').ok);
  const controls=defaultControls();
  controls.bindings.technique1=['KeyZ','KeyG'];
  const spare=[16,15,14,13,12,11,10,9,8].find(value=>!Object.values(controls.gamepad).includes(value))!;
  controls.gamepad.technique1=spare;
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
  const inspect=(id:string)=>ui.host.querySelector('[data-inspect="'+id+'"]')!.click();
  const fit=wide ? roll : bearing, other=wide ? bearing : roll;
  let handle=show();
  try {
    assert(!ui.host.querySelector('[data-kit-action="technique1"]'));
    inspect(entry);
    assert(ui.host.textContent.includes('reserve one arrow'));
    assert.deepEqual(picked,[]);
    ui.host.querySelector('#buy-selected')!.click();
  } finally {handle.dispose();}
  handle=show();
  try {
    const text=ui.host.querySelector('[data-kit-action="technique1"]')!.textContent;
    for (const label of ['Sight Draw','Z','G',String(spare)]) assert(text.includes(label),label);
    inspect(fit);
    assert(ui.host.querySelectorAll('img').some(node=>node.getAttribute('src')===fit+'.png'));
    ui.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(picked,[entry,fit]);
  } finally {handle.dispose();}
  handle=show();
  try { inspect(other); assert(ui.host.querySelector('#buy-selected')!.disabled); } finally {handle.dispose();}
});

test('the hotbar follows live press readiness, and a predicted fitted dodge preserves its draw',async t=>{
  const ui=await menuBundle(t,'src/client/ranger-sight-actions.ts',stubs) as typeof import('../src/client/ranger-sight-actions.ts');
  const game=new Game({mode:'short'});
  game.addPlayer('nela','Nela','ranger');
  const actor=viewOf(game,'nela').players[0];
  for (const [stage,canAdjust,label,blocked] of [['ready',false,'Sight Draw',false],['drawing',false,'Draw settling',true],
    ['outside',true,'Press to set a new bearing',false],['outside',false,'Aim within the guides',true],['release',false,'Press again to release',false]] as const) {
    const rangerSight: RangerSightStatus={stage,canAdjust,fitting:'bearing',recoveryAt:200,readyAt:32,until:100,rollAvailable:false};
    const p={...actor,skills:[entry,bearing],kit:{...actor.kit,rangerSight}};
    assert.equal(ui.rangerSightLabel(p),label);
    assert.deepEqual(ui.rangerActions(p).extras,[{key:'technique1',id:bearing,at:0,blocked}]);
  }
  const rolled=structuredClone(actor);
  rolled.kit.rangerDrawUntil=70;
  rolled.kit.rangerDrawMovement=.66;
  rolled.kit.rangerSight={stage:'release',fitting:'roll',readyAt:18,recoveryAt:228,until:75,canAdjust:false,rollAvailable:true};
  cancelPredictedRangerDraw(rolled);
  assert.equal(rolled.kit.rangerDrawUntil,70);
  rolled.kit.rangerSight.rollAvailable=false;
  cancelPredictedRangerDraw(rolled);
  assert.equal(rolled.kit.rangerDrawUntil,0);
  const line: RangerSightCue={kind:'ranger-sight',id:1,owner:'nela',x:40,y:50,aim:0,halfArc:Math.PI/10,radius:760,
    readyAt:28,at:10,until:85,state:'drawing'};
  const lines: number[][]=[];
  const graphics={lineStyle(){return this;},lineBetween(...values:number[]){lines.push(values);return this;},
    fillStyle(){return this;},fillCircle(){return this;},strokeCircle(){return this;}};
  drawRangerCue(graphics,line,12,'nela');
  assert.equal(lines.length,2);
  assert.equal(rangerAttackFrame(line,12),0);
  assert.equal(rangerAttackFrame({...line,state:'set'},29),2);
  drawRangerCue(graphics,line,line.until,'other');
  assert.equal(lines.length,2);
});
