import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Game,data} from '../src/shared/game.ts';
import {runtimeArenas} from '../src/shared/arena-layouts.ts';
import {viewOf} from '../src/shared/view.ts';
import {createPracticeGame} from '../src/shared/practice-start.ts';
import {CONTENT_REVISION,PROTOCOL} from '../src/shared/protocol.ts';
const spawns=[];
for(const map of runtimeArenas){
  const g=new Game({mode:'endless',maxPlayers:50,difficulty:'hellish',openingArenaId:map.id});
  for(let n=0;n<50;n++)g.addPlayer('p'+n,'Survivor '+n,'soldier');assert(g.start());
  assert.equal(g.boss.variant,'brutal');assert.equal(g.arena.cover.length,0);
  for(const p of g.players.values())for(const pit of g.arena.lavaPits)
    assert(Math.hypot(p.x-pit.x,p.y-pit.y)>pit.radius+data.rules.playerRadius,map.id+'/'+p.id+' overlaps lava');
  assert(viewOf(g,'p0').bossCues.filter(c=>c.kind==='arena-lava').length>=2);
  spawns.push({map:map.id,players:g.players.size,lavaPits:g.arena.lavaPits.length,allDeploymentsClear:true});
}
const g=createPracticeGame({mode:'endless'},'Mara','soldier','brutal');g.start();g.boss.staggerUntil=g.boss.deadline=1e9;g.players.get('solo')!.invulnerableUntil=1e9;
const bossShot=Reflect.get(g,'emitBossShot') as (...args:unknown[])=>void;
const rawShot=Reflect.get(g,'emitShot') as (...args:unknown[])=>void;
bossShot.call(g,800,600,0,0,5,1);assert(g.brutalVolley.queuedProjectiles>0);
for(let i=1;i<4000;i++)rawShot.call(g,'hostile',800,600,0,0,5,1);
assert.equal(g.shots.size,4000);
let peak=0;for(let tick=0;tick<70;tick++){g.step();peak=Math.max(peak,g.shots.size);assert(g.shots.size<=4000);}
assert.equal(g.brutalVolley.queuedProjectiles,0);
const report={passed:true,protocol:PROTOCOL,contentRevision:CONTENT_REVISION,spawns,peakHostileShots:peak,queuedWavesObeyCap:true,
  limits:['Single-authority headless fixtures. Zero SDK clients and zero rendered clients. Not multiplayer capacity, WAN, browser, physical-device or human balance acceptance.']};
writeFileSync('reviews/difficulty-pressure-2026-10-25/extra-fixtures.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,mapDeployments:spawns.length,playersPerMap:50,peakHostileShots:peak}));
