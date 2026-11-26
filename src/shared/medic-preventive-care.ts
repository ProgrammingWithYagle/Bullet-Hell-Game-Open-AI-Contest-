import type { Player } from './game.ts';
import type { InputFrame, Vec } from './protocol.ts';
import { distance, segmentCircle, segmentRect, type Rect } from './geometry.ts';
import { activeCareParticipant, aimedCarePatient, careLineClear } from './medic-patients.ts';

export const precautionWrapId = 'medic-precaution-wrap-1';
export const preventiveCareIds = {
  entry: precautionWrapId,
  doorstep: 'medic-preventive-doorstep-kit-1',
  layered: 'medic-preventive-layered-wrap-1',
} as const;

export const precautionRules = {
  reach: 88,
  facingDot: .866,
  wearTicks: 66,
  retryTicks: 54,
  settleTicks: 5,
  baseMaximum: 14,
  acceptedLossFraction: .48,
  cueTicks: 6,
  stationRadius: 23,
  layerContacts: 2,
} as const;

export type PrecautionStatus = {
  phase: 'idle' | 'armed' | 'settling' | 'station' | 'layered';
  ready: boolean;
  patient?: string;
  until?: number;
  canPlace?: boolean;
  canLayer?: boolean;
  capturedHits?: number;
};

type PrecautionEvent = 'wrap' | 'settle' | 'dose' | 'place' | 'claim' | 'layer' | 'capture';
export type PrecautionWorld = {
  tick: number;
  players: ReadonlyMap<string, Player>;
  obstacles: readonly Rect[];
  bounds: Rect;
  lavaPits: readonly (Vec & { radius: number })[];
  nextId: () => number;
  recovery: (owner: Player) => number;
  heal: (owner: Player, patient: Player, base: number, ceiling: number) => number;
  report: (owner: Player, event: PrecautionEvent, at: Vec) => void;
};

type Reserve = { owner: string; until: number; at: number; cueId: number };
type Wrap = Reserve & {
  patient: string;
  wasPlaced?: true;
  dose?: { at: number; limit: number };
  layer?: { hits: number; limit: number };
};
type Station = Reserve & Vec & { placedAt: number };
type Crossing = { station: string; walker: string; contact: number };
export type PrecautionCue = Vec & {
  id: number;
  owner: string;
  radius: number;
  at: number;
  until: number;
} & ({
  kind: 'medic-precaution-wrap';
  patient: string;
  layered?: boolean;
} | {
  kind: 'medic-precaution-dose';
  patient: string;
} | {
  kind: 'medic-precaution-station';
});

const plantedHands = (input: InputFrame) => Math.hypot(input.moveX, input.moveY) < 1e-6 &&
  !input.fire && !input.reload && !input.q && !input.e && !input.ultimate && !input.dodge && !input.sprint &&
  !input.technique1 && !input.technique2 && !input.interact && input.supply < 0;
const canAct = (owner: Player, tick: number) => Math.max(owner.dashUntil, owner.reloadAt, owner.channelUntil) <= tick;
const owns = (owner: Player | undefined): owner is Player =>
  activeCareParticipant(owner) && owner.classId === 'medic' && owner.skills.includes(precautionWrapId);
const selectPatient = (owner: Player, world: PrecautionWorld) =>
  aimedCarePatient(owner, owner.aim, world.players, world.obstacles, precautionRules.reach, precautionRules.facingDot, false);
const withinCare = (owner: Player, patient: Player, world: PrecautionWorld) => owner.id === patient.id ||
  (distance(owner, patient) <= precautionRules.reach && careLineClear(owner, patient, world.obstacles));

function stationFits(p: Vec, world: PrecautionWorld) {
  const radius = precautionRules.stationRadius, { x, y, width, height } = world.bounds;
  return p.x >= x + radius && p.x <= x + width - radius && p.y >= y + radius && p.y <= y + height - radius &&
    world.obstacles.every(wall => segmentRect(p, p, wall, radius) === null) &&
    world.lavaPits.every(lava => distance(p, lava) > lava.radius + radius);
}

function canPlaceStation(owner: Player, wrap: Wrap, world: PrecautionWorld) {
  return wrap.patient === owner.id && !wrap.wasPlaced && owner.skills.includes(preventiveCareIds.doorstep) &&
    stationFits(owner, world);
}

export class PreventiveCare {
  private readonly wraps = new Map<string, Wrap>();
  private readonly pulses = new Map<string, PrecautionCue>();
  private readonly rearm = new Map<string, number>();
  private readonly stations = new Map<string, Station>();
  private readonly crossings: Crossing[] = [];

