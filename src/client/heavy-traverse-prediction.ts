import {
  traverseIds,
  heavyTraverseRules as rules,
} from "../shared/heavy-traverse.ts";
import { HZ, type InputFrame } from "../shared/protocol.ts";
import type { PlayerView } from "../shared/view.ts";
/** Only known authoritative feed/paid recoil is predicted; never invent a shot, cost or future slot. */
export function traversePredictedMotion(
  p: PlayerView,
  i: InputFrame,
  now: number,
) {
  const out = { walk: 1, x: 0, y: 0 };
  if (
    p.classId !== "heavy" ||
    !p.skills.includes(traverseIds.entry) ||
    p.status !== "active"
  )
    return out;
  const k = p.kit,
    mode = k.heavyTraverseMode,
    active = (k.heavyTraverseUntil ?? 0) > now;
  const cancel =
    now < p.reloadAt ||
    now < p.dashUntil ||
    now < p.overdriveUntil ||
    i.reload ||
    i.dodge ||
    i.ultimate ||
    (i.technique1 &&
      i.sequence > (k.heavyTraverseSequence ?? Infinity) &&
      now > (k.heavyTraverseBornAt ?? Infinity));
  const displaced =
    mode === "spade" &&
    Math.hypot(
      p.x - (k.heavyTraversePostX ?? p.x),
      p.y - (k.heavyTraversePostY ?? p.y),
    ) > 1e-4;
  if (active && (cancel || displaced)) p.kit = { ...k, heavyTraverseUntil: 0 };
  else if (active && mode !== "floating") out.walk = 0;
  const shotAt = k.heavyTraverseShotAt ?? 0,
    shotMode = k.heavyTraverseShotMode;
  if (
    shotAt > 0 &&
    now > shotAt &&
    now <= shotAt + rules.recoilTicks &&
    shotMode !== "spade" &&
    (shotMode === "loose" ||
      (shotMode === "floating" && p.skills.includes(traverseIds.floating)))
  ) {
    const speed = (rules.recoilDistance * HZ) / rules.recoilTicks,
      aim = k.heavyTraverseShotAim ?? p.aim;
    out.x = -Math.cos(aim) * speed;
    out.y = -Math.sin(aim) * speed;
  }
  return out;
}
export function traversePredictedAfterMove(p: PlayerView) {
  if (
    p.classId === "heavy" &&
    p.skills.includes(traverseIds.entry) &&
    p.kit.heavyTraverseMode === "spade" &&
    Math.hypot(
      p.x - (p.kit.heavyTraversePostX ?? p.x),
      p.y - (p.kit.heavyTraversePostY ?? p.y),
    ) > 1e-4
  )
    p.kit = { ...p.kit, heavyTraverseUntil: 0 };
}
