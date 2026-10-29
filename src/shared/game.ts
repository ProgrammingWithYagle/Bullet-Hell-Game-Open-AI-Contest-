import {VariantPressure} from './variant-pressure.ts';
import { bossDefeatRemaining, showingBossDefeat } from './boss-defeat-flow.ts';
import { arenaSelections, selectedArenaId, type ArenaSelection } from './arena-selection.ts';
import {WardenPatrol} from './warden-patrol.ts';
import {AbilityTransforms,type TransformContext} from './ability-transforms.ts';
import {hasTalent} from './class-talents.ts';
import {fieldPosition} from './field-follow.ts';
import {phaseBreakPoints} from './phase-break-layout.ts';
import { BrutalVolley } from './brutal-volley.ts';
import { encounterAssists, phaseShieldBreak, encounterPhases, bossPatternPhase, encounterVariant, variantRules } from './encounter-policy.ts';
import {combatReviveAllowed,revivedHealth,revivalShield,passiveRegenerationMultiplier,selfReviveAllowed,selfReviveCharges,maximumPersonalShield,startingShieldFraction} from './recovery-policy.ts';
import {smallWakesIds} from './small-wakes-director.ts';
import {smallWakesSpawn} from './small-wakes-body-bounds.ts';
import { earlyWatchBossIds, earlyWatchMovement } from './early-watch-director.ts';
import { constablePattern, moveConstable } from './constable-signature.ts';
import { freshProgress, validProgress, type RunProgress } from './run-progress.ts';
import {
  bossThreat,
  classifiedContract,
  rankedThreatCandidates,
  threatHealth,
  threatPressure,
  threatBounty,
} from './boss-threat.ts';
import { finalBossIds, endlessSolids, leaveMovingBlocks } from './endless-director.ts';
import { EndlessSchedule, validEndlessHistory, routeBossIds } from './endless-schedule.ts';
import { raidBossIds, raidMovement } from './raid-director.ts';
import {
  districtMovement,
  districtBossIds,
  freshTerrain,
  type TerrainStatus,
} from './district-director.ts';
// Shared authoritative first-playable rules. Phaser, networking and clocks stay outside this module.
import catalog from '../../content/catalog.json' with { type: 'json' };
import {
  HZ,
  DT,
  CONTENT_REVISION,
  PROTOCOL,
  idleInput,
  validInput,
  validCommand,
  implementedClassIds,
  implementedModeIds,
  type ModeId,
  type ClassId,
  type BossId,
  type InputFrame,
  type Phase,
  type Shot,
  type Warning,
  type Field,
  type Event,
  type Command,
  type Contract,
  type Result,
  type SupplySlot,
} from './protocol.ts';
import {
  moveBody,
  segmentCircle,
  segmentCircleXY,
  segmentRect,
  distance,
  clamp,
  SpatialGrid,
} from './geometry.ts';
import { runtimeArena } from './arena-layouts.ts';
import { Random } from './random.ts';
import { clerkAppealRules } from './clerk-appeal.ts';
import { migratePracticeBoundary } from './practice-migration.ts';
import { Minions, type MinionSpawn } from './minions.ts';
import { BossDirector, type SignatureContext } from './boss-director.ts';
import { ClassKits, constructHit, type Construct, type KitContext } from './class-kits.ts';
import { leaveClosingGates } from './civic-director.ts';
import {
  WardenClock,
  WARDEN_SIGNATURE,
  wardenCanHit,
  type WardenSample,
} from './warden-signature.ts';
const constructOrder = (a: Construct, b: Construct) => a.id - b.id;
export const data = catalog;
const ticks = (s: number) => Math.ceil(s * HZ);
const rule = data.rules;
export const arena = data.arenas.find((x) => x.id === 'gatehouse')!;
export const implementedBossIds: readonly BossId[] = [
  ...smallWakesIds,
  ...earlyWatchBossIds,
  'constable',
  'lantern-warden',
  'courier',
  'ratcatcher',
  'quarantine-clerk',
  'tollkeeper',
  'chain-marshal',
  'gate-widow',
  'black-ambulance',
  'matron',
  'alchemist',
  'bellringer',
  'stitchwright',
  'glass-surgeon',
  'ash-baker',
  'sluice-keeper',
  'stationmaster',
  'lamplighter',
  'anatomist',
  'plague-gardener',
  'choir',
  'red-abbess',
  'vesper-judge',
  ...districtBossIds,
  ...raidBossIds,
  ...finalBossIds,
];
export type Settings = {
  runId: string;
  seed: number;
  mode: ModeId;
  difficulty: string;
  maxPlayers: number;
  openingBossId: BossId;
  openingArenaId: string;
  arenaSelection: ArenaSelection;
};
export type Player = {
  progress: RunProgress;
  terrain: TerrainStatus;
  id: string;
  name: string;
  classId: ClassId;
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  aim: number;
  health: number;
  maxHealth: number;
  shield: number;
  status: 'active' | 'downed' | 'eliminated' | 'waiting';
  connected: boolean;
  lastSeen: number;
  expired: boolean;
  ack: number;
  lastInputAt: number;
  input: InputFrame;
  pending: InputFrame[];
  weapon: string;
  ammo: number;
  reloadAt: number;
  fireAt: number;
  wasFiring: boolean;
  dodgeAt: number;
  dashUntil: number;
  invulnerableUntil: number;
  dashX: number;
  dashY: number;
  qAt: number;
  eAt: number;
  ultimateAt: number;
  channelUntil: number;
  slowUntil: number;
  poisonUntil: number;
  poisonNextAt: number;
  poisonDamage: number;
  downUntil: number;
  reviveTarget: string;
  reviveProgress: number;
  selfRevives: number;
  coins: number;
  incomeGranted: number;
  totalSp: number;
  skills: string[];
  upgrades: Record<string, number>;
  supplies: SupplySlot[];
  supplyAt: number;
  adrenalineUntil: number;
  braceUntil: number;
  overdriveUntil: number;
  supplyShield: number;
  supplyShieldUntil: number;
  damageTaken: number;
  damageDealt: number;
  healing: number;
  eligible: boolean;
};
export type Boss = {
  id: BossId;
  hurtAt: number;
  defeatedAt: number;
  castAt: number;
  castReleaseAt: number;
  castEndsAt: number;
  variant: 'normal' | 'brutal' | 'crazed';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  phase: number;
  threat: number;
  deadline: number;
  staggerUntil: number;
  vulnerableUntil: number;
};
export type Stats = {
  health: number;
  speed: number;
  armor: number;
  damage: number;
  fireRate: number;
  magazine: number;
  reload: number;
  cooldown: number;
  ultimateCooldown: number;
  ability: number;
  crit: number;
  critMultiplier: number;
  pierce: number;
  regen: number;
  reviveRate: number;
  dodgeCooldown: number;
  extraShots: number;
  effects: Record<string, number>;
};
export class Game {
  readonly settings: Settings;
  readonly players = new Map<string, Player>();
  readonly shots = new Map<number, Shot>();
  readonly minions = new Minions();
  readonly director = new BossDirector();
  readonly brutalVolley = new BrutalVolley();
  readonly variantPressure = new VariantPressure();
  readonly completedBossForms = new Map<BossId, 'normal'|'brutal'|'crazed'>();
  private phaseAttackReadyAt = 0;
  private arenaHazardAt = 0;
  private lavaHitAt = new Map<string,number>();
  bossCues() {
    const lava = this.phase === 'combat' ? this.arena.lavaPits.map((pit,i)=>({
      ...pit,kind:'arena-lava' as const,id:-(i+1),at:this.arenaHazardAt,until:Number.MAX_SAFE_INTEGER,
    })) : [];
    return [...this.director.cues(),...this.brutalVolley.cues(),...this.variantPressure.cues(),...this.wardenPatrol.cues(),...lava];
  }
  readonly classKits = new ClassKits();
  readonly transforms = new AbilityTransforms();
  classCues(){return [...this.classKits.cues(),...this.transforms.cues()];}
  private aimTargets(){const real=this.roster().filter(p=>p.status==='active'&&!this.classKits.untargetable(p.id,this.combatTick));return [...real,...this.classKits.decoyTargets(this.roster(),this.combatTick)];}
  private hurtTarget(id:string,amount:number){const p=this.players.get(id);if(p)this.damage(p,amount);else this.classKits.hitDecoy(id,amount);}
  private bossPrevious = { x: 800, y: 250 };
  private shotEffects = new Map<
    number,
    { slowTicks: number; slowMultiplier: number; rangeRemaining: number }
  >();
  private shotHits = new Map<number, Set<number>>();
  readonly warnings: Warning[] = [];
  readonly fields: Field[] = [];
  readonly mutations: { id: string; remaining: number }[] = [];
  readonly rng: Random;
  tick = 0;
  combatTick = 0;
  phase: Phase = 'lobby';
  phaseEnds = 0;
  encounter = 0;
  peakPlayers = 0;
  accords = 0;
  timeouts = 0;
  readonly endless = new EndlessSchedule();
  extensionParticipants: string[] = [];
  secretStatus: 'locked' | 'offered' | 'declined' | 'active' | 'cleared' | 'failed' = 'locked';
  campaignBank: null | {
    runId: string;
    mode: ModeId;
    difficulty: string;
    encounters: number;
    accords: number;
    combatTick: number;
    timeouts: number;
    bankedAt: number;
  } = null;
  boss: Boss = {
    id: 'constable',
    hurtAt: -100,
    defeatedAt: 0,
    castAt: 0,
    castReleaseAt: 0,
    castEndsAt: 0,
    variant: 'normal',
    x: 800,
    y: 250,
    health: 1,
    maxHealth: 1,
    phase: 0,
    threat: 1,
    deadline: 0,
    staggerUntil: 0,
    vulnerableUntil: 0,
  };
  accord: {
    until: number;
    progress: number;
    required: number;
    channelTicks: number;
    points: { x: number; y: number }[];
  } | null = null;
  mutationCards: string[] = [];
  contractCards: Contract[] = [];
  readonly votes = new Map<string, number>();
  private nextId = 1;
  testingModified = false;
  scoreObserver?: { start(game: Game): void; damage(id: string, hp: number): void; clear(game: Game): void };
  private freeShots: Shot[] = [];
  private hostileShots = 0;
  private spawns: Shot[] = [];
  private removals: number[] = [];
  private events: Event[] = [];
  private grid = new SpatialGrid<Player>();
  private projectilePlayers: Player[] = [];
  private constructGrid = new SpatialGrid<Construct>();
  private projectileConstructs: Construct[] = [];
  private collisionHits: { time: number; minionId?: number; weakId?: number }[] = [];

