import{SniperFieldRest,type RestPoint,type RestPose,type RestRules}from './soldier-sniper-rest.mts';
import{SniperWithdrawal,type WithdrawalRules}from './soldier-sniper-withdrawal.mts';
export type RestTake={point:RestPoint;other?:RestPoint};
/** Compose two issued empty-site controllers; a sole surviving point keeps every original field. */
export class SniperPositions{
 private slots:[SniperFieldRest,SniperFieldRest];private plan:SniperWithdrawal;
 constructor(readonly rules:RestRules,readonly withdrawal:WithdrawalRules){this.slots=[new SniperFieldRest(rules),new SniperFieldRest(rules)];this.plan=new SniperWithdrawal(withdrawal);}
 clear(){for(const s of this.slots)s.clear();this.plan.clear();}
 owners(){return [...new Set(this.slots.flatMap(s=>s.owners()))];}
 all(owner:string){return this.slots.map(s=>s.get(owner)).filter((q):q is RestPoint=>!!q);}
 get(owner:string){return this.all(owner)[0];}
 remove(owner:string){for(const s of this.slots)s.remove(owner);this.plan.remove(owner);}
 cancelSetup(owner:string){for(const s of this.slots)s.cancelSetup(owner);}
 abandonPaid(owner:string){this.cancelSetup(owner);this.plan.abandonPaid(owner);}
 react(owner:string,input:Parameters<SniperFieldRest['react']>[1]){for(const s of this.slots)s.react(owner,input);}
 blocksPrimary(owner:string){return this.slots.some(s=>s.blocksPrimary(owner));}
 private matching(p:RestPose,now:number){return this.slots.find(s=>s.canClaim(p,now));}
 fallback(p:RestPose,now:number,paired:boolean){return this.plan.available(p,this.matching(p,now)?.get(p.id),now,paired);}
 take(p:RestPose,now:number):RestTake|undefined{const slot=this.matching(p,now),point=slot?.get(p.id);if(!slot||!point)return;const other=this.all(p.id).find(q=>q.cueId!==point.cueId);if(!slot.consume(p,now))return;return{point,other};}
 consumeFallback(owner:string){return this.plan.consume(owner);}
 normalClaim(p:RestPose,preparation:number,take:RestTake|undefined,now:number,recoveryAt:number,paired:boolean){if(!take?.other)return false;return this.plan.normalClaim(p,preparation,take.point,take.other,now,recoveryAt,paired);}
 released(p:RestPose,preparation:number,now:number){const id=this.plan.remainingId(p.id),other=this.all(p.id).find(q=>q.cueId===id);return this.plan.released(p,preparation,other,now);}
 canPlaceSecond(p:RestPose,paired:boolean){const all=this.all(p.id);return paired&&!this.plan.has(p.id)&&all.length===1&&!all[0].setting&&Math.hypot(p.x-all[0].x,p.y-all[0].y)>=this.withdrawal.minimumDistance;}
 operate(p:RestPose,now:number,cueId:()=>number,fireLatch:boolean,paired:boolean){const all=this.all(p.id);if(!all.length){this.slots[0].place(p,now,cueId(),fireLatch);return'place' as const;}if(this.canPlaceSecond(p,paired)){this.slots.find(s=>!s.get(p.id))!.place(p,now,cueId(),fireLatch);return'second' as const;}this.remove(p.id);return'recall' as const;}
 sync(p:RestPose|undefined,owner:string,now:number,valid:boolean,canSettle:boolean,paired:boolean){
  for(const s of this.slots)s.sync(p,owner,now,valid,canSettle);let all=this.all(owner);
  if(!paired){const keep=all.toSorted((a,b)=>a.at-b.at||a.cueId-b.cueId)[0];for(const s of this.slots){const point=s.get(owner);if(point&&point.cueId!==keep?.cueId)s.remove(owner);}this.plan.remove(owner);all=this.all(owner);}
  const remaining=this.plan.remainingId(owner);this.plan.sync(owner,p?.weapon,all.find(q=>q.cueId===remaining),now,valid&&paired);
  return p?all.toSorted((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0]:undefined;
 }
 status(owner:string){return{count:this.all(owner).length,fallbackUntil:this.plan.armedUntil(owner)};}
}
