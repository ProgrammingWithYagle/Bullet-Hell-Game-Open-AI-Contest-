import { distance } from './geometry.ts';
import type { InputFrame, Vec } from './protocol.ts';

export const measuredIds = {
  entry: 'swordsman-held-edge-1',
  turn: 'swordsman-measured-turn-edge-1',
  follow: 'swordsman-measured-second-line-1',
} as const;

const degrees = (value: number) => value * Math.PI / 180;
export const measuredRules = {
  prepareTicks: 17,
  holdTicks: 57,
  turnTicks: 9,
  followTicks: 22,
  maximumShift: 15,
  releaseAngle: degrees(20),
  maximumTurn: degrees(80),
  maximumFollow: degrees(95),
  first: { reach: 172, arc: degrees(108), damage: 110, ordinaryTargets: 4 },
  follow: { reach: 132, arc: degrees(72), damage: 53, ordinaryTargets: 2 },
} as const;

type MeasuredFighter = Vec & {
  id: string;
  aim: number;
  status: string;
  connected: boolean;
  dashUntil: number;
  reloadAt: number;
  skills: readonly string[];
};
type Strike = {
  reach: number;
  arc: number;
  damage: number;
  ordinaryTargets: number;
};
export type MeasuredStanceContext = {
  tick: number;
  active: boolean;
  nextId(): number;
  canPlant(player: MeasuredFighter): boolean;
  payRecovery(player: MeasuredFighter): void;
  strike(player: MeasuredFighter, aim: number, cut: Strike): number;
  sound(name: string, player: MeasuredFighter): void;
};
type HeldEdge = Vec & {
  id: number;
  owner: string;
  aim: number;
  plantedAt: number;
  readyAt: number;
  until: number;
  turned: boolean;
  fitting: string | undefined;
  following: boolean;
  releaseAim?: number;
};
type CueState = 'preparing' | 'ready' | 'following' | 'cut';
export type MeasuredStanceCue = Vec & {
  kind: 'sword-measured-stance';
  id: number;
  owner: string;
  aim: number;
  radius: number;
  arc: number;
  at: number;
  until: number;
  state: CueState;
};

const standing = (player: MeasuredFighter, now: number) =>
  player.connected && player.status === 'active' && now >= player.dashUntil && now >= player.reloadAt;

export class MeasuredStance {
  private edges = new Map<string, HeldEdge>();
  private releases: MeasuredStanceCue[] = [];

  get active() {
    return this.edges.size > 0 || this.releases.length > 0;
  }

  clear() {
    this.edges.clear();
    this.releases = [];
  }

  drop(id: string) {
    this.edges.delete(id);
    this.releases = this.releases.filter(cue => cue.owner !== id);
  }

  holding(id: string) {
    return this.edges.has(id);
  }

  private present(player: MeasuredFighter, edge: HeldEdge, now: number) {
    return standing(player, now) && now < edge.until && distance(player, edge) <= measuredRules.maximumShift &&
      player.skills.includes(measuredIds.entry) && (!edge.fitting || player.skills.includes(edge.fitting));
  }

  status(player: MeasuredFighter, context: MeasuredStanceContext) {
    const edge = this.edges.get(player.id);
    const current = context.active && edge && this.present(player, edge, context.tick) ? edge : undefined;
    return {
      canPlant: Boolean(context.active && !current && standing(player, context.tick) &&
        player.skills.includes(measuredIds.entry) && context.canPlant(player)),
      readyAt: current?.readyAt ?? 0,
      until: current?.until ?? 0,
      turned: current?.turned ?? false,
      following: current?.following ?? false,
      action: current ? this.actionFor(current, player.aim, context.tick) : undefined,
    };
  }

  private actionFor(edge: HeldEdge, aim: number, now: number) {
    if (now < edge.readyAt) return undefined;
    const difference = aim - edge.aim;
    const angle = Math.abs(Math.atan2(Math.sin(difference), Math.cos(difference)));
    if (edge.following) {
      return angle > measuredRules.releaseAngle && angle <= measuredRules.maximumFollow ? 'follow' : undefined;
    }
    if (angle <= measuredRules.releaseAngle) return 'first';
    if (!edge.turned && edge.fitting === measuredIds.turn && angle <= measuredRules.maximumTurn &&
      now + measuredRules.turnTicks < edge.until) return 'turn';
    return undefined;
  }

