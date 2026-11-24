import type { Vec } from './protocol.ts';
import type { RangerOwner } from './ranger-kit.ts';

export const rangerTrackerIds = {
  entry: 'ranger-read-the-sign-1',
  stakes: 'ranger-trail-stakes-1',
  backtrack: 'ranger-backtrack-1',
} as const;

export type TrackerFitting = 'stakes' | 'backtrack';
export function rangerTrackerFitting(skills: readonly string[]): TrackerFitting | undefined {
  if (skills.includes(rangerTrackerIds.stakes)) return 'stakes';
  if (skills.includes(rangerTrackerIds.backtrack)) return 'backtrack';
}

export const trackerRules = {
  evidenceTicks: 125,
  duration: 130,
  recovery: 278,
  readRange: 420,
  observationRange: 510,
  sampleInterval: 12,
  sampleDistance: 9,
  samples: 3,
  lateralDistance: 82,
  leaveDistance: 100,
  returnDistance: 32,
} as const;

type Footprint = Vec & { at: number };
export type TrackArrow = { launchedAt: number; origin: Vec; aim: number };
type Evidence = { target: string; observed: Footprint; arrow: TrackArrow };
type Trail = {
  evidence: Evidence;
  at: number;
  until: number;
  fitting?: TrackerFitting;
  footprints: Footprint[];
  leftAt: number;
};
type TrackerStage = 'busy' | 'recovering' | 'find' | 'distance' | 'ready' | 'flank' | 'leave' | 'return' | 'follow';
export type TrackerStatus = {
  stage: TrackerStage;
  fitting?: TrackerFitting;
  until: number;
  recoveryAt: number;
  footprints: Footprint[];
  origin?: Vec;
  bearing?: number;
};
export type TrackerWorld = {
  tick: number;
  combat: boolean;
  paused: boolean;
  owners: readonly RangerOwner[];
  target(key: string): (Vec & { health: number }) | undefined;
  visible(owner: RangerOwner, target: Vec): boolean;
  recoverArrow(owner: RangerOwner): boolean;
  sound(id: string, owner: RangerOwner): void;
};

const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const live = (owner: RangerOwner) => owner.classId === 'ranger' && owner.connected && owner.status === 'active';
const controlled = (owner: RangerOwner, world: TrackerWorld) => world.combat && !world.paused && live(owner);
const lateral = (point: Vec, arrow: TrackArrow) => Math.abs(
  (point.y - arrow.origin.y) * Math.cos(arrow.aim) - (point.x - arrow.origin.x) * Math.sin(arrow.aim),
);
const print = (point: Vec, at: number): Footprint => ({ x: point.x, y: point.y, at });

export class RangerTracker {
  private readonly sightings = new Map<string, Evidence>();
  private readonly trails = new Map<string, Trail>();
  private readonly recoveries = new Map<string, number>();

  cancel(owner: string) {
    this.sightings.delete(owner);
    this.trails.delete(owner);
  }

  clear() {
    this.sightings.clear();
    this.trails.clear();
    this.recoveries.clear();
  }

  private usable(owner: RangerOwner, world: TrackerWorld) {
    const evidence = this.sightings.get(owner.id);
    if (evidence && world.tick - evidence.observed.at < trackerRules.evidenceTicks &&
      (world.target(evidence.target)?.health ?? 0) > 0) return evidence;
  }

  status(owner: RangerOwner, world: TrackerWorld, fitting?: TrackerFitting): TrackerStatus {
    const recoveryAt = this.recoveries.get(owner.id) ?? 0;
    const generic = { fitting, until:0, recoveryAt, footprints:[] };
    if (!controlled(owner, world)) return { ...generic, stage:'busy' };
    const trail = this.trails.get(owner.id);
    if (trail && world.tick < trail.until) {
      const origin = trail.evidence.arrow.origin;
      const stage = trail.fitting === 'backtrack' ?
        !trail.leftAt ? 'leave' : distance(owner, origin) <= trackerRules.returnDistance ? 'follow' : 'return' :
        lateral(owner, trail.evidence.arrow) >= trackerRules.lateralDistance ? 'follow' : 'flank';
      return { ...generic, stage, until:trail.until, origin:{ ...origin }, bearing:trail.evidence.arrow.aim,
        footprints:trail.footprints.map(point => ({...point})) };
    }
    if (world.tick < recoveryAt) return { ...generic, stage:'recovering' };
    const sighting = this.usable(owner,world);
    if (!sighting) return { ...generic, stage:'find' };
    return { ...generic, stage:distance(owner,sighting.observed) <= trackerRules.readRange ? 'ready' : 'distance',
      footprints:[{ ...sighting.observed }] };
  }

