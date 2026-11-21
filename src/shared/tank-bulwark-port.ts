import type {BulwarkWall,Vec} from './tank-bulwark.ts';
export type PortWall = BulwarkWall & {bulwarkPortOffset?:number;bulwarkPortHalfSpan?:number};
/** Same closed pieces feed projectile sweeps and the visible shield. */
export function portClosedPieces<T extends PortWall>(wall:T):T[]{
  const offset=wall.bulwarkPortOffset,opening=wall.bulwarkPortHalfSpan;
  if(wall.kind!=='wall'||offset===undefined||opening===undefined||!Number.isFinite(offset)||!Number.isFinite(opening)||opening<=0)return [wall];
  const span=wall.halfSpan??110,low=Math.max(-span,Math.min(span,offset-opening)),high=Math.max(-span,Math.min(span,offset+opening));
  const pieces:T[]=[];
  for(const [begin,end]of [[-span,low],[high,span]]){
    if(end-begin<=1e-9)continue;const center=(begin+end)/2;
    const piece={...wall,x:wall.x-Math.sin(wall.aim)*center,y:wall.y+Math.cos(wall.aim)*center,halfSpan:(end-begin)/2};
    delete piece.bulwarkPortOffset;delete piece.bulwarkPortHalfSpan;pieces.push(piece);
  }
  return pieces;
}
export function portWallHit<T extends PortWall>(from:Vec,to:Vec,wall:T,pad:number,ordinary:(from:Vec,to:Vec,wall:T,pad:number)=>number|null):number|null{
  let first:number|null=null;for(const piece of portClosedPieces(wall)){const hit=ordinary(from,to,piece,pad);if(hit!==null&&(first===null||hit<first))first=hit;}return first;
}
