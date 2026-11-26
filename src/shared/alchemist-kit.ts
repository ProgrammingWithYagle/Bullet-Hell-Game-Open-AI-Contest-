import rules from "./alchemy-rules.json";
import { clamp, distance, segmentCircle, segmentRect, type Rect } from "./geometry.ts";
import type { Vec } from "./protocol.ts";
import { RestorativeGround, dressingRadius, dressingRules, type AlchemyDressingStatus, type RestorativeFitting } from "./alchemist-restorative.ts";
import { compoundRules, type AlchemyReserveStatus, type CompoundFitting } from "./alchemist-prepared.ts";
import { reactiveRules, type AlchemyReactionStatus, type ReactiveFitting } from "./alchemist-reactive.ts";
export const reagents = ["cinder", "chalk", "sap"] as const;
export type Reagent = (typeof reagents)[number];
export const recipes = ["flare", "binding", "mending"] as const;
export type Recipe = (typeof recipes)[number];
export type AlchemyOwner = Vec & {
  id: string;
  classId: string;
  aim: number;
  connected: boolean;
  status: string;
  dashUntil: number;
};
export type AlchemyOptions = {
  potency: number;
  radiusBonus: number;
  ultimateDurationBonus: number;
  ultimateCharges: number;
  ultimatePotency: number;
  talents: {
    splitPour: boolean;
    settledBatch: boolean;
    secondExtraction: boolean;
  };
};
export const baseAlchemyOptions = (): AlchemyOptions => ({
  potency: 1,
  radiusBonus: 0,
  ultimateDurationBonus: 0,
  ultimateCharges: 0,
  ultimatePotency: 0,
  talents: { splitPour: false, settledBatch: false, secondExtraction: false },
});
export type AlchemyArea = {
  recipient?: string;
  owner: string;
  recipe: Recipe;
  x: number;
  y: number;
  radius: number;
  damage: number;
  healing: number;
  slowTicks: number;
  slowMultiplier: number;
  training: boolean;
  origin: Vec;
};
export type AlchemyContext = {
  aimPoint?(owner: string): Vec | undefined;
  needsHealing?(id: string): boolean;
  dressingGround?(point: Vec): boolean;
  tick: number;
  combat: boolean;
  paused: boolean;
  owners: readonly AlchemyOwner[];
  bounds: Rect;
  obstacles: readonly Rect[];
  id(): number;
  area(effect: AlchemyArea): { damage: number; healing: number };
  sound(id: string, owner: AlchemyOwner): void;
};
export type AlchemyCue = {
  kind:
    "alchemy-brew" | "alchemy-flask" | "alchemy-pool" | "alchemy-combination" | "alchemy-dressing";
  id: number;
  owner: string;
  recipe: Recipe;
  x: number;
  y: number;
  x2: number;
  y2: number;
  radius: number;
  at: number;
  until: number;
  empowered: boolean;
  uses?: number;
};
type Vial = { recipe: Recipe; potency: number; radiusBonus: number };
type Brewing = { id: number; vial: Vial; at: number; until: number };
type Reserve = { vial: Vial; fitting: CompoundFitting; readyAt: number; until: number };
type Stock = {
  selectAt: number;
  selected: Recipe;
  stock: Record<Reagent, number>;
  vials: Vial[];
  brewing?: Brewing;
  reserve?: Reserve;
  primaryAt: number;
  recoverAt: number;
  recoveryCursor: number;
  batchUntil: number;
  batchCharges: number;
  batchPotency: number;
  reactionUsed: boolean;
};
type Flight = {
  id: number;
  owner: string;
  recipe: Recipe;
  from: Vec;
  point: Vec;
  at: number;
  until: number;
  radius: number;
  potency: number;
  empowered: boolean;
  refundGroup: number;
  refund: boolean;
  reaction?: { poolId: number; preserve: boolean };
  dressing?: RestorativeFitting;
};
type Pool = {
  id: number;
  owner: string;
  recipe: "flare" | "binding";
  x: number;
  y: number;
  radius: number;
  potency: number;
  at: number;
  until: number;
  pulseAt: number;
  empowered: boolean;
};
type ReactionPlan =
  | { stage: Exclude<AlchemyReactionStatus['stage'], 'ready'> }
  | { stage: 'ready'; stock: Stock; pool: Pool; points: Vec[]; duration: number };
