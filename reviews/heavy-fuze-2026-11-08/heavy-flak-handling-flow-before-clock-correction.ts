import assert from 'node:assert/strict';
import { data } from '../../src/shared/game.ts';
import { HZ } from '../../src/shared/protocol.ts';
import { flakIds as ids, type FlakBurstCue } from '../../src/shared/heavy-flak.ts';
import { restWait, type RestAdapter } from './sniper-rest-flow.ts';
import { restRaidInput } from './sniper-rest-raid-policy.ts';
import { heavyOpenLane } from './heavy-flak-flow.ts';
export type FuzeHandling='running'|'hanging';
export type FuzeAdapter=RestAdapter&{
 bursts():FlakBurstCue[];
 acquireHandling?(canBuy:boolean,purchase:()=>Promise<void>):Promise<unknown>;
 checkSharedBurst?(cue:FlakBurstCue):Promise<void>;
 checkOwnerStreams?(id:number):void;
 exit?():Promise<void>;
};
/** Ordinary first-clear acquisition and actual shell input. No checkpoint, hazard, position, health or resource injection. */
export async function heavyFlakHandlingFlow(a:FuzeAdapter,handling:FuzeHandling,pattern:'compact'|'frontal'){
 const v=()=>{const view=a.view();assert(view);return view;},p=()=>{const player=v().players.find(p=>p.id===a.id);assert(player);return player;},accepted:any[]=[],buy=async(kind:'skill'|'weapon'|'upgrade'|'supply',item:string)=>{const result=await a.request({kind,item});if(result.ok)accepted.push({kind,item});return result;},skills=[...data.skills,...data.generalSkills,...data.specializationSkills],spent=()=>p().skills.reduce((n,id)=>n+skills.find(s=>s.id===id)!.cost,0),earned=()=>p().sp+spent(),ownFlak=()=>a.emittedShots().filter(s=>s.owner===a.id&&s.visual==='flak');
 await restWait(()=>!!a.view(),'ordinary Heavy Raid lobby');assert.equal(p().classId,'heavy');assert.equal(p().sp,12);assert.equal(p().skills.length,0);
 for(const id of ['heavy-ordnance-1',ids.entry,ids[pattern],ids.command])assert((await buy('skill',id)).ok,id);assert.equal(p().sp,4);assert.equal(earned(),12);
 await a.acquireHandling?.(false,async()=>assert.fail('Disabled12earned inspection cannot purchase.'));
 const rejected=await buy('skill',ids[handling]);assert(!rejected.ok&&rejected.reason==='insufficientPoints');assert.equal(p().sp,4);assert(!p().skills.includes(ids[handling]));
 for(const w of data.weapons.filter(w=>w.classId==='heavy').toSorted((x,y)=>y.tier-x.tier)){if(p().weapon===w.id)break;if((await buy('weapon',w.id)).ok)break;}
 for(const id of ['damage','health','fire-rate','reload','magazine'])await buy('upgrade',id);await buy('supply','medkit');
 a.start();await restWait(()=>v().phase==='combat','ordinary Heavy first combat');const firstBoss=v().boss.id,firstStartedAt=v().combatTick,combatWallEnd=Date.now()+200000;
 while(v().phase==='combat'){assert(Date.now()<combatWallEnd,'ordinary Heavy first boss within original bounded combat time');assert(p().status!=='dead','actual Heavy first-boss survival');a.input(restRaidInput(v(),p(),a.observedShots()));a.companions?.();await new Promise(r=>setTimeout(r,25));}
 a.input({aim:0});a.stopCompanions?.();assert.equal(v().encounter,1,'actual first Raid clear');assert(p().progress.clears>=1);assert.equal(earned(),20);assert.equal(p().sp,12);const firstCombatTicks=v().combatTick-firstStartedAt;console.log(JSON.stringify({handling,actualFirstClear:true,boss:firstBoss,seconds:firstCombatTicks/HZ,earnedSP:earned()}));
 const clocks:any[]=[],seenPhases=new Set<string>(),toShop=Date.now()+90000;
 const clock=()=>{if(seenPhases.has(v().phase))return;seenPhases.add(v().phase);const seconds=v().phase==='mutationVote'?15:v().phase==='contractVote'?15:v().phase==='shop'?25:v().phase==='loading'?5:0;if(seconds){assert(v().phaseEnds-v().tick<=seconds*HZ);clocks.push({phase:v().phase,remainingTicks:v().phaseEnds-v().tick,maximumIssuedTicks:seconds*HZ});}};
 while(v().phase!=='shop'){assert(Date.now()<toShop&&v().phase!=='defeat','normal Heavy votes and shop progression');clock();if(v().phase==='mutationVote'||v().phase==='contractVote')a.vote(0);await new Promise(r=>setTimeout(r,25));}clock();
 let guide:unknown;const acquire=async()=>assert((await buy('skill',ids[handling])).ok);if(a.acquireHandling)guide=await a.acquireHandling(true,acquire);else await acquire();
 assert(p().skills.includes(ids[handling]));assert.equal(p().sp,9);assert.equal(spent(),11);assert.equal(earned(),20);assert.equal(accepted.filter(r=>r.kind==='skill').length,5);
 const toCombat=Date.now()+90000;while(v().phase!=='combat'){assert(Date.now()<toCombat&&v().phase!=='defeat','normal Heavy shop/deployment clocks');clock();await new Promise(r=>setTimeout(r,25));}
 assert(!v().run.testingModified&&!v().run.customized);await restWait(()=>p().status==='active'&&!p().kit.heavyFlakBlocked,'actual unbusy Heavy for the acquired operation');const aim=heavyOpenLane(v(),a.id).aim,ammo=p().ammo,beforeIds=new Set(ownFlak().map(s=>s.id));a.input({aim,technique1:true});
 await restWait(()=>ownFlak().some(s=>!beforeIds.has(s.id))&&(p().kit.heavyFlakUntil??0)>0,'separate actual admitted shell event plus authoritative flight view');const shell=ownFlak().find(s=>!beforeIds.has(s.id))!,id=shell.id,born=p().kit.heavyFlakShotAt!,until=p().kit.heavyFlakUntil!,recovery=p().kit.technique1At!;assert.equal(p().ammo,ammo-1);assert(until>born);
 a.pause(true);await restWait(()=>a.paused(),'actual Heavy flight pause acknowledgment');const frozenTick=v().combatTick,at={x:p().x,y:p().y};a.input({aim,technique1:true,technique2:true,reload:true,dodge:true,ultimate:true,fire:true});await new Promise(r=>setTimeout(r,140));assert.equal(v().combatTick,frozenTick);assert.equal(p().ammo,ammo-1);assert.equal(p().kit.technique1At,recovery);assert.deepEqual({x:p().x,y:p().y},at);await a.checkPausedObservers?.();
 a.pause(false);await restWait(()=>!a.paused(),'actual Heavy flight resume acknowledgment');const idle=a.input({aim});await restWait(()=>p().ack>=idle&&v().combatTick>born,'fresh idle after discarded paused operations');assert.equal(p().ammo,ammo-1);assert.equal(new Set(ownFlak().filter(s=>!beforeIds.has(s.id)).map(s=>s.id)).size,1);a.input({aim,technique2:true});
 const cues=()=>a.bursts().filter(c=>c.owner===a.id&&c.at>=born);
 let stoppedUpdate:unknown,firstPulse:FlakBurstCue|undefined;
 if(handling==='hanging'){
  await restWait(()=>ownFlak().some(s=>s.id===id&&s.vx===0&&s.vy===0)&&(p().kit.heavyFlakParkedAt??0)>0,'separate same-id actual stopped update and parked operation view');const stop=ownFlak().findLast(s=>s.id===id)!,stoppedAt=p().kit.heavyFlakParkedAt!;assert.equal(stop.vx,0);assert.equal(stop.vy,0);assert.equal(stop.expires,until);assert.equal(cues().length,0);stoppedUpdate={id:stop.id,x:stop.x,y:stop.y,vx:stop.vx,vy:stop.vy,expires:stop.expires};
  a.pause(true);await restWait(()=>a.paused(),'actual arrested-shell pause');const paused=v().combatTick;a.input({aim,technique2:true});await new Promise(r=>setTimeout(r,140));assert.equal(v().combatTick,paused);assert.equal(p().kit.heavyFlakUntil,until);assert(!a.removed(id));a.pause(false);await restWait(()=>!a.paused(),'arrested-shell resume');const after=a.input({aim});await restWait(()=>p().ack>=after&&v().combatTick>stoppedAt,'a separate later input tick before bursting the arrested shell');a.input({aim,technique2:true});
 }else{
  await restWait(()=>cues().length>=1&&(p().kit.heavyFlakRunningAt??0)>0,'actual early pulse and continued carrier');firstPulse=structuredClone(cues()[0]);assert(firstPulse.contacts.length<=1);assert(!a.removed(id));assert.equal(p().kit.heavyFlakUntil,until);await a.checkSharedBurst?.(firstPulse);a.input({aim,technique2:true});
 }
 await restWait(()=>a.removed(id)&&cues().length===(handling==='running'?2:1)&&(p().kit.heavyFlakUntil??0)===0,'separate actual carrier removal and finite final burst messages');const bursts=cues();assert(bursts.reduce((n,c)=>n+c.contacts.length,0)<=3);if(handling==='running'){assert.equal(bursts[1].at,until);assert(bursts[0].at<until);}else{assert(bursts[0].at<until);const stop=stoppedUpdate as any;assert.equal(bursts[0].x,stop.x);assert.equal(bursts[0].y,stop.y);}
 assert.equal(p().ammo,ammo-1);assert.equal(p().kit.technique1At,recovery);assert.equal(new Set(ownFlak().filter(s=>!beforeIds.has(s.id)).map(s=>s.id)).size,1);for(const cue of bursts)await a.checkSharedBurst?.(cue);a.checkOwnerStreams?.(id);await a.exit?.();
 return{passed:true,handling,pattern,ordinaryStartingSP:12,disabledAtActual12Earned:true,actualFirstBossClear:true,firstBoss,firstCombatTicks,earnedAfterActualClear:20,actualRequiredSkillPurchases:5,spentSkillSP:11,remainingSP:9,acceptedPurchases:accepted,guide,normalVotesShopDeploymentClocks:true,observedClocks:clocks,oneActualAdmittedCarrierId:id,actualRoundSpentOnce:true,originalFuse:until,originalRecovery:recovery,actualStoppedSameIdUpdate:stoppedUpdate,actualEarlyPulse:firstPulse,actualBursts:bursts,combinedActualInterceptions:bursts.reduce((n,c)=>n+c.contacts.length,0),combinedOriginalQuotaConserved:true,pauseFreezesFlightAndRecovery:true,pauseDiscardsRequests:true,actualSeparateSecondHangingCommand:handling==='hanging',oneCastCountDespiteStopUpdate:true,spentRecoveryRetained:true,noCheckpointOrBudgetHealthPositionInjection:true,limits:['Actual ordinary first-clear acquisition and input. The test-only steering policy projects observed current velocities as fallible guesses; actual authoritative burst contact marks supply the interception counts.','One acquired case does not establish human balance, rendered UI, device/language/listening/motion or whole-class completion.']};
}
