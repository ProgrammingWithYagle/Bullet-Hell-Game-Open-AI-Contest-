import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {arenaCamera,arenaProjection,arenaWorldToCanvas,arenaCanvasToWorld,trackArenaViewport,survivorCameraClips} from '../src/client/arena-camera.ts';
import {Controls} from '../src/client/controls.ts';
import {data} from '../src/shared/game.ts';
import {runtimeArena} from '../src/shared/arena-layouts.ts';
import footprints from '../src/shared/boss-body-bounds.json';

const sizes=[[320,568],[360,640],[390,844],[568,320],[844,390],[768,1024],[1024,768],[1280,720],[1366,768],[1536,864],[1920,1080],[2560,1440],[3440,1440],[3840,2160]];

test('all boss and survivor poses fit every map/difficulty border from phone portrait to4K without stretching',()=>{
  for(const [width,height]of sizes) {
    const viewport={width,height},projection=arenaProjection(viewport),leftTop=arenaWorldToCanvas({x:arenaCamera.x,y:arenaCamera.y},viewport),rightBottom=arenaWorldToCanvas({x:arenaCamera.x+arenaCamera.width,y:arenaCamera.y+arenaCamera.height},viewport);
    assert(Math.abs((leftTop.x+rightBottom.x)/2-width/2)<1e-8&&Math.abs((leftTop.y+rightBottom.y)/2-height/2)<1e-8,'arena center remains at the screen center');
    assert(Math.abs(rightBottom.x-leftTop.x-width)<1e-8||Math.abs(rightBottom.y-leftTop.y-height)<1e-8,'the complete arena uses the largest possible uniform scale');
    const inside=(x:number,y:number)=>{const p=arenaWorldToCanvas({x,y},viewport);assert(p.x>=-1e-8&&p.y>=-1e-8&&p.x<=width+1e-8&&p.y<=height+1e-8);};
    for(const map of data.arenas)for(const difficulty of data.difficulties) {
      const b=runtimeArena(map.id,difficulty.id).bounds;
      for(const boss of data.bosses) {
        const e=footprints.entries.find(e=>e.bossId===boss.id)!.extents;
        for(const x of [b.x+boss.radius,b.x+b.width-boss.radius])for(const y of [b.y+boss.radius,b.y+b.height-boss.radius]){inside(x-e.left,y-e.top);inside(x+e.right,y+e.bottom);}
      }
      for(const clip of survivorCameraClips) {
        const radius=data.rules.playerRadius;
        for(const x of [b.x+radius,b.x+b.width-radius])for(const y of [b.y+radius,b.y+b.height-radius]){inside(x-clip.displayCell*clip.origin[0],y-clip.displayCell*clip.origin[1]);inside(x+clip.displayCell*(1-clip.origin[0]),y+clip.displayCell*(1-clip.origin[1]));}
      }
    }
    const a=arenaWorldToCanvas({x:100,y:100},viewport),b=arenaWorldToCanvas({x:200,y:200},viewport);
    assert(Math.abs(b.x-a.x-100*projection.zoom)<1e-8&&Math.abs(b.y-a.y-100*projection.zoom)<1e-8);
  }
});

test('actual scale events refit the camera after fullscreen, orientation and window changes, then unsubscribe',()=>{
  class Scale extends EventEmitter {gameSize={width:1600,height:1000};}
  const scale=new Scale(),centers:unknown[]=[];let zoom=0;
  const stop=trackArenaViewport({setZoom:z=>zoom=z,centerOn:(x,y)=>centers.push([x,y])},scale);
  for(const[width,height]of sizes){scale.gameSize={width,height};scale.emit('resize');assert.equal(zoom,arenaProjection(scale.gameSize).zoom);}
  assert(centers.every(p=>JSON.stringify(p)===JSON.stringify(centers[0])),'changing screens does not move the world center');
  stop();assert.equal(scale.listenerCount('resize'),0);const before=centers.length;scale.emit('resize');assert.equal(centers.length,before);
  for(const size of [{width:0,height:0},{width:NaN,height:-1}])assert(Number.isFinite(arenaProjection(size).zoom));
});

test('real pointer routing follows the current canvas after zoom, DPI, resize and temporary hidden bounds',t=>{
  let viewport={width:1600,height:1000},rect={left:13.5,top:27.25,width:1600,height:1000};
  const canvas={getBoundingClientRect:()=>rect};
  class Element extends EventTarget {
    querySelector(){return canvas;}setPointerCapture(){}closest(){return null;}
    getBoundingClientRect(){return {left:0,top:0,width:9999,height:9999};}
  }
  const win=new EventTarget(),stage=new Element(),keys=['window','document','HTMLElement'];
  const descriptors=keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]as const);
  Object.defineProperties(globalThis,{window:{configurable:true,value:win},document:{configurable:true,value:{querySelectorAll:()=>[]}},HTMLElement:{configurable:true,value:Element}});
  const controls=new Controls(stage as unknown as HTMLElement,p=>arenaCanvasToWorld(p,viewport),()=>viewport);controls.blocked=false;
  t.after(()=>{controls.destroy();for(const[k,d]of descriptors)d?Object.defineProperty(globalThis,k,d):Reflect.deleteProperty(globalThis,k);});
  for(const[width,height]of sizes)for(const scale of [.5,.8,1,1.25,1.5,2]) {
    viewport={width,height};rect={...rect,width:width*scale,height:height*scale};
    for(const world of [{x:42,y:70},{x:800,y:500},{x:1530,y:920}]) {
      const p=arenaWorldToCanvas(world,viewport),event=new Event('pointermove');Object.assign(event,{clientX:rect.left+p.x*scale,clientY:rect.top+p.y*scale,pointerId:1});stage.dispatchEvent(event);
      assert(Math.abs(controls.pointer.x-world.x)<1e-8&&Math.abs(controls.pointer.y-world.y)<1e-8);
    }
  }
  const last={...controls.pointer};rect={...rect,width:0,height:0};const event=new Event('pointermove');Object.assign(event,{clientX:0,clientY:0,pointerId:1});stage.dispatchEvent(event);assert.deepEqual(controls.pointer,last);
});
