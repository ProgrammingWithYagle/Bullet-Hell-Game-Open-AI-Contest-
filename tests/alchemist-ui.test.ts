import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { AlchemyControls } from '../src/client/alchemy-controls.ts';
import { alchemyCommitBlocked, alchemyPredictedSpeed, cancelPredictedBrew, drawAlchemyCue } from '../src/client/alchemy-presentation.ts';
import { menuEnvironment } from './helpers/menu-fixture.ts';
import { Controls } from '../src/client/controls.ts';
import { defaultControls } from '../src/client/input-bindings.ts';

test('Recipe controls show actual owned selection, stock and FIFO queue without optimistic transmutation, and stop during pause or after disposal',context=>{
  const env=menuEnvironment(context),root=env.host as unknown as HTMLElement,requests:string[]=[];
  const panel=new AlchemyControls(root,(key,values)=>key+JSON.stringify(values??{}),recipe=>requests.push(recipe));
  const g=new Game(),p=g.addPlayer('p','Perrin','alchemist');g.addPlayer('other','Mara','soldier');g.start();
  const view=viewOf(g,p.id);panel.update(view,p.id,false,'V');
  const button=(recipe:string)=>root.querySelector<HTMLButtonElement>('[data-alchemy-recipe="'+recipe+'"]')!;
  assert(!root.hidden);assert.equal(button('flare').getAttribute('aria-pressed'),'true');assert(button('flare').disabled);
  panel.cycle();assert.deepEqual(requests,['binding']);
  assert.equal(button('flare').getAttribute('aria-pressed'),'true','Sending a request does not invent an accepted recipe');
  assert(g.selectAlchemy(p.id,'binding'));panel.update(viewOf(g,p.id),p.id,false,'V');
  assert.equal(button('binding').getAttribute('aria-pressed'),'true');
  panel.cycle();assert.deepEqual(requests,['binding','mending']);
  view.matchPaused=true;panel.update(view,p.id,false,'V');panel.cycle();button('mending').click();assert.equal(requests.length,2);
  view.matchPaused=false;panel.update(view,p.id,true,'V');panel.cycle();assert.equal(requests.length,2);
  panel.update(view,'other',false,'V');assert(root.hidden);
  panel.dispose();panel.cycle();assert.equal(requests.length,2);
});
test('Alchemy readiness and prediction use received finite stock and brew clocks without double slowing or spending a fake vial',()=>{
  const g=new Game(),p=g.addPlayer('p','Perrin','alchemist');g.start();
  const v=viewOf(g,p.id).players[0];
  assert(alchemyCommitBlocked(v,'e',0));assert(!alchemyCommitBlocked(v,'q',0));
  v.kit.alchemyCinder=0;assert(alchemyCommitBlocked(v,'q',0));
  v.kit.alchemyCinder=2;v.kit.alchemyBrewUntil=12;v.kit.alchemyBrewMovement=.8;v.speed=184;
  assert.equal(alchemyPredictedSpeed(v,4),184);assert.equal(alchemyPredictedSpeed(v,12),230);
  assert(alchemyCommitBlocked(v,'ultimate',4));cancelPredictedBrew(v);assert.equal(v.speed,230);
  cancelPredictedBrew(v);assert.equal(v.speed,230);assert(!alchemyCommitBlocked(v,'ultimate',4));
  v.kit.alchemyPrepared=['binding'];assert(!alchemyCommitBlocked(v,'e',4));
});
test('Mouse chooses an exact world point while touch and gamepad support scaled range and neutral self placement',()=>{
  class Element extends EventTarget{dataset:Record<string,string>={};disabled=false;closest(){return null;}setPointerCapture(_id:number){}getBoundingClientRect(){return {left:0,top:0,width:1600,height:1000};}}
  const stage=new Element(),win=new EventTarget(),buttons=Array.from({length:17},()=>({pressed:false})),axes=[0,0,0,0];
  const descriptors=['window','document','navigator','HTMLElement'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  Object.defineProperties(globalThis,{window:{value:win,configurable:true},document:{value:{querySelectorAll:()=>[]},configurable:true},navigator:{value:{getGamepads:()=>[{connected:true,axes,buttons}]},configurable:true},HTMLElement:{value:Element,configurable:true}});
  let controls:Controls|undefined;
  const event=(type:string,values:Record<string,unknown>)=>{const e=new Event(type);Object.assign(e,values);stage.dispatchEvent(e);};
  try{
    controls=new Controls(stage as unknown as HTMLElement);controls.blocked=false;
    const p={x:800,y:700};controls.sample(0,p);
    event('pointermove',{pointerId:1,pointerType:'mouse',clientX:850,clientY:720});controls.sample(1,p);
    assert.deepEqual(controls.flaskPoint(p),{x:850,y:720});
    event('pointerdown',{pointerId:2,pointerType:'touch',clientX:1000,clientY:700});controls.sample(2,p);
    assert.deepEqual(controls.flaskPoint(p),p);
    event('pointermove',{pointerId:2,pointerType:'touch',clientX:1027.5,clientY:700});controls.sample(3,p);
    assert.deepEqual(controls.flaskPoint(p),{x:950,y:700});
    event('pointerup',{pointerId:2,pointerType:'touch',button:0});controls.sample(4,p);assert.deepEqual(controls.flaskPoint(p),p);
    axes[2]=.5;controls.sample(5,p);assert.deepEqual(controls.flaskPoint(p),{x:950,y:700});
    axes[2]=1;axes[3]=1;controls.sample(6,p);assert(Math.abs(Math.hypot(controls.flaskPoint(p).x-p.x,controls.flaskPoint(p).y-p.y)-300)<1e-9);
    axes[2]=axes[3]=0;buttons[defaultControls().gamepad.e].pressed=true;controls.sample(7,p);assert.deepEqual(controls.flaskPoint(p),p);
    win.dispatchEvent(new Event('blur'));assert.deepEqual(controls.flaskPoint(p),p);
  }finally{controls?.destroy();for(const [key,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
test('A flask drawing keeps its exact landing visible, advances only from combat time and disappears at expiry',()=>{
  const calls:unknown[][]=[];
  const graphics=Object.fromEntries(['lineStyle','lineBetween','fillStyle','fillCircle','strokeCircle'].map(method=>[method,(...args:unknown[])=>{calls.push([method,...args]);return graphics;}])) as unknown as Parameters<typeof drawAlchemyCue>[0];
  const cue={kind:'alchemy-flask' as const,id:1,owner:'p',recipe:'mending' as const,x:800,y:700,x2:850,y2:700,radius:76,at:10,until:25,empowered:false};
  drawAlchemyCue(graphics,cue,10,'p');assert(calls.some(c=>c[0]==='strokeCircle'&&c[1]===850&&c[2]===700));
  const first=structuredClone(calls);calls.length=0;drawAlchemyCue(graphics,cue,10,'p');assert.deepEqual(calls,first);
  calls.length=0;drawAlchemyCue(graphics,cue,25,'p');assert.deepEqual(calls,[]);
});
