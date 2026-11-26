import type { InputFrame, Vec } from './protocol.ts';

const radians = (degrees: number) => (degrees * Math.PI) / 180;
export const pursuitIds = {
  entry: 'swordsman-passing-cut-1',
  through: 'swordsman-pursuit-through-step-1',
  cross: 'swordsman-pursuit-crossing-step-1',
} as const;
export const pursuitRules = {
  stride: 54,
  followStride: 32,
  strideTicks: 38,
  idleTicks: 8,
  followTicks: 42,
  recoveryTicks: 216,
  walkAngle: radians(36),
  aimAngle: radians(52),
  throughAngle: radians(38),
  crossMin: radians(57),
  crossMax: radians(123),
  passing: { reach: 139, arc: radians(86), damage: 112, ordinaryTargets: 3 },
  through: { reach: 157, arc: radians(52), damage: 96, ordinaryTargets: 2 },
  cross: { reach: 116, arc: radians(124), damage: 74, ordinaryTargets: 3 },
} as const;

type Strike = 'passing' | 'through' | 'cross';
type Fitting = Exclude<Strike, 'passing'>;
type Shape = { reach: number; arc: number; damage: number; ordinaryTargets: number };
type Fighter = Vec & {
  id: string;
  aim: number;
  status: string;
  connected: boolean;
  skills: readonly string[];
};
type Footwork = {
  origin: Vec;
  direction: Vec;
  forced: boolean;
};
type Stride = {
  heading: number;
  start: number;
  last: number;
  point: Vec;
  distance: number;
};
type Follow = {
  id: number;
  fitting: Fitting;
  heading: number;
  at: number;
  until: number;
  point: Vec;
  stride?: Stride;
};
export type PursuitContext = {
  tick: number;
  active: boolean;
  id(): number;
  canStrike(player: Fighter): boolean;
  strike(player: Fighter, shape: Shape): number;
  sound(id: string, player: Fighter): void;
};
export type PursuitCue = Vec & {
  kind: 'sword-passing-cut';
  state: Strike | 'open-through' | 'open-cross';
  id: number;
  owner: string;
  aim: number;
  radius: number;
  arc: number;
  at: number;
  until: number;
};

const angle = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const samePoint = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y) < 0.001;
const entitled = (p: Fighter) => p.connected && p.status === 'active' && p.skills.includes(pursuitIds.entry);
const fit = (p: Fighter): Fitting | undefined => {
  if (p.skills.includes(pursuitIds.through)) return 'through';
  if (p.skills.includes(pursuitIds.cross)) return 'cross';
};

function live(stride: Stride | undefined, point: Vec, now: number) {
  return stride && now - stride.start < pursuitRules.strideTicks &&
    now - stride.last <= pursuitRules.idleTicks && samePoint(stride.point, point) ? stride : undefined;
}

function track(previous: Stride | undefined, player: Fighter, move: Footwork, now: number,
  accepts: (heading: number) => boolean, threshold: number) {
  const stride = live(previous, move.origin, now);
  const dx = player.x - move.origin.x, dy = player.y - move.origin.y;
  const actual = Math.hypot(dx, dy), intended = Math.hypot(move.direction.x, move.direction.y);
  if (actual < 0.01) return stride;
  if (!intended || (dx * move.direction.x + dy * move.direction.y) / (actual * intended) < 0.8) return;
  const heading = Math.atan2(dy, dx);
  if (!accepts(heading)) return;
  const continued = stride && angle(heading, stride.heading) <= pursuitRules.walkAngle ? stride : undefined;
  return {
    heading: continued?.heading ?? heading, start: continued?.start ?? now, last: now,
    point: { x: player.x, y: player.y },
    distance: Math.min(threshold, (continued?.distance ?? 0) + actual * Math.cos(angle(heading, continued?.heading ?? heading))),
  } satisfies Stride;
}

function followHeading(open: Follow, heading: number) {
  const difference = angle(heading, open.heading);
  return open.fitting === 'through' ? difference <= pursuitRules.throughAngle :
    difference >= pursuitRules.crossMin && difference <= pursuitRules.crossMax;
}

export class FlowingPursuit {
  private readonly strides = new Map<string, Stride>();
  private readonly follow = new Map<string, Follow>();
  private readonly recovery = new Map<string, number>();
  private cuts: PursuitCue[] = [];

  get active() {
    return this.strides.size > 0 || this.follow.size > 0 || this.recovery.size > 0 || this.cuts.length > 0;
  }

  drop(id: string) {
    this.strides.delete(id);
    this.follow.delete(id);
    this.cuts = this.cuts.filter(cue => cue.owner !== id);
  }

  clear() {
    this.strides.clear();
    this.follow.clear();
    this.recovery.clear();
    this.cuts = [];
  }

