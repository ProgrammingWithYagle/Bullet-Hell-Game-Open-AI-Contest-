import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaCamera,arenaCameraZoom,arenaWorldToCanvas,arenaCanvasToWorld,applyArenaCamera,survivorCameraClips} from '../src/client/arena-camera.ts';
import {data} from '../src/shared/game.ts';
import footprints from '../src/shared/boss-body-bounds.json';
import {runtimeArena} from '../src/shared/arena-layouts.ts';
import {createPracticeGame} from '../src/shared/practice-start.ts';
import {bossHopRoute} from '../src/shared/boss-hop-route.ts';
import {distance,segmentRect} from '../src/shared/geometry.ts';
import {Controls} from '../src/client/controls.ts';

test('one stable camera contains every complete boss pose at all four physical borders on all36map/difficulty combinations',()=>{
  for(const boss of data.bosses)for(const map of data.arenas)for(const difficulty of data.difficulties){
    const b=runtimeArena(map.id,difficulty.id).bounds,e=footprints.entries.find(e=>e.bossId===boss.id)!.extents;
    for(const x of [b.x+boss.radius,b.x+b.width-boss.radius])for(const y of [b.y+boss.radius,b.y+b.height-boss.radius]){
      assert(x-e.left>=arenaCamera.x&&y-e.top>=arenaCamera.y&&x+e.right<=arenaCamera.x+arenaCamera.width&&y+e.bottom<=arenaCamera.y+arenaCamera.height);
      for(const p of [{x:x-e.left,y:y-e.top},{x:x+e.right,y:y+e.bottom}]){const canvas=arenaWorldToCanvas(p);assert(canvas.x>=0&&canvas.x<=1600&&canvas.y>=0&&canvas.y<=1000);}
    }
  }
});

test('all172survivor clips remain fully visible at each map/difficulty border with unchanged ground-body clearance',()=>{
  assert.equal(survivorCameraClips.length,172);const radius=data.rules.playerRadius;
  for(const map of data.arenas)for(const difficulty of data.difficulties)for(const clip of survivorCameraClips){
    const b=runtimeArena(map.id,difficulty.id).bounds;
    for(const x of [b.x+radius,b.x+b.width-radius])for(const y of [b.y+radius,b.y+b.height-radius]){
      const left=x-clip.displayCell*clip.origin[0],top=y-clip.displayCell*clip.origin[1],right=x+clip.displayCell*(1-clip.origin[0]),bottom=y+clip.displayCell*(1-clip.origin[1]);
      assert(left>=arenaCamera.x&&top>=arenaCamera.y&&right<=arenaCamera.x+arenaCamera.width&&bottom<=arenaCamera.y+arenaCamera.height,clip.id);
    }
  }
});

test('the actual camera adapter and pointer projection share one fixed transform without a map or phase jump',()=>{
  const calls:unknown[]=[];applyArenaCamera({setZoom:z=>calls.push(['zoom',z]),centerOn:(x,y)=>calls.push(['center',x,y])});
  assert.deepEqual(calls,[['zoom',arenaCameraZoom],['center',arenaCamera.x+arenaCamera.width/2,arenaCamera.y+arenaCamera.height/2]]);
  for(const point of [{x:0,y:0},{x:800,y:500},{x:1600,y:1000},{x:270,y:195}]){const round=arenaCanvasToWorld(arenaWorldToCanvas(point));assert(Math.abs(round.x-point.x)<1e-9&&Math.abs(round.y-point.y)<1e-9);}
});

