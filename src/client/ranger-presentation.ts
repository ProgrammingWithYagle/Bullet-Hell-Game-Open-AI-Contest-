import type { RangerCue } from "../shared/ranger-kit.ts";
import type { PlayerView, View } from "../shared/view.ts";
import rules from "../shared/ranger-rules.json";
import { hasTalent } from "../shared/class-talents.ts";
export function rangerCommitBlocked(p: PlayerView, slot: string, now: number) {
  if (p.classId !== "ranger" || !["q", "e", "ultimate"].includes(slot))
    return false;
  if (now < p.dashUntil || now < (p.kit.rangerDrawUntil ?? 0)) return true;
  if (slot === "q")
    return p.reloadAt > now || p.ammo < (hasTalent(p, "crosswind") ? 3 : 1);
  return (
    slot === "e" && (p.kit.rangerTraps ?? 0) >= (p.kit.rangerTrapCapacity ?? 2)
  );
}
export function rangerAttackCue(p: PlayerView, view: View, now: number) {
  if (
    p.classId !== "ranger" ||
    p.status !== "active" ||
    view.phase !== "combat" ||
    now < p.dashUntil
  )
    return undefined;
  return view.classCues
    .filter(
      (c): c is RangerCue =>
        c.owner === p.id &&
        (c.kind === "ranger-draw" || c.kind === "ranger-release") &&
        now < c.until,
    )
    .sort((a, b) => b.id - a.id)[0];
}
export function rangerAttackFrame(c: RangerCue, now: number, reduced = false) {
  if (c.kind === "ranger-release") return 3;
  if (reduced) return 2;
  const duration = c.training ? rules.lineDrawTicks : rules.primaryDrawTicks;
  return Math.min(2, Math.floor((Math.max(0, now - c.at) * 3) / duration));
}
/** The acknowledged speed already contains its draw penalty; do not apply it twice. */
export function rangerPredictedSpeed(p: PlayerView, now: number) {
  if (p.classId !== "ranger") return p.speed;
  const scale = p.kit.rangerDrawMovement ?? 1;
  return (p.speed / scale) * (now < (p.kit.rangerDrawUntil ?? 0) ? scale : 1);
}
export function cancelPredictedRangerDraw(p: PlayerView) {
  if (p.classId !== "ranger") return;
  p.speed /= p.kit.rangerDrawMovement ?? 1;
  p.kit = {
    ...p.kit,
    rangerDrawUntil: 0,
    rangerDrawId: 0,
    rangerDrawMovement: 1,
  };
}
export type RangerGraphics = {
  lineStyle(width: number, color: number, alpha?: number): RangerGraphics;
  lineBetween(x1: number, y1: number, x2: number, y2: number): RangerGraphics;
  fillStyle(color: number, alpha?: number): RangerGraphics;
  fillCircle(x: number, y: number, radius: number): RangerGraphics;
  strokeCircle(x: number, y: number, radius: number): RangerGraphics;
};
export function drawRangerCue(
  g: RangerGraphics,
  c: RangerCue,
  now: number,
  owner: string,
) {
  if (now >= c.until) return;
  const own = c.owner === owner,
    color = own ? 0xb6d2a7 : 0x829e99,
    alpha = own ? 0.8 : 0.3;
  if (c.kind === "ranger-draw") {
    g.lineStyle(1, color, alpha * 0.45).lineBetween(
      c.x + Math.cos(c.aim) * 16,
      c.y + Math.sin(c.aim) * 16,
      c.x + Math.cos(c.aim) * 72,
      c.y + Math.sin(c.aim) * 72,
    );
    return;
  }
  if (c.kind === "ranger-release") return;
  if (c.kind === "ranger-trap") {
    if (c.active)
      g.lineStyle(2, color, alpha).lineBetween(c.x, c.y, c.x2, c.y2);
    else
      for (let i = 0; i < 12; i += 2)
        g.lineStyle(1, color, alpha * 0.55).lineBetween(
          c.x + ((c.x2 - c.x) * i) / 12,
          c.y + ((c.y2 - c.y) * i) / 12,
          c.x + ((c.x2 - c.x) * (i + 1)) / 12,
          c.y + ((c.y2 - c.y) * (i + 1)) / 12,
        );
    for (const p of [
      { x: c.x, y: c.y },
      { x: c.x2, y: c.y2 },
    ])
      g.lineStyle(2, color, alpha).strokeCircle(p.x, p.y, 4);
    if (c.remaining > 1)
      for (let i = 0; i < c.remaining; i++)
        g.fillStyle(color, alpha).fillCircle(
          (c.x + c.x2) / 2 + (i - (c.remaining - 1) / 2) * 5,
          (c.y + c.y2) / 2 - 7,
          1.5,
        );
    return;
  }
  g.lineStyle(
    c.active ? 2 : 1,
    color,
    c.active ? alpha : alpha * 0.25,
  ).strokeCircle(c.x, c.y, c.radius);
  g.lineStyle(1, color, alpha * 0.5)
    .lineBetween(c.x - 5, c.y, c.x + 5, c.y)
    .lineBetween(c.x, c.y - 5, c.x, c.y + 5);
  for (let i = 0; i < c.remaining; i++)
    g.fillStyle(color, alpha).fillCircle(
      c.x + (i - (c.remaining - 1) / 2) * 7,
      c.y - c.radius - 6,
      2,
    );
}
