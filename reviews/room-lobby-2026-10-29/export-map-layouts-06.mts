import fs from 'node:fs';
import assert from 'node:assert/strict';
import {data} from '../../src/shared/game.ts';
import {runtimeArena} from '../../src/shared/arena-layouts.ts';
import {arenaGroundArt,arenaGroundPlacement} from '../../src/client/arena-presentation.ts';
import {arenaCoverArt,arenaCoverPlan,arenaCoverPlacement} from '../../src/client/arena-covers.ts';
const root='reviews/room-lobby-2026-10-29/maps-06';fs.mkdirSync(root,{recursive:true});
import {arenaWorldPlacement,arenaWorldTiles} from '../../src/client/arena-worlds.ts';
const rows=data.difficulties.flatMap(difficulty=>data.arenas.map(map=>{
  const arena=runtimeArena(map.id,difficulty.id),ground=arenaGroundPlacement(map.id,difficulty.id);
  const base=arenaGroundArt.entries.find(a=>a.id===map.id)!;
  const groundImage=map.id==='gatehouse'&&difficulty.id==='hard'?'assets/production/arenas/gatehouse-half-v1.png':map.id==='gatehouse'&&['insane','hellish'].includes(difficulty.id)?'assets/production/arenas/gatehouse-open-v1.png':base.image;
  return {id:map.id,difficulty:difficulty.id,bounds:arena.bounds,floor:arena.floor,groundImage,ground,
    cover:arenaCoverPlan(map.id,difficulty.id).map(rect=>({rect,placement:arenaCoverPlacement(map.id,rect),surface:arenaCoverArt.entries.find(e=>e.id===map.id)!})),
    lavaPits:arena.lavaPits,lavaImage:'assets/production/arena-cover-surfaces/lava-pit-v1.png',
    world:arenaWorldPlacement(map.id),worldTiles:arenaWorldTiles(map.id),collisionCover:arena.cover,bossSpawn:arena.bossSpawn,playerSpawn:arena.playerSpawn};
}));assert.equal(rows.length,36);
fs.writeFileSync(root+'/layouts.json',JSON.stringify({scope:'Static composition from runtime geometry and original assets; not a browser capture or human acceptance.',rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,layouts:rows.length}));
