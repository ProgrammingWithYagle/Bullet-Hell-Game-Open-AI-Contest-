import tuning from "./mold-mixing-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import { distance, segmentRect, segmentCircle, type Rect } from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
export const moldRules = tuning;
type Life = { id: number; beganAt: number; at: number; until: number };
export type MoldWalk = Life & {
  kind: "mold-walk";
  path: Vec[];
  index: number;
  speed: number;
};
export type MoldPool = Life &
  Vec & { kind: "mold-pool"; radius: number; index: number; drainedAt: number };
export type MoldFront = Life &
  Vec & {
    kind: "mold-front";
    oldX: number;
    oldY: number;
    path: Vec[];
    index: number;
    radius: number;
    speed: number;
    leg: number;
    legs: number;
    returning: boolean;
    draining: boolean;
  };
export type MoldSpray = Life &
  Vec & {
    kind: "mold-spray";
    angles: number[];
    wave: number;
    waves: number;
    crossing: boolean;
  };
export type MoldCue = MoldWalk | MoldPool | MoldFront | MoldSpray;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
const bounds = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
export function moldWalls(c: SignatureContext): Rect[] {
  const b = bounds(c);
  return [
    ...c.obstacles,
    ...(c.hazardCircles ?? []).map((p) => ({
      x: p.x - p.radius,
      y: p.y - p.radius,
      width: p.radius * 2,
      height: p.radius * 2,
    })),
    { x: b.x - 100, y: b.y - 100, width: 100, height: b.height + 200 },
    { x: b.x + b.width, y: b.y - 100, width: 100, height: b.height + 200 },
    { x: b.x - 100, y: b.y - 100, width: b.width + 200, height: 100 },
    { x: b.x - 100, y: b.y + b.height, width: b.width + 200, height: 100 },
  ];
}
const clear = (a: Vec, b: Vec, walls: Rect[], radius: number) =>
  !walls.some((o) => segmentRect(a, b, o, radius + 0.1) !== null);
