import {interceptorIds,interceptorRules,screenPathClear} from '../shared/tank-interceptor.ts';
import type {InputFrame} from '../shared/protocol.ts';
import type {PlayerView} from '../shared/view.ts';
type Point={x:number;y:number};
type World={tick:number;playerRadius:number;bounds:Point&{width:number;height:number};obstacles:readonly (Point&{width:number;height:number})[];lavaPits:readonly (Point&{radius:number})[]};
const owns=(p:PlayerView)=>p.classId==='tank'&&p.skills.includes(interceptorIds.entry);
/** Predict only an acknowledged operation or its release; never invent a prepared screen or cast. */
export function tankInterceptionInput(p:PlayerView,input:InputFrame,now:number):InputFrame{
 if(!owns(p))return input;
 const k=p.kit={...p.kit},pressed=input.technique3&&!k.interceptorInputDown;k.interceptorInputDown=input.technique3;
 const moving=Math.hypot(input.moveX,input.moveY)>.001;
 if(k.interceptorPhase==='screen'){
  if(now>=(k.interceptorScreenUntil??0)||pressed||(k.interceptorMode==='standfast'&&moving)){
   p.dashUntil=Math.min(p.dashUntil,now);k.interceptorPhase='idle';return input;
  }
  return {...input,aim:k.interceptorHeading??input.aim,q:false,e:false,ultimate:false,reload:false,dodge:false,fire:false,technique1:false,technique2:false};
 }
 if(k.interceptorPhase==='winding'){
  if(now<(k.interceptorReadyAt??0)){
   if(moving||input.fire||input.q||input.e||input.ultimate||input.reload||input.dodge||input.technique1||input.technique2){k.interceptorPhase='idle';return input;}
   return {...input,aim:k.interceptorHeading??input.aim,q:false,e:false,ultimate:false,reload:false,dodge:false,fire:false,technique1:false,technique2:false};
  }
  // The acknowledged wind has ended. Consume a valid side-launch input without inventing its dash.
  k.interceptorPhase='ready';
 }
 if(k.interceptorPhase==='ready'&&pressed&&k.interceptorMode==='crossing'&&!input.q&&!input.e&&!input.ultimate&&!input.reload&&!input.dodge&&!input.fire&&!input.technique1&&!input.technique2){
  const a=k.interceptorHeading??input.aim,n={x:Math.cos(a),y:Math.sin(a)},side=-input.moveX*n.y+input.moveY*n.x,forward=input.moveX*n.x+input.moveY*n.y;
  if(Math.abs(side)>.25&&Math.abs(side)>Math.abs(forward)*1.5)return {...input,moveX:0,moveY:0};
 }
 return input;
}
export function tankInterceptionSpeed(p:PlayerView,now:number):number|undefined{
 if(!owns(p)||p.kit.interceptorPhase!=='screen'||now>=(p.kit.interceptorScreenUntil??0))return undefined;
 return p.kit.interceptorMode==='standfast'||now===(p.kit.interceptorStartedAt??0)?0:interceptorRules.speed;
}
export function tankInterceptionAfterMove(p:PlayerView,from:Point,world:World){
 if(!owns(p)||p.kit.interceptorPhase!=='screen'||world.tick>=(p.kit.interceptorScreenUntil??0))return;
 const k=p.kit,a=k.interceptorHeading??p.aim,normal={x:Math.cos(a),y:Math.sin(a)},expected=k.interceptorMode==='standfast'||world.tick===(k.interceptorStartedAt??0)?0:interceptorRules.speed/30;
 if(Math.abs(p.x-from.x-(k.interceptorMotionX??0)*expected)>.1||Math.abs(p.y-from.y-(k.interceptorMotionY??0)*expected)>.1||!screenPathClear(world,from,p,normal)){
  // Keep the actual collision/ejection displacement, retire only retained dash prediction.
  p.dashUntil=Math.min(p.dashUntil,world.tick);p.kit={...k,interceptorPhase:'idle'};
 }
}
