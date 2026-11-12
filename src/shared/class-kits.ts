import type{LineworkStatus}from'./heavy-linework.ts';
import type{FlakBurstCue}from'./heavy-flak.ts';
import type{SniperCue}from'./soldier-sniper.ts';
import type{GrenadierCue}from'./soldier-grenadier.ts';
import type {MarksmanBankCue}from'./soldier-marksman.ts';
import type {SoldierCue} from './soldier-skirmisher.ts';
// Additional class abilities run only in the authoritative fixed-step simulation.
import {EngineerBuilder,type BuilderCue} from './engineer-builder.ts';
import {EngineerTraps,type TrapCue} from './engineer-traps.ts';
import {EngineerMachinery,type MachineryOrder,type MachineryCue} from './engineer-machinery.ts';
import { engineerRules as er, chargeLegal, type EngineerCharge } from './engineer-pathways.ts';
import { hasTalent, type TalentId } from './class-talents.ts';
import type { BardCue } from './bard-kit.ts';
import type {RetinueOrder} from './summoner-kit.ts';
import type { SwordCue } from './swordsman-kit.ts';
import type { AlchemyCue, Recipe } from './alchemist-kit.ts';
import type { RangerCue } from './ranger-kit.ts';
import type { TrainingEventKind } from './story-training.ts';
import type { TalentCue } from './ability-transforms.ts';
import { HZ, type Vec } from './protocol.ts';
import {
  distance,
  moveBody,
  segmentCircle,
  segmentRect,
  type Rect,
} from './geometry.ts';
import type { Player, Stats, Boss } from './game.ts';
import type { Minions } from './minions.ts';
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const RESCUE_CHARGE_TICKS = ticks(0.3) + 1;
export type KitStatus = Partial<LineworkStatus> & {
  heavyClutchConverted?:number;heavyClutchHandling?:"heavy-traverse-keyed-1"|"heavy-traverse-open-1";heavyTraverseShotRequiresHandling?:"heavy-traverse-keyed-1"|"heavy-traverse-open-1";
  heavyLanyardAt?:number;heavyLanyardSequence?:number;heavyLanyardUntil?:number;heavyLanyardX?:number;heavyLanyardY?:number;heavyLanyardRemaining?:number;heavyTraverseShotPosted?:boolean;heavyTraverseShotX?:number;heavyTraverseShotY?:number;
  heavyClutchLifted?:boolean;heavyClutchUsed?:boolean;heavyClutchForfeited?:number;heavyClutchSlotsRemaining?:number;heavyClutchAt?:number;heavyClutchSequence?:number;heavyClutchBlocked?:boolean;heavyTraverseShotRequiresClutch?:boolean;
  heavyTraverseUntil?:number;heavyTraverseBornAt?:number;heavyTraverseSequence?:number;heavyTraversePostX?:number;heavyTraversePostY?:number;heavyTraverseNextAt?:number;heavyTraverseRounds?:number;heavyTraverseAim?:number;heavyTraverseMode?:"loose"|"spade"|"floating";heavyTraverseCastAt?:number;heavyTraverseShotAt?:number;heavyTraverseShotAim?:number;heavyTraverseShotMode?:"loose"|"spade"|"floating";heavyTraverseBlocked?:boolean;
  heavyPrimaryAt?:number;heavyPrimaryAim?:number;heavyFlakShotAt?:number;heavyFlakShotAim?:number;heavyFlakUntil?:number;heavyFlakSeamReady?:boolean;heavyFlakSeamBroken?:boolean;heavyFlakSeamAt?:number;heavyFlakParkedAt?:number;heavyFlakRunningAt?:number;heavyFlakBlocked?:boolean;heavyFlakCommandBlocked?:boolean;
  sniperPrimaryAt?:number;sniperPrimaryAim?:number;sniperShotAt?:number;sniperShotAim?:number;
  sniperRecoveryAt?:number;sniperReadyAt?:number;sniperUntil?:number;sniperPrepared?:boolean;sniperBlocked?:boolean;
  sniperRestAt?:number;sniperRestUntil?:number;sniperRestX?:number;sniperRestY?:number;sniperRestAim?:number;sniperRestSetting?:boolean;sniperRestReady?:boolean;sniperRestBlocked?:boolean;
  sniperRestCount?:number;sniperRestCanSecond?:boolean;sniperWithdrawalUntil?:number;sniperWithdrawalReady?:boolean;
  grenadierRecoveryAt?:number;grenadierFuseUntil?:number;grenadierPinnedUntil?:number;grenadierRemainingFuse?:number;grenadierHolding?:boolean;grenadierCanCatch?:boolean;grenadierCanKick?:boolean;grenadierBlocked?:boolean;grenadierShortBlocked?:boolean;
  soldierBankBlocked?:boolean;
  soldierPairUntil?:number;soldierPairHeld?:boolean;soldierPairBlocked?:boolean;soldierRelayUntil?:number;soldierBankAmmunition?:number;
  soldierFollowupUntil?:number;soldierStepUntil?:number;
  soldierReadyUntil?:number;soldierReadyRelay?:boolean;
  soldierStepRejectUntil?:number;soldierStepRejectReason?:"ground"|"direction"|"ammunition";
  soldierLoadUntil?:number;soldierLoadNextAt?:number;soldierLoadTotal?:number;soldierLoadInserted?:number;soldierMagazineCapacity?:number;
  technique1At?:number;technique2At?:number;trapCommandAt?:number;trapHeld?:boolean;
  builderRepairUntil?:number;builderRepairTarget?:number;builderGroups?:number;builderGroupCapacity?:number;
  alchemySamplesCapacity?:number;alchemyRecipe?:Recipe;alchemyCinder?:number;alchemyChalk?:number;alchemySap?:number;alchemyPrepared?:Recipe[];alchemyCapacity?:number;alchemyBrewUntil?:number;alchemyBrewRecipe?:string;alchemyBrewMovement?:number;alchemyBatchUntil?:number;alchemyBatchCharges?:number;
  rangerDrawUntil?:number;rangerDrawId?:number;rangerDrawMovement?:number;rangerTraps?:number;rangerTrapCapacity?:number;rangerSurveyCharges?:number;rangerSurveyUntil?:number;rangerQuiverCapacity?:number;
  retinueHoldX?:number;retinueHoldY?:number;retinueMarkKey?:string;
  retinueCount?:number;retinuePermanent?:number;retinueCapacity?:number;retinueOrder?:RetinueOrder;retinueMarkUntil?:number;retinueGatherUntil?:number;retinueUltimateUntil?:number;
  counterUntil?: number;
  swordUntil?: number;
  swordCuts?: number;
  guardUntil?: number;
  guardRemaining?: number;
  guardActive?: boolean;
  cadence?: number;
  chargeUntil: number;
  veilUntil: number;
  passageUntil: number;
  stepCharges: number;
  shield: number;
  shieldUntil: number;
  armor: number;
  armorUntil: number;
};
const emptyStatus = (): KitStatus => ({
  chargeUntil: 0,
  veilUntil: 0,
  passageUntil: 0,
  stepCharges: 0,
  shield: 0,
  shieldUntil: 0,
  armor: 0,
  armorUntil: 0,
});
export type Construct = {
  kind: 'turret' | 'siege' | 'wall' | 'decoy';
  machinery?: boolean;
  builder?:boolean;builderGroup?:number;buildingAt?:number;buildingUntil?:number;linkedSiege?:number;
  followOffset?: Vec;
  order?:MachineryOrder;goal?:Vec;formationOffset?:Vec;commandAt?:number;
  braceUntil?: number;
  source?: string;
  halfSpan?: number;
  follow?: boolean;
  mobile?: boolean;
  farAim?: boolean;
  retaliation?: number;
  absorbed?: number;
  talent?: TalentId;
  id: number;
  owner: string;
  x: number;
  y: number;
  radius: number;
  aim: number;
  health: number;
  maxHealth: number;
  at: number;
  until: number;
};
export type KitCue =
  | FlakBurstCue
  | SniperCue
  | GrenadierCue
  | MarksmanBankCue
  | SoldierCue
  | BuilderCue
  | TrapCue
  | MachineryCue
  | EngineerCharge
  | AlchemyCue
  | RangerCue
  | SwordCue
  | BardCue
  | TalentCue
  | Construct
  | {
      kind: 'sigil' | 'requiem' | 'ward' | 'citadel';
      id: number;
      owner: string;
      x: number;
      y: number;
      radius: number;
      at: number;
      until: number;
    };
