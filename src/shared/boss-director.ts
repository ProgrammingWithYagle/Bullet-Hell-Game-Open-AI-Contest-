import {SmallWakesDirector, type SmallWakesCue} from './small-wakes-director.ts';
import type {WardenCue} from './warden-patrol.ts';
import { EarlyWatchDirector, type EarlyWatchCue } from './early-watch-director.ts';
import {
  EndlessDirector,
  endlessSolids,
  type EndlessCue,
  type EndlessProp,
} from './endless-director.ts';
import { RaidDirector, type RaidCue } from './raid-director.ts';
import { DistrictDirector, type DistrictCue, type DistrictProp } from './district-director.ts';
import { ServiceDirector, type ServiceCue } from './service-director.ts';
// Authoritative signatures for the Courier, Ratcatcher and Quarantine Clerk.
// All targets lock at warning creation; rendering consumes these same cues.
import { CivicDirector, type CivicCue } from './civic-director.ts';
import { DT, HZ, type BossId, type Vec } from './protocol.ts';
import { clamp, distance, moveBody, segmentCircle, segmentRect, type Rect } from './geometry.ts';

import type { VariantPressureCue } from './variant-pressure.ts';
import type { EchoCue } from './brutal-volley.ts';
import type { ArenaLavaCue } from './arena-layouts.ts';
export type BossCue =
  | SmallWakesCue
  | WardenCue
  | EchoCue
  | VariantPressureCue
  | ArenaLavaCue
  | EarlyWatchCue
  | CivicCue
  | ServiceCue
  | DistrictCue
  | RaidCue
  | EndlessCue
  | {
      kind: 'charge' | 'scent';
      id: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      at: number;
      until: number;
      lane: number;
      interrupted: boolean;
    }
  | {
      kind: 'trail';
      id: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      until: number;
    }
  | {
      kind: 'stamp';
      id: number;
      x: number;
      y: number;
      radius: number;
      index: number;
      at: number;
      until: number;
      safeAt: number;
    }
  | {
      kind: 'sack';
      id: number;
      x: number;
      y: number;
      radius: number;
      health: number;
      maxHealth: number;
    };
type Lane = Extract<BossCue, { kind: 'charge' | 'scent' }>;
type Stamp = Extract<BossCue, { kind: 'stamp' }>;
export type SignatureContext = {
  paused?: boolean;
  hurtBoss?(amount: number, sourceId?: string): void;
  emitControlled?(
    position: Vec,
    angle: number,
    speed: number,
    damage: number,
    radius: number,
  ): number | undefined;
  controlShot?(id: number, vx: number, vy: number): boolean;
  removeHostile?(id: number): void;
  relocateBoss?(point: Vec): void;
  bossMaximumHealth?: number;
  interactors?: string[];
  spawnOrdinary?(
    position: Vec,
    speed: number,
    health: number,
    damage: number,
    maximum: number,
  ): void;
  emitHostile?(position: Vec, angle: number, speed: number, damage: number, radius: number): void;
  restore?(id: string, amount: number): void;
  tick: number;
  bossId: BossId;
  boss: Vec;
  radius: number;
  targets: (Vec & { id: string; oldX: number; oldY: number })[];
  obstacles: Rect[];
  bounds?: Rect;
  aimTargets?: (Vec & { id: string; oldX: number; oldY: number })[];
  damageScale: number;
  brutal: boolean;
  projectileMultiplier?: number;
  phase: number;
  id(): number;
  damage(id: string, amount: number): void;
  spawnRat(
    position: Vec,
    goal: Vec,
    speed: number,
    health: number,
    damage: number,
    maximum: number,
  ): void;
};
export type SignatureAttack = {
  speed: number;
  damage: number;
  telegraph: number;
};
const ticks = (seconds: number) => Math.ceil(seconds * HZ);

