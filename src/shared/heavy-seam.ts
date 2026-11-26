import catalog from "../../content/catalog.json";
import { segmentRect } from "./geometry.ts";
import { swordCircleContact } from "./sword-geometry.ts";
import type { Vec } from "./protocol.ts";
export const seamId = "heavy-flak-seam-1";
export const heavySeamRules = catalog.rules.heavySeam;
export type FlakSeamContactCue = {
  kind: "heavy-flak-seam-contacts";
  id: number;
  owner: string;
  at: number;
  until: number;
  contacts: Vec[];
};
export type FlakSeamOwnerCue = {
  kind: "heavy-flak-seam-owner";
  id: number;
  owner: string;
  at: number;
  until: number;
  points: Vec[];
  broken: boolean;
  stage: "flight" | "cut";
};
type Point = { x: number; y: number };
type Shot = Point & {
  id: number;
  owner: string;
  radius: number;
  expires: number;
};
type Rect = Point & { width: number; height: number };
/** Current-circle interception from copied actual travel, ordered from the live tip backward. */
export function seamGeometry(
  trace: readonly Point[],
  shots: readonly Shot[],
  obstacles: readonly Rect[],
  now: number,
  remaining: number,
  width = heavySeamRules.width,
) {
  if (
    !Number.isInteger(remaining) ||
    remaining < 0 ||
    remaining > catalog.rules.heavyFlak.projectileLimit ||
    !Number.isFinite(width) ||
    width <= 0
  )
    throw Error("invalid seam quota/width");
  const path = trace
    .map((p) => ({ x: p.x, y: p.y }))
    .filter((p, i, a) => i === 0 || p.x !== a[i - 1].x || p.y !== a[i - 1].y);
  if (
    path.length < 2 ||
    path.length > heavySeamRules.maximumPoints ||
    path.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return {
      eligible: false,
      reason: "no bounded actual trace",
      candidates: [] as {
        id: number;
        x: number;
        y: number;
        distanceFromTip: number;
      }[],
      contacts: [] as {
        id: number;
        x: number;
        y: number;
        distanceFromTip: number;
      }[],
    };
  const segments = path
    .slice(1)
    .map((to, i) => ({
      from: path[i],
      to,
      length: Math.hypot(to.x - path[i].x, to.y - path[i].y),
    }));
  if (
    segments.some((s) =>
      obstacles.some(
        (w) =>
          segmentRect(s.from, s.to, w, catalog.rules.heavyFlak.radius) !== null,
      ),
    )
  )
    return {
      eligible: false,
      reason: "current cover crosses trace",
      candidates: [] as {
        id: number;
        x: number;
        y: number;
        distanceFromTip: number;
      }[],
      contacts: [] as {
        id: number;
        x: number;
        y: number;
        distanceFromTip: number;
      }[],
    };
  const candidates: {
    id: number;
    x: number;
    y: number;
    distanceFromTip: number;
  }[] = [];
  for (const shot of shots) {
    if (
      shot.owner !== "hostile" ||
      shot.radius <= 0 ||
      shot.radius > catalog.rules.heavyFlak.maximumHostileRadius ||
      shot.expires <= now
    )
      continue;
    let suffix = 0,
      best = Infinity;
    for (let i = segments.length - 1; i >= 0; i--) {
      const s = segments[i],
        dx = s.to.x - s.from.x,
        dy = s.to.y - s.from.y,
        t = Math.max(
          0,
          Math.min(
            1,
            ((shot.x - s.from.x) * dx + (shot.y - s.from.y) * dy) /
              (s.length * s.length),
          ),
        ),
        point = { x: s.from.x + dx * t, y: s.from.y + dy * t };
      if (
        swordCircleContact(
          point,
          0,
          width,
          Math.PI * 2,
          shot,
          shot.radius,
          obstacles,
        )
      )
        best = Math.min(best, suffix + (1 - t) * s.length);
      suffix += s.length;
    }
    if (best < Infinity)
      candidates.push({
        id: shot.id,
        x: shot.x,
        y: shot.y,
        distanceFromTip: best,
      });
  }
  candidates.sort(
    (a, b) => a.distanceFromTip - b.distanceFromTip || a.id - b.id,
  );
  return {
    eligible: true,
    reason: "current-position sample",
    candidates,
    contacts: candidates.slice(0, remaining),
  };
}

export type SeamPrivateEvent = {
  type: "private-class-cues";
  owner: string;
  at: number;
  run: string;
  encounter: number;
  cues: FlakSeamOwnerCue[];
};
const record = (v: unknown): v is Record<string, unknown> =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype ||
      Object.getPrototypeOf(v) === null),
  keys = (v: Record<string, unknown>, expected: string[]) =>
    Object.keys(v).length === expected.length &&
    expected.every((k) => Object.hasOwn(v, k)),
  tick = (v: unknown): v is number =>
    typeof v === "number" && Number.isSafeInteger(v) && v >= 0,
  owner = (v: unknown): v is string =>
    typeof v === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(v);
/** A bounded owner-trajectory event, never a public class cue or a synthetic physical shot. */
export function validSeamPrivateEvent(v: unknown): v is SeamPrivateEvent {
  if (
    !record(v) ||
    !keys(v, ["type", "owner", "at", "run", "encounter", "cues"]) ||
    v.type !== "private-class-cues" ||
    !owner(v.owner) ||
    !tick(v.at) ||
    !tick(v.encounter) ||
    typeof v.run !== "string" ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(v.run) ||
    !Array.isArray(v.cues) ||
    v.cues.length > 2
  )
    return false;
  const eventAt = v.at;
  return v.cues.every(
    (c) =>
      record(c) &&
      keys(c, [
        "kind",
        "id",
        "owner",
        "at",
        "until",
        "points",
        "broken",
        "stage",
      ]) &&
      c.kind === "heavy-flak-seam-owner" &&
      tick(c.id) &&
      c.id > 0 &&
      c.owner === v.owner &&
      tick(c.at) &&
      c.at <= eventAt &&
      tick(c.until) &&
      c.until > eventAt &&
      typeof c.broken === "boolean" &&
      (c.stage === "flight" || c.stage === "cut") &&
      Array.isArray(c.points) &&
      c.points.length > 0 &&
      c.points.length <= heavySeamRules.maximumPoints &&
      c.points.every(
        (p) =>
          record(p) &&
          keys(p, ["x", "y"]) &&
          typeof p.x === "number" &&
          typeof p.y === "number" &&
          Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          Math.abs(p.x) <= 100000 &&
          Math.abs(p.y) <= 100000,
      ),
  );
}