type Tower = Construct & { damage: number; fireAt: number; interval: number };
type Area = Extract<
  KitCue,
  { kind: 'sigil' | 'requiem' | 'ward' | 'citadel' }
> & {
  damage: number;
  nextAt: number;
  pulses: number;
  interval: number;
  slow: number;
};
export type KitContext = {
  tick: number;
  players: Player[];
  obstacles: Rect[];
  terrain?: {bounds:Rect;lava:readonly (Vec & {radius:number})[]};
  targets?: readonly (Vec & {oldX:number;oldY:number;radius:number;health:number})[];
  boss: Boss;
  minions: Minions;
  stats(player: Player): Stats;
  id(): number;
  sound?(id:string,owner:Player):void;
  area(
    source: Player,
    point: Vec,
    radius: number,
    damage: number,
    slow?: number,
    slowTicks?: number,
    training?: TrainingEventKind,
    cover?: boolean,
  ): void;
  sweep(
    source: Player,
    from: Vec,
    to: Vec,
    radius: number,
    damage: number,
    touched: Set<string>,
    cover?: boolean,
  ): void;
  shoot(owner: Player, from: Vec, angle: number, damage: number): void;
  erase(point: Vec, radius: number): void;
};

export function constructHit(from: Vec, to: Vec, body: Construct, pad: number) {
  // A conservative L1 bound contains every rotated padded wall corner. Most
  // bullets miss every construct; reject them before trigonometry/allocation.
  const halfSpan = body.halfSpan ?? 110;
  const reach =
    body.kind === 'wall' ? halfSpan + 12 + 2 * pad : body.radius + pad;
  if (
    Math.max(from.x, to.x) < body.x - reach ||
    Math.min(from.x, to.x) > body.x + reach ||
    Math.max(from.y, to.y) < body.y - reach ||
    Math.min(from.y, to.y) > body.y + reach
  )
    return null;
  if (body.kind !== 'wall')
    return segmentCircle(from, to, body, body.radius + pad);
  const c = Math.cos(body.aim),
    s = Math.sin(body.aim);
  return (
    segmentRect(
      {
        x: (from.x - body.x) * c + (from.y - body.y) * s,
        y: -(from.x - body.x) * s + (from.y - body.y) * c,
      },
      {
        x: (to.x - body.x) * c + (to.y - body.y) * s,
        y: -(to.x - body.x) * s + (to.y - body.y) * c,
      },
      { x: -12, y: -halfSpan, width: 24, height: halfSpan * 2 },
      pad,
    )?.t ?? null
  );
}
export class ClassKits {
  private machinery=new EngineerMachinery();
  private traps=new EngineerTraps();
  private builder=new EngineerBuilder();
  private combatClock=0;
  commandEngineer(p:Player,c:KitContext){return p.skills.includes('engineer-traps-1')?this.traps.command(p,c):this.machinery.command(p,c,this.towers);}
  castEngineer(p:Player,slot:'technique1'|'technique2',c:KitContext){return p.skills.includes('engineer-builder-1')?this.builder.cast(p,slot,c,this.towers):p.skills.includes('engineer-traps-1')?this.traps.cast(p,slot,c):this.machinery.cast(p,slot,c,this.towers);}
  private machineryCues:MachineryCue[]=[];
  canCast(p:Player,slot:string,c:KitContext) {
    if(p.classId!=='engineer'||slot!=='q')return true;
    if(p.skills.includes('engineer-builder-1'))return this.builder.canDeploy(p,c);
    if(p.skills.includes('engineer-traps-1'))return this.traps.canDeploy(p,c);
    if(p.skills.includes('engineer-machinery-1'))return this.machinePoints(p,c).every(point=>chargeLegal(point,p,c,18));
    return true;
  }
  private machinePoints(p:Player,c:KitContext) {
    return (hasTalent(p,'crossfire-pair')?[-1,1]:[0]).map(side=>({x:p.x+Math.cos(p.aim)*65-Math.sin(p.aim)*side*55,y:p.y+Math.sin(p.aim)*65+Math.cos(p.aim)*side*55}));
  }
  private retaliation: {
    owner: string;
    x: number;
    y: number;
    damage: number;
  }[] = [];
  private statuses = new Map<string, KitStatus>();
  private towers = new Map<number, Tower>();
  private areas: Area[] = [];
  private charges = new Map<
    string,
    { until: number; damage: number; touched: Set<string> }
  >();
  chargeSpeed(id: string, tick: number) {
    const charge = this.charges.get(id);
    return charge && tick < charge.until ? 600 : undefined;
  }
  clear() {
    this.machinery.clear();this.machineryCues=[];
    this.traps.clear();this.builder.clear();this.combatClock=0;
    this.retaliation = [];
    this.statuses.clear();
    this.towers.clear();
    this.areas = [];
    this.charges.clear();
  }
  status(id: string, tick: number): KitStatus {
    const s = this.statuses.get(id);
    if (!s) return {...emptyStatus(),...this.machinery.status(id),...this.traps.status(id),...this.builder.status(id)};
    return {
      ...s,
      ...this.machinery.status(id),...this.traps.status(id),...this.builder.status(id),
      shield: tick < s.shieldUntil ? s.shield : 0,
      armor: tick < s.armorUntil ? s.armor : 0,
      stepCharges: tick < s.passageUntil ? s.stepCharges : 0,
    };
  }
  private state(id: string) {
    let s = this.statuses.get(id);
    if (!s) {
      s = emptyStatus();
      this.statuses.set(id, s);
    }
    return s;
  }
  untargetable(id: string, tick: number) {
    const s = this.statuses.get(id);
    return !!s && (tick < s.veilUntil || tick < s.passageUntil);
  }
  freeStep(id: string, tick: number) {
    const s = this.statuses.get(id);
    return !!s && tick < s.passageUntil && s.stepCharges > 0;
  }
  shieldHit(id: string, damage: number, tick: number) {
    const s = this.statuses.get(id);
    if (!s || tick >= s.shieldUntil) return damage;
    const taken = Math.min(s.shield, damage);
    s.shield -= taken;
    return damage - taken;
  }
  limitShield(id:string,maximum:number,tick:number){
    const s=this.statuses.get(id);if(!s)return;
    s.shield=tick<s.shieldUntil?Math.min(s.shield,Math.max(0,maximum)):0;
  }
  private shield(id: string, amount: number, until: number, now: number) {
    const s = this.state(id);
    if (now >= s.shieldUntil || amount >= s.shield) {
      s.shield = amount;
      s.shieldUntil = until;
    }
  }
  grantShield(id: string, amount: number, until: number, now: number) {
    this.shield(id, Math.max(0, amount), until, now);
  }
  placeDecoy(p: Player, c: KitContext, point: Vec, health: number, seconds: number, source: string) {
    for (const [id, t] of this.towers)
      if (t.owner === p.id && t.source === source) this.towers.delete(id);
    const id = c.id();
    this.towers.set(id, { kind: 'decoy', id, owner: p.id, ...point, radius: 18, aim: p.aim, health, maxHealth: health, at: c.tick, until: c.tick + ticks(seconds), damage: 0, fireAt: c.tick, interval: 1, source });
  }
  constructs() {
    return [...this.towers.values()].filter((t) => t.health > 0&&this.combatClock>=(t.buildingUntil??0));
  }
  hitConstruct(id: number, damage: number) {
    const t = this.towers.get(id);
    if (!t) return;
    const taken = Math.min(t.health, Math.max(0, damage));
    t.absorbed = (t.absorbed ?? 0) + taken;
    t.health = Math.max(0, t.health - damage);
    if (t.health === 0) {
      this.queueRetaliation(t);
      this.towers.delete(id);
    }
  }
  private queueRetaliation(t: Tower) {
    if (t.retaliation && t.absorbed && this.retaliation.length < 50)
      this.retaliation.push({
        owner: t.owner,
        x: t.x,
        y: t.y,
        damage: Math.min(120, t.absorbed) * t.retaliation,
      });
  }
  protect(
    id: string,
    shield: number,
    armor: number,
    until: number,
    now: number,
    shieldUntil = until,
  ) {
    if (shield > 0) this.shield(id, shield, shieldUntil, now);
    const s = this.state(id);
    s.armor = Math.max(s.armorUntil > now ? s.armor : 0, armor);
    s.armorUntil = Math.max(s.armorUntil, until);
  }
  extraWall(
    p: Player,
    c: KitContext,
    options: {
      point: Vec;
      source: string;
      health: number;
      seconds: number;
      halfSpan: number;
      follow?: boolean;
      aim?: number;
      talent?: TalentId;
    },
  ) {
    for (const [id, t] of this.towers)
      if (t.owner === p.id && t.source === options.source)
        this.towers.delete(id);
    const target = options.follow
      ? { x: p.x + Math.cos(p.aim) * 65, y: p.y + Math.sin(p.aim) * 65 }
      : options.point;
    const point = moveBody(
        p,
        { x: target.x - p.x, y: target.y - p.y },
        20,
        c.obstacles,
      ),
      id = c.id();
    this.towers.set(id, {
      kind: 'wall',
      id,
      owner: p.id,
      ...point,
      radius: options.halfSpan,
      aim: options.aim ?? p.aim,
      health: options.health,
      maxHealth: options.health,
      at: c.tick,
      until: c.tick + ticks(options.seconds),
      damage: 0,
      fireAt: c.tick,
      interval: 1,
      source: options.source,
      follow: options.follow,
      halfSpan: options.halfSpan,
      talent: options.talent,
    });
  }
  decoyTargets(players: Player[], now: number): Player[] {
    return [...this.towers.values()].flatMap((t) => {
      const owner = players.find(
        (p) => p.id === t.owner && p.status === 'active' && p.connected,
      );
      return t.kind === 'decoy' && t.health > 0 && t.until > now && owner
        ? [
            {
              ...owner,
              id: 'decoy:' + t.id,
              x: t.x,
              y: t.y,
              oldX: t.x,
              oldY: t.y,
              health: t.health,
            },
          ]
        : [];
    });
  }
  hitDecoy(id: string, damage: number) {
    if (!/^decoy:\d+$/.test(id)) return;
    const number = Number(id.slice(6));
    if (this.towers.get(number)?.kind === 'decoy')
      this.hitConstruct(number, damage);
  }
  cues(): KitCue[] {
    const constructs: KitCue[] = [...this.towers.values()].map(
      ({ damage: _d, fireAt: _f, interval: _i, ...cue }) => ({ ...cue }),
    );
    return [
      ...this.traps.cues(),...this.builder.cues(),
      ...constructs,
      ...this.machineryCues,
      ...this.areas.map(
        ({
          damage: _d,
          nextAt: _n,
          pulses: _p,
          interval: _i,
          slow: _s,
          ...cue
        }) => ({ ...cue }),
      ),
    ];
  }
  private point(p: Player, reach: number, c: KitContext) {
    return moveBody(
      p,
      { x: Math.cos(p.aim) * reach, y: Math.sin(p.aim) * reach },
      20,
      c.obstacles,
    );
  }
  cast(p: Player, slot: 'q' | 'e' | 'ultimate', c: KitContext) {
    const s = c.stats(p),
      now = c.tick,
      ultimate = slot === 'ultimate',
      up = 1 + (s.effects.ultimatePotency ?? 0);
    if (p.classId === 'tank') {
      if (slot === 'q') {
        if (hasTalent(p, 'cornerstone')) {
          const point = this.point(p, 100, c);
          for (const side of [-1, 1])
            this.extraWall(p, c, {
              point: {
                x: point.x - Math.sin(p.aim) * side * 55,
                y: point.y + Math.cos(p.aim) * side * 55,
              },
              source: 'corner-' + side,
              health: 75 * s.ability * (1 + (s.effects.barrierHealth ?? 0)),
              seconds: 5,
              halfSpan: 55,
              aim: p.aim + (side * Math.PI) / 6,
              talent: 'cornerstone',
            });
        } else
          this.construct(
            p,
            'wall',
            150 * s.ability * (1 + (s.effects.barrierHealth ?? 0)),
            5,
            0,
            c,
          );
      } else if (slot === 'e') {
        p.dashX = Math.cos(p.aim);
        p.dashY = Math.sin(p.aim);
        p.dashUntil = now + RESCUE_CHARGE_TICKS;
        p.invulnerableUntil = Math.max(p.invulnerableUntil, p.dashUntil);
        this.state(p.id).chargeUntil = p.dashUntil;
        this.charges.set(p.id, {
          until: p.dashUntil,
          damage: 50 * s.ability,
          touched: new Set(),
        });
      } else {
        const until = now + ticks(8),
          radius = 230;
        for (const ally of c.players)
          if (ally.status === 'active' && distance(p, ally) <= radius) {
            this.shield(ally.id, 120 * up, until, now);
            const a = this.state(ally.id);
            a.armor = Math.max(a.armorUntil > now ? a.armor : 0, 0.35 * up);
            a.armorUntil = until;
          }
        this.visual(p, 'citadel', p, radius, 8, c);
      }
    } else if (p.classId === 'mage') {
      const point = ultimate ? p : this.point(p, 180, c);
      if (slot === 'q') {
        const twin = hasTalent(p, 'twin-sigils'),
          radius = (twin ? 80 : 120) * (1 + (s.effects.sigilRadius ?? 0));
        for (const side of twin ? [-1, 1] : [0]) {
          const center = moveBody(
            p,
            {
              x: point.x - p.x - Math.sin(p.aim) * side * 85,
              y: point.y - p.y + Math.cos(p.aim) * side * 85,
            },
            20,
            c.obstacles,
          );
          c.area(
            p,
            center,
            radius,
            (twin ? 17.5 : 35) * s.ability,
            0.45,
            ticks(4),
          );
          this.areas.push({
            ...this.visual(p, 'sigil', center, radius, 4, c, false),
            damage: 0,
            nextAt: now,
            pulses: 0,
            interval: 0,
            slow: 0.45,
          });
        }
      } else if (slot === 'e') {
        c.area(
          p,
          point,
          145,
          (hasTalent(p, 'ward-echo') ? 40 : 65) * s.ability,
        );
        for (const ally of c.players)
          if (ally.status === 'active' && distance(point, ally) <= 145)
            this.shield(ally.id, 35 * s.ability, now + ticks(6), now);
        this.visual(p, 'ward', point, 145, 0.5, c);
      } else {
        const radius = 300,
          pulses = 3 + Math.floor(s.effects.ultimatePulses ?? 0),
          interval = ticks(3) / pulses;
        c.erase(p, radius);
        this.areas.push({
          ...this.visual(p, 'requiem', p, radius, 3, c, false),
          damage: 120 * up,
          nextAt: now,
          pulses,
          interval,
          slow: 0.3,
        });
      }
    } else if (p.classId === 'engineer') {
      if(!this.canCast(p,slot,c))return;
      if(slot==='q'&&p.skills.includes('engineer-builder-1')){this.builder.deploy(p,c,this.towers);return;}
      if(slot==='q'&&p.skills.includes('engineer-traps-1')) {
        this.traps.deploy(p,c);
        return;
      }
      if (slot === 'e') this.construct(p, 'wall', 120 * s.ability, 8, 0, c);
      else {
        const pair = !ultimate && hasTalent(p, 'crossfire-pair'),
          mobile = ultimate && hasTalent(p, 'foundry-relay');
        for (const side of pair ? [-1, 1] : [0]) {
          const base = this.point(p, 65, c),
            point = moveBody(
              p,
              {
                x: base.x - p.x - Math.sin(p.aim) * side * 55,
                y: base.y - p.y + Math.cos(p.aim) * side * 55,
              },
              20,
              c.obstacles,
            );
          const machine=this.construct(
            p,
            ultimate ? 'siege' : 'turret',
            ultimate ? (mobile ? 160 : 200) * up : (pair ? 40 : 80) * s.ability,
            ultimate ? 14 + (s.effects.ultimateDuration ?? 0) : 12,
            (ultimate ? 90 * up : (pair ? 12.5 : 25) * s.ability) *
              (1 + (s.effects.turretDamage ?? 0)),
            c,
            { point, mobile:mobile||(!ultimate&&p.skills.includes('engineer-machinery-1')), farAim: side === 1, machinery:!ultimate&&p.skills.includes('engineer-machinery-1') },
          );
          if(ultimate)this.builder.fortify(p,machine,c,this.towers);
        }
      }
    } else if (p.classId === 'assassin') {
      const state = this.state(p.id);
      if (slot === 'q') {
        const decoy = hasTalent(p, 'decoy-veil');
        state.veilUntil =
          now + ticks((decoy ? 4 : 6) * (1 + (s.effects.veilDuration ?? 0)));
        if (decoy)
          this.construct(p, 'decoy', 60, (state.veilUntil - now) / HZ, 0, c, {
            point: { x: p.x, y: p.y },
          });
      } else if (ultimate) {
        state.passageUntil =
          now + ticks(hasTalent(p, 'unwritten-traps') ? 3.5 : 5);
        state.stepCharges =
          (hasTalent(p, 'unwritten-traps') ? 2 : 3) +
          Math.floor(s.effects.ultimateCharges ?? 0);
      } else {
        const empowered = this.freeStep(p.id, now);
        if (empowered) state.stepCharges--;
        const old = { x: p.x, y: p.y },
          next = moveBody(
            p,
            { x: Math.cos(p.aim) * 180, y: Math.sin(p.aim) * 180 },
            9,
            c.obstacles,
          );
        p.x = next.x;
        p.y = next.y;
        p.invulnerableUntil = Math.max(p.invulnerableUntil, now + ticks(0.18));
        c.sweep(
          p,
          old,
          next,
          45,
          (empowered ? 100 * up : 50 * s.ability) *
            (hasTalent(p, 'aftercut') ? 0.6 : 1),
          new Set(),
        );
      }
    }
  }
  private visual(
    p: Player,
    kind: Area['kind'],
    point: Vec,
    radius: number,
    seconds: number,
    c: KitContext,
    store = true,
  ) {
    const cue = {
      kind,
      id: c.id(),
      owner: p.id,
      x: point.x,
      y: point.y,
      radius,
      at: c.tick,
      until: c.tick + ticks(seconds),
    };
    if (store)
      this.areas.push({
        ...cue,
        damage: 0,
        nextAt: 0,
        pulses: 0,
        interval: 0,
        slow: 0,
      });
    return cue;
  }
  private construct(
    p: Player,
    kind: Construct['kind'],
    health: number,
    seconds: number,
    dps: number,
    c: KitContext,
    options: { point?: Vec; mobile?: boolean; farAim?: boolean; machinery?:boolean } = {},
  ) {
    const allowed =
      kind === 'turret'
        ? (1 + Math.floor(c.stats(p).effects.extraTurrets ?? 0)) *
          (hasTalent(p, 'crossfire-pair') ? 2 : 1)
        : 1;
    const previous = [...this.towers.values()]
      .filter((t) => t.owner === p.id && t.kind === kind && !t.source)
      .sort((a, b) => a.id - b.id);
    while (previous.length >= allowed) this.towers.delete(previous.shift()!.id);
    const point =
        options.point ??
        this.point(p, kind === 'wall' ? 100 : kind === 'decoy' ? 0 : 65, c),
      id = c.id(),
      interval = kind === 'siege' ? 0.5 : 0.4;
    this.towers.set(id, {
      kind,
      id,
      owner: p.id,
      ...point,
      radius: kind === 'wall' ? 110 : kind === 'siege' ? 28 : 18,
      aim: p.aim,
      health,
      maxHealth: health,
      at: c.tick,
      until: c.tick + ticks(seconds),
      damage: dps * interval * (options.machinery?er.machineDamageMultiplier:1),
      fireAt: c.tick,
      interval: interval * HZ,
      mobile: options.mobile,
      machinery: options.machinery,
      // Follow the owner's translation, independently of their weapon aim.
      followOffset: options.machinery ? {x:point.x-p.x,y:point.y-p.y} : undefined,
      formationOffset:options.machinery?{x:point.x-p.x-Math.cos(p.aim)*65,y:point.y-p.y-Math.sin(p.aim)*65}:undefined,
      order:options.machinery?'follow':undefined,
      commandAt:options.machinery?c.tick+ticks(er.commandSeconds):undefined,
      braceUntil: options.machinery?c.tick+ticks(er.braceSeconds):undefined,
      farAim: options.farAim,
      retaliation:
        kind === 'wall' &&
        p.classId === 'engineer' &&
        hasTalent(p, 'return-current')
          ? 0.6
          : 0,
    });
    return id;
  }
  step(c: KitContext) {
    this.combatClock=c.tick;this.builder.step(c,this.towers);
    this.traps.step(c);
    this.machinery.step(c,this.towers);this.machineryCues=this.machinery.cues(c);
    const present = new Set(c.players.map((p) => p.id));
    for (const id of this.statuses.keys())
      if (!present.has(id)) this.statuses.delete(id);
    for (const [id, charge] of this.charges) {
      const owner = c.players.find((p) => p.id === id && p.status === 'active');
      if (!owner || c.tick >= charge.until) {
        this.charges.delete(id);
        continue;
      }
      c.sweep(
        owner,
        { x: owner.oldX, y: owner.oldY },
        owner,
        24,
        charge.damage,
        charge.touched,
      );
    }
    for (const [id, tower] of this.towers) {
      if(tower.machinery&&!c.players.some(p=>p.id===tower.owner&&p.connected&&p.status==='active')){this.towers.delete(id);continue;}
      if (c.tick >= tower.until || tower.health <= 0) {
        this.queueRetaliation(tower);
        this.towers.delete(id);
        continue;
      }
      if (tower.follow) {
        const owner = c.players.find(
          (p) => p.id === tower.owner && p.status === 'active',
        );
        if (!owner) {
          this.towers.delete(id);
          continue;
        }
        const point = moveBody(
          owner,
          { x: Math.cos(owner.aim) * 65, y: Math.sin(owner.aim) * 65 },
          20,
          c.obstacles,
        );
        tower.x = point.x;
        tower.y = point.y;
        tower.aim = owner.aim;
      }
      if (tower.kind === 'decoy') {
        if (
          !c.players.some((p) => p.id === tower.owner && p.status === 'active')
        )
          this.towers.delete(id);
        continue;
      }
      if (tower.kind === 'wall') continue;
      const owner = c.players.find((p) => p.id === tower.owner);
      if (!owner) {
        this.towers.delete(id);
        continue;
      }
      if(tower.machinery&&this.machinery.busy(tower.id)){tower.fireAt=c.tick+ticks(er.braceSeconds);continue;}
      if (tower.mobile && (!tower.machinery||tower.order!=='anchor')) {
        if (owner.status !== 'active') {
          this.towers.delete(id);
          continue;
        }
        const goal = tower.machinery
            ? tower.order==='waypoint'&&tower.goal?tower.goal:{x:owner.x+(tower.followOffset?.x??0),y:owner.y+(tower.followOffset?.y??0)}
            : this.point(owner,75,c),
          length = distance(tower, goal),
          step = Math.min((tower.machinery?er.machineSpeed:160) / HZ, length);
        if (length > 0) {
          const point = moveBody(
            tower,
            {
              x: ((goal.x - tower.x) / length) * step,
              y: ((goal.y - tower.y) / length) * step,
            },
            tower.radius,
            c.obstacles,
          );
          if(!tower.machinery||chargeLegal(point,tower,c,tower.radius)){
            if(tower.machinery&&distance(tower,point)>.01)tower.braceUntil=c.tick+ticks(er.braceSeconds);
            tower.x = point.x;
            tower.y = point.y;
          }
        }
      }
      if(tower.machinery&&c.tick<(tower.braceUntil??0)){tower.fireAt=c.tick;continue;}
      const targets = tower.machinery ? [...(c.targets??[])].filter(t=>t.health>0&&distance(t,tower)<=er.machineRange&&!c.obstacles.some(w=>segmentRect(tower,t,w,3)!==null)).sort((a,b)=>distance(a,tower)-distance(b,tower)) : [c.boss, ...c.minions.actors.values()]
        .filter((t) => t.health > 0 && distance(t, tower) <= 650)
        .sort((a, b) => distance(a, tower) - distance(b, tower));
      const target =
        tower.farAim && targets.length > 1 ? targets.at(-1) : targets[0];
      if (!target) {
        tower.fireAt = c.tick;
        continue;
      }
      tower.aim = Math.atan2(target.y - tower.y, target.x - tower.x);
      const overclock =
        tower.kind === 'turret' &&
        [...this.towers.values()].some(
          (t) =>
            t.kind === 'siege' &&
            t.owner === tower.owner &&
            t.health > 0 &&
            c.tick < t.until,
        )
          ? 1.5
          : 1;
      for (let burst = 0; burst < 3 && c.tick >= tower.fireAt; burst++) {
        c.shoot(owner, tower, tower.aim, tower.damage);
        tower.fireAt += tower.interval / overclock;
      }
    }
    for (const burst of this.retaliation) {
      const owner = c.players.find(
        (p) => p.id === burst.owner && p.status === 'active',
      );
      if (owner) {
        c.area(owner, burst, 160, burst.damage);
        this.visual(owner, 'ward', burst, 160, 0.5, c);
      }
    }
    this.retaliation = [];
    for (const area of this.areas) {
      if (c.tick >= area.until) continue;
      const owner = c.players.find((p) => p.id === area.owner);
      if (!owner) continue;
      if (area.slow > 0)
        c.area(
          owner,
          area,
          area.radius,
          0,
          area.slow,
          Math.max(1, area.until - c.tick),
        );
      while (area.pulses > 0 && c.tick >= area.nextAt) {
        c.area(owner, area, area.radius, area.damage);
        area.pulses--;
        area.nextAt += area.interval;
      }
    }
    this.areas = this.areas.filter((a) => c.tick < a.until);
  }
}
