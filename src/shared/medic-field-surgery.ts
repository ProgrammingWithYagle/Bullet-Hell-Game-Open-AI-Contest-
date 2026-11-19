import { distance, segmentRect, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import type { InputFrame, Vec } from './protocol.ts';

export const fieldSurgeryIds = {
  entry: 'medic-field-dressing-1',
  step: 'medic-surgery-steady-step-1',
  aside: 'medic-surgery-set-aside-1',
} as const;
export const fieldDressingRules = {
  range: 104,
  facingDot: .866,
  preparationTicks: 16,
  doseTicks: 6,
  doses: 3,
  doseAmount: 12,
  stepDistance: 32,
  holdTicks: 24,
  cueTicks: 6,
} as const;

export type FieldDressingStatus = {
  phase: 'idle' | 'preparing' | 'applying' | 'held';
  ready: boolean;
  patient?: string;
  startedAt?: number;
  nextAt?: number;
  doses?: number;
  stepRemaining?: number;
  canHold?: boolean;
};
export type FieldDressingCue = Vec & {
  kind: 'medic-dressing';
  id: number;
  owner: string;
  patient: string;
  toX: number;
  toY: number;
  radius: number;
  at: number;
  until: number;
};

type Treatment = {
  target: string;
  last: Vec;
  damageBefore: number;
  at: number;
  nextAt: number;
  dosesGiven: number;
  limit: number;
  walked: number;
  walking: boolean;
  setAside: boolean;
  holdingUntil: number;
};
type CareEvent = 'prepare' | 'dose' | 'step' | 'hold' | 'resume' | 'stop' | 'finish';
export type FieldSurgeryWorld = {
  tick: number;
  players: ReadonlyMap<string, Player>;
  obstacles: readonly Rect[];
  nextId: () => number;
  recovery: (owner: Player) => number;
  heal: (owner: Player, target: Player, base: number) => number;
  report: (owner: Player, event: CareEvent, at: Vec) => void;
};

const active = (player: Player | undefined): player is Player =>
  !!player && player.connected && !player.expired && player.status === 'active' && player.health > 0;
const owns = (owner: Player | undefined): owner is Player =>
  active(owner) && owner.classId === 'medic' && owner.skills.includes(fieldSurgeryIds.entry);
const injured = (player: Player | undefined): player is Player =>
  active(player) && player.maxHealth - player.health > 1e-6;
const withinReach = (owner: Player, target: Player, world: FieldSurgeryWorld) =>
  owner.id === target.id || (distance(owner, target) <= fieldDressingRules.range &&
    world.obstacles.every(wall => segmentRect(owner, target, wall, 1) === null));
const moving = (input: InputFrame) => Math.hypot(input.moveX, input.moveY) > 1e-6;
const occupied = (i: InputFrame) => i.fire || i.dodge || i.reload || i.q || i.e || i.ultimate ||
  i.technique2 || i.technique3 || i.interact || i.sprint || i.supply >= 0;
const recovering = (owner: Player, tick: number) => Math.max(owner.dashUntil, owner.reloadAt, owner.channelUntil) > tick;
const at = (p: Vec) => ({ x: p.x, y: p.y });
const canHold = (owner: Player, job: Treatment) =>
  job.dosesGiven > 0 && !job.setAside && owner.skills.includes(fieldSurgeryIds.aside);
const canWalk = (owner: Player, job: Treatment) =>
  job.dosesGiven > 0 && job.walked < fieldDressingRules.stepDistance && owner.skills.includes(fieldSurgeryIds.step);

function selectPatient(owner: Player, aim: number, world: FieldSurgeryWorld) {
  const facing = { x: Math.cos(aim), y: Math.sin(aim) };
  let closest: Player | undefined;
  let nearestDistance = Infinity;
  for (const peer of world.players.values()) {
    if (peer.id === owner.id || !active(peer)) continue;
    const dx = peer.x - owner.x, dy = peer.y - owner.y;
    const span = Math.hypot(dx, dy);
    if (span > fieldDressingRules.range || span > nearestDistance ||
        dx * facing.x + dy * facing.y < span * fieldDressingRules.facingDot) continue;
    if (span === nearestDistance && closest && peer.id >= closest.id) continue;
    closest = peer;
    nearestDistance = span;
  }
  const target = closest ?? owner;
  return injured(target) && withinReach(owner, target, world) ? target : undefined;
}

export class FieldSurgery {
  private readonly treatments = new Map<string, Treatment>();
  private readonly pulses = new Map<string, FieldDressingCue>();

  get hasTreatments() {
    return this.treatments.size > 0;
  }

  state(owner: string) {
    const job = this.treatments.get(owner);
    return job && {
      target: job.target, at: job.at, nextAt: job.nextAt, dosesGiven: job.dosesGiven,
      limit: job.limit, walked: job.walked, holdingUntil: job.holdingUntil,
    };
  }

  status(owner: Player, world: FieldSurgeryWorld, combat: boolean): FieldDressingStatus {
    if (!combat || !owns(owner)) return { phase: 'idle', ready: false };
    const job = this.treatments.get(owner.id);
    const still = !moving(owner.input) && !occupied(owner.input) && !recovering(owner, world.tick);
    if (!job) {
      const target = selectPatient(owner, owner.aim, world);
      return { phase: 'idle', ready: still && owner.qAt <= world.tick && !!target, patient: target?.id };
    }
    const target = world.players.get(job.target);
    const phase = job.holdingUntil ? 'held' : job.dosesGiven ? 'applying' : 'preparing';
    return {
      phase, patient: job.target, startedAt: job.at,
      nextAt: job.holdingUntil || job.nextAt, doses: job.dosesGiven,
      ready: phase !== 'held' || (still && injured(target) && withinReach(owner, target, world)),
      canHold: phase === 'applying' && canHold(owner, job),
      stepRemaining: canWalk(owner, job) ? fieldDressingRules.stepDistance - job.walked : undefined,
    };
  }

  cues(now: number) {
    return [...this.pulses.values()].filter(pulse => pulse.until > now);
  }

  command(owner: Player, input: InputFrame, world: FieldSurgeryWorld) {
    const job = this.treatments.get(owner.id);
    if (job) {
      this.continueTreatment(owner, input, job, world);
      return;
    }
    if (!input.technique1 || !owns(owner) || moving(input) || occupied(input) ||
        owner.qAt > world.tick || recovering(owner, world.tick)) return;
    const target = selectPatient(owner, input.aim, world);
    if (!target) return;
    this.treatments.set(owner.id, {
      target: target.id, last: at(owner), damageBefore: owner.damageTaken, at: world.tick,
      nextAt: world.tick + fieldDressingRules.preparationTicks, dosesGiven: 0, limit: fieldDressingRules.doses,
      walked: 0, walking: false, setAside: false, holdingUntil: 0,
    });
    world.report(owner, 'prepare', owner);
  }

  private continueTreatment(owner: Player, input: InputFrame, job: Treatment, world: FieldSurgeryWorld) {
    if (job.holdingUntil) {
      if (!input.technique1 || moving(input) || occupied(input) || recovering(owner, world.tick) ||
          world.tick >= job.holdingUntil) return;
      const target = world.players.get(job.target);
      if (!injured(target) || !withinReach(owner, target, world)) return;
      job.holdingUntil = 0;
      job.last = at(owner);
      job.nextAt = Math.max(world.tick, job.nextAt);
      world.report(owner, 'resume', owner);
      return;
    }
    if (input.technique1 && !moving(input) && !occupied(input) && canHold(owner, job)) {
      job.setAside = true;
      job.limit = job.dosesGiven + 1;
      job.holdingUntil = world.tick + fieldDressingRules.holdTicks;
      world.report(owner, 'hold', owner);
      return;
    }
    job.walking = moving(input) && canWalk(owner, job);
    if (input.technique1 || occupied(input) || (moving(input) && !job.walking)) this.stop(owner, job, world);
  }

  advance(world: FieldSurgeryWorld) {
    for (const [id, job] of this.treatments) {
      const owner = world.players.get(id);
      if (!owns(owner)) {
        this.treatments.delete(id);
        continue;
      }
      const target = world.players.get(job.target);
      if (!injured(target) || owner.damageTaken !== job.damageBefore ||
          (job.dosesGiven === 0 && owner.qAt > world.tick)) {
        this.stop(owner, job, world);
        continue;
      }
      if (job.holdingUntil) {
        if (world.tick >= job.holdingUntil) this.stop(owner, job, world);
        continue;
      }
      if (recovering(owner, world.tick) || !withinReach(owner, target, world) || !this.acceptMovement(owner, job, world)) {
        this.stop(owner, job, world);
        continue;
      }
      if (world.tick < job.nextAt) continue;
      const restored = world.heal(owner, target, fieldDressingRules.doseAmount);
      if (restored <= 0) {
        this.stop(owner, job, world);
        continue;
      }
      if (job.dosesGiven === 0) owner.qAt = world.tick + world.recovery(owner);
      this.pulses.set(owner.id, {
        kind: 'medic-dressing', id: world.nextId(), owner: owner.id, patient: target.id,
        x: owner.x, y: owner.y, toX: target.x, toY: target.y,
        radius: 15, at: world.tick, until: world.tick + fieldDressingRules.cueTicks,
      });
      world.report(owner, 'dose', target);
      job.dosesGiven++;
      if (job.dosesGiven === job.limit || !injured(target)) {
        this.treatments.delete(id);
        world.report(owner, 'finish', owner);
        continue;
      }
      job.nextAt += fieldDressingRules.doseTicks;
    }
  }

  private acceptMovement(owner: Player, job: Treatment, world: FieldSurgeryWorld) {
    const step = distance(owner, job.last);
    if (step <= .05) return true;
    if (!job.walking || job.walked + step > fieldDressingRules.stepDistance + 1e-6) return false;
    if (job.walked === 0) world.report(owner, 'step', owner);
    job.walked += step;
    job.last = at(owner);
    return true;
  }

  drop(player: string) {
    this.treatments.delete(player);
    this.pulses.delete(player);
    for (const [owner, treatment] of this.treatments) {
      if (treatment.target === player) this.treatments.delete(owner);
    }
    for (const [owner, pulse] of this.pulses) {
      if (pulse.patient === player) this.pulses.delete(owner);
    }
  }

  clear() {
    this.treatments.clear();
    this.pulses.clear();
  }

  private stop(owner: Player, job: Treatment, world: FieldSurgeryWorld) {
    this.treatments.delete(owner.id);
    world.report(owner, 'stop', owner);
  }
}