  private cue(edge: HeldEdge, shape: Strike, state: CueState): MeasuredStanceCue {
    return {
      kind: 'sword-measured-stance', id: edge.id, owner: edge.owner,
      x: edge.x, y: edge.y, aim: edge.aim, radius: shape.reach, arc: shape.arc,
      at: edge.plantedAt, until: edge.until, state,
    };
  }

  cues(now: number) {
    return [
      ...Array.from(this.edges.values(), edge => this.cue(edge,
        edge.following ? measuredRules.follow : measuredRules.first,
        edge.following ? 'following' : now < edge.readyAt ? 'preparing' : 'ready')),
      ...this.releases,
    ];
  }

  advance(players: ReadonlyMap<string, MeasuredFighter>, context: MeasuredStanceContext) {
    const now = context.tick;
    for (const [id, edge] of this.edges) {
      const player = players.get(id);
      if (!player || !this.present(player, edge, now)) {
        this.edges.delete(id);
      } else if (edge.releaseAim !== undefined) {
        this.resolve(player, edge, edge.releaseAim, context);
      }
    }
    this.releases = this.releases.filter(cue => {
      const player = players.get(cue.owner);
      return player?.connected && player.status === 'active' && now < cue.until;
    });
  }

  command(player: MeasuredFighter, input: InputFrame, moving: boolean, context: MeasuredStanceContext) {
    const { tick } = context;
    const edge = this.edges.get(player.id);
    const interrupted = !context.active || !standing(player, tick) || moving ||
      input.dodge || input.sprint || input.reload || input.supply >= 0 ||
      input.q || input.e || input.ultimate || input.technique2 || input.technique3;
    if (interrupted || edge && !this.present(player, edge, tick)) {
      this.edges.delete(player.id);
      return false;
    }
    if (!input.technique1) return Boolean(edge);
    if (!edge) {
      if (!player.skills.includes(measuredIds.entry) || !context.canPlant(player)) return false;
      const fitting = player.skills.includes(measuredIds.turn) ? measuredIds.turn :
        player.skills.includes(measuredIds.follow) ? measuredIds.follow : undefined;
      this.edges.set(player.id, {
        id: context.nextId(), owner: player.id, x: player.x, y: player.y, aim: player.aim,
        plantedAt: tick, readyAt: tick + measuredRules.prepareTicks, until: tick + measuredRules.holdTicks,
        turned: false, following: false, fitting,
      });
      context.payRecovery(player);
      context.sound('sword-held-edge-set', player);
      return true;
    }
    const action = this.actionFor(edge, player.aim, tick);
    if (action === 'first') edge.releaseAim = edge.aim;
    if (action === 'follow') edge.releaseAim = player.aim;
    if (action === 'turn') {
      edge.turned = true;
      edge.aim = player.aim;
      edge.readyAt = tick + measuredRules.turnTicks;
      context.sound('sword-held-edge-turn', player);
    }
    return true;
  }

  private resolve(player: MeasuredFighter, edge: HeldEdge, aim: number, context: MeasuredStanceContext) {
    const cut = edge.following ? measuredRules.follow : measuredRules.first;
    const damage = context.strike(player, aim, cut);
    const cue = this.cue(edge, cut, 'cut');
    this.releases.push({ ...cue, id: context.nextId(), x: player.x, y: player.y, aim, at: context.tick, until: context.tick + 7 });
    context.sound(edge.following ? 'sword-held-edge-second' : 'sword-held-edge-cut', player);
    if (!edge.following && damage > 0 && edge.fitting === measuredIds.follow) {
      edge.following = true;
      edge.releaseAim = undefined;
      edge.readyAt = context.tick + 1;
      edge.until = context.tick + measuredRules.followTicks;
      context.sound('sword-held-edge-follow', player);
    } else {
      this.edges.delete(player.id);
    }
  }
}

export type MeasuredStanceStatus = ReturnType<MeasuredStance['status']>;
