import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {data} from '../../src/shared/game.ts';
import {interceptorIds,interceptorRules,screenPathClear,type InterceptorScreenCue} from '../../src/shared/tank-interceptor.ts';
import {distance} from '../../src/shared/geometry.ts';
import type {Vec} from '../../src/shared/protocol.ts';
import type {Event,InputFrame,Result} from '../../src/shared/protocol.ts';
import type {View} from '../../src/shared/view.ts';
import {bulwarkTrialWorld,clearTrialWalk} from './tank-bulwark-staging.ts';
import {restWait} from './sniper-rest-flow.ts';
import {restRaidInput,type ObservedRestShot} from './sniper-rest-raid-policy.ts';
import {interceptionMenu,spentInterceptionSP} from './tank-interceptor-menu-flow.ts';
type EarlyChoice='forward'|'crossing'|'standfast';
export type InterceptionChoice=EarlyChoice|'returning'|'offset';
export type InterceptionObservation={phase:'ready'|'screen';screenId?:number;until:number;body:Vec;tick:number};
export type InterceptionTransport={
 id:string;view():View|undefined;events:Event[];observed:Map<number,ObservedRestShot>;
 input(input:Partial<InputFrame>):number;purchase(request:{kind:'skill'|'weapon'|'upgrade'|'supply';item:string}):Promise<Result>;
 start():void;vote(index:number):void;pause(value:boolean):void;paused():boolean;end?():void;
 onFirstCombat?():Promise<void>;allyPolicy?():void;stopAlly?():void;checkObservers?(observation:InterceptionObservation):Promise<void>;
};
const point=({x,y}:Vec)=>({x,y}),wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Public terrain planning only. No teleports, checkpoint imports, arranged damage or modified game clocks. */
function plan(view:View,p:Vec,choice:EarlyChoice,offset:boolean){
 const world={...bulwarkTrialWorld(view),playerRadius:data.rules.playerRadius},queue=[{p:point(p),gx:0,gy:0,parent:-1}],seen=new Set(['0:0']);
 for(let at=0;at<queue.length&&at<640;at++){
  const node=queue[at],threats=[...(view.boss.health>0?[view.boss]:[]),...view.minions.filter(actor=>actor.health>0)];
  const candidates=Array.from({length:16},(_,i)=>wrap(-Math.PI/2+i*Math.PI/8)).flatMap(aim=>{
   const n={x:Math.cos(aim),y:Math.sin(aim)},sides=choice==='crossing'||offset?[-1,1]:[0];return sides.flatMap(side=>{const m=choice==='standfast'?{x:0,y:0}:choice==='crossing'?{x:-n.y*side,y:n.x*side}:n,to={x:node.p.x+m.x*180,y:node.p.y+m.y*180};const shape=offset?{offset:side*interceptorRules.offsetBrace,halfSpan:interceptorRules.offsetHalfSpan}:undefined;if(!screenPathClear(world,node.p,to,n,shape))return [];const safety=Math.min(...threats.map(threat=>distance(to,threat)),1000);return safety<140?[]:[{aim,side,to,safety}];});
  }).sort((a,b)=>b.safety-a.safety);
  if(candidates.length){const points:Vec[]=[];for(let n=at;queue[n].parent>=0;n=queue[n].parent)points.unshift(queue[n].p);return {...candidates[0],points,searched:at+1};}
  for(const [dx,dy]of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){const gx=node.gx+dx,gy=node.gy+dy,key=gx+':'+gy;if(seen.has(key))continue;seen.add(key);const next={x:p.x+gx*24,y:p.y+gy*24};if(clearTrialWalk(world,node.p,next))queue.push({p:next,gx,gy,parent:at});}
 }
}
/** Actual ordinary3→9SP acquisition and owned screen operations through the transport's own acknowledgement and pause channels. */
export async function earnedInterceptionFlow(transport:InterceptionTransport,choice:InterceptionChoice){
 const late=choice==='returning'?interceptorIds.returns:choice==='offset'?interceptorIds.offset:undefined;
 const earlyChoice=choice==='returning'?'crossing':choice==='offset'?'standfast':choice;
 const view=()=>{const current=transport.view();assert(current);return current;},player=()=>{const owner=view().players.find(p=>p.id===transport.id);assert(owner);return owner;},earned=()=>player().sp+spentInterceptionSP(player());
 const screens=()=>view().classCues.filter((cue):cue is InterceptorScreenCue=>cue.kind==='tank-intercept-screen'&&cue.owner===transport.id);
 const acknowledge=async(input:Partial<InputFrame>,label:string)=>{const sequence=transport.input(input);await restWait(()=>player().ack>=sequence,label);return sequence;};
 const menu=await interceptionMenu(player),earnedSequence=[3],observations:{tag:string;tick:number;body:Vec;phase:string|undefined;eAt:number}[]=[];
 const observe=(tag:string)=>observations.push({tag,tick:view().combatTick,body:point(player()),phase:player().kit.interceptorPhase,eAt:player().eAt});
 const buy=async(item:string)=>menu.inspect(item,true,async()=>{const reply=await transport.purchase({kind:'skill',item});assert(reply.ok,JSON.stringify(reply));});
 async function equip(){for(const weapon of data.weapons.filter(w=>w.classId==='tank').sort((a,b)=>b.tier-a.tier))if(player().weapon===weapon.id||(await transport.purchase({kind:'weapon',item:weapon.id})).ok)break;for(const item of ['damage','health','fire-rate','reload','magazine'])await transport.purchase({kind:'upgrade',item});await transport.purchase({kind:'supply',item:'medkit'});}
 async function walk(target:Vec,aim:number){const deadline=Date.now()+6000;while(distance(player(),target)>1.2){assert(Date.now()<deadline,'Actual public-geometry walking bound');const p=player(),size=Math.max(distance(p,target)/.4,p.speed/30*4);await acknowledge({moveX:(target.x-p.x)/size,moveY:(target.y-p.y)/size,aim},'Actual staging movement acknowledged');}await acknowledge({aim},'Actual staging stop acknowledged');}
 async function pauseAndDiscard(phase:'ready'|'screen',aim:number){
  transport.stopAlly?.();await acknowledge({aim},'Neutral input before actual transport pause');transport.pause(true);await restWait(()=>transport.paused(),'Actual transport pause acknowledged');
  const frozen={tick:view().combatTick,ack:player().ack,ammo:player().ammo,eAt:player().eAt,body:point(player()),phase:player().kit.interceptorPhase};assert.equal(frozen.phase,phase);
  transport.input({technique3:true,fire:true,e:true,aim});await sleep(90);assert.equal(view().combatTick,frozen.tick);assert.equal(player().ack,frozen.ack);assert.equal(player().ammo,frozen.ammo);assert.equal(player().eAt,frozen.eAt);assert.equal(player().kit.interceptorPhase,phase);assert(distance(player(),frozen.body)<.01);
  const cue=screens()[0];await transport.checkObservers?.({phase,screenId:cue?.id,until:phase==='screen'?cue!.until:player().kit.interceptorExpiresAt!,body:point(player()),tick:frozen.tick});
  transport.pause(false);await restWait(()=>!transport.paused(),'Actual unpause acknowledged');await acknowledge({aim},'Independent neutral frame after unpause');assert.equal(player().eAt,frozen.eAt,'Paused E or Action3 cannot replay');if(phase==='ready')assert.equal(player().kit.interceptorPhase,'ready');return true;
 }
 async function screen(mode:EarlyChoice,pause:boolean,fitting?:'returning'|'offset'){
  const cooldownDeadline=Date.now()+200_000;while(view().combatTick<Math.max(player().eAt,player().dashUntil,player().reloadAt)){assert(Date.now()<cooldownDeadline&&view().phase==='combat','Issued recovery finishes in ordinary combat');transport.input({...restRaidInput(view(),player(),[...transport.observed.values()]),e:false,q:false,fire:false});transport.allyPolicy?.();await sleep(25);}
  transport.stopAlly?.();await acknowledge({},'Stop ordinary policy before staging');const route=plan(view(),player(),mode,fitting==='offset');assert(route,'Reachable screening route in public terrain');for(const target of route.points)await walk(target,route.aim);await acknowledge({aim:route.aim},'Captured bearing arrives separately');
  const recoveryBefore=player().eAt,eventAt=transport.events.length;await acknowledge({technique3:true,aim:route.aim},'Actual prepare command acknowledged');await restWait(()=>['winding','ready'].includes(player().kit.interceptorPhase??''),'Owner receives prepared state');assert.equal(player().eAt,recoveryBefore);assert.equal(screens().length,0);await acknowledge({aim:route.aim},'Prepare trigger released independently');await restWait(()=>player().kit.interceptorPhase==='ready'&&player().kit.interceptorCanLaunch===true,'Original six intervals reach owned launch readiness');observe('ready-'+mode);
  await restWait(()=>['tank-intercept-set','tank-intercept-ready'].every(id=>transport.events.slice(eventAt).some(event=>event.type==='sound'&&event.owner===transport.id&&event.id===id)),'Separate owner preparation sounds arrive');
  if(pause)await pauseAndDiscard('ready',route.aim);
  const from=point(player()),ammo=player().ammo,n={x:Math.cos(route.aim),y:Math.sin(route.aim)},input={technique3:true,aim:route.aim,moveX:mode==='crossing'||fitting==='offset'?-n.y*route.side:0,moveY:mode==='crossing'||fitting==='offset'?n.x*route.side:0};
  await acknowledge(input,'Actual screening launch acknowledged');
  const released=fitting==='returning'?transport.input({aim:route.aim}):undefined;
  await restWait(()=>player().kit.interceptorPhase==='screen','Owner active operation arrives');
  await restWait(()=>screens().length===1,'Separate actual physical screen cue arrives');
  const physical=structuredClone(screens()[0]),startedAt=player().kit.interceptorStartedAt!,recoveryAt=player().eAt;
  assert.equal(physical.mode,mode);assert(physical.id>0);assert(recoveryAt>startedAt);observe('active-'+mode);
  let adjusted:InterceptorScreenCue|undefined;
  if(fitting==='returning'){
   await restWait(()=>player().ack>=released!&&player().kit.interceptorCanReturn===true,'The actual released trigger and return window arrive');
   await acknowledge({...input,moveX:-input.moveX,moveY:-input.moveY},'Deliberate reverse command arrives during the original screen');
   await restWait(()=>screens().some(cue=>cue.id===physical.id&&cue.motionX*physical.motionX+cue.motionY*physical.motionY<-.99),
     'The original physical screen now travels the other way');
   adjusted=structuredClone(screens()[0]);
   assert.equal(adjusted.id,physical.id);assert.equal(adjusted.until,physical.until);assert.equal(adjusted.aim,physical.aim);
   await restWait(()=>transport.events.slice(eventAt).some(event=>event.type==='sound'&&event.id==='tank-intercept-return'&&event.owner===transport.id),
     'Separate owner return cue arrives');
   await acknowledge({aim:route.aim},'Release the last chord independently');
  }else{
   if(fitting==='offset'){
    assert.equal(physical.halfSpan,interceptorRules.offsetHalfSpan);
    const measured=(physical.y-from.y)*n.x-(physical.x-from.x)*n.y;
    assert(Math.abs(measured-route.side*interceptorRules.offsetBrace)<.5);
    await restWait(()=>transport.events.slice(eventAt).some(event=>event.type==='sound'&&event.id==='tank-intercept-offset'&&event.owner===transport.id),
      'Separate owner offset cue arrives');
   }
   if(pause)await pauseAndDiscard('screen',route.aim);else await acknowledge({aim:route.aim},'Release lateral launch input independently');
  }
  await restWait(()=>view().combatTick>=physical.until&&player().kit.interceptorPhase==='idle'&&screens().length===0,'Original charge window ends and screen is removed');assert.equal(player().eAt,recoveryAt);assert.equal(player().ammo,ammo);const moved=distance(from,player());if(mode==='standfast')assert(moved<1);else if(fitting==='returning')assert(moved<160,'Actual reversed course shortened travel');else assert(Math.abs(moved-180)<1.5,'Actual screening distance '+moved);assert.equal(physical.until-startedAt,10);observe('expired-'+mode);
  return {mode,physical,adjusted,startedAt,recoveryAt,actualDistance:moved,publicGeometryWaypoints:route.points.length,searched:route.searched,actualImpactSounds:transport.events.slice(eventAt).filter(event=>event.type==='sound'&&event.owner===transport.id&&event.id==='tank-intercept-impact').length};
 }
 async function clearToShop(clears:number){const deadline=Date.now()+200_000;while(view().phase==='combat'){assert(Date.now()<deadline,'Ordinary Short clear policy bound');transport.input(restRaidInput(view(),player(),[...transport.observed.values()]));transport.allyPolicy?.();await sleep(25);}transport.stopAlly?.();assert.notEqual(view().phase,'defeat');assert.equal(player().progress.clears,clears);assert.equal(view().encounter,clears);assert.equal(earned(),3+clears*6);earnedSequence.push(earned());const shopDeadline=Date.now()+90_000;while(view().phase!=='shop'){assert(Date.now()<shopDeadline&&view().phase!=='defeat','Original rewards reach actual shop');if(['mutationVote','contractVote'].includes(view().phase))transport.vote(0);await sleep(25);}}
 try{
  assert.equal(earned(),3);assert.deepEqual(player().skills,[]);await buy('tank-bastion-1');await buy(interceptorIds.entry);await menu.inspect(interceptorIds.crossing,false);await menu.inspect(interceptorIds.standfast,false);await equip();transport.start();await restWait(()=>view().phase==='combat','Ordinary Short deployment');
  await transport.onFirstCombat?.();
  const early=await screen('forward',false);await clearToShop(1);
  if(earlyChoice!=='forward'){await buy(interceptorIds[earlyChoice]);await menu.inspect(interceptorIds[earlyChoice==='crossing'?'standfast':'crossing'],false);}
  else{await menu.inspect(interceptorIds.crossing,true);await menu.inspect(interceptorIds.standfast,true);}
  async function deploy(){
   await equip();
   const deadline=Date.now()+90_000;
   while(view().phase!=='combat'){assert(Date.now()<deadline&&view().phase!=='defeat','Original shop reaches next combat');await sleep(25);}
  }
  if(late)for(const clears of [1,2,3]){
   if(clears>1)await clearToShop(clears);
   if(clears===3)await buy(late);
   else{
    await menu.inspect(late,false);
    assert.equal((await transport.purchase({kind:'skill',item:late})).reason,'insufficientPoints');
   }
   await deploy();
  }else await deploy();
  assert.equal(earned(),late?21:9);assert(!view().run.testingModified&&!view().run.customized);
  const later=await screen(earlyChoice,true,choice==='returning'||choice==='offset'?choice:undefined);
  if(transport.end){transport.end();await restWait(()=>view().phase==='defeat','Actual host end');assert.equal(screens().length,0);}
  return {passed:true,choice,actualEarnedSequence:earnedSequence,actualClears:late?3:1,spent:spentInterceptionSP(player()),earlyScreenAtEarned3:true,early,later,pausedCommandsDiscarded:true,purchases:menu.observations,observations,checkpointImports:0,scope:'Ordinary Short shop purchases and whole transport commands. Acknowledged physical screen identity, course, expiry, owner readiness and sound. Impact sounds are counted when observed.'};
 }finally{await menu.close();transport.stopAlly?.();}
}
