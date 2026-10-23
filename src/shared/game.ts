// Shared authoritative first-playable rules. Phaser, networking and clocks stay outside this module.
import catalog from '../../content/catalog.json' with { type: 'json' };
import {
  HZ,
  DT,
  idleInput,
  validInput,
  validCommand,
  type ClassId,
  type InputFrame,
  type Phase,
  type Shot,
  type Warning,
  type Field,
  type Event,
  type Command,
  type Contract,
  type Result,
} from './protocol.ts';
import { moveBody, segmentCircle, segmentRect, distance, clamp, SpatialGrid } from './geometry.ts';
import { Random } from './random.ts';
export const data = catalog;
const ticks = (s: number) => Math.ceil(s * HZ);
const rule = data.rules;
export const arena = data.arenas.find((x) => x.id === 'gatehouse')!;
const constable = data.bosses.find((x) => x.id === 'constable')!;
export type Settings = {
  seed: number;
  mode: 'short' | 'endless';
  difficulty: string;
  maxPlayers: number;
};
export type Player = {
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
  downUntil: number;
  reviveTarget: string;
  reviveProgress: number;
  selfRevives: number;
  coins: number;
  incomeGranted: number;
  totalSp: number;
  skills: string[];
  upgrades: Record<string, number>;
  damageTaken: number;
  damageDealt: number;
  healing: number;
  eligible: boolean;
};
export type Boss = {
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
type Stats = {
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
  boss: Boss = {
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
    points: { x: number; y: number }[];
  } | null = null;
  mutationCards: string[] = [];
  contractCards: Contract[] = [];
  readonly votes = new Map<string, number>();
  private nextId = 1;
  private freeShots: Shot[] = [];
  private hostileShots = 0;
  private spawns: Shot[] = [];
  private removals: number[] = [];
  private events: Event[] = [];
  private grid = new SpatialGrid<Player>();
  private attackAt = [0, 0];
  private transactions = new Map<string, Map<string, { request: string; result: Result }>>();
  private statsCache = new Map<string, Stats>();
  private selectedContract: Contract = {
    id: 'initial',
    threat: 1,
    risk: 0,
    bounty: 1,
    recommendedRating: 1,
  };
  constructor(settings: Partial<Settings> = {}) {
    this.settings = {
      seed: settings.seed ?? 1,
      mode: settings.mode ?? 'short',
      difficulty: settings.difficulty ?? 'normal',
      maxPlayers: settings.maxPlayers ?? 8,
    };
    if (
      !data.difficulties.some((d) => d.id === this.settings.difficulty) ||
      !Number.isInteger(this.settings.maxPlayers) ||
      this.settings.maxPlayers < 1 ||
      this.settings.maxPlayers > 50
    )
      throw Error('Invalid simulation settings');
    this.rng = new Random(this.settings.seed);
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
    if (this.players.has(id)) throw Error('Duplicate player');
    this.pruneExpired();
    if (this.players.size >= this.settings.maxPlayers) throw Error('Room full');
    if (!['soldier', 'medic'].includes(classId))
      throw Error('Class is not implemented in this milestone');
    const cl = data.classes.find((c) => c.id === classId)!;
    const p: Player = {
      id,
      name:
        name
          .normalize('NFC')
          .replace(/[\p{Cc}\p{Cf}]/gu, '')
          .slice(0, 24) || 'Survivor',
      classId,
      x: arena.playerSpawn.x + ((this.players.size % 8) - 3.5) * 30,
      y: arena.playerSpawn.y + Math.floor(this.players.size / 8) * 15,
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
      downUntil: 0,
      reviveTarget: '',
      reviveProgress: 0,
      selfRevives: 1,
      coins: this.incomeBudget(this.encounter),
      incomeGranted: this.incomeBudget(this.encounter),
      totalSp: this.skillBudget(this.encounter),
      skills: [],
      upgrades: {},
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
  private skillBudget(j: number) {
    return this.settings.mode === 'endless'
      ? 3 + Math.floor((24 * Math.min(j, 9)) / 9)
      : 3 + Math.floor((24 * Math.min(j, 4)) / 4);
  }
  private incomeBudget(j: number) {
    const n = this.settings.mode === 'endless' ? Math.min(j, 9) / 9 : Math.min(j, 4) / 4;
    return Math.floor((120 + 2280 * n) * this.difficulty.coins);
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
      speed: cl.speed,
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
      pierce: Math.floor(effects.pierce ?? 0),
      regen: effects.regeneration ?? 0,
      reviveRate: 1 + (effects.reviveRate ?? 0),
      dodgeCooldown: 1,
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
  private healthForRoster(n: number, contract = this.selectedContract) {
    const cycles = this.settings.mode === 'endless' ? Math.floor(this.encounter / 10) : 0;
    return (
      rule.bossHealthBase *
      rule.bossHealthThreatGrowth ** (contract.threat - 1) *
      constable.healthFactor *
      this.difficulty.health *
      (1 + 0.7 * Math.max(0, n - 1)) *
      this.modifier('bossHealth') *
      (1 + cycles * 0.15) *
      (1 + contract.risk * 0.08)
    );
  }
  private startEncounter() {
    this.pruneExpired();
    this.phase = 'combat';
    this.phaseEnds = 0;
    this.warnings.length = 0;
    this.fields.length = 0;
    this.clearShots();
    this.statsCache.clear();
    this.accord = null;
    for (const [i, p] of [...this.players.values()].entries()) {
      p.coins += Math.max(0, this.incomeBudget(this.encounter) - p.incomeGranted);
      p.incomeGranted = this.incomeBudget(this.encounter);
      p.status = 'active';
      p.eligible = true;
      p.totalSp = Math.max(p.totalSp, this.skillBudget(this.encounter));
      p.maxHealth = this.stats(p).health;
      p.health = p.maxHealth;
      p.shield = clamp(
        this.mutations.reduce(
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
        100,
      );
      p.ammo = this.stats(p).magazine;
      p.reloadAt = 0;
      p.selfRevives = 1 + (this.stats(p).effects.selfRevives ?? 0);
      p.reviveProgress = 0;
      p.downUntil = 0;
      p.channelUntil = 0;
      p.x = arena.playerSpawn.x + ((i % 8) - 3.5) * 30;
      p.y = arena.playerSpawn.y + Math.floor(i / 8) * 15;
      p.oldX = p.x;
      p.oldY = p.y;
      p.invulnerableUntil = this.combatTick + ticks(1);
    }
    const health = this.healthForRoster(this.players.size),
      deadline = this.combatTick + ticks(constable.timer * this.modifier('timer'));
    this.boss = {
      x: 800,
      y: 250,
      health,
      maxHealth: health,
      phase: 0,
      threat: this.selectedContract.threat,
      deadline,
      staggerUntil: 0,
      vulnerableUntil: 0,
    };
    this.attackAt = [this.combatTick + ticks(2), this.combatTick + ticks(4)];
    this.events.push({ type: 'sound', id: 'boss-phase' });
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
    this.phaseEnds = this.tick + ticks(seconds);
    this.votes.clear();
  }
  private victory() {
    for (const p of this.roster())
      if (p.eligible) {
        const reward =
          this.encounter < (this.settings.mode === 'endless' ? 9 : 4)
            ? this.incomeBudget(this.encounter + 1) - this.incomeBudget(this.encounter)
            : 228;
        p.coins += Math.floor(reward * this.selectedContract.bounty * this.modifier('coins'));
        p.incomeGranted = this.incomeBudget(this.encounter + 1);
        p.totalSp = this.skillBudget(this.encounter + 1);
        p.health = p.maxHealth;
        p.ammo = this.stats(p).magazine;
        p.status = 'active';
      }
    this.encounter++;
    this.clearShots();
    this.warnings.length = 0;
    this.fields.length = 0;
    this.accord = null;
    for (const m of this.mutations) m.remaining--;
    for (let i = this.mutations.length - 1; i >= 0; i--)
      if (this.mutations[i].remaining <= 0) this.mutations.splice(i, 1);
    if (this.settings.mode === 'short' && this.encounter >= 5) {
      this.phase = 'victory';
      this.events.push({ type: 'sound', id: 'accord-success' });
      return;
    }
    const eligible = data.mutations.filter(
      (m) => !this.mutations.some((a) => a.id === m.id || new Set<string>(m.excludes).has(a.id)),
    );
    this.mutationCards = this.rng.shuffle(eligible.map((m) => m.id)).slice(0, 3);
    this.changePhase('mutationVote', rule.mutationVoteSeconds);
  }
  private intermission() {
    if (this.tick < this.phaseEnds) return;
    if (this.phase === 'mutationVote') {
      const id = this.mutationCards[this.winningVote()];
      this.mutations.push({ id, remaining: 3 });
      if (this.mutations.length > 3) this.mutations.shift();
      this.statsCache.clear();
      const threat =
        this.settings.mode === 'endless'
          ? Math.min(10, this.encounter + 1)
          : [1, 3, 5, 8, 10][Math.min(this.encounter, 4)];
      const referenceDps = data.weapons
        .filter((w) => w.price === 0)
        .map((w) => w.baselineSustainedDps)
        .toSorted((a, b) => a - b)[3];
      this.contractCards = [0, 1, 2].map((i) => {
        const card = {
          id: 'watch-' + this.encounter + '-' + i,
          threat,
          risk: i,
          bounty: 1 + i * 0.15,
          recommendedRating: 0,
        };
        card.recommendedRating =
          this.healthForRoster(1, card) / (constable.timer * referenceDps * 0.65);
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
      if (['mutationVote', 'contractVote', 'shop', 'loading'].includes(this.phase))
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
        p.ack = latest.sequence;
        p.input = next;
        p.pending = [];
      }
      if (!p.connected || this.tick - p.lastInputAt > ticks(0.25))
        p.input = { ...idleInput(), sequence: p.ack, aim: p.aim };
      this.stepPlayer(p);
      // One-shot actions are consumed by the authoritative step, held movement/fire/interact persist briefly.
      p.input.reload = p.input.dodge = p.input.q = p.input.e = p.input.ultimate = false;
    }
    this.grid.clear();
    for (const p of this.players.values())
      if (p.status === 'active') this.grid.insert(p, 9 + Math.hypot(p.x - p.oldX, p.y - p.oldY));
    this.stepBoss();
    this.stepFields();
    this.stepShots();
    this.stepRevives();
    if (this.boss.health <= 0) {
      this.victory();
      return;
    }
    const roster = this.roster(),
      soloCanRecover =
        roster.length === 1 && roster[0].status === 'downed' && roster[0].selfRevives > 0;
    if (
      this.combatTick >= this.boss.deadline ||
      (!roster.some((p) => p.status === 'active') && !soloCanRecover)
    ) {
      this.phase = 'defeat';
      this.clearShots();
    }
  }
  private stepPlayer(p: Player) {
    const now = this.combatTick,
      stats = this.stats(p),
      i = p.input;
    p.aim = i.aim;
    if (p.status === 'downed') {
      if (now >= p.downUntil) p.status = 'eliminated';
      return;
    }
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
        .filter((f) => f.kind === 'rally' && distance(f, p) <= f.radius)
        .map((f) => f.movement ?? 0),
    );
    const dash = now < p.dashUntil,
      speed = dash ? rule.dodgeSpeed : stats.speed * (now < p.slowUntil ? 0.65 : 1) * (1 + rally);
    const next = moveBody(
      p,
      { x: (dash ? p.dashX : mx) * speed * DT, y: (dash ? p.dashY : my) * speed * DT },
      rule.playerRadius,
      arena.obstacles,
    );
    p.x = next.x;
    p.y = next.y;
    if (i.reload && !p.reloadAt && p.ammo < stats.magazine) this.reload(p);
    if (i.q && now >= p.qAt) this.ability(p, 'q');
    if (i.e && now >= p.eAt) this.ability(p, 'e');
    if (i.ultimate && now >= p.ultimateAt) this.ability(p, 'ultimate');
    if (i.fire && now >= p.fireAt && !p.reloadAt) {
      if (p.ammo > 0) this.fire(p);
      else this.reload(p);
    }
  }
  private reload(p: Player) {
    const w = data.weapons.find((w) => w.id === p.weapon)!;
    p.reloadAt = this.combatTick + ticks(w.reloadTime * this.stats(p).reload);
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
  }
  private fire(p: Player) {
    const w = data.weapons.find((w) => w.id === p.weapon)!,
      s = this.stats(p);
    p.ammo--;
    p.fireAt = this.combatTick + ticks(1 / (w.fireRate * s.fireRate));
    const count = w.pellets + s.extraShots,
      field = Math.max(
        0,
        ...this.fields
          .filter((f) => f.kind === 'rally' && distance(f, p) <= f.radius)
          .map((f) => f.potency),
      );
    const damage =
      w.damage * s.damage * (1 + field) * (this.rng.next() < s.crit ? s.critMultiplier : 1);
    for (let n = 0; n < count; n++)
      this.emitShot(
        p.id,
        p.x,
        p.y,
        p.aim +
          (count > 1
            ? ((n / (count - 1) - 0.5) * w.spreadDegrees * this.modifier('spread') * Math.PI) / 180
            : 0),
        w.projectileSpeed,
        damage,
        4,
        s.pierce,
        w.rangeSeconds,
      );
    this.events.push({
      type: 'sound',
      id: p.classId === 'medic' ? 'weapon-injector' : 'weapon-pistol',
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
    else if (slot === 'e') p.eAt = now + ticks(a.cooldown * s.cooldown);
    else p.ultimateAt = now + ticks(a.cooldown * s.ultimateCooldown);
    if (p.classId === 'soldier') {
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
          radius = a.radius + (ultimate ? (s.effects.ultimateRadius ?? 0) : 0);
        this.fields.push({
          id: this.id(),
          owner: p.id,
          kind: 'rally',
          x: p.x,
          y: p.y,
          radius,
          until: now + ticks(a.duration + (ultimate ? (s.effects.ultimateDuration ?? 0) : 0)),
          potency: (ultimate ? 0.35 : 0.2) * s.ability,
          movement: ultimate ? 0 : 0.1,
        });
        if (ultimate) {
          for (const ally of this.roster())
            if (distance(ally, p) <= radius) {
              ally.ammo = this.stats(ally).magazine;
              ally.reloadAt = 0;
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
        }
    } else p.channelUntil = now + ticks(1);
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
        if (ally.status === 'downed' || ally.status === 'eliminated') this.revive(ally, 0.6);
        else if (ally.status === 'active') this.heal(p, ally, 40 * potency);
        ally.slowUntil = 0;
      }
    if (this.roster().length === 1) p.shield = Math.max(p.shield, 40 * potency);
    if (distance(p, this.boss) <= radius) this.hitBoss(p, 35 * potency);
  }
  private heal(source: Player, target: Player, amount: number) {
    const healed = Math.min(
      target.maxHealth - target.health,
      amount * this.difficulty.healing * this.modifier('healing'),
    );
    target.health += Math.max(0, healed);
    source.healing += Math.max(0, healed);
  }
  damage(p: Player, amount: number) {
    if (p.status !== 'active' || this.combatTick < p.invulnerableUntil) return;
    const s = this.stats(p),
      reduced = amount * (1 - s.armor),
      blocked = Math.min(p.shield, reduced);
    p.shield -= blocked;
    const actual = Math.min(p.health, reduced - blocked);
    p.health -= actual;
    p.damageTaken += actual;
    p.invulnerableUntil = this.combatTick + ticks(0.2);
    if (p.health <= 0) {
      p.status = 'downed';
      p.health = 0;
      p.downUntil = this.combatTick + ticks(rule.downedSeconds);
      p.reviveProgress = 0;
      p.channelUntil = 0;
      this.events.push({ type: 'sound', id: 'downed', x: p.x, y: p.y });
    }
  }
  private hitBoss(p: Player | undefined, amount: number) {
    const actual = Math.min(
      this.boss.health,
      amount * (this.combatTick < this.boss.vulnerableUntil ? 1.25 : 1),
    );
    this.boss.health -= actual;
    if (p) p.damageDealt += actual;
  }
  private stepBoss() {
    const now = this.combatTick;
    const fraction = this.boss.health / this.boss.maxHealth,
      phase = fraction <= 0.4 ? 2 : fraction <= 0.75 ? 1 : 0;
    if (phase > this.boss.phase && !this.accord) {
      this.boss.phase++;
      this.rescaleDepartures();
      const count = this.roster().length;
      this.accord = {
        until: now + ticks(8),
        progress: 0,
        required: count === 1 ? 1 : count <= 8 ? 2 : count <= 24 ? 3 : 5,
        points: [
          { x: 560, y: 550 },
          { x: 1040, y: 550 },
          { x: 800, y: 650 },
          { x: 570, y: 720 },
          { x: 1030, y: 720 },
        ],
      };
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
      if (a.progress >= ticks(2)) {
        this.accords++;
        this.clearShots();
        this.warnings.length = 0;
        for (let i = this.fields.length - 1; i >= 0; i--)
          if (this.fields[i].owner === 'hostile') this.fields.splice(i, 1);
        this.boss.staggerUntil = now + ticks(4);
        this.boss.vulnerableUntil = now + ticks(4);
        for (const p of this.roster())
          if (p.status === 'active') this.heal(p, p, p.maxHealth * 0.15);
        this.accord = null;
        this.events.push({ type: 'sound', id: 'accord-success' });
      } else if (now >= a.until) this.accord = null;
    }
    if (now < this.boss.staggerUntil) return;
    const attacks = constable.phases[this.boss.phase].attacks;
    for (let index = 0; index < attacks.length; index++)
      if (now >= this.attackAt[index]) {
        const attack = attacks[index],
          targets = this.roster().filter((p) => p.status === 'active');
        if (!targets.length) continue;
        const target = targets[Math.floor(this.rng.next() * targets.length)];
        this.attackAt[index] = now + ticks(attack.interval);
        const cycle = Math.floor(this.encounter / 10),
          count = Math.min(
            80,
            Math.ceil(attack.count * this.modifier('bossBulletCount')) +
              this.difficulty.extraPatterns * 2 +
              this.selectedContract.risk * 2 +
              Math.min(8, cycle),
          ),
          speed =
            attack.speed *
            this.difficulty.speed *
            this.modifier('bossSpeed') *
            (1 + this.selectedContract.risk * 0.06) *
            Math.min(1.5, 1 + cycle * 0.04),
          damage =
            attack.damage *
            this.difficulty.damage *
            this.modifier('bossDamage') *
            (1 + cycle * 0.08);
        if (attack.kind === 'fan')
          this.warnings.push({
            id: this.id(),
            kind: 'fan',
            x: this.boss.x,
            y: this.boss.y,
            aim: Math.atan2(target.y - this.boss.y, target.x - this.boss.x),
            count,
            arc: (90 * Math.PI) / 180,
            speed,
            damage,
            radius: 5,
            at: now + ticks(attack.telegraph),
            until: 0,
          });
        else
          for (let n = 0; n < count; n++) {
            const t = targets[n % targets.length];
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
              radius: 75,
              at: now + ticks(attack.telegraph),
              until: now + ticks(attack.telegraph + 3),
            });
          }
        this.events.push({ type: 'sound', id: 'warning', x: this.boss.x, y: this.boss.y });
      }
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i];
      if (now < w.at) continue;
      if (w.kind === 'fan') {
        for (let n = 0; n < w.count; n++)
          this.emitShot(
            'hostile',
            w.x,
            w.y,
            w.aim + (n / (w.count - 1) - 0.5) * w.arc,
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
  private stepFields() {
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      if (this.combatTick >= f.until) {
        this.fields.splice(i, 1);
        continue;
      }
      if (f.kind === 'heal') {
        const source = this.players.get(f.owner);
        if (source)
          for (const p of this.roster())
            if (p.status === 'active' && distance(f, p) <= f.radius)
              this.heal(source, p, f.potency * DT);
      }
      if (f.kind === 'zone')
        for (const p of this.roster())
          if (p.status === 'active' && distance(f, p) <= f.radius + rule.playerRadius) {
            p.slowUntil = this.combatTick + ticks(0.1);
            if (this.combatTick % HZ === 0) this.damage(p, f.potency);
          }
    }
  }
  private removeShot(s: Shot) {
    if (!this.shots.delete(s.id)) return;
    if (s.owner === 'hostile') this.hostileShots--;
    this.removals.push(s.id);
    this.freeShots.push(s);
  }
  private clearShots() {
    for (const s of this.shots.values()) this.removeShot(s);
  }
  private stepShots() {
    for (const s of this.shots.values()) {
      const old = { x: s.x, y: s.y },
        next = { x: s.x + s.vx * DT, y: s.y + s.vy * DT };
      let wall = 1;
      for (const rect of arena.obstacles) {
        const hit = segmentRect(old, next, rect, s.radius);
        if (hit) wall = Math.min(wall, hit.t);
      }
      let player: Player | undefined,
        hitTime = wall,
        bossHit = false;
      if (s.owner === 'hostile')
        for (const p of this.grid.query(old, next, s.radius + rule.playerRadius)) {
          if (p.status !== 'active') continue;
          const t = segmentCircle(
            { x: old.x - p.oldX, y: old.y - p.oldY },
            { x: next.x - p.x, y: next.y - p.y },
            { x: 0, y: 0 },
            s.radius + rule.playerRadius,
          );
          if (t !== null && t < hitTime) {
            player = p;
            hitTime = t;
          }
        }
      else {
        const t = segmentCircle(old, next, this.boss, constable.radius + s.radius);
        if (t !== null && t < hitTime) {
          hitTime = t;
          bossHit = true;
        }
      }
      s.x = next.x;
      s.y = next.y;
      if (player) this.damage(player, s.damage);
      else if (bossHit) this.hitBoss(this.players.get(s.owner), s.damage);
      if (
        player ||
        bossHit ||
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
  private revive(p: Player, fraction: number) {
    p.status = 'active';
    p.health = p.maxHealth * fraction;
    p.reviveProgress = 0;
    p.downUntil = 0;
    p.invulnerableUntil = this.combatTick + ticks(1);
    this.events.push({ type: 'sound', id: 'revive', x: p.x, y: p.y });
  }
  private stepRevives() {
    for (const p of this.roster()) {
      if (p.status === 'downed' && this.roster().length === 1 && p.selfRevives > 0) {
        p.reviveProgress = p.input.interact ? p.reviveProgress + 1 : 0;
        if (p.reviveProgress >= ticks(2)) {
          p.selfRevives--;
          this.revive(p, 0.5);
        }
        continue;
      }
      if (p.status !== 'active') continue;
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
        this.revive(target, 0.5);
        p.reviveTarget = '';
        p.reviveProgress = 0;
      }
    }
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
  // Snapshot is for first-playable rendering and boundary saves, never a trusted online combat result.
  snapshot() {
    return {
      tick: this.tick,
      combatTick: this.combatTick,
      phase: this.phase,
      phaseEnds: this.phaseEnds,
      encounter: this.encounter,
      boss: { ...this.boss },
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
    };
  }
}