  get active() { return this.wraps.size > 0 || this.hasStations; }
  get hasStations() { return this.stations.size > 0; }

  clear() {
    this.wraps.clear();
    this.pulses.clear();
    this.rearm.clear();
    this.stations.clear();
    this.crossings.length = 0;
  }

  drop(id: string) {
    this.stations.delete(id);
    for (const [patient, wrap] of this.wraps) {
      if (wrap.owner === id || patient === id) this.wraps.delete(patient);
    }
  }

  private ownedWrap(owner: Player) {
    for (const wrap of this.wraps.values()) if (wrap.owner === owner.id) return wrap;
  }

  private canPrime(owner: Player, tick: number) {
    return owner.qAt <= tick && (this.rearm.get(owner.id) ?? 0) <= tick;
  }

  status(owner: Player, world: PrecautionWorld, combat: boolean): PrecautionStatus {
    if (!combat || !owns(owner)) return { phase: 'idle', ready: false };
    const station = this.stations.get(owner.id);
    if (station) return { phase: 'station', ready: false, until: station.until };
    const wrap = this.ownedWrap(owner);
    if (wrap) {
      if (wrap.dose) return { phase: 'settling', ready: false, patient: wrap.patient, until: wrap.dose.at };
      const patient = world.players.get(wrap.patient);
      const still = plantedHands(owner.input) && canAct(owner, world.tick);
      const reachable = activeCareParticipant(patient) && withinCare(owner, patient, world);
      if (wrap.layer) return { phase: 'layered', ready: still && reachable && wrap.layer.hits > 0,
        capturedHits: wrap.layer.hits, patient: wrap.patient, until: wrap.until };
      const canPlace = canPlaceStation(owner, wrap, world);
      const canLayer = owner.skills.includes(preventiveCareIds.layered) && reachable;
      return { phase: 'armed', ready: still && (canPlace || canLayer), patient: wrap.patient, until: wrap.until, canPlace, canLayer };
    }
    const patient = selectPatient(owner, world);
    return { phase: 'idle', patient: patient?.id, ready: !!patient && !this.wraps.has(patient.id) &&
      this.canPrime(owner, world.tick) && canAct(owner, world.tick) && plantedHands(owner.input),
      until: Math.max(owner.qAt, this.rearm.get(owner.id) ?? 0) };
  }

  command(owner: Player, input: InputFrame, world: PrecautionWorld) {
    const now = world.tick;
    if (!input.technique3 || !owns(owner) || !plantedHands(input) || !canAct(owner, now) ||
        owner.x !== owner.oldX || owner.y !== owner.oldY) return;
    const wrap = this.ownedWrap(owner);
    if (wrap) {
      this.adjustWrap(owner, wrap, world);
      return;
    }
    if (!this.canPrime(owner, now) || this.stations.has(owner.id)) return;
    const patient = selectPatient(owner, world);
    if (!patient || this.wraps.has(patient.id)) return;
    this.wraps.set(patient.id, { owner: owner.id, patient: patient.id, at: now,
      until: now + precautionRules.wearTicks, cueId: world.nextId() });
    this.rearm.set(owner.id, now + precautionRules.wearTicks + precautionRules.retryTicks);
    world.report(owner, 'wrap', patient);
  }

  private adjustWrap(owner: Player, wrap: Wrap, world: PrecautionWorld) {
    const now = world.tick, patient = world.players.get(wrap.patient);
    if (wrap.dose || now >= wrap.until || !activeCareParticipant(patient) || !withinCare(owner, patient, world)) return;
    if (wrap.layer) {
      if (wrap.layer.hits) {
        wrap.dose = { at: now + precautionRules.settleTicks, limit: wrap.layer.limit };
        world.report(owner, 'settle', patient);
      }
      return;
    }
    if (owner.qAt > now) return;
    if (owner.skills.includes(preventiveCareIds.layered)) {
      wrap.layer = { hits: 0, limit: 0 };
      world.report(owner, 'layer', patient);
      return;
    }
    if (canPlaceStation(owner, wrap, world)) {
      this.wraps.delete(owner.id);
      this.stations.set(owner.id, { owner: owner.id, x: owner.x, y: owner.y, at: wrap.at, placedAt: now,
        until: wrap.until, cueId: wrap.cueId });
      world.report(owner, 'place', owner);
    }
  }

