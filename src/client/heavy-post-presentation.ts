import type { PlayerView } from "../shared/view.ts";
import { lanyardId, traverseIds as ids, clutchId, heavyTraverseRules as rules, tetherRadius } from "../shared/heavy-traverse.ts";
type Point = { x: number; y: number };
type PostKit = PlayerView['kit'] & { heavyLanyardAt?: number; heavyLanyardUntil?: number; heavyLanyardX?: number; heavyLanyardY?: number; heavyTraverseShotPosted?: boolean; heavyTraverseShotX?: number; heavyTraverseShotY?: number };
type PostPlayer = Omit<PlayerView, 'kit'> & { kit: PostKit };
export type PostFrame = { owner: string; origin: Point; body: Point; bearing: number; firing: boolean; handsFreeBody: true; localControlLine?: readonly [Point, Point] };
/** Values for an actual posted weapon and body-art override, never a projectile path or future firing prediction. */
export function postFrame(p: PostPlayer, phase: string, now: number, localId: string): PostFrame | undefined {
  const k = p.kit, at = k.heavyLanyardAt ?? 0, until = k.heavyLanyardUntil ?? 0;
  if (p.classId !== 'heavy' || p.status !== 'active' || !p.connected || p.health <= 0 || phase !== 'combat' || ![ids.entry, clutchId, lanyardId].every(id => p.skills.includes(id)) || !Number.isFinite(now) || at <= 0 || at > now || until <= now || until - now > rules.deadlineTicks || ![p.x, p.y, k.heavyLanyardX, k.heavyLanyardY, k.heavyTraverseAim].every(Number.isFinite)) return;
  if (k.heavyTraverseMode === 'spade' && !p.skills.includes(ids.spade) || k.heavyTraverseMode === 'floating' && !p.skills.includes(ids.floating) || k.heavyClutchHandling && !p.skills.includes(k.heavyClutchHandling)) return;
  const origin = { x: k.heavyLanyardX!, y: k.heavyLanyardY! }, body = { x: p.x, y: p.y }, firing = k.heavyTraverseShotPosted === true && k.heavyTraverseShotAt === now && k.heavyTraverseShotX === origin.x && k.heavyTraverseShotY === origin.y;
  const liveWork = (k.heavyTraverseUntil ?? 0) > now;
  if (!liveWork && !(firing && until === now + 1)) return;
  if (Math.hypot(body.x - origin.x, body.y - origin.y) > tetherRadius + 1e-6) return;
  return { owner: p.id, origin, body, bearing: k.heavyTraverseAim!, firing, handsFreeBody: true, ...(p.id === localId ? { localControlLine: [{ ...body }, { ...origin }] as const } : {}) };
}
