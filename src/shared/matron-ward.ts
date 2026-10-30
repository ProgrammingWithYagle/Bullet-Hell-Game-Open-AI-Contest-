import tuning from "./matron-ward-rules.json";
import { DT, HZ, type Vec } from "./protocol.ts";
import { distance, segmentRect, type Rect } from "./geometry.ts";
import type { SignatureContext } from "./boss-director.ts";
export const matronRules = tuning;
type Life = { id: number; beganAt: number; at: number; until: number };
export type MatronNest = Life &
  Vec & {
    kind: "service-prop";
    role: "nest";
    radius: number;
    health: number;
    maxHealth: number;
    nextAt: number;
    index: number;
  };
export type MatronWalk = Life & {
  kind: "matron-walk";
  path: Vec[];
  index: number;
  speed: number;
};
export type MatronBrood = Life &
  Vec & {
    kind: "matron-brood";
    sourceId: number;
    count: number;
    index: number;
  };
export type MatronPulse = Life &
  Vec & {
    kind: "matron-pulse";
    sourceId: number;
    index: number;
    radius: number;
    oldRadius: number;
    speed: number;
    width: number;
    gap: number;
    gapAngle: number;
    damage: number;
  };
export type MatronNeedles = Life &
  Vec & {
    kind: "matron-needles";
    sourceId: number;
    index: number;
    angles: number[];
    crossing: boolean;
    wave: number;
    waves: number;
  };
export type MatronCue =
  MatronNest | MatronWalk | MatronBrood | MatronPulse | MatronNeedles;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
const bounds = (c: SignatureContext) =>
  c.bounds ?? { x: 0, y: 0, width: 1600, height: 1000 };