  private window(player: Fighter, now: number) {
    const open = this.follow.get(player.id);
    return open && open.until > now && fit(player) === open.fitting ? open : undefined;
  }

  status(player: Fighter, context: PursuitContext) {
    const tick = context.tick;
    const open = context.active && entitled(player) ? this.window(player, tick) : undefined;
    const stride = context.active && entitled(player) ? live(this.strides.get(player.id), player, tick) : undefined;
    const step = open && live(open.stride, player, tick);
    const ready = open ? step : stride;
    const threshold = open ? pursuitRules.followStride : pursuitRules.stride;
    const recoveryAt = this.recovery.get(player.id) ?? 0;
    const canStrike = Boolean(ready && ready.distance >= threshold && angle(player.aim, ready.heading) <= pursuitRules.aimAngle &&
      (open || tick >= recoveryAt) && context.canStrike(player));
    return { stride: stride?.distance ?? 0, heading: ready?.heading, recoveryAt,
      followUntil: open?.until ?? 0, followStride: step?.distance ?? 0, fitting: fit(player), canStrike };
  }

  command(player: Fighter, input: InputFrame, move: Footwork, context: PursuitContext) {
    const tick = context.tick;
    const { id } = player;
    if (!context.active || !entitled(player) || move.forced || input.dodge || input.sprint || input.reload ||
      input.q || input.e || input.ultimate || input.supply >= 0 || input.technique1 || input.technique2) {
      this.strides.delete(id);
      this.follow.delete(id);
      return false;
    }

    const open = this.window(player, tick);
    if (open && samePoint(open.point, move.origin)) {
      const next = track(open.stride, player, move, tick, heading => followHeading(open, heading), pursuitRules.followStride);
      open.stride = next;
      open.point = { x: player.x, y: player.y };
      if (!input.technique3 || !next || next.distance < pursuitRules.followStride ||
        angle(player.aim, next.heading) > pursuitRules.aimAngle || !context.canStrike(player)) return false;
      this.follow.delete(id);
      this.release(player, open.fitting, context);
      return true;
    }

    this.follow.delete(id);
    if (tick < (this.recovery.get(id) ?? 0)) return false;
    const next = track(this.strides.get(id), player, move, tick, () => true, pursuitRules.stride);
    if (next) this.strides.set(id, next);
    else this.strides.delete(id);
    if (!input.technique3 || !next || next.distance < pursuitRules.stride ||
      angle(player.aim, next.heading) > pursuitRules.aimAngle || !context.canStrike(player)) return false;
    this.strides.delete(id);
    this.recovery.set(id, tick + pursuitRules.recoveryTicks);
    const damaged = this.release(player, 'passing', context);
    const fitting = fit(player);
    if (fitting && damaged) {
      this.follow.set(id, { id: context.id(), fitting, heading: next.heading, at: tick, until: tick + pursuitRules.followTicks,
        point: { x: player.x, y: player.y } });
      context.sound(`sword-pursuit-open-${fitting}`, player);
    }
    return true;
  }

  private release(player: Fighter, state: Strike, context: PursuitContext) {
    const shape = pursuitRules[state];
    const cue = { kind: 'sword-passing-cut', state, owner: player.id, id: context.id(), x: player.x, y: player.y,
      aim: player.aim, radius: shape.reach, arc: shape.arc, at: context.tick, until: context.tick + 7 } satisfies PursuitCue;
    const damaged = context.strike(player, shape) > 0;
    this.cuts.push(cue);
    context.sound(`sword-pursuit-${state}`, player);
    return damaged;
  }

  cues(players: ReadonlyMap<string, Fighter>, now: number) {
    const cues = [...this.cuts];
    for (const [owner, open] of this.follow) {
      const p = players.get(owner);
      if (!p || !entitled(p) || !this.window(p, now)) continue;
      cues.push({ kind: 'sword-passing-cut', state: `open-${open.fitting}`, id: open.id, owner, x: p.x, y: p.y,
        aim: open.heading, radius: 33, arc: pursuitRules[open.fitting].arc, at: open.at, until: open.until });
    }
    return cues;
  }

  advance(players: ReadonlyMap<string, Fighter>, now: number) {
    for (const [id, stride] of this.strides) {
      const p = players.get(id);
      if (!p || !entitled(p) || !live(stride, p, now)) this.strides.delete(id);
    }
    for (const [id, open] of this.follow) {
      const p = players.get(id);
      if (!p || !entitled(p) || !this.window(p, now) || !samePoint(open.point, p)) this.follow.delete(id);
    }
    for (const [id, at] of this.recovery) if (at <= now || !players.has(id)) this.recovery.delete(id);
    this.cuts = this.cuts.filter(cue => {
      const player = players.get(cue.owner);
      return cue.until > now && player && entitled(player);
    });
  }
}

export type PursuitStatus = ReturnType<FlowingPursuit['status']>;
