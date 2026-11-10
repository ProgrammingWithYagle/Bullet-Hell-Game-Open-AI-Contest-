import { postFrame } from './heavy-post-presentation.ts';
import type { PlayerView } from "../shared/view.ts";
import {
  traverseIds,
  clutchId,
  keyedId,
  openId,
} from "../shared/heavy-traverse.ts";
type Handling = typeof keyedId | typeof openId;
type HandlingKit = PlayerView["kit"] & {
  heavyClutchHandling?: Handling;
  heavyClutchConverted?: number;
};
type HandlingPlayer = Omit<PlayerView, "kit"> & { kit: HandlingKit };
type Point = { x: number; y: number };
export type HandlingIndicator = {
  state: "calibrating" | "keyed" | "open" | "engaged";
  bearing: number;
  lines: readonly (readonly [Point, Point])[];
};
/** Short local bearing marker only. No future trajectory, contact, physical second weapon or firing event. */
export function traverseHandlingIndicator(
  players: readonly HandlingPlayer[],
  localId: string,
  phase: string,
  now: number,
): HandlingIndicator | undefined {
  const p = players.find((p) => p.id === localId),
    k = p?.kit;
  if (p && postFrame(p, phase, now, localId)) return;
  if (
    !p ||
    p.classId !== "heavy" ||
    !p.connected ||
    p.status !== "active" ||
    p.health <= 0 ||
    phase !== "combat" ||
    !k ||
    !p.skills.includes(traverseIds.entry) ||
    !p.skills.includes(clutchId) ||
    !k.heavyClutchUsed ||
    (k.heavyTraverseUntil ?? 0) <= now ||
    !k.heavyClutchHandling ||
    !p.skills.includes(k.heavyClutchHandling) ||
    ![keyedId, openId].includes(k.heavyClutchHandling) ||
    (k.heavyTraverseMode === "spade" &&
      !p.skills.includes(traverseIds.spade)) ||
    (k.heavyTraverseMode === "floating" &&
      !p.skills.includes(traverseIds.floating)) ||
    !Number.isFinite(k.heavyTraverseAim) ||
    !Number.isFinite(p.x) ||
    !Number.isFinite(p.y)
  )
    return;
  const bearing = k.heavyTraverseAim!;
  const at = (d: number, side = 0): Point => ({
    x: p.x + Math.cos(bearing) * d - Math.sin(bearing) * side,
    y: p.y + Math.sin(bearing) * d + Math.cos(bearing) * side,
  });
  const keyed = k.heavyClutchHandling === keyedId;
  const state = keyed
    ? k.heavyClutchLifted
      ? "calibrating"
      : "keyed"
    : k.heavyClutchLifted
      ? "open"
      : "engaged";
  const lines: (readonly [Point, Point])[] = [[at(14), at(28)]];
  if (state === "keyed") lines.push([at(25, -4), at(25, 4)]);
  else lines.push([at(23, -4), at(28)], [at(23, 4), at(28)]);
  return { state, bearing, lines };
}
