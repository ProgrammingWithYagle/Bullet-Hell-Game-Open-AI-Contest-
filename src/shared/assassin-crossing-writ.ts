import { distance, segmentCircle, segmentRect, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import type { InputFrame, Vec } from './protocol.ts';
import type { RangerTarget } from './ranger-kit.ts';

export const crossingWritId = 'assassin-crossing-writ-1';
export const markHunterIds = {
  entry: crossingWritId,
  canted: 'assassin-mark-hunter-canted-cutoff-1',
  transfer: 'assassin-mark-hunter-transfer-writ-1',
} as const;
export const crossingWritRules = {
  minimumPick: 78,
  maximumPick: 382,
  pickCone: .28,
  markTicks: 144,
  proofSpace: 7,
  cutoffTicks: 86,
  minimumReach: 78,
  maximumReach: 196,
  cutoffClearance: 16,
  minimumQuarryLead: 20,
  pinLeash: 231,
  transferMinimumTime: 11,
  cutoffHalfSpan: 74,
  cutoffNearQuarry: 152,
  cutoffWidth: 4,
  maximumCrossingStride: 58,
  strike: 202,
  flashTicks: 9,
} as const;

type Cutoff = { center: Vec; from: Vec; to: Vec; normal: Vec };
type Mark = { id: number; key: string; at: number; until: number; proof?: { shot: number; at: number }; confirmed?: true; pin?: Vec };
type LiveCutoff = Cutoff & { id: number; key: string; at: number; until: number; prior: Vec;
  proposal?: { key: string; proofId: number }; transferred?: true };
type WritNote = 'mark' | 'proof' | 'confirm' | 'pin' | 'set' | 'strike' | 'guarded' | 'lost' | 'proposal' | 'transfer';
export type CrossingWritStatus = {
  phase: 'idle' | 'marked' | 'confirmed' | 'pinned' | 'laid' | 'transfer';
  ready: boolean;
  until?: number;
  proof?: number;
  pin?: Vec;
  proposed?: Vec;
  guide?: { from: Vec; to: Vec };
};
export type CrossingWritCue =
  | (Vec & { kind: 'assassin-writ-quarry'; id: number; owner: string; at: number; until: number; radius: number; confirmed: boolean; paid?: true })
  | (Vec & { kind: 'assassin-writ-cutoff'; id: number; owner: string; at: number; until: number; radius: number; from: Vec; to: Vec;
      outcome?: 'strike' | 'guarded' });
export type CrossingWritWorld = {
  tick: number;
  bounds: Rect;
  obstacles: readonly Rect[];
  lava: readonly (Vec & { radius: number })[];
  targets: readonly RangerTarget[];
  nextId: () => number;
  passage: (p: Player) => boolean;
  recovery: (p: Player) => number;
  strike: (p: Player, target: RangerTarget, origin: Vec, amount: number) => number;
  note: (p: Player, event: WritNote, at: Vec) => void;
};

const rules = crossingWritRules;
const point = ({ x, y }: Vec): Vec => ({ x, y });
const owns = (p: Player | undefined): p is Player => !!p && p.connected && !p.expired && p.classId === 'assassin' &&
  p.status === 'active' && p.health > 0 && p.skills.includes(crossingWritId);

function clearLine(from: Vec, to: Vec, world: CrossingWritWorld, pad: number): boolean {
  return world.obstacles.every(rect => segmentRect(from, to, rect, pad) === null);
}

function handling(p: Player, input: InputFrame, world: CrossingWritWorld): boolean {
  return p.dashUntil <= world.tick && p.channelUntil <= world.tick && !world.passage(p) &&
    !input.q && !input.e && !input.ultimate && !input.dodge && !input.sprint && !input.technique1 && !input.technique2;
}

function picked(p: Player, world: CrossingWritWorld, excluded?: string): RangerTarget | undefined {
  let chosen: RangerTarget | undefined, best = Infinity;
  for (const target of world.targets) {
    const range = distance(p, target);
    if (target.key === excluded || target.health <= 0 || range < rules.minimumPick || range > rules.maximumPick) continue;
    const offset = Math.atan2(target.y - p.y, target.x - p.x) - p.aim;
    const turn = Math.abs(Math.atan2(Math.sin(offset), Math.cos(offset)));
    const score = turn + .03 * range / rules.maximumPick;
    if (turn <= rules.pickCone && score < best && clearLine(p, target, world, rules.cutoffWidth)) {
      chosen = target;
      best = score;
    }
  }
  return chosen;
}

function inside(point: Vec, bounds: Rect): boolean {
  const pad = rules.cutoffWidth;
  return point.x >= bounds.x + pad && point.x <= bounds.x + bounds.width - pad &&
    point.y >= bounds.y + pad && point.y <= bounds.y + bounds.height - pad;
}

function usableLine(line: Cutoff, world: CrossingWritWorld): boolean {
  return inside(line.from, world.bounds) && inside(line.to, world.bounds) && clearLine(line.from, line.to, world, rules.cutoffWidth) &&
    world.lava.every(pit => segmentCircle(line.from, line.to, pit, pit.radius + rules.cutoffWidth) === null);
}

function across(point: Vec, line: Cutoff): number {
  return (point.x - line.center.x) * line.normal.x + (point.y - line.center.y) * line.normal.y;
}

export function cutoffReach(gap: number, radius: number): number {
  return Math.min(rules.maximumReach, Math.max(rules.minimumReach, gap - Math.max(rules.minimumQuarryLead, radius / 2) - rules.cutoffClearance));
}

function projectedCenter(p: Player, quarry: RangerTarget): Vec {
  const reach = cutoffReach(distance(p, quarry), quarry.radius);
  return { x: p.x + Math.cos(p.aim) * reach, y: p.y + Math.sin(p.aim) * reach };
}

function usableCenter(p: Player, quarry: RangerTarget, center: Vec, world: CrossingWritWorld): boolean {
  return inside(center, world.bounds) && distance(p, center) <= rules.pinLeash && distance(center, quarry) <= rules.cutoffNearQuarry &&
    clearLine(p, center, world, rules.cutoffWidth) && world.lava.every(pit => distance(pit, center) > pit.radius + rules.cutoffWidth);
}

function projectedCutoff(p: Player, quarry: RangerTarget, world: CrossingWritWorld, pin?: Vec): Cutoff | undefined {
  const normal = { x: Math.cos(p.aim), y: Math.sin(p.aim) }, side = { x: -normal.y, y: normal.x };
  const center = pin ?? projectedCenter(p, quarry);
  const line = { center, normal, from: { x: center.x - side.x * rules.cutoffHalfSpan, y: center.y - side.y * rules.cutoffHalfSpan },
    to: { x: center.x + side.x * rules.cutoffHalfSpan, y: center.y + side.y * rules.cutoffHalfSpan } };
  const lead = Math.max(rules.minimumQuarryLead, quarry.radius / 2);
  if (Math.abs(across(quarry, line)) <= lead || !usableCenter(p, quarry, center, world) || !usableLine(line, world)) return undefined;
  return line;
}

function contact(line: LiveCutoff, quarry: RangerTarget, world: CrossingWritWorld): Vec | undefined {
  const before = across(line.prior, line), after = across(quarry, line);
  if (before === 0 || before * after > 0 || distance(line.prior, quarry) > rules.maximumCrossingStride ||
      !clearLine(line.prior, quarry, world, 0)) return undefined;
  const t = before / (before - after);
  const hit = { x: line.prior.x + (quarry.x - line.prior.x) * t, y: line.prior.y + (quarry.y - line.prior.y) * t };
  const side = (hit.x - line.center.x) * -line.normal.y + (hit.y - line.center.y) * line.normal.x;
  return Math.abs(side) <= rules.cutoffHalfSpan ? hit : undefined;
}

export class CrossingWrit {
  private readonly marks = new Map<string, Mark>();
  private readonly cutoffs = new Map<string, LiveCutoff>();
  private readonly flashes = new Map<string, Extract<CrossingWritCue, { kind: 'assassin-writ-cutoff' }>>();

  get active(): boolean { return this.marks.size > 0 || this.cutoffs.size > 0 || this.flashes.size > 0; }
  hasMark(id: string): boolean { return this.marks.has(id); }
  clear(): void { this.marks.clear(); this.cutoffs.clear(); this.flashes.clear(); }
  drop(id: string): void { this.marks.delete(id); this.cutoffs.delete(id); this.flashes.delete(id); }
  proofId(p: Player): number | undefined {
    if (!owns(p)) return undefined;
    const transfer = this.cutoffs.get(p.id)?.proposal;
    if (transfer) return transfer.proofId;
    const mark = this.marks.get(p.id);
    return mark && !mark.confirmed ? mark.id : undefined;
  }

  status(p: Player, world: CrossingWritWorld, combat: boolean): CrossingWritStatus {
    if (!combat || !owns(p)) return { phase: 'idle', ready: false };
    const hands = handling(p, p.input, world);
    const cutoff = this.cutoffs.get(p.id);
    if (cutoff) {
      const proposed = cutoff.proposal && world.targets.find(row => row.key === cutoff.proposal?.key && row.health > 0);
      const ready = hands && this.canPropose(p, cutoff, world) && !!picked(p, world, cutoff.key);
      return { phase: proposed ? 'transfer' : 'laid', ready, until: cutoff.until, proposed: proposed && point(proposed) };
    }
    const mark = this.marks.get(p.id), available = hands && p.ultimateAt <= world.tick;
    if (!mark) return { phase: 'idle', ready: available && !!picked(p, world), until: p.ultimateAt };
    const quarry = world.targets.find(row => row.key === mark.key && row.health > 0);
    if (!mark.confirmed || !quarry) return { phase: 'marked', ready: false, proof: Number(!!mark.proof), until: mark.until };
    if (p.skills.includes(markHunterIds.canted) && !mark.pin) {
      const center = projectedCenter(p, quarry);
      const canPin = usableCenter(p, quarry, center, world);
      return { phase: 'confirmed', ready: available && canPin, proof: 2, pin: canPin ? center : undefined, until: mark.until };
    }
    const line = projectedCutoff(p, quarry, world, mark.pin);
    return { phase: mark.pin ? 'pinned' : 'confirmed', ready: available && !!line, proof: 2, until: mark.until, pin: mark.pin,
      guide: line && { from: line.from, to: line.to } };
  }

  command(p: Player, input: InputFrame, world: CrossingWritWorld): void {
    if (!owns(p)) return;
    const cutoff = this.cutoffs.get(p.id);
    if (cutoff) {
      if (input.technique3 && handling(p, input, world) && this.canPropose(p, cutoff, world)) {
        const alternate = picked(p, world, cutoff.key);
        if (alternate) {
          cutoff.proposal = { key: alternate.key, proofId: world.nextId() };
          world.note(p, 'proposal', alternate);
        }
      }
      return;
    }
    const mark = this.marks.get(p.id);
    if (mark && input.ultimate && p.ultimateAt <= world.tick) {
      this.marks.delete(p.id);
      world.note(p, 'lost', p);
      return;
    }
    if (!input.technique3 || !handling(p, input, world) || p.ultimateAt > world.tick) return;
    if (!mark) {
      const quarry = picked(p, world);
      if (!quarry) return;
      this.marks.set(p.id, { id: world.nextId(), key: quarry.key, at: world.tick, until: world.tick + rules.markTicks });
      world.note(p, 'mark', quarry);
      return;
    }
    if (!mark.confirmed || mark.until <= world.tick) return;
    const quarry = world.targets.find(row => row.key === mark.key && row.health > 0);
    if (!quarry) return;
    if (p.skills.includes(markHunterIds.canted) && !mark.pin) {
      const center = projectedCenter(p, quarry);
      if (usableCenter(p, quarry, center, world)) {
        mark.pin = center;
        world.note(p, 'pin', center);
      }
      return;
    }
    const line = projectedCutoff(p, quarry, world, mark.pin);
    if (line) {
      p.ultimateAt = world.tick + world.recovery(p);
      this.marks.delete(p.id);
      this.cutoffs.set(p.id, { ...line, id: mark.id, key: mark.key, at: world.tick, until: world.tick + rules.cutoffTicks, prior: point(quarry) });
      world.note(p, 'set', line.center);
    }
  }

  private canPropose(p: Player, line: LiveCutoff, world: CrossingWritWorld): boolean {
    return p.skills.includes(markHunterIds.transfer) && !line.proposal && !line.transferred &&
      world.tick + rules.transferMinimumTime < line.until;
  }

  creditPrimary(p: Player, shot: number, key: string, amount: number, world: CrossingWritWorld): void {
    if (!owns(p) || amount <= 0) return;
    const line = this.cutoffs.get(p.id);
    if (line?.proposal?.key === key && world.tick < line.until) {
      const target = world.targets.find(row => row.key === key && row.health > 0);
      if (target) {
        line.key = key;
        line.prior = point(target);
        line.transferred = true;
        delete line.proposal;
        world.note(p, 'transfer', target);
      }
      return;
    }
    const mark = this.marks.get(p.id);
    if (!mark || mark.confirmed || mark.key !== key || mark.until <= world.tick) return;
    const quarry = world.targets.find(row => row.key === key && row.health > 0);
    if (!quarry) return;
    if (!mark.proof) {
      mark.proof = { shot, at: world.tick };
      world.note(p, 'proof', quarry);
    } else if (mark.proof.shot !== shot && world.tick >= mark.proof.at + rules.proofSpace) {
      mark.confirmed = true;
      world.note(p, 'confirm', quarry);
    }
  }

  advance(players: ReadonlyMap<string, Player>, world: CrossingWritWorld): void {
    for (const [id, mark] of this.marks) {
      const p = players.get(id);
      if (!owns(p)) this.drop(id);
      else if (mark.until <= world.tick || !world.targets.some(row => row.key === mark.key && row.health > 0)) {
        this.marks.delete(id);
        world.note(p, 'lost', p);
      }
    }
    for (const [id, line] of this.cutoffs) {
      const p = players.get(id);
      if (!owns(p)) { this.drop(id); continue; }
      if (line.proposal && !world.targets.some(row => row.key === line.proposal?.key && row.health > 0)) delete line.proposal;
      const quarry = world.targets.find(row => row.key === line.key && row.health > 0);
      if ((!quarry && !line.proposal) || line.until <= world.tick || !usableLine(line, world)) {
        this.cutoffs.delete(id);
        world.note(p, 'lost', line.center);
        continue;
      }
      if (!quarry) continue;
      const at = contact(line, quarry, world);
      line.prior = point(quarry);
      if (!at) continue;
      const landed = world.strike(p, quarry, at, rules.strike) > 0;
      const outcome = landed ? 'strike' : 'guarded';
      this.cutoffs.delete(id);
      this.flashes.set(id, { ...this.lineCue(id, line), at: world.tick, until: world.tick + rules.flashTicks, outcome });
      world.note(p, outcome, at);
    }
    for (const [id, flash] of this.flashes) if (flash.until <= world.tick || !owns(players.get(id))) this.flashes.delete(id);
  }

  private lineCue(owner: string, line: LiveCutoff): Extract<CrossingWritCue, { kind: 'assassin-writ-cutoff' }> {
    return { ...line.center, kind: 'assassin-writ-cutoff', id: line.id, owner, at: line.at, until: line.until,
      radius: rules.cutoffWidth, from: line.from, to: line.to };
  }

  cues(world: CrossingWritWorld): CrossingWritCue[] {
    const cues: CrossingWritCue[] = [...this.flashes.values()];
    for (const [owner, mark] of this.marks) {
      const quarry = world.targets.find(row => row.key === mark.key && row.health > 0);
      if (quarry) cues.push({ ...point(quarry), kind: 'assassin-writ-quarry', id: mark.id, owner, at: mark.at,
        until: mark.until, radius: quarry.radius + 8, confirmed: !!mark.confirmed });
    }
    for (const [owner, line] of this.cutoffs) {
      cues.push(this.lineCue(owner, line));
      const quarry = world.targets.find(row => row.key === line.key && row.health > 0);
      if (quarry) cues.push({ ...point(quarry), kind: 'assassin-writ-quarry', id: line.id, owner, at: line.at,
        until: line.until, radius: quarry.radius + 8, confirmed: true, paid: true });
    }
    return cues;
  }
}
