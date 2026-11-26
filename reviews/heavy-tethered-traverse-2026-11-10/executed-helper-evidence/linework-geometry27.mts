import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {root,stage,sha,write,fingerprints} from './cycle-common11.mjs';
process.chdir(root);
const {Game,data}=await import(pathToFileURL(root+'/src/shared/game.ts').href);
const {viewOf}=await import(pathToFileURL(root+'/src/shared/view.ts').href);
const {segmentRect,segmentCircle,moveBody}=await import(pathToFileURL(root+'/src/shared/geometry.ts').href);
const {HZ}=await import(pathToFileURL(root+'/src/shared/protocol.ts').href);
type Point={x:number;y:number};
const range=600,shotRadius=3,bodyRadius=9,rows:any[]=[];
const before=fingerprints();
for(const arena of data.arenas)for(const difficulty of data.difficulties){
  const game=new Game({mode:'short',difficulty:difficulty.id,seed:41,maxPlayers:1,openingArenaId:arena.id,arenaSelection:'fixed'});
  const player=game.addPlayer('solo','Unregistered Lineworker geometry','heavy');assert(game.start());
  const actual=game.arena,obstacles=game.obstacles,view=viewOf(game,player.id),owner=view.players.find((p:any)=>p.id===player.id)!;
  const bossRadius=data.bosses.find((b:any)=>b.id===game.boss.id)!.radius;
  const origin={x:player.x,y:player.y},contacts:any[]=[];
  for(let n=0;n<64;n++){
    const aim=n*Math.PI/32,end={x:origin.x+Math.cos(aim)*range,y:origin.y+Math.sin(aim)*range};
    const hits=obstacles.flatMap((rect:any,index:number)=>{const hit=segmentRect(origin,end,rect,shotRadius);return hit?[{...hit,index,stable:actual.obstacles.includes(rect),rect}]:[];}).sort((a:any,b:any)=>a.t-b.t);
    const hit=hits[0],body=segmentCircle(origin,end,game.boss,bossRadius+shotRadius);
    if(body!==null&&(!hit||body<=hit.t)){contacts.push({aim,kind:'actual boss body first',anchored:false});continue;}
    if(!hit){contacts.push({aim,kind:'no admitted masonry contact',anchored:false});continue;}
    if(!hit.stable){contacts.push({aim,kind:'temporary solid first',anchored:false});continue;}
    const center={x:origin.x+(end.x-origin.x)*hit.t,y:origin.y+(end.y-origin.y)*hit.t};
    const anchor={x:center.x-hit.normal.x*shotRadius,y:center.y-hit.normal.y*shotRadius};
    const target={x:anchor.x+hit.normal.x*(bodyRadius+1),y:anchor.y+hit.normal.y*(bodyRadius+1)};
    const lineEnd={x:anchor.x+hit.normal.x*1.25,y:anchor.y+hit.normal.y*1.25};
    if(obstacles.some((r:any)=>segmentRect(origin,lineEnd,r,1)!==null)){contacts.push({aim,kind:'actual straight line obstructed',anchored:false});continue;}
    let position={...origin},last=position,stopped=false;
    for(let tick=0;tick<3*HZ;tick++){
      const distance=Math.hypot(target.x-position.x,target.y-position.y);
      if(distance<=1){stopped=true;break;}
      const travel=Math.min(owner.speed/HZ,distance),delta={x:(target.x-position.x)/distance*travel,y:(target.y-position.y)/distance*travel};
      last=position;position=moveBody(position,delta,bodyRadius,obstacles);
      if(Math.hypot(position.x-last.x,position.y-last.y)<1e-6)break;
    }
    const travel=Math.hypot(position.x-origin.x,position.y-origin.y);
    const crossesLava=actual.lavaPits.some((pit:any)=>segmentCircle(origin,position,pit,pit.radius+bodyRadius)!==null);
    contacts.push({aim,kind:'actual runtime masonry',anchored:true,anchor,target,actualHitRect:hit.rect,normal:hit.normal,
      physicalRange:hit.t*range,bodyTravel:travel,stoppedBeforeSurface:stopped,finalBody:position,crossesActualLava:crossesLava});
  }
  const usable=contacts.filter(c=>c.anchored&&c.bodyTravel>20&&!c.crossesActualLava);
  rows.push({arena:arena.id,difficulty:difficulty.id,bounds:actual.bounds,actualCover:actual.cover.length,actualSolids:obstacles.length,
    spawn:origin,currentBodySpeed:owner.speed,testedDirections:64,actualMasonryContacts:contacts.filter(c=>c.anchored).length,
    usableGeometryDirections:usable.length,maximumObservedCollisionRespectingTravel:Math.max(0,...usable.map(c=>c.bodyTravel)),
    example:usable.sort((a,b)=>b.bodyTravel-a.bodyTravel)[0]??null,
    bodyFirstDirections:contacts.filter(c=>c.kind==='actual boss body first').length,
    unobstructedGeometryDoesNotProveSafetyAgainstLiveAttacks:true});
}
assert.deepEqual(fingerprints(),before);
const result={studiedAt:new Date().toISOString(),registered:false,canonicalFilesChanged:false,sourceRuntimeSha256:before.runtimeSourceSha256,
  sourceSnapshotSha256:before.sourceSnapshotSha256,prototypeSha256:sha(fs.readFileSync(new URL(import.meta.url))),
  proposedPhysicalRange:range,proposedShotRadius:shotRadius,actualBodyRadius:bodyRadius,cases:rows.length,
  everyArenaDifficultyHasAUsableCollisionRespectingDirection:rows.every(r=>r.usableGeometryDirections>0),rows,
  limits:[
    'Unregistered geometry study only. Game supplies its actual runtime arena, current obstacles, ordinary start/body/boss and real current movement speed; geometry uses the actual shared sweep and body collision functions.',
    'The hook and hauling mechanic are not implemented. Local copied vectors are examined without moving the Game player, granting skills, spending a round, changing boss health or injecting a checkpoint. There is no acquired-operation, ordinary-clear, transport, authority, damage, balance or human acceptance claim.',
    'Only an actual physical masonry hit can support this initial candidate. Actual boss body contact wins earlier travel. Current runtime perimeter solids must be considered: Insane/Hellish remove interior cover and must not be left with an unusable route.',
    'Lava intersections are measured as a real hazard and are never immunity. Dynamic cover changes, explicit boundary events, interruptions, current-line lifecycle, owner loss, original recovery and pooled-shot ownership still require real implementation and verification before registration.',
  ]};
write(stage+'/linework-geometry27.json',result);
console.log(JSON.stringify({registered:false,cases:rows.length,everyArenaDifficultyHasAUsableCollisionRespectingDirection:result.everyArenaDifficultyHasAUsableCollisionRespectingDirection,
  rows:rows.map(r=>({arena:r.arena,difficulty:r.difficulty,cover:r.actualCover,solids:r.actualSolids,usable:r.usableGeometryDirections,travel:r.maximumObservedCollisionRespectingTravel}))}));
