import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {data} from '../src/shared/game.ts';
import {runtimeArena,runtimeArenas} from '../src/shared/arena-layouts.ts';
import {arenaCoverArt,arenaCoverPlan,arenaCoverPlacement,arenaCoverPreview,preloadArenaCovers} from '../src/client/arena-covers.ts';
import {arenaWorldArt,arenaWorldPlacement,arenaWorldTiles,preloadArenaWorlds} from '../src/client/arena-worlds.ts';
import lava from '../assets/production/arena-cover-surfaces/lava-pit-v1.json';

test('painted cover and lava bind their preserved originals, requests and exact RGBA derivatives',()=>{
  const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
  for(const record of [arenaCoverArt,lava]){
    assert.equal(sha(record.source),record.sourceSha256);assert.equal(sha(record.request),record.requestSha256);
    assert.equal(sha(record.packingTool),record.packingToolSha256);
  }
  assert.equal(arenaCoverArt.entries.length,6);
  for(const entry of arenaCoverArt.entries){
    const bytes=readFileSync(entry.image);assert.equal(sha(entry.image),entry.sha256);assert.equal(bytes[25],6);
    assert.equal(bytes.readUInt32BE(16),entry.width);assert.equal(bytes.readUInt32BE(20),entry.height);
    assert(entry.cap*2<entry.height&&entry.cap*2<entry.width);
  }
  assert.equal(sha(lava.image),lava.sha256);const bytes=readFileSync(lava.image);assert.equal(bytes[25],6);
  assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[512,512]);
});
test('all 36 map/difficulty combinations use painted cover fitted to actual collision with intact end caps and no placeholder block',()=>{
  const before=JSON.stringify(runtimeArenas);let combinations=0,babyExtras=0;
  for(const map of data.arenas)for(const difficulty of data.difficulties){
    combinations++;const arena=runtimeArena(map.id,difficulty.id),plan=arenaCoverPlan(map.id,difficulty.id);
    const world=arenaWorldPlacement(map.id),b=arena.bounds;
    if(map.id!=='gatehouse'){
      assert(world);assert.equal(world.targetX[1],b.x);assert.equal(world.targetX[2],b.x+b.width);
      assert.equal(world.targetY[1],b.y);assert.equal(world.targetY[2],b.y+b.height);
      assert(world.targetX[0]<b.x&&world.targetX[3]>b.x+b.width);
      assert(world.targetY[0]<b.y&&world.targetY[3]>b.y+b.height);
      assert.equal(createHash('sha256').update(readFileSync(world.entry.image)).digest('hex'),world.entry.sha256);
      const tiles=arenaWorldTiles(map.id);assert(tiles.length>8&&tiles.length<=100);
      for(const tile of tiles){
        assert.notEqual(tile.frame,'world-1-1');
        assert(!(tile.x<b.x+b.width&&tile.x+tile.width>b.x+1e-7&&tile.y<b.y+b.height&&tile.y+tile.height>b.y+1e-7));
      }
    }
    if(difficulty.id==='baby'){assert(plan.length>=2);babyExtras+=2;}
    if(['insane','hellish'].includes(difficulty.id))assert.equal(plan.length,0);
    for(const rect of plan){
      assert(arena.cover.some(c=>c.x===rect.x&&c.y===rect.y&&c.width===rect.width&&c.height===rect.height));
      const p=arenaCoverPlacement(map.id,rect);
      assert(Math.abs(p.width*p.scale-Math.max(rect.width,rect.height))<1e-8);
      assert(Math.abs(p.height*p.scale-Math.min(rect.width,rect.height))<1e-8);
      assert(p.width>p.cap*2);assert.equal(p.rotation===Math.PI/2,rect.height>rect.width);
      const html=arenaCoverPreview(map.id,rect,'/cover.png');assert.equal((html.match(/<svg /g)??[]).length,3);
      assert(!html.includes('<rect'));
    }
  }
  assert.equal(combinations,36);assert.equal(babyExtras,12);assert.equal(JSON.stringify(runtimeArenas),before);
});
test('missing cover art fails closed during preload rather than drawing a substitute',()=>{
  const loaded:string[]=[];const urls=Object.fromEntries(data.arenas.map(a=>[a.id,'/'+a.id+'.png']));
  preloadArenaCovers({image:key=>loaded.push(key)},urls);assert.equal(loaded.length,6);
  delete urls['triage-yard'];assert.throws(()=>preloadArenaCovers({image:()=>{}},urls),/Missing painted arena cover/);
  const worldUrls=Object.fromEntries(arenaWorldArt.entries.map(e=>[e.id,'/'+e.texture+'.png']));
  const worlds:string[]=[];preloadArenaWorlds({image:key=>worlds.push(key)},worldUrls);assert.equal(worlds.length,5);
  delete worldUrls['triage-yard'];assert.throws(()=>preloadArenaWorlds({image:()=>{}},worldUrls),/Missing painted arena world/);
});
