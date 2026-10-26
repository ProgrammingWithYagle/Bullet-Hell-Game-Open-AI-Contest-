import {createGameServer} from '../src/server/index.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {Session} from '../src/client/session.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,data} from '../src/shared/game.ts';
import {encounterAssists} from '../src/shared/encounter-policy.ts';
import {phaseBreakPoints} from '../src/shared/phase-break-layout.ts';
import {runtimeArenas,runtimeArena} from '../src/shared/arena-layouts.ts';
import {segmentRect,moveBody} from '../src/shared/geometry.ts';
import {arenaCoverPlan} from '../src/client/arena-covers.ts';
import {Prediction} from '../src/client/prediction.ts';
import {viewOf} from '../src/shared/view.ts';
import {HZ,idleInput,PROTOCOL} from '../src/shared/protocol.ts';

function game(difficulty:string,count=1,arena='gatehouse'){
 const g=new Game({difficulty,mode:'endless',maxPlayers:Math.max(2,count),openingArenaId:arena});
 for(let i=0;i<count;i++)g.addPlayer('p'+i,'Survivor '+i,'soldier');
 g.start();g.boss.staggerUntil=g.boss.deadline=1e9;
 for(const p of g.players.values())p.invulnerableUntil=1e9;
 return g;
}
test('Easy has exactly half Baby circles and a channel exactly 1.5 times as long in real solo and fifty-player encounters',()=>{
 const baby=encounterAssists('baby'),easy=encounterAssists('easy');
 assert.equal(baby.shieldCircles,6);assert.equal(easy.shieldCircles,baby.shieldCircles/2);
 assert.equal(easy.shieldChannelSeconds,baby.shieldChannelSeconds*1.5);
 for(const count of [1,8,16,50])for(const difficulty of ['baby','easy']){
  const g=game(difficulty,count);g.boss.health=g.boss.maxHealth*.49;g.step();
  const a=g.accord!;assert(a);const rules=encounterAssists(difficulty);
  assert.equal(a.points.length,rules.shieldCircles);assert.equal(a.channelTicks,rules.shieldChannelSeconds*HZ);
  assert(a.required<=a.points.length);assert(a.required<=count);
  const players=[...g.players.values()];
  for(let i=0;i<a.required;i++){players[i].x=a.points[i].x;players[i].y=a.points[i].y;}
  for(let n=0;n<a.channelTicks-1;n++)g.step();assert.equal(g.accords,0,difficulty+'/'+count);
  g.step();assert.equal(g.accords,1,difficulty+'/'+count);assert.equal(g.accord,null);
 }
});
test('the longer Easy channel still resets when a participant leaves a circle',()=>{
 const g=game('easy',2);g.boss.health=g.boss.maxHealth*.49;g.step();const a=g.accord!,p=[...g.players.values()];
 for(let i=0;i<2;i++){p[i].x=a.points[i].x;p[i].y=a.points[i].y;}
 for(let n=0;n<60;n++)g.step();assert.equal(a.progress,60);assert.equal(g.accords,0);
 p[1].x=800;p[1].y=900;g.step();assert.equal(a.progress,0);
 p[1].x=a.points[1].x;p[1].y=a.points[1].y;
 for(let n=0;n<89;n++)g.step();assert.equal(g.accords,0);g.step();assert.equal(g.accords,1);
});
test('two additional Baby cover props match actual collision and keep fifty deployments, all six circles and boss routes reachable on every map',()=>{
 for(const original of runtimeArenas){
  const g=game('baby',50,original.id),map=g.arena,normal=runtimeArena(original.id);
  assert.equal(map.cover.length,normal.cover.length+2);
  const extra=map.cover.slice(normal.cover.length);assert.equal(extra.length,2);
  const art=arenaCoverPlan(original.id,'baby');assert.equal(art.length,original.id==='gatehouse'?2:map.cover.length);
  for(const rect of extra)assert(art.some(a=>a.x===rect.x&&a.y===rect.y&&a.width===rect.width&&a.height===rect.height));
  const free=(x:number,y:number,r=9)=>!map.obstacles.some(o=>segmentRect({x,y},{x,y},o,r));
  for(const p of g.players.values())assert(free(p.x,p.y),original.id+'/'+p.id);
  const pads=phaseBreakPoints(map,6);assert.equal(pads.length,6);assert(pads.every(p=>free(p.x,p.y)));
  const tile=(p:{x:number;y:number})=>({x:Math.round(p.x/20)*20,y:Math.round(p.y/20)*20});
  function flood(start:{x:number;y:number},radius:number){
   const seen=new Set<string>(),queue=[tile(start)];
   for(let i=0;i<queue.length;i++){
    const p=queue[i],key=p.x+':'+p.y;
    if(seen.has(key)||p.x<map.bounds.x+radius||p.y<map.bounds.y+radius||p.x>map.bounds.x+map.width-radius||p.y>map.bounds.y+map.height-radius||!free(p.x,p.y,radius))continue;
    seen.add(key);queue.push({x:p.x+20,y:p.y},{x:p.x-20,y:p.y},{x:p.x,y:p.y+20},{x:p.x,y:p.y-20});
   }return seen;
  }
  const seen=flood(map.playerSpawn,9);
  for(const point of [...pads,map.bossSpawn]){const p=tile(point);assert(seen.has(p.x+':'+p.y),original.id+' required route');}
  const bossSeen=flood(map.bossSpawn,58);
  assert([...bossSeen].some(key=>{const [x,y]=key.split(':').map(Number);return Math.hypot(x-map.playerSpawn.x,y-map.playerSpawn.y)<=67;}),original.id+' boss engagement route');
 }
});
test('new Baby cover stops real projectiles and client prediction agrees with authority at the new collider',()=>{
 for(const original of runtimeArenas){
  const g=game('baby',1,original.id),p=g.players.get('p0')!,rect=g.arena.cover.at(-1)!;
  p.x=rect.x-20;p.y=rect.y+rect.height/2;
  const prediction=new Prediction(),v=viewOf(g,p.id);prediction.acknowledge(v,p.id);
  for(let n=0;n<18;n++){
   const input={...idleInput(),sequence:p.ack+1,moveX:1};prediction.submit(input,v);g.submitInput(p.id,input);g.step();
  }
  assert(p.x<rect.x);assert(Math.abs(p.x-prediction.player!.x)<1e-6);
  const emit=Reflect.get(g,'emitShot') as (...a:unknown[])=>{id:number};
  const shot=emit.call(g,'hostile',rect.x-25,rect.y+rect.height/2,0,6000,5,3);
  g.step();assert(!g.shots.has(shot.id),original.id+' projectile passed through Baby cover');
 }
});
test('issued protocol-16 local boundaries retain progress under the revised assistance rules',()=>{
 const g=new Game({difficulty:'normal',mode:'endless'}),p=g.addPlayer('solo','Mara','soldier');p.coins=912;
 const save=g.offlineCheckpoint()!;save.protocolVersion=16;save.contentRevision='1ad00eee45a117a45929e56884c6a39a8c4eb614b0728ab31e847403fb8735bb';
 const r=Game.restoreOffline(save),after=r.offlineCheckpoint()!;
 assert.equal(after.protocolVersion,PROTOCOL);assert.equal(after.player.coins,912);assert.equal(after.settings.runId,save.settings.runId);
 assert.deepEqual(after.player.progress,save.player.progress);assert.equal(encounterAssists(r.settings.difficulty).revivedHealthFraction,.25);
 assert.throws(()=>Game.restoreOffline({...save,serverOnly:true}),/versionMismatch/);
});

