import type { Vec } from './protocol.ts';
import type { RangerArrow, RangerContext, RangerOwner } from './ranger-kit.ts';

export const rangerSightIds = {
  entry: 'ranger-sight-draw-1',
  roll: 'ranger-rolling-nock-1',
  bearing: 'ranger-change-bearing-1',
} as const;

export type RangerSightFitting = 'roll' | 'bearing';
export function rangerSightFitting(skills: readonly string[]): RangerSightFitting | undefined {
  if (skills.includes(rangerSightIds.roll)) return 'roll';
  if (skills.includes(rangerSightIds.bearing)) return 'bearing';
}

export const rangerSightRules = {
  readyTicks: 18,
  adjustTicks: 12,
  duration: 75,
  recovery: 228,
  movement: 0.66,
  halfArc: Math.PI / 10,
  range: 760,
  speed: 820,
  damage: 76,
} as const;

type SightOwner = RangerOwner & { sprinting?: boolean };
type SightStage = 'busy' | 'empty' | 'recovery' | 'ready' | 'drawing' | 'outside' | 'release' | 'rolling' | 'adjust';
export type RangerSightStatus = {
  stage: SightStage;
  fitting?: RangerSightFitting;
  recoveryAt: number;
  readyAt: number;
  until: number;
  canAdjust: boolean;
  rollAvailable: boolean;
};

export type RangerSightCue = Vec & {
  kind: 'ranger-sight';
  id: number;
  owner: string;
  aim: number;
  halfArc: number;
  radius: number;
  at: number;
  readyAt: number;
  until: number;
  state: 'drawing' | 'set' | 'rolling';
};

type SightDraw = {
  id: number;
  owner: string;
  aim: number;
  at: number;
  readyAt: number;
  until: number;
  fitting?: RangerSightFitting;
  adjusted: boolean;
  carriedDash: number;
  damage: number;
};

const live = (owner: SightOwner) => owner.classId === 'ranger' && owner.connected && owner.status === 'active';
const controlled = (owner: SightOwner, context: RangerContext) => context.combat && !context.paused && live(owner);
const onBearing = (bearing: number, aim: number) => {
  const difference = aim - bearing;
  return Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference))) <= rangerSightRules.halfArc;
};

export class RangerSightDraw {
  private readonly draws = new Map<string, SightDraw>();
  private readonly recovery = new Map<string, number>();

  active(owner: string, now: number) {
    return now < (this.draws.get(owner)?.until ?? 0);
  }

  drawTiming(owner: string, now: number) {
    const draw = this.draws.get(owner);
    return draw && now < draw.until ? { id: draw.id, at: draw.at, until: draw.until } : undefined;
  }

  cancel(owner: string) {
    this.draws.delete(owner);
  }

  clear() {
    this.draws.clear();
    this.recovery.clear();
  }

  status(owner: SightOwner, context: RangerContext, fitting: RangerSightFitting | undefined, busy: boolean, hasArrow: boolean): RangerSightStatus {
    const now = context.tick;
    const recoveryAt = this.recovery.get(owner.id) ?? 0;
    const idle = { fitting, recoveryAt, readyAt: 0, until: 0, canAdjust: false, rollAvailable: false };
    if (!controlled(owner, context) || busy || owner.sprinting) return { ...idle, stage: 'busy' };
    const draw = this.draws.get(owner.id);
    if (!draw || now >= draw.until) {
      const stage = now < owner.dashUntil ? 'busy' : now < recoveryAt ? 'recovery' : hasArrow ? 'ready' : 'empty';
      return { ...idle, stage };
    }
    const canAdjust = draw.fitting === 'bearing' && !draw.adjusted && now + rangerSightRules.adjustTicks < draw.until;
    const rollAvailable = draw.fitting === 'roll' && !draw.carriedDash && now >= draw.readyAt;
    const active = { ...idle, readyAt: draw.readyAt, until: draw.until, canAdjust, rollAvailable };
    if (now < owner.dashUntil) return { ...active, stage: 'rolling' };
    if (now < draw.readyAt) return { ...active, stage: draw.adjusted ? 'adjust' : 'drawing' };
    return { ...active, stage: onBearing(draw.aim, owner.aim) ? 'release' : 'outside' };
  }

  command(owner: SightOwner, context: RangerContext, fitting: RangerSightFitting | undefined, busy: boolean,
    hasArrow: boolean, canEmit: boolean, potency: number) {
    const now = context.tick;
    const status = this.status(owner, context, fitting, busy, hasArrow);
    if (status.stage === 'ready') {
      const damage = rangerSightRules.damage * (Number.isFinite(potency) ? Math.max(0.5, Math.min(3, potency)) : 1);
      this.draws.set(owner.id, { id:context.id(), owner:owner.id, aim:owner.aim, at:now, readyAt:now + rangerSightRules.readyTicks,
        until:now + rangerSightRules.duration, fitting, adjusted:false, carriedDash:0, damage });
      this.recovery.set(owner.id, now + rangerSightRules.recovery);
      context.sound('ranger-sight-draw', owner);
      return 'reserve';
    }
    const draw = this.draws.get(owner.id);
    if (!draw) return;
    if (status.stage === 'outside' && status.canAdjust) {
      draw.aim = owner.aim;
      draw.readyAt = now + rangerSightRules.adjustTicks;
      draw.adjusted = true;
      context.sound('ranger-sight-adjust', owner);
      return 'adjust';
    }
    if (status.stage !== 'release' || !canEmit) return;
    const arrow: RangerArrow = { owner:owner.id, x:owner.x, y:owner.y, aim:owner.aim, damage:draw.damage,
      speed:rangerSightRules.speed, range:rangerSightRules.range, pierce:0, training:false, drawId:draw.id };
    this.cancel(owner.id);
    context.arrow(arrow);
    context.sound('ranger-sight-release', owner);
    return 'release';
  }

  step(context: RangerContext) {
    if (!context.combat) { this.clear(); return; }
    if (context.paused) return;
    const now = context.tick;
    if (this.draws.size) {
      const owners = new Map(context.owners.filter(live).map(owner => [owner.id, owner as SightOwner]));
      for (const [id, draw] of this.draws) {
        const owner = owners.get(id);
        if (!owner || now >= draw.until || owner.sprinting) { this.cancel(id); continue; }
        if (now >= owner.dashUntil || owner.dashUntil === draw.carriedDash) continue;
        if (draw.fitting !== 'roll' || draw.carriedDash || now < draw.readyAt) { this.cancel(id); continue; }
        draw.carriedDash = owner.dashUntil;
        context.sound('ranger-sight-roll', owner);
      }
    }
    for (const [id, until] of this.recovery) if (now >= until) this.recovery.delete(id);
  }

  cues(context: RangerContext): RangerSightCue[] {
    if (!this.draws.size || !context.combat) return [];
    return context.owners.filter(live).flatMap(owner => {
      const draw = this.draws.get(owner.id);
      if (!draw || context.tick >= draw.until) return [];
      const state = context.tick < owner.dashUntil ? 'rolling' : context.tick < draw.readyAt ? 'drawing' : 'set';
      return [{ kind:'ranger-sight', id:draw.id, owner:owner.id, aim:draw.aim, x:owner.x, y:owner.y,
        halfArc:rangerSightRules.halfArc, radius:rangerSightRules.range, at:draw.at, readyAt:draw.readyAt, until:draw.until, state }];
    });
  }
}
