import rules from "./mold-still-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import { clamp, distance, segmentCircleXY } from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
import type { MoldPool } from "./mold-mixing.ts";

export const moldStillRules = rules;
export type MoldStill = Vec & {
  kind: "mold-still";
  id: number;
  radius: number;
  clearance: number;
  beganAt: number;
  at: number;
  until: number;
  nextAt: number;
  phase: number;
  index: number;
  releases: number;
  released: number;
  targetX: number;
  targetY: number;
  cooledAt: number;
  state: "charging" | "venting" | "cooled" | "spent";
};
export type MoldAerosol = Vec & {
  kind: "mold-aerosol";
  id: number;
  sourceId: number;
  fromX: number;
  fromY: number;
  endX: number;
  endY: number;
  oldX: number;
  oldY: number;
  radius: number;
  beganAt: number;
  at: number;
  until: number;
  damage: number;
  index: number;
  count: number;
  reflux: boolean;
  quenchedAt: number;
  state: "warning" | "travel" | "quenched";
};
export type MoldStillCue = MoldStill | MoldAerosol;
const ticks = (s: number) => Math.ceil(s * HZ);

/** The same locked analytic path is used for authority and drawing. */
export function aerosolPosition(q: MoldAerosol, now: number): Vec {
  if (q.quenchedAt) return { x: q.x, y: q.y };
  const f = clamp((now - q.at) / Math.max(1, q.until - q.at - 1), 0, 1);
  return {
    x: q.fromX + (q.endX - q.fromX) * f,
    y: q.fromY + (q.endY - q.fromY) * f,
  };
}
export function aerosolContact(
  q: MoldAerosol,
  from: Vec,
  to: Vec,
  now: number,
  body = 9,
) {
  if (q.state !== "travel" || now < q.at || now >= q.until) return false;
  const start = now === q.at ? to : from;
  return (
    segmentCircleXY(
      start.x - q.oldX,
      start.y - q.oldY,
      to.x - q.x,
      to.y - q.y,
      0,
      0,
      q.radius + body,
    ) !== null
  );
}
export function aerosolMovement(
  cues: readonly { kind: string }[],
  p: Vec,
  now: number,
) {
  return cues.some((c) => {
    if (c.kind !== "mold-aerosol") return false;
    const q = c as MoldAerosol;
    return (
      q.state === "travel" &&
      now >= q.at &&
      now < q.until &&
      distance(p, aerosolPosition(q, now)) <= q.radius + 9
    );
  })
    ? rules.slowMultiplier
    : 1;
}