  private attackAt = [0, 0];
  readonly completedBossIds = new Set<BossId>();
  signatures: WardenSample[] = [];
  private readonly wardenPatrol = new WardenPatrol();
  private wardenHitAt = new Map<string, number>();
  private transactions = new Map<string, Map<string, { request: string; result: Result }>>();
  private statsCache = new Map<string, Stats>();
  private healOnHitAt = new Map<string, number>();
  private selectedContract: Contract = {
    id: 'initial',
    bossId: 'constable',
    threat: 1,
    risk: 0,
    bounty: 1,
    recommendedRating: 1,
  };
  private currentArenaId: string;
  constructor(settings: Partial<Settings> = {}) {
    this.settings = {
      runId: settings.runId ?? 'simulation-' + (settings.seed ?? 1).toString(36),
      seed: settings.seed ?? 1,
      mode: settings.mode ?? 'short',
      difficulty: settings.difficulty ?? 'normal',
      maxPlayers: settings.maxPlayers ?? (settings.mode === 'raid' ? 16 : 8),
      openingBossId:
        settings.openingBossId ?? (settings.mode === 'raid' ? 'chain-colossus' : 'constable'),
      openingArenaId:
        settings.openingArenaId ?? (settings.mode === 'raid' ? 'ossuary-works' : 'gatehouse'),
      arenaSelection: settings.arenaSelection ?? (settings.openingArenaId ? 'fixed' : 'route'),
    };
    if (
      typeof this.settings.runId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(this.settings.runId) ||
      !implementedBossIds.includes(this.settings.openingBossId) ||
      !implementedModeIds.includes(this.settings.mode) ||
      !data.arenas.some((a) => a.id === this.settings.openingArenaId) ||
      !arenaSelections.includes(this.settings.arenaSelection) ||
      !data.difficulties.some((d) => d.id === this.settings.difficulty) ||
      !Number.isInteger(this.settings.maxPlayers) ||
      this.settings.maxPlayers < 1 ||
      this.settings.maxPlayers > 50
    )
      throw Error('Invalid simulation settings');
    this.selectedContract = {
      ...this.selectedContract,
      ...classifiedContract(this.settings.openingBossId,encounterVariant(this.settings.difficulty)),
    };
    this.boss.threat = bossThreat(this.settings.openingBossId).level;
    this.boss.id = this.settings.openingBossId;
    if (this.boss.id === 'uncounted') {
      this.secretStatus = 'active';
      this.selectedContract.threat = 11;
      this.boss.threat = 11;
    }
    this.rng = new Random(this.settings.seed);
    this.currentArenaId = selectedArenaId(this.settings, 0);
  }
  get arena() {
    return runtimeArena(this.currentArenaId, this.settings.difficulty);
  }
  get obstacles() {
    const gates = this.director.solids(this.combatTick);
    return gates.length ? [...this.arena.obstacles, ...gates] : this.arena.obstacles;
  }
  get difficulty() {
    return data.difficulties.find((d) => d.id === this.settings.difficulty)!;
  }
  skillCost(id: string) {
    return data.skills.find((s) => s.id === id)?.cost ?? 0;
  }
  private id() {
    return this.nextId++;
  }
  addPlayer(id: string, name: string, classId: ClassId): Player {
    if (['secretOffer', 'victory', 'defeat'].includes(this.phase))
      throw Error('Expedition has ended');
    if (this.players.has(id)) throw Error('Duplicate player');
    this.pruneExpired();
    if (this.players.size >= this.settings.maxPlayers) throw Error('Room full');
    if (!implementedClassIds.includes(classId))
      throw Error('Class is not implemented in this milestone');
    const cl = data.classes.find((c) => c.id === classId)!;
    const p: Player = {
      progress: freshProgress(),
      id,
      name:
        name
          .normalize('NFC')
          .replace(/[\p{Cc}\p{Cf}]/gu, '')
          .slice(0, 24) || 'Survivor',
      classId,
      x: this.arena.playerSpawn.x + ((this.players.size % 8) - 3.5) * 30,
      y: this.arena.playerSpawn.y + Math.floor(this.players.size / 8) * 15,
      oldX: 0,
      oldY: 0,
      aim: -Math.PI / 2,
      health: cl.health,
      maxHealth: cl.health,
      shield: 0,
      status: this.phase === 'combat' ? 'waiting' : 'active',
      connected: true,
      lastSeen: this.tick,
      expired: false,
      ack: 0,
      lastInputAt: this.tick,
      input: idleInput(),
      pending: [],
      weapon: cl.weapon,
      ammo: 0,
      reloadAt: 0,
      fireAt: 0,
      wasFiring: false,
      dodgeAt: 0,
      dashUntil: 0,
      invulnerableUntil: 0,
      dashX: 0,
      dashY: -1,
      qAt: 0,
      eAt: 0,
      ultimateAt: 0,
      channelUntil: 0,
      slowUntil: 0,
      poisonUntil: 0,
      poisonNextAt: 0,
      poisonDamage: 0,
      terrain: freshTerrain(),
      downUntil: 0,
      reviveTarget: '',
      reviveProgress: 0,
      selfRevives: selfReviveCharges(this.settings.difficulty,classId),
      coins: this.incomeBudget(this.encounter),
      incomeGranted: this.incomeBudget(this.encounter),
      totalSp: this.skillBudget(this.encounter),
      skills: [],
      upgrades: {},
      supplies: Array.from({ length: 3 }, () => ({ id: '', count: 0 })),
      supplyAt: 0,
      adrenalineUntil: 0,
      braceUntil: 0,
      overdriveUntil: 0,
      supplyShield: 0,
      supplyShieldUntil: 0,
      damageTaken: 0,
      damageDealt: 0,
      healing: 0,
      eligible: false,
    };
    p.oldX = p.x;
    p.oldY = p.y;
    this.players.set(id, p);
    p.ammo = this.stats(p).magazine;
    this.peakPlayers = Math.max(this.peakPlayers, this.players.size);
    return p;
  }
  setConnected(id: string, connected: boolean) {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = connected;
    p.lastSeen = this.tick;
    p.pending = [];
    p.input = idleInput();
    p.reviveProgress = 0;
    if (connected) {
      p.expired = false;
      p.lastInputAt = this.tick;
    }
  }
  submitInput(id: string, input: unknown): boolean {
    const p = this.players.get(id);
    if (
      !p?.connected ||
      !validInput(input) ||
      input.sequence <= p.ack ||
      input.sequence - p.ack > 4096
    )
      return false;
    if (p.pending.length && input.sequence <= p.pending.at(-1)!.sequence) return false;
    p.pending.push({ ...input });
    if (p.pending.length > 4) p.pending.shift();
    p.lastInputAt = this.tick;
    return true;
  }
  private get routeLength() {
    return data.modes.find((m) => m.id === this.settings.mode)!.encounters ?? Infinity;
  }
  private skillBudget(j: number) {
    if (this.secretStatus === 'active' && this.boss.id === 'uncounted') return 27;
    if (this.settings.mode === 'raid')
      return data.modes.find((m) => m.id === 'raid')!.skillBudgets![Math.min(j, 2)];
    return this.settings.mode === 'endless'
      ? 3 + Math.floor((24 * Math.min(j, 9)) / 9)
      : 3 + Math.floor((24 * Math.min(j, this.routeLength - 1)) / (this.routeLength - 1));
  }
  private incomeBudget(j: number) {
    if (this.settings.mode === 'raid')
      return Math.floor(
        data.modes.find((m) => m.id === 'raid')!.coinIncomeBudgets![Math.min(j, 2)] *
          this.difficulty.coins,
      );
    const denominator = this.settings.mode === 'endless' ? 9 : this.routeLength - 1;
    // Multiply integer encounter counts before division: (11/15)*2280 loses a coin.
    return Math.floor(
      (120 + (2280 * Math.min(j, denominator)) / denominator) * this.difficulty.coins,
    );
  }
  stats(p: Player): Stats {
    const cached = this.statsCache.get(p.id);
    if (cached) return cached;
    const cl = data.classes.find((c) => c.id === p.classId)!,
      w = data.weapons.find((w) => w.id === p.weapon)!;
    const effects: Record<string, number> = {};
    for (const id of p.skills) {
      const sk = data.skills.find((s) => s.id === id)!;
      for (const [k, v] of Object.entries(sk.effects)) effects[k] = (effects[k] ?? 0) + v;
    }
    for (const u of data.upgrades)
      effects[u.effect] = (effects[u.effect] ?? 0) + (p.upgrades[u.id] ?? 0) * u.amount;
    const s: Stats = {
      health: cl.health + (effects.maxHealth ?? 0),
      speed: cl.speed * (1 + (effects.moveSpeed ?? 0)),
      armor: clamp(effects.armor ?? 0, 0, 0.65),
      damage: clamp(1 + (effects.weaponDamage ?? 0), 0.35, 4),
      fireRate: clamp(1 + (effects.fireRate ?? 0), 0.35, 2.5),
      magazine: Math.max(1, w.magazine + (effects.magazine ?? 0)),
      reload: clamp(1 - (effects.reloadReduction ?? 0), 0.4, 2),
      cooldown: clamp(1 - (effects.cooldownReduction ?? 0), 0.4, 1.6),
      ultimateCooldown: Math.max(0.6, 1 - (effects.ultimateCooldownReduction ?? 0)),
      ability: 1 + (effects.abilityPotency ?? 0),
      crit: clamp(0.05 + (effects.criticalChance ?? 0), 0, 1),
      critMultiplier: 1.5 + (effects.criticalMultiplier ?? 0),
      pierce: w.pierce + Math.floor(effects.pierce ?? 0),
      regen: (effects.regeneration ?? 0)*passiveRegenerationMultiplier(this.settings.difficulty),
      reviveRate: 1 + (effects.reviveRate ?? 0),
      dodgeCooldown: 1 + (effects.dodgeCooldown ?? 0),
      extraShots: Math.floor(effects.extraShots ?? 0),
      effects,
    };
    for (const active of this.mutations) {
      const m = data.mutations.find((m) => m.id === active.id)!;
      for (const [k, v] of Object.entries(m.modifiers)) {
        if (k === 'damage') s.damage *= v;
        else if (k === 'maxHealth') s.health *= v;
        else if (k === 'fireRate') s.fireRate *= v;
        else if (k === 'moveSpeed') s.speed *= v;
        else if (k === 'reloadTime') s.reload *= v;
        else if (k === 'cooldown') s.cooldown *= v;
        else if (k === 'armor') s.armor += v;
        else if (k === 'abilityPotency') s.ability *= v;
        else if (k === 'extraShots') s.extraShots += v;
        else if (k === 'dodgeCooldown') s.dodgeCooldown *= v;
        else if (k === 'magazine') s.magazine *= v;
      }
    }
    s.damage = clamp(s.damage, 0.35, 4);
    s.fireRate = clamp(s.fireRate, 0.35, 2.5);
    s.reload = clamp(s.reload, 0.4, 2);
    s.cooldown = clamp(s.cooldown, 0.4, 1.6);
    s.armor = clamp(s.armor, 0, 0.65);
    s.health = clamp(s.health, cl.health * 0.3, cl.health * 2.5);
    s.speed = clamp(s.speed, cl.speed * 0.55, cl.speed * 1.65);
    s.extraShots = clamp(s.extraShots, 0, 3);
    s.magazine = Math.max(1, Math.floor(s.magazine));
    s.ability = clamp(s.ability, 0.5, 2);
    s.dodgeCooldown = clamp(s.dodgeCooldown, 0.4, 1.6);
    this.statsCache.set(p.id, s);
    return s;
  }
  movementSpeed(p: Player) {
    const base = data.classes.find((c) => c.id === p.classId)!.speed;
    const braced = this.combatTick < p.braceUntil;
    const overdrive = this.combatTick < p.overdriveUntil;
    const penalty = Math.min(braced ? 0.6 : 1, overdrive ? 0.65 : 1);
    return (
      penalty *
      Math.min(
        base * 1.65,
        this.stats(p).speed *
          (this.combatTick < p.adrenalineUntil
            ? 1 + data.supplies.find((s) => s.id === 'adrenaline')!.amount
            : 1),
      )
    );
  }
  transact(id: string, request: unknown): Result {
    const p = this.players.get(id);
    if (!p?.connected || !validCommand(request)) return { ok: false, reason: 'invalidRequest' };
    let history = this.transactions.get(id);
    if (!history) {
      history = new Map();
      this.transactions.set(id, history);
    }
    const serialized = JSON.stringify(request),
      old = history.get(request.id);
    if (old)
      return old.request === serialized ? old.result : { ok: false, reason: 'duplicateRequest' };
    const result = this.purchase(p, request);
    history.set(request.id, { request: serialized, result });
    if (history.size > 256) history.delete(history.keys().next().value!);
    return result;
  }
  private purchase(p: Player, r: Command): Result {
    if (!['lobby', 'shop'].includes(this.phase)) return { ok: false, reason: 'shopClosed' };
    let price = 0;
    if (r.kind === 'weapon') {
      const w = data.weapons.find((w) => w.id === r.item && w.classId === p.classId);
      if (!w || p.weapon === w.id) return { ok: false, reason: 'incompatibleItem' };
      price = w.price;
      if (p.coins < price) return { ok: false, reason: 'insufficientCoins' };
      p.weapon = w.id;
    } else if (r.kind === 'upgrade') {
      const u = data.upgrades.find((u) => u.id === r.item);
      if (!u) return { ok: false, reason: 'incompatibleItem' };
      const level = p.upgrades[u.id] ?? 0;
      if (level >= u.maximum) return { ok: false, reason: 'upgradeMaximum' };
      price = u.basePrice + level * u.priceStep;
      if (p.coins < price) return { ok: false, reason: 'insufficientCoins' };
      p.upgrades[u.id] = level + 1;
    } else if (r.kind === 'supply') {
      const supply = data.supplies.find((s) => s.id === r.item);
      if (!supply) return { ok: false, reason: 'incompatibleItem' };
      if (supply.effect==='revive' && !combatReviveAllowed(this.settings.difficulty,p.classId)) return {ok:false,reason:'revivesDisabled'};
      if (supply.effect==='shield' && !maximumPersonalShield(this.settings.difficulty,p.maxHealth)) return {ok:false,reason:'shieldsDisabled'};
      const slot = p.supplies.find((s) => s.id === supply.id) ?? p.supplies.find((s) => !s.count);
      if (!slot || slot.count >= supply.maximumStack) return { ok: false, reason: 'inventoryFull' };
      price = supply.price;
      if (p.coins < price) return { ok: false, reason: 'insufficientCoins' };
      slot.id = supply.id;
      slot.count++;
    } else {
      const s = data.skills.find((s) => s.id === r.item && s.classId === p.classId);
      if (!s || p.skills.includes(s.id) || (s.prerequisite && !p.skills.includes(s.prerequisite)))
        return { ok: false, reason: 'prerequisite' };
      if (s.capstone && p.skills.some((id) => data.skills.find((x) => x.id === id)!.capstone))
        return { ok: false, reason: 'capstoneMaximum' };
      const spent = p.skills.reduce((n, id) => n + data.skills.find((s) => s.id === id)!.cost, 0);
      if (spent + s.cost > p.totalSp) return { ok: false, reason: 'insufficientPoints' };
      p.skills.push(s.id);
    }
    p.coins -= price;
    this.statsCache.delete(p.id);
    p.maxHealth = this.stats(p).health;
    p.health = p.maxHealth;
    p.ammo = this.stats(p).magazine;
    p.reloadAt = 0;
    return { ok: true };
  }
  vote(id: string, index: number): boolean {
    if (this.phase === 'secretOffer') {
      const p = this.players.get(id);
      if (!p?.connected || !p.eligible || p.status === 'waiting' || (index !== 0 && index !== 1))
        return false;
      this.votes.set(id, index);
      this.resolveSecretOffer(false);
      return true;
    }

    const p = this.players.get(id),
      cards =
        this.phase === 'mutationVote'
          ? this.mutationCards
          : this.phase === 'contractVote'
            ? this.contractCards
            : [];
    if (!p?.connected || !Number.isInteger(index) || index < 0 || index >= cards.length)
      return false;
    this.votes.set(id, index);
    return true;
  }
  private resolveSecretOffer(expired: boolean) {
    const eligible = this.roster().filter((p) => p.connected && p.eligible);
    if (!expired && eligible.some((p) => !this.votes.has(p.id))) return;
    this.extensionParticipants = eligible
      .filter((p) => this.votes.get(p.id) === 1)
      .map((p) => p.id);
    if (!this.extensionParticipants.length) {
      this.secretStatus = 'declined';
      this.phase = 'victory';
      this.votes.clear();
      return;
    }
    this.secretStatus = 'active';
    this.selectedContract = {
      id: 'uncounted-extension',
      bossId: 'uncounted',
      subtier: 0,
      threat: 11,
      risk: 0,
      bounty: 1,
      recommendedRating: 1,
      variant: encounterVariant(this.settings.difficulty),
    };
    this.boss.id = 'uncounted';
    this.changePhase('loading', rule.deploymentSeconds);
  }
  private nextEndlessForm(id:BossId):'normal'|'brutal'|'crazed' {
    const done=this.completedBossForms.get(id);
    return done==='brutal'||done==='crazed'?'crazed':done==='normal'||this.completedBossIds.has(id)?'brutal':'normal';
  }
  private winningVote() {
    const counts = [0, 0, 0];
    for (const [id, index] of this.votes) if (this.players.get(id)?.connected) counts[index]++;
    const max = Math.max(...counts);
    return this.rng.shuffle([0, 1, 2].filter((i) => counts[i] === max))[0];
  }
  start(): boolean {
    if (this.phase !== 'lobby' || !this.players.size) return false;
    this.startEncounter();
    return true;
  }
  endEndless(): boolean {
    if (this.settings.mode !== 'endless' || this.encounter < 1
      || !['mutationVote','contractVote','shop','loading'].includes(this.phase)) return false;
    this.phase = 'victory'; this.phaseEnds = 0; this.votes.clear();
    return true;
  }
  private modifier(key: string) {
    let value = 1;
    for (const a of this.mutations) {
      const m = data.mutations.find((m) => m.id === a.id)!;
      value *= Number((m.modifiers as Record<string, number | undefined>)[key] ?? 1);
    }
    const bounds = (rule.modifierLimits as Record<string, number[]>)[key];
    return bounds ? clamp(value, bounds[0], bounds[1]) : value;
  }
  private roster() {
    return [...this.players.values()].filter((p) => !p.expired && p.status !== 'waiting');
  }
  private bossDefinition(contract = this.selectedContract) {
    return data.bosses.find((boss) => boss.id === (contract.bossId ?? 'constable'))!;
  }
  private healthForRoster(n: number, contract = this.selectedContract) {
    const cycles =
      this.settings.mode === 'endless'
        ? Math.floor(this.encounter / rule.endless.cycleEncounters)
        : 0;
    return (
      rule.bossHealthBase *
      threatHealth(contract.bossId ?? 'constable') *
      (this.bossDefinition(contract).timer / 120) *
      this.bossDefinition(contract).healthFactor *
      (this.settings.mode === 'raid' && this.bossDefinition(contract).route !== 'secret'
        ? 1.25
        : 1) *
      this.difficulty.health *
      (1 + rule.bossHealthAdditionalPlayer * Math.max(0, n - 1)) *
      this.modifier('bossHealth') *
      (1 + cycles * rule.endless.healthGrowthPerCycle) *
      variantRules(contract.variant??'normal').healthMultiplier
    );
  }
  private startEncounter() {
    this.currentArenaId = selectedArenaId(this.settings, this.encounter, this.secretStatus === 'active' && Boolean(this.campaignBank));
    Object.assign(this.selectedContract,classifiedContract(this.selectedContract.bossId??'constable',encounterVariant(this.settings.difficulty,this.selectedContract.variant)));
    this.phaseAttackReadyAt = 0;
    this.variantPressure.reset(this.combatTick);
    this.classKits.clear();this.transforms.clear();this.wardenPatrol.clear();
    this.pruneExpired();
    this.phase = 'combat';
    this.phaseEnds = 0;
    this.warnings.length = 0;
    this.fields.length = 0;
    this.clearShots();
    this.minions.clear();
    this.statsCache.clear();
    this.accord = null;
    for (const [i, p] of [...this.players.values()].entries()) {
      p.coins += Math.max(0, this.incomeBudget(this.encounter) - p.incomeGranted);
      p.incomeGranted = this.incomeBudget(this.encounter);
      if (
        this.secretStatus === 'active' &&
        this.campaignBank &&
        !this.extensionParticipants.includes(p.id)
      ) {
        p.status = 'waiting';
        continue;
      }
      p.status = 'active';
      this.clearPoison(p);
      p.eligible = true;
      if (p.progress.firstEncounter < 0) p.progress.firstEncounter = this.encounter;
      p.totalSp = Math.max(p.totalSp, this.skillBudget(this.encounter));
      p.maxHealth = this.stats(p).health;
      p.health = p.maxHealth;
      p.shield = clamp(
        Math.floor(maximumPersonalShield(this.settings.difficulty,p.maxHealth)*startingShieldFraction(p.classId))+this.mutations.reduce(
          (n, m) =>
            n +
            Number(
              (
                data.mutations.find((x) => x.id === m.id)!.modifiers as Record<
                  string,
                  number | undefined
                >
              ).startShield ?? 0,
            ),
          0,
        ),
        0,
        maximumPersonalShield(this.settings.difficulty,p.maxHealth),
      );
      p.ammo = this.stats(p).magazine;
      p.reloadAt = 0;
      p.selfRevives = selfReviveCharges(this.settings.difficulty,p.classId,this.stats(p).effects.selfRevives);
      p.reviveProgress = 0;
      p.downUntil = 0;
      p.channelUntil = 0;
      p.adrenalineUntil = 0;
      p.wasFiring = false;
      p.braceUntil = 0;
      p.overdriveUntil = 0;
      p.supplyShield = 0;
      p.supplyShieldUntil = 0;
      this.limitPersonalShield(p);
      p.x = this.arena.playerSpawn.x + ((i % 8) - 3.5) * 30;
      p.y = this.arena.playerSpawn.y + Math.floor(i / 8) * 15;
      p.oldX = p.x;
      p.oldY = p.y;
      p.invulnerableUntil = this.combatTick + ticks(1);
    }
    const health = this.healthForRoster(this.roster().length),
      deadline =
        this.combatTick +
        ticks(
          this.bossDefinition().timer *
            this.modifier('timer') *
            variantRules(this.selectedContract.variant??'normal').deadlineMultiplier,
        );
    this.boss = {
      id: this.selectedContract.bossId ?? 'constable',
      hurtAt: -100,
      defeatedAt: 0,
      castAt: 0,
      castReleaseAt: 0,
      castEndsAt: 0,
      variant: this.selectedContract.variant ?? 'normal',
      x: this.arena.bossSpawn.x,
      y: this.arena.bossSpawn.y,
      health,
      maxHealth: health,
      phase: 0,
      threat: this.selectedContract.threat,
      deadline,
      staggerUntil: 0,
      vulnerableUntil: 0,
    };
    Object.assign(this.boss,smallWakesSpawn(this.boss.id,this.boss,this.bossDefinition().radius,this.arena.bounds,this.obstacles));
    this.arenaHazardAt=this.combatTick+ticks(rule.arenaDifficulty.lavaWarningSeconds);
    this.lavaHitAt.clear();
    this.attackAt = this.bossPhases()[0].attacks.map((_, i) => this.combatTick + ticks(2 + i * 2));
    this.resetWarden();
    this.director.reset(this.boss.id, this.boss.variant !== 'normal', true);
    this.director.services.prepare(this.signatureContext());
    this.director.district.prepare(this.signatureContext());
    this.director.raids.prepare(this.signatureContext());
    this.director.endless.prepare(this.signatureContext());
    for (const p of this.roster()) p.terrain = freshTerrain();
    this.bossPrevious = { x: this.boss.x, y: this.boss.y };
    this.events.push({ type: 'sound', id: 'boss-phase' });
    this.scoreObserver?.start(this);
  }
  private pruneExpired() {
    for (const [id, p] of this.players)
      if (p.expired) {
        this.players.delete(id);
        this.statsCache.delete(id);
        this.transactions.delete(id);
        this.votes.delete(id);
      }
  }
  private rescaleDepartures() {
    const fraction = this.boss.health / this.boss.maxHealth;
    this.pruneExpired();
    this.boss.maxHealth = this.healthForRoster(this.roster().length);
    this.boss.health = this.boss.maxHealth * fraction;
  }
  private changePhase(phase: Phase, seconds: number) {
    this.phase = phase;
    this.phaseEnds = this.tick + bossDefeatRemaining(this.boss, this.tick) + ticks(seconds);
    this.votes.clear();
  }
  private victory() {
    this.scoreObserver?.clear(this);
    for (const player of this.players.values()) this.clearPoison(player);
    this.classKits.clear();this.transforms.clear();this.wardenPatrol.clear();
    this.completedBossIds.add(this.boss.id);
    const previous=this.completedBossForms.get(this.boss.id);
    if(!previous||['normal','brutal','crazed'].indexOf(this.boss.variant)>['normal','brutal','crazed'].indexOf(previous))this.completedBossForms.set(this.boss.id,this.boss.variant);
    if (this.settings.mode === 'endless') this.endless.record(this.boss.id);
    this.boss.health = 0;
    this.boss.defeatedAt = this.tick;
    this.events.push({ type: 'sound', id: 'boss-defeated' });
    this.director.reset('constable');
    this.signatures = [];
    this.wardenPatrol.clear();
    for (const p of this.roster())
      if (p.eligible) {
        p.progress.clears++;
        if (!p.progress.clearedBossIds.includes(this.boss.id))
          p.progress.clearedBossIds.push(this.boss.id);
        const reward =
          this.encounter < (this.settings.mode === 'endless' ? 9 : this.routeLength - 1)
            ? this.incomeBudget(this.encounter + 1) - this.incomeBudget(this.encounter)
            : 228;
        p.coins += Math.floor(reward * this.selectedContract.bounty * this.modifier('coins'));
        p.incomeGranted = this.incomeBudget(this.encounter + 1);
        p.totalSp = this.skillBudget(this.encounter + 1);
        p.health = p.maxHealth;
        p.ammo = this.stats(p).magazine;
        p.status = 'active';
        p.braceUntil = p.overdriveUntil = 0;
      }
    this.encounter++;
    this.clearShots();
    this.minions.clear();
    this.warnings.length = 0;
    this.fields.length = 0;
    this.accord = null;
    for (const m of this.mutations) m.remaining--;
    for (let i = this.mutations.length - 1; i >= 0; i--)
      if (this.mutations[i].remaining <= 0) this.mutations.splice(i, 1);
    if (this.boss.id === 'uncounted') {
      this.secretStatus = 'cleared';
      this.phase = 'victory';
      return;
    }
    if (this.settings.mode !== 'endless' && this.encounter >= this.routeLength) {
      for (const p of this.roster()) if (p.eligible) p.progress.campaignClears = p.progress.clears;
      this.campaignBank = {
        runId: this.settings.runId,
        mode: this.settings.mode,
        difficulty: this.settings.difficulty,
        encounters: this.routeLength,
        accords: this.accords,
        combatTick: this.combatTick,
        timeouts: this.timeouts,
        bankedAt: this.tick,
      };
      if (
        ['normal', 'hard', 'insane', 'hellish'].includes(this.settings.difficulty) &&
        this.encounter >= rule.secret.minimumClearedEncounters &&
        this.timeouts <= rule.secret.maximumTimeouts
      ) {
        this.secretStatus = 'offered';
        this.changePhase('secretOffer', 30);
        return;
      }

      this.phase = 'victory';
      return;
    }
    const eligible = data.mutations.filter(
      (m) => !this.mutations.some((a) => a.id === m.id || new Set<string>(m.excludes).has(a.id)),
    );
    this.mutationCards = this.rng.shuffle(eligible.map((m) => m.id)).slice(0, 3);
    this.changePhase('mutationVote', rule.mutationVoteSeconds);
  }
  private intermission() {
    if (showingBossDefeat(this.boss, this.tick)) return;
    if (this.phase === 'secretOffer') {
      this.resolveSecretOffer(this.tick >= this.phaseEnds);
      return;
    }
    if (this.tick < this.phaseEnds) return;
    if (this.phase === 'mutationVote') {
      const id = this.mutationCards[this.winningVote()];
      this.mutations.push({ id, remaining: 3 });
      if (this.mutations.length > 3) this.mutations.shift();
      this.statsCache.clear();
      // Boundary snapshots must reflect a newly selected health tradeoff immediately.
      for (const player of this.roster()) {
        player.maxHealth = this.stats(player).health;
        player.health = Math.min(player.health, player.maxHealth);
        this.limitPersonalShield(player);
      }
      const threat =
        this.settings.mode === 'endless'
          ? Math.min(10, this.encounter + 1)
          : data.modes.find((m) => m.id === this.settings.mode)!.threats[
              Math.min(this.encounter, this.routeLength - 1)
            ];
      const referenceDps = data.weapons
        .filter((w) => w.price === 0)
        .map((w) => w.baselineSustainedDps)
        .toSorted((a, b) => a - b)[3];
      const routePool =
        this.settings.mode === 'raid'
          ? ((this.encounter === this.routeLength - 1
              ? data.bossPools.raid.finale
              : data.bossPools.raid.regular) as BossId[])
          : routeBossIds.filter(
              (id) =>
                data.bosses.find((b) => b.id === id)!.finale ===
                (this.encounter === this.routeLength - 1),
            );
      const uncleared = routePool.filter((id) => !this.completedBossIds.has(id));
      if (uncleared.length < 3) {
        const substitutes = routeBossIds.filter(
          (id) =>
            !this.completedBossIds.has(id) &&
            !uncleared.includes(id) &&
            data.bosses.find((b) => b.id === id)!.finale ===
              (this.encounter === this.routeLength - 1),
        );
        uncleared.push(...substitutes);
      }
      const pool =
        this.settings.mode === 'endless'
          ? this.endless.offer(this.encounter, this.rng)
          : rankedThreatCandidates(
              uncleared.length >= 3 ? uncleared : routePool.filter((id) => id !== this.boss.id),
              threat,
              this.rng,
              this.settings.mode,
            );
      this.contractCards = [0, 1, 2].map((i) => {
        const bossId = pool[i % pool.length] as BossId;
        const variant = encounterVariant(this.settings.difficulty,
          this.settings.mode === 'endless' ? this.nextEndlessForm(bossId) : 'normal');
        const card = {
          id: 'watch-' + this.encounter + '-' + i,
          ...classifiedContract(bossId, variant),
          recommendedRating: 0,
          variant,
        };
        card.recommendedRating =
          this.healthForRoster(this.roster().length, card) /
          (this.bossDefinition(card).timer *
            this.modifier('timer') *
            variantRules(variant).deadlineMultiplier *
            referenceDps *
            0.65);
        return card;
      });
      this.changePhase('contractVote', rule.bossVoteSeconds);
    } else if (this.phase === 'contractVote') {
      this.selectedContract = this.contractCards[this.winningVote()];
      this.changePhase('shop', rule.shopSeconds);
    } else if (this.phase === 'shop') this.changePhase('loading', rule.deploymentSeconds);
    else if (this.phase === 'loading') this.startEncounter();
  }
  step() {
    this.tick++;
    for (const p of this.players.values())
      if (!p.connected && this.tick - p.lastSeen >= ticks(rule.reconnectSeconds)) p.expired = true;
    if (this.phase !== 'combat') {
      if (['mutationVote', 'contractVote', 'shop', 'loading', 'secretOffer'].includes(this.phase))
        this.intermission();
      return;
    }
    this.combatTick++;
    for (const p of this.players.values()) {
      p.oldX = p.x;
      p.oldY = p.y;
      if (p.pending.length) {
        const latest = p.pending.at(-1)!;
        const next = { ...latest };
        for (const k of ['reload', 'dodge', 'q', 'e', 'ultimate'] as const)
          next[k] = p.pending.some((i) => i[k]);
        next.supply = p.pending.find((i) => i.supply >= 0)?.supply ?? -1;
        p.ack = latest.sequence;
        p.input = next;
        p.pending = [];
      }
      if (!p.connected || this.tick - p.lastInputAt > ticks(0.25))
        p.input = { ...idleInput(), sequence: p.ack, aim: p.aim };
      this.stepPlayer(p);
      // One-shot actions are consumed by the authoritative step, held movement/fire/interact persist briefly.
      p.input.reload = p.input.dodge = p.input.q = p.input.e = p.input.ultimate = false;
      p.input.supply = -1;
    }
    this.grid.clear();
    for (const p of this.players.values()){
      this.limitPersonalShield(p);
      if (p.status === 'active') this.grid.insert(p, 9 + Math.hypot(p.x - p.oldX, p.y - p.oldY));
    }
    if (this.boss.health <= 0) {
      this.victory();
      return;
    }
    this.bossPrevious = { x: this.boss.x, y: this.boss.y };
    this.stepBoss();
    this.variantPressure.step({now:this.combatTick,bossId:this.boss.id,variant:this.boss.variant,phase:this.boss.phase,bounds:this.arena.bounds,targets:this.aimTargets(),damageScale:this.bossDamageScale(),blocked:this.bossCastBlocked(),paused:this.boss.id==='bellringer'||this.boss.id==='alchemist'||this.combatTick<this.boss.staggerUntil||(this.boss.id==='lantern-warden'&&!this.wardenPatrol.canCastAuxiliary),id:()=>this.id(),damage:(id,amount)=>this.hurtTarget(id,amount)});
    this.brutalVolley.release(this.combatTick,(point,angle,speed,damage,radius)=>
      this.emitShot('hostile',point.x,point.y,angle,speed,damage,radius));
    this.minions.step(
      this.combatTick,
      [...this.roster().filter((player) => player.status === 'active'),...this.classKits.decoyTargets(this.roster(),this.combatTick)],
      this.obstacles,
      (target, damage) => this.hurtTarget(target.id,damage),
      this.aimTargets(),
      this.boss.id==='matron',
    );
    this.classKits.step(this.kitContext());
    this.transforms.step(this.transformContext());
    this.stepFields();
    this.stepLava();
    this.stepShots();
    this.stepRevives();
    for(const p of this.players.values())this.limitPersonalShield(p);
    if (this.boss.health <= 0) {
      this.victory();
      return;
    }
    const roster = this.roster(),
      canRecover = roster.some(p=>p.connected&&p.status==='downed'&&p.selfRevives>0&&selfReviveAllowed(this.settings.difficulty,p.classId,roster.length));
    if (
      this.combatTick >= this.boss.deadline ||
      (!roster.some((p) => p.status === 'active') && !canRecover)
    ) {
      if (this.combatTick >= this.boss.deadline) this.timeouts++;
      if (this.secretStatus === 'active') {
        this.secretStatus = 'failed';
        this.phase = this.campaignBank ? 'victory' : 'defeat';
      } else this.phase = 'defeat';
      for (const player of this.players.values()) this.clearPoison(player);
      this.classKits.clear();this.transforms.clear();this.wardenPatrol.clear();
      this.director.reset('constable');
      this.minions.clear();
      this.signatures = [];
      this.warnings.length = 0;
      this.fields.length = 0;
      this.clearShots();
    }
  }
  private stepPlayer(p: Player) {
    const now = this.combatTick,
      stats = this.stats(p),
      i = p.input;
    p.aim = i.aim;
    const moving = leaveMovingBlocks(
      p,
      endlessSolids(this.director.endless.cues(), now),
      this.arena.obstacles,
      rule.playerRadius,
    );
    const clear = leaveClosingGates(moving, this.director.civic.solids(now), rule.playerRadius, this.arena.obstacles, this.arena.lavaPits);
    p.x = clear.x;
    p.y = clear.y;
    if (p.status === 'downed') {
      if (now >= p.downUntil) p.status = 'eliminated';
      return;
    }
    if (p.status !== 'active') return;
    if (now >= p.supplyShieldUntil) p.supplyShield = 0;
    if (i.supply >= 0) this.useSupply(p, i.supply);
    this.stepPoison(p);
    if (p.status !== 'active') return;
    if (stats.regen) p.health = Math.min(p.maxHealth, p.health + stats.regen * DT);
    if (p.reloadAt && now >= p.reloadAt) {
      p.ammo = stats.magazine;
      p.reloadAt = 0;
    }
    if (p.channelUntil) {
      if (now >= p.channelUntil) {
        p.channelUntil = 0;
        this.resurrect(p);
      } else return;
    }
    let mx = i.moveX,
      my = i.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    if (i.dodge && now >= p.dodgeAt) {
      p.dashX = len ? mx : Math.cos(i.aim);
      p.dashY = len ? my : Math.sin(i.aim);
      p.dashUntil = now + ticks(rule.dodgeDuration);
      p.invulnerableUntil = now + ticks(rule.dodgeInvulnerability);
      p.dodgeAt = now + ticks(rule.dodgeCooldown * stats.dodgeCooldown);
      this.events.push({ type: 'sound', id: 'dodge', x: p.x, y: p.y });
    }
    const rally = Math.max(
      0,
      ...this.fields
        .filter((f) => f.kind === 'rally' && distance(fieldPosition(f,this.roster()), p) <= f.radius)
        .map((f) => f.movement ?? 0),
    );
    const environment = this.director.services.movement(p, p.id, now);
    const terrain = districtMovement(
      this.director.district.cues(),
      p,
      p.id,
      now,
      p.terrain,
      { x: mx, y: my },
      now < p.dashUntil,
    );
    const raidForce = raidMovement(this.director.raids.cues(), p, now);
    const earlyForce = earlyWatchMovement(this.director.earlyWatch.cues(), p, now, now < p.dashUntil);
    const dash = now < p.dashUntil,
      speed = dash
        ? (this.classKits.chargeSpeed(p.id, now) ?? rule.dodgeSpeed)
        : this.movementSpeed(p) *
          Math.min(now < p.slowUntil ? 0.65 : 1, now < p.poisonUntil ? clerkAppealRules.purpleSlowMultiplier : 1) *
          (1 + rally) *
          environment.multiplier *
          terrain.multiplier;
    const next = moveBody(
      p,
      {
        x: ((dash ? p.dashX : mx) * speed + environment.x + terrain.x + raidForce.x + earlyForce.x) * DT,
        y: ((dash ? p.dashY : my) * speed + environment.y + terrain.y + raidForce.y + earlyForce.y) * DT,
      },
      rule.playerRadius,
      this.obstacles,
    );
    p.x = next.x;
    p.y = next.y;
    if (i.reload && now >= p.overdriveUntil && !p.reloadAt && p.ammo < stats.magazine)
      this.reload(p);
    if (i.q && now >= p.qAt) this.ability(p, 'q');
    if (i.e && (now >= p.eAt || this.classKits.freeStep(p.id, now))) this.ability(p, 'e');
    if (i.ultimate && now >= p.ultimateAt) this.ability(p, 'ultimate');
    if (i.fire && !p.reloadAt) {
      // A new trigger press starts now; sustained fire retains fractional debt.
      // This supports rates above 30Hz without catching up missed idle shots.
      if (!p.wasFiring) p.fireAt = Math.max(p.fireAt, now);
      for (let burst = 0; burst < 3 && now >= p.fireAt; burst++) {
        if (p.ammo > 0 || now < p.overdriveUntil) this.fire(p);
        else {
          this.reload(p);
          break;
        }
      }
    }
    p.wasFiring = i.fire && !p.reloadAt;
  }
  private reload(p: Player) {
    const w = data.weapons.find((w) => w.id === p.weapon)!;
    p.reloadAt = this.combatTick + ticks(w.reloadTime * this.stats(p).reload);
  }
  private useSupply(p: Player, index: number) {
    const slot = p.supplies[index],
      now = this.combatTick;
    if (!slot?.count || now < p.supplyAt) return;
    const item = data.supplies.find((s) => s.id === slot.id);
    if (!item) return;
    switch (item.effect) {
      case 'heal':
        if (p.health >= p.maxHealth) return;
        this.heal(p, p, item.amount);
        break;
      case 'moveSpeed':
        p.adrenalineUntil = now + ticks(item.duration);
        break;
      case 'shield':
        this.limitPersonalShield(p);
        p.supplyShield = Math.min(item.amount,Math.max(0,maximumPersonalShield(this.settings.difficulty,p.maxHealth)-p.shield-this.classKits.status(p.id,now).shield));
        if(!p.supplyShield)return;
        p.supplyShieldUntil = now + ticks(item.duration);
        break;
      case 'cleanse':
        if (p.health >= p.maxHealth && p.slowUntil <= now && p.poisonUntil <= now) return;
        p.slowUntil = 0;
        this.clearPoison(p);
        this.heal(p, p, item.amount);
        break;
      case 'revive': {
        if (!combatReviveAllowed(this.settings.difficulty,p.classId)) return;
        const ally = this.roster()
          .filter((a) => a.status === 'downed' && distance(p, a) <= 100)
          .sort((a, b) => distance(p, a) - distance(p, b) || a.id.localeCompare(b.id))[0];
        if (!ally) return;
        this.revive(ally, p);
        break;
      }
      case 'barrier':
        this.fields.push({
          id: this.id(),
          owner: p.id,
          kind: 'barrier',
          x: p.x,
          y: p.y,
          radius: 85,
          until: now + ticks(item.duration),
          potency: item.amount,
        });
        break;
      case 'reload':
        if (p.ammo === this.stats(p).magazine && !p.reloadAt) return;
        p.ammo = this.stats(p).magazine;
        p.reloadAt = 0;
        break;
      case 'abilityCooldown':
        if (p.qAt <= now && p.eAt <= now) return;
        p.qAt = now + Math.ceil(Math.max(0, p.qAt - now) * (1 - item.amount));
        p.eAt = now + Math.ceil(Math.max(0, p.eAt - now) * (1 - item.amount));
        break;
      default:
        return;
    }
    slot.count--;
    if (!slot.count) slot.id = '';
    p.supplyAt = now + ticks(item.cooldown);
    this.events.push({
      type: 'sound',
      id: 'ui-confirm',
      owner: p.id,
      x: p.x,
      y: p.y,
    });
  }
  private emitBossShot(x:number,y:number,angle:number,speed:number,damage:number,radius=5) {
    const shot=this.emitShot('hostile',x,y,angle,speed,damage,radius);
    if(shot && this.boss.variant!=='normal')
      this.brutalVolley.capture(this.combatTick,{x,y},angle,speed,damage,radius,bossThreat(this.boss.id).level,()=>this.id(),this.boss.variant);
    return shot;
  }
  private emitShot(
    owner: string,
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    radius = 5,
    pierce = 0,
    lifeSeconds = 12,
  ) {
    if (
      this.shots.size >= 6000 ||
      (owner === 'hostile' && this.hostileShots >= rule.maximumHostileProjectiles)
    )
      return;
    const shot = this.freeShots.pop() ?? ({} as Shot);
    Object.assign(shot, {
      id: this.id(),
      owner,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      damage,
      expires: this.combatTick + ticks(lifeSeconds),
      pierce,
    });
    this.shots.set(shot.id, shot);
    if (owner === 'hostile') this.hostileShots++;
    this.spawns.push({ ...shot });
    return shot;
  }
  private fire(p: Player) {
    const w = data.weapons.find((w) => w.id === p.weapon)!,
      s = this.stats(p);
    const overdrive = this.combatTick < p.overdriveUntil;
    const braced = this.combatTick < p.braceUntil;
    if (!overdrive) p.ammo--;
    const rate = clamp(
      s.fireRate *
        (braced ? 1 + 0.3 * s.ability : 1) *
        (overdrive ? 1 + (hasTalent(p,'furnace-vents')?.4:.7) * (1 + (s.effects.ultimatePotency ?? 0)) : 1),
      0.35,
      2.5,
    );
    const interval = HZ / (w.fireRate * rate);
    p.fireAt += interval;
    const count = w.pellets + s.extraShots,
      field = Math.max(
        0,
        ...this.fields
          .filter((f) => f.kind === 'rally' && distance(fieldPosition(f,this.roster()), p) <= f.radius)
          .map((f) => f.potency),
      );
    const damage =
      w.damage *
      s.damage *
      (1 + field) *
      (this.rng.next() <
      (this.combatTick < this.classKits.status(p.id, this.combatTick).passageUntil ? 1 : s.crit)
        ? s.critMultiplier
        : 1);
    for (let n = 0; n < count; n++)
      this.emitShot(
        p.id,
        p.x,
        p.y,
        p.aim +
          (count > 1
            ? ((n / (count - 1) - 0.5) * w.spreadDegrees * this.modifier('spread') * Math.PI) / 180
            : ((this.rng.next() - 0.5) * w.spreadDegrees * this.modifier('spread') * Math.PI) /
              180),
        w.projectileSpeed,
        damage,
        4,
        s.pierce + (overdrive ? 2 : 0),
        w.rangeSeconds,
      );
    this.events.push({
      type: 'sound',
      id:
        p.classId === 'medic'
          ? 'weapon-injector'
          : p.classId === 'heavy'
            ? 'weapon-heavy-lmg'
            : p.classId === 'tank'
              ? 'weapon-shotgun'
              : p.classId === 'mage'
                ? 'weapon-grave-wand'
                : p.classId === 'engineer'
                  ? 'weapon-rivet'
                  : p.classId === 'assassin'
                    ? 'weapon-needle'
                    : 'weapon-pistol',
      owner: p.id,
      x: p.x,
      y: p.y,
    });
  }
  private ability(p: Player, slot: 'q' | 'e' | 'ultimate') {
    const cl = data.classes.find((c) => c.id === p.classId)!,
      a = slot === 'ultimate' ? cl.ultimate : cl.abilities[slot === 'q' ? 0 : 1],
      s = this.stats(p),
      now = this.combatTick;
    if (slot === 'q') p.qAt = now + ticks(a.cooldown * s.cooldown);
    else if (slot === 'e' && !this.classKits.freeStep(p.id, now))
      p.eAt = now + ticks(a.cooldown * s.cooldown);
    else if (slot === 'ultimate') p.ultimateAt = now + ticks(a.cooldown * s.ultimateCooldown);
    const before={x:p.x,y:p.y},empowered=slot==='e'&&this.classKits.freeStep(p.id,now);
    if(!this.transforms.cast(p,slot,this.transformContext())){
    if (['tank', 'mage', 'engineer', 'assassin'].includes(p.classId)) {
      this.classKits.cast(p, slot, this.kitContext());
    } else if (p.classId === 'heavy') {
      if (slot === 'q') {
        for (let index = 0; index < 14; index++) {
          const shot = this.emitShot(
            p.id,
            p.x,
            p.y,
            p.aim + ((index / 13 - 0.5) * 70 * Math.PI) / 180,
            700,
            (a.damage * s.ability) / 14,
            4,
            s.pierce,
            a.radius / 700,
          );
          if (shot)
            this.shotEffects.set(shot.id, {
              slowTicks: ticks(a.duration * (1 + (s.effects.suppressionDuration ?? 0))),
              slowMultiplier: 0.6,
              rangeRemaining: a.radius,
            });
        }
      } else if (slot === 'e') p.braceUntil = now + ticks(a.duration);
      else {
        p.overdriveUntil = now + ticks(a.duration + (s.effects.ultimateDuration ?? 0));
        p.reloadAt = 0;
      }
    } else if (p.classId === 'soldier') {
      if (slot === 'e') {
        for (let i = 0; i < 3; i++)
          this.emitShot(
            p.id,
            p.x,
            p.y,
            p.aim + (i - 1) * 0.018,
            900,
            (a.damage * s.ability) / 3,
            4,
            1,
          );
      } else {
        const ultimate = slot === 'ultimate',
          radius =
            a.radius * (ultimate ? 1 : 1 + (s.effects.rallyRadius ?? 0)) +
            (ultimate ? (s.effects.ultimateRadius ?? 0) : 0);
        this.fields.push({
          id: this.id(),
          owner: p.id,
          kind: 'rally',
          x: p.x,
          y: p.y,
          radius,
          until: now + ticks(a.duration + (ultimate ? (s.effects.ultimateDuration ?? 0) : 0)),
          potency: Math.min(
            0.8,
            (ultimate ? 0.35 * (1 + (s.effects.ultimatePotency ?? 0)) : 0.2) * s.ability,
          ),
          movement: ultimate ? 0 : 0.1,
        });
        if (ultimate) {
          for (const ally of this.roster())
            if (distance(ally, p) <= radius) {
              ally.ammo = this.stats(ally).magazine;
              ally.reloadAt = 0;
              ally.shield = Math.max(ally.shield, s.effects.ultimateShield ?? 0);
            }
          for (const shot of this.shots.values())
            if (shot.owner === 'hostile' && distance(shot, p) <= radius) this.removeShot(shot);
        }
      }
    } else if (slot === 'q')
      this.fields.push({
        id: this.id(),
        owner: p.id,
        kind: 'heal',
        x: p.x,
        y: p.y,
        radius: a.radius,
        until: now + ticks(a.duration),
        potency: 8 * s.ability,
      });
    else if (slot === 'e') {
      for (const ally of this.roster())
        if (ally.status === 'active' && distance(ally, p) <= a.radius) {
          this.heal(p, ally, 20 * s.ability);
          ally.slowUntil = 0;
        this.clearPoison(ally);
        }
    } else p.channelUntil = now + ticks(1);
    }
    this.transforms.afterCast(p,slot,before,empowered,this.transformContext());
    this.events.push({
      type: 'sound',
      id:
        slot === 'ultimate'
          ? 'ultimate-' + p.classId
          : slot === 'q' && p.classId === 'medic'
            ? 'revive'
            : 'ui-confirm',
      x: p.x,
      y: p.y,
    });
  }
  private resurrect(p: Player) {
    const s = this.stats(p),
      radius = 240 + (s.effects.ultimateRadius ?? 0),
      potency = 1 + (s.effects.ultimatePotency ?? 0);
    for (const ally of this.roster())
      if (distance(ally, p) <= radius) {
        if (ally.status === 'downed' || ally.status === 'eliminated') this.revive(ally, p);
        else if (ally.status === 'active') this.heal(p, ally, (hasTalent(p,'second-breath')?24:40) * potency);
        ally.slowUntil = 0;
          this.clearPoison(ally);
      }
    if (this.roster().length === 1) p.shield = Math.max(p.shield, 40 * potency);
    if (
      !this.director.hasIndependentBodies() &&
      !this.director.coreContact(p, p, radius) &&
      distance(p, this.boss) <= radius
    )
      this.hitBoss(p, 35 * potency);
    for (const weak of this.director.weakPoints())
      if (this.director.weakInRadius(p, radius, weak)) this.hitWeak(p, 35 * potency, weak.id);
    this.transforms.afterResurrection(p,this.transformContext());
  }
  private heal(source: Player, target: Player, amount: number) {
    const healed = Math.min(
      target.maxHealth - target.health,
      amount * this.difficulty.healing * this.modifier('healing'),
    );
    target.health += Math.max(0, healed);
    source.healing += Math.max(0, healed);
  }
  damage(p: Player, amount: number, grantInvulnerability = true, healthLossOnly = false) {
    this.limitPersonalShield(p);
    if (
      p.status !== 'active' ||
      this.combatTick < p.invulnerableUntil ||
      this.director.isSafe(p, this.combatTick)
    )
      return;
    const s = this.stats(p),
      armor = clamp(
        1 -
          (1 - Math.min(0.65, s.armor + this.classKits.status(p.id, this.combatTick).armor)) *
            (this.combatTick < p.braceUntil ? 1 - Math.min(0.8, (hasTalent(p,'shoulder-mantlet')?.25:.45) * s.ability) : 1),
        0,
        0.65,
      ),
      reduced = healthLossOnly ? amount : amount * (1 - armor),
      plate = !healthLossOnly && this.combatTick < p.supplyShieldUntil ? Math.min(p.supplyShield, reduced) : 0,
      afterKit = healthLossOnly ? reduced : this.classKits.shieldHit(p.id, reduced - plate, this.combatTick),
      blocked = healthLossOnly ? 0 : Math.min(p.shield, afterKit);
    p.supplyShield -= plate;
    p.shield -= blocked;
    const actual = Math.min(p.health, afterKit - blocked);
    p.health -= actual;
    p.damageTaken += actual;
    this.scoreObserver?.damage(p.id, actual);
    if (grantInvulnerability) p.invulnerableUntil = this.combatTick + ticks(0.2);
    if (p.health <= 0) {
      this.clearPoison(p);
      p.status = 'downed';
      p.health = 0;
      p.downUntil = this.combatTick + ticks(rule.downedSeconds);
      p.reviveProgress = 0;
      p.channelUntil = 0;
      this.events.push({ type: 'sound', id: 'downed', x: p.x, y: p.y });
    }
  }
  private clearPoison(p:Player) {
    p.poisonUntil = p.poisonNextAt = p.poisonDamage = 0;
  }
  private stepPoison(p:Player) {
    if (!p.poisonUntil) return;
    if (this.combatTick <= p.poisonUntil && this.combatTick >= p.poisonNextAt) {
      p.poisonNextAt += ticks(clerkAppealRules.purplePoisonIntervalSeconds);
      this.damage(p,p.poisonDamage,false);
    }
    if (this.combatTick >= p.poisonUntil) this.clearPoison(p);
  }
  private purpleStamp(p:Player,amount:number,first:boolean) {
    if (p.status !== 'active' || this.combatTick < p.invulnerableUntil || this.director.isSafe(p,this.combatTick)) return false;
    // The percentage and ordinary impact belong to one accepted contact.
    if (first) {
      const loss = p.health * clerkAppealRules.purpleCurrentHealthFraction;
      p.health -= loss;
      p.damageTaken += loss;
      this.scoreObserver?.damage(p.id, loss);
    }
    this.damage(p,amount);
    if (first && p.status === 'active') {
      const next = this.combatTick + ticks(clerkAppealRules.purplePoisonIntervalSeconds);
      p.poisonNextAt = p.poisonUntil > this.combatTick ? Math.min(p.poisonNextAt,next) : next;
      p.poisonUntil = Math.max(p.poisonUntil,this.combatTick + ticks(clerkAppealRules.purplePoisonSeconds));
      p.poisonDamage = Math.max(p.poisonDamage,clerkAppealRules.purplePoisonDamage * this.bossDamageScale());
    }
    return true;
  }
  private damageCurrentHealth(p: Player, fraction: number, minimumHealth: number) {
    if (p.status !== 'active' || this.combatTick < p.invulnerableUntil || this.director.isSafe(p,this.combatTick))
      return false;
    // This warned curse removes current health, not shield capacity or an armored hit.
    // Its once-per-seal budget lives in the Clerk controller; it never downs by itself.
    const actual = Math.min(p.health * fraction, Math.max(0,p.health-minimumHealth));
    p.health -= actual;
    p.damageTaken += actual;
    this.scoreObserver?.damage(p.id, actual);
    p.invulnerableUntil = this.combatTick + ticks(0.2);
    return true;
  }
  private hitBoss(p: Player | undefined, amount: number, bypassArmor = false) {
    const actual = Math.min(
      this.boss.health,
      amount *
        (p && this.boss.id==='quarantine-clerk' ? this.director.clerk.shelterMultiplier(p,this.combatTick,this.boss.phase,this.boss.variant) : 1) *
        (this.combatTick < this.boss.vulnerableUntil ? 1.25 : 1) *
        (this.boss.id === 'black-ambulance' && this.director.civic.recovering ? 1.25 : 1) *
        (bypassArmor
          ? 1
          : this.director.district.bodyMultiplier(p, this.boss, this.combatTick) *
            this.director.raids.bodyMultiplier(this.combatTick) *
            this.director.endless.bodyMultiplier(this.combatTick)),
    );
    this.boss.health -= actual;
    if (actual > 0 && this.combatTick - this.boss.hurtAt >= ticks(0.3))
      this.boss.hurtAt = this.combatTick;
    this.creditHit(p, actual);
  }
  private creditHit(p: Player | undefined, actual: number) {
    if (p) {
      p.damageDealt += actual;
      const healing = this.stats(p).effects.healOnHit ?? 0;
      if (actual > 0 && healing > 0 && this.combatTick >= (this.healOnHitAt.get(p.id) ?? 0)) {
        const ally = this.roster()
          .filter((a) => a.status === 'active' && distance(a, p) <= 160 && a.health < a.maxHealth)
          .sort(
            (a, b) => a.health / a.maxHealth - b.health / b.maxHealth || a.id.localeCompare(b.id),
          )[0];
        if (ally) {
          this.heal(p, ally, healing);
          this.healOnHitAt.set(p.id, this.combatTick + ticks(0.25));
        }
      }
    }
  }
  private bossPhases() {
    return encounterPhases(this.boss.id,this.boss.variant);
  }
  private bossCastBlocked() {
    return !!this.accord || this.combatTick < this.phaseAttackReadyAt;
  }
  private wardenContext(){return {blocked:this.bossCastBlocked(),now:this.combatTick,boss:this.boss,phase:this.boss.phase,brutal:this.boss.variant!=='normal',target:this.aimTargets()[0]??{x:800,y:700},radius:this.bossDefinition().radius,obstacles:this.obstacles,id:()=>this.id()};}
  private resetWarden() {
    this.signatures=[];this.wardenPatrol.clear();this.wardenHitAt.clear();
    if(this.boss.id!=='lantern-warden')return;
    this.wardenPatrol.reset(this.wardenContext());
    this.signatures=this.wardenPatrol.step(this.wardenContext());
  }
  private bossDamageScale() {
    const cycle =
      this.settings.mode === 'endless'
        ? Math.floor(this.encounter / rule.endless.cycleEncounters)
        : 0;
    return (
      this.difficulty.damage *
      threatPressure(this.boss.id).damage *
      this.modifier('bossDamage') *
      (1 + cycle * rule.endless.damageGrowthPerCycle) *
      variantRules(this.boss.variant).damageMultiplier
    );
  }
  private stepWarden() {
    this.signatures=this.wardenPatrol.step(this.wardenContext());
    if(this.signatures.some(s=>s.phase==='warning'&&s.phaseTick===0))this.events.push({type:'sound',id:'warning',x:this.boss.x,y:this.boss.y});
    // The lantern extinguishes earlier auxiliary hazards at release so its
    // outlined trailing space is clear throughout every active sweep.
    if (this.signatures.some((sample) => sample.phase === 'active' && sample.phaseTick === 0)) {
      this.brutalVolley.clear();
      for (const shot of this.shots.values()) if (shot.owner === 'hostile') this.removeShot(shot);
      this.warnings.length = 0;
      for (let index = this.fields.length - 1; index >= 0; index--)
        if (this.fields[index].owner === 'hostile') this.fields.splice(index, 1);
    }
    for (const player of this.roster()) {
      if (player.status !== 'active' || this.combatTick < (this.wardenHitAt.get(player.id) ?? 0))
        continue;
      if (this.signatures.some((sample) => wardenCanHit(sample, player, rule.playerRadius))) {
        this.damage(player, WARDEN_SIGNATURE.contactDamage * this.bossDamageScale());
        this.wardenHitAt.set(player.id, this.combatTick + WARDEN_SIGNATURE.contactIntervalTicks);
      }
    }
  }
  private transformContext():TransformContext{return {
    tick:this.combatTick,players:this.roster(),fields:this.fields,kits:this.classKits,kit:this.kitContext(),id:()=>this.id(),stats:p=>this.stats(p),heal:(source,target,amount)=>this.heal(source,target,amount),
    shot:(p,point,angle,speed,damage,pierce,life=12,slow=0)=>{const shot=this.emitShot(p.id,point.x,point.y,angle,speed,damage,4,pierce,life);if(shot&&slow>0)this.shotEffects.set(shot.id,{slowTicks:ticks(slow),slowMultiplier:.6,rangeRemaining:speed*life});},
  };}
  private kitContext(): KitContext {
    return {
      tick: this.combatTick,
      players: this.roster(),
      obstacles: this.obstacles,
      boss: this.boss,
      minions: this.minions,
      stats: (p) => this.stats(p),
      id: () => this.id(),
      area: (source, point, radius, damage, slow = 1, slowTicks = 0) => {
        if (
          !this.director.hasIndependentBodies() &&
          !this.director.coreContact(point, point, radius) &&
          damage > 0 &&
          distance(point, this.boss) <= radius + this.bossDefinition().radius
        )
          this.hitBoss(source, damage);
        for (const weak of this.director.weakPoints())
          if (damage > 0 && this.director.weakInRadius(point, radius, weak))
            this.hitWeak(source, damage, weak.id);
        for (const actor of this.minions.actors.values())
          if (distance(point, actor) <= radius + actor.radius)
            this.creditHit(
              source,
              this.minions.hit(actor.id, damage, this.combatTick, slowTicks, slow),
            );
      },
      sweep: (source, from, to, radius, damage, touched) => {
        if (
          !this.director.hasIndependentBodies() &&
          !this.director.coreContact(from, to, radius) &&
          !touched.has('boss') &&
          segmentCircle(from, to, this.boss, radius + this.bossDefinition().radius) !== null
        ) {
          this.hitBoss(source, damage);
          touched.add('boss');
        }
        for (const weak of this.director.weakPoints())
          if (
            !touched.has('weak-' + weak.id) &&
            this.director.weakContact(from, to, weak, radius) !== null
          ) {
            this.hitWeak(source, damage, weak.id);
            touched.add('weak-' + weak.id);
          }
        for (const actor of this.minions.actors.values())
          if (
            !touched.has('actor-' + actor.id) &&
            segmentCircle(
              { x: from.x - actor.oldX, y: from.y - actor.oldY },
              { x: to.x - actor.x, y: to.y - actor.y },
              { x: 0, y: 0 },
              radius + actor.radius,
            ) !== null
          ) {
            this.creditHit(source, this.minions.hit(actor.id, damage, this.combatTick));
            touched.add('actor-' + actor.id);
          }
      },
      shoot: (owner, from, aim, damage) => {
        this.emitShot(owner.id, from.x, from.y, aim, 650, damage, 3, 0, 1);
      },
      erase: (point, radius) => {
        for (const shot of this.shots.values())
          if (shot.owner === 'hostile' && distance(point, shot) <= radius) this.removeShot(shot);
      },
    };
  }
  private signatureContext(): SignatureContext {
    return {
      // Phase assistance blocks fresh casts; it does not interrupt committed work.
      paused: false,
      warn: () => { this.events.push({type:'sound',id:'warning'}); },
      cueSound: (id) => { this.events.push({type:'sound',id}); },
      damageMaximumHealth: (id,fraction) => {
        const p=this.players.get(id);
        if(!p||p.status!=='active'||this.combatTick<p.invulnerableUntil||this.director.isSafe(p,this.combatTick))return false;
        this.damage(p,p.maxHealth*fraction,true,true);return true;
      },
      random: () => this.rng.next(),
      purpleStamp: (id,amount,first) => { const p=this.players.get(id); return !!p && this.purpleStamp(p,amount,first); },
      variant: this.boss.variant,
      damageCurrentHealth: (id,fraction,minimumHealth) => {
        const player=this.players.get(id);
        return !!player && this.damageCurrentHealth(player,fraction,minimumHealth);
      },
      auxiliaryBusy: this.bossCastBlocked() || this.warnings.length > 0 || this.combatTick < this.boss.castEndsAt,
      hazardCircles:this.arena.lavaPits,
      tick: this.combatTick,
      bossId: this.boss.id,
      bossMaximumHealth: this.boss.maxHealth,
      hurtBoss: (amount, sourceId) =>
        this.hitBoss(sourceId ? this.players.get(sourceId) : undefined, amount, true),
      emitControlled: (point, angle, speed, damage, radius) =>
        this.emitShot('hostile', point.x, point.y, angle, speed, damage, radius)?.id,
      controlShot: (id, vx, vy) => {
        const shot = this.shots.get(id);
        if (!shot || shot.owner !== 'hostile' || !Number.isFinite(vx) || !Number.isFinite(vy))
          return false;
        if (shot.vx !== vx || shot.vy !== vy) {
          shot.vx = vx;
          shot.vy = vy;
          this.spawns.push({ ...shot });
        }
        return true;
      },
      removeHostile: (id) => {
        const shot = this.shots.get(id);
        if (shot?.owner === 'hostile') this.removeShot(shot);
      },
      relocateBoss: (point) => {
        this.boss.x = point.x;
        this.boss.y = point.y;
        this.bossPrevious = { ...point };
      },
      interactors: this.roster()
        .filter((p) => p.status === 'active' && p.input.interact)
        .map((p) => p.id),
      restore: (id, amount) => {
        const p = this.players.get(id);
        if (p) this.heal(p, p, amount);
      },
      emitHostile: (point, angle, speed, damage, radius) => {
        this.emitBossShot(point.x, point.y, angle, speed, damage, radius);
      },
      spawnOrdinary: (point, speed, health, damage, maximum) => {
        if (
          [...this.minions.actors.values()].filter((a) => a.kind === 'ordinary').length >= maximum
        )
          return;
        this.spawnMinion({
          kind: 'ordinary',
          ...point,
          speed,
          health: health * (this.boss.variant !== 'normal' ? 2 : 1),
          damage,
          radius: 12,
          lifeSeconds: 45,
        });
      },
      boss: this.boss,
      radius: this.bossDefinition().radius,
      bounds: this.arena.bounds,
      obstacles: this.obstacles,
      targets: this.roster().filter((p) => p.status === 'active'),
      aimTargets: this.aimTargets(),
      damageScale: this.bossDamageScale(),
      brutal: this.boss.variant !== 'normal',
      projectileMultiplier:variantRules(this.boss.variant).projectileMultiplier,
      movementSpeedScale:this.difficulty.speed*this.modifier('bossSpeed')*threatPressure(this.boss.id).speed*(1+Math.min(rule.endless.maximumSpeedGrowth,(this.settings.mode==='endless'?Math.floor(this.encounter/rule.endless.cycleEncounters):0)*rule.endless.speedGrowthPerCycle)),
      phase: bossPatternPhase(this.boss.id,this.boss.variant,this.boss.phase),
      id: () => this.id(),
      damage: (id, amount) => {
        this.hurtTarget(id,amount);
      },
      spawnRat: (position, goal, speed, health, damage, maximum) => {
        if ([...this.minions.actors.values()].filter((a) => a.kind === 'rat').length >= maximum)
          return;
        this.spawnMinion({
          kind: 'rat',
          ...position,
          goalX: goal.x,
          goalY: goal.y,
          speed,
          health: health * (this.boss.variant !== 'normal' ? 2 : 1),
          damage,
          radius: 12,
          lifeSeconds: 30,
        });
      },
    };
  }
  private stepBoss() {
    const now = this.combatTick;
    if(this.boss.id==='quarantine-clerk')this.director.clerk.stepDomains(this.signatureContext());
    const fraction = this.boss.health / this.boss.maxHealth,
      phase = this.bossPhases().reduce(
        (last, p, i) => (fraction <= p.healthThreshold ? i : last),
        0,
      );
    if (phase > this.boss.phase && !this.accord) {
      this.boss.phase++;
      this.attackAt = this.bossPhases()[this.boss.phase].attacks.map(
        (attack, i) =>
          now +
          ticks(
            rule.phaseTransitionCastDelaySeconds +
              (this.boss.variant !== 'normal' &&
              bossPatternPhase(this.boss.id,this.boss.variant,this.boss.phase) === 3 &&
              'comboOffsetSeconds' in attack
                ? Number(attack.comboOffsetSeconds)
                : i * 1.25),
          ),
      );
      this.rescaleDepartures();
      // Keep each owner, target lock, weak point and release clock alive. Only
      // future casts use the new phase; phase entry is not an interruption.
      this.phaseAttackReadyAt = now + ticks(rule.phaseTransitionCastDelaySeconds);
      const assist = phaseShieldBreak(this.settings.difficulty,this.boss.variant);
      const count = this.roster().length;
      this.accord = assist ? {
        until: now + ticks(8),
        progress: 0,
        required: count === 1 ? 1 : count <= 8 ? 2 : 3,
        channelTicks:ticks(encounterAssists(this.settings.difficulty).shieldChannelSeconds),
        points:phaseBreakPoints(this.arena,encounterAssists('baby').shieldCircles).filter((_,i)=>this.settings.difficulty!=='easy'||i%2===0),
      } : null;
      this.events.push({ type: 'sound', id: 'boss-phase' });
    }
    if (this.accord) {
      const a = this.accord,
        occupiers = new Set<string>();
      for (const point of a.points) {
        const p = this.roster().find(
          (p) => p.status === 'active' && distance(p, point) <= 65 && !occupiers.has(p.id),
        );
        if (p) occupiers.add(p.id);
      }
      a.progress = occupiers.size >= a.required ? a.progress + 1 : 0;
      if (a.progress >= a.channelTicks) {
        this.accords++;
        this.clearShots();
        this.warnings.length = 0;
        for (let i = this.fields.length - 1; i >= 0; i--)
          if (this.fields[i].owner === 'hostile') this.fields.splice(i, 1);
        this.director.reset(this.boss.id, this.boss.variant !== 'normal',false,this.boss.id==='quarantine-clerk');
        this.minions.clear();
        this.boss.castAt = this.boss.castReleaseAt = this.boss.castEndsAt = 0;
        this.boss.staggerUntil = now + ticks(4);
        this.boss.vulnerableUntil = now + ticks(4);
        for (const p of this.roster())
          if (p.status === 'active') this.heal(p, p, p.maxHealth * 0.15);
        this.accord = null;
        this.events.push({ type: 'sound', id: 'accord-success' });
      } else if (now >= a.until) this.accord = null;
    }
    if (now < this.boss.staggerUntil) {
      if(this.director.smallWakes.handles(this.boss.id)){this.director.smallWakes.reset(this.boss.id);this.brutalVolley.clear();}
      if(this.boss.id==='courier'){this.director.courier.reset();this.brutalVolley.clear();}
      if(this.boss.id==='ratcatcher'){this.director.ratcatcher.clearCast();this.brutalVolley.clear();}
      if(this.boss.id==='quarantine-clerk'){this.director.clerk.cancelCast();this.brutalVolley.clear();}
      if(this.boss.id==='tollkeeper'){this.director.civic.tollkeeper.reset();this.brutalVolley.clear();}
      if(this.boss.id==='chain-marshal'){this.director.civic.marshal.reset();this.brutalVolley.clear();}
      if(this.boss.id==='gate-widow'){this.director.civic.widow.reset();this.brutalVolley.clear();}
      if(this.boss.id==='black-ambulance'){this.director.civic.ambulance.reset();this.brutalVolley.clear();}
      if(this.boss.id==='matron'){this.director.services.matron.reset(now+ticks(1.5));this.brutalVolley.clear();}
      if(this.boss.id==='alchemist'){this.director.services.alchemist.reset(now+ticks(1.5));this.brutalVolley.clear();}
      if(this.boss.id==='bellringer'){this.director.services.bellringer.reset(now+ticks(1.5));this.brutalVolley.clear();}
      this.signatures = [];
      this.wardenPatrol.clear();
      return;
    }
    if (this.boss.id === 'lantern-warden') this.stepWarden();
    if (this.director.district.handles(this.boss.id))
      this.attackAt[0] = Math.max(this.attackAt[0] ?? now, this.director.district.nextSignatureAt);
    if (this.director.raids.handles(this.boss.id))
      this.attackAt[0] = Math.max(this.attackAt[0] ?? now, this.director.raids.nextSignatureAt);
    if (this.director.endless.handles(this.boss.id))
      this.attackAt[0] = Math.max(this.attackAt[0] ?? now, this.director.endless.nextSignatureAt);
    if (this.director.earlyWatch.handles(this.boss.id))
      this.attackAt[0] = Math.max(this.attackAt[0] ?? now, this.director.earlyWatch.nextSignatureAt);
    if (this.director.smallWakes.handles(this.boss.id))
      this.attackAt[0] = Math.max(this.attackAt[0] ?? now, this.director.smallWakes.nextSignatureAt);
    if (this.boss.id === 'bellringer' || this.boss.id === 'alchemist' || this.boss.id === 'matron' || this.boss.id === 'black-ambulance' || this.boss.id === 'tollkeeper' || this.boss.id === 'chain-marshal' || this.boss.id === 'gate-widow') this.director.step(this.signatureContext());
    const attacks = this.bossPhases()[this.boss.phase].attacks;
    for (let index = 0; index < attacks.length; index++)
      if (
        !this.bossCastBlocked() &&
        now >= this.attackAt[index] &&
        (attacks[index].kind !== 'charge' || !this.director.charging) &&
        (this.boss.id !== 'tollkeeper' || !this.director.civic.tollkeeper.busy) &&
        (this.boss.id !== 'chain-marshal' || !this.director.civic.marshal.busy) &&
        (this.boss.id !== 'gate-widow' || !this.director.civic.widow.busy) &&
        (this.boss.id !== 'black-ambulance' || (index !== 0 && !this.director.civic.ambulance.busy)) &&
        (this.boss.id !== 'matron' || (index !== 0 && !this.director.services.matron.busy)) &&
        this.boss.id !== 'alchemist' && this.boss.id !== 'bellringer' &&
        (this.boss.id!=='quarantine-clerk' || (!this.director.clerk.busy && (index!==0 || (now>=this.director.clerk.nextSignatureAt&&!this.warnings.length)))) &&
        (this.boss.id!=='ratcatcher' || (!this.director.ratcatcher.busy && (index!==0 || (now>=this.director.ratcatcher.nextSignatureAt && !this.warnings.length)))) &&
        (this.boss.id!=='courier' || (!this.director.courier.busy && (index!==0 || now>=this.director.courier.nextRouteAt))) &&
        (this.boss.id !== 'constable' || now >= this.boss.castEndsAt) &&
        (this.boss.id !== 'lantern-warden' ||
          this.wardenPatrol.canCastAuxiliary)
      ) {
        const attack = attacks[index],
          targets = this.aimTargets();
        const target = targets.length
          ? targets[Math.floor(this.rng.next() * targets.length)]
          : {
              x: this.arena.bounds.x + this.arena.width / 2,
              y: this.arena.bounds.y + this.arena.height / 2,
            };
        this.attackAt[index] = now + ticks(attack.interval);
        this.boss.castAt = now;
        this.boss.castReleaseAt = now + ticks(attack.telegraph);
        this.boss.castEndsAt = this.boss.castReleaseAt + ticks(0.66);
        const cycle =
            this.settings.mode === 'endless'
              ? Math.floor(this.encounter / rule.endless.cycleEncounters)
              : 0,
          count = Math.min(
            80,
            Math.ceil(
              attack.count * this.modifier('bossBulletCount') * threatPressure(this.boss.id).count,
            ) +
              this.difficulty.extraPatterns * 2 +
              Math.min(8, cycle),
          ),
          speed =
            attack.speed *
            this.difficulty.speed *
            this.modifier('bossSpeed') *
            threatPressure(this.boss.id).speed *
            (1 +
              Math.min(rule.endless.maximumSpeedGrowth, cycle * rule.endless.speedGrowthPerCycle)),
          damage = attack.damage * this.bossDamageScale();
        if (this.director.smallWakes.cast(this.signatureContext(), target, { ...attack, speed, count })) {
          this.attackAt[index] = this.director.smallWakes.nextSignatureAt;
          this.boss.castEndsAt = this.director.smallWakes.lastReleaseAt + ticks(.35);
        } else if (this.director.earlyWatch.cast(this.signatureContext(), target, { ...attack, speed, count })) {
          this.attackAt[index] = this.director.earlyWatch.nextSignatureAt;
          this.boss.castEndsAt = this.director.earlyWatch.lastReleaseAt + ticks(.35);
        } else if (this.boss.id === 'constable') {
          const pattern = constablePattern({
            boss: this.boss,
            now,
            target,
            bounds: this.arena.bounds,
            obstacles: this.obstacles,
            attack: { ...attack, count, speed, damage },
          });
          this.warnings.push(...pattern.warnings.map((w) => ({ ...w, id: this.id() })));
          this.boss.castEndsAt = pattern.lastReleaseAt + ticks(0.66);
        } else if (
          index === 0 &&
          this.director.endless.cast(this.signatureContext(), target, { ...attack, speed, count })
        ) {
          this.attackAt[index] = this.director.endless.nextSignatureAt;
        } else if (
          index === 0 &&
          this.director.raids.cast(this.signatureContext(), target, { ...attack, speed, count })
        ) {
          this.attackAt[index] = this.director.raids.nextSignatureAt;
        } else if (
          index === 0 &&
          this.director.district.cast(this.signatureContext(), target, { ...attack, speed, count })
        ) {
          this.attackAt[index] = this.director.district.nextSignatureAt;
        } else if (
          index === 0 &&
          this.director.services.cast(this.signatureContext(), target, { ...attack, speed, count })
        ) {
          this.attackAt[index] = this.director.services.nextSignatureAt;
          // This boss owns a real signature, not the fallback pool/fan.
        } else if (
          this.director.services.supplement(this.signatureContext(), target, {
            ...attack,
            speed,
            count,
          })
        ) {
          // Locked beams and timed spiral emitters remain real geometry/projectiles.
        } else if (attack.kind === 'charge') {
          this.director.startCharge(this.signatureContext(), target, {
            ...attack,
            speed,
          });
        } else if (attack.kind === 'summon') {
          this.director.startPacks(this.signatureContext(), target, {
            ...attack,
            speed,
          });
        } else if (attack.kind === 'zone' && this.boss.id === 'quarantine-clerk') {
          this.director.startStamps(this.signatureContext(), target, {
            ...attack,
            speed,
          });
        } else if (
          attack.kind === 'fan' ||
          attack.kind === 'ring' ||
          attack.kind === 'pulse' ||
          attack.kind === 'hook' ||
          attack.kind === 'lanes' ||
          attack.kind === 'cross'
        ) {
          const origins = attack.kind === 'lanes' || attack.kind === 'cross' ? [-130, 130] : [0];
          for (const offset of origins)
            this.warnings.push({
              id: this.id(),
              kind: attack.kind === 'ring' || attack.kind === 'pulse' ? 'ring' : 'fan',
              x: this.boss.x + offset,
              y: this.boss.y,
              aim: Math.atan2(target.y - this.boss.y, target.x - (this.boss.x + offset)),
              count: attack.kind === 'cross' ? Math.ceil(count / 2) : count,
              arc:
                ((attack.kind === 'ring' || attack.kind === 'pulse'
                  ? 'gap' in attack
                    ? Number(attack.gap)
                    : 70
                  : 'arc' in attack
                    ? Number(attack.arc)
                    : attack.kind === 'hook'
                      ? 35
                      : 90) *
                  Math.PI) /
                180,
              speed,
              damage,
              radius: 5,
              at: now + ticks(attack.telegraph),
              until: 0,
            });
        } else
          for (let n = 0; n < count; n++) {
            const t = targets[n % targets.length] ?? target;
            this.warnings.push({
              id: this.id(),
              kind: 'zone',
              x: clamp(t.x + (n ? this.rng.next() * 180 - 90 : 0), 100, 1500),
              y: clamp(t.y + (n ? this.rng.next() * 160 - 80 : 0), 100, 900),
              aim: 0,
              count: 1,
              arc: 0,
              speed: 0,
              damage,
              radius: 'radius' in attack ? Number(attack.radius) : 75,
              at: now + ticks(attack.telegraph),
              until:
                now +
                ticks(attack.telegraph + ('duration' in attack ? Number(attack.duration) : 3)),
            });
          }
        this.events.push({
          type: 'sound',
          id: 'warning',
          x: this.boss.x,
          y: this.boss.y,
        });
      }
    if (this.boss.id !== 'bellringer' && this.boss.id !== 'alchemist' && this.boss.id !== 'matron' && this.boss.id !== 'black-ambulance' && this.boss.id !== 'tollkeeper' && this.boss.id !== 'chain-marshal' && this.boss.id !== 'gate-widow') this.director.step(this.signatureContext());
    if (this.boss.id === 'constable')
      moveConstable(
        this.boss,
        now,
        this.arena.bounds,
        this.obstacles,
        this.aimTargets(),
        !!this.accord,
      );
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i];
      if (now < w.at) continue;
      if (w.kind === 'fan' || w.kind === 'ring') {
        for (let n = 0; n < w.count; n++)
          this.emitBossShot(
            w.x,
            w.y,
            w.kind === 'ring'
              ? w.aim + w.arc / 2 + (n / Math.max(1, w.count - 1)) * (Math.PI * 2 - w.arc)
              : w.aim + (n / Math.max(1, w.count - 1) - 0.5) * w.arc,
            w.speed,
            w.damage,
            w.radius,
          );
      } else
        this.fields.push({
          id: w.id,
          owner: 'hostile',
          kind: 'zone',
          x: w.x,
          y: w.y,
          radius: w.radius,
          until: w.until,
          potency: w.damage,
        });
      this.warnings.splice(i, 1);
    }
  }
  private stepLava() {
    const now=this.combatTick;
    if(now<this.arenaHazardAt || !this.arena.lavaPits.length)return;
    for(const p of this.roster()) {
      if(p.status!=='active'||now<(this.lavaHitAt.get(p.id)??0))continue;
      if(this.arena.lavaPits.some(pit=>segmentCircle({x:p.oldX,y:p.oldY},p,pit,pit.radius+rule.playerRadius)!==null)) {
        this.damage(p,rule.arenaDifficulty.lavaDamagePerSecond*rule.arenaDifficulty.lavaHitIntervalSeconds);
        this.lavaHitAt.set(p.id,now+ticks(rule.arenaDifficulty.lavaHitIntervalSeconds));
      }
    }
  }
  private stepFields() {
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      if(f.anchor){const owner=this.players.get(f.owner);if(owner?.status!=='active'){this.fields.splice(i,1);continue;}const point=fieldPosition(f,this.roster());f.x=point.x;f.y=point.y;}
      if (this.combatTick >= f.until || (f.kind === 'barrier' && f.potency <= 0)) {
        this.fields.splice(i, 1);
        continue;
      }
      if (f.kind === 'heal') {
        const source = this.players.get(f.owner);
        if (source)
          for (const p of this.roster())
            if (p.status === 'active' && distance(fieldPosition(f,this.roster()), p) <= f.radius)
              this.heal(source, p, f.potency * DT);
      }
      if (f.kind === 'zone')
        for (const p of this.roster())
          if (p.status === 'active' && distance(fieldPosition(f,this.roster()), p) <= f.radius + rule.playerRadius) {
            p.slowUntil = this.combatTick + ticks(0.1);
            if (this.combatTick % HZ === 0) this.damage(p, f.potency);
          }
    }
  }
  spawnMinion(definition: MinionSpawn) {
    if (this.phase !== 'combat' || this.minions.actors.size >= rule.maximumMinions) return null;
    return this.minions.spawn(this.id(), definition, this.combatTick);
  }
  private hitWeak(source: Player | undefined, amount: number, id: number) {
    const transfer = this.director.damageTransfer(id);
    const actual = this.director.hitWeakPoint(amount, this.combatTick, id);
    if (transfer) this.hitBoss(source, actual * transfer.multiplier, transfer.bypassArmor);
    else this.creditHit(source, actual);
  }

  private friendlyCollision(
    shot: Shot,
    old: { x: number; y: number },
    next: { x: number; y: number },
    wall: number,
    weakPoints: ReturnType<BossDirector['weakPoints']>,
  ) {
    const bossTime = this.director.hasIndependentBodies()
      ? null
      : segmentCircleXY(
          old.x - this.bossPrevious.x,
          old.y - this.bossPrevious.y,
          next.x - this.boss.x,
          next.y - this.boss.y,
          0,
          0,
          this.bossDefinition().radius + shot.radius,
        );
    const hits = this.collisionHits;
    hits.length = 0;
    for (const weak of weakPoints)
      if (weak.health > 0) {
        const time = this.director.weakContact(old, next, weak, shot.radius);
        if (time !== null && time < wall) hits.push({ time, weakId: weak.id });
      }
    if (
      bossTime !== null &&
      bossTime < wall &&
      !hits.some((h) => h.weakId !== undefined && this.director.damageTransfer(h.weakId))
    )
      hits.push({ time: bossTime });
    for (const actor of this.minions.actors.values()) {
      if (this.shotHits.get(shot.id)?.has(actor.id)) continue;
      const time = segmentCircleXY(
        old.x - actor.oldX,
        old.y - actor.oldY,
        next.x - actor.x,
        next.y - actor.y,
        0,
        0,
        actor.radius + shot.radius,
      );
      if (time !== null && time < wall) hits.push({ time, minionId: actor.id });
    }
    if (hits.length > 1)
      hits.sort((a, b) => a.time - b.time || (a.minionId ?? 0) - (b.minionId ?? 0));
    for (const hit of hits) {
      if (hit.weakId !== undefined) {
        this.hitWeak(this.players.get(shot.owner), shot.damage, hit.weakId);
        return true;
      }
      if (hit.minionId === undefined) {
        this.hitBoss(this.players.get(shot.owner), shot.damage);
        return true;
      }
      let touched = this.shotHits.get(shot.id);
      if (!touched) {
        touched = new Set();
        this.shotHits.set(shot.id, touched);
      }
      touched.add(hit.minionId);
      const effect = this.shotEffects.get(shot.id);
      const actual = this.minions.hit(
        hit.minionId,
        shot.damage,
        this.combatTick,
        effect?.slowTicks,
        effect?.slowMultiplier,
      );
      this.creditHit(this.players.get(shot.owner), actual);
      if (shot.pierce <= 0) return true;
      shot.pierce--;
    }
    return false;
  }
  private removeShot(s: Shot) {
    if (!this.shots.delete(s.id)) return;
    this.shotEffects.delete(s.id);
    this.shotHits.delete(s.id);
    if (s.owner === 'hostile') this.hostileShots--;
    this.removals.push(s.id);
    this.freeShots.push(s);
  }
  private clearShots() {
    this.brutalVolley.clear();
    this.variantPressure.clear();
    for (const s of this.shots.values()) this.removeShot(s);
  }
  private stepShots() {
    const safeZones = this.director.safeZones(this.combatTick);
    const districtCover = this.director.district.projectileCover();
    const constructs = this.classKits.constructs();
    const useConstructGrid = constructs.length >= 8;
    if (useConstructGrid) {
      this.constructGrid.clear();
      for (const body of constructs)
        this.constructGrid.insert(body, body.kind === 'wall' ? 122 : body.radius);
    }
    let weakPoints = this.director.weakPoints();

    // Moving buildings are weak targets for friendly shots and solids for
    // hostile ones. Treating them as friendly masonry discarded weapon hits.
    const gates = this.director.civic.solids(this.combatTick);
    const fixedObstacles = gates.length
      ? [...this.arena.obstacles, ...gates]
      : this.arena.obstacles;
    let hostileObstacles = this.obstacles;

    const old = { x: 0, y: 0 },
      next = { x: 0, y: 0 };
    for (const s of this.shots.values()) {
      old.x = s.x;
      old.y = s.y;
      next.x = s.x + s.vx * DT;
      next.y = s.y + s.vy * DT;
      if (this.director.endless.reflectShot(s, old, next, this.combatTick))
        this.spawns.push({ ...s, x: next.x, y: next.y });
      const effect = this.shotEffects.get(s.id);
      if (effect) {
        const distance = Math.hypot(next.x - old.x, next.y - old.y);
        const fraction = Math.min(1, effect.rangeRemaining / distance);
        next.x = old.x + (next.x - old.x) * fraction;
        next.y = old.y + (next.y - old.y) * fraction;
        effect.rangeRemaining = Math.max(0, effect.rangeRemaining - distance);
      }
      let wall = 1;
      for (const rect of s.owner === 'hostile' ? hostileObstacles : fixedObstacles) {
        const hit = segmentRect(old, next, rect, s.radius);
        if (hit) wall = Math.min(wall, hit.t);
      }
      if (s.owner === 'hostile')
        for (const cover of districtCover) {
          const hit = segmentRect(old, next, cover, s.radius);
          if (hit) wall = Math.min(wall, hit.t);
        }
      let player: Player | undefined,
        barrier: Field | undefined,
        structure: Construct | undefined,
        hitTime = wall,
        friendlyHit = false,
        safeHit = false;
      let safeZone: (typeof safeZones)[number] | undefined;
      if (s.owner === 'hostile') {
        // The reopened stamp absorbs hostile shots at its visible boundary.
        for (const zone of safeZones) {
          const time = segmentCircle(old, next, zone, zone.radius + s.radius);
          if (time !== null && time < hitTime) {
            hitTime = time;
            safeHit = true;
            safeZone = zone;
          }
        }
        for (const field of this.fields) {
          if (field.kind !== 'barrier' || field.potency <= 0) continue;
          const t = segmentCircle(old, next, field, field.radius + s.radius);
          if (t !== null && t < hitTime) {
            hitTime = t;
            barrier = field;
            safeHit = false;
          }
        }
        let candidates: Construct[] = constructs;
        if (useConstructGrid) {
          this.constructGrid.queryInto(old, next, s.radius * 2, this.projectileConstructs);
          if (this.projectileConstructs.length > 1) this.projectileConstructs.sort(constructOrder);
          candidates = this.projectileConstructs;
        }
        for (const body of candidates)
          if (body.health > 0) {
            const time = constructHit(old, next, body, s.radius);
            if (time !== null && time < hitTime) {
              hitTime = time;
              structure = body;
              barrier = undefined;
              safeHit = false;
            }
          }
        this.grid.queryInto(old, next, s.radius + rule.playerRadius, this.projectilePlayers);
        for (const p of this.projectilePlayers) {
          if (p.status !== 'active') continue;
          const t = segmentCircleXY(
            old.x - p.oldX,
            old.y - p.oldY,
            next.x - p.x,
            next.y - p.y,
            0,
            0,
            s.radius + rule.playerRadius,
          );
          if (t !== null && t < hitTime) {
            player = p;
            structure = undefined;
            safeHit = false;
            barrier = undefined;
            hitTime = t;
          }
        }
      } else {
        friendlyHit = this.friendlyCollision(s, old, next, wall, weakPoints);
        // A weapon may destroy a building. Rebuild its solid list before a
        // later projectile in this same tick; never keep a dead shield alive.
        if (friendlyHit) {
          hostileObstacles = this.obstacles;
          weakPoints = this.director.weakPoints();
        }
      }
      if (safeHit && safeZone)
        this.director.clerk.recordBlock(safeZone.id, {
          x: old.x + (next.x - old.x) * hitTime,
          y: old.y + (next.y - old.y) * hitTime,
        }, this.combatTick, () => this.id());
      s.x = next.x;
      s.y = next.y;
      if (player) this.damage(player, s.damage);
      else if (barrier) barrier.potency = Math.max(0, barrier.potency - s.damage);
      else if (structure) this.classKits.hitConstruct(structure.id, s.damage);

      if (
        player ||
        barrier ||
        structure ||
        friendlyHit ||
        safeHit ||
        effect?.rangeRemaining === 0 ||
        wall < 1 ||
        this.combatTick >= s.expires ||
        next.x < 0 ||
        next.x > 1600 ||
        next.y < 0 ||
        next.y > 1000
      )
        this.removeShot(s);
    }
  }
  private revive(p: Player, source?: Player) {
    const reviver=source??p,health=revivedHealth(this.settings.difficulty,p.maxHealth,reviver.classId);
    if(!health || !['downed','eliminated'].includes(p.status))return;
    if (source && source.id !== p.id && ['downed', 'eliminated'].includes(p.status))
      source.progress.rescues = Math.min(1000000, source.progress.rescues + 1);
    p.status = 'active';
    this.clearPoison(p);
    p.health = health;
    p.shield = Math.max(p.shield,revivalShield(this.settings.difficulty,p.maxHealth,reviver.classId));
    this.limitPersonalShield(p);
    p.reviveProgress = 0;
    p.downUntil = 0;
    p.invulnerableUntil = this.combatTick + ticks(1);
    this.events.push({ type: 'sound', id: 'revive', x: p.x, y: p.y });
  }
  private stepRevives() {
    if(this.settings.difficulty==='hellish') {
      for(const p of this.roster()){p.reviveTarget='';p.reviveProgress=0;}
      return;
    }
    for (const p of this.roster()) {
      if (p.status === 'downed' && selfReviveAllowed(this.settings.difficulty,p.classId,this.roster().length) && p.selfRevives > 0) {
        p.reviveProgress = p.input.interact ? p.reviveProgress + 1 : 0;
        if (p.reviveProgress >= ticks(2)) {
          p.selfRevives--;
          this.revive(p,p);
        }
        continue;
      }
      if (p.status !== 'active') continue;
      if(!combatReviveAllowed(this.settings.difficulty,p.classId)){p.reviveTarget='';p.reviveProgress=0;continue;}
      const target = p.input.interact
        ? this.roster().find((t) => t.status === 'downed' && distance(p, t) <= 55)
        : undefined;
      if (!target) {
        p.reviveTarget = '';
        p.reviveProgress = 0;
        continue;
      }
      p.reviveProgress =
        p.reviveTarget === target.id ? p.reviveProgress + this.stats(p).reviveRate : 1;
      p.reviveTarget = target.id;
      if (p.reviveProgress >= ticks(rule.reviveSeconds * this.modifier('reviveTime'))) {
        this.revive(target, p);
        p.reviveTarget = '';
        p.reviveProgress = 0;
      }
    }
  }
  /** One budget covers permanent, ability and temporary personal shield pools. */
  private limitPersonalShield(p:Player){
    const maximum=maximumPersonalShield(this.settings.difficulty,p.maxHealth);
    p.shield=clamp(p.shield,0,maximum);
    this.classKits.limitShield(p.id,maximum-p.shield,this.combatTick);
    p.supplyShield=this.combatTick<p.supplyShieldUntil
      ?clamp(p.supplyShield,0,maximum-p.shield-this.classKits.status(p.id,this.combatTick).shield):0;
  }
  drainEvents(): Event[] {
    const out = this.events;
    this.events = [];
    if (this.spawns.length) {
      out.push({ type: 'shots', shots: this.spawns });
      this.spawns = [];
    }
    if (this.removals.length) {
      out.push({ type: 'remove', ids: this.removals });
      this.removals = [];
    }
    return out;
  }
  // Practice-only boundary saves never enter the online room or global rankings.
  offlineCheckpoint() {
    if(this.testingModified)return null;
    if (
      this.players.size !== 1 ||
      !['lobby', 'mutationVote', 'contractVote', 'shop', 'loading', 'secretOffer'].includes(
        this.phase,
      )
    )
      return null;
    const p = [...this.players.values()][0];
    return {
      schemaVersion: 1,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
      practiceOnly: true,
      settings: { ...this.settings, maxPlayers: 1 },
      arenaId: this.currentArenaId,
      tick: this.tick,
      combatTick: this.combatTick,
      phase: this.phase,
      phaseEnds: this.phaseEnds,
      defeatedBoss: showingBossDefeat(this.boss, this.tick)
        ? { defeatedAt: this.boss.defeatedAt, x: this.boss.x, y: this.boss.y } : null,
      encounter: this.encounter,
      accords: this.accords,
      timeouts: this.timeouts,
      endlessHistory: structuredClone(this.endless.state),
      secretStatus: this.secretStatus,
      extensionParticipants: [...this.extensionParticipants],
      campaignBank: this.campaignBank ? { ...this.campaignBank } : null,
      completedBossIds: [...this.completedBossIds],
      completedBossForms: Object.fromEntries(this.completedBossForms),
      rng: this.rng.state >>> 0,
      nextId: this.nextId,
      selectedContract: { ...this.selectedContract },
      mutations: structuredClone(this.mutations),
      mutationCards: [...this.mutationCards],
      contractCards: structuredClone(this.contractCards),
      votes: Object.fromEntries(this.votes),
      player: {
        progress: structuredClone(p.progress),
        id: p.id,
        name: p.name,
        classId: p.classId,
        weapon: p.weapon,
        coins: p.coins,
        incomeGranted: p.incomeGranted,
        totalSp: p.totalSp,
        skills: [...p.skills],
        upgrades: { ...p.upgrades },
        supplies: p.supplies.map((s) => ({ ...s })),
        supplyAt: p.supplyAt,
        qAt: p.qAt,
        eAt: p.eAt,
        ultimateAt: p.ultimateAt,
        dodgeAt: p.dodgeAt,
        damageTaken: p.damageTaken,
        damageDealt: p.damageDealt,
        healing: p.healing,
      },
    };
  }
  static restoreOffline(value: unknown): Game {
    value = migratePracticeBoundary(value);
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      JSON.stringify(value).length > 32768
    )
      throw Error('invalidCheckpoint');
    const save = value as NonNullable<ReturnType<Game['offlineCheckpoint']>>;
    const int = (n: unknown, min = 0, max = 0xffffffff): n is number =>
      typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
    const finite = (n: unknown, min = 0, max = 1e12) =>
      typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
    if (
      save.schemaVersion !== 1 ||
      save.protocolVersion !== PROTOCOL ||
      save.contentRevision !== CONTENT_REVISION ||
      save.practiceOnly !== true
    )
      throw Error('versionMismatch');
    if (
      !save.settings ||
      !implementedModeIds.includes(save.settings.mode) ||
      save.settings.maxPlayers !== 1 ||
      !int(save.settings.seed) ||
      !int(save.tick) ||
      !int(save.combatTick) ||
      save.combatTick > save.tick ||
      !int(save.encounter, 0, 1000000) ||
      !int(save.accords) ||
      !int(save.rng) ||
      !int(save.nextId, 1) ||
      !['lobby', 'mutationVote', 'contractVote', 'shop', 'loading', 'secretOffer'].includes(
        save.phase,
      ) ||
      !int(save.phaseEnds) ||
      (save.phase !== 'lobby' && (save.phaseEnds < save.tick || save.phaseEnds - save.tick > 1800))
    )
      throw Error('invalidCheckpoint');
    const g = new Game(save.settings),
      p = save.player;
    if (
      !validEndlessHistory(save.endlessHistory) ||
      !int(save.timeouts, 0, 1000000) ||
      !['locked', 'offered', 'declined', 'active', 'cleared', 'failed'].includes(save.secretStatus)
    )
      throw Error('invalidRunHistory');
    if (
      !Array.isArray(save.extensionParticipants) ||
      save.extensionParticipants.length > 50 ||
      new Set(save.extensionParticipants).size !== save.extensionParticipants.length ||
      !save.extensionParticipants.every(
        (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id),
      )
    )
      throw Error('invalidSecretRoster');
    g.endless.state = structuredClone(save.endlessHistory);
    g.timeouts = save.timeouts;
    g.secretStatus = save.secretStatus;
    g.extensionParticipants = save.extensionParticipants.map((id) => (id === p?.id ? 'solo' : id));
    if (save.campaignBank !== null) {
      const b = save.campaignBank;
      if (
        !b ||
        typeof b.runId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(b.runId) ||
        !implementedModeIds.includes(b.mode) ||
        b.mode === 'endless' ||
        b.mode !== g.settings.mode ||
        b.difficulty !== g.settings.difficulty ||
        b.encounters !== g.routeLength ||
        !int(b.accords) ||
        !int(b.combatTick) ||
        b.combatTick > save.combatTick ||
        !int(b.timeouts, 0, 1000000) ||
        !int(b.bankedAt) ||
        b.bankedAt > save.tick
      )
        throw Error('invalidCampaignBank');
      g.campaignBank = { ...b };
    }
    if (
      (save.phase === 'secretOffer') !== (save.secretStatus === 'offered') ||
      (save.secretStatus === 'offered' &&
        (!g.campaignBank || save.encounter < rule.secret.minimumClearedEncounters || save.timeouts !== 0 || !['normal','hard','insane','hellish'].includes(g.settings.difficulty)))
    )
      throw Error('invalidSecretOffer');

    if (
      !Array.isArray(save.completedBossIds) ||
      save.completedBossIds.length > implementedBossIds.length ||
      new Set(save.completedBossIds).size !== save.completedBossIds.length ||
      !save.completedBossIds.every((id) => implementedBossIds.includes(id as BossId))
    )
      throw Error('invalidBossHistory');
    for (const id of save.completedBossIds) g.completedBossIds.add(id as BossId);
    if(!save.completedBossForms || typeof save.completedBossForms!=='object' || Array.isArray(save.completedBossForms) || Object.keys(save.completedBossForms).length>implementedBossIds.length || Object.entries(save.completedBossForms).some(([id,form])=>!g.completedBossIds.has(id as BossId)||!['normal','brutal','crazed'].includes(form)))throw Error('invalidBossHistory');
    for(const [id,form] of Object.entries(save.completedBossForms))g.completedBossForms.set(id as BossId,form);
    if (
      !p ||
      !validProgress(p.progress, save.encounter) ||
      !implementedClassIds.includes(p.classId) ||
      typeof p.name !== 'string' ||
      p.name.length > 48 ||
      !int(p.coins, 0, 100000000) ||
      !int(p.incomeGranted, 0, 100000000) ||
      p.totalSp !== g.skillBudget(save.encounter) ||
      !Array.isArray(p.skills) ||
      p.skills.length > 18 ||
      new Set(p.skills).size !== p.skills.length ||
      !p.upgrades ||
      typeof p.upgrades !== 'object' ||
      Array.isArray(p.upgrades) ||
      !data.weapons.some((w) => w.id === p.weapon && w.classId === p.classId)
    )
      throw Error('invalidBuild');
    if (
      !Array.isArray(p.supplies) ||
      p.supplies.length !== 3 ||
      !int(p.supplyAt) ||
      p.supplyAt > save.combatTick + 3600
    )
      throw Error('invalidInventory');
    const carried = new Set<string>();
    for (const slot of p.supplies) {
      if (
        !slot ||
        typeof slot !== 'object' ||
        !int(slot.count, 0, 2) ||
        typeof slot.id !== 'string'
      )
        throw Error('invalidInventory');
      if (!slot.count) {
        if (slot.id !== '') throw Error('invalidInventory');
        continue;
      }
      const definition = data.supplies.find((s) => s.id === slot.id);
      if (!definition || carried.has(slot.id) || slot.count > definition.maximumStack)
        throw Error('invalidInventory');
      carried.add(slot.id);
    }
    let spent = 0,
      capstones = 0;
    const owned = new Set<string>();
    for (const id of p.skills) {
      const node = data.skills.find((s) => s.id === id && s.classId === p.classId);
      if (!node || (node.prerequisite && !owned.has(node.prerequisite)))
        throw Error('invalidBuild');
      spent += node.cost;
      capstones += Number(node.capstone);
      owned.add(id);
    }
    if (spent > p.totalSp || capstones > 1) throw Error('invalidBuild');
    for (const [id, level] of Object.entries(p.upgrades)) {
      const u = data.upgrades.find((u) => u.id === id);
      if (!u || !int(level, 0, u.maximum)) throw Error('invalidBuild');
    }
    for (const n of [p.qAt, p.eAt, p.ultimateAt, p.dodgeAt])
      if (!int(n) || n > save.combatTick + 3600) throw Error('invalidBuild');
    for (const n of [p.damageTaken, p.damageDealt, p.healing])
      if (!finite(n)) throw Error('invalidBuild');
    if (
      !Array.isArray(save.mutations) ||
      save.mutations.length > 3 ||
      new Set(save.mutations.map((m) => m.id)).size !== save.mutations.length
    )
      throw Error('invalidMutations');
    for (const m of save.mutations) {
      const definition = data.mutations.find((x) => x.id === m.id);
      if (
        !definition ||
        !int(m.remaining, 1, 3) ||
        save.mutations.some((other) => new Set<string>(definition.excludes).has(other.id))
      )
        throw Error('invalidMutations');
    }
    if (
      !Array.isArray(save.mutationCards) ||
      save.mutationCards.length > 3 ||
      new Set(save.mutationCards).size !== save.mutationCards.length ||
      !save.mutationCards.every((id) => data.mutations.some((m) => m.id === id))
    )
      throw Error('invalidCards');
    const validContract = (c: Contract) =>
      c &&
      typeof c.id === 'string' &&
      /^[a-z0-9-]{1,64}$/.test(c.id) &&
      int(c.threat, 1, c.bossId === 'uncounted' ? 11 : 10) &&
      c.risk === 0 &&
      (c.subtier === undefined || int(c.subtier, -2, 2)) &&
      finite(c.bounty, 1, 3) &&
      implementedBossIds.includes(c.bossId as BossId) &&
      (c.variant === undefined || ['normal', 'brutal', 'crazed'].includes(c.variant)) &&
      finite(c.recommendedRating, 0, 1000000) &&
      c.threat === bossThreat(c.bossId!).level &&
      (c.subtier === undefined || c.subtier === bossThreat(c.bossId!).subtier);
    if (
      !validContract(save.selectedContract) ||
      !Array.isArray(save.contractCards) ||
      save.contractCards.length > 3 ||
      !save.contractCards.every(validContract) ||
      (save.phase === 'contractVote' && save.contractCards.length !== 3) ||
      (save.phase === 'mutationVote' && save.mutationCards.length !== 3)
    )
      throw Error('invalidCards');
    if (
      !save.votes ||
      typeof save.votes !== 'object' ||
      Array.isArray(save.votes) ||
      Object.keys(save.votes).some((id) => id !== 'solo') ||
      Object.values(save.votes).some((i) => !int(i, 0, 2))
    )
      throw Error('invalidVotes');
    const player = g.addPlayer('solo', p.name, p.classId);
    Object.assign(player, {
      progress: structuredClone(p.progress),
      weapon: p.weapon,
      coins: p.coins,
      incomeGranted: p.incomeGranted,
      totalSp: p.totalSp,
      skills: [...p.skills],
      upgrades: { ...p.upgrades },
      supplies: p.supplies.map((s) => ({ ...s })),
      supplyAt: p.supplyAt,
      qAt: p.qAt,
      eAt: p.eAt,
      ultimateAt: p.ultimateAt,
      dodgeAt: p.dodgeAt,
      damageTaken: p.damageTaken,
      damageDealt: p.damageDealt,
      healing: p.healing,
      ack: 0,
      pending: [],
      input: idleInput(),
      eligible: true,
    });
    g.tick = save.tick;
    g.combatTick = save.combatTick;
    g.phase = save.phase;
    g.phaseEnds = save.phaseEnds;
    g.encounter = save.encounter;
    g.accords = save.accords;
    g.rng.state = save.rng;
    g.nextId = save.nextId;
    const previousArena = selectedArenaId(g.settings, Math.max(0, save.encounter - 1));
    if (save.arenaId !== undefined && (!data.arenas.some(a => a.id === save.arenaId) ||
      (g.settings.arenaSelection !== 'route' && save.arenaId !== previousArena)))
      throw Error('invalidArenaSelection');
    g.currentArenaId = save.arenaId ?? previousArena;
    g.selectedContract = {
      ...save.selectedContract,
      ...classifiedContract(save.selectedContract.bossId!, encounterVariant(g.settings.difficulty,save.selectedContract.variant)),
    };
    g.boss.id = save.selectedContract.bossId!;
    if (save.defeatedBoss !== undefined && save.defeatedBoss !== null) {
      const fall = save.defeatedBoss;
      if (!fall || typeof fall !== 'object' || Array.isArray(fall) ||
        !int(fall.defeatedAt, 1, save.tick) || !finite(fall.x, 0, 1600) || !finite(fall.y, 0, 1000) ||
        !g.completedBossIds.has(g.boss.id) || save.encounter < 1 || save.phase === 'lobby' ||
        !showingBossDefeat({ health: 0, defeatedAt: fall.defeatedAt }, save.tick))
        throw Error('invalidBossDefeat');
      Object.assign(g.boss, { defeatedAt: fall.defeatedAt, x: fall.x, y: fall.y,
        health: 0, variant: g.selectedContract.variant, threat: g.selectedContract.threat });
    }
    g.mutations.push(...structuredClone(save.mutations));
    g.mutationCards = [...save.mutationCards];
    g.contractCards = save.contractCards.map((card) => ({
      ...card,
      ...classifiedContract(card.bossId!, encounterVariant(g.settings.difficulty,card.variant)),
    }));
    for (const [id, index] of Object.entries(save.votes)) g.votes.set(id, index);
    g.statsCache.clear();
    player.maxHealth = g.stats(player).health;
    player.health = player.maxHealth;
    player.ammo = g.stats(player).magazine;
    g.limitPersonalShield(player);
    return g;
  }
  // Snapshot is for first-playable rendering and boundary saves, never a trusted online combat result.
  authoritativeCheckpoint() {
    if (
      !['lobby', 'mutationVote', 'contractVote', 'shop', 'loading', 'secretOffer'].includes(
        this.phase,
      ) ||
      !this.players.size
    )
      return null;
    return {
      schemaVersion: 1,
      protocolVersion: PROTOCOL,
      contentRevision: CONTENT_REVISION,
      serverOnly: true,
      settings: { ...this.settings },
      arenaId: this.currentArenaId,
      tick: this.tick,
      combatTick: this.combatTick,
      phase: this.phase,
      phaseEnds: this.phaseEnds,
      defeatedBoss: showingBossDefeat(this.boss, this.tick)
        ? { defeatedAt: this.boss.defeatedAt, x: this.boss.x, y: this.boss.y } : null,
      encounter: this.encounter,
      accords: this.accords,
      timeouts: this.timeouts,
      endlessHistory: structuredClone(this.endless.state),
      secretStatus: this.secretStatus,
      extensionParticipants: [...this.extensionParticipants],
      campaignBank: this.campaignBank ? { ...this.campaignBank } : null,
      completedBossIds: [...this.completedBossIds],
      completedBossForms: Object.fromEntries(this.completedBossForms),
      peakPlayers: this.peakPlayers,
      rng: this.rng.state >>> 0,
      nextId: this.nextId,
      selectedContract: { ...this.selectedContract },
      mutations: structuredClone(this.mutations),
      mutationCards: [...this.mutationCards],
      contractCards: structuredClone(this.contractCards),
      votes: Object.fromEntries(this.votes),
      players: this.snapshot().players,
      transactions: [...this.transactions].map(([id, history]) => ({
        id,
        history: [...history],
      })),
    };
  }
  // Server code must verify the signature AND obtain a durable owner claim first.
  // This validator is deliberately not connected to public matchmaking yet.
  static restoreAuthoritative(value: unknown) {
    if (
      !value ||
      typeof value !== 'object' ||
      (value as { protocolVersion?: unknown }).protocolVersion !== PROTOCOL
    )
      throw Error('versionMismatch');
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      JSON.stringify(value).length > 1024 * 1024
    )
      throw Error('invalidCheckpoint');
    const save = value as NonNullable<ReturnType<Game['authoritativeCheckpoint']>>;
    if (
      save.serverOnly !== true ||
      !Array.isArray(save.players) ||
      !save.players.length ||
      save.players.length > 50 ||
      !save.settings ||
      save.players.length > save.settings.maxPlayers ||
      !save.votes ||
      typeof save.votes !== 'object' ||
      Array.isArray(save.votes)
    )
      throw Error('invalidCheckpoint');
    const ids = new Set<string>();
    const parts: Game[] = [];
    for (const source of save.players) {
      if (
        !source ||
        typeof source.id !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(source.id) ||
        ids.has(source.id) ||
        typeof source.eligible !== 'boolean' ||
        typeof source.expired !== 'boolean' ||
        !['active', 'downed', 'eliminated', 'waiting'].includes(source.status)
      )
        throw Error('invalidRoster');
      ids.add(source.id);
      parts.push(
        Game.restoreOffline({
          ...save,
          players: undefined,
          transactions: undefined,
          serverOnly: undefined,
          peakPlayers: undefined,
          practiceOnly: true,
          settings: { ...save.settings, maxPlayers: 1 },
          player: source,
          votes: source.id in save.votes ? { solo: save.votes[source.id] } : {},
        }),
      );
    }
    if (
      !save.votes ||
      Object.keys(save.votes).some((id) => !ids.has(id)) ||
      !Number.isSafeInteger(save.peakPlayers) ||
      save.peakPlayers < save.players.length ||
      save.peakPlayers > 50
    )
      throw Error('invalidRoster');
    const base = parts[0],
      g = new Game(save.settings);
    for (const key of [
      'tick',
      'combatTick',
      'phase',
      'phaseEnds',
      'encounter',
      'accords',
      'nextId',
    ] as const)
      Object.assign(g, { [key]: base[key] });
    if (!save.extensionParticipants.every((id) => ids.has(id))) throw Error('invalidSecretRoster');
    g.extensionParticipants = [...save.extensionParticipants];
    g.peakPlayers = save.peakPlayers;
    g.endless.state = structuredClone(base.endless.state);
    g.secretStatus = base.secretStatus;
    g.campaignBank = base.campaignBank ? { ...base.campaignBank } : null;
    g.timeouts = base.timeouts;
    for (const id of base.completedBossIds) g.completedBossIds.add(id);
    for(const [id,form] of base.completedBossForms)g.completedBossForms.set(id,form);
    g.rng.state = base.rng.state;
    g.selectedContract = { ...base.selectedContract };
    g.boss = { ...base.boss };
    g.currentArenaId = base.currentArenaId;
    g.mutations.push(...structuredClone(base.mutations));
    g.mutationCards = [...base.mutationCards];
    g.contractCards = structuredClone(base.contractCards);
    for (const [id, index] of Object.entries(save.votes)) g.votes.set(id, index);
    for (const [n, source] of save.players.entries()) {
      const p = parts[n].players.get('solo')!;
      for (const [key, max] of [
        ['x', 1600],
        ['y', 1000],
        ['health', p.maxHealth],
        ['shield', 1000],
      ] as const)
        if (!Number.isFinite(source[key]) || source[key] < 0 || source[key] > max)
          throw Error('invalidRoster');
      Object.assign(p, {
        id: source.id,
        x: source.x,
        y: source.y,
        oldX: source.x,
        oldY: source.y,
        health: source.health,
        shield: source.shield,
        status: source.status,
        connected: false,
        expired: source.expired,
        eligible: source.eligible,
        lastSeen: g.tick,
        lastInputAt: g.tick,
      });
      g.players.set(p.id, p);
    }
    if (!Array.isArray(save.transactions) || save.transactions.length > 50)
      throw Error('invalidTransactions');
    for (const item of save.transactions) {
      if (
        !item ||
        !ids.has(item.id) ||
        g.transactions.has(item.id) ||
        !Array.isArray(item.history) ||
        item.history.length > 256
      )
        throw Error('invalidTransactions');
      const history = new Map<string, { request: string; result: Result }>();
      for (const [id, entry] of item.history) {
        if (
          typeof entry?.request !== 'string' ||
          entry.request.length > 512 ||
          typeof entry.result?.ok !== 'boolean' ||
          (entry.result.reason !== undefined &&
            (typeof entry.result.reason !== 'string' || entry.result.reason.length > 64))
        )
          throw Error('invalidTransactions');
        const request = JSON.parse(entry.request);
        if (!validCommand(request) || request.id !== id || history.has(id))
          throw Error('invalidTransactions');
        history.set(id, {
          request: entry.request,
          result: { ...entry.result },
        });
      }
      g.transactions.set(item.id, history);
    }
    for(const player of g.players.values())g.limitPersonalShield(player);
    return g;
  }
  snapshot() {
    return {
      tick: this.tick,
      combatTick: this.combatTick,
      phase: this.phase,
      phaseEnds: this.phaseEnds,
      encounter: this.encounter,
      boss: { ...this.boss },
      signatures: structuredClone(this.signatures),
      minions: this.minions.snapshot(),
      completedBossIds: [...this.completedBossIds],
      completedBossForms: Object.fromEntries(this.completedBossForms),
      players: [...this.players.values()].map((p) => ({
        ...p,
        input: undefined,
        pending: undefined,
      })),
      warnings: this.warnings.map((w) => ({ ...w })),
      fields: this.fields.map((f) => ({ ...f })),
      mutations: this.mutations.map((m) => ({ ...m })),
      mutationCards: [...this.mutationCards],
      contractCards: this.contractCards.map((c) => ({ ...c })),
      votes: Object.fromEntries(this.votes),
      accord: this.accord ? structuredClone(this.accord) : null,
      accords: this.accords,
      timeouts: this.timeouts,
      endlessHistory: structuredClone(this.endless.state),
      secretStatus: this.secretStatus,
      extensionParticipants: [...this.extensionParticipants],
      campaignBank: this.campaignBank ? { ...this.campaignBank } : null,
    };
  }
}
