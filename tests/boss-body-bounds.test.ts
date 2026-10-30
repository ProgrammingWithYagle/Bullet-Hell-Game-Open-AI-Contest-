import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {data} from '../src/shared/game.ts';
import {createPracticeGame} from '../src/shared/practice-start.ts';
import {bossBorderObstacles,bossMovementBounds} from '../src/shared/boss-body-bounds.ts';
import {moveBody,segmentRect} from '../src/shared/geometry.ts';
import footprints from '../src/shared/boss-body-bounds.json';
import type {BossId} from '../src/shared/protocol.ts';

function visible(game:ReturnType<typeof createPracticeGame>) {
  const e=footprints.entries.find(e=>e.bossId===game.boss.id)!.extents,b=game.arena.bounds,p=game.boss;
  assert(p.x-e.left>=b.x&&p.y-e.top>=b.y&&p.x+e.right<=b.x+b.width&&p.y+e.bottom<=b.y+b.height,
    JSON.stringify({boss:p.id,map:game.arena.id,difficulty:game.settings.difficulty,point:{x:p.x,y:p.y},e,b}));
}

test('all runtime boss art, loading references, ground anchors and lifts match native alpha',()=>{
  const derived=spawnSync('python',['tools/derive-boss-body-bounds.py','--check'],{encoding:'utf8'});
  assert.equal(derived.status,0,derived.stdout+derived.stderr);assert.equal(footprints.entries.length,data.bosses.length);
});

test('all 66 bosses deploy fully on every map/difficulty with physical bodies clear of masonry',()=>{
  let cases=0;
  for(const boss of data.bosses)for(const arena of data.arenas)for(const difficulty of data.difficulties){
    const g=createPracticeGame({openingBossId:boss.id as BossId,openingArenaId:arena.id,arenaSelection:'fixed',difficulty:difficulty.id,mode:'endless'},'Probe','soldier');g.start();visible(g);
    assert(!g.arena.obstacles.some(o=>segmentRect(g.boss,g.boss,o,boss.radius-1)!==null),boss.id+arena.id+difficulty.id);
    assert.equal(g.arena.id,arena.id);cases++;
  }
  assert.equal(cases,2376);
});

test('whole-body route walls and scripted placement guard every edge on all 2376 boss/map/difficulty combinations',()=>{
  for(const boss of data.bosses)for(const arena of data.arenas)for(const difficulty of data.difficulties){
    const g=createPracticeGame({openingBossId:boss.id as BossId,openingArenaId:arena.id,difficulty:difficulty.id,mode:'endless'},'Probe','soldier');g.start();
    const floor=g.arena.bounds,b=bossMovementBounds(boss.id,floor,boss.radius),walls=bossBorderObstacles(boss.id,floor,boss.radius);
    const center={x:b.x+b.width/2,y:b.y+b.height/2};
    for(const delta of [{x:-4000,y:0},{x:4000,y:0},{x:0,y:-4000},{x:0,y:4000}]){
      const point=moveBody(center,delta,boss.radius,walls);assert(point.x>=b.x-.01&&point.x<=b.x+b.width+.01&&point.y>=b.y-.01&&point.y<=b.y+b.height+.01);
    }
    const originalWalls=JSON.stringify(g.arena.obstacles);g.boss.x=floor.x+boss.radius;g.boss.y=floor.y+boss.radius;
    g.players.get('solo')!.invulnerableUntil=1e9;g.boss.deadline=1e9;g.step();visible(g);
    assert.equal(JSON.stringify(g.arena.obstacles),originalWalls,'Boss limits must not change player/projectile arena walls');
  }
});

test('actual moving encounters retain complete art on six maps at Normal/Hard and keep their final defeat position',()=>{
  for(const id of ['constable','lantern-warden','courier','ratcatcher','quarantine-clerk','gate-widow','tollkeeper','chain-marshal','black-ambulance','matron','alchemist','bellringer','ashen-usher','brass-toad','ragpicker-kite','cobble-crab'] as const)
    for(const arena of data.arenas)for(const difficulty of ['normal','hard']){
      const g=createPracticeGame({openingBossId:id,openingArenaId:arena.id,difficulty,mode:'endless',seed:903},'Probe','soldier');g.start();
      const player=g.players.get('solo')!;player.invulnerableUntil=1e9;player.x=g.arena.bounds.x+g.arena.width-35;player.y=g.arena.bounds.y+35;g.boss.deadline=1e9;
      let travel=0;
      for(let tick=0;tick<600;tick++){const x=g.boss.x,y=g.boss.y;g.step();travel+=Math.hypot(g.boss.x-x,g.boss.y-y);visible(g);}
      if(['constable','courier','cobble-crab'].includes(id))assert(travel>1,'Whole-body limits must retain movement: '+id+arena.id+difficulty);
      const position={x:g.boss.x,y:g.boss.y};g.boss.health=0;g.step();visible(g);assert.deepEqual({x:g.boss.x,y:g.boss.y},position,'Defeat must not move the body');
    }
});
