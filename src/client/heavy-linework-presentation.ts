import { lineworkIds, heavyLineworkRules } from '../shared/heavy-linework.ts';
import type { PlayerView, View } from '../shared/view.ts';
import type { Shot, Vec } from '../shared/protocol.ts';
type Frame = Pick<View, 'phase' | 'combatTick' | 'run' | 'encounter' | 'arenaId'>;
export type LineworkRenderPlan = {
  from: Vec;
  anchor: Vec;
  active: boolean;
  remainingTicks: number;
};
/** Only an actual acknowledged owner line may be drawn; the carried native gun stays on the body. */
export function lineworkRenderPlan(
  p: PlayerView,
  view: Frame,
  localId: string,
  drawnBody: Vec = p,
  now = view.combatTick,
): LineworkRenderPlan | undefined {
  const k = p.kit,
    c = k.lineworkConnection;
  if (
    p.id !== localId ||
    p.classId !== 'heavy' ||
    !p.skills.includes(lineworkIds.entry) ||
    !p.connected ||
    p.status !== 'active' ||
    view.phase !== 'combat' ||
    !c ||
    c.owner !== p.id ||
    c.weapon !== p.weapon ||
    c.scope !== view.run.id + ':' + view.encounter + ':' + view.arenaId ||
    now >= c.until ||
    (c.requiresFitting && !p.skills.includes(c.requiresFitting))
  )
    return;
  const anchor = c.origin,
    length = Math.hypot(drawnBody.x - anchor.x, drawnBody.y - anchor.y),
    limit =
      k.lineworkMode === 'sheave' && !c.active
        ? heavyLineworkRules.maximumLength
        : c.paidLength + heavyLineworkRules.slack;
  if (
    ![anchor.x, anchor.y, drawnBody.x, drawnBody.y].every(Number.isFinite) ||
    length > heavyLineworkRules.maximumLength ||
    length > limit
  )
    return;
  return {
    from: { x: drawnBody.x, y: drawnBody.y },
    anchor: { ...anchor },
    active: c.active,
    remainingTicks: Math.max(0, c.until - now),
  };
}
type Graphics = {
  lineStyle(width: number, color: number, alpha: number): Graphics;
  lineBetween(x1: number, y1: number, x2: number, y2: number): Graphics;
  strokeCircle(x: number, y: number, radius: number): Graphics;
};
export function drawLinework(g: Graphics, plan: LineworkRenderPlan | undefined) {
  if (!plan) return;
  g.lineStyle(1.5, plan.active ? 0xd6bb78 : 0xa7aaa0, 0.7)
    .lineBetween(plan.from.x, plan.from.y, plan.anchor.x, plan.anchor.y)
    .strokeCircle(plan.anchor.x, plan.anchor.y, 4);
}
export function lineworkProjectilePlan(s: Pick<Shot, 'visual' | 'vx' | 'vy'>) {
  return s.visual === 'heavy-anchor'
    ? {
        texture: 'projectile-anchor',
        rotation: Math.atan2(s.vy, s.vx) + Math.PI / 4,
        displaySide: 20,
      }
    : undefined;
}