  recordWalk(walker: Player, to: Vec, now: number) {
    const radius = precautionRules.stationRadius;
    for (const [station, spot] of this.stations) {
      if (now <= spot.placedAt || now >= spot.until || distance(walker, spot) <= radius || distance(to, spot) > radius) continue;
      const contact = segmentCircle(walker, to, spot, radius);
      if (contact !== null) this.crossings.push({ station, walker: walker.id, contact });
    }
  }

  resolveWalks(world: PrecautionWorld) {
    const crossing = this.crossings.splice(0);
    crossing.sort((a,b) => a.contact - b.contact || a.walker.localeCompare(b.walker) || a.station.localeCompare(b.station));
    for (const { station, walker } of crossing) {
      const spot = this.stations.get(station), patient = world.players.get(walker), owner = world.players.get(station);
      if (!spot || !owns(owner) || !owner.skills.includes(preventiveCareIds.doorstep) || owner.qAt > world.tick ||
          !activeCareParticipant(patient) || this.wraps.has(walker) || !stationFits(spot, world)) continue;
      this.stations.delete(station);
      this.wraps.set(walker, { owner: station, patient: walker, at: spot.at, until: spot.until, cueId: spot.cueId, wasPlaced: true });
      world.report(owner, 'claim', patient);
    }
  }

  hostileImpact(patient: Player, acceptedHealthLoss: number, world: PrecautionWorld) {
    const wrap = this.wraps.get(patient.id);
    if (!wrap || wrap.dose || wrap.until <= world.tick || !activeCareParticipant(patient) || acceptedHealthLoss <= 0 ||
        (wrap.layer?.hits ?? 0) >= precautionRules.layerContacts) return;
    const owner = world.players.get(wrap.owner);
    if (!owns(owner)) return;
    if (!wrap.layer?.hits) {
      if (owner.qAt > world.tick) return;
      owner.qAt = world.tick + world.recovery(owner);
    }
    const limit = acceptedHealthLoss * precautionRules.acceptedLossFraction;
    if (wrap.layer) {
      wrap.layer.hits++;
      wrap.layer.limit += limit;
      world.report(owner, 'capture', patient);
    } else {
      wrap.dose = { at: world.tick + precautionRules.settleTicks, limit };
      world.report(owner, 'settle', patient);
    }
  }

  advance(world: PrecautionWorld) {
    const now = world.tick;
    for (const [id, spot] of this.stations) {
      const owner = world.players.get(id);
      if (!owns(owner) || !owner.skills.includes(preventiveCareIds.doorstep) || owner.qAt > now ||
          now >= spot.until || !stationFits(spot, world)) this.stations.delete(id);
    }
    for (const [id, wrap] of this.wraps) {
      const owner = world.players.get(wrap.owner), patient = world.players.get(id);
      const unused = !wrap.dose && !wrap.layer?.hits;
      if (!owns(owner) || !activeCareParticipant(patient) || (!wrap.dose && now >= wrap.until) || (unused && owner.qAt > now) ||
          (wrap.layer && !owner.skills.includes(preventiveCareIds.layered))) {
        this.wraps.delete(id);
        continue;
      }
      if (!wrap.dose || now < wrap.dose.at) continue;
      this.wraps.delete(id);
      if (world.heal(owner, patient, precautionRules.baseMaximum, wrap.dose.limit) <= 0) continue;
      this.pulses.set(id, { kind: 'medic-precaution-dose', id: world.nextId(), owner: owner.id, patient: id,
        x: patient.x, y: patient.y, radius: 14, at: now, until: now + precautionRules.cueTicks });
      world.report(owner, 'dose', patient);
    }
  }

  cues(world: Pick<PrecautionWorld, 'players' | 'tick'>) {
    const out = [...this.pulses.values()].filter(pulse => pulse.until > world.tick);
    for (const wrap of this.wraps.values()) {
      const patient = world.players.get(wrap.patient);
      if (!activeCareParticipant(patient) || wrap.dose || wrap.until <= world.tick) continue;
      out.push({ kind: 'medic-precaution-wrap', id: wrap.cueId, owner: wrap.owner, patient: patient.id,
        x: patient.x, y: patient.y, radius: 12, at: wrap.at, until: wrap.until, ...(wrap.layer ? { layered: true } : {}) });
    }
    for (const spot of this.stations.values()) {
      if (spot.until <= world.tick) continue;
      out.push({ kind: 'medic-precaution-station', id: spot.cueId, owner: spot.owner,
        x: spot.x, y: spot.y, radius: precautionRules.stationRadius, at: spot.placedAt, until: spot.until });
    }
    return out;
  }
}
