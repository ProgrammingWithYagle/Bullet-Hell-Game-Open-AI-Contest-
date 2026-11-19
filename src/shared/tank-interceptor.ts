import {distance,segmentRect,moveBody,segmentCircle} from './geometry.ts';
import {wallFootprintClear,bulwarkRules} from './tank-bulwark.ts';

type Vec={x:number;y:number};
type World={tick:number;playerRadius:number;bounds:Vec&{width:number;height:number};obstacles:readonly (Vec&{width:number;height:number})[];lavaPits:readonly (Vec&{radius:number})[]};
type Input={sequence:number;aim:number;moveX:number;moveY:number;technique1:boolean;technique2:boolean;technique3:boolean;q:boolean;e:boolean;ultimate:boolean;reload:boolean;dodge:boolean;fire:boolean};
type Owner=Vec&{id:string;classId:string;connected:boolean;status:string;skills:readonly string[];oldX:number;oldY:number;input:Input;eAt:number;dashUntil:number;dashX:number;dashY:number;reloadAt:number;invulnerableUntil:number};
export type InterceptorMode='forward'|'crossing'|'standfast';
type Mode=InterceptorMode;
type ScreenShape = {offset: number; halfSpan: number};
export type InterceptorStatus={
 interceptorPhase:'idle'|'winding'|'ready'|'screen';interceptorMode:Mode;interceptorHeading:number;
 interceptorStartedAt:number;interceptorReadyAt:number;interceptorExpiresAt:number;interceptorScreenUntil:number;
 interceptorMotionX:number;interceptorMotionY:number;interceptorInputDown:boolean;
 interceptorCanArm:boolean;interceptorCanLaunch:boolean;interceptorCanCrossLeft:boolean;interceptorCanCrossRight:boolean;
 interceptorCanOffsetLeft?:boolean;interceptorCanOffsetRight?:boolean;interceptorOffset?:number;interceptorOffsetHeld?:number;interceptorCanReturn?:boolean;
};
export type InterceptorScreenCue={kind:'tank-intercept-screen';id:number;radius:number;owner:string;x:number;y:number;aim:number;at:number;until:number;halfSpan:number;thickness:number;mode:Mode;motionX:number;motionY:number};
export type InterceptorEvent={kind:string;owner:string;tick:number;x:number;y:number;[key:string]:unknown};
type State={id:number;phase:'winding'|'ready'|'screen';mode:Mode;origin:Vec;normal:Vec;motion:Vec;at:number;readyAt:number;expiresAt:number;until:number;last:Vec;shape?:ScreenShape;offsetHeld?:boolean;returned?:boolean};
export const interceptorId='tank-interceptor-1';
export const interceptorIds={entry:interceptorId,crossing:'tank-interceptor-crossing-1',standfast:'tank-interceptor-standfast-1',offset:'tank-interceptor-offset-brace-1',returns:'tank-interceptor-return-crossing-1'} as const;
export const crossingId='tank-interceptor-crossing-1',standfastId='tank-interceptor-standfast-1';
export const interceptorRules={windTicks:6,preparedTicks:90,halfSpan:64,lead:24,speed:600,range:180,offsetBrace:56,offsetHalfSpan:44};
const point=({x,y}:Vec)=>({x,y});
const available=(p:Owner)=>p.classId==='tank'&&p.connected&&p.status==='active'&&p.skills.includes(interceptorId);
const center=(p:Vec,n:Vec,offset=0)=>({x:p.x+n.x*interceptorRules.lead-n.y*offset,y:p.y+n.y*interceptorRules.lead+n.x*offset});
const offsetShape = (sign:number):ScreenShape => ({offset:sign*interceptorRules.offsetBrace, halfSpan:interceptorRules.offsetHalfSpan});
const centered:ScreenShape = {offset:0,halfSpan:interceptorRules.halfSpan};
const ownsOffset = (p:Owner) => p.skills.includes(interceptorIds.offset) && p.skills.includes(standfastId);
export function screenPathClear(world:World,from:Vec,to:Vec,normal:Vec,shape:ScreenShape=centered){
 const steps=Math.max(1,Math.ceil(distance(from,to)/3));let previous=from;
 if(world.lavaPits.some(pit=>segmentCircle(from,to,pit,pit.radius+world.playerRadius)!==null))return false;
 for(let at=0;at<=steps;at++){
  const body={x:from.x+(to.x-from.x)*at/steps,y:from.y+(to.y-from.y)*at/steps};
  const r=world.playerRadius,b=world.bounds;
  if(body.x<b.x+r||body.y<b.y+r||body.x>b.x+b.width-r||body.y>b.y+b.height-r)return false;
  if(at&&distance(moveBody(previous,{x:body.x-previous.x,y:body.y-previous.y},r,[...world.obstacles]),body)>.05)return false;
  if(!wallFootprintClear(world,center(body,normal,shape.offset),normal,shape.halfSpan))return false;
  previous=body;
 }
 return true;
}
const destination=(p:Vec,motion:Vec)=>({x:p.x+motion.x*interceptorRules.range,y:p.y+motion.y*interceptorRules.range});
const tangent=(n:Vec)=>({x:-n.y,y:n.x});
export function interceptorSideMotion(input:Pick<Input,'moveX'|'moveY'>,normal:Vec):Vec|undefined{
 const t=tangent(normal),side=input.moveX*t.x+input.moveY*t.y,forward=input.moveX*normal.x+input.moveY*normal.y;
 return Math.abs(side)>.25&&Math.abs(side)>Math.abs(forward)*1.5?{x:t.x*Math.sign(side),y:t.y*Math.sign(side)}:undefined;
}
export class TankInterceptor{
 private states=new Map<string,State>();
 private down=new Map<string,boolean>();
 private consumedMotion=new Set<string>();
 constructor(private readonly nextId:()=>number,private readonly observe?:(event:InterceptorEvent)=>void){}
 private note(kind:string,p:Owner,tick:number,extra:Record<string,unknown>={}){this.observe?.({kind,owner:p.id,tick,x:p.x,y:p.y,...extra});}
 remove(id:string,p?:Owner,tick=0,reason='owner-loss'){
  const state=this.states.get(id);if(state?.phase==='screen'&&p)p.dashUntil=Math.min(p.dashUntil,tick);
  if(state&&p)this.note(reason,p,tick);this.states.delete(id);
 }
 forget(id:string,p?:Owner,tick=0){this.remove(id,p,tick);this.down.delete(id);this.consumedMotion.delete(id);}
 clear(players:readonly Owner[],tick:number){for(const [id]of this.states)this.remove(id,players.find(p=>p.id===id),tick,'phase-end');this.down.clear();this.consumedMotion.clear();}
 command(p:Owner,world:World,carried:boolean,recovery:number,duration:number){
  const now=world.tick,i=p.input,pressed=i.technique3&&!this.down.get(p.id);this.down.set(p.id,i.technique3);this.consumedMotion.delete(p.id);
  let state=this.states.get(p.id);
  if(!available(p)||carried){this.remove(p.id,p,now,'unavailable');return;}
  if(state&&(now>=state.expiresAt||(state.phase==='screen'&&now>=state.until))){this.remove(p.id,p,now,'expiry');state=undefined;}
  const moving=Math.hypot(i.moveX,i.moveY)>.001;
  if(state?.phase==='screen'){
   if(pressed){
    if(!this.returnCrossing(p,state,world))this.remove(p.id,p,now,'manual-brake');
   }
   else if(state.mode==='standfast'){
    if(!moving)state.offsetHeld=false;
    else {
     const side=interceptorSideMotion(i,state.normal),t=tangent(state.normal);
     if(!state.offsetHeld||!side||Math.sign(side.x*t.x+side.y*t.y)!==Math.sign(state.shape?.offset??0))
      this.remove(p.id,p,now,'walk-brake');
    }
   }
   return;
  }
  if(state?.phase==='winding'&&now>=state.readyAt){state.phase='ready';this.note('ready',p,now);}
  const competing=i.q||i.e||i.ultimate||i.reload||i.dodge||i.technique1||i.technique2;
  const side=state?.phase==='ready'&&(state.mode==='crossing'||state.mode==='standfast'&&ownsOffset(p))?interceptorSideMotion(i,state.normal):undefined;
  const sideLaunch=!!side&&pressed&&!competing&&!i.fire&&now>=p.eAt&&now>=p.dashUntil&&now>=p.reloadAt;
  if(state&&((moving&&!sideLaunch)||competing||distance(p,state.origin)>.2||(state.phase==='winding'&&i.fire))){this.remove(p.id,p,now,'preparation-interrupted');state=undefined;}
  if(sideLaunch)this.consumedMotion.add(p.id);
  if(!pressed||(moving&&!sideLaunch)||competing||i.fire||now<p.eAt||now<p.dashUntil||now<p.reloadAt)return;
  if(state?.phase==='winding')return;
  const n=state?.normal??{x:Math.cos(i.aim),y:Math.sin(i.aim)};
  const mode:Mode=state?.mode??(p.skills.includes(standfastId)?'standfast':p.skills.includes(crossingId)?'crossing':'forward');
  if(!state){
   const t=tangent(n),motions=mode==='standfast'?[{x:0,y:0}]:mode==='crossing'?[n,t,{x:-t.x,y:-t.y}]:[n];
   const offsetClear=mode==='standfast'&&ownsOffset(p)&&[-1,1].some(sign=>screenPathClear(world,p,p,n,offsetShape(sign)));
   if(!offsetClear&&!motions.some(m=>screenPathClear(world,p,destination(p,m),n))){this.note('blocked-ground',p,now,{mode});return;}
   this.states.set(p.id,{id:0,phase:'winding',mode,origin:point(p),normal:n,motion:n,at:now,readyAt:now+interceptorRules.windTicks,expiresAt:now+interceptorRules.preparedTicks,until:0,last:point(p)});this.note('armed',p,now,{normal:n,mode});return;
  }
  const motion=mode==='standfast'?{x:0,y:0}:side??n;
  const t=tangent(n);
  const shape=mode==='standfast'&&side ? offsetShape(Math.sign(side.x*t.x+side.y*t.y)) : undefined;
  if(!screenPathClear(world,p,destination(p,motion),n,shape)){this.note('blocked-ground',p,now,{mode,motion});return;}
  state.phase='screen';state.id=this.nextId();state.motion=motion;state.at=now;state.until=now+duration;state.expiresAt=state.until;state.last=point(p);
  state.shape=shape;state.offsetHeld=!!shape;
  p.eAt=now+recovery;p.dashUntil=state.until;p.dashX=motion.x;p.dashY=motion.y;
  // All modes spend the issued E recovery without calling or changing the E cast.
  // No new invulnerability, ram sweep, Wake Guard, ammo or extended charge window.
  this.note(shape?'offset-launched':'launched',p,now,{mode,motion,normal:n,until:state.until,recoveryAt:p.eAt,originalInvulnerableUntil:p.invulnerableUntil});
 }
 private returnMotion(p:Owner,state:State,world:World){
  if(!p.skills.includes(interceptorIds.returns)||state.mode!=='crossing'||state.returned||
     world.tick-state.at<3||state.until-world.tick<3||
     Math.abs(state.motion.x*state.normal.x+state.motion.y*state.normal.y)>.01)return;
  const next={x:-state.motion.x,y:-state.motion.y};
  const distance=(state.until-world.tick)*interceptorRules.speed/30;
  const target={x:p.x+next.x*distance,y:p.y+next.y*distance};
  if(screenPathClear(world,p,target,state.normal))return next;
 }
 private returnCrossing(p:Owner,state:State,world:World){
  const i=p.input;
  if(i.q||i.e||i.ultimate||i.reload||i.dodge||i.technique1||i.technique2||i.fire)return false;
  const direction=interceptorSideMotion(i,state.normal);
  if(!direction||direction.x*state.motion.x+direction.y*state.motion.y>-.99)return false;
  const next=this.returnMotion(p,state,world);
  if(!next)return false;
  state.returned=true;
  state.motion=next;
  p.dashX=next.x;
  p.dashY=next.y;
  this.consumedMotion.add(p.id);
  this.note('reversed-crossing',p,world.tick,{until:state.until,recoveryAt:p.eAt});
  return true;
 }
 busy(id:string){const phase=this.states.get(id)?.phase;return phase==='winding'||phase==='screen';}
 consumesMovement(id:string){return this.consumedMotion.has(id);}
 heading(id:string){const n=this.states.get(id)?.normal;return n&&Math.atan2(n.y,n.x);}
 speed(id:string,tick:number){const s=this.states.get(id);return s?.phase==='screen'&&tick<s.until?(tick===s.at||s.mode==='standfast'?0:interceptorRules.speed):undefined;}
 afterMove(p:Owner,world:World){
  const state=this.states.get(p.id);if(!state)return;
  if(!available(p)){this.remove(p.id,p,world.tick);return;}
  if(state.phase!=='screen'){if(distance(p,state.origin)>.2)this.remove(p.id,p,world.tick,'forced-preparation-interruption');return;}
  const dx=p.x-state.last.x,dy=p.y-state.last.y,expected=world.tick===state.at||state.mode==='standfast'?0:20;
  if(Math.abs(dx-state.motion.x*expected)>.1||Math.abs(dy-state.motion.y*expected)>.1||!screenPathClear(world,state.last,p,state.normal,state.shape)){
   // Preserve actual body displacement/ejection; retire only the screen and dash.
   this.remove(p.id,p,world.tick,'movement-interruption');return;
  }state.last=point(p);
 }
 hit(from:Vec,to:Vec,radius:number,players:readonly Owner[],tick:number,limit:number){
  let best:{t:number;owner:Owner}|undefined;
  for(const p of players){const state=this.states.get(p.id);if(!available(p)||state?.phase!=='screen'||tick>=state.until)continue;
   const n=state.normal,shape=state.shape??centered,old=center({x:p.oldX,y:p.oldY},n,shape.offset),next=center(p,n,shape.offset);
   const local=(point:Vec,c:Vec)=>({x:(point.x-c.x)*n.x+(point.y-c.y)*n.y,y:-(point.x-c.x)*n.y+(point.y-c.y)*n.x});
   const a=local(from,old),b=local(to,next);
   if(a.x < -bulwarkRules.thickness-radius||b.x-a.x>=-1e-9)continue;
   const hit=segmentRect(a,b,{x:-bulwarkRules.thickness,y:-shape.halfSpan,width:bulwarkRules.thickness*2,height:shape.halfSpan*2},radius);
   if(hit&&hit.t<limit&&(!best||hit.t<best.t))best={t:hit.t,owner:p};
  }return best;
 }
 block(p:Owner,tick:number,shot:number){this.note('blocked-shot',p,tick,{shot});}
 stateSnapshot(id:string){const state=this.states.get(id);return state&&structuredClone(state);}
 /** Private owner intent/readiness. Public cues below contain only an already-active physical screen. */
 ownerStatus(p:Owner,world:World,carried:boolean,combat:boolean):Partial<InterceptorStatus>{
  if(p.classId!=='tank'||!p.skills.includes(interceptorId))return {};
  const stored=this.states.get(p.id),s=stored&&world.tick<stored.expiresAt?stored:undefined;
  const mode=s?.mode??(p.skills.includes(standfastId)?'standfast':p.skills.includes(crossingId)?'crossing':'forward');
  const n=s?.normal??{x:Math.cos(p.input.aim),y:Math.sin(p.input.aim)},t=tangent(n);
  const clear=(m:Vec)=>screenPathClear(world,p,destination(p,m),n);
  const eligible=available(p)&&combat&&!carried&&world.tick>=p.eAt&&world.tick>=p.dashUntil&&world.tick>=p.reloadAt;
  const input=p.input,handsFree=!input.fire&&!input.q&&!input.e&&!input.ultimate&&!input.reload&&!input.dodge&&!input.technique1&&!input.technique2,moving=Math.hypot(input.moveX,input.moveY)>.001;
  const forward=eligible&&clear(mode==='standfast'?{x:0,y:0}:n),left=eligible&&mode==='crossing'&&clear({x:-t.x,y:-t.y}),right=eligible&&mode==='crossing'&&clear(t);
  const canOffset=eligible&&mode==='standfast'&&ownsOffset(p);
  const offsetLeft=canOffset&&screenPathClear(world,p,p,n,offsetShape(-1));
  const offsetRight=canOffset&&screenPathClear(world,p,p,n,offsetShape(1));
  const offsetReady=offsetLeft||offsetRight;
  const returnReady=!!(s?.phase==='screen'&&combat&&!carried&&available(p)&&
   this.returnMotion(p,s,{...world,tick:world.tick+1}));
  return {interceptorPhase:s?.phase??'idle',interceptorMode:mode,interceptorHeading:Math.atan2(n.y,n.x),
   interceptorStartedAt:s?.at??0,interceptorReadyAt:s?.readyAt??0,interceptorExpiresAt:s?.expiresAt??0,interceptorScreenUntil:s?.until??0,
   interceptorMotionX:s?.motion.x??0,interceptorMotionY:s?.motion.y??0,interceptorInputDown:this.down.get(p.id)??false,
   interceptorCanArm:!s&&handsFree&&!moving&&!!(forward||left||right||offsetReady),interceptorCanLaunch:s?.phase==='ready'&&handsFree&&(!moving||(mode==='crossing'||offsetReady)&&!!interceptorSideMotion(input,n))&&!!(forward||left||right||offsetReady),
   interceptorCanCrossLeft:s?.phase==='ready'&&handsFree&&left,interceptorCanCrossRight:s?.phase==='ready'&&handsFree&&right,
   ...(s?.phase==='ready'&&offsetLeft&&handsFree?{interceptorCanOffsetLeft:true}:{}),
   ...(s?.phase==='ready'&&offsetRight&&handsFree?{interceptorCanOffsetRight:true}:{}),
   ...(s?.shape?{interceptorOffset:s.shape.offset}:{}),
   ...(s?.offsetHeld&&s.shape?{interceptorOffsetHeld:s.shape.offset}:{}),
   ...(returnReady?{interceptorCanReturn:true}:{})};
 }

 cues(players:readonly Owner[],tick:number,combat:boolean):InterceptorScreenCue[]{
  if(!combat){this.clear(players,tick);return [];}
  for(const [id,state]of this.states){const p=players.find(p=>p.id===id);if(!p||!available(p)||tick>=state.expiresAt)this.remove(id,p,tick);}
  return [...this.states].filter(([,s])=>s.phase==='screen'&&tick<s.until).map(([owner,s])=>({kind:'tank-intercept-screen',id:s.id,radius:Math.hypot(s.shape?.halfSpan??interceptorRules.halfSpan,bulwarkRules.thickness),owner,...center(s.last,s.normal,s.shape?.offset),aim:Math.atan2(s.normal.y,s.normal.x),at:s.at,until:s.until,halfSpan:s.shape?.halfSpan??interceptorRules.halfSpan,thickness:bulwarkRules.thickness,mode:s.mode,motionX:s.motion.x,motionY:s.motion.y}));
 }
}
