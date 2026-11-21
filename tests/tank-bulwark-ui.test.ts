import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,data} from '../src/shared/game.ts';
import {viewOf,splitLineworkKit} from '../src/shared/view.ts';
import {bulwarkIds} from '../src/shared/tank-bulwark.ts';
import {portClosedPieces} from '../src/shared/tank-bulwark-port.ts';
import {defaultControls,validControls} from '../src/client/input-bindings.ts';
import {Prediction} from '../src/client/prediction.ts';
import {idleInput,type InputFrame} from '../src/shared/protocol.ts';
import {fixture,point} from './helpers/tank-bulwark-fixture.ts';
import {menuBundle,menuEnvironment} from './helpers/menu-fixture.ts';
import type {MenuElement} from './helpers/menu-dom.ts';

const messages=JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const english="const m="+JSON.stringify(messages)+";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),m[key]??key);";
const stubs={'assets.ts':'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{}};','i18n.ts':english};
async function menu(t:TestContext,handling:'unowned'|'none'|'pivot'|'port',expanded:boolean){
  const env=menuEnvironment(t),shop=await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const previous=Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{escape:(value:string)=>value}});
  t.after(()=>previous?Object.defineProperty(globalThis,'CSS',previous):Reflect.deleteProperty(globalThis,'CSS'));
  const g=new Game({mode:'endless'});g.encounter=9;const p=g.addPlayer('solo','Tank shop','tank');
  const purchases=handling==='unowned'?[]:['tank-protection-1',bulwarkIds.entry,...(handling==='none'?[]:[bulwarkIds[handling]])];
  for(const item of purchases)assert(g.transact(p.id,{id:item,kind:'skill',item}).ok);
  const player=viewOf(g,p.id).players[0],controls=defaultControls(),requests:unknown[]=[];
  controls.bindings.technique1=['KeyZ','KeyG'];controls.bindings.technique2=['KeyN','KeyY'];controls.bindings.reload=['KeyH'];
  controls.bindings.fire=['KeyP'];controls.gamepad.technique1=8;controls.gamepad.technique2=9;controls.gamepad.technique3=16;
  assert(validControls(controls));
  env.host.innerHTML='<div class="loadout-editor">'+shop.shopMarkup(player,[],expanded,'normal',undefined,true,controls)+'</div>';
  const binding=shop.bindShop(env.host,player,(request:unknown)=>requests.push(request),[],expanded,'normal',undefined,true,controls);
  t.after(()=>binding.dispose());
  const tab=env.host.querySelector('[data-shop-tab="specializations"]');assert(tab);tab.click();
  return {g,p,player,controls,requests,...env};
}

for(const expanded of [false,true])for(const handling of ['unowned','none','pivot','port'] as const)
  test((expanded?'expanded':'compact')+' Tank menu exposes only acquired operations and remapped controls: '+handling,async t=>{
    const f=await menu(t,handling,expanded),kit=f.host.querySelector('[data-tank-kit]');assert(kit);
    const rows=kit.querySelectorAll('[data-kit-action]');
    assert.equal(rows.length,handling==='unowned'?3:handling==='none'?5:handling==='pivot'?6:7);
    assert.equal(!!kit.querySelector('[data-kit-action="technique1"]'),handling!=='unowned');
    assert.equal(!!kit.querySelector('[data-kit-action="technique2"]'),handling==='pivot'||handling==='port');
    assert.equal(!!kit.querySelector('[data-kit-action="fire"]'),handling==='port');
    if(handling!=='unowned'){
      const row=kit.querySelector('[data-kit-action="technique1"]')!;
      assert(row.textContent.includes('Z')&&row.textContent.includes('G'));
      assert(kit.querySelector('[data-kit-action="reload"]')!.textContent.includes('H'));
    }
    if(handling==='pivot'||handling==='port')assert(kit.querySelector('[data-kit-action="technique2"]')!.textContent.includes('N'));
    if(handling==='port')assert(kit.querySelector('[data-kit-action="fire"]')!.textContent.includes('P'));
    assert.deepEqual(f.requests,[]);assert.equal(f.p.skills.length,handling==='unowned'?0:handling==='none'?2:3);
  });

test('Mobile Bulwark cards have real descriptions, dependencies and mutually exclusive handling in the actual shop',async t=>{
  const f=await menu(t,'none',true);
  for(const id of Object.values(bulwarkIds)){
    const node=data.specializationSkills.find(node=>node.id===id)!;assert(node);
    assert.equal(node.branchId,'tank-pathways');assert.equal(node.subbranchName,'Mobile Bulwark');
    assert(messages['skill.'+id+'.description'].length>100);
    const inspect=f.host.querySelector('[data-inspect="'+id+'"]');assert(inspect,id);inspect.click();
    const panel=f.host.querySelector('#item-details')!;assert(panel.textContent.includes(messages['skill.'+id+'.name']));
  }
  assert.deepEqual(f.requests,[]);
  const chosen=f.g.transact(f.p.id,{id:'choose-pivot',kind:'skill',item:bulwarkIds.pivot});assert(chosen.ok);
  const blocked=f.g.transact(f.p.id,{id:'other-fitting',kind:'skill',item:bulwarkIds.port});
  assert(!blocked.ok&&blocked.reason==='incompatibleItem');
});

