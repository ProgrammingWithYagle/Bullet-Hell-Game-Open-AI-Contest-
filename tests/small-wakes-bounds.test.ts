import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createPracticeGame} from '../src/shared/practice-start.ts';
import {data} from '../src/shared/game.ts';
import {smallWakesPose,smallWakesArt} from '../src/client/small-wakes-presentation.ts';
import footprints from '../src/shared/small-wakes-body-bounds.json';
import {segmentRect} from '../src/shared/geometry.ts';

test('independent native-alpha derivation matches every visible Small Wakes pose and anchor',()=>{
  const r=spawnSync('python',['tools/derive-small-wakes-body-bounds.py','--check'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stdout+r.stderr);
});
test('actual Crab movement and every possible pose stay on every map/difficulty floor in both phases',()=>{
  const entry=footprints.entries.find(e=>e.bossId==='cobble-crab')!,art=smallWakesArt.find(a=>a.bossId==='cobble-crab')!;
  for(const arena of data.arenas)for(const difficulty of data.difficulties)for(const phase of [0,1]){
    const g=createPracticeGame({openingBossId:'cobble-crab',openingArenaId:arena.id,arenaSelection:'fixed',difficulty:difficulty.id,mode:'endless',seed:719},'Mara','soldier',phase?'brutal':'normal');g.start();
    const p=g.players.get('solo')!;p.invulnerableUntil=1e9;p.x=g.arena.bounds.x+g.arena.width-120;p.y=g.arena.bounds.y+g.arena.height-120;g.boss.deadline=1e9;
    if(phase)g.boss.health=g.boss.maxHealth*.49;
    let distance=0;
    for(let n=0;n<600;n++){
      const before={x:g.boss.x,y:g.boss.y};g.step();distance+=Math.hypot(g.boss.x-before.x,g.boss.y-before.y);
      const pose=smallWakesPose(g.boss,g.tick,g.combatTick,g.bossCues())!,box=entry.frames[pose.frame],scale=art.displayCell/art.cellSize,b=g.arena.bounds;
      const visual={left:g.boss.x+(box[0]-art.origin[0]*art.cellSize)*scale,top:g.boss.y+(box[1]-art.origin[1]*art.cellSize)*scale,
        right:g.boss.x+(box[2]-art.origin[0]*art.cellSize)*scale,bottom:g.boss.y+(box[3]-art.origin[1]*art.cellSize)*scale};
      assert(visual.left>=b.x&&visual.top>=b.y&&visual.right<=b.x+b.width&&visual.bottom<=b.y+b.height,JSON.stringify({arena:arena.id,difficulty:difficulty.id,phase,n,visual,b}));
    }
    assert(distance>20,'Confinement must retain real mobility: '+arena.id+difficulty.id+phase);
    const point={x:g.boss.x,y:g.boss.y};g.boss.health=0;g.step();
    assert.deepEqual({x:g.boss.x,y:g.boss.y},point,'The fall must retain the actual final position');
    for(const box of entry.frames){const scale=art.displayCell/art.cellSize,b=g.arena.bounds;
      assert(g.boss.x+(box[0]-art.origin[0]*art.cellSize)*scale>=b.x);
      assert(g.boss.y+(box[1]-art.origin[1]*art.cellSize)*scale>=b.y);
      assert(g.boss.x+(box[2]-art.origin[0]*art.cellSize)*scale<=b.x+b.width);
      assert(g.boss.y+(box[3]-art.origin[1]*art.cellSize)*scale<=b.y+b.height);
    }
  }
});
test('all three Small Wakes identities deploy with their complete painted footprint and physical body clear of cover',()=>{
  for(const id of ['candle-snail','cobble-crab','mourning-kettle'] as const)for(const arena of data.arenas)for(const difficulty of data.difficulties){
    const g=createPracticeGame({openingBossId:id,openingArenaId:arena.id,difficulty:difficulty.id},'Mara','soldier');g.start();
    const radius=data.bosses.find(b=>b.id===id)!.radius,b=g.arena.bounds,extents=footprints.entries.find(e=>e.bossId===id)!.extents;
    assert(g.boss.x-extents.left>=b.x&&g.boss.x+extents.right<=b.x+b.width&&g.boss.y-extents.top>=b.y&&g.boss.y+extents.bottom<=b.y+b.height,id+arena.id+difficulty.id);
    assert(!g.arena.obstacles.some(o=>segmentRect(g.boss,g.boss,o,radius-1)!==null),'Deployment must be clear of actual masonry');
  }
});