/** A body-clear mixing road approaches a locked flank on the actual offset arena. */
export function moldRoad(
  c: SignatureContext,
  target: Vec,
  cycle: number,
): Vec[] {
  const b = bounds(c),
    pad = Math.max(c.radius, tuning.poolRadius) + tuning.clearance,
    step = tuning.gridSpacing,
    walls = moldWalls(c),
    nx = Math.floor((b.width - 2 * pad) / step) + 1,
    ny = Math.floor((b.height - 2 * pad) / step) + 1;
  if (nx < 1 || ny < 1 || nx * ny > 2000) return [{ x: c.boss.x, y: c.boss.y }];
  const nodes = Array.from({ length: nx * ny }, (_, i) => ({
      x: b.x + pad + (i % nx) * step,
      y: b.y + pad + Math.floor(i / nx) * step,
    })),
    valid = nodes.map((p) => clear(p, p, walls, pad - tuning.clearance)),
    parent = new Int32Array(nodes.length).fill(-2),
    cost = new Float64Array(nodes.length).fill(Infinity),
    queue: number[] = [];
  for (let i = 0; i < nodes.length; i++)
    if (
      valid[i] &&
      distance(c.boss, nodes[i]) <= step * 3 &&
      clear(c.boss, nodes[i], walls, c.radius)
    ) {
      parent[i] = -1;
      cost[i] = distance(c.boss, nodes[i]);
      queue.push(i);
    }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head],
      x = i % nx,
      y = Math.floor(i / nx);
    for (const j of [
      x ? i - 1 : -1,
      x < nx - 1 ? i + 1 : -1,
      y ? i - nx : -1,
      y < ny - 1 ? i + nx : -1,
    ])
      if (
        j >= 0 &&
        parent[j] === -2 &&
        valid[j] &&
        clear(nodes[i], nodes[j], walls, tuning.poolRadius)
      ) {
        parent[j] = i;
        cost[j] = cost[i] + step;
        queue.push(j);
      }
  }
  const angle = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
    side = (cycle % 2 ? 1 : -1) * (c.phase >= 2 ? -1 : 1),
    goal = {
      x: target.x - Math.cos(angle) * 180 - Math.sin(angle) * side * 140,
      y: target.y - Math.sin(angle) * 180 + Math.cos(angle) * side * 140,
    },
    choices = queue
      .filter(
        (i) => cost[i] >= tuning.minimumWalk && cost[i] <= tuning.maximumWalk,
      )
      .toSorted(
        (a, z) =>
          distance(nodes[a], goal) - distance(nodes[z], goal) ||
          cost[a] - cost[z],
      ),
    best = choices[0] ?? queue.toSorted((a, z) => cost[z] - cost[a])[0];
  if (best === undefined) return [{ x: c.boss.x, y: c.boss.y }];
  const reverse: Vec[] = [];
  for (let i = best; i >= 0; i = parent[i]) reverse.push(nodes[i]);
  return [{ x: c.boss.x, y: c.boss.y }, ...reverse.reverse()];
}
export function moldPoint(path: Vec[], fraction: number) {
  const lengths = path.slice(1).map((p, i) => distance(path[i], p)),
    total = lengths.reduce((a, b) => a + b, 0);
  let remaining = total * Math.max(0, Math.min(1, fraction));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const f = lengths[i] ? remaining / lengths[i] : 0;
      return {
        x: path[i].x + (path[i + 1].x - path[i].x) * f,
        y: path[i].y + (path[i + 1].y - path[i].y) * f,
      };
    }
    remaining -= lengths[i];
  }
  const last = path.at(-1)!;
  return { x: last.x, y: last.y };
}
export function moldMovement(
  cues: readonly { kind: string }[],
  position: Vec,
  now: number,
) {
  return cues.some((q) => {
    if (q.kind !== "mold-pool") return false;
    const p = q as MoldPool;
    return (
      !p.drainedAt &&
      now >= p.at &&
      now < p.until &&
      distance(position, p) <= p.radius + 9
    );
  })
    ? tuning.slowMultiplier
    : 1;
}
export class MoldMixing {
  private walk: MoldWalk | null = null;
  private pools: MoldPool[] = [];
  private front: MoldFront | null = null;
  private sprays: MoldSpray[] = [];
  private emitted = new Set<number>();
  private contacts = new Map<string, number>();
  private frontHits = new Set<string>();
  private road: Vec[] = [];
  private stage: "idle" | "walk" | "culture" | "front" | "gap" | "spray" =
    "idle";
  private cycle = 0;
  private phase = -1;
  private leg = 0;
  private legs = 0;
  private until = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.stage !== "idle";
  }
  reset(until = 0, encounter = false) {
    this.walk = null;
    this.pools = [];
    this.front = null;
    this.sprays = [];
    this.emitted.clear();
    this.contacts.clear();
    this.frontHits.clear();
    this.road = [];
    this.stage = "idle";
    this.phase = -1;
    this.nextSignatureAt = until;
    this.until = 0;
    this.leg = 0;
    this.legs = 0;
    if (encounter) this.cycle = 0;
  }
  cues(): MoldCue[] {
    return [
      ...(this.walk
        ? [{ ...this.walk, path: this.walk.path.map((p) => ({ ...p })) }]
        : []),
      ...this.pools.map((p) => ({ ...p })),
      ...(this.front
        ? [{ ...this.front, path: this.front.path.map((p) => ({ ...p })) }]
        : []),
      ...this.sprays.map((p) => ({ ...p, angles: [...p.angles] })),
    ];
  }
  cast(c: SignatureContext, target: Vec) {
    if (!this.busy && c.tick >= this.nextSignatureAt && !c.paused)
      this.begin(c, target);
    return true;
  }
  private begin(c: SignatureContext, target: Vec) {
    this.phase = c.phase;
    this.road = moldRoad(c, target, this.cycle++);
    const length = this.road
        .slice(1)
        .reduce((sum, p, i) => sum + distance(this.road[i], p), 0),
      speed =
        (c.phase ? tuning.lateWalkSpeed : tuning.walkSpeed) *
        Math.min(1.75, Math.max(0.5, c.movementSpeedScale ?? 1)),
      at = c.tick + ticks(tuning.walkWarning);
    this.walk = {
      kind: "mold-walk",
      id: c.id(),
      beganAt: c.tick,
      at,
      until: at + Math.ceil(length / (speed * DT)) + 1,
      path: this.road.map((p) => ({ ...p })),
      index: 1,
      speed,
    };
    this.stage = "walk";
    c.warn?.();
  }
  private culture(c: SignatureContext) {
    const walls = moldWalls(c),
      at = c.tick + ticks(tuning.poolWarning);
    this.pools = [];
    this.contacts.clear();
    for (let i = 0; i < tuning.poolCount; i++) {
      let point: Vec | undefined;
      for (const turn of [0, 0.04, -0.04, 0.08, -0.08, 0.12, -0.12]) {
        const p = moldPoint(this.road, 0.23 + i * 0.33 + turn);
        if (
          clear(p, p, walls, tuning.poolRadius) &&
          this.pools.every((q) => distance(q, p) >= 65)
        ) {
          point = p;
          break;
        }
      }
      if (point)
        this.pools.push({
          kind: "mold-pool",
          id: c.id(),
          x: point.x,
          y: point.y,
          radius: tuning.poolRadius,
          index: i,
          beganAt: c.tick,
          at,
          until:
            at +
            ticks(c.phase >= 2 ? tuning.decantPoolSeconds : tuning.poolSeconds),
          drainedAt: 0,
        });
    }
    this.walk = null;
    this.stage = "culture";
    this.until = at + ticks(0.6);
    this.leg = 0;
    this.legs =
      c.phase === 0
        ? 0
        : c.phase === 1
          ? 1
          : c.phase === 2
            ? 2
            : 3 + (c.variant === "crazed" ? 1 : 0);
    c.warn?.();
  }
  private startFront(c: SignatureContext) {
    this.leg++;
    const returning = this.leg % 2 === 0,
      path = (returning ? [...this.road].reverse() : this.road).map((p) => ({
        x: p.x,
        y: p.y,
      })),
      first = path[0],
      length = path
        .slice(1)
        .reduce((sum, p, i) => sum + distance(path[i], p), 0),
      at = c.tick + ticks(tuning.frontWarning);
    this.front = {
      kind: "mold-front",
      id: c.id(),
      x: first.x,
      y: first.y,
      oldX: first.x,
      oldY: first.y,
      path,
      index: 1,
      beganAt: c.tick,
      at,
      until: at + Math.ceil(length / (tuning.frontSpeed * DT)) + 1,
      speed: tuning.frontSpeed,
      radius: tuning.frontRadius,
      leg: this.leg,
      legs: this.legs,
      returning,
      draining: returning && c.phase >= 2,
    };
    this.frontHits.clear();
    this.stage = "front";
    c.warn?.();
  }
  private spray(c: SignatureContext) {
    this.front = null;
    if (!c.brutal) {
      this.rest(c.tick);
      return;
    }
    const now = c.tick,
      origin = this.road.at(-1) ?? c.boss,
      targets = c.aimTargets ?? c.targets,
      target = targets[this.cycle % Math.max(1, targets.length)] ?? c.boss,
      angle = Math.atan2(target.y - origin.y, target.x - origin.x),
      count = Math.ceil(
        tuning.sprayBase *
          (c.projectileMultiplier ?? (c.variant === "crazed" ? 7.5 : 2.5)),
      ),
      waves = Math.ceil(count / tuning.spraySpokes);
    for (let wave = 0; wave < waves; wave++) {
      const crossing = wave >= 5,
        turn = crossing ? (wave % 2 ? 1 : -1) * tuning.sprayTurn : 0,
        angles = Array.from(
          {
            length: Math.min(
              tuning.spraySpokes,
              count - wave * tuning.spraySpokes,
            ),
          },
          (_, n) =>
            angle +
            turn +
            (n < 3 ? -1 : 1) *
              (tuning.sprayHalfGap + (n % 3) * tuning.sprayStep),
        ),
        at = now + ticks(tuning.sprayWarning + wave * tuning.sprayWaveGap);
      this.sprays.push({
        kind: "mold-spray",
        id: c.id(),
        x: origin.x,
        y: origin.y,
        angles,
        wave,
        waves,
        crossing,
        beganAt: now,
        at,
        until: at + 6,
      });
    }
    this.stage = "spray";
    this.until = this.sprays.at(-1)!.at + ticks(0.5);
    c.warn?.();
  }
  private rest(now: number) {
    this.stage = "idle";
    this.nextSignatureAt = now + ticks(tuning.restSeconds);
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.reset(c.tick + ticks(0.8));
      return;
    }
    if (this.phase >= 0 && c.phase !== this.phase)
      this.reset(c.tick + ticks(1.5));
    this.phase = c.phase;
    const now = c.tick,
      walls = moldWalls(c);
    this.pools = this.pools.filter((p) => p.until > now);
    this.sprays = this.sprays.filter((p) => {
      if (p.until > now) return true;
      this.emitted.delete(p.id);
      return false;
    });
    for (const p of this.pools)
      if (!p.drainedAt && now >= p.at)
        for (const target of c.targets)
          if (
            segmentCircle(
              now === p.at ? target : { x: target.oldX, y: target.oldY },
              target,
              p,
              p.radius + 9,
            ) !== null
          ) {
            const key = target.id;
            if (now >= (this.contacts.get(key) ?? 0)) {
              this.contacts.set(key, now + ticks(tuning.poolContactSeconds));
              c.damage(target.id, tuning.poolDamage * c.damageScale);
            }
          }
    for (const key of this.contacts.keys())
      if (!this.pools.length || !c.targets.some((p) => p.id === key))
        this.contacts.delete(key);
    for (const q of this.sprays)
      if (now >= q.at && !this.emitted.has(q.id)) {
        this.emitted.add(q.id);
        for (const angle of q.angles)
          c.emitControlled?.(
            q,
            angle,
            tuning.spraySpeed,
            tuning.sprayDamage * c.damageScale,
            5,
          );
      }
    if (this.stage === "walk" && this.walk && now >= this.walk.at) {
      const w = this.walk;
      let budget = w.speed * DT,
        blocked = false;
      while (budget > 0.001 && w.index < w.path.length) {
        const point = w.path[w.index],
          length = distance(c.boss, point),
          travel = Math.min(length, budget),
          next = length
            ? {
                x: c.boss.x + ((point.x - c.boss.x) * travel) / length,
                y: c.boss.y + ((point.y - c.boss.y) * travel) / length,
              }
            : { ...point };
        if (!clear(c.boss, next, walls, c.radius)) {
          blocked = true;
          break;
        }
        c.boss.x = next.x;
        c.boss.y = next.y;
        budget -= travel;
        if (length <= travel + 0.001) w.index++;
      }
      if (blocked) {
        this.walk = null;
        this.rest(now);
      } else if (w.index >= w.path.length) this.culture(c);
    } else if (this.stage === "culture" && now >= this.until) {
      if (this.legs) this.startFront(c);
      else this.spray(c);
    } else if (this.stage === "front" && this.front && now >= this.front.at) {
      const q = this.front;
      q.oldX = q.x;
      q.oldY = q.y;
      const frameBudget = q.speed * DT;
      let budget = frameBudget,
        blocked = false;
      while (budget > 0.001 && q.index < q.path.length) {
        const point = q.path[q.index],
          length = distance(q, point),
          travel = Math.min(length, budget),
          next = length
            ? {
                x: q.x + ((point.x - q.x) * travel) / length,
                y: q.y + ((point.y - q.y) * travel) / length,
              }
            : { ...point };
        if (!clear(q, next, walls, q.radius)) {
          blocked = true;
          break;
        }
        for (const target of c.targets) {
          const first = now === q.at,
            oldX = first ? target.x : target.oldX,
            oldY = first ? target.y : target.oldY,
            t0 = (frameBudget - budget) / frameBudget,
            t1 = (frameBudget - budget + travel) / frameBudget,
            from = {
              x: q.x - oldX - (target.x - oldX) * t0,
              y: q.y - oldY - (target.y - oldY) * t0,
            },
            to = {
              x: next.x - oldX - (target.x - oldX) * t1,
              y: next.y - oldY - (target.y - oldY) * t1,
            };
          if (
            !this.frontHits.has(target.id) &&
            segmentCircle(from, to, { x: 0, y: 0 }, q.radius + 9) !== null
          ) {
            this.frontHits.add(target.id);
            c.damage(target.id, tuning.frontDamage * c.damageScale);
          }
        }
        if (q.draining)
          for (const p of this.pools)
            if (!p.drainedAt && segmentCircle(q, next, p, p.radius) !== null) {
              p.drainedAt = now;
              p.until = Math.min(p.until, now + ticks(0.9));
            }
        q.x = next.x;
        q.y = next.y;
        budget -= travel;
        if (length <= travel + 0.001) q.index++;
      }
      if (blocked) {
        this.front = null;
        this.spray(c);
      } else if (q.index >= q.path.length) {
        this.front = null;
        if (this.leg < this.legs) {
          this.stage = "gap";
          this.until = now + ticks(tuning.frontGap);
        } else this.spray(c);
      }
    } else if (this.stage === "gap" && now >= this.until) this.startFront(c);
    else if (this.stage === "spray" && now >= this.until) this.rest(now);
    if (
      this.stage === "idle" &&
      now >= this.nextSignatureAt &&
      !c.auxiliaryBusy
    ) {
      const targets = c.aimTargets ?? c.targets;
      this.begin(
        c,
        targets[this.cycle % Math.max(1, targets.length)] ?? c.boss,
      );
    }
  }
}