/** Columns are chemical apparatus, not shootable targets or solid cover. */
export class MoldStills {
  private columns: MoldStill[] = [];
  private clouds: MoldAerosol[] = [];
  private hits = new Map<number, Set<string>>();
  private speedScale = 1;
  private damageScale = 1;
  get busy() {
    return this.columns.length > 0 || this.clouds.length > 0;
  }
  clear() {
    this.columns = [];
    this.clouds = [];
    this.hits.clear();
  }
  cues(): MoldStillCue[] {
    return [
      ...this.columns.map((q) => ({ ...q })),
      ...this.clouds.map((q) => ({ ...q })),
    ];
  }
  start(c: SignatureContext, target: Vec, positions: Vec[]) {
    if (c.variant !== "crazed" || c.paused || this.busy || !positions.length)
      return false;
    this.speedScale = Math.min(1.5, Math.max(0.5, c.movementSpeedScale ?? 1));
    this.damageScale = c.damageScale;
    const phase = Math.min(3, Math.max(0, c.phase)),
      count = rules.releasesByPhase[phase];
    this.columns = positions
      .slice(0, rules.columnsByPhase[phase])
      .map((p, index) => {
        const at =
          c.tick +
          ticks(rules.warmupSeconds + index * rules.secondColumnDelaySeconds);
        return {
          kind: "mold-still",
          id: c.id(),
          x: p.x,
          y: p.y,
          radius: rules.columnRadius,
          clearance: rules.clearance,
          beganAt: c.tick,
          at,
          until:
            at +
            ticks(
              (count - 1) * rules.releaseSpacingSeconds + rules.warningSeconds,
            ) +
            Math.ceil(
              rules.maximumRange / (rules.cloudSpeed * this.speedScale * DT),
            ) +
            2,
          nextAt: at,
          phase,
          index,
          releases: count,
          released: 0,
          targetX: target.x,
          targetY: target.y,
          cooledAt: 0,
          state: "charging",
        };
      });
    c.warn?.();
    return true;
  }
  private emit(c: SignatureContext, s: MoldStill) {
    const targets = c.aimTargets ?? c.targets,
      target =
        s.phase === 0
          ? { x: s.targetX, y: s.targetY }
          : (targets[(s.index + s.released) % Math.max(1, targets.length)] ?? {
              x: s.targetX,
              y: s.targetY,
            }),
      b = c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 },
      r = rules.cloudRadius + 3,
      aim = Math.atan2(target.y - s.y, target.x - s.x),
      reach = Math.min(
        rules.maximumRange,
        distance(s, target) + rules.overshoot,
      ),
      end = {
        x: clamp(s.x + Math.cos(aim) * reach, b.x + r, b.x + b.width - r),
        y: clamp(s.y + Math.sin(aim) * reach, b.y + r, b.y + b.height - r),
      },
      reflux = s.phase === 3 && s.released === s.releases - 1,
      from = reflux ? end : s,
      to = reflux ? s : end,
      at = c.tick + ticks(rules.warningSeconds),
      until =
        at +
        Math.max(
          1,
          Math.ceil(
            distance(from, to) / (rules.cloudSpeed * this.speedScale * DT),
          ),
        ) +
        1;
    this.clouds.push({
      kind: "mold-aerosol",
      id: c.id(),
      sourceId: s.id,
      fromX: from.x,
      fromY: from.y,
      endX: to.x,
      endY: to.y,
      x: from.x,
      y: from.y,
      oldX: from.x,
      oldY: from.y,
      radius: rules.cloudRadius,
      beganAt: c.tick,
      at,
      until,
      damage: rules.damage * this.damageScale,
      index: s.released + 1,
      count: s.releases,
      reflux,
      quenchedAt: 0,
      state: "warning",
    });
    s.released++;
    s.nextAt = c.tick + ticks(rules.releaseSpacingSeconds);
    s.state = "venting";
    c.warn?.();
  }
  step(c: SignatureContext, pools: MoldPool[]) {
    if (c.paused) {
      this.clear();
      return;
    }
    const now = c.tick,
      water = pools.filter(
        (p) => p.reagent === "water" && now >= p.at && now < p.until,
      );
    for (const s of this.columns) {
      if (s.state === "cooled") continue;
      if (water.some((p) => distance(p, s) <= p.radius + s.radius)) {
        s.state = "cooled";
        s.cooledAt = now;
        s.until = Math.min(s.until, now + ticks(rules.coolantGraceSeconds));
        // Cooling stops future releases and visibly condenses pending clouds.
        // Already released clouds keep their own path until they meet coolant.
        for (const q of this.clouds)
          if (q.sourceId === s.id && q.state === "warning" && now < q.at) {
            q.state = "quenched";
            q.quenchedAt = now;
            q.until = Math.min(q.until, now + ticks(rules.condensationSeconds));
          }
        continue;
      }
      if (s.released < s.releases && now >= s.nextAt) this.emit(c, s);
      if (s.released >= s.releases) s.state = "spent";
    }
    for (const q of this.clouds) {
      if (now >= q.until || q.state === "quenched") continue;
      q.oldX = q.x;
      q.oldY = q.y;
      const p = aerosolPosition(q, now);
      q.x = p.x;
      q.y = p.y;
      if (now < q.at) continue;
      q.state = "travel";
      const coolant = water.find(
        (p) =>
          segmentCircleXY(
            q.oldX - p.x,
            q.oldY - p.y,
            q.x - p.x,
            q.y - p.y,
            0,
            0,
            p.radius + q.radius,
          ) !== null,
      );
      if (coolant) {
        q.state = "quenched";
        q.quenchedAt = now;
        q.until = Math.min(q.until, now + ticks(rules.condensationSeconds));
        if (!coolant.spentAt) {
          coolant.spentAt = now;
          coolant.until = Math.min(
            coolant.until,
            now + ticks(rules.coolantGraceSeconds),
          );
        }
        continue;
      }
      let hit = this.hits.get(q.id);
      if (!hit) {
        hit = new Set();
        this.hits.set(q.id, hit);
      }
      for (const p of c.targets)
        if (
          !hit.has(p.id) &&
          aerosolContact(q, { x: p.oldX, y: p.oldY }, p, now)
        ) {
          hit.add(p.id);
          c.damage(p.id, q.damage);
        }
    }
    this.clouds = this.clouds.filter((q) => now < q.until);
    this.columns = this.columns.filter((q) => now < q.until);
    for (const id of this.hits.keys())
      if (!this.clouds.some((q) => q.id === id)) this.hits.delete(id);
  }
}
