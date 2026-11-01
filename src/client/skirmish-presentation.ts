import type { View, PlayerView } from "../shared/view.ts";
import type { SkirmishView } from "../shared/ward-skirmish.ts";
type Graphics = {
  lineStyle(width: number, color: number, alpha: number): Graphics;
  strokeCircle(x: number, y: number, radius: number): Graphics;
  lineBetween(x1: number, y1: number, x2: number, y2: number): Graphics;
};
export function drawSkirmishWarnings(
  graphics: Graphics,
  objective: SkirmishView | undefined,
  phase: string,
  now: number,
) {
  if (!objective || phase !== "combat") return;
  for (const portal of objective.portals) {
    const remaining = Math.max(0, Math.min(1, (portal.at - now) / 75));
    graphics
      .lineStyle(3, 0xe3c18c, 0.95)
      .strokeCircle(portal.x, portal.y, 20 + 14 * remaining);
    graphics
      .lineStyle(2, 0xe3c18c, 0.7)
      .lineBetween(portal.x - 8, portal.y, portal.x + 8, portal.y)
      .lineBetween(portal.x, portal.y - 8, portal.x, portal.y + 8);
  }
}
export function combatAimTarget(
  view: View,
  player: Pick<PlayerView, "x" | "y"> | undefined,
) {
  if (!view.objective) return view.boss;
  if (!player) return undefined;
  return view.minions
    .filter((actor) => actor.health > 0)
    .sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) -
        Math.hypot(b.x - player.x, b.y - player.y),
    )[0];
}
