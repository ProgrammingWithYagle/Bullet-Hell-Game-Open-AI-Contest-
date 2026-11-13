import {HZ,type Shot,type Vec}from'../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/protocol.ts';
import type{Player,Stats}from'../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/game.ts';
export const traverseIds={entry:'heavy-traverse-1',spade:'heavy-traverse-spade-1',floating:'heavy-traverse-floating-1'}as const;
export const studyRules={rounds:4,intervalTicks:10,deadlineTicks:31,cooldown:8,damage:45,speed:1050,radius:4,lifeSeconds:1,recoilDistance:8,recoilTicks:4,halfArc:Math.PI/3,turnPerSecond:2.4};
type Mode='loose'|'spade'|'floating';
type Owner=Pick<Player,'id'|'classId'|'skills'|'connected'|'status'|'health'|'weapon'|'ammo'|'aim'|'x'|'y'|'reloadAt'|'dashUntil'|'channelUntil'|'overdriveUntil'|'input'>;
type Stroke={owner:string;weapon:string;mode:Mode;born:number;until:number;next:number;bornSequence:number;fired:number;initialAim:number;aim:number;turnedAt:number;post:Vec};
type Flight={id:number;owner:string;weapon:string;mode:Mode;until:number};
type Impulse={owner:string;weapon:string;mode:Mode;at:number;until:number;aim:number};
type Action={castAt?:number;shotAt?:number;shotAim?:number;handledSequence?:number;handledAt?:number};
export type TraverseContext={tick:number;stats(p:Owner):Pick<Stats,'damage'|'cooldown'>;canEmit():boolean;shoot(p:Owner,aim:number,damage:number,speed:number,radius:number,lifeSeconds:number):Shot|undefined;sound(p:Owner,id:string):void};
export type FlightAuthority={players:readonly Owner[];tick:number;shot(id:number):Shot|undefined;remove(s:Shot):void};
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a)),delta=(from:number,to:number)=>angle(to-from),clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const owned=(p:Owner|undefined):p is Owner=>!!p&&p.classId==='heavy'&&p.skills.includes(traverseIds.entry),live=(p:Owner|undefined):p is Owner=>owned(p)&&p.connected&&p.status==='active'&&p.health>0;

