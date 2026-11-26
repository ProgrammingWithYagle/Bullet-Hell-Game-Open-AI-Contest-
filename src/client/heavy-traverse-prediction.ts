import {
  traverseIds,
  clutchId,
  keyedId,
  openId,
  heavyTraverseRules as rules,
} from "../shared/heavy-traverse.ts";
import { HZ, type InputFrame } from "../shared/protocol.ts";
import type { PlayerView } from "../shared/view.ts";
/** Predict only movement from known feed/paid recoil. Never invent a future shot or payment. */
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
  let k = p.kit;
  const mode = k.heavyTraverseMode,
    active = (k.heavyTraverseUntil ?? 0) > now,
    hasClutch = p.skills.includes(clutchId);
  const cancel =
    now < p.reloadAt ||
    now < p.dashUntil ||
    now < p.overdriveUntil ||
    i.reload ||
    i.dodge ||
    i.ultimate ||
    (!!k.heavyClutchUsed && !hasClutch) ||
    (!!k.heavyClutchHandling && !p.skills.includes(k.heavyClutchHandling)) ||
    (i.technique1 &&
      i.sequence > (k.heavyTraverseSequence ?? Infinity) &&
      now > (k.heavyTraverseBornAt ?? Infinity));
  const displaced =
    mode === "spade" &&
    !k.heavyClutchLifted &&
    Math.hypot(
      p.x - (k.heavyTraversePostX ?? p.x),
      p.y - (k.heavyTraversePostY ?? p.y),
    ) > 1e-4;
  if (active && (cancel || displaced)) p.kit = { ...k, heavyTraverseUntil: 0 };
  else if (active) {
    const fresh =
      hasClutch &&
      i.technique2 &&
      !i.technique1 &&
      now > (k.heavyTraverseBornAt ?? Infinity) &&
      i.sequence > (k.heavyTraverseSequence ?? Infinity) &&
      i.sequence > (k.heavyClutchSequence ?? 0) &&
      now > (k.heavyClutchAt ?? 0);
    if (
      fresh &&
      (!k.heavyClutchUsed ||
        (k.heavyClutchLifted &&
          (mode !== "spade" || Math.hypot(i.moveX, i.moveY) <= 1e-6)))
    ) {
      const lifting = !k.heavyClutchUsed;
      p.kit = k = {
        ...k,
        heavyClutchUsed: true,
        heavyClutchHandling: lifting
          ? p.skills.includes(keyedId)
            ? keyedId
            : p.skills.includes(openId)
              ? openId
              : undefined
          : k.heavyClutchHandling,
        heavyClutchLifted: lifting,
        heavyClutchAt: now,
        heavyClutchSequence: i.sequence,
        ...(!lifting && mode === "spade"
          ? { heavyTraversePostX: p.x, heavyTraversePostY: p.y }
          : {}),
      };
    }
    if (mode !== "floating" && !k.heavyClutchLifted) out.walk = 0;
  }
  const shotAt = k.heavyTraverseShotAt ?? 0,
    shotMode = k.heavyTraverseShotMode;
  if (
    shotAt > 0 &&
    now > shotAt &&
    now <= shotAt + rules.recoilTicks &&
    (!k.heavyTraverseShotRequiresClutch || hasClutch) &&
    (!k.heavyTraverseShotRequiresHandling ||
      p.skills.includes(k.heavyTraverseShotRequiresHandling)) &&
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
    !p.kit.heavyClutchLifted &&
    Math.hypot(
      p.x - (p.kit.heavyTraversePostX ?? p.x),
      p.y - (p.kit.heavyTraversePostY ?? p.y),
    ) > 1e-4
  )
    p.kit = { ...p.kit, heavyTraverseUntil: 0 };
}
