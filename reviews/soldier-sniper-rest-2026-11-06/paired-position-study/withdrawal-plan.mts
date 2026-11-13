export type Site={owner:string;id:number;weapon:string;x:number;y:number;aim:number;readyAt:number;until:number};
type Receipt={preparation:number;site:number;weapon:string;until:number};
/** Prototype of finite plan rights only; it does not pay, shoot, move or mutate a Game. */
export class WithdrawalPlan{
 private pending=new Map<string,Receipt>();private armed=new Map<string,Receipt>();
 canPlaceSecond(owner:string){return !this.pending.has(owner)&&!this.armed.has(owner);}
 normalClaim(owner:string,weapon:string,preparation:number,first:Site,other:Site,now:number,recoveryAt:number){
  if(!this.canPlaceSecond(owner)||recoveryAt>now||first.owner!==owner||other.owner!==owner||first.id===other.id||first.weapon!==weapon||other.weapon!==weapon||first.readyAt>now||other.readyAt>now||first.until<=now||other.until<=now||Math.hypot(first.x-other.x,first.y-other.y)<96)return false;
  this.pending.set(owner,{preparation,site:other.id,weapon,until:other.until});return true;
 }
 released(owner:string,weapon:string,preparation:number,other:Site|undefined,now:number,actualShotAccepted:boolean){
  const q=this.pending.get(owner);if(!q||q.preparation!==preparation||!actualShotAccepted)return false;
  this.pending.delete(owner);if(!other||q.weapon!==weapon||other.weapon!==weapon||other.owner!==owner||other.id!==q.site||other.until!==q.until||now>=q.until||now<other.readyAt)return false;
  this.armed.set(owner,q);return true;
 }
 available(owner:string,weapon:string,site:Site|undefined,pose:{x:number;y:number;aim:number},now:number,owned:boolean){const q=this.armed.get(owner);return !!q&&owned&&!!site&&site.owner===owner&&q.site===site.id&&q.weapon===weapon&&site.weapon===weapon&&q.until===site.until&&now<q.until&&now>=site.readyAt&&Math.hypot(pose.x-site.x,pose.y-site.y)<=6&&Math.abs(Math.atan2(Math.sin(pose.aim-site.aim),Math.cos(pose.aim-site.aim)))<=Math.PI/15;}
 consume(owner:string,accepted:boolean){if(!accepted||!this.armed.has(owner))return false;this.armed.delete(owner);return true;}
 abandonPaid(owner:string){this.pending.delete(owner);}
 recall(owner:string){this.pending.delete(owner);this.armed.delete(owner);}
 sync(owner:string,weapon:string,site:Site|undefined,now:number,owned:boolean){for(const map of[this.pending,this.armed]){const q=map.get(owner);if(q&&(!owned||q.weapon!==weapon||!site||site.id!==q.site||site.owner!==owner||site.weapon!==weapon||site.until!==q.until||now>=q.until))map.delete(owner);}}
}