test('real pointer events aim at the displayed world position through camera zoom and letterboxing',context=>{
  class Element extends EventTarget {
    setPointerCapture(){} closest(){return null;}
    getBoundingClientRect(){return {left:20,top:35,width:1200,height:900};}
  }
  const stage=new Element(),win=new EventTarget();
  const descriptors=['window','document','HTMLElement'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  Object.defineProperties(globalThis,{window:{value:win,configurable:true},document:{value:{querySelectorAll:()=>[]},configurable:true},HTMLElement:{value:Element,configurable:true}});
  const controls=new Controls(stage as unknown as HTMLElement,arenaCanvasToWorld);controls.blocked=false;
  context.after(()=>{controls.destroy();for(const [key,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}});
  const world={x:351,y:87},canvas=arenaWorldToCanvas(world),scale=.75;
  const event=new Event('pointermove');Object.assign(event,{clientX:20+canvas.x*scale,clientY:35+(900-1000*scale)/2+canvas.y*scale,pointerId:7});stage.dispatchEvent(event);
  assert(Math.abs(controls.pointer.x-world.x)<1e-9&&Math.abs(controls.pointer.y-world.y)<1e-9);
});

test('Brass Toad can take successive body-clear hops around the actual Baby Ossuary cover to the upper floor',()=>{
  const arena=runtimeArena('ossuary-works','baby'),b=arena.bounds,radius=data.bosses.find(b=>b.id==='brass-toad')!.radius;
  const free=(p:{x:number;y:number})=>arena.obstacles.every(o=>segmentRect(p,p,o,radius+1)===null);
  const points=[];for(let y=b.y+radius+12;y<=b.y+b.height-radius-12;y+=32)for(let x=b.x+radius+12;x<=b.x+b.width-radius-12;x+=32)if(free({x,y}))points.push({x,y});
  const target=points.toSorted((a,z)=>a.y-z.y||Math.abs(a.x-800)-Math.abs(z.x-800))[0];
  let current=points.toSorted((a,z)=>z.y-a.y||Math.abs(a.x-800)-Math.abs(z.x-800))[0];const start={...current};
  for(let n=0;n<12&&distance(current,target)>80;n++){
    const next=bossHopRoute(current,target,radius,b,arena.obstacles);assert(distance(current,next)<=280.001);assert(arena.obstacles.every(o=>segmentRect(current,next,o,radius+.5)===null));current=next;
  }
  assert(current.y<b.y+b.height*.3,JSON.stringify({start,target,current}));assert(distance(current,target)<80);
  const game=createPracticeGame({openingBossId:'brass-toad',openingArenaId:'ossuary-works',difficulty:'baby',mode:'endless',seed:407},'Probe','soldier');game.start();
  game.boss.x=start.x;game.boss.y=start.y;game.boss.deadline=1e9;
  const player=game.players.get('solo')!;player.x=target.x;player.y=target.y;player.invulnerableUntil=1e9;
  for(let tick=0;tick<3600&&game.boss.y>=b.y+b.height*.3;tick++)game.step();
  assert(game.boss.y<b.y+b.height*.3,JSON.stringify({actualBoss:{x:game.boss.x,y:game.boss.y},start,target}));
});

test('actual Brass Toad encounters can reach the upper floor on every map and difficulty',()=>{
  const radius=data.bosses.find(b=>b.id==='brass-toad')!.radius;
  for(const map of data.arenas)for(const difficulty of data.difficulties){
    const game=createPracticeGame({openingBossId:'brass-toad',openingArenaId:map.id,difficulty:difficulty.id,mode:'endless',seed:407},'Probe','soldier');game.start();
    const b=game.arena.bounds,points=[];
    for(let y=b.y+radius+12;y<=b.y+b.height-radius-12;y+=32)for(let x=b.x+radius+12;x<=b.x+b.width-radius-12;x+=32)
      if(game.arena.obstacles.every(o=>segmentRect({x,y},{x,y},o,radius+1)===null))points.push({x,y});
    const center=b.x+b.width/2,target=points.toSorted((a,z)=>a.y-z.y||Math.abs(a.x-center)-Math.abs(z.x-center))[0],start=points.toSorted((a,z)=>z.y-a.y||Math.abs(a.x-center)-Math.abs(z.x-center))[0];
    game.boss.x=start.x;game.boss.y=start.y;game.boss.deadline=1e9;
    const player=game.players.get('solo')!;player.x=target.x;player.y=target.y;player.invulnerableUntil=1e9;
    for(let tick=0;tick<3600&&game.boss.y>=b.y+b.height*.3;tick++)game.step();
    assert(game.boss.y<b.y+b.height*.3,JSON.stringify({map:map.id,difficulty:difficulty.id,start,target,actual:{x:game.boss.x,y:game.boss.y}}));
  }
});
