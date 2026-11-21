import {bulwarkIds,wallFootprintClear,bulwarkRules,type Vec,type BulwarkWorld} from '../shared/tank-bulwark.ts';
import type {PlayerView,View} from '../shared/view.ts';
import type {Construct} from '../shared/class-kits.ts';

/** Only acknowledged panel IDs constrain prediction. No lift, setdown, turn or opening is invented. */
export function tankPredictedWalk(p:PlayerView,next:Vec,view:View,world:BulwarkWorld):Vec{
  if(p.classId!=='tank'||!p.skills.includes(bulwarkIds.entry)||!p.kit.bulwarkCarried)return next;
  const ids=p.kit.bulwarkPanelIds??[],confirmed=view.players.find(owner=>owner.id===p.id);
  if(!confirmed||!ids.length)return p;
  const panels=view.classCues.filter((cue):cue is Construct=>cue.kind==='wall'&&cue.owner===p.id&&ids.includes(cue.id)&&cue.health>0&&cue.until>world.tick);
  if(panels.length!==ids.length)return p;
  const dx=next.x-p.x,dy=next.y-p.y;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/bulwarkRules.sweepStep));
  for(let step=0;step<=steps;step++)for(const panel of panels){
    const center={x:panel.x+p.x-confirmed.x+dx*step/steps,y:panel.y+p.y-confirmed.y+dy*step/steps};
    if(!wallFootprintClear(world,center,{x:Math.cos(panel.aim),y:Math.sin(panel.aim)},panel.halfSpan??55))return p;
  }
  return next;
}
