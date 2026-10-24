import { DT, HZ, type BossId, type Vec } from './protocol.ts';
import { clamp, distance, moveBody, segmentCircle, segmentRect, type Rect } from './geometry.ts';
import type { BossCue, SignatureContext } from './boss-director.ts';

export type CivicCue =
  | {
      kind: 'wheel';
      id: number;
      x: number;
      y: number;
      radius: number;
      path: Vec[];
      at: number;
      until: number;
      rotation: number;
    }
  | {
      kind: 'chain';
      id: number;
      x: number;
      y: number;
      radius: number;
      health: number;
      maxHealth: number;
      angle: number;
      startAngle: number;
      sweep: number;
      length: number;
      width: number;
      at: number;
      until: number;
    }
  | {
      kind: 'gate';
      id: number;
      x: number;
      y: number;
      width: number;
      height: number;
      open: boolean;
      lane: number;
      at: number;
      until: number;
    }
  | { kind: 'driver'; id: number; x: number; y: number; radius: number; at: number; until: number };
type Wheel = Extract<CivicCue, { kind: 'wheel' }> & { leg: number; speed: number; damage: number };
type Chain = Extract<CivicCue, { kind: 'chain' }>;
type Gate = Extract<CivicCue, { kind: 'gate' }>;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const civicBossIds = [
  'tollkeeper',
  'chain-marshal',
  'gate-widow',
  'black-ambulance',
] as const;

// The same slab rectangles drive authoritative movement, prediction and shot cover.
export function gateObstacles(cues: BossCue[], now: number): Rect[] {
  return cues
    .filter((c): c is Gate => c.kind === 'gate' && !c.open && now >= c.at && now < c.until)
    .map(({ x, y, width, height }) => ({ x, y, width, height }));
}
export function leaveClosingGates(position: Vec, gates: Rect[], radius: number): Vec {
  let next = { ...position };
  for (const gate of gates) {
    if (
      next.x <= gate.x - radius ||
      next.x >= gate.x + gate.width + radius ||
      next.y <= gate.y - radius ||
      next.y >= gate.y + gate.height + radius
    )
      continue;
    // Gates are horizontal shutters. Eject to the nearer clear side, preserving x;
    // nobody is trapped inside newly solid geometry or teleported through cover.
    const upper = gate.y - radius - 0.1,
      lower = gate.y + gate.height + radius + 0.1;
    next.y = Math.abs(next.y - upper) < Math.abs(next.y - lower) ? upper : lower;
  }
  return next;
}

export class CivicDirector {
  private kind: BossId = 'constable';
  private wheels: Wheel[] = [];
  private chains: Chain[] = [];
  private gates: Gate[] = [];
  private nextAt = 0;
  private openLane = 0;
  private contacts = new Map<string, number>();
  private driving = false;
  private station = 0;
  private recoveryUntil = 0;
  private driverId = 0;
  private origin: Vec = { x: 800, y: 250 };