type DressingPlan =
  | { stage: Exclude<AlchemyDressingStatus['stage'], 'ready'> }
  | { stage: 'ready'; stock: Stock; points: Vec[]; radius: number };
const live = (p: AlchemyOwner | undefined): p is AlchemyOwner =>
  !!p && p.classId === "alchemist" && p.connected && p.status === "active";
const control = (p: AlchemyOwner, c: AlchemyContext) =>
  live(p) &&
  c.combat &&
  !c.paused &&
  c.owners.some((o) => o.id === p.id && live(o));
const finite = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? clamp(v, min, max) : min;
const fresh = (now: number): Stock => ({
  selectAt: 0,
  selected: "flare",
  stock: {
    cinder: rules.initialReagent,
    chalk: rules.initialReagent,
    sap: rules.initialReagent,
  },
  vials: [],
  primaryAt: -Infinity,
  recoverAt: now + rules.passiveRecoveryTicks,
  recoveryCursor: 0,
  batchUntil: 0,
  batchCharges: 0,
  batchPotency: 0,
  reactionUsed: false,
});
/** Combat-only fictional recipe stock. Game owns collision, useful credit and real healing. */
export class AlchemistKit {
  private stocks = new Map<string, Stock>();
  private flights: Flight[] = [];
  private pools: Pool[] = [];
  private combinations: AlchemyCue[] = [];
  private refunded = new Set<number>();
  private restorative = new RestorativeGround();
  clear() {
    this.stocks.clear();
    this.flights = [];
    this.pools = [];
    this.combinations = [];
    this.refunded.clear();
    this.restorative.clear();
  }
  removeOwner(owner: string) {
    this.stocks.delete(owner);
    this.restorative.removeOwner(owner);
    this.flights = this.flights.filter((f) => f.owner !== owner);
    this.pools = this.pools.filter((f) => f.owner !== owner);
    this.combinations = this.combinations.filter((f) => f.owner !== owner);
    this.pruneRefunds();
  }
  private pruneRefunds() {
    const active = new Set([...this.flights.map(f => f.refundGroup), ...this.restorative.refundGroups()]);
    for (const group of this.refunded)
      if (!active.has(group)) this.refunded.delete(group);
  }
  private stock(owner: string, now: number) {
    let s = this.stocks.get(owner);
    if (!s) {
      s = fresh(now);
      this.stocks.set(owner, s);
    }
    return s;
  }
  status(owner: string, now: number, o = baseAlchemyOptions()) {
    const s = this.stocks.get(owner) ?? fresh(now);
    return {
      alchemyRecipe: s.selected,
      alchemyCinder: s.stock.cinder,
      alchemyChalk: s.stock.chalk,
      alchemySap: s.stock.sap,
      alchemyPrepared: s.vials.map((v) => v.recipe),
      alchemyCapacity: o.talents.settledBatch
        ? rules.maximumPreparedCapacity
        : rules.preparedCapacity,
      alchemyBrewUntil: s.brewing?.until ?? 0,
      alchemyBrewRecipe: s.brewing?.vial.recipe ?? "",
      alchemyBrewMovement: this.movement(owner, now),
      alchemyBatchUntil: s.batchUntil > now ? s.batchUntil : 0,
      alchemyBatchCharges: s.batchUntil > now ? s.batchCharges : 0,
    };
  }
  select(p: AlchemyOwner, recipe: unknown, c: AlchemyContext) {
    if (
      !control(p, c) ||
      typeof recipe !== "string" ||
      !recipes.includes(recipe as Recipe)
    )
      return false;
    const s = this.stock(p.id, c.tick);
    if (c.tick < s.selectAt || s.selected === recipe) return false;
    s.selected = recipe as Recipe;
    s.selectAt = c.tick + rules.recipeChoiceIntervalTicks;
    return true;
  }
  private recover(s: Stock) {
    const candidates = reagents
      .map((r, i) => ({
        r,
        i,
        amount: s.stock[r],
        order: (i - s.recoveryCursor + reagents.length) % reagents.length,
      }))
      .filter((v) => v.amount < rules.maximumReagent)
      .sort((a, b) => a.amount - b.amount || a.order - b.order);
    if (!candidates.length) return false;
    const next = candidates[0];
    s.stock[next.r]++;
    s.recoveryCursor = (next.i + 1) % reagents.length;
    return true;
  }
  primaryHit(p: AlchemyOwner | undefined, actual: number, c: AlchemyContext) {
    if (!p || !control(p, c) || !Number.isFinite(actual) || actual <= 0)
      return false;
    const s = this.stock(p.id, c.tick);
    if (c.tick < s.primaryAt + rules.primaryRecoveryTicks) return false;
    if (!this.recover(s)) return false;
    s.primaryAt = c.tick;
    return true;
  }
  movement(owner: string, now: number) {
    const b = this.stocks.get(owner)?.brewing;
    return b && now < b.until ? rules.brewMovement : 1;
  }
  canPrimary(p: AlchemyOwner, c: AlchemyContext) {
    return (
      control(p, c) && c.tick >= p.dashUntil && !this.stocks.get(p.id)?.brewing
    );
  }
  private legal(point: Vec, c: AlchemyContext) {
    return (
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= c.bounds.x + 8 &&
      point.x <= c.bounds.x + c.bounds.width - 8 &&
      point.y >= c.bounds.y + 8 &&
      point.y <= c.bounds.y + c.bounds.height - 8 &&
      !c.obstacles.some((w) => segmentRect(point, point, w, 8))
    );
  }
  private landing(p: AlchemyOwner, c: AlchemyContext) {
    const wanted = c.aimPoint?.(p.id),
      chosen =
        wanted && Number.isFinite(wanted.x) && Number.isFinite(wanted.y)
          ? wanted
          : undefined;
    const reach = chosen
      ? Math.min(rules.flaskRange, distance(p, chosen))
      : rules.flaskRange;
    const aim =
      chosen && reach > 0 ? Math.atan2(chosen.y - p.y, chosen.x - p.x) : p.aim;
    // Deliberately selected close/self placement is legal; a blocked long toss
    // must not silently turn into an unwanted splash at the owner's feet.
    const minimum = Math.min(rules.minimumThrowDistance, reach);
    for (let d = reach; d >= minimum; d -= 8) {
      const point = {
        x: p.x + Math.cos(aim) * d,
        y: p.y + Math.sin(aim) * d,
      };
      if (
        this.legal(point, c) &&
        !c.obstacles.some((w) => segmentRect(p, point, w, 8))
      )
        return point;
    }
  }
  private points(p: AlchemyOwner, c: AlchemyContext, o: AlchemyOptions) {
    const center = this.landing(p, c);
    return center ? this.pointsAt(p, center, c, o) : [];
  }
  private pointsAt(p: AlchemyOwner, center: Vec, c: AlchemyContext, o: AlchemyOptions) {
    if (!o.talents.splitPour) return [center];
    const aim =
      distance(p, center) > 0
        ? Math.atan2(center.y - p.y, center.x - p.x)
        : p.aim;
    return [-1, 1]
      .map((n) => ({
        x: center.x - Math.sin(aim) * rules.splitOffset * n,
        y: center.y + Math.cos(aim) * rules.splitOffset * n,
      }))
      .filter(
        (point) =>
          this.legal(point, c) &&
          !c.obstacles.some((w) => segmentRect(p, point, w, 8)),
      );
  }
  private held(s: Stock | undefined, tick: number) {
    return s?.reserve && s.reserve.until > tick ? s.reserve : undefined;
  }
  private release(s: Stock, reserve: Reserve) {
    s.vials.unshift(reserve.vial);
    s.reserve = undefined;
  }
  private openLatch(s: Stock, recipe: Recipe, fitting: 'brew' | 'toss', tick: number) {
    const reserve = this.held(s, tick);
    if (reserve?.fitting === fitting && reserve.vial.recipe !== recipe) this.release(s, reserve);
  }
  reserveStatus(p: AlchemyOwner, c: AlchemyContext, fitting: CompoundFitting): AlchemyReserveStatus {
    const s = this.stocks.get(p.id), reserve = this.held(s, c.tick);
    const held = reserve && { recipe: reserve.vial.recipe, readyAt: reserve.readyAt, until: reserve.until };
    if (!this.canPrimary(p, c)) return { fitting, stage: 'busy', held };
    if (!reserve) return { fitting, stage: s?.vials.length ? 'stow' : 'empty' };
    if (reserve.fitting !== 'standard') return { fitting, stage: reserve.fitting, held };
    return { fitting, stage: c.tick < reserve.readyAt ? 'latched' : 'return', held };
  }
  reserve(p: AlchemyOwner, c: AlchemyContext, fitting: CompoundFitting) {
    if (!this.canPrimary(p, c)) return false;
    const s = this.stocks.get(p.id);
    if (!s) return false;
    const held = this.held(s, c.tick);
    if (held) {
      if (held.fitting !== 'standard' || c.tick < held.readyAt) return false;
      this.release(s, held);
      return true;
    }
    const vial = s.vials.shift();
    if (!vial) return false;
    s.reserve = { vial, fitting, readyAt:c.tick + compoundRules.settleTicks, until:c.tick + compoundRules.holdingTicks };
    return true;
  }
  private dressingPlan(p: AlchemyOwner, eAt: number, c: AlchemyContext, o: AlchemyOptions, fitting: RestorativeFitting): DressingPlan {
    if (!this.canPrimary(p, c)) return { stage: 'busy' };
    if (this.restorative.active(p.id, c.tick) || this.flights.some(f => f.owner === p.id && f.dressing)) return { stage: 'placed' };
    if (c.tick < eAt) return { stage: 'recovering' };
    const stock = this.stocks.get(p.id), vial = stock?.vials[0];
    if (!stock || vial?.recipe !== 'mending') return { stage: 'prepare' };
    const reach = o.talents.splitPour ? Math.sqrt(dressingRules.range ** 2 - rules.splitOffset ** 2) : dressingRules.range;
    const target = { x:p.x + Math.cos(p.aim) * reach, y:p.y + Math.sin(p.aim) * reach };
    const points = this.points(p, { ...c, aimPoint:() => target }, o).filter(point => c.dressingGround?.(point) !== false);
    if (!points.length) return { stage: 'aim' };
    if (!this.hasFlightRoom(p.id, points.length)) return { stage: 'busy' };
    return { stage:'ready', stock, points, radius:dressingRadius(this.flaskRadius(vial, o, this.empowered(stock, c.tick)), fitting) };
  }
  dressingStatus(p: AlchemyOwner, eAt: number, c: AlchemyContext, o: AlchemyOptions, fitting: RestorativeFitting): AlchemyDressingStatus {
    const plan = this.dressingPlan(p, eAt, c, o, fitting);
    if (plan.stage !== 'ready') return { fitting, stage:plan.stage };
    return { fitting, stage:plan.stage, targets:plan.points.map(point => ({ ...point, radius:plan.radius })) };
  }
  dress(p: AlchemyOwner, eAt: number, c: AlchemyContext, o: AlchemyOptions, fitting: RestorativeFitting) {
    const plan = this.dressingPlan(p, eAt, c, o, fitting);
    if (plan.stage !== 'ready') return false;
    plan.stock.reactionUsed = true;
    this.launchFlask(p, plan.stock, plan.points, c, o, rules.flightTicks, undefined, fitting);
    return true;
  }
  private hasFlightRoom(owner: string, count: number) {
    return count > 0 && this.flights.filter(f => f.owner === owner).length + count <= rules.maximumOwnerFlights;
  }
  private reactionPlan(p: AlchemyOwner, eAt: number, c: AlchemyContext, o: AlchemyOptions, fitting: ReactiveFitting): ReactionPlan {
    if (!this.canPrimary(p, c)) return { stage: "busy" };
    if (c.tick >= eAt) return { stage: "normal" };
    const stock = this.stocks.get(p.id);
    if (stock?.reactionUsed) return { stage: "spent" };
    if (stock?.vials[0]?.recipe !== "flare") return { stage: "prepare" };
    if (stock.stock.chalk < reactiveRules.chalk) return { stage: "chalk" };
    const reach = fitting === "wick" ? reactiveRules.wickRange : rules.flaskRange;
    const duration = fitting === "wick" ? reactiveRules.wickFlightTicks : rules.flightTicks;
    const endpoint = { x: p.x + Math.cos(p.aim) * reach, y: p.y + Math.sin(p.aim) * reach };
    let target: { pool: Pool; contact: number; points: Vec[] } | undefined;
    for (const pool of this.pools) {
      if (pool.owner !== p.id || pool.recipe !== "binding" || c.tick + duration >= pool.until ||
          distance(p, pool) > reach || !this.legal(pool, c) || c.obstacles.some(w => segmentRect(p, pool, w, 8) !== null)) continue;
      const contact = segmentCircle(p, endpoint, pool, pool.radius);
      if (contact === null || target && (contact > target.contact || contact === target.contact && pool.id >= target.pool.id)) continue;
      const points = this.pointsAt(p, { x: pool.x, y: pool.y }, c, o);
      if (!points.some(point => distance(point, pool) <= pool.radius)) continue;
      target = { pool, contact, points };
    }
    if (!target) return { stage: "aim" };
    if (!this.hasFlightRoom(p.id, target.points.length)) return { stage: "busy" };
    return { stage: "ready", stock, pool: target.pool, points: target.points, duration };
  }
  reactionStatus(p: AlchemyOwner, eAt: number, c: AlchemyContext, o: AlchemyOptions, fitting: ReactiveFitting): AlchemyReactionStatus {
    const plan = this.reactionPlan(p, eAt, c, o, fitting);
    if (plan.stage !== "ready") return { fitting, stage: plan.stage };
    const { x, y, radius } = plan.pool;
    return { fitting, stage: "ready", target: { x, y, radius } };
  }
  react(p: AlchemyOwner, eAt: number, c: AlchemyContext, o: AlchemyOptions, fitting: ReactiveFitting) {
    const plan = this.reactionPlan(p, eAt, c, o, fitting);
    if (plan.stage !== "ready") return false;
    plan.stock.stock.chalk -= reactiveRules.chalk;
    plan.stock.reactionUsed = true;
    this.launchFlask(p, plan.stock, plan.points, c, o, plan.duration, { poolId: plan.pool.id, preserve: fitting === "vent" });
    return true;
  }
  canCast(
    p: AlchemyOwner,
    slot: "q" | "e" | "ultimate",
    c: AlchemyContext,
    o = baseAlchemyOptions(),
  ) {
    if (!this.canPrimary(p, c)) return false;
    const s = this.stocks.get(p.id) ?? fresh(c.tick);
    if (slot === "q") {
      const capacity = o.talents.settledBatch
        ? rules.maximumPreparedCapacity
        : rules.preparedCapacity;
      return (
        s.vials.length + Number(!!this.held(s, c.tick)) < capacity &&
        reagents.every((r) => s.stock[r] >= rules.recipes[s.selected].cost[r])
      );
    }
    if (slot === "e") {
      const points = this.points(p, c, o);
      return s.vials.length > 0 && this.hasFlightRoom(p.id, points.length);
    }
    return true;
  }
  cast(
    p: AlchemyOwner,
    slot: "q" | "e" | "ultimate",
    c: AlchemyContext,
    o = baseAlchemyOptions(),
  ) {
    if (!this.canCast(p, slot, c, o)) return false;
    const s = this.stock(p.id, c.tick);
    if (slot === "q") {
      const recipe = s.selected;
      for (const r of reagents) s.stock[r] -= rules.recipes[recipe].cost[r];
      s.brewing = {
        id: c.id(),
        vial: {
          recipe,
          potency:
            finite(o.potency, 0.5, 3) * (o.talents.settledBatch ? 1.25 : 1),
          radiusBonus: finite(o.radiusBonus, 0, 0.5),
        },
        at: c.tick,
        until:
          c.tick +
          (o.talents.settledBatch ? rules.settledBrewTicks : rules.brewTicks),
      };
      c.sound("alchemy-brew", p);
      return true;
    }
    if (slot === "ultimate") {
      s.batchUntil =
        c.tick +
        rules.ultimateTicks +
        Math.floor(finite(o.ultimateDurationBonus, 0, 240));
      s.batchCharges =
        rules.ultimateCharges + Math.floor(finite(o.ultimateCharges, 0, 2));
      s.batchPotency = finite(o.ultimatePotency, 0, 2);
      for (const r of reagents)
        s.stock[r] = Math.min(rules.maximumReagent, s.stock[r] + 1);
      c.sound("alchemy-batch", p);
      return true;
    }
    s.reactionUsed = false;
    const recipe = this.launchFlask(p, s, this.points(p, c, o), c, o);
    this.openLatch(s, recipe, 'toss', c.tick);
    return true;
  }
  private empowered(s: Stock, tick: number) { return tick < s.batchUntil && s.batchCharges > 0; }
  private flaskRadius(vial: Vial, o: AlchemyOptions, empowered: boolean) {
    return rules.recipes[vial.recipe].radius * (1 + vial.radiusBonus) *
      (empowered ? rules.ultimateRadiusMultiplier : 1) *
      (o.talents.splitPour ? rules.splitRadiusMultiplier : 1);
  }
  private launchFlask(p: AlchemyOwner, s: Stock, points: readonly Vec[], c: AlchemyContext, o: AlchemyOptions,
    duration: number = rules.flightTicks, reaction?: Flight["reaction"], dressing?: RestorativeFitting) {
    const vial = s.vials.shift()!,
      group = c.id(),
      empowered = this.empowered(s, c.tick);
    if (empowered) s.batchCharges--;
    const potency =
      vial.potency *
      (empowered ? rules.ultimateDamageMultiplier * (1 + s.batchPotency) : 1) *
      (o.talents.splitPour ? rules.splitMultiplier : 1);
    const radius = this.flaskRadius(vial, o, empowered);
    for (const point of points)
      this.flights.push({
        id: c.id(),
        owner: p.id,
        recipe: vial.recipe,
        from: { x: p.x, y: p.y },
        point,
        at: c.tick,
        until: c.tick + duration,
        radius,
        potency,
        empowered,
        refundGroup: group,
        refund: o.talents.secondExtraction,
        reaction,
        dressing,
      });
    c.sound("alchemy-throw", p);
    return vial.recipe;
  }
  private land(p: AlchemyOwner, f: Flight, c: AlchemyContext) {
    if (!this.legal(f.point, c) || (f.reaction || f.dressing) && c.obstacles.some(w => segmentRect(f.from, f.point, w, 8) !== null)) return;
    if (f.dressing && c.dressingGround?.(f.point) === false) return;
    let bonus = 0;
    const consumed = f.reaction?.preserve ? undefined : this.pools
      .filter(
        (pool) =>
          pool.owner === p.id &&
          (!f.reaction || f.reaction.poolId === pool.id) &&
          c.tick < pool.until &&
          distance(pool, f.point) <= pool.radius &&
          ((f.recipe === "flare" && pool.recipe === "binding") ||
            (f.recipe === "mending" && pool.recipe === "flare")),
      )
      .sort((a, b) => a.id - b.id)[0];
    if (consumed) {
      this.pools = this.pools.filter((pool) => pool !== consumed);
      bonus = f.recipe === "flare" ? rules.comboDamage * f.potency : 0;
      this.combinations.push({
        kind: "alchemy-combination",
        id: c.id(),
        owner: p.id,
        recipe: f.recipe,
        x: f.point.x,
        y: f.point.y,
        x2: f.point.x,
        y2: f.point.y,
        radius: f.radius,
        at: c.tick,
        until: c.tick + 9,
        empowered: f.empowered,
      });
      c.sound(f.recipe === "flare" ? "alchemy-react" : "alchemy-quench", p);
    }
    const recipe = rules.recipes[f.recipe];
    if (f.dressing) {
      this.restorative.place(f, c.tick, f.dressing, recipe.healing);
      c.sound("alchemy-impact", p);
      return;
    }
    const actual = c.area({
        owner: p.id,
        recipe: f.recipe,
        ...f.point,
        radius: f.radius,
        damage: recipe.damage * f.potency + bonus,
        healing: recipe.healing * f.potency,
        slowTicks: recipe.slowTicks,
        slowMultiplier: recipe.slowMultiplier,
        training: true,
        origin: f.point,
      });
    if (f.refund && (actual.damage > 0 || actual.healing > 0)) this.refund(p, f.recipe, f.refundGroup, c.tick);
    if (f.recipe !== "mending") {
      const own = this.pools.filter((pool) => pool.owner === p.id);
      if (own.length >= rules.maximumOwnerFields) {
        const protectedId = f.reaction?.preserve ? f.reaction.poolId : undefined;
        const eligible = protectedId === undefined ? own : own.filter(pool => pool.id !== protectedId);
        const oldest = eligible.toSorted((a, b) => a.id - b.id)[0];
        this.pools = this.pools.filter((pool) => pool !== oldest);
      }
      this.pools.push({
        id: c.id(),
        owner: p.id,
        recipe: f.recipe,
        ...f.point,
        radius: f.radius,
        potency: f.potency,
        at: c.tick,
        until: c.tick + rules.fieldTicks,
        pulseAt: c.tick + rules.fieldPulseTicks,
        empowered: f.empowered,
      });
    }
    c.sound("alchemy-impact", p);
  }
  private refund(owner: AlchemyOwner, recipe: Recipe, group: number, tick: number) {
    if (this.refunded.has(group)) return;
    const reagent = reagents.find(key => rules.recipes[recipe].cost[key] > 0)!;
    const stock = this.stock(owner.id, tick);
    stock.stock[reagent] = Math.min(rules.maximumReagent, stock.stock[reagent] + 1);
    this.refunded.add(group);
  }
  step(c: AlchemyContext) {
    if (!c.combat) {
      this.clear();
      return;
    }
    if (c.paused) return;
    const owners = new Map(c.owners.filter(live).map((p) => [p.id, p]));
    for (const owner of this.stocks.keys())
      if (!owners.has(owner)) this.removeOwner(owner);
    for (const p of owners.values()) {
      const s = this.stock(p.id, c.tick);
      if (s.reserve && !this.held(s, c.tick)) s.reserve = undefined;
      if (s.brewing) {
        if (c.tick < p.dashUntil) s.brewing = undefined;
        else if (c.tick >= s.brewing.until) {
          const vial = s.brewing.vial;
          s.vials.push(vial);
          s.brewing = undefined;
          this.openLatch(s, vial.recipe, 'brew', c.tick);
          c.sound("alchemy-ready", p);
        }
      }
      if (c.tick >= s.recoverAt) {
        this.recover(s);
        s.recoverAt = c.tick + rules.passiveRecoveryTicks;
      }
    }
    const due = this.flights.filter((f) => c.tick >= f.until);
    this.flights = this.flights.filter(
      (f) => c.tick < f.until && owners.has(f.owner),
    );
    for (const f of due) {
      const p = owners.get(f.owner);
      if (p) this.land(p, f, c);
    }
    this.restorative.step(c, owners, (owner, group, refund) => {
      if (refund) this.refund(owner, 'mending', group, c.tick);
    });
    this.pruneRefunds();
    for (const pool of this.pools) {
      const p = owners.get(pool.owner);
      if (!p || c.tick >= pool.until || c.tick < pool.pulseAt) continue;
      pool.pulseAt = c.tick + rules.fieldPulseTicks;
      c.area({
        owner: p.id,
        recipe: pool.recipe,
        x: pool.x,
        y: pool.y,
        radius: pool.radius,
        damage: rules.recipes[pool.recipe].pulseDamage * pool.potency,
        healing: 0,
        slowTicks: pool.recipe === "binding" ? rules.fieldPulseTicks + 1 : 0,
        slowMultiplier: rules.recipes[pool.recipe].slowMultiplier,
        training: false,
        origin: pool,
      });
    }
    this.pools = this.pools.filter(
      (pool) => owners.has(pool.owner) && c.tick < pool.until,
    );
    this.combinations = this.combinations.filter(
      (cue) => owners.has(cue.owner) && c.tick < cue.until,
    );
  }
  cues(c: AlchemyContext): AlchemyCue[] {
    const owners = new Map(c.owners.filter(live).map((p) => [p.id, p]));
    return [
      ...this.restorative.cues(owners, c.tick),
      ...[...this.stocks].flatMap(([owner, s]) => {
        const p = owners.get(owner),
          b = s.brewing;
        return p && b
          ? [
              {
                kind: "alchemy-brew" as const,
                id: b.id,
                owner,
                recipe: b.vial.recipe,
                x: p.x,
                y: p.y,
                x2: p.x,
                y2: p.y,
                radius: 14,
                at: b.at,
                until: b.until,
                empowered: false,
              },
            ]
          : [];
      }),
      ...this.flights
        .filter((f) => owners.has(f.owner))
        .map((f) => ({
          kind: "alchemy-flask" as const,
          id: f.id,
          owner: f.owner,
          recipe: f.recipe,
          x: f.from.x,
          y: f.from.y,
          x2: f.point.x,
          y2: f.point.y,
          radius: f.radius,
          at: f.at,
          until: f.until,
          empowered: f.empowered,
        })),
      ...this.pools
        .filter((f) => owners.has(f.owner))
        .map((f) => ({
          kind: "alchemy-pool" as const,
          id: f.id,
          owner: f.owner,
          recipe: f.recipe,
          x: f.x,
          y: f.y,
          x2: f.x,
          y2: f.y,
          radius: f.radius,
          at: f.at,
          until: f.until,
          empowered: f.empowered,
        })),
      ...this.combinations.map((cue) => ({ ...cue })),
    ];
  }
}
