import type { BardContext } from './bard-kit.ts';
import type { Player } from './game.ts';
import { distance, segmentCircle, segmentRect } from './geometry.ts';
import { HZ, type InputFrame, type Vec } from './protocol.ts';

export const lamentIds = {
  entry: 'bard-mourning-measure-1',
  cross: 'bard-lament-cross-verse-1',
  closing: 'bard-lament-closing-chord-1',
} as const;

const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const lamentRules = {
  cadence: 2,
  reach: 253,
  minimumReach: 112,
  width: 25,
  posture: 84,
  aimTolerance: .9,
  firstBeat: ticks(.42),
  interval: ticks(.58),
  beats: 5,
  damage: 17,
  minionSlow: .68,
  minionSlowTicks: ticks(.53),
  turnMinimum: .35,
  turnMaximum: 1.3,
  chordProof: 2,
  chordDamage: 33,
  chordRadius: 62,
  display: ticks(.32),
} as const;

export type LamentStatus = {
  phase: 'idle' | 'sustain';
  ready: boolean;
  lane?: { from: Vec; to: Vec };
  turn?: Vec;
  closing?: boolean;
  next?: number;
  until?: number;
  left?: number;
  contacts?: number;
};

export type LamentCue = {
  kind: 'bard-lament-line' | 'bard-lament-pulse' | 'bard-lament-chord';
  owner: string;
  id: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  radius: number;
  at: number;
  until: number;
  turned?: true;
};

type Measure = {
  id: number;
  from: Vec;
  to: Vec;
  heading: number;
  at: number;
  until: number;
  next: number;
  left: number;
  contacts: number;
  delivered: number;
  potency: number;
  turned?: true;
};

const R = lamentRules;
const point = ({ x, y }: Vec): Vec => ({ x, y });
const turnDistance = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const eligible = (p: Player) => p.classId === 'bard' && p.skills.includes(lamentIds.entry) && p.connected &&
  p.status === 'active' && p.health > 0 && !p.expired;
const interrupted = (i: InputFrame) => i.q || i.e || i.ultimate || i.technique1 || i.technique3 || i.dodge || i.sprint || i.interact;

function clearLane(from: Vec, to: Vec, c: BardContext) {
  const terrain = c.terrain;
  if (!terrain) return false;
  const { bounds, lava } = terrain;
  return [from,to].every(p => p.x >= bounds.x + 9 && p.y >= bounds.y + 9 &&
      p.x <= bounds.x + bounds.width - 9 && p.y <= bounds.y + bounds.height - 9) &&
    c.obstacles.every(wall => segmentRect(from,to,wall,6) === null) &&
    lava.every(pit => segmentCircle(from,to,pit,pit.radius + 6) === null);
}

function laidEnd(from: Vec, heading: number, c: BardContext): Vec | undefined {
  const x = Math.cos(heading), y = Math.sin(heading);
  for (let length: number = R.reach; length >= R.minimumReach; length -= 20) {
    const to = { x:from.x + length*x, y:from.y + length*y };
    if (clearLane(from,to,c)) return to;
  }
}

/** A paid line keeps its floor position. Clashes use the issued enemy hit and cover rules. */
export class LamentKit {
  private measures = new Map<string, Measure>();
  private visible: LamentCue[] = [];

  clear() { this.measures.clear(); this.visible = []; }
  drop(id: string) {
    this.measures.delete(id);
    this.visible = this.visible.filter(cue => cue.owner !== id);
  }
  active(id: string) { return this.measures.has(id); }

  status(p: Player, c: BardContext, combat: boolean, cadence: number): LamentStatus {
    if (!combat || !eligible(p)) return { phase:'idle', ready:false };
    const measure = this.measures.get(p.id);
    if (measure) return { phase:'sustain', ready:true, lane:{ from:point(measure.from), to:point(measure.to) },
      turn:this.turnEnd(p,measure,c), closing:this.canClose(p,measure), next:measure.next, until:measure.until,
      left:measure.left, contacts:measure.contacts };
    const ready = cadence >= R.cadence && c.tick >= p.eAt && c.tick >= p.dashUntil && c.tick >= p.channelUntil;
    const end = ready ? laidEnd(p,p.aim,c) : undefined;
    return { phase:'idle', ready:!!end, lane:end ? { from:point(p), to:end } : undefined, until:p.eAt };
  }

