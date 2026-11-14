import {bulwarkTrialWorld,planBulwarkStaging,trialCastClear} from './tank-bulwark-staging.ts';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {data} from '../../src/shared/game.ts';
import {runtimeArena} from '../../src/shared/arena-layouts.ts';
import {gateObstacles} from '../../src/shared/civic-director.ts';
import {endlessSolids} from '../../src/shared/endless-director.ts';
import {moveBody,distance} from '../../src/shared/geometry.ts';
import type {Construct} from '../../src/shared/class-kits.ts';
import {bulwarkIds,wallFootprintClear,bulwarkRules} from '../../src/shared/tank-bulwark.ts';
import type {Event,InputFrame,Result,Vec} from '../../src/shared/protocol.ts';
import type {View} from '../../src/shared/view.ts';
import {restWait} from './sniper-rest-flow.ts';
import {restRaidInput,type ObservedRestShot} from './sniper-rest-raid-policy.ts';
import {bulwarkMenu,spentBulwarkSP} from './tank-bulwark-menu-flow.ts';

export type BulwarkHandling='none'|'pivot'|'port';
export type BulwarkTransport={
 id:string;view():View|undefined;events:Event[];observed:Map<number,ObservedRestShot>;
 input(input:Partial<InputFrame>):number;
 purchase(request:{kind:'skill'|'weapon'|'upgrade'|'supply';item:string}):Promise<Result>;
 start():void;vote(index:number):void;pause(value:boolean):void;paused():boolean;end?():void;
 allyPolicy?():void;stopAlly?():void;
 checkObservers?(ids:readonly number[],until:number,open:boolean):Promise<void>;
};
const point=({x,y}:Vec)=>({x,y});
const near=(a:number,b:number)=>assert(Math.abs(a-b)<.35,a+' != '+b);
const wrap=(value:number)=>Math.atan2(Math.sin(value),Math.cos(value));