for(const handling of ['none','pivot','port'] as const)test('owner-only Tank readiness leaves public physical panels visible: '+handling,()=>{
  const f=fixture({handling});if(handling==='port')f.open();
  const own=viewOf(f.g,f.p.id),other=viewOf(f.g,'ally'),owner=own.players.find(p=>p.id===f.p.id)!,peer=other.players.find(p=>p.id===f.p.id)!;
  assert(owner.kit.bulwarkCarried);assert.deepEqual(owner.kit.bulwarkPanelIds,f.panels().map(w=>w.id));
  const {shared,owner:privateKit}=splitLineworkKit(f.g.kitStatus(f.p.id));assert(privateKit);
  assert.deepEqual(Object.keys(peer.kit).filter(key=>key.startsWith('bulwark')),[]);
  assert.deepEqual(Object.keys(shared).filter(key=>key.startsWith('bulwark')),[]);
  assert.deepEqual(other.classCues,own.classCues);
  if(handling==='port')for(const wall of f.panels()){const pieces=portClosedPieces(wall);assert.equal(pieces.length,2);assert(pieces.every(piece=>(piece.halfSpan??0)<(wall.halfSpan??0)));}
});

test('actual full-precision lift guard drives the HUD at the rounded 37px boundary',async t=>{
  const f=fixture({handling:'none',aim:0});f.step({technique1:true});assert(!f.carried());
  f.p.x-=5.04;f.p.oldX=f.p.x;f.p.oldY=f.p.y;
  const panel=f.panels()[0];assert(Math.hypot(panel.x-f.p.x,panel.y-f.p.y)>37);
  const player=viewOf(f.g,f.p.id).players.find(p=>p.id===f.p.id)!;
  player.x=Math.round(player.x*4)/4;player.y=Math.round(player.y*4)/4;
  assert.equal(Math.hypot(Math.round(panel.x*4)/4-player.x,Math.round(panel.y*4)/4-player.y),37);
  assert.equal(player.kit.bulwarkCanLift,false);
  const actions=await menuBundle(t,'src/client/tank-actions.ts',stubs);
  const state=actions.tankActions(player,f.g.combatTick);assert(state.extras[0].blocked);
  for(let n=0;n<10;n++)viewOf(f.g,f.p.id);
  f.step({technique1:true});assert(!f.carried());assert.equal(f.panels()[0].id,panel.id);
});

test('owned HUD respects authority readiness and occupied hands without adding rows',async t=>{
  const actions=await menuBundle(t,'src/client/tank-actions.ts',stubs),f=fixture();f.step();
  let player=viewOf(f.g,f.p.id).players.find(p=>p.id===f.p.id)!;
  assert.equal(actions.tankActions(player,f.g.combatTick).extras.length,2);
  assert.equal(actions.tankHudLabel(player,'technique1',f.g.combatTick),messages['ui.tank.setShield']);
  for(const key of ['q','e','ultimate','reload','dodge'])assert(actions.tankCommitBlocked(player,key));
  f.begin();player=viewOf(f.g,f.p.id).players.find(p=>p.id===f.p.id)!;
  assert(actions.tankActions(player,f.g.combatTick).extras.find((a:{key:string})=>a.key==='technique2').blocked);
  assert.equal(actions.tankHudLabel(player,'technique2',f.g.combatTick),messages['ui.tank.openingPort']);
  f.settle();player=viewOf(f.g,f.p.id).players.find(p=>p.id===f.p.id)!;
  assert.equal(actions.tankHudLabel(player,'technique2',f.g.combatTick),messages['ui.tank.closePort']);
});

for(const command of ['technique1','technique2'] as const)test(command+' does not forecast a paid lift, setdown, rotation or opening',()=>{
  const f=fixture(),view=viewOf(f.g,f.p.id),original=structuredClone(view),prediction=new Prediction();
  prediction.acknowledge(view,f.p.id);const kit=structuredClone(prediction.player!.kit),ammo=prediction.player!.ammo;
  prediction.submit({...idleInput(),sequence:f.p.ack+1,clientTick:f.g.combatTick,aim:f.aim+.5,[command]:true},view);
  assert.deepEqual(prediction.player!.kit,kit);assert.equal(prediction.player!.ammo,ammo);assert.deepEqual(view,original);
  assert(f.carried());assert.equal(f.status().phase,'closed');
});

for(const competing of ['dodge','q','e','ultimate','reload'] as const)test('acknowledged carried panels keep actual walking while suppressing predicted '+competing,()=>{
  const f=fixture({handling:'none'}),prediction=new Prediction();
  for(let n=0;n<5;n++){
    const view=viewOf(f.g,f.p.id),original=structuredClone(view),input:InputFrame={...idleInput(),sequence:f.p.ack+1,clientTick:f.g.combatTick,aim:f.aim,moveX:-Math.sin(f.aim)*.2,moveY:Math.cos(f.aim)*.2,[competing]:true};
    prediction.acknowledge(view,f.p.id);prediction.submit(input,view);f.step(input);
    assert(Math.hypot(prediction.player!.x-f.p.x,prediction.player!.y-f.p.y)<.15);
    assert.equal(prediction.player!.dashUntil,original.players.find(p=>p.id===f.p.id)!.dashUntil);
    assert.deepEqual(view,original);
  }
});

test('prediction freezes rather than inventing geometry when acknowledged owner panels are missing',()=>{
  const f=fixture(),view=viewOf(f.g,f.p.id),prediction=new Prediction();view.classCues=[];
  prediction.acknowledge(view,f.p.id);const before=point(prediction.player!);
  prediction.submit({...idleInput(),sequence:f.p.ack+1,clientTick:f.g.combatTick,moveX:1},view);
  assert.deepEqual(point(prediction.player!),before);
});
