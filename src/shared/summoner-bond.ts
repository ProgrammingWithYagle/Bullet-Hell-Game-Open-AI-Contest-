import { distance, segmentRect } from './geometry.ts';
import type { Vec } from './protocol.ts';
import type { SummonEntity, SummonerContext, SummonerOwner } from './summoner-kit.ts';

export const bondIds = {
  entry: 'summoner-mending-bond-1',
  close: 'summoner-bond-close-stitch-1',
  homeward: 'summoner-bond-homeward-thread-1',
} as const;

export type BondFitting = 'close' | 'homeward';
export const bondFitting = (skills: readonly string[]): BondFitting | undefined => {
  if (skills.includes(bondIds.close)) return 'close';
  if (skills.includes(bondIds.homeward)) return 'homeward';
};

export const bondRules = { focus: 2, lostSlots: 2, duration: 120, recovery: 190, arrival: 42 } as const;
const fittings = {
  entry: { reach: 190, repair: 20 },
  close: { reach: 108, repair: 14 },
  homeward: { reach: 240, repair: 18 },
} as const;

export type BondCue = Vec & {
  kind: 'summoner-bond';
  id: number;
  owner: string;
  unit: number;
  ownerX: number;
  ownerY: number;
  state: 'watch' | 'close' | 'return';
  radius: number;
  at: number;
  until: number;
};

type Block = 'busy' | 'gathering' | 'cohort';
type BondStage = Block | 'linked' | 'returning' | 'recovering' | 'companion' | 'mark' | 'focus' | 'ready';
export type BondStatus = {
  stage: BondStage;
  fitting?: BondFitting;
  unit?: number;
  until: number;
  recoveryAt: number;
};
type Link = { id: number; unit: number; at: number; until: number; mark: string; fitting?: BondFitting };

const clear = (from: Vec, to: Vec, c: SummonerContext, radius = 0) =>
  !c.obstacles.some(wall => segmentRect(from, to, wall, radius) !== null);

function inReach(owner: SummonerOwner, unit: SummonEntity, fitting: BondFitting | undefined, c: SummonerContext) {
  return distance(owner, unit) <= fittings[fitting ?? 'entry'].reach &&
    (fitting === 'homeward' || clear(owner, unit, c));
}

export class BondedCompanion {
  private readonly links = new Map<string, Link>();
  private readonly recoveries = new Map<string, number>();

  cancel(owner: string) {
    this.links.delete(owner);
  }

  lose(unit: SummonEntity) {
    if (this.links.get(unit.owner)?.unit === unit.id) this.cancel(unit.owner);
  }

  clear() {
    this.links.clear();
    this.recoveries.clear();
  }

  engaged(owner: string) {
    return this.links.has(owner);
  }

  changeMark(owner: string, mark: string) {
    const link = this.links.get(owner);
    if (link && link.fitting !== 'homeward' && link.mark !== mark) this.cancel(owner);
  }

  status(owner: SummonerOwner, units: readonly SummonEntity[], mark: string, fitting: BondFitting | undefined,
    block: Block | undefined, canPay: boolean, c: SummonerContext): BondStatus {
    const link = this.links.get(owner.id);
    const recoveryAt = this.recoveries.get(owner.id) ?? 0;
    const result = { fitting, until: 0, recoveryAt };
    if (link && c.tick < link.until) {
      return { ...result, stage: link.fitting === 'homeward' ? 'returning' : 'linked', unit: link.unit, until: link.until };
    }
    if (block) return { ...result, stage: block };
    if (c.tick < recoveryAt) return { ...result, stage: 'recovering' };
    const eligible = units.filter(unit => unit.owner === owner.id && !unit.temporary && unit.health > 0 &&
      unit.health < unit.maxHealth && inReach(owner, unit, fitting, c));
    eligible.sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth || a.slot - b.slot);
    const unit = eligible[0];
    if (!unit) return { ...result, stage: 'companion' };
    if (fitting !== 'homeward' && (!mark || !c.target(mark))) return { ...result, stage: 'mark' };
    if (!canPay) return { ...result, stage: 'focus' };
    return { ...result, stage: 'ready', unit: unit.id };
  }

  start(owner: SummonerOwner, units: readonly SummonEntity[], mark: string, fitting: BondFitting | undefined,
    block: Block | undefined, c: SummonerContext) {
    const choice = this.status(owner, units, mark, fitting, block, true, c);
    if (choice.stage !== 'ready' || choice.unit === undefined) return false;
    this.links.set(owner.id, { id: c.id(), unit: choice.unit, at: c.tick, until: c.tick + bondRules.duration, mark, fitting });
    this.recoveries.set(owner.id, c.tick + bondRules.recovery);
    c.sound('summoner-bond-cast', owner);
    return true;
  }

  returning(owner: string, now: number, unit?: number) {
    const link = this.links.get(owner);
    return !!link && link.fitting === 'homeward' && now < link.until && (unit === undefined || link.unit === unit);
  }

  advance(c: SummonerContext, owners: ReadonlyMap<string, SummonerOwner>, units: ReadonlyMap<number, SummonEntity>,
    marked: (owner: string, key: string) => boolean) {
    for (const [id, link] of this.links) {
      const owner = owners.get(id);
      const unit = units.get(link.unit);
      if (!owner || !unit || c.tick >= link.until || !inReach(owner, unit, link.fitting, c) ||
        (link.fitting !== 'homeward' && (!marked(id, link.mark) || !c.target(link.mark)))) this.cancel(id);
    }
    for (const [id, at] of this.recoveries) if (at <= c.tick) this.recoveries.delete(id);
  }

  hit(owner: SummonerOwner, unitId: number | undefined, key: string, marked: boolean,
    c: SummonerContext, units: ReadonlyMap<number, SummonEntity>) {
    const link = this.links.get(owner.id);
    if (!link || !marked || link.mark !== key || c.tick >= link.until || link.fitting === 'homeward') return;
    if (link.fitting === 'close' ? unitId !== undefined : unitId !== link.unit) return;
    const unit = units.get(link.unit);
    if (unit && inReach(owner, unit, link.fitting, c)) this.finish(owner, unit, link, c);
  }

  arrive(owner: SummonerOwner, unit: SummonEntity, c: SummonerContext) {
    const link = this.links.get(owner.id);
    if (link && this.returning(owner.id, c.tick, unit.id) && distance(owner, unit) <= bondRules.arrival &&
      clear(unit, owner, c, unit.radius)) this.finish(owner, unit, link, c);
  }

  private finish(owner: SummonerOwner, unit: SummonEntity, link: Link, c: SummonerContext) {
    this.cancel(owner.id);
    if (unit.health <= 0 || unit.health >= unit.maxHealth) return;
    unit.health = Math.min(unit.maxHealth, unit.health + fittings[link.fitting ?? 'entry'].repair);
    c.sound('summoner-bond-mend', owner);
  }

  cues(now: number, owners: ReadonlyMap<string, SummonerOwner>, units: ReadonlyMap<number, SummonEntity>): BondCue[] {
    const cues: BondCue[] = [];
    for (const [id, link] of this.links) {
      const owner = owners.get(id);
      const unit = units.get(link.unit);
      if (!owner || !unit || now >= link.until) continue;
      cues.push({ kind: 'summoner-bond', id: link.id, owner: id, unit: unit.id, x: unit.x, y: unit.y,
        ownerX: owner.x, ownerY: owner.y, radius: unit.radius + 5, at: link.at, until: link.until,
        state: link.fitting === 'homeward' ? 'return' : link.fitting === 'close' ? 'close' : 'watch' });
    }
    return cues;
  }
}
