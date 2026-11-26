import {interceptorIds,interceptorRules,interceptorSideMotion,screenPathClear} from '../shared/tank-interceptor.ts';
import type {InputFrame} from '../shared/protocol.ts';
import type {PlayerView} from '../shared/view.ts';
type Point={x:number;y:number};
type World={tick:number;playerRadius:number;bounds:Point&{width:number;height:number};obstacles:readonly (Point&{width:number;height:number})[];lavaPits:readonly (Point&{radius:number})[]};
const awaitingReturn=Symbol('awaitingReturn');
type PredictedKit=PlayerView['kit']&{[awaitingReturn]?:true};
const retainedHeading=(p:PlayerView)=>({x:Math.cos(p.kit.interceptorHeading??p.aim),y:Math.sin(p.kit.interceptorHeading??p.aim)});
const handsFree=(i:InputFrame)=>!i.q&&!i.e&&!i.ultimate&&!i.reload&&!i.dodge&&!i.fire&&!i.technique1&&!i.technique2;
const owns=(p:PlayerView)=>p.classId==='tank'&&p.skills.includes(interceptorIds.entry);
/** Predict only an acknowledged operation or its release; never invent a prepared screen or cast. */
export function tankInterceptionInput(p:PlayerView,input:InputFrame,now:number):InputFrame{
 if(!owns(p))return input;
 const k:PredictedKit=p.kit={...p.kit},pressed=input.technique3&&!k.interceptorInputDown;k.interceptorInputDown=input.technique3;
 const moving=Math.hypot(input.moveX,input.moveY)>.001;
 if(k.interceptorPhase==='screen'){
  const normal=retainedHeading(p),side=interceptorSideMotion(input,normal);
  const lateral=side?side.y*normal.x-side.x*normal.y:0;
  if(pressed&&k.interceptorCanReturn&&side&&handsFree(input)&&
     side.x*(k.interceptorMotionX??0)+side.y*(k.interceptorMotionY??0)<-.99)k[awaitingReturn]=true;
  if(!moving)delete k.interceptorOffsetHeld;
  const holdingOffset=k.interceptorOffsetHeld!==undefined&&Math.sign(lateral)===Math.sign(k.interceptorOffsetHeld);
  if(now>=(k.interceptorScreenUntil??0)||pressed&&!k[awaitingReturn]||(k.interceptorMode==='standfast'&&moving&&!holdingOffset)){
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
 if(k.interceptorPhase==='ready'&&pressed&&handsFree(input)&&
    (k.interceptorMode==='crossing'||k.interceptorMode==='standfast'&&p.skills.includes(interceptorIds.offset))&&
    interceptorSideMotion(input,retainedHeading(p)))return {...input,moveX:0,moveY:0};
 return input;
}
export function tankInterceptionSpeed(p:PlayerView,now:number):number|undefined{
 if(!owns(p)||p.kit.interceptorPhase!=='screen'||now>=(p.kit.interceptorScreenUntil??0))return undefined;
 return p.kit.interceptorMode==='standfast'||(p.kit as PredictedKit)[awaitingReturn]||now===(p.kit.interceptorStartedAt??0)?0:interceptorRules.speed;
}
export function tankInterceptionAfterMove(p:PlayerView,from:Point,world:World){
 if(!owns(p)||p.kit.interceptorPhase!=='screen'||world.tick>=(p.kit.interceptorScreenUntil??0))return;
 const k=p.kit,normal=retainedHeading(p),expected=(tankInterceptionSpeed(p,world.tick)??0)/30;
 const shape=k.interceptorOffset===undefined?undefined:{offset:k.interceptorOffset,halfSpan:interceptorRules.offsetHalfSpan};
 if(Math.abs(p.x-from.x-(k.interceptorMotionX??0)*expected)>.1||Math.abs(p.y-from.y-(k.interceptorMotionY??0)*expected)>.1||!screenPathClear(world,from,p,normal,shape)){
  // Keep the actual collision/ejection displacement, retire only retained dash prediction.
  p.dashUntil=Math.min(p.dashUntil,world.tick);p.kit={...k,interceptorPhase:'idle'};
 }
}