  command(p: Player, input: InputFrame, c: BardContext, recovery: () => number, spend: () => boolean) {
    const measure = this.measures.get(p.id);
    if (measure) {
      if (!this.sustained(p,measure,c) || interrupted(input)) return this.end(p,c);
      if (!input.technique2) {
        if (turnDistance(p.aim,measure.heading) > R.aimTolerance) this.end(p,c);
        return;
      }
      const turn = this.turnEnd(p,measure,c);
      if (turn) {
        measure.to = turn;
        measure.heading = p.aim;
        measure.turned = true;
        measure.left--;
        measure.next += R.interval;
        c.sound('bard-lament-turn', p);
        return;
      }
      if (this.canClose(p,measure) && turnDistance(p.aim,measure.heading) <= R.aimTolerance) {
        c.area(p,measure.to,R.chordRadius,R.chordDamage*measure.potency,1,0,undefined,true);
        this.visible.push(this.cue(p,measure,c,'bard-lament-chord',R.chordRadius));
        this.measures.delete(p.id);
        c.sound('bard-lament-chord',p);
        return;
      }
      return this.end(p,c);
    }
    if (!input.technique2 || interrupted(input) || !eligible(p) || c.tick < p.eAt ||
        c.tick < p.dashUntil || c.tick < p.channelUntil) return;
    const to = laidEnd(p,p.aim,c);
    if (!to || !spend()) return;
    const next = c.tick + R.firstBeat;
    this.measures.set(p.id,{ id:c.id(), from:point(p), to, heading:p.aim, at:c.tick,
      until:next + (R.beats - 1)*R.interval + 1, next, left:R.beats, contacts:0, delivered:0, potency:c.stats(p).ability });
    p.eAt = c.tick + recovery();
    c.sound('bard-lament-start',p);
  }

  step(c: BardContext) {
    if (!this.measures.size && !this.visible.length) return;
    const owners = new Map(c.players.map(p => [p.id,p]));
    this.visible = this.visible.filter(cue => cue.until > c.tick && owners.get(cue.owner)?.status === 'active');
    for (const [id, measure] of this.measures) {
      const owner = owners.get(id);
      if (!owner || !eligible(owner)) { this.drop(id); continue; }
      if (!this.sustained(owner,measure,c)) { this.end(owner,c); continue; }
      if (c.tick < measure.next) continue;
      const dealt = owner.damageDealt;
      c.sweep(owner,measure.from,measure.to,R.width,R.damage*measure.potency,new Set(),true,
        { ticks:R.minionSlowTicks, multiplier:R.minionSlow });
      if (owner.damageDealt > dealt) measure.contacts++;
      measure.delivered++;
      this.visible.push(this.cue(owner,measure,c,'bard-lament-pulse',R.width));
      c.sound('bard-lament-pulse',owner);
      measure.next += R.interval;
      if (--measure.left === 0) this.measures.delete(id);
    }
  }

  cues(): LamentCue[] {
    const lines: LamentCue[] = [...this.measures].map(([owner,m]) => ({ kind:'bard-lament-line', owner, id:m.id,
      ...m.from, x2:m.to.x, y2:m.to.y, radius:R.width, at:m.at, until:m.until, turned:m.turned }));
    return [...lines,...this.visible.map(cue => ({...cue}))];
  }

  private canClose(p: Player, m: Measure) {
    return p.skills.includes(lamentIds.closing) && m.contacts >= R.chordProof && m.left > 0;
  }

  private turnEnd(p: Player, m: Measure, c: BardContext) {
    const delta = turnDistance(p.aim,m.heading);
    return p.skills.includes(lamentIds.cross) && !m.turned && m.delivered > 0 && m.left > 1 &&
      delta >= R.turnMinimum && delta <= R.turnMaximum ? laidEnd(m.from,p.aim,c) : undefined;
  }

  private sustained(p: Player, m: Measure, c: BardContext) {
    return eligible(p) && c.tick < m.until && c.tick >= p.dashUntil && c.tick >= p.channelUntil &&
      distance(p,m.from) <= R.posture && clearLane(m.from,m.to,c) && clearLane(p,m.from,c);
  }

  private end(p: Player, c: BardContext) {
    if (this.measures.delete(p.id)) c.sound('bard-lament-end',p);
  }

  private cue(p: Player, m: Measure, c: BardContext, kind: LamentCue['kind'], radius: number): LamentCue {
    return { kind, owner:p.id, id:c.id(), ...m.from, x2:m.to.x, y2:m.to.y, radius, at:c.tick,
      until:c.tick + R.display, turned:m.turned };
  }
}
