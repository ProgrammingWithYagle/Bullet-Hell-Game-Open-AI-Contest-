import type { PlayerView } from '../shared/view.ts';
import { traverseIds, clutchId, lanyardId } from '../shared/heavy-traverse.ts';
export type PostBState = { kind: 'idle' | 'lift' | 'engage' | 'post' | 'posted' | 'spent'; remaining: number; blocked: boolean };
/** Owned operation state only; the guide/HUD provide localized action labels. */
export function postedBState(p: PlayerView, now: number): PostBState | undefined {
  if (p.classId !== 'heavy' || ![traverseIds.entry, clutchId, lanyardId].every(id => p.skills.includes(id))) return;
  const k = p.kit, remaining = Math.max(0, k.heavyClutchSlotsRemaining ?? 0), blocked = k.heavyClutchBlocked ?? true;
  if ((k.heavyLanyardAt ?? 0) > 0 && (k.heavyLanyardUntil ?? 0) > now) return { kind: 'posted', remaining, blocked: true };
  if ((k.heavyTraverseUntil ?? 0) <= now) return { kind: 'idle', remaining: 0, blocked: true };
  if (k.heavyClutchLifted) return { kind: 'engage', remaining, blocked };
  if (!k.heavyClutchUsed) return { kind: 'lift', remaining, blocked };
  return remaining >= 2 && !blocked ? { kind: 'post', remaining, blocked: false } : { kind: 'spent', remaining, blocked: true };
}
