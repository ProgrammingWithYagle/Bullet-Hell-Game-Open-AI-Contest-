import { traversePredictedMotion as issuedMotion, traversePredictedAfterMove as issuedAfterMove } from "./heavy-traverse-prediction.ts";
import type { PlayerView } from "../shared/view.ts";
import type { InputFrame } from "../shared/protocol.ts";
import { segmentRect, type Rect } from "../shared/geometry.ts";
import { lanyardId, traverseIds as ids, clutchId, tetherRadius, heavyTraverseRules as rules } from "../shared/heavy-traverse.ts";
type Kit = PlayerView['kit'] & { heavyLanyardAt?: number; heavyLanyardSequence?: number; heavyLanyardUntil?: number; heavyLanyardX?: number; heavyLanyardY?: number; heavyTraverseShotPosted?: boolean };
type Actor = Omit<PlayerView, 'kit'> & { kit: Kit };
type Context = { obstacles: readonly Rect[] };
const knownPost = (k: Kit, now: number) => (k.heavyLanyardAt ?? 0) > 0 && k.heavyLanyardAt! <= now && (k.heavyLanyardUntil ?? 0) > now;
const owned = (p: Actor) => [ids.entry, clutchId, lanyardId].every(id => p.skills.includes(id)) && (p.kit.heavyTraverseMode !== 'spade' || p.skills.includes(ids.spade)) && (p.kit.heavyTraverseMode !== 'floating' || p.skills.includes(ids.floating));
const pathClear = (a: {x:number;y:number}, b: {x:number;y:number}, c: Context) => !c.obstacles.some(w => segmentRect(a, b, w, 1) !== null);
const intact = (p: Actor, c: Context) => owned(p) && [p.kit.heavyLanyardX, p.kit.heavyLanyardY].every(Number.isFinite) && Math.hypot(p.x-p.kit.heavyLanyardX!,p.y-p.kit.heavyLanyardY!) <= tetherRadius && pathClear({x:p.kit.heavyLanyardX!,y:p.kit.heavyLanyardY!},p,c);
const clear = (k: Kit): Kit => ({...k,heavyTraverseUntil:0,heavyLanyardAt:0,heavyLanyardUntil:0});
/** Use issued motion for everything except known post walking/constraints and one proposed owned third command. Never predict a shot/payment. */
export function traversePredictedMotion(p: Actor, i: InputFrame, now: number, c: Context) {
  const original = p.kit, hadPost = knownPost(original,now), active = (original.heavyTraverseUntil??0)>now;
  if(!hadPost && !(active && p.skills.includes(lanyardId)) && !original.heavyTraverseShotPosted)return issuedMotion(p,i,now);
  const modeled: Actor = {...p,kit:{...original,...(hadPost?{heavyTraversePostX:p.x,heavyTraversePostY:p.y}:{})}};
  const out = issuedMotion(modeled,i,now);
  let k: Kit = {...modeled.kit,...(hadPost?{heavyTraversePostX:original.heavyTraversePostX,heavyTraversePostY:original.heavyTraversePostY}:{})};
  if(hadPost && (!intact(p,c)||(k.heavyTraverseUntil??0)<=now))k=clear(k);
  const last = (k.heavyTraverseBornAt??-Infinity)+(rules.rounds-1)*rules.intervalTicks;
  const remainingTimes = Math.max(0,Math.floor((last-Math.max(now,k.heavyTraverseNextAt??Infinity))/rules.intervalTicks)+1);
  const fresh = active && (k.heavyTraverseUntil??0)>now && !hadPost && owned({...p,kit:k}) && i.technique2 && !i.technique1 && k.heavyClutchUsed && !k.heavyClutchLifted && now>(k.heavyClutchAt??Infinity) && now>(k.heavyTraverseBornAt??Infinity) && i.sequence>(k.heavyClutchSequence??Infinity) && i.sequence>(k.heavyTraverseSequence??Infinity) && Math.min(k.heavyClutchSlotsRemaining??0,remainingTimes)>=2 && pathClear(p,p,c);
  if(fresh)k={...k,heavyLanyardAt:now,heavyLanyardSequence:i.sequence,heavyLanyardUntil:k.heavyTraverseUntil,heavyLanyardX:p.x,heavyLanyardY:p.y};
  if(knownPost(k,now) && i.q && now>=p.qAt)k=clear(k);
  if(hadPost || fresh || knownPost(k,now))out.walk=1;
  if(original.heavyTraverseShotPosted && !p.skills.includes(lanyardId)){out.x=0;out.y=0;}
  p.kit=k;
  return out;
}
export function traversePredictedAfterMove(p: Actor, c: Context, now: number) {
  const original=p.kit,posted=knownPost(original,now);
  if(!posted){issuedAfterMove(p);return;}
  const modeled: Actor={...p,kit:{...original,heavyTraversePostX:p.x,heavyTraversePostY:p.y}};
  issuedAfterMove(modeled);
  p.kit=intact(p,c)?{...modeled.kit,heavyTraversePostX:original.heavyTraversePostX,heavyTraversePostY:original.heavyTraversePostY}:clear(original);
}