  command(owner: RangerOwner, world: TrackerWorld, fitting?: TrackerFitting) {
    if (!controlled(owner,world) || this.trails.has(owner.id) || world.tick < (this.recoveries.get(owner.id) ?? 0)) return false;
    const evidence = this.usable(owner,world);
    if (!evidence || distance(owner,evidence.observed) > trackerRules.readRange) return false;
    this.trails.set(owner.id,{ evidence, at:world.tick, until:world.tick + trackerRules.duration,
      fitting, footprints:[evidence.observed], leftAt:0 });
    this.sightings.delete(owner.id);
    this.recoveries.set(owner.id,world.tick + trackerRules.recovery);
    world.sound('ranger-track-read',owner);
    return true;
  }

  primaryHit(owner: RangerOwner, key: string, shot: TrackArrow, damage: number, world: TrackerWorld) {
    if (!controlled(owner,world) || !Number.isFinite(damage) || damage <= 0) return;
    const trail = this.trails.get(owner.id);
    if (trail) {
      if (trail.evidence.target !== key || world.tick >= trail.until || shot.launchedAt <= trail.at) return;
      const origin = trail.evidence.arrow.origin;
      const positioned = trail.fitting === 'backtrack' ? trail.leftAt > 0 && shot.launchedAt > trail.leftAt && distance(shot.origin,origin) <= trackerRules.returnDistance :
        lateral(shot.origin,trail.evidence.arrow) >= trackerRules.lateralDistance;
      if (positioned) this.claim(owner,world);
      return;
    }
    if (world.tick < (this.recoveries.get(owner.id) ?? 0)) return;
    const target = world.target(key);
    if (target && target.health > 0 && world.visible(owner,target)) this.sightings.set(owner.id,{
      target:key, observed:print(target,world.tick), arrow:{ ...shot, origin:{ ...shot.origin } },
    });
  }

  triplineHit(owner: RangerOwner, key: string, placedAt: number, damage: number, world: TrackerWorld) {
    const trail = this.trails.get(owner.id);
    if (trail?.fitting === 'stakes' && trail.evidence.target === key && placedAt > trail.at && world.tick < trail.until &&
      Number.isFinite(damage) && damage > 0 && controlled(owner,world)) this.claim(owner,world);
  }

  private claim(owner: RangerOwner, world: TrackerWorld) {
    if (!world.recoverArrow(owner)) return;
    this.trails.delete(owner.id);
    world.sound('ranger-track-recover',owner);
  }

  step(world: TrackerWorld) {
    if (!world.combat) { this.clear(); return; }
    if (world.paused || !this.trails.size && !this.sightings.size && !this.recoveries.size) return;
    const now = world.tick, liveOwners = new Map(world.owners.filter(live).map(owner => [owner.id,owner]));
    for (const [id,evidence] of this.sightings) {
      if (!liveOwners.has(id) || now - evidence.observed.at >= trackerRules.evidenceTicks) this.sightings.delete(id);
    }
    for (const [id,trail] of this.trails) {
      const owner = liveOwners.get(id), target = world.target(trail.evidence.target);
      if (!owner || !target || target.health <= 0 || now >= trail.until) { this.trails.delete(id); continue; }
      if (trail.fitting === 'backtrack' && !trail.leftAt && distance(owner,trail.evidence.arrow.origin) >= trackerRules.leaveDistance) trail.leftAt = now;
      const latest = trail.footprints.at(-1)!;
      if (now - latest.at >= trackerRules.sampleInterval && distance(latest,target) >= trackerRules.sampleDistance &&
        distance(owner,target) <= trackerRules.observationRange && world.visible(owner,target)) {
        if (trail.footprints.length === trackerRules.samples) trail.footprints.shift();
        trail.footprints.push(print(target,now));
      }
    }
    for (const [id,at] of this.recoveries) if (now >= at) this.recoveries.delete(id);
  }
}
