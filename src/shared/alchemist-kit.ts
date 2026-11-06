import rules from "./alchemy-rules.json";
import { clamp, distance, segmentRect, type Rect } from "./geometry.ts";
import type { Vec } from "./protocol.ts";
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
    "alchemy-brew" | "alchemy-flask" | "alchemy-pool" | "alchemy-combination";
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
};
type Vial = { recipe: Recipe; potency: number; radiusBonus: number };
type Brewing = { id: number; vial: Vial; at: number; until: number };
type Stock = {
  selectAt: number;
  selected: Recipe;
  stock: Record<Reagent, number>;
  vials: Vial[];
  brewing?: Brewing;
  primaryAt: number;
  recoverAt: number;
  recoveryCursor: number;
  batchUntil: number;
  batchCharges: number;
  batchPotency: number;
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
});
/** Combat-only fictional recipe stock. Game owns collision, useful credit and real healing. */
export class AlchemistKit {
  private stocks = new Map<string, Stock>();
  private flights: Flight[] = [];
  private pools: Pool[] = [];
  private combinations: AlchemyCue[] = [];
  private refunded = new Set<number>();
  clear() {
    this.stocks.clear();
    this.flights = [];
    this.pools = [];
    this.combinations = [];
    this.refunded.clear();
  }
  removeOwner(owner: string) {
    this.stocks.delete(owner);
    this.flights = this.flights.filter((f) => f.owner !== owner);
    this.pools = this.pools.filter((f) => f.owner !== owner);
    this.combinations = this.combinations.filter((f) => f.owner !== owner);
    this.pruneRefunds();
  }
  private pruneRefunds() {
    const active = new Set(this.flights.map((f) => f.refundGroup));
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
    if (!center) return [];
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
        s.vials.length < capacity &&
        reagents.every((r) => s.stock[r] >= rules.recipes[s.selected].cost[r])
      );
    }
    if (slot === "e") {
      const points = this.points(p, c, o);
      return (
        s.vials.length > 0 &&
        points.length > 0 &&
        this.flights.filter((f) => f.owner === p.id).length + points.length <=
          rules.maximumOwnerFlights
      );
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
    const vial = s.vials.shift()!,
      points = this.points(p, c, o),
      group = c.id(),
      empowered = c.tick < s.batchUntil && s.batchCharges > 0;
    if (empowered) s.batchCharges--;
    const potency =
      vial.potency *
      (empowered ? rules.ultimateDamageMultiplier * (1 + s.batchPotency) : 1) *
      (o.talents.splitPour ? rules.splitMultiplier : 1);
    const radius =
      rules.recipes[vial.recipe].radius *
      (1 + vial.radiusBonus) *
      (empowered ? rules.ultimateRadiusMultiplier : 1) *
      (o.talents.splitPour ? rules.splitRadiusMultiplier : 1);
    for (const point of points)
      this.flights.push({
        id: c.id(),
        owner: p.id,
        recipe: vial.recipe,
        from: { x: p.x, y: p.y },
        point,
        at: c.tick,
        until: c.tick + rules.flightTicks,
        radius,
        potency,
        empowered,
        refundGroup: group,
        refund: o.talents.secondExtraction,
      });
    c.sound("alchemy-throw", p);
    return true;
  }
  private land(p: AlchemyOwner, f: Flight, c: AlchemyContext) {
    if (!this.legal(f.point, c)) return;
    let bonus = 0;
    const consumed = this.pools
      .filter(
        (pool) =>
          pool.owner === p.id &&
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
    const recipe = rules.recipes[f.recipe],
      actual = c.area({
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
    if (
      f.refund &&
      !this.refunded.has(f.refundGroup) &&
      (actual.damage > 0 || actual.healing > 0)
    ) {
      const cost = recipe.cost,
        reagent = reagents.find((r) => cost[r] > 0)!;
      const s = this.stock(p.id, c.tick);
      s.stock[reagent] = Math.min(rules.maximumReagent, s.stock[reagent] + 1);
      this.refunded.add(f.refundGroup);
    }
    if (f.recipe !== "mending") {
      const own = this.pools.filter((pool) => pool.owner === p.id);
      if (own.length >= rules.maximumOwnerFields) {
        const oldest = own.toSorted((a, b) => a.id - b.id)[0];
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
      if (s.brewing) {
        if (c.tick < p.dashUntil) s.brewing = undefined;
        else if (c.tick >= s.brewing.until) {
          s.vials.push(s.brewing.vial);
          s.brewing = undefined;
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
