import {distance,segmentRect,type Rect} from './geometry.ts';
export const phaseBreakCandidates=[
 {x:560,y:550},{x:1040,y:550},{x:800,y:650},{x:570,y:720},{x:1030,y:720},{x:800,y:450},
 {x:800,y:800},{x:500,y:350},{x:1100,y:350},{x:400,y:650},{x:1200,y:650},
];
export function phaseBreakPoints(arena:{bounds:Rect;obstacles:Rect[]},count:number){
 const points:{x:number;y:number}[]=[];
 const candidates=[...phaseBreakCandidates];
 for(let y=arena.bounds.y+100;y<arena.bounds.y+arena.bounds.height-80;y+=140)
  for(let x=arena.bounds.x+120;x<arena.bounds.x+arena.bounds.width-100;x+=150)candidates.push({x,y});
 for(const point of candidates){
  if(point.x<arena.bounds.x+30||point.y<arena.bounds.y+30||point.x>arena.bounds.x+arena.bounds.width-30||point.y>arena.bounds.y+arena.bounds.height-30||arena.obstacles.some(o=>segmentRect(point,point,o,21))||points.some(p=>distance(p,point)<135))continue;
  points.push({...point});if(points.length===count)return points;
 }
 throw Error('Arena cannot place required phase-break circles');
}