/** Conservative lava rectangles and real offset bounds constrain body and nest placement. */
export function matronWalls(c: SignatureContext): Rect[] {
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
/** A connected escort route toward a locked flank, not a straight line through cover. */
export function matronPath(
  c: SignatureContext,
  target: Vec,
  late: boolean,
  cycle: number,
): Vec[] {
  const b = bounds(c),
    pad = c.radius + tuning.bodyClearance,
    step = tuning.gridSpacing,
    walls = matronWalls({...c,obstacles:c.bodyObstacles??c.obstacles}),
    nx = Math.floor((b.width - pad * 2) / step) + 1,
    ny = Math.floor((b.height - pad * 2) / step) + 1;
  if (nx < 1 || ny < 1 || nx * ny > 2000) return [{ ...c.boss }];
  const nodes = Array.from({ length: nx * ny }, (_, i) => ({
      x: b.x + pad + (i % nx) * step,
      y: b.y + pad + Math.floor(i / nx) * step,
    })),
    valid = nodes.map((p) => clear(p, p, walls, c.radius)),
    parent = new Int32Array(nodes.length).fill(-2),
    cost = new Float64Array(nodes.length).fill(Infinity),
    queue: number[] = [];
  for (let i = 0; i < nodes.length; i++)
    if (
      valid[i] &&
      distance(c.boss, nodes[i]) <= step * 2.5 &&
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
        clear(nodes[i], nodes[j], walls, c.radius)
      ) {
        parent[j] = i;
        cost[j] = cost[i] + step;
        queue.push(j);
      }
  }
  const angle = Math.atan2(target.y - c.boss.y, target.x - c.boss.x),
    side = (cycle % 2 ? 1 : -1) * (late ? -1 : 1),
    goal = {
      x:
        target.x -
        Math.cos(angle) * (late ? 170 : 220) -
        Math.sin(angle) * side * 155,
      y:
        target.y -
        Math.sin(angle) * (late ? 170 : 220) +
        Math.cos(angle) * side * 155,
    };
  const choices = queue
      .filter(
        (i) => cost[i] >= tuning.minimumWalk && cost[i] <= tuning.maximumWalk,
      )
      .toSorted(
        (a, z) =>
          distance(nodes[a], goal) - distance(nodes[z], goal) ||
          cost[a] - cost[z],
      ),
    best = choices[0] ?? queue.toSorted((a, z) => cost[z] - cost[a])[0];
  if (best === undefined) return [{ ...c.boss }];
  const reverse: Vec[] = [];
  for (let i = best; i >= 0; i = parent[i]) reverse.push(nodes[i]);
  const path = [{ ...c.boss }, ...reverse.reverse()];
  return path.filter(
    (p, i) =>
      !i ||
      i === path.length - 1 ||
      Math.abs(
        (p.x - path[i - 1].x) * (path[i + 1].y - p.y) -
          (p.y - path[i - 1].y) * (path[i + 1].x - p.x),
      ) > 0.01,
  );
}
/** Includes swept radial and body motion; the marked gap leaves full body clearance. */
export function matronRingContact(
  from: Vec,
  to: Vec,
  ring: Pick<
    MatronPulse,
    "x" | "y" | "oldRadius" | "radius" | "width" | "gapAngle" | "gap"
  >,
  body = 9,
) {
  const steps = Math.max(
    1,
    Math.ceil(
      (distance(from, to) + Math.abs(ring.radius - ring.oldRadius)) / 2,
    ),
  );
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      x = from.x + (to.x - from.x) * t - ring.x,
      y = from.y + (to.y - from.y) * t - ring.y,
      r = ring.oldRadius + (ring.radius - ring.oldRadius) * t,
      d = Math.hypot(x, y);
    if (Math.abs(d - r) > ring.width / 2 + body + 2) continue;
    const pad = Math.asin(Math.min(1, (body + 2) / Math.max(d, body + 2))),
      delta = Math.atan2(
        Math.sin(Math.atan2(y, x) - ring.gapAngle),
        Math.cos(Math.atan2(y, x) - ring.gapAngle),
      );
    if (Math.abs(delta) < ring.gap / 2 - pad) continue;
    return true;
  }
  return false;
}
export class MatronWard {
  private nests: MatronNest[] = [];
  private walk: MatronWalk | null = null;
  private broods: MatronBrood[] = [];
  private pulses: MatronPulse[] = [];
  private needles: MatronNeedles[] = [];
  private emitted = new Set<number>();
  private broodSpeeds = new Map<number, number>();
  private hits = new Map<number, Set<string>>();
  private stage: "idle" | "walk" | "relay" = "idle";
  private cycle = 0;
  private late = false;
  private phase = -1;
  private plannedNest = 0;
  private releaseUntil = 0;
  nextSignatureAt = 0;
  get busy() {
    return this.stage !== "idle";
  }
  reset(until = 0, encounter = false) {
    this.nests = [];
    this.walk = null;
    this.broods = [];
    this.pulses = [];
    this.needles = [];
    this.emitted.clear();
    this.broodSpeeds.clear();
    this.hits.clear();
    this.stage = "idle";
    this.nextSignatureAt = until;
    this.phase = -1;
    this.plannedNest = 0;
    this.releaseUntil = 0;
    if (encounter) this.cycle = 0;
  }
  cues(): MatronCue[] {
    return [
      ...this.nests.map((n) => ({ ...n })),
      ...(this.walk
        ? [{ ...this.walk, path: this.walk.path.map((p) => ({ ...p })) }]
        : []),
      ...this.broods.map((p) => ({ ...p })),
      ...this.pulses.map((p) => ({ ...p })),
      ...this.needles.map((p) => ({ ...p, angles: [...p.angles] })),
    ];
  }
  weakPoints() {
    return this.nests.filter((p) => p.health > 0);
  }
  hit(id: number, amount: number) {
    const n = this.nests.find((n) => n.id === id);
    if (!n) return 0;
    const actual = Math.min(n.health, Math.max(0, amount));
    n.health -= actual;
    return actual;
  }
  private nestPoint(c: SignatureContext, end: Vec): Vec | null {
    const b = bounds(c),
      r = tuning.nestRadius + 2,
      walls = matronWalls(c),
      choices: Vec[] = [];
    for (let y = b.y + r + 1; y <= b.y + b.height - r - 1; y += 32)
      for (let x = b.x + r + 1; x <= b.x + b.width - r - 1; x += 32) {
        const p = { x, y },
          d = distance(end, p);
        if (
          d >= 82 &&
          d <= 175 &&
          clear(p, p, walls, r) &&
          this.nests.every((n) => n.health <= 0 || distance(p, n) >= 95)
        )
          choices.push(p);
      }
    return (
      choices.toSorted(
        (a, z) =>
          Math.abs(distance(a, end) - 105) - Math.abs(distance(z, end) - 105) ||
          a.y - z.y ||
          a.x - z.x,
      )[0] ?? null
    );
  }
  cast(c: SignatureContext, target: Vec) {
    if (this.busy || c.tick < this.nextSignatureAt || c.paused || c.auxiliaryBusy) return true;
    this.begin(c, target);
    return true;
  }
  private begin(c: SignatureContext, target: Vec) {
    // Replacing a nest cannot revoke a brood/needle/relay that already warned.
    // If every slot is committed, finish those releases before admitting a new walk.
    const retirement = this.nests.find(n => ![...this.broods, ...this.needles, ...this.pulses]
      .some(q => q.sourceId === n.id && q.at > c.tick));
    if (this.nests.length >= tuning.nestMaximum && !retirement) {
      this.nextSignatureAt = c.tick + 1;
      return;
    }
    this.phase = c.phase;
    this.late = c.phase > 0;
    const now = c.tick,
      path = matronPath(c, target, this.late, this.cycle++),
      length = path
        .slice(1)
        .reduce((sum, p, i) => sum + distance(path[i], p), 0),
      speed =
        (this.late ? tuning.lateWalkSpeed : tuning.walkSpeed) *
        Math.min(1.75, Math.max(0.5, c.movementSpeedScale ?? 1)),
      at = now + ticks(tuning.walkWarningSeconds),
      until = at + Math.ceil(length / (speed * DT)) + 1;
    this.walk = {
      kind: "matron-walk",
      id: c.id(),
      path,
      index: 1,
      speed,
      beganAt: now,
      at,
      until,
    };
    this.stage = "walk";
    this.nests = this.nests.filter((n) => n.health > 0);
    if (this.nests.length >= tuning.nestMaximum) {
      const old = retirement!;
      this.nests = this.nests.filter(n => n.id !== old.id);
      this.broods = this.broods.filter(q => {
        if(q.sourceId !== old.id)return true;
        this.emitted.delete(q.id);this.broodSpeeds.delete(q.id);return false;
      });
    }
    const point = this.nestPoint(c, path.at(-1)!);
    this.plannedNest = 0;
    if (point) {
      const health = tuning.nestHealth * (c.brutal ? 2 : 1),
        nestAt = Math.max(now + ticks(tuning.broodWarningSeconds), until);
      const n: MatronNest = {
        kind: "service-prop",
        role: "nest",
        id: c.id(),
        ...point,
        radius: tuning.nestRadius,
        health,
        maxHealth: health,
        index: (this.cycle - 1) % 3,
        beganAt: now,
        at: nestAt,
        until: 1e12,
        nextAt: nestAt,
      };
      this.nests.push(n);
      this.plannedNest = n.id;
    }
    c.warn?.();
  }
  private relay(c: SignatureContext) {
    const now = c.tick,
      live = this.nests.filter((n) => n.health > 0),
      sources = this.late
        ? live
        : live.filter((n) => n.id === this.plannedNest),
      origins = sources.length ? sources : [{ ...c.boss, id: 0, index: 0 }],
      targets = c.aimTargets ?? c.targets;
    let last = now + ticks(tuning.pulseWarningSeconds);
    for (let i = 0; i < origins.length; i++) {
      const origin = origins[i],
        target =
          targets[(this.cycle + i) % Math.max(1, targets.length)] ?? c.boss,
        angle = Math.atan2(target.y - origin.y, target.x - origin.x),
        at = now + ticks(tuning.pulseWarningSeconds + i * tuning.relaySeconds),
        speed = this.late ? tuning.latePulseSpeed : tuning.pulseSpeed,
        b = bounds(c),
        pulse: MatronPulse = {
          kind: "matron-pulse",
          id: c.id(),
          x: origin.x,
          y: origin.y,
          sourceId: origin.id,
          index: i,
          beganAt: now,
          at,
          until: at + ticks(Math.hypot(b.width, b.height) / speed + 0.3),
          radius: 0,
          oldRadius: 0,
          speed,
          width: tuning.pulseWidth,
          gap: (tuning.gapDegrees * Math.PI) / 180,
          gapAngle: angle,
          damage: tuning.pulseDamage,
        };
      this.pulses.push(pulse);
      this.hits.set(pulse.id, new Set());
      last = Math.max(last, at + ticks(0.65));
      if (c.brutal) {
        const count = Math.ceil(
            tuning.needleBaseCount *
              (c.projectileMultiplier ?? (c.variant === "crazed" ? 7.5 : 2.5)),
          ),
          waves = Math.ceil(count / tuning.needleSpokes),
          first = at + ticks(tuning.needleWarningSeconds);
        for (let wave = 0; wave < waves; wave++) {
          const crossing = wave >= 5,
            turn = crossing ? (wave % 2 ? 1 : -1) * tuning.crossingTurn : 0,
            angles = Array.from(
              {
                length: Math.min(
                  tuning.needleSpokes,
                  count - wave * tuning.needleSpokes,
                ),
              },
              (_, n) =>
                angle +
                turn +
                (n < 3 ? -1 : 1) *
                  (tuning.needleHalfGap + (n % 3) * tuning.needleStep),
            ),
            emitAt = first + ticks(wave * tuning.needleWaveSeconds),
            side = wave % 2 ? 1 : -1;
          this.needles.push({
            kind: "matron-needles",
            id: c.id(),
            x: origin.x - Math.sin(angle) * side * 12,
            y: origin.y + Math.cos(angle) * side * 12,
            sourceId: origin.id,
            index: i,
            beganAt: now,
            at: emitAt,
            until: emitAt + 6,
            angles,
            crossing,
            wave,
            waves,
          });
          last = Math.max(last, emitAt + ticks(0.5));
        }
      }
    }
    this.walk = null;
    this.stage = "relay";
    this.releaseUntil = last;
    c.warn?.();
  }
  step(c: SignatureContext) {
    if (c.paused) {
      this.reset(c.tick + ticks(0.8));
      return;
    }
    const nextContext = c;
    if (this.busy) c = { ...c, phase: this.phase };
    const now = c.tick,
      walls = matronWalls(c);
    this.nests = this.nests.filter(
      (n) => n.health > 0 && clear(n, n, walls, n.radius),
    );
    const live = new Set(this.nests.map((n) => n.id));
    this.broods = this.broods.filter((q) => {
      const keep = q.until > now && live.has(q.sourceId);
      if (!keep) { this.emitted.delete(q.id); this.broodSpeeds.delete(q.id); }
      return keep;
    });
    this.needles = this.needles.filter((q) => {
      const keep = q.until > now && (!q.sourceId || live.has(q.sourceId));
      if (!keep) this.emitted.delete(q.id);
      return keep;
    });
    this.pulses = this.pulses.filter((q) => {
      const keep =
        q.until > now && (now >= q.at || !q.sourceId || live.has(q.sourceId));
      if (!keep) this.hits.delete(q.id);
      return keep;
    });
    for (const n of this.nests) {
      if (
        now >= n.nextAt - ticks(tuning.broodWarningSeconds) &&
        !this.broods.some((q) => q.sourceId === n.id && q.at >= now)
      ) {
        const at = Math.max(n.nextAt, now + ticks(tuning.broodWarningSeconds));
        n.nextAt = at;
        this.broods.push({
          kind: "matron-brood",
          id: c.id(),
          x: n.x,
          y: n.y,
          sourceId: n.id,
          index: n.index,
          count: c.phase > 0 ? tuning.lateBrood : tuning.earlyBrood,
          beganAt: now,
          at,
          until: at + 6,
        });
        this.broodSpeeds.set(this.broods.at(-1)!.id, 80 + c.phase * 6);
      }
    }
    for (const q of this.broods)
      if (now >= q.at && !this.emitted.has(q.id)) {
        this.emitted.add(q.id);
        const n = this.nests.find((n) => n.id === q.sourceId)!;
        n.nextAt = now + ticks(tuning.broodIntervalSeconds);
        const spots = [
          [-12, -12],
          [12, 12],
          [-12, 12],
          [12, -12],
        ];
        for (let i = 0; i < q.count; i++) {
          const p = { x: n.x + spots[i][0], y: n.y + spots[i][1] };
          c.spawnOrdinary?.(
            p,
            this.broodSpeeds.get(q.id)!,
            tuning.minionHealth,
            tuning.minionDamage * c.damageScale,
            tuning.minionMaximum,
          );
        }
      }
    for (const q of this.pulses)
      if (now >= q.at) {
        q.oldRadius = q.radius;
        q.radius = (now - q.at) * DT * q.speed;
        const hit = this.hits.get(q.id)!;
        for (const p of c.targets) {
          const from =
            now === q.at ? { x: p.x, y: p.y } : { x: p.oldX, y: p.oldY };
          if (!hit.has(p.id) && matronRingContact(from, p, q)) {
            hit.add(p.id);
            c.damage(p.id, q.damage * c.damageScale);
          }
        }
      }
    for (const q of this.needles)
      if (now >= q.at && !this.emitted.has(q.id)) {
        this.emitted.add(q.id);
        for (const angle of q.angles)
          c.emitControlled?.(
            q,
            angle,
            tuning.needleSpeed,
            tuning.needleDamage * c.damageScale,
            tuning.needleRadius,
          );
      }
    // Retired transient cues also retire their once-only bookkeeping.
    const transient = new Set(
      [...this.broods, ...this.needles].map((q) => q.id),
    );
    for (const id of this.emitted)
      if (!transient.has(id)) this.emitted.delete(id);
    if (this.stage === "walk" && this.walk && now >= this.walk.at) {
      const w = this.walk;
      let budget = w.speed * DT,
        interrupted = false;
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
        if (!clear(c.boss, next, [...walls,...(c.bodyObstacles??[])], c.radius)) {
          interrupted = true;
          break;
        }
        c.boss.x = next.x;
        c.boss.y = next.y;
        budget -= travel;
        if (length <= travel + 0.001) w.index++;
      }
      if (interrupted || w.index >= w.path.length) {
        if (interrupted)
          this.nests = this.nests.filter((n) => n.id !== this.plannedNest);
        this.relay(c);
      }
    }
    if (this.stage === "relay" && now >= this.releaseUntil) {
      this.stage = "idle";
      this.nextSignatureAt = now + ticks(tuning.restSeconds);
    }
    if (
      this.stage === "idle" &&
      now >= this.nextSignatureAt &&
      !c.auxiliaryBusy
    ) {
      const targets = c.aimTargets ?? c.targets;
      this.begin(
        nextContext,
        targets[this.cycle % Math.max(1, targets.length)] ?? c.boss,
      );
    }
  }
}
