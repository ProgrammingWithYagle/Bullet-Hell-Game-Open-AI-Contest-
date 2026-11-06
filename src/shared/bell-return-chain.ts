import rules from "./bell-return-chain-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  segmentCircleXY,
  segmentRect,
  type Rect,
} from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";

export const bellChainRules = rules;
export type BellChain = Vec & {
  kind: "bell-chain";
  id: number;
  originX: number;
  originY: number;
  endX: number;
  endY: number;
  oldX: number;
  oldY: number;
  radius: number;
  beganAt: number;
  at: number;
  outwardEndAt: number;
  returnWarnAt: number;
  returnAt: number;
  until: number;
  damage: number;
  health: number;
  maxHealth: number;
  crazed: boolean;
  state: "windup" | "outbound" | "settle" | "rewarn" | "return" | "broken";
  brokenAt: number;
};
const ticks = (seconds: number) => Math.ceil(seconds * HZ);

export function bellChainStage(q: BellChain, now: number): BellChain["state"] {
  if (q.brokenAt) return "broken";
  if (now < q.at) return "windup";
  if (now <= q.outwardEndAt) return "outbound";
  if (now < q.returnWarnAt) return "settle";
  if (now < q.returnAt) return "rewarn";
  return "return";
}

/** The same fixed timeline drives authority, warning geometry and presentation. */
export function bellChainPosition(q: BellChain, now: number): Vec {
  if (q.brokenAt) return { x: q.x, y: q.y };
  let f = 0;
  if (now >= q.returnAt)
    f =
      1 -
      clamp((now - q.returnAt) / Math.max(1, q.until - q.returnAt - 1), 0, 1);
  else if (now >= q.outwardEndAt) f = 1;
  else if (now >= q.at)
    f = clamp((now - q.at) / Math.max(1, q.outwardEndAt - q.at), 0, 1);
  return {
    x: q.originX + (q.endX - q.originX) * f,
    y: q.originY + (q.endY - q.originY) * f,
  };
}

/** Only the moving head hurts. Its thin tether is not a damaging beam. */
export function bellChainContact(
  q: BellChain,
  from: Vec,
  to: Vec,
  now: number,
  body = 9,
) {
  const stage = bellChainStage(q, now);
  if (now >= q.until || (stage !== "outbound" && stage !== "return"))
    return false;
  const start = now === q.at || now === q.returnAt ? to : from;
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

/** Clip a real physical throw against cover, offset bounds and conservative lava walls. */
export function bellChainEnd(
  source: Vec,
  target: Vec,
  walls: Rect[],
): Vec | null {
  const aim = Math.atan2(target.y - source.y, target.x - source.x),
    reach = clamp(
      distance(source, target) + rules.overshoot,
      rules.minimumReach,
      rules.maximumReach,
    ),
    offsets = [
      0,
      0.35,
      -0.35,
      0.7,
      -0.7,
      1.05,
      -1.05,
      Math.PI / 2,
      -Math.PI / 2,
      2.1,
      -2.1,
      2.6,
      -2.6,
      Math.PI,
    ];
  for (const offset of offsets) {
    const angle = aim + offset,
      desired = {
        x: source.x + Math.cos(angle) * reach,
        y: source.y + Math.sin(angle) * reach,
      };
    let fraction = 1;
    for (const wall of walls) {
      const hit = segmentRect(source, desired, wall, rules.radius + 2);
      if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.001));
    }
    const end = {
      x: source.x + (desired.x - source.x) * fraction,
      y: source.y + (desired.y - source.y) * fraction,
    };
    if (distance(source, end) >= rules.minimumReach - 0.001) return end;
  }
  return null;
}

/** One finite physical technique per primary score; it never moves the boss body. */
export class BellReturnChain {
  private head: BellChain | undefined;
  private touched = new Set<string>();
  private warnedReturn = false;
  private launched = false;
  private returned = false;

  get busy() {
    return this.head !== undefined;
  }
  clear() {
    this.head = undefined;
    this.touched.clear();
    this.warnedReturn = this.launched = this.returned = false;
  }
  cues(): BellChain[] {
    return this.head ? [{ ...this.head }] : [];
  }
  weakPoints(): BellChain[] {
    return this.head?.state === "rewarn" && this.head.health > 0
      ? [{ ...this.head }]
      : [];
  }
  start(c: SignatureContext, source: Vec, target: Vec, walls: Rect[]) {
    if (!c.brutal || c.paused || this.busy) return false;
    const end = bellChainEnd(source, target, walls);
    if (!end) return false;
    const length = distance(source, end),
      scale = Math.min(1.75, Math.max(0.5, c.movementSpeedScale ?? 1)),
      at = c.tick + ticks(rules.warningSeconds),
      outwardEndAt =
        at + Math.max(1, Math.ceil(length / (rules.outwardSpeed * scale * DT))),
      returnWarnAt = outwardEndAt + 1 + ticks(rules.settleSeconds),
      returnAt = returnWarnAt + ticks(rules.returnWarningSeconds),
      until =
        returnAt +
        Math.max(1, Math.ceil(length / (rules.returnSpeed * scale * DT))) +
        1,
      maxHealth =
        c.variant === "crazed" ? rules.crazedHeadHealth : rules.headHealth;
    this.head = {
      kind: "bell-chain",
      id: c.id(),
      originX: source.x,
      originY: source.y,
      endX: end.x,
      endY: end.y,
      x: source.x,
      y: source.y,
      oldX: source.x,
      oldY: source.y,
      radius: rules.radius,
      beganAt: c.tick,
      at,
      outwardEndAt,
      returnWarnAt,
      returnAt,
      until,
      damage: rules.damage * c.damageScale,
      health: maxHealth,
      maxHealth,
      crazed: c.variant === "crazed",
      state: "windup",
      brokenAt: 0,
    };
    this.touched.clear();
    this.warnedReturn = this.launched = this.returned = false;
    c.warn?.();
    return true;
  }
  hit(id: number, amount: number, now: number) {
    const q = this.head;
    if (
      !q ||
      q.id !== id ||
      q.state !== "rewarn" ||
      now < q.returnWarnAt ||
      now >= q.returnAt ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      return 0;
    const actual = Math.min(q.health, amount);
    q.health -= actual;
    if (!q.health) {
      q.state = "broken";
      q.brokenAt = now;
      q.until = Math.min(q.until, now + ticks(rules.brokenFadeSeconds));
      this.touched.clear();
    }
    return actual;
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.clear();
      return;
    }
    const q = this.head;
    if (!q) return;
    if (c.tick >= q.until) {
      this.clear();
      return;
    }
    q.oldX = q.x;
    q.oldY = q.y;
    q.state = bellChainStage(q, c.tick);
    const next = bellChainPosition(q, c.tick);
    q.x = next.x;
    q.y = next.y;
    if (q.state === "broken") return;
    if (c.tick >= q.at && !this.launched) {
      this.launched = true;
      c.cueSound?.("bell-clapper");
    }
    if (c.tick >= q.returnWarnAt && !this.warnedReturn) {
      this.warnedReturn = true;
      c.warn?.();
    }
    if (c.tick >= q.returnAt && !this.returned) {
      this.returned = true;
      c.cueSound?.("bell-answer");
    }
    if (q.state !== "outbound" && q.state !== "return") return;
    for (const p of c.targets) {
      const key = q.state + ":" + p.id;
      if (
        !this.touched.has(key) &&
        bellChainContact(q, { x: p.oldX, y: p.oldY }, p, c.tick)
      ) {
        this.touched.add(key);
        c.damage(p.id, q.damage);
      }
    }
  }
}
