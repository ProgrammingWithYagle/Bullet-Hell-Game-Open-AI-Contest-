import { distance, moveBody, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import { activeCareParticipant, aimedCarePatient } from './medic-patients.ts';
import type { InputFrame, Vec } from './protocol.ts';

export const rapidResponseIds = {
  entry: 'medic-rescue-run-1',
  switchback: 'medic-response-switchback-1',
  handoff: 'medic-response-moving-handoff-1',
} as const;

export const rapidResponseRules = {
  speed: 1.45,
  runTicks: 17,
  arrivalTicks: 24,
  arrivalDrift: 5,
  requiredWalk: 48,
  switchWalk: 36,
  switchDot: .5,
  switchTicks: 7,
  minimumInput: .3,
  probeDistance: 5,
  minimumStep: 2,
  range: 64,
  facingDot: .866,
  dose: 16,
  movingDose: 12,
  cueTicks: 6,
} as const;

export type RapidResponseStatus = {
  phase: 'idle' | 'running' | 'arrived';
  ready: boolean;
  patient?: string;
  until?: number;
  walked?: number;
  switched?: boolean;
  canSwitch?: boolean;
  canHandoff?: boolean;
};

export type RapidResponseCue = Vec & {
  kind: 'medic-response-dose';
  id: number;
  owner: string;
  patient: string;
  toX: number;
  toY: number;
  radius: number;
  at: number;
  until: number;
};

type ResponseEvent = 'launch' | 'arrive' | 'switch' | 'handoff' | 'dose';
export type RapidResponseWorld = {
  tick: number;
  players: ReadonlyMap<string, Player>;
  obstacles: Rect[];
  playerRadius: number;
  nextId: () => number;
  recovery: (owner: Player) => number;
  heal: (owner: Player, patient: Player, base: number) => number;
  report: (owner: Player, event: ResponseEvent, point: Vec) => void;
};

type Route = {
  initial: Vec;
  until: number;
  damageBefore: number;
  walked: number;
  switched: boolean;
  arrival?: Vec;
  request?: 'dose' | 'handoff' | 'switch';
  turn?: Vec;
};

const position = ({ x, y }: Vec) => ({ x, y });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const direction = (input: InputFrame) => {
  const magnitude = Math.hypot(input.moveX, input.moveY);
  if (magnitude < rapidResponseRules.minimumInput) return undefined;
  return { x: input.moveX / magnitude, y: input.moveY / magnitude };
};
const stopped = (input: InputFrame) => Math.hypot(input.moveX, input.moveY) <= 1e-6;
const usingHands = (input: InputFrame) => input.fire || input.reload || input.sprint || input.dodge || input.q ||
  input.e || input.ultimate || input.technique1 || input.technique3 || input.supply >= 0;
export const responseWalkAllowed = (input: InputFrame) => !!direction(input) && !usingHands(input) && !input.interact;
const available = (owner: Player, tick: number) => Math.max(owner.dashUntil, owner.reloadAt, owner.channelUntil) <= tick;
const owns = (owner: Player | undefined): owner is Player =>
  activeCareParticipant(owner) && owner.classId === 'medic' && owner.skills.includes(rapidResponseIds.entry);

function canTurn(route: Route, owner: Player, heading: Vec | undefined) {
  return !!heading && !route.switched && route.walked >= rapidResponseRules.switchWalk &&
    owner.skills.includes(rapidResponseIds.switchback) && dot(heading, route.initial) <= rapidResponseRules.switchDot;
}

function patientAt(owner: Player, world: RapidResponseWorld) {
  return aimedCarePatient(owner, owner.aim, world.players, world.obstacles,
    rapidResponseRules.range, rapidResponseRules.facingDot);
}

export class RapidResponse {
  private readonly routes = new Map<string, Route>();
  private readonly pulses = new Map<string, RapidResponseCue>();

  get active() { return this.routes.size > 0; }

  has(owner: string) { return this.routes.has(owner); }

  drop(owner: string) {
    this.routes.delete(owner);
    this.pulses.delete(owner);
  }

  clear() {
    this.routes.clear();
    this.pulses.clear();
  }

  cues(tick: number) {
    return [...this.pulses.values()].filter(cue => cue.until > tick);
  }

  status(owner: Player, world: RapidResponseWorld, combat: boolean): RapidResponseStatus {
    if (!combat || !owns(owner)) return { phase: 'idle', ready: false };
    const route = this.routes.get(owner.id);
    if (!route || world.tick >= route.until || owner.damageTaken !== route.damageBefore) {
      return { phase: 'idle', ready: owner.eAt <= world.tick && available(owner, world.tick) };
    }
    const { input } = owner;
    const planted = stopped(input) && !usingHands(input) && !input.interact && available(owner, world.tick);
    const heading = direction(input);
    if (route.arrival) {
      const patient = patientAt(owner, world);
      return { phase: 'arrived', ready: !!patient && planted, patient: patient?.id, until: route.until };
    }
    const canSwitch = canTurn(route, owner, heading);
    const handoff = !!heading && route.walked >= rapidResponseRules.requiredWalk && owner.skills.includes(rapidResponseIds.handoff);
    const patient = handoff ? patientAt(owner, world) : undefined;
    return { phase: 'running', ready: (canSwitch || !!patient) && !usingHands(input) && !input.interact,
      until: route.until, walked: route.walked, switched: route.switched,
      patient: patient?.id, canSwitch, canHandoff: !!patient };
  }

  beforeMove(owner: Player, input: InputFrame, world: RapidResponseWorld) {
    const id = owner.id;
    const route = this.routes.get(id);
    if (!owns(owner)) {
      this.drop(id);
      return 1;
    }
    const now = world.tick;
    const heading = direction(input);
    if (!route) {
      if (!input.technique2 || !heading || usingHands(input) || input.interact || owner.eAt > now || !available(owner, now)) return 1;
      const step = moveBody(position(owner), { x: heading.x * rapidResponseRules.probeDistance,
        y: heading.y * rapidResponseRules.probeDistance }, world.playerRadius, world.obstacles);
      if (dot({ x: step.x - owner.x, y: step.y - owner.y }, heading) < rapidResponseRules.minimumStep) return 1;
      this.routes.set(owner.id, { initial: heading, until: now + rapidResponseRules.runTicks,
        damageBefore: owner.damageTaken, walked: 0, switched: false });
      owner.eAt = now + world.recovery(owner);
      world.report(owner, 'launch', owner);
      return rapidResponseRules.speed;
    }
    route.request = undefined;
    route.turn = undefined;
    if (now >= route.until || owner.damageTaken !== route.damageBefore) {
      this.routes.delete(owner.id);
      return 1;
    }
    if (route.arrival) {
      if (!stopped(input)) this.routes.delete(owner.id);
      else if (input.technique2 && !usingHands(input) && !input.interact && available(owner, now)) route.request = 'dose';
      return 1;
    }
    if (usingHands(input) || !available(owner, now)) {
      this.routes.delete(owner.id);
      return 1;
    }
    if (stopped(input)) {
      if (route.walked < rapidResponseRules.requiredWalk) this.routes.delete(owner.id);
      else {
        route.arrival = position(owner);
        route.until = now + rapidResponseRules.arrivalTicks;
        if (input.technique2 && !input.interact) route.request = 'dose';
        world.report(owner, 'arrive', owner);
      }
      return 1;
    }
    if (!heading || input.interact) {
      this.routes.delete(owner.id);
      return 1;
    }
    if (input.technique2 && canTurn(route, owner, heading)) route.request = 'switch';
    else if (input.technique2 && route.walked >= rapidResponseRules.requiredWalk && owner.skills.includes(rapidResponseIds.handoff)) {
      route.request = 'handoff';
    }
    return rapidResponseRules.speed;
  }

  record(owner: Player, from: Vec, heading: Vec) {
    const route = this.routes.get(owner.id);
    if (!route || route.arrival) return;
    const delta = { x: owner.x - from.x, y: owner.y - from.y };
    const travel = Math.hypot(delta.x, delta.y);
    if (travel < rapidResponseRules.minimumStep || dot(delta, heading) <= 0) return;
    route.walked += travel;
    route.turn = { x: delta.x / travel, y: delta.y / travel };
  }

  advance(world: RapidResponseWorld) {
    for (const [id, route] of this.routes) {
      const owner = world.players.get(id);
      if (!owns(owner) || world.tick >= route.until || owner.damageTaken !== route.damageBefore ||
          (route.arrival && distance(owner, route.arrival) > rapidResponseRules.arrivalDrift)) {
        this.routes.delete(id);
        continue;
      }
      if (route.request === 'switch' && route.turn && dot(route.turn, route.initial) <= rapidResponseRules.switchDot) {
        route.switched = true;
        route.until += rapidResponseRules.switchTicks;
        world.report(owner, 'switch', owner);
      }
      const movingDose = route.request === 'handoff' && route.turn;
      if (route.request !== 'dose' && !movingDose) continue;
      const patient = patientAt(owner, world);
      if (!patient || world.heal(owner, patient, movingDose ? rapidResponseRules.movingDose : rapidResponseRules.dose) <= 0) continue;
      this.routes.delete(id);
      const location = position(patient);
      this.pulses.set(id, { ...position(owner), kind: 'medic-response-dose', id: world.nextId(), owner: id,
        patient: patient.id, toX: location.x, toY: location.y, radius: 13, at: world.tick,
        until: world.tick + rapidResponseRules.cueTicks });
      world.report(owner, movingDose ? 'handoff' : 'dose', location);
    }
  }
}
