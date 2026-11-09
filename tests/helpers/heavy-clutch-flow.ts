import assert from 'node:assert/strict';
import{HZ,idleInput,validInput,type InputFrame}from'../../src/shared/protocol.ts';
import{traverseIds as ids,clutchId,heavyTraverseRules as r}from'../../src/shared/heavy-traverse.ts';
import{heavyOpenLane,heavyWait,type HeavyFlakAdapter}from'./heavy-flak-flow.ts';
export type ClutchVariant='loose'|'spade'|'floating';
/** Operation only: the caller supplies actual owned acquisition and an untouched Game/worker/room. */
export async function heavyClutchOperation(a:HeavyFlakAdapter,mode:ClutchVariant){
 const view=()=>{const v=a.view();assert(v);return v;},p=()=>{const p=view().players.find(p=>p.id===a.owner);assert(p);return p;};
 assert(p().skills.includes(clutchId));const previous=new Set(a.events.flatMap(e=>e.type==='shots'?e.shots:[]).map(s=>s.id)),eventStart=a.events.length;
 const shots=()=>a.events.slice(eventStart).flatMap(e=>e.type==='shots'?e.shots:[]).filter(s=>s.owner===a.owner&&!previous.has(s.id)),removed=(id:number)=>a.events.some(e=>e.type==='remove'&&e.ids.includes(id)),sounds=(id:string)=>a.events.slice(eventStart).filter(e=>e.type==='sound'&&e.owner===a.owner&&e.id===id);
 let sequence=p().ack;const input=(action:Partial<InputFrame>={})=>{const frame={...idleInput(),sequence:++sequence,aim:0,...action};assert(validInput(frame));a.input(frame);return sequence;};
 await a.pause(true);const initialTick=view().combatTick,ammo=p().ammo;
 input({technique1:true,technique2:true,fire:true,reload:true,dodge:true,ultimate:true});await new Promise(r=>setTimeout(r,100));assert.equal(view().combatTick,initialTick);assert.equal(shots().length,0);
 await a.pause(false);const idle=input();await heavyWait(()=>p().ack>=idle,'fresh idle after discarded paused Clutch requests');assert.equal(p().ammo,ammo);assert.equal(shots().length,0);
 const aim=heavyOpenLane(view(),a.owner).aim;input({technique1:true,technique2:true,aim});
 await heavyWait(()=>shots().length===1&&(p().kit.heavyTraverseUntil??0)>0,'first actual C emission and separate authoritative Clutch view');
 const born=p().kit.heavyTraverseBornAt!,recovery=p().kit.technique1At!,until=p().kit.heavyTraverseUntil!;assert.equal(p().ammo,ammo-1);assert(!p().kit.heavyClutchUsed);assert.equal(shots()[0].expires,born+HZ*r.lifeSeconds);
 await a.pause(true);const firstPaused=view().combatTick;assert(firstPaused<born+10);await a.lateAndNonHostChecks?.();
 input({technique1:true,technique2:true,fire:true,reload:true,dodge:true,ultimate:true});await new Promise(r=>setTimeout(r,100));assert.equal(view().combatTick,firstPaused);assert.equal(p().kit.heavyTraverseUntil,until);assert.equal(p().kit.technique1At,recovery);assert.equal(p().ammo,ammo-1);assert(!p().kit.heavyClutchUsed);
 const origin={x:p().x,y:p().y},moveX=Math.cos(aim),moveY=Math.sin(aim);
 await a.pause(false);input({technique2:true,aim,moveX,moveY});
 await heavyWait(()=>!!p().kit.heavyClutchLifted&&sounds('heavy-clutch-lift').length===1,'actual lift and its separate sound event');
 assert((p().kit.heavyClutchAt??Infinity)<born+10);assert.equal(p().ammo,ammo-1);
 await heavyWait(()=>(p().kit.heavyClutchForfeited??0)>=1&&(p().kit.heavyTraverseUntil??0)>0,'at least one original slot actually passes unpaid while lifted');
 await a.pause(true);const liftedPaused=view().combatTick,forfeited=p().kit.heavyClutchForfeited!,moved={x:p().x,y:p().y};assert(liftedPaused<born+30);assert(p().kit.heavyClutchLifted);assert(Math.hypot(moved.x-origin.x,moved.y-origin.y)>5);assert.equal(p().ammo,ammo-1);
 input({technique1:true,technique2:true,fire:true,reload:true,dodge:true,ultimate:true});await new Promise(r=>setTimeout(r,100));assert.equal(view().combatTick,liftedPaused);assert.equal(p().kit.heavyClutchForfeited,forfeited);assert(p().kit.heavyClutchLifted);assert.equal(p().kit.heavyTraverseUntil,until);assert.equal(p().kit.technique1At,recovery);assert.equal(p().ammo,ammo-1);
 await a.pause(false);input({technique2:true,aim});
 await heavyWait(()=>sounds('heavy-clutch-engage').length===1,'separate stationary re-engagement accepted before the last original slot');
 input({aim});await heavyWait(()=>shots().some(s=>s.expires-HZ*r.lifeSeconds===born+30)&&(p().kit.heavyTraverseUntil??0)===0,'separate last original paid shot event batch and completed authoritative stroke view');
 const ticks=shots().map(s=>s.expires-HZ*r.lifeSeconds);assert(ticks.length>=2&&ticks.length<=3);assert.equal(ticks[0],born);assert.equal(ticks.at(-1),born+30);assert.equal(new Set(ticks).size,ticks.length);assert(ticks.every(t=>[born,born+10,born+20,born+30].includes(t)));assert.equal(p().ammo,ammo-ticks.length);assert.equal(p().kit.technique1At,recovery);assert.equal(sounds('heavy-clutch-lift').length,1);assert.equal(sounds('heavy-clutch-engage').length,1);
 for(const s of shots()){assert.equal(s.radius,r.radius);assert.equal(s.pierce,0);assert(s.damage>=r.damage);assert(Math.abs(Math.atan2(s.vy,s.vx)-aim)<1e-6);for(const key of['origin','weapon','mode','stroke','required','requiresClutch'])assert(!(key in s));a.checkOwnerStreams?.(s.id);}
 let actualHostExit=false;if(a.end){const alive=shots().filter(s=>!removed(s.id));assert(alive.length>0);await a.end();await heavyWait(()=>alive.every(s=>removed(s.id)),'host exit removes actual post-Clutch flights and separately delivers owner removals');actualHostExit=true;}else await heavyWait(()=>shots().every(s=>removed(s.id)),'actual post-Clutch finite flight removals');for(const s of shots())a.checkOwnerStreams?.(s.id);
 return{passed:true,mode,actualAdmissionTicks:ticks,actualPaidRounds:ticks.length,actualForfeitedSlots:4-ticks.length,originalBorn:born,originalUntil:until,originalRecovery:recovery,actualLiftAndSeparateReengagement:true,onePairOnly:true,realLiftedMovement:{from:origin,to:moved},pausedBeforeAndDuringLift:true,pausedRequestsDiscarded:true,finiteOriginalSlotsAndRecovery:true,actualHostExit,noCheckpointOrBudgetHealthPositionInjection:true,shots:shots().map(s=>({...s})),limits:'Actual movement/admission/ownership/operation evidence; controlled Game contacts and earned progression are separate. No rendered/device/human/language/listening/motion/final-balance claim.'};
}
/** Real Raid12 budget, labelled separately from the earned Short3→9→15 proof. */
export async function heavyClutchFlow(a:HeavyFlakAdapter,mode:ClutchVariant,options:{purchase?:(item:string)=>Promise<void>}={}){
 const p=()=>a.view()!.players.find(p=>p.id===a.owner)!;assert.equal(p().sp,12);assert.equal(p().skills.length,0);
 const items=['heavy-ordnance-1',ids.entry,...(mode==='loose'?[]:[ids[mode]]),clutchId];for(const item of items){await(options.purchase?options.purchase(item):a.purchase(item));await heavyWait(()=>p().skills.includes(item),'separate actual Clutch ownership view');}
 assert.deepEqual(p().skills,items);assert.equal(p().sp,mode==='loose'?6:4);await a.start();await heavyWait(()=>a.view()?.phase==='combat','actual Raid Clutch combat');return{...await heavyClutchOperation(a,mode),ordinaryStartingSP:12,modeOfAcquisition:'raid',actualSkillPurchases:items.length,spentSkillSP:mode==='loose'?6:8,remainingSP:p().sp};
}
