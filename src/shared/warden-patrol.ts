import { HZ, type Vec } from './protocol.ts';
import { distance, moveBody, type Rect } from './geometry.ts';
import {
  WardenClock,
  WARDEN_SIGNATURE,
  WARDEN_CYCLE_TICKS,
  type WardenSample,
} from './warden-signature.ts';
export type WardenPatrolCue = {
  kind: 'warden-patrol';
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  at: number;
  moveAt: number;
  until: number;
};
export type WardenEchoCue = {
  kind: 'warden-return';
  id: number;
  x: number;
  y: number;
  direction: 1 | -1;
  at: number;
  until: number;
};
export type WardenCue = WardenPatrolCue | WardenEchoCue;
type Context = {
  now: number;
  boss: Vec;
  phase: number;
  blocked?: boolean;
  brutal: boolean;
  target: Vec;
  radius: number;
  obstacles: Rect[];
  id(): number;
};
const ACTIVE_END = WARDEN_SIGNATURE.warningTicks + WARDEN_SIGNATURE.activeTicks;
/** A single dangerous lantern at a time. Only resting feet may relocate. */
export class WardenPatrol {
  private clock?: WardenClock;
  private stage: 'empty' | 'route' | 'sweep' | 'echo' | 'rest' = 'empty';
  private stageAt = 0;
  private lastTick = 0;
  private cycle = 0;
  private pass = 0;
  private issuedPhase = 0;
  private deferredRoute = false;
  private route?: WardenPatrolCue;
  private returning?: WardenEchoCue;
  private direction: 1 | -1 = 1;
  private restUntil = 0;
  private samples: WardenSample[] = [];
  clear() {
    this.clock = undefined;
    this.stage = 'empty';
    this.samples = [];
    this.route = undefined;
    this.returning = undefined;
    this.cycle = 0;
    this.pass = 0;
    this.deferredRoute = false;
  }
  get ready() {
    return this.stage !== 'empty';
  }
  get canCastAuxiliary() {
    return this.stage === 'rest' && !this.route;
  }
  reset(c: Context) {
    this.clear();
    this.lastTick = c.now;
    if (c.phase > 0) {
      this.stage = 'route';
      this.stageAt = c.now;
      this.planRoute(c);
    } else this.beginSweep(c, false);
  }
  private planRoute(c: Context) {
    const preferred = this.cycle % 2 === 0 ? 1 : -1;
    const deltas = [
      { x: WARDEN_SIGNATURE.patrolDistance * preferred, y: 0 },
      { x: -WARDEN_SIGNATURE.patrolDistance * preferred, y: 0 },
      { x: 0, y: WARDEN_SIGNATURE.patrolDistance },
      { x: 0, y: -WARDEN_SIGNATURE.patrolDistance },
    ];
    const candidates = deltas.map((delta) =>
      moveBody(c.boss, delta, c.radius, c.obstacles),
    );
    const target =
      distance(c.boss, candidates[0]) >= 72
        ? candidates[0]
        : candidates.toSorted(
            (a, b) => distance(c.boss, b) - distance(c.boss, a),
          )[0];
    const moveAt = c.now + WARDEN_SIGNATURE.patrolTellTicks,
      duration = Math.max(
        1,
        Math.ceil(
          (distance(c.boss, target) / WARDEN_SIGNATURE.patrolSpeed) * HZ,
        ),
      );
    this.route = {
      kind: 'warden-patrol',
      id: c.id(),
      x1: c.boss.x,
      y1: c.boss.y,
      x2: target.x,
      y2: target.y,
      at: c.now,
      moveAt,
      until: moveAt + duration,
    };
  }
  private beginSweep(c: Context, echo: boolean) {
    const origin = { x: c.boss.x + 55, y: c.boss.y };
    const old = this.clock?.sample();
    if (echo) {
      this.pass = 1;
      this.direction = this.direction === 1 ? -1 : 1;
    } else {
      this.issuedPhase = c.phase;
      this.pass = 0;
      this.direction = c.brutal && this.cycle % 2 === 1 ? -1 : 1;
    }
    const target =
      echo && old
        ? {
            x: origin.x + Math.cos(old.cone.aim) * 420,
            y: origin.y + Math.sin(old.cone.aim) * 420,
          }
        : c.target;
    this.clock = new WardenClock(origin, target, this.direction);
    this.stage = 'sweep';
    this.stageAt = c.now;
    this.returning = undefined;
    this.samples = [this.clock.sample()];
  }
  step(c: Context) {
    if (!this.ready) {
      if (c.blocked) return this.samples;
      this.reset(c);
      return this.samples;
    }
    if (c.now <= this.lastTick) return this.samples;
    this.lastTick = c.now;
    if (this.route) {
      const r = this.route;
      if (c.now >= r.moveAt) {
        const length = distance(c.boss, { x: r.x2, y: r.y2 }),
          step = Math.min(WARDEN_SIGNATURE.patrolSpeed / HZ, length);
        if (length > 0) {
          const point = moveBody(
            c.boss,
            {
              x: ((r.x2 - c.boss.x) / length) * step,
              y: ((r.y2 - c.boss.y) / length) * step,
            },
            c.radius,
            c.obstacles,
          );
          c.boss.x = point.x;
          c.boss.y = point.y;
        }
      }
      if (c.now >= r.until) {
        if (distance(c.boss, { x: r.x2, y: r.y2 }) < 1e-6) {
          c.boss.x = r.x2;
          c.boss.y = r.y2;
        }
        this.route = undefined;
      }
    }
    if (this.stage === 'route') {
      this.samples = [];
      if (!this.route && !c.blocked) this.beginSweep(c, false);
      return this.samples;
    }
    if (this.stage === 'echo') {
      this.samples = [];
      if (c.now >= this.stageAt + WARDEN_SIGNATURE.returnPauseTicks)
        this.beginSweep(c, true);
      return this.samples;
    }
    if (this.stage === 'sweep') {
      const sample = this.clock!.advance(c.target);
      this.samples = [sample];
      if (this.clock!.tick >= ACTIVE_END) {
        this.stageAt = c.now;
        if (c.brutal && this.issuedPhase > 0 && this.pass === 0) {
          this.stage = 'echo';
          this.samples = [];
          this.returning = {
            kind: 'warden-return',
            id: c.id(),
            x: c.boss.x + 55,
            y: c.boss.y,
            direction: this.direction === 1 ? -1 : 1,
            at: c.now,
            until: c.now + WARDEN_SIGNATURE.returnPauseTicks,
          };
        } else {
          this.stage = 'rest';
          this.restUntil = c.now + WARDEN_SIGNATURE.restTicks;
          this.deferredRoute = c.phase > 0 && !!c.blocked;
          if (c.phase > 0 && !c.blocked) this.planRoute(c);
        }
      }
    } else if (this.stage === 'rest') {
      // Rest pose follows elapsed recovery, but there is no active moving socket.
      // Waiting for assistance or a deferred patrol cannot wrap a rest pose
      // into a second invisible attack clock. Only beginSweep starts a tell.
      this.samples = [this.clock!.tick < WARDEN_CYCLE_TICKS - 1
        ? this.clock!.advance(c.target) : this.clock!.sample()];
      if (this.deferredRoute && !c.blocked) {
        this.planRoute(c);
        this.restUntil = Math.max(this.restUntil, this.route!.until + 1);
        this.deferredRoute = false;
      }
      if (c.now >= this.restUntil && !c.blocked) {
        this.route = undefined;
        this.cycle++;
        this.beginSweep(c, false);
      }
    }
    return this.samples;
  }
  cues(): WardenCue[] {
    return [
      ...(this.route ? [{ ...this.route }] : []),
      ...(this.returning ? [{ ...this.returning }] : []),
    ];
  }
}