export class BossDirector {
  readonly smallWakes = new SmallWakesDirector();
  readonly earlyWatch = new EarlyWatchDirector();
  readonly civic = new CivicDirector();
  readonly services = new ServiceDirector();
  readonly district = new DistrictDirector();
  readonly raids = new RaidDirector();
  readonly endless = new EndlessDirector();
  solids(tick: number) {
    return [...this.civic.solids(tick), ...endlessSolids(this.endless.cues(), tick)];
  }
  weakPoints() {
    return [
      ...(this.weakPoint() ? [this.weakPoint()!] : []),
      ...this.smallWakes.weakPoints(),
      ...this.earlyWatch.weakPoints(),
      ...this.civic.weakPoints(),
      ...this.services.weakPoints(),
      ...this.district.weakPoints(),
      ...this.raids.weakPoints(),
      ...this.endless.weakPoints(),
    ];
  }
  private lanes: Lane[] = [];
  private stamps: Stamp[] = [];
  private packs: {
    lanes: Lane[];
    speed: number;
    damage: number;
    interrupted: boolean;
  }[] = [];
  private charge: {
    cue: Lane;
    origin: Vec;
    speed: number;
    damage: number;
    touched: Set<string>;
  } | null = null;
  private trails: {
    cue: Extract<BossCue, { kind: 'trail' }>;
    origin: Vec;
    direction: Vec;
    speed: number;
    started: number;
    length: number;
    damage: number;
  }[] = [];
  private contacts = new Map<string, number>();
  private kind: BossId = 'constable';
  private origin: Vec = { x: 800, y: 250 };
  private sackId = 0;
  private sackHealth = 65;
  private sackMaximum = 65;
  private blockPack = false;
  private restoreAt = 0;

