import type {Construct} from '../src/shared/class-kits.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,data} from '../src/shared/game.ts';
import {runtimeArena} from '../src/shared/arena-layouts.ts';
import {distance,moveBody} from '../src/shared/geometry.ts';
import {idleInput,HZ,type Vec} from '../src/shared/protocol.ts';
import {wallFootprintClear,bulwarkIds,type BulwarkWorld} from '../src/shared/tank-bulwark.ts';
import {bulwarkTrialWorld,clearTrialWalk,planBulwarkStaging,trialCastClear} from './helpers/tank-bulwark-staging.ts';
import {viewOf} from '../src/shared/view.ts';

const empty=():BulwarkWorld=>({tick:0,bounds:{x:0,y:0,width:1600,height:1000},obstacles:[],lavaPits:[]});
for(const arena of data.arenas)for(const difficulty of data.difficulties)test('staging finds a walkable original Q placement in '+arena.id+'/'+difficulty.id,()=>{
 const actual=runtimeArena(arena.id,difficulty.id),world={...actual,tick:0},before=structuredClone(world);
 const route=planBulwarkStaging(world,actual.playerSpawn);assert(route);
 let previous=actual.playerSpawn;for(const point of route.points){assert(clearTrialWalk(world,previous,point));previous=point;}
 assert(trialCastClear(world,previous,route.aim));assert.deepEqual(world,before);
});
test('a clear distant panel does not admit a Q ray clipped by near masonry',()=>{
 const world=empty();world.obstacles=[{x:425,y:492,width:8,height:16}];
 const body={x:400,y:500},normal={x:1,y:0};
 assert([50,65,80,100].every(length=>wallFootprintClear(world,{x:body.x+length,y:body.y},normal,112)));
 assert(distance(moveBody(body,{x:100,y:0},20,[...world.obstacles]),{x:500,y:500})>50);
 assert.equal(trialCastClear(world,body,0),false);
});
test('an acknowledged body touching masonry can preview an outward walk but never cross it',()=>{
 const world={...runtimeArena('gatehouse','baby'),tick:0},body={x:988.25,y:401.5},outward={x:body.x,y:body.y+32};
 assert.deepEqual(moveBody(body,{x:0,y:32},data.rules.playerRadius,[...world.obstacles]),body);
 assert(clearTrialWalk(world,body,outward));assert(!clearTrialWalk(world,body,{x:body.x,y:body.y-100}));
 assert(!clearTrialWalk(world,{x:body.x,y:body.y-1},outward));
});
test('staging rejects sealed ground and leaves the actual world unchanged',()=>{
 const world=empty();world.obstacles=[{x:0,y:0,width:1600,height:1000}];const before=structuredClone(world);
 assert.equal(planBulwarkStaging(world,{x:800,y:500}),undefined);assert.deepEqual(world,before);
});
test('staging excludes lava from the body walk and the full original panel',()=>{
 const world=empty();world.lavaPits=[{x:500,y:500,radius:20}];
 assert(!clearTrialWalk(world,{x:450,y:500},{x:550,y:500}));assert(!trialCastClear(world,{x:400,y:500},0));
});
test('staging refuses bounds-clipped body destinations and panel placements',()=>{
 const world=empty();assert(!clearTrialWalk(world,{x:40,y:500},{x:0,y:500}));assert(!trialCastClear(world,{x:1500,y:500},0));
});
for(const recorded of [{x:902,y:298.5},{x:988.25,y:401.5}])test('controlled actual Game walks from the recorded public body and lifts its unchanged original Q at '+recorded.x,()=>{
 const game=new Game({mode:'short',difficulty:'baby',seed:41,openingArenaId:'gatehouse',arenaSelection:'fixed'});
 const player=game.addPlayer('tank','Controlled acknowledged staging','tank');
 for(const id of ['tank-protection-1',bulwarkIds.entry])assert(game.transact(player.id,{kind:'skill',id,item:id}).ok);
 assert(game.start());game.boss.staggerUntil=10000;
 // A controlled starting coordinate isolates the public surface-boundary case. It is not a replay of the missing original cues.
 player.x=recorded.x;player.y=recorded.y+.01;
 let sequence=0;const observed=()=>({x:Math.round(player.x*4)/4,y:Math.round(player.y*4)/4});
 const step=(input:Parameters<Game['submitInput']>[1])=>{assert(game.submitInput(player.id,input));game.step();game.drainEvents();};
 const input=(props:Partial<ReturnType<typeof idleInput>>)=>step({...idleInput(),sequence:++sequence,clientTick:game.combatTick,...props});
 const world=bulwarkTrialWorld(viewOf(game,player.id)),route=planBulwarkStaging(world,observed(),[game.boss]);assert(route);
 const walk=(target:Vec)=>{for(let n=0;distance(observed(),target)>1.2;n++){
  assert(n<180,'Real acknowledged movement must reach the waypoint');const p=observed(),size=Math.max(distance(p,target)/.4,game.movementSpeed(player)/HZ*4);
  input({moveX:(target.x-p.x)/size,moveY:(target.y-p.y)/size,aim:route.aim});
 }input({aim:route.aim});};
 for(const target of route.points)walk(target);assert(trialCastClear(bulwarkTrialWorld(viewOf(game,player.id)),observed(),route.aim));
 input({q:true,aim:route.aim});const original=game.classCues().find((cue):cue is Construct=>cue.kind==='wall'&&cue.owner===player.id);assert(original);
 const saved=structuredClone(original),qAt=player.qAt,n={x:Math.cos(original.aim),y:Math.sin(original.aim)};
 assert.equal(original.until-original.at,150);walk({x:original.x-n.x*32,y:original.y-n.y*32});input({aim:route.aim});
 assert(viewOf(game,player.id).players.find(p=>p.id===player.id)?.kit.bulwarkCanLift);
 input({technique1:true,aim:route.aim});const current=game.classCues().find((cue):cue is Construct=>cue.kind==='wall'&&cue.id===saved.id);assert(current);
 assert(viewOf(game,player.id).players.find(p=>p.id===player.id)?.kit.bulwarkCarried);assert.equal(current.until,saved.until);assert.equal(player.qAt,qAt);assert(current.health<=saved.health);
});