test('real clients receive the exact Baby/Easy circle counts and channel duration and clear them at victory',{timeout:20000},async()=>{
 const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address==='object');
 const until=async(check:()=>boolean)=>{const end=Date.now()+6000;while(!check()){if(Date.now()>end)throw Error('Assist replication timed out');await new Promise(r=>setTimeout(r,15));}};
 try{for(const difficulty of ['baby','easy']){
  const owner=new Session('http://127.0.0.1:'+address.port),guest=new Session('http://127.0.0.1:'+address.port);
  try{
   const options={name:'Host',classId:'soldier' as const,mode:'endless' as const,difficulty,openingBossId:'constable' as const};
   await owner.connect(options);await guest.connect({...options,name:'Guest'},{roomId:owner.room!.roomId});
   await until(()=>owner.view?.players.length===2);owner.start();await until(()=>guest.view?.phase==='combat');
   const g=liveRooms.get(owner.room!.roomId)!.game;for(const p of g.players.values())p.invulnerableUntil=1e9;
   g.boss.health=g.boss.maxHealth*.49;await until(()=>!!guest.view?.accord);
   const rules=encounterAssists(difficulty);
   for(const session of [owner,guest]){assert.equal(session.view!.accord!.points.length,rules.shieldCircles);assert.equal(session.view!.accord!.channelTicks,rules.shieldChannelSeconds*HZ);}
   g.boss.health=0;await until(()=>guest.view?.phase!=='combat');assert.equal(guest.view!.accord,null);
  }finally{await Promise.allSettled([owner.close(),guest.close()]);}
 }}finally{await server.gracefullyShutdown(false);}
});