  reset(kind: BossId, brutal = false, encounter = false) {
    this.smallWakes.reset(kind, encounter);
    this.earlyWatch.reset(kind, encounter);
    this.services.reset(kind, encounter);
    this.district.reset(kind, encounter);
    this.raids.reset(kind, encounter);
    this.endless.reset(kind, encounter);
    if (encounter) this.civic.resetEncounter(kind);
    else this.civic.reset(kind);
    this.kind = kind;
    this.lanes = [];
    this.stamps = [];
    this.packs = [];
    this.charge = null;
    this.trails = [];
    this.contacts.clear();
    this.blockPack = false;
    this.restoreAt = 0;
    this.sackId = 0;
    this.sackMaximum = 65 * (brutal ? 2 : 1);
    this.sackHealth = this.sackMaximum;
  }
  get charging() {
    return !!this.charge;
  }
  weakPoint(): Extract<BossCue, { kind: 'sack' }> | null {
    return this.kind === 'ratcatcher'
      ? {
          kind: 'sack',
          id: this.sackId,
          x: this.origin.x + 42,
          y: this.origin.y - 65,
          radius: 24,
          health: this.sackHealth,
          maxHealth: this.sackMaximum,
        }
      : null;
  }
  weakContact(from: Vec, to: Vec, weak: Vec & { kind: string; radius: number }, radius: number) {
    if (weak.kind === 'endless-prop')
      return this.endless.weakContact(from, to, weak as EndlessProp, radius);
    if (weak.kind === 'raid-prop') {
      const p = weak as import('./raid-director.ts').RaidProp;
      return segmentCircle(
        { x: from.x - p.oldX, y: from.y - p.oldY },
        { x: to.x - p.x, y: to.y - p.y },
        { x: 0, y: 0 },
        p.radius + radius,
      );
    }
    return weak.kind === 'district-prop'
      ? this.district.weakContact(from, to, weak as DistrictProp, radius)
      : segmentCircle(from, to, weak, radius + weak.radius);
  }
  weakInRadius(point: Vec, radius: number, weak: Vec & { kind: string; radius: number }) {
    if (weak.kind === 'endless-prop' && (weak as EndlessProp).role === 'block') {
      const p = weak as EndlessProp;
      return (
        Math.hypot(
          Math.max(0, Math.abs(point.x - p.x) - p.width / 2),
          Math.max(0, Math.abs(point.y - p.y) - p.height / 2),
        ) <= radius
      );
    }
    if (weak.kind === 'district-prop') {
      const prop = weak as DistrictProp;
      if (prop.width > 0)
        return (
          Math.hypot(
            Math.max(0, Math.abs(point.x - prop.x) - prop.width / 2),
            Math.max(0, Math.abs(point.y - prop.y) - prop.height / 2),
          ) <= radius
        );
    }
    return distance(point, weak) <= radius + weak.radius;
  }
  hasIndependentBodies() {
    return this.kind === 'choir' || this.raids.independentBodies();
  }
  damageTransfer(id: number) {
    if (this.endless.transfersDamage(id)) return { multiplier: 1.5, bypassArmor: true };
    const raid = this.raids.transfer(id);
    if (raid) return { multiplier: raid, bypassArmor: true };
    if (this.district.transfersDamage(id)) return { multiplier: 1.6, bypassArmor: true };
    if (this.services.transfersDamage(id)) return { multiplier: 1, bypassArmor: false };
    return null;
  }
  coreContact(from: Vec, to: Vec, radius: number) {
    if (
      this.endless
        .weakPoints()
        .some((p) => p.role === 'core' && this.endless.weakContact(from, to, p, radius) !== null)
    )
      return true;
    if (this.raids.coreContact(from, to, radius)) return true;
    return this.district
      .weakPoints()
      .some((p) => p.role === 'core' && this.district.weakContact(from, to, p, radius) !== null);
  }
  hitWeakPoint(amount: number, tick: number, id?: number) {
    if (id !== undefined && this.smallWakes.handles(this.kind)) return this.smallWakes.hit(id, amount);
    if (id !== undefined && this.earlyWatch.handles(this.kind)) return this.earlyWatch.hit(id, amount);
    if (id !== undefined && this.endless.handles(this.kind)) return this.endless.hit(id, amount);
    if (id !== undefined && this.raids.handles(this.kind)) return this.raids.hit(id, amount, tick);
    if (id !== undefined && this.district.handles(this.kind))
      return this.district.hit(id, amount, tick);
    if (id !== undefined && this.services.handles(this.kind))
      return this.services.hit(id, amount, tick);
    if (id !== undefined && this.kind !== 'ratcatcher') return this.civic.hit(id, amount);
    if (this.kind !== 'ratcatcher' || this.sackHealth <= 0) return 0;
    const actual = Math.min(this.sackHealth, amount);
    this.sackHealth -= actual;
    if (this.sackHealth <= 0) {
      const pending = this.packs.find((pack) => pack.lanes[0]?.at > tick && !pack.interrupted);
      if (pending) {
        pending.interrupted = true;
        for (const lane of pending.lanes) lane.interrupted = true;
        this.restoreAt = pending.lanes[0].at + ticks(3);
      } else {
        this.blockPack = true;
        this.restoreAt = 0;
      }
    }
    return actual;
  }
  private end(context: SignatureContext, target: Vec, extra: number): Vec {
    const from = context.boss,
      dx = target.x - from.x,
      dy = target.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const desired = {
      x: clamp(from.x + (dx / length) * (length + extra), context.radius, 1600 - context.radius),
      y: clamp(from.y + (dy / length) * (length + extra), context.radius, 1000 - context.radius),
    };
    let fraction = 1;
    for (const obstacle of context.obstacles) {
      const hit = segmentRect(from, desired, obstacle, context.radius);
      if (hit) fraction = Math.min(fraction, Math.max(0, hit.t - 0.001));
    }
    return {
      x: from.x + (desired.x - from.x) * fraction,
      y: from.y + (desired.y - from.y) * fraction,
    };
  }
  startCharge(context: SignatureContext, target: Vec, attack: SignatureAttack) {
    if (this.charge || (context.bossId === 'black-ambulance' && this.civic.recovering))
      return false;
    const end = this.end(context, target, 100),
      at = context.tick + ticks(attack.telegraph);
    const speed = Math.min(600, attack.speed);
    const cue: Lane = {
      kind: 'charge',
      id: context.id(),
      x1: context.boss.x,
      y1: context.boss.y,
      x2: end.x,
      y2: end.y,
      width: context.radius * 2,
      at,
      until: at + Math.ceil(distance(context.boss, end) / (speed * DT)) + 1,
      lane: 0,
      interrupted: false,
    };
    this.lanes.push(cue);
    this.charge = {
      cue,
      origin: { ...context.boss },
      speed,
      damage: attack.damage,
      touched: new Set(),
    };
    return true;
  }
  startPacks(context: SignatureContext, target: Vec, attack: SignatureAttack) {
    if (this.packs.length) return false;
    const aim = Math.atan2(target.y - context.boss.y, target.x - context.boss.x);
    const at = context.tick + ticks(attack.telegraph);
    const lanes = [-0.48, 0, 0.48].map((offset, index): Lane => {
      const end = this.end(
        context,
        {
          x: context.boss.x + Math.cos(aim + offset) * 600,
          y: context.boss.y + Math.sin(aim + offset) * 600,
        },
        0,
      );
      return {
        kind: 'scent',
        id: context.id(),
        x1: context.boss.x,
        y1: context.boss.y,
        x2: end.x,
        y2: end.y,
        width: 34,
        at,
        until: at + ticks(1),
        lane: index + 1,
        interrupted: this.blockPack,
      };
    });
    this.packs.push({
      lanes,
      speed: Math.min(300, (125 * attack.speed) / 100),
      damage: attack.damage,
      interrupted: this.blockPack,
    });
    this.lanes.push(...lanes);
    if (this.blockPack) {
      this.restoreAt = at + ticks(3);
      this.blockPack = false;
    }
    return true;
  }
  startStamps(context: SignatureContext, target: Vec, attack: SignatureAttack) {
    if (this.stamps.length) return false;
    const radius = 82,
      centers: Vec[] = [];
    const candidates = [
      target,
      { x: target.x - 230, y: target.y },
      { x: target.x + 230, y: target.y },
      ...[450, 700, 850].flatMap((y) => [500, 800, 1100].map((x) => ({ x, y }))),
    ];
    for (const candidate of candidates) {
      const center = {
        x: clamp(candidate.x, 140, 1460),
        y: clamp(candidate.y, 140, 860),
      };
      if (
        centers.some((p) => distance(p, center) < radius * 2 + 20) ||
        context.obstacles.some((o) => segmentRect(center, center, o, radius + 10))
      )
        continue;
      centers.push(center);
      if (centers.length === 3) break;
    }
    if (centers.length !== 3) return false;
    const first = context.tick + ticks(attack.telegraph),
      spacing = ticks(0.65),
      safeAt = first + spacing * 2;
    const echoes = context.brutal && context.phase === 3 ? [0, ticks(1.25)] : [0];
    for (const delay of echoes)
      for (const [index, center] of centers.entries())
        this.stamps.push({
          kind: 'stamp',
          id: context.id(),
          ...center,
          radius,
          index: index + 1,
          at: first + spacing * index + delay,
          until: (index === 0 ? safeAt : first + spacing * index + delay) + ticks(2.5),
          safeAt: index === 0 ? safeAt : 0,
        });
    return true;
  }
  safeZones(tick: number) {
    return this.stamps.filter((s) => s.safeAt > 0 && tick >= s.safeAt && tick < s.until);
  }
  isSafe(position: Vec, tick: number, bodyRadius = 9) {
    return this.safeZones(tick).some((s) => distance(s, position) + bodyRadius <= s.radius);
  }
  cues(): BossCue[] {
    return [
      ...this.smallWakes.cues(),
      ...this.earlyWatch.cues(),
      ...this.civic.cues(),
      ...this.services.cues(),
      ...this.district.cues(),
      ...this.raids.cues(),
      ...this.endless.cues(),
      ...this.lanes,
      ...this.trails.map((t) => t.cue),
      ...this.stamps,
      ...(this.weakPoint() ? [this.weakPoint()!] : []),
    ].map((cue) => ({ ...cue }));
  }
  private touch(context: SignatureContext, target: { id: string }, key: string, damage: number) {
    const id = key + ':' + target.id;
    if (context.tick < (this.contacts.get(id) ?? 0)) return;
    context.damage(target.id, damage * context.damageScale);
    this.contacts.set(id, context.tick + ticks(0.5));
  }
  step(context: SignatureContext) {
    this.smallWakes.step(context);
    this.earlyWatch.step(context);
    this.origin = { ...context.boss };
    if (this.kind === 'ratcatcher' && !this.sackId) this.sackId = context.id();
    if (this.restoreAt && context.tick >= this.restoreAt) {
      this.sackHealth = this.sackMaximum;
      this.restoreAt = 0;
    }
    const charge = this.charge;
    if (charge && context.tick >= charge.cue.at) {
      const old = { ...context.boss },
        end = { x: charge.cue.x2, y: charge.cue.y2 };
      const length = distance(context.boss, end),
        travel = Math.min(length, charge.speed * DT);
      const next = moveBody(
        old,
        {
          x: length ? ((end.x - old.x) / length) * travel : 0,
          y: length ? ((end.y - old.y) / length) * travel : 0,
        },
        context.radius,
        context.obstacles,
      );
      context.boss.x = next.x;
      context.boss.y = next.y;
      if (this.kind === 'courier' && !this.trails.some((t) => t.cue.id === charge.cue.id)) {
        const total = distance(charge.origin, end) || 1;
        this.trails.push({
          cue: {
            kind: 'trail',
            id: charge.cue.id,
            x1: old.x,
            y1: old.y,
            x2: next.x,
            y2: next.y,
            width: 32,
            until: charge.cue.until + ticks(3),
          },
          origin: charge.origin,
          direction: {
            x: (end.x - charge.origin.x) / total,
            y: (end.y - charge.origin.y) / total,
          },
          speed: charge.speed,
          started: context.tick,
          length: 0,
          damage: 10,
        });
      }
      const trail = this.trails.find((t) => t.cue.id === charge.cue.id);
      if (trail) {
        trail.length = distance(charge.origin, next);
        trail.cue.x2 = next.x;
        trail.cue.y2 = next.y;
      }
      for (const target of context.targets)
        if (
          !charge.touched.has(target.id) &&
          segmentCircle(
            { x: target.oldX - old.x, y: target.oldY - old.y },
            { x: target.x - next.x, y: target.y - next.y },
            { x: 0, y: 0 },
            context.radius + 9,
          ) !== null
        ) {
          context.damage(target.id, charge.damage * context.damageScale);
          charge.touched.add(target.id);
        }
      if (
        distance(next, end) < 0.5 ||
        distance(old, next) < 0.01 ||
        context.tick >= charge.cue.until
      ) {
        charge.cue.until = context.tick;
        if (trail) trail.cue.until = context.tick + ticks(3);
        this.charge = null;
      }
    }
    this.civic.step(context, this.charging);
    this.services.step(context);
    this.district.step(context);
    this.raids.step(context);
    this.endless.step(context);
    for (const trail of this.trails) {
      if (context.tick >= trail.cue.until) continue;
      const retired = Math.min(
        trail.length,
        Math.max(0, (context.tick - trail.started - ticks(3)) * trail.speed * DT),
      );
      trail.cue.x1 = trail.origin.x + trail.direction.x * retired;
      trail.cue.y1 = trail.origin.y + trail.direction.y * retired;
      for (const target of context.targets)
        if (
          segmentCircle(
            { x: trail.cue.x1, y: trail.cue.y1 },
            { x: trail.cue.x2, y: trail.cue.y2 },
            target,
            trail.cue.width / 2 + 9,
          ) !== null
        )
          this.touch(context, target, 'trail', trail.damage * 0.5);
    }
    for (const pack of this.packs)
      if (context.tick >= pack.lanes[0].at) {
        if (!pack.interrupted)
          for (const lane of pack.lanes) {
            const length = Math.hypot(lane.x2 - lane.x1, lane.y2 - lane.y1) || 1;
            for (let i = 0; i < 4; i++) {
              const travel = 35 + i * 14;
              const p = moveBody(
                context.boss,
                {
                  x: ((lane.x2 - lane.x1) / length) * travel,
                  y: ((lane.y2 - lane.y1) / length) * travel,
                },
                12,
                context.obstacles,
              );
              context.spawnRat(
                p,
                { x: lane.x2, y: lane.y2 },
                pack.speed,
                12,
                pack.damage * context.damageScale,
                12,
              );
            }
          }
        pack.lanes = [];
      }
    this.packs = this.packs.filter((p) => p.lanes.length > 0);
    for (const stamp of this.stamps)
      if (
        context.tick >= stamp.at &&
        context.tick < stamp.until &&
        !(stamp.safeAt && context.tick >= stamp.safeAt)
      )
        for (const target of context.targets)
          if (!this.isSafe(target, context.tick) && distance(stamp, target) <= stamp.radius + 9)
            this.touch(context, target, 'stamp', 5);
    this.lanes = this.lanes.filter((l) => context.tick < l.until);
    this.stamps = this.stamps.filter((s) => context.tick < s.until);
    this.trails = this.trails.filter((t) => context.tick < t.cue.until);
    this.origin = { ...context.boss };
  }
}