/** Ordinary3→9SP Short, actual source purchase buttons and acknowledged transport commands. No checkpoint import or injected game state. */
export async function earnedBulwarkFlow(transport:BulwarkTransport,handling:BulwarkHandling){
 const view=()=>{const current=transport.view();assert(current);return current;};
 const player=()=>{const current=view().players.find(p=>p.id===transport.id);assert(current);return current;};
 const earned=()=>player().sp+spentBulwarkSP(player());
 const panels=()=>view().classCues.filter((cue):cue is Construct=>cue.kind==='wall'&&cue.owner===transport.id);
 const sound=(id:string)=>transport.events.some(event=>event.type==='sound'&&event.owner===transport.id&&event.id===id);
 const world=()=>bulwarkTrialWorld(view());
 const acknowledge=async(input:Partial<InputFrame>,label:string)=>{const sequence=transport.input(input);await restWait(()=>player().ack>=sequence,label);return sequence;};
 const menu=await bulwarkMenu(player),earnedSequence=[3];
 async function buy(item:string){await menu.inspect(item,true,async()=>{const result=await transport.purchase({kind:'skill',item});assert(result.ok,JSON.stringify(result));});}
 async function equip(){
  for(const weapon of data.weapons.filter(w=>w.classId==='tank').sort((a,b)=>b.tier-a.tier)){
   if(player().weapon===weapon.id||(await transport.purchase({kind:'weapon',item:weapon.id})).ok)break;
  }
  for(const item of ['damage','health','fire-rate','reload','magazine'])await transport.purchase({kind:'upgrade',item});
  await transport.purchase({kind:'supply',item:'medkit'});
 }
 async function walk(target:Vec,aim:number,label:string){
  const start=Date.now();
  while(distance(player(),target)>1.2){
   assert(Date.now()-start<6000,label);const p=player(),size=Math.max(distance(p,target)/.4,p.speed/30*4);
   await acknowledge({moveX:(target.x-p.x)/size,moveY:(target.y-p.y)/size,aim},label+' movement input is acknowledged');
  }
  await acknowledge({aim},label+' stops at an acknowledged position');
 }
 const observations:{tag:string;tick:number;body:Vec;ready:boolean|undefined;panels:{id:number;x:number;y:number;health:number;until:number}[]}[]=[];
 const observe=(tag:string)=>{observations.push({tag,tick:view().combatTick,body:point(player()),ready:player().kit.bulwarkCanLift,panels:panels().map(wall=>({id:wall.id,x:wall.x,y:wall.y,health:wall.health,until:wall.until}))});};
 async function stageForQ(){
  for(let attempt=0;attempt<3;attempt++){
   const threats=[...(view().boss.health>0?[view().boss]:[]),...view().minions.filter(actor=>actor.health>0)];
   const route=planBulwarkStaging(world(),player(),threats);assert(route,'Public geometry has a reachable clear Q staging route');
   observe('staging-'+attempt+'-'+route.points.length+'-waypoints');
   for(const target of route.points)await walk(target,route.aim,'Walk to real clear Q staging ground');
   await acknowledge({aim:route.aim},'Still at actual Q staging ground');
   if(trialCastClear(world(),player(),route.aim))return route.aim;
  }throw Error('Actual terrain changed during all three bounded Q staging attempts');
 }
 async function liftAndWalk(){
  await acknowledge({},'Stopped policy before actual Protective Wall');
  const recoveryDeadline=Date.now()+200_000;
  while(view().combatTick<player().qAt){
   assert(Date.now()<recoveryDeadline&&view().phase==='combat','Original Q recovery while ordinary combat runs');
   const ordinary=restRaidInput(view(),player(),[...transport.observed.values()]);
   transport.input({...ordinary,q:false,fire:false});await sleep(25);
  }
  await acknowledge({},'Stopped recovery policy before the new Q');
  await restWait(()=>view().combatTick>=Math.max(player().dashUntil,player().reloadAt),'Original active hand/movement commitment finishes before staging');
  const aim=await stageForQ();
  await acknowledge({q:true,aim},'Issued Q acknowledged');
  await restWait(()=>panels().length===1,'Original Protective Wall appears in the separate public cue update');
  observe('original-Q-visible');
  const original=structuredClone(panels()[0]),qAt=player().qAt,n={x:Math.cos(original.aim),y:Math.sin(original.aim)};
  await walk({x:original.x-n.x*32,y:original.y-n.y*32},aim,'Approach actual paid wall rear');
  observe('original-rear-arrival');
  const liftDeadline=Date.now()+6000;
  while(player().kit.bulwarkCanLift!==true){
   const live=panels().find(wall=>wall.id===original.id);observe('await-actual-lift');
   assert(live&&live.health>0&&live.until>view().combatTick,'The original panel must survive until its actual lift');
   assert(Date.now()<liftDeadline,'Authority admits the actual stationary rear approach');
   const rear={x:live.x-n.x*32,y:live.y-n.y*32};
   if(distance(player(),rear)>1.2)await walk(rear,aim,'Re-approach the actual displaced panel rear');
   else{await acknowledge({aim},'Actual stationary lift readiness frame');await sleep(25);}
  }
  observe('lift-ready');
  const ammo=player().ammo;
  await acknowledge({technique1:true,aim},'Separate actual lift command');
  await restWait(()=>player().kit.bulwarkCarried===true,'Acknowledged original panel is carried');
  assert.equal(panels()[0].id,original.id);assert.equal(panels()[0].until,original.until);near(panels()[0].halfSpan??55,55);
  await acknowledge({fire:true,aim},'Closed carried wall commits primary');assert.equal(player().ammo,ammo);
  const start=point(player()),w=world();
  const candidates=[n,{x:-n.x,y:-n.y},{x:-n.y,y:n.x},{x:n.y,y:-n.x}];
  const direction=candidates.find(direction=>{
   for(let i=1;i<=12;i++){
    const body={x:start.x+direction.x*i*3,y:start.y+direction.y*i*3};
    if(distance(moveBody(start,{x:body.x-start.x,y:body.y-start.y},data.rules.playerRadius,[...w.obstacles]),body)>.1)return false;
    if(!wallFootprintClear(w,{x:body.x+n.x*32,y:body.y+n.y*32},n,110))return false;
   }return true;
  });assert(direction,'A real full-width setdown route exists');
  await walk({x:start.x+direction.x*36,y:start.y+direction.y*36},aim,'Actual carried movement');
  const moved=distance(start,player());assert(moved>30);assert(player().kit.bulwarkCanSet);
  assert.equal(player().qAt,qAt);assert.equal(panels()[0].until,original.until);assert(panels()[0].health<=original.health);
  return {aim,original,qAt,moved,ammo};
 }
 async function setDown(first:Awaited<ReturnType<typeof liftAndWalk>>){
  assert(player().kit.bulwarkCanSet);await acknowledge({technique1:true,aim:player().kit.bulwarkHeading},'Separate full-width setdown command');
  await restWait(()=>player().kit.bulwarkCarried===false,'Original full-width panel is set down');
  const wall=panels().find(w=>w.id===first.original.id);assert(wall);assert.equal(wall.until,first.original.until);
  near(wall.halfSpan??110,110);assert.equal(player().qAt,first.qAt);assert(wall.health<=first.original.health);
 }
 async function clearToShop(){
  const deadline=Date.now()+200_000;
  while(view().phase==='combat'){
   assert(Date.now()<deadline,'Ordinary Short clear policy bound');transport.input(restRaidInput(view(),player(),[...transport.observed.values()]));
   transport.allyPolicy?.();await sleep(25);
  }
  transport.stopAlly?.();assert.notEqual(view().phase,'defeat');assert.equal(view().encounter,1);assert.equal(player().progress.clears,1);assert.equal(earned(),9);earnedSequence.push(9);
  const shopDeadline=Date.now()+90_000;
  while(view().phase!=='shop'){
   assert(Date.now()<shopDeadline&&view().phase!=='defeat','Original rewards reach the next shop');
   if(['mutationVote','contractVote'].includes(view().phase))transport.vote(0);await sleep(25);
  }
 }
 try{
  assert.equal(earned(),3);assert.deepEqual(player().skills,[]);await buy('tank-protection-1');await buy(bulwarkIds.entry);
  await menu.inspect(bulwarkIds.pivot,false);await menu.inspect(bulwarkIds.port,false);await equip();transport.start();
  await restWait(()=>view().phase==='combat','Ordinary Short deployment');
  const early=await liftAndWalk();await setDown(early);await clearToShop();
  if(handling!=='none'){
   await buy(bulwarkIds[handling]);await menu.inspect(bulwarkIds[handling==='pivot'?'port':'pivot'],false);
  }else{await menu.inspect(bulwarkIds.pivot,true);await menu.inspect(bulwarkIds.port,true);}
  await equip();const deploymentDeadline=Date.now()+90_000;
  while(view().phase!=='combat'){assert(Date.now()<deploymentDeadline&&view().phase!=='defeat','Original shop clock reaches combat');await sleep(25);}
  assert.equal(earned(),9);assert(!view().run.testingModified&&!view().run.customized);
  const current=await liftAndWalk();let turned=0,paidPortRounds=0;
  if(handling==='pivot'){
   const from=panels()[0].aim,w=world(),p=player();
   const angle=[Math.PI/4,-Math.PI/4,Math.PI/6,-Math.PI/6,Math.PI/2].find(angle=>{
    for(let step=0;step<=36;step++){const a=from+angle*step/36,n={x:Math.cos(a),y:Math.sin(a)};
     if(!wallFootprintClear(w,{x:p.x+n.x*32,y:p.y+n.y*32},n,55))return false;}
    const n={x:Math.cos(from+angle),y:Math.sin(from+angle)};return wallFootprintClear(w,{x:p.x+n.x*32,y:p.y+n.y*32},n,110);
   });assert(angle!==undefined,'Real turn sweep and full-width endpoint are clear');
   await acknowledge({aim:wrap(from+angle)},'Captured aim arrives before the separate handling command');assert(player().kit.bulwarkCanHandle);
   await acknowledge({technique2:true,aim:wrap(from+angle)},'Actual Braced Pivot begins');
   await restWait(()=>sound('tank-wall-pivot'),'Actual turn sound arrives');
   const recovery=player().kit.bulwarkRecoveryAt;assert(recovery);
   await acknowledge({aim:wrap(from+angle)},'Independent neutral command during captured rotation');
   await restWait(()=>view().combatTick>=(player().kit.bulwarkCommitUntil??Infinity)&&Math.abs(wrap(panels()[0].aim-from-angle))<.01,'Original twelve-interval turn finishes');
   turned=wrap(panels()[0].aim-from);assert(Math.abs(turned)>.5);assert.equal(player().kit.bulwarkRecoveryAt,recovery);
  }
  if(handling==='port'){
   await acknowledge({aim:current.aim},'Still before opening the actual port');assert(player().kit.bulwarkCanHandle);
   await acknowledge({technique2:true,aim:current.aim},'Actual port opening begins');
   await restWait(()=>player().kit.bulwarkPortPhase==='open'&&player().kit.bulwarkPrimaryReady===true,'Original six intervals expose the primary opening');
   assert((panels()[0].bulwarkPortHalfSpan??0)>0);const before=player().ammo,eventIndex=transport.events.length;
   await acknowledge({fire:true,aim:current.aim},'Actual paid primary through the live opening');
   await acknowledge({aim:current.aim},'Primary trigger released separately');paidPortRounds=before-player().ammo;assert.equal(paidPortRounds,1);
   await restWait(()=>transport.events.slice(eventIndex).some(e=>e.type==='shots'&&e.shots.some(s=>s.owner===transport.id)),'Separate actual owner projectile batch arrives');
   await acknowledge({technique2:true,aim:current.aim},'Independent actual closing command');
   await restWait(()=>player().kit.bulwarkPortPhase==='closed','Original six-interval closure finishes');assert.equal(panels()[0].bulwarkPortHalfSpan,undefined);
   await acknowledge({technique2:true,aim:current.aim},'A separate command opens the original panel again');
   await restWait(()=>player().kit.bulwarkPortPhase==='open','Actual port reopened for ownership observation');
  }
  assert.equal(panels()[0].until,current.original.until);assert.equal(player().qAt,current.qAt);assert(player().kit.bulwarkCanSet);
  transport.stopAlly?.();await acknowledge({aim:player().kit.bulwarkHeading},'Neutral frame before actual transport pause');
  transport.pause(true);await restWait(()=>transport.paused(),'Actual transport pause channel acknowledged');
  const frozenTick=view().combatTick,frozenAck=player().ack,frozenAmmo=player().ammo,ids=[...player().kit.bulwarkPanelIds!];
  transport.input({technique1:true,technique2:true,fire:true,aim:current.aim});await sleep(90);
  assert.equal(view().combatTick,frozenTick);assert.equal(player().ack,frozenAck);assert.equal(player().ammo,frozenAmmo);assert(player().kit.bulwarkCarried);
  await transport.checkObservers?.(ids,current.original.until,handling==='port');
  transport.pause(false);await restWait(()=>!transport.paused(),'Actual unpause acknowledgement');
  await acknowledge({aim:player().kit.bulwarkHeading},'Neutral post-pause frame');assert(player().kit.bulwarkCarried,'Paused commands cannot replay on resume');
  await setDown(current);
  if(transport.end){transport.end();await restWait(()=>view().phase==='defeat','Real room host exit');assert.equal(panels().length,0);}
  return {passed:true,handling,actualEarnedSequence:earnedSequence,actualClears:1,spent:spentBulwarkSP(player()),earlyCarryAtEarned3:true,
   earlyMoved:early.moved,laterMoved:current.moved,turned,paidPortRounds,pausedCommandsDiscarded:true,originalPanelUntil:current.original.until,
   originalQRecovery:current.qAt,originalLifetimeTicks:current.original.until-current.original.at,menuObservations:menu.observations,observations};
 }catch(error){console.error(JSON.stringify({error:error instanceof Error?error.message:String(error),handling,observations,arenaId:transport.view()?.arenaId,boss:transport.view()?.boss,bossCues:transport.view()?.bossCues,phase:transport.view()?.phase,combatTick:transport.view()?.combatTick,player:transport.view()?.players.find(p=>p.id===transport.id),panels:transport.view()?.classCues.filter(c=>c.owner===transport.id)}));throw error;}
 finally{await menu.close();}
}