/** Unregistered controller study. The caller supplies actual fixed-step movement and projectile authority. */
export class TraverseCandidate{
 private recovery=new Map<string,number>();private strokes=new Map<string,Stroke>();private flights=new Map<number,Flight>();private impulses:Impulse[]=[];private actions=new Map<string,Action>();
 constructor(readonly rules=studyRules){if(!Number.isInteger(rules.rounds)||rules.rounds<1||!Number.isInteger(rules.intervalTicks)||rules.intervalTicks<1||rules.deadlineTicks<=(rules.rounds-1)*rules.intervalTicks||rules.recoilTicks<1)throw Error('invalid study stroke');}
 private mode(p:Owner):Mode{return p.skills.includes(traverseIds.spade)?'spade':p.skills.includes(traverseIds.floating)?'floating':'loose';}
 private valid(p:Owner|undefined,work:{weapon:string;mode:Mode}):p is Owner{return live(p)&&p.weapon===work.weapon&&(work.mode==='loose'||p.skills.includes(traverseIds[work.mode]));}
 private busy(p:Owner,now:number){return!live(p)||p.reloadAt>now||p.dashUntil>now||p.channelUntil>now||p.overdriveUntil>now;}
 private interrupt(p:Owner,now:number){return this.busy(p,now)||p.input.reload||p.input.dodge||p.input.ultimate;}
 private releaseFeed(owner:string){this.strokes.delete(owner);}
 private slew(p:Owner,s:Stroke,now:number){if(now<=s.turnedAt)return;if(s.mode!=='floating'){const goal=s.initialAim+clamp(delta(s.initialAim,p.aim),-this.rules.halfArc,this.rules.halfArc),step=this.rules.turnPerSecond/HZ;s.aim=angle(s.aim+clamp(delta(s.aim,goal),-step,step));}s.turnedAt=now;}
 /** Call before ordinary movement. Fresh C cancels the feed so manual walking can resume that same step. */
 beforeMove(p:Owner,c:TraverseContext){const s=this.strokes.get(p.id);if(s){if(!this.valid(p,s)||this.interrupt(p,c.tick)||c.tick>=s.until)this.releaseFeed(p.id);else if(p.input.technique1&&p.input.sequence>s.bornSequence&&c.tick>s.born){this.releaseFeed(p.id);this.actions.set(p.id,{...this.actions.get(p.id),handledSequence:p.input.sequence,handledAt:c.tick});c.sound(p,'heavy-traverse-release');}else this.slew(p,s,c.tick);}this.impulses=this.impulses.filter(i=>i.until>=c.tick);}
 walkFactor(owner:string){const s=this.strokes.get(owner);return s&&s.mode!=='floating'?0:1;}
 /** Velocity from paid shots begins on the following combat step; ordinary body collision remains the caller's responsibility. */
 recoil(p:Owner,now:number):Vec{const v={x:0,y:0},speed=this.rules.recoilDistance*HZ/this.rules.recoilTicks;for(const i of this.impulses)if(i.owner===p.id&&i.at<now&&i.until>=now&&this.valid(p,i)){v.x-=Math.cos(i.aim)*speed;v.y-=Math.sin(i.aim)*speed;}return v;}
 private emit(p:Owner,s:Stroke,c:TraverseContext){if(this.interrupt(p,c.tick)||p.ammo<1||!c.canEmit())return false;const shot=c.shoot(p,s.aim,this.rules.damage*c.stats(p).damage,this.rules.speed,this.rules.radius,this.rules.lifeSeconds);if(!shot)return false;p.ammo--;s.fired++;this.flights.set(shot.id,{id:shot.id,owner:p.id,weapon:p.weapon,mode:s.mode,until:shot.expires});if(s.mode!=='spade')this.impulses.push({owner:p.id,weapon:p.weapon,mode:s.mode,at:c.tick,until:c.tick+this.rules.recoilTicks,aim:s.aim});this.actions.set(p.id,{...this.actions.get(p.id),shotAt:c.tick,shotAim:s.aim});c.sound(p,'heavy-traverse-shot');return true;}
 cast(p:Owner,c:TraverseContext){const a=this.actions.get(p.id);if(a?.handledAt===c.tick&&a.handledSequence===p.input.sequence)return false;const existing=this.strokes.get(p.id);if(existing){if(c.tick<=existing.born||p.input.sequence<=existing.bornSequence)return false;this.releaseFeed(p.id);this.actions.set(p.id,{...a,handledAt:c.tick,handledSequence:p.input.sequence});c.sound(p,'heavy-traverse-release');return true;}
  if(this.interrupt(p,c.tick)||c.tick<(this.recovery.get(p.id)??0)||p.ammo<1||!c.canEmit()||(this.mode(p)==='spade'&&Math.hypot(p.input.moveX,p.input.moveY)>1e-6))return false;
  const s:Stroke={owner:p.id,weapon:p.weapon,mode:this.mode(p),born:c.tick,until:c.tick+this.rules.deadlineTicks,next:c.tick+this.rules.intervalTicks,bornSequence:p.input.sequence,fired:0,initialAim:p.aim,aim:p.aim,turnedAt:c.tick,post:{x:p.x,y:p.y}};if(!this.emit(p,s,c))return false;this.recovery.set(p.id,c.tick+Math.ceil(this.rules.cooldown*c.stats(p).cooldown*HZ));this.actions.set(p.id,{...this.actions.get(p.id),castAt:c.tick});if(s.fired<this.rules.rounds)this.strokes.set(p.id,s);return true;
 }
 /** Call after actual movement and Q/E input, before ordinary primary. A missed schedule is never caught up. */
 advance(p:Owner,c:TraverseContext){const s=this.strokes.get(p.id);if(!s)return;this.slew(p,s,c.tick);if(!this.valid(p,s)||this.interrupt(p,c.tick)||c.tick>=s.until||(s.mode==='spade'&&Math.hypot(p.x-s.post.x,p.y-s.post.y)>1e-4)){this.releaseFeed(p.id);return;}if(c.tick<s.next)return;if(c.tick!==s.next||!this.emit(p,s,c)){this.releaseFeed(p.id);return;}s.next+=this.rules.intervalTicks;if(s.fired>=this.rules.rounds)this.releaseFeed(p.id);}
 blocksPrimary(owner:string,now:number){return this.strokes.has(owner)||this.actions.get(owner)?.shotAt===now;}
 status(p:Owner,now:number){const s=this.strokes.get(p.id),a=this.actions.get(p.id);return{technique1At:this.recovery.get(p.id)??0,heavyTraverseUntil:s?.until??0,heavyTraverseNextAt:s?.next??0,heavyTraverseRounds:s?.fired??0,heavyTraverseAim:s?.aim??a?.shotAim??p.aim,heavyTraverseMode:s?.mode??this.mode(p),heavyTraverseCastAt:a?.castAt??0,heavyTraverseShotAt:a?.shotAt??0,heavyTraverseShotAim:a?.shotAim??0,heavyTraverseBlocked:!!s?false:this.interrupt(p,now)||p.ammo<1};}
 forget(id:number){this.flights.delete(id);}
 /** Read/cancel actual admitted flights by id and owner, never by a retained pooled Shot reference. */
 reconcile(c:FlightAuthority){for(const[owner,s]of this.strokes){const p=c.players.find(p=>p.id===owner);if(!this.valid(p,s))this.releaseFeed(owner);}this.impulses=this.impulses.filter(i=>i.until>=c.tick&&this.valid(c.players.find(p=>p.id===i.owner),i));for(const[id,f]of this.flights){const p=c.players.find(p=>p.id===f.owner),shot=c.shot(id);if(!shot||shot.owner!==f.owner){this.flights.delete(id);continue;}if(!this.valid(p,f)){this.flights.delete(id);c.remove(shot);}}}
 cancelOwner(owner:string,c:{shot(id:number):Shot|undefined;remove(s:Shot):void}){this.releaseFeed(owner);this.impulses=this.impulses.filter(i=>i.owner!==owner);for(const[id,f]of this.flights)if(f.owner===owner){const shot=c.shot(id);this.flights.delete(id);if(shot?.owner===owner)c.remove(shot);}}
 clear(){this.recovery.clear();this.strokes.clear();this.flights.clear();this.impulses=[];this.actions.clear();}
}
