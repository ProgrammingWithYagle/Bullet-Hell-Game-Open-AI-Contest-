import test from 'node:test';
import assert from 'node:assert/strict';
import { PostedHeavyScene, preloadPostedHeavy } from "../src/client/heavy-post-scene.ts";
import { nativePostedTextureDefinitions } from "../src/client/heavy-post-renderer.ts";
import { fixture } from "./helpers/heavy-post-game-fixture.ts";
import { SurvivorActionClock } from "../src/client/survivor-action-presentation.ts";
import { keyedId, openId } from "../src/shared/heavy-traverse.ts";
import { viewOf } from "../src/shared/view.ts";

class Sprite {
  key = 'original'; frame = 0; x = 0; y = 0; origin = [0,0]; scale = 1;
  rotation = 0; depth = 0; flip = true; stops = 0; destroyed = false;
  anims = { stop: () => { this.stops++; } };
  setTexture(k:string,f:number) { this.key=k; this.frame=f; return this; }
  setPosition(x:number,y:number) { this.x=x; this.y=y; return this; }
  setOrigin(x:number,y:number) { this.origin=[x,y]; return this; }
  setScale(n:number) { this.scale=n; return this; }
  setRotation(n:number) { this.rotation=n; return this; }
  setDepth(n:number) { this.depth=n; return this; }
  setFlipX(n:boolean) { this.flip=n; return this; }
  destroy() { assert(!this.destroyed); this.destroyed=true; }
}
const actual = (f:ReturnType<typeof fixture>) => {const v=viewOf(f.g,f.ally.id);return {v,p:v.players.find(p=>p.id===f.p.id)!};};

test('Phaser loader receives all seven exact native atlas definitions and resolves every URL before registering any load',()=>{
  const defs=nativePostedTextureDefinitions(), calls:unknown[][]=[];
  const urls=Object.fromEntries(defs.map(d=>[d.key,'/native/'+d.file]));
  preloadPostedHeavy({atlas:(...a)=>calls.push(a)},urls);
  assert.equal(calls.length,7);
  for(const [i,d] of defs.entries())assert.deepEqual(calls[i],[d.key,urls[d.key],d.atlas]);
  delete urls[defs[4].key];const missing:unknown[][]=[];
  assert.throws(()=>preloadPostedHeavy({atlas:(...a)=>missing.push(a)},urls),/Missing posted Heavy texture/);
  assert.equal(missing.length,0);
});

test('actual scene adapter replaces only the existing body and manages one posted gun across all nine operation combinations',()=>{
  for(const mode of ['loose','spade','floating'] as const)for(const handling of [undefined,keyedId,openId]){
    const f=fixture(mode,true,handling), body=new Sprite(), weapons:Sprite[]=[], clock=new SurvivorActionClock();
    const scene=new PostedHeavyScene(()=>{const s=new Sprite();weapons.push(s);return s;});
    let lines=0;
    let {v,p}=actual(f);scene.beginFrame();assert.equal(scene.apply(body,p,v,p.id,{moving:false,facing:'south',combatTick:v.combatTick}),undefined);scene.endFrame(()=>assert.fail());
    assert.equal(body.key,'original');assert.equal(weapons.length,0);
    f.post();
    for(let i=0;i<9;i++){
      f.step({moveY:1});({v,p}=actual(f));clock.observe(v);
      const before=structuredClone(p);scene.beginFrame();
      const plan=scene.apply(body,p,v,p.id,{moving:true,facing:'south',combatTick:v.combatTick,action:clock.pose(p,v,true),drawnBody:{id:p.id,x:p.x,y:p.y+1}})!;
      scene.endFrame(()=>lines++);
      assert(plan);assert.equal(body.key,'hux-free-walk-south');assert.equal(body.y,p.y+1);assert(!body.flip);assert.equal(weapons.length,1);
      assert.equal(weapons[0].x,plan.weapon.at.x);assert.equal(weapons[0].rotation,plan.weapon.rotation);assert.notEqual(body.y,weapons[0].y);
      assert.deepEqual(p,before);
    }
    assert.equal(lines,9);
    ({v,p}=actual(f));scene.beginFrame();assert(scene.apply(body,p,v,f.ally.id,{moving:true,facing:'south',combatTick:v.combatTick}));scene.endFrame(()=>assert.fail());
    assert.equal(weapons.length,1);
    f.step({q:true});({v,p}=actual(f));scene.beginFrame();assert.equal(scene.apply(body,p,v,p.id,{moving:false,facing:'south',combatTick:v.combatTick}),undefined);scene.endFrame(()=>assert.fail());
    assert(weapons[0].destroyed);scene.clear();scene.clear();
  }
});

test('actual hurt and reduced-motion body poses survive Scene application; lost authority or an empty frame removes the gun',()=>{
  const f=fixture('spade'), clock=new SurvivorActionClock(), body=new Sprite(), weapons:Sprite[]=[];
  const scene=new PostedHeavyScene(()=>{const s=new Sprite();weapons.push(s);return s;});
  f.post();let {v,p}=actual(f);clock.observe(v);f.g.damage(f.p,5);f.step();({v,p}=actual(f));clock.observe(v);
  scene.beginFrame();scene.apply(body,p,v,p.id,{moving:false,facing:'west',combatTick:v.combatTick,action:clock.pose(p,v,false)});scene.endFrame(()=>{});
  assert.equal(body.key,'hux-free-hurt');
  scene.beginFrame();scene.apply(body,p,v,p.id,{moving:true,facing:'west',combatTick:v.combatTick,reduceMotion:true});scene.endFrame(()=>{});
  assert.equal(body.key,'hux-free-idle');assert.equal(body.frame,3);assert.equal(weapons.length,1);
  scene.beginFrame();scene.endFrame(()=>assert.fail());assert(weapons[0].destroyed);
  scene.beginFrame();assert.equal(scene.apply(body,p,{...v,phase:'shop'},p.id,{moving:false,facing:'west',combatTick:v.combatTick}),undefined);scene.endFrame(()=>assert.fail());
  assert.equal(weapons.length,1);scene.clear();
});