  reset(kind: BossId) {
    this.kind = kind;
    this.wheels = [];
    this.chains = [];
    this.gates = [];
    this.nextAt = 0;
    this.contacts.clear();
    this.driving = false;
    this.recoveryUntil = 0;
    this.driverId = 0;
    // Lane rotation survives phase/Accord cancellation; a new encounter gets a
    // new director through beginEncounter()'s explicit resetEncounter().
  }
  resetEncounter(kind: BossId) {
    this.reset(kind);
    this.openLane = 0;
    this.station = 0;
  }
  get recovering() {
    return this.recoveryUntil > 0;
  }
  hit(id: number, amount: number) {
    const chain = this.chains.find((c) => c.id === id && c.health > 0);
    if (!chain) return 0;
    const actual = Math.min(chain.health, amount);
    chain.health -= actual;
    return actual;
  }
  weakPoints() {
    return this.chains.filter((c) => c.health > 0).map((c) => ({ ...c }));
  }
  cues(): CivicCue[] {
    return [
      ...this.wheels.map(({ leg: _leg, speed: _speed, damage: _damage, ...cue }) => ({
        ...cue,
        path: cue.path.map((p) => ({ ...p })),
      })),
      ...this.chains.map((c) => ({ ...c })),
      ...this.gates.map((c) => ({ ...c })),
      ...(this.recoveryUntil
        ? [
            {
              kind: 'driver' as const,
              id: this.driverId,
              x: this.origin.x,
              y: this.origin.y - 35,
              radius: 28,
              at: 0,
              until: this.recoveryUntil,
            },
          ]
        : []),
    ];
  }
  solids(tick: number) {
    return gateObstacles(this.gates, tick);
  }
  private touch(context: SignatureContext, id: string, key: string, amount: number) {
    const contact = key + ':' + id;
    if (context.tick < (this.contacts.get(contact) ?? 0)) return;
    context.damage(id, amount * context.damageScale);
    this.contacts.set(contact, context.tick + ticks(0.5));
  }
  private ray(context: SignatureContext, from: Vec, direction: Vec, radius: number) {
    const to = { x: from.x + direction.x * 3000, y: from.y + direction.y * 3000 };
    // World boundaries participate even in arenas without masonry edges.
    const walls: Rect[] = [
      ...context.obstacles,
      { x: -100, y: -100, width: 100, height: 1200 },
      { x: 1600, y: -100, width: 100, height: 1200 },
      { x: -100, y: -100, width: 1800, height: 100 },
      { x: -100, y: 1000, width: 1800, height: 100 },
    ];
    let first: { t: number; normal: Vec } | null = null;
    for (const wall of walls) {
      const hit = segmentRect(from, to, wall, radius);
      if (hit && hit.t > 1e-7 && (!first || hit.t < first.t)) first = hit;
    }
    const t = first ? Math.max(0, first.t - 0.00001) : 1;
    return {
      point: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
      normal: first?.normal ?? { x: 0, y: -1 },
    };
  }
  private startWheel(context: SignatureContext) {
    if (this.wheels.length) return;
    const target = context.targets[context.phase % context.targets.length];
    const angle = Math.atan2(target.y - context.boss.y, target.x - context.boss.x);
    const d = { x: Math.cos(angle), y: Math.sin(angle) };
    const bounce = this.ray(context, context.boss, d, 42);
    const dot = d.x * bounce.normal.x + d.y * bounce.normal.y;
    const reflected = { x: d.x - 2 * dot * bounce.normal.x, y: d.y - 2 * dot * bounce.normal.y };
    const end = this.ray(context, bounce.point, reflected, 42).point;
    const length = distance(context.boss, bounce.point) + distance(bounce.point, end);
    const speed = 260 * (1 + context.phase * 0.07);
    const at = context.tick + ticks(1.2);
    this.wheels.push({
      kind: 'wheel',
      id: context.id(),
      x: context.boss.x,
      y: context.boss.y,
      radius: 42,
      path: [{ ...context.boss }, bounce.point, end],
      at,
      until: at + Math.ceil(length / (speed * DT)) + 1,
      rotation: 0,
      leg: 1,
      speed,
      damage: 15,
    });
  }
  private startChains(context: SignatureContext) {
    if (this.chains.length) return;
    const at = context.tick + ticks(1.4),
      length = 610;
    for (const [i, x] of [600, 1000].entries()) {
      const health = 90 * (context.brutal ? 2 : 1);
      const startAngle = ((i === 0 ? 10 : 90) * Math.PI) / 180;
      this.chains.push({
        kind: 'chain',
        id: context.id(),
        x,
        y: 340,
        radius: 27,
        health,
        maxHealth: health,
        angle: startAngle,
        startAngle,
        sweep: (80 * Math.PI) / 180,
        length,
        width: 18,
        at,
        until: at + ticks(2.5),
      });
    }
  }
  private startGates(context: SignatureContext) {
    if (this.gates.length) return;
    const at = context.tick + ticks(1.5);
    for (let lane = 0; lane < 3; lane++)
      this.gates.push({
        kind: 'gate',
        id: context.id(),
        x: 200 + lane * 400,
        y: 615,
        width: 400,
        height: 48,
        open: lane === this.openLane,
        lane,
        at,
        until: at + ticks(3.5),
      });
    this.openLane = (this.openLane + 1) % 3;
  }
  private drive(context: SignatureContext, charging: boolean) {
    if (this.driving && !charging) {
      this.driving = false;
      this.recoveryUntil = context.tick + ticks(3);
      this.driverId = context.id();
    }
    if (charging) {
      this.driving = true;
      return;
    }
    if (this.recoveryUntil && context.tick < this.recoveryUntil) return;
    this.recoveryUntil = 0;
    const stations = [
      { x: 800, y: 250 },
      { x: 1365, y: 250 },
      { x: 1365, y: 700 },
      { x: 1325, y: 700 },
      { x: 1325, y: 790 },
      { x: 800, y: 800 },
      { x: 275, y: 790 },
      { x: 275, y: 700 },
      { x: 240, y: 700 },
      { x: 240, y: 300 },
      { x: 240, y: 250 },
    ];
    const goal = stations[this.station % stations.length];
    if (distance(context.boss, goal) < 8) this.station = (this.station + 1) % stations.length;
    const d = distance(context.boss, goal) || 1;
    const next = moveBody(
      context.boss,
      {
        x: ((goal.x - context.boss.x) / d) * 140 * DT,
        y: ((goal.y - context.boss.y) / d) * 140 * DT,
      },
      context.radius,
      context.obstacles,
    );
    context.boss.x = next.x;
    context.boss.y = next.y;
  }
  step(context: SignatureContext, charging: boolean) {
    if (!civicBossIds.includes(context.bossId as (typeof civicBossIds)[number])) return;
    if (context.bossId === 'black-ambulance') this.drive(context, charging);
    this.origin = { ...context.boss };
    if (context.targets.length && (!this.nextAt || context.tick >= this.nextAt)) {
      if (context.bossId === 'tollkeeper') this.startWheel(context);
      if (context.bossId === 'chain-marshal') this.startChains(context);
      if (context.bossId === 'gate-widow') this.startGates(context);
      const cycle =
        context.bossId === 'tollkeeper' ? 7 : context.bossId === 'chain-marshal' ? 9 : 8;
      this.nextAt = context.tick + ticks(cycle * (context.brutal ? 0.9 : 1));
    }
    for (const wheel of this.wheels) {
      if (context.tick < wheel.at) continue;
      const old = { x: wheel.x, y: wheel.y };
      let remaining = wheel.speed * DT;
      while (remaining > 0 && wheel.leg < wheel.path.length) {
        const end = wheel.path[wheel.leg],
          d = distance(wheel, end),
          travel = Math.min(d, remaining);
        const next = {
          x: wheel.x + ((end.x - wheel.x) / (d || 1)) * travel,
          y: wheel.y + ((end.y - wheel.y) / (d || 1)) * travel,
        };
        for (const target of context.targets)
          if (
            segmentCircle(
              { x: target.oldX - wheel.x, y: target.oldY - wheel.y },
              { x: target.x - next.x, y: target.y - next.y },
              { x: 0, y: 0 },
              wheel.radius + 9,
            ) !== null
          )
            this.touch(context, target.id, 'wheel-' + wheel.id, wheel.damage);
        wheel.x = next.x;
        wheel.y = next.y;
        remaining -= travel;
        if (d <= travel + 0.00001) wheel.leg++;
        else break;
      }
      wheel.rotation += distance(old, wheel) / wheel.radius;
      if (wheel.leg >= wheel.path.length) wheel.until = context.tick;
    }
    for (const chain of this.chains) {
      if (chain.health <= 0 || context.tick < chain.at) continue;
      const previous = chain.angle;
      chain.angle =
        chain.startAngle + chain.sweep * clamp((context.tick - chain.at) / ticks(2.5), 0, 1);
      // Sample the swept angular interval at <=2px tip travel. This includes
      // a dodging player's whole old-to-new segment, not just its endpoint.
      const steps = Math.max(1, Math.ceil((Math.abs(chain.angle - previous) * chain.length) / 2));
      for (const target of context.targets)
        for (let n = 0; n <= steps; n++) {
          const angle = previous + ((chain.angle - previous) * n) / steps;
          const end = {
            x: chain.x + Math.cos(angle) * chain.length,
            y: chain.y + Math.sin(angle) * chain.length,
          };
          // Relative swept movement against a chain segment, evaluated at <=2px
          // player travel as well; bounded by the authoritative movement cap.
          const movement = Math.max(
            1,
            Math.ceil(Math.hypot(target.x - target.oldX, target.y - target.oldY) / 2),
          );
          let hit = false;
          for (let m = 0; m <= movement; m++)
            if (
              segmentCircle(
                chain,
                end,
                {
                  x: target.oldX + ((target.x - target.oldX) * m) / movement,
                  y: target.oldY + ((target.y - target.oldY) * m) / movement,
                },
                chain.width / 2 + 9,
              ) !== null
            ) {
              hit = true;
              break;
            }
          if (hit) {
            this.touch(context, target.id, 'chain-' + chain.id, 9);
            break;
          }
        }
    }
    for (const gate of this.gates)
      if (!gate.open && context.tick === gate.at)
        for (const target of context.targets)
          if (segmentRect({ x: target.oldX, y: target.oldY }, target, gate, 9))
            this.touch(context, target.id, 'gate-' + gate.id, 14);
    this.wheels = this.wheels.filter((w) => context.tick < w.until);
    this.chains = this.chains.filter((c) => context.tick < c.until);
    this.gates = this.gates.filter((g) => context.tick < g.until);
  }
}
