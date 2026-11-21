import rules from "./summoner-rules.json";
import { DT, type Vec } from "./protocol.ts";
import {
  clamp,
  distance,
  moveBody,
  segmentRect,
  type Rect,
} from "./geometry.ts";
import { RatNavigator } from "./rat-navigation.ts";

export const retinueOrders = ["escort", "hold", "focus"] as const;
export type RetinueOrder = (typeof retinueOrders)[number];
export const validRetinueOrder = (value: unknown): value is RetinueOrder =>
  typeof value === "string" &&
  (retinueOrders as readonly string[]).includes(value);
export type SummonKind = keyof typeof rules.kinds;
export type SummonerOwner = Vec & {
  id: string;
  classId: string;
  aim: number;
  health: number;
  status: string;
  connected: boolean;
};
export type SummonTarget = Vec & {
  key: string;
  kind: "boss" | "weak" | "ordinary";
  radius: number;
  health: number;
};
export type SummonEntity = Vec & {
  id: number;
  owner: string;
  kind: SummonKind;
  slot: number;
  oldX: number;
  oldY: number;
  aim: number;
  actionAim: number;
  health: number;
  maxHealth: number;
  radius: number;
  speed: number;
  damage: number;
  range: number;
  attackInterval: number;
  attackAt: number;
  bornAt: number;
  expires: number;
  temporary: boolean;
  target: string;
  decisionAt: number;
  gatherToken: number;
  gatherHealed: boolean;
  armorUntil: number;
  hurtUntil: number;
  slowUntil: number;
  poisonUntil: number;
  poisonNextAt: number;
  poisonDamage: number;
  poisonInterval: number;
  poisonSlowMultiplier: number;
  action: "idle" | "run" | "attack" | "hurt" | "downed";
  actionAt: number;
};
export type SummonView = Pick<
  SummonEntity,
  | "id"
  | "owner"
  | "kind"
  | "slot"
  | "x"
  | "y"
  | "oldX"
  | "oldY"
  | "aim"
  | "actionAim"
  | "health"
  | "maxHealth"
  | "radius"
  | "bornAt"
  | "expires"
  | "temporary"
  | "action"
  | "actionAt"
  | "slowUntil"
  | "poisonUntil"
>;
export type SummonerTalents = {
  runningPack: boolean;
  closedRanks: boolean;
  patientCompany: boolean;
};
export type SummonerOptions = {
  potency: number;
  healthBonus: number;
  damageBonus: number;
  speedBonus: number;
  attackRateBonus: number;
  reachBonus: number;
  capacityBonus: number;
  ultimateDurationBonus: number;
  ultimateExtraWarders: number;
  ultimatePotencyBonus: number;
  talents: SummonerTalents;
};
export const baseSummonerOptions = (): SummonerOptions => ({
  potency: 1,
  healthBonus: 0,
  damageBonus: 0,
  speedBonus: 0,
  attackRateBonus: 0,
  reachBonus: 0,
  capacityBonus: 0,
  ultimateDurationBonus: 0,
  ultimateExtraWarders: 0,
  ultimatePotencyBonus: 0,
  talents: { runningPack: false, closedRanks: false, patientCompany: false },
});
export type SummonerContext = {
  tick: number;
  combat: boolean;
  paused: boolean;
  owners: readonly SummonerOwner[];
  bounds: Rect;
  obstacles: Rect[];
  navigationObstacles?: Rect[];
  lava: readonly (Vec & { radius: number })[];
  enemies: readonly SummonTarget[];
  target(key: string): SummonTarget | undefined;
  id(): number;
  strike(
    owner: SummonerOwner,
    entity: SummonEntity,
    target: SummonTarget,
    damage: number,
    marked: boolean,
  ): number;
  shoot(
    owner: SummonerOwner,
    entity: SummonEntity,
    target: SummonTarget,
    damage: number,
    speed: number,
  ): void;
  sound(id: string, owner: SummonerOwner): void;
};
type OwnerState = {
  order: RetinueOrder;
  anchor: Vec;
  mark: string;
  markUntil: number;
  orderAt: number;
  gatherUntil: number;
  gatherToken: number;
  gatherHealing: number;
  closedRanks: boolean;
  ultimateUntil: number;
  ultimateMultiplier: number;
};
const live = (p: SummonerOwner | undefined): p is SummonerOwner =>
  Boolean(
    p &&
    p.classId === "summoner" &&
    p.connected &&
    p.status === "active" &&
    p.health > 0,
  );
const controlled = (p: SummonerOwner, c: SummonerContext) =>
  live(p) &&
  c.owners.some((owner) => owner.id === p.id && live(owner)) &&
  c.combat &&
  !c.paused;
const number = (n: number, low: number, high: number) =>
  Number.isFinite(n) ? clamp(n, low, high) : low;
const multiplier = (n: number) => number(n, 0.25, rules.maximumStatMultiplier);
const lineClear = (a: Vec, b: Vec, obstacles: Rect[], radius = 0) =>
  !obstacles.some((rect) => segmentRect(a, b, rect, radius) !== null);

/** Deterministic combat-only entities. Game owns credited damage, transport and safe boundaries. */
export class SummonerKit {
  readonly entities = new Map<number, SummonEntity>();
  private states = new Map<string, OwnerState>();
  private fallen = new Map<number, { view: SummonView; until: number }>();
  private navigators = new Map<number, RatNavigator>();
  private state(p: SummonerOwner) {
    let s = this.states.get(p.id);
    if (!s) {
      s = {
        order: "escort",
        anchor: { x: p.x, y: p.y },
        mark: "",
        markUntil: 0,
        orderAt: 0,
        gatherUntil: 0,
        gatherToken: 0,
        gatherHealing: 0,
        closedRanks: false,
        ultimateUntil: 0,
        ultimateMultiplier: 1,
      };
      this.states.set(p.id, s);
    }
    return s;
  }
  capacity(options: SummonerOptions) {
    return Math.min(
      rules.maximumPermanentCapacity,
      rules.baseCapacity +
        Math.max(0, Math.floor(number(options.capacityBonus, 0, 2))),
    );
  }
  owned(id: string) {
    return [...this.entities.values()].filter(
      (e) => e.owner === id && e.health > 0,
    );
  }
  status(
    p: SummonerOwner,
    now: number,
    options: SummonerOptions = baseSummonerOptions(),
  ) {
    const s = this.states.get(p.id),
      units = this.owned(p.id);
    return {
      retinueCount: units.length,
      retinuePermanent: units.filter((e) => !e.temporary).length,
      retinueCapacity: this.capacity(options),
      retinueOrder: s?.order ?? "escort",
      retinueHoldX: s?.anchor.x ?? p.x,
      retinueHoldY: s?.anchor.y ?? p.y,
      retinueMarkKey: s && now < s.markUntil ? s.mark : "",
      retinueMarkUntil: s && now < s.markUntil ? s.markUntil : 0,
      retinueGatherUntil: s && now < s.gatherUntil ? s.gatherUntil : 0,
      retinueUltimateUntil: s && now < s.ultimateUntil ? s.ultimateUntil : 0,
    };
  }
  marked(owner: string, key: string, now: number) {
    const s = this.states.get(owner);
    return Boolean(s && s.mark === key && now < s.markUntil);
  }
  mark(
    p: SummonerOwner,
    key: string,
    actualDamage: number,
    c: SummonerContext,
  ) {
    const target = c.target(key);
    if (
      !controlled(p, c) ||
      !Number.isFinite(actualDamage) ||
      actualDamage <= 0 ||
      !target ||
      target.health <= 0
    )
      return false;
    const s = this.state(p);
    s.mark = key;
    s.markUntil = c.tick + rules.markTicks;
    if (s.order === "focus")
      for (const e of this.owned(p.id)) {
        e.target = "";
        e.decisionAt = 0;
      }
    return true;
  }
  order(p: SummonerOwner, value: unknown, c: SummonerContext) {
    if (!controlled(p, c) || !validRetinueOrder(value)) return false;
    const s = this.state(p);
    if (c.tick < s.orderAt) return false;
    if (
      value === "focus" &&
      (!this.marked(p.id, s.mark, c.tick) || !c.target(s.mark))
    )
      return false;
    if (value === "hold") {
      const point = this.holdPoint(p, c);
      if (!point) return false;
      s.anchor = point;
    }
    s.order = value;
    s.orderAt = c.tick + rules.orderCooldownTicks;
    for (const e of this.owned(p.id)) {
      e.target = "";
      e.decisionAt = 0;
    }
    return true;
  }
  private legal(point: Vec, radius: number, c: SummonerContext) {
    const b = c.bounds;
    return (
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= b.x + radius &&
      point.x <= b.x + b.width - radius &&
      point.y >= b.y + radius &&
      point.y <= b.y + b.height - radius &&
      lineClear(point, point, c.obstacles, radius) &&
      c.lava.every((p) => distance(point, p) > p.radius + radius)
    );
  }
  private holdPoint(p: SummonerOwner, c: SummonerContext) {
    for (const fraction of [1, 0.75, 0.5, 0.25, 0]) {
      const point = {
        x: p.x + Math.cos(p.aim) * rules.holdDistance * fraction,
        y: p.y + Math.sin(p.aim) * rules.holdDistance * fraction,
      };
      if (this.legal(point, 12, c) && lineClear(p, point, c.obstacles, 12))
        return point;
    }
  }
  private spawnPoint(
    p: SummonerOwner,
    kind: SummonKind,
    slot: number,
    c: SummonerContext,
    reserved: Vec[] = [],
  ) {
    const radius = rules.kinds[kind].radius;
    for (const ring of [32, 50, 68])
      for (let turn = 0; turn < 12; turn++) {
        const angle = p.aim + Math.PI + ((slot * 2 + turn) * Math.PI) / 6,
          point = {
            x: p.x + Math.cos(angle) * ring,
            y: p.y + Math.sin(angle) * ring,
          };
        if (
          this.legal(point, radius, c) &&
          lineClear(p, point, c.obstacles, radius) &&
          reserved.every((other) => distance(point, other) >= radius * 2 + 2) &&
          this.owned(p.id).every(
            (e) => distance(point, e) >= radius + e.radius + 2,
          )
        )
          return point;
      }
  }
  private availableSlots(p: SummonerOwner) {
    const used = new Set(this.owned(p.id).map((e) => e.slot));
    return Array.from(
      { length: rules.maximumOwnerCapacity },
      (_, i) => i,
    ).filter((i) => !used.has(i));
  }
  private plan(
    p: SummonerOwner,
    c: SummonerContext,
    o: SummonerOptions,
    ultimate = false,
  ) {
    if (!controlled(p, c)) return [];
    const own = this.owned(p.id),
      permanent = own.filter((e) => !e.temporary).length,
      room = rules.maximumRoomEntities - this.entities.size;
    const count = Math.min(
      room,
      rules.maximumOwnerCapacity - own.length,
      ultimate
        ? rules.ultimateWarders +
            Math.floor(
              number(
                o.ultimateExtraWarders,
                0,
                rules.maximumUltimateWarders - rules.ultimateWarders,
              ),
            )
        : this.capacity(o) - permanent,
      ultimate ? rules.maximumUltimateWarders : rules.musterCount,
    );
    const slots = this.availableSlots(p),
      result: { kind: SummonKind; slot: number; point: Vec }[] = [];
    for (let i = 0; i < count; i++) {
      const hounds =
          own.filter((e) => !e.temporary && e.kind === "hound").length +
          result.filter((e) => e.kind === "hound").length,
        wings =
          own.filter((e) => !e.temporary && e.kind === "wing").length +
          result.filter((e) => e.kind === "wing").length;
      const kind: SummonKind = ultimate
        ? "ward"
        : o.talents.runningPack
          ? "hound"
          : hounds <= wings
            ? "hound"
            : "wing";
      const point = this.spawnPoint(
        p,
        kind,
        slots[i],
        c,
        result.map((e) => e.point),
      );
      if (point) result.push({ kind, slot: slots[i], point });
    }
    return result;
  }
  canCast(
    p: SummonerOwner,
    slot: "q" | "e" | "ultimate",
    c: SummonerContext,
    o: SummonerOptions,
  ) {
    if (!controlled(p, c)) return false;
    if (
      slot === "ultimate" &&
      c.tick < (this.states.get(p.id)?.ultimateUntil ?? 0)
    )
      return false;
    return slot === "e"
      ? this.owned(p.id).length > 0
      : this.plan(p, c, o, slot === "ultimate").length > 0;
  }
  cast(
    p: SummonerOwner,
    slot: "q" | "e" | "ultimate",
    c: SummonerContext,
    o: SummonerOptions,
  ) {
    if (!this.canCast(p, slot, c, o)) return false;
    const s = this.state(p);
    if (slot === "e") {
      s.gatherUntil = c.tick + rules.gatherTicks;
      s.gatherToken++;
      s.gatherHealing = rules.gatherHealing * multiplier(o.potency);
      s.closedRanks = o.talents.closedRanks;
      for (const e of this.owned(p.id)) {
        e.gatherToken = s.gatherToken;
        e.gatherHealed = false;
        e.target = "";
        e.decisionAt = 0;
      }
      c.sound("summoner-gather", p);
      return true;
    }
    const temporary = slot === "ultimate",
      planned = this.plan(p, c, o, temporary);
    if (!planned.length) return false;
    const duration =
      rules.ultimateTicks +
      Math.floor(number(o.ultimateDurationBonus, 0, 360)) +
      (o.talents.patientCompany ? 240 : 0);
    if (temporary) {
      s.ultimateUntil = c.tick + duration;
      s.ultimateMultiplier = o.talents.patientCompany
        ? 1
        : 1 +
          (rules.ultimateDamageMultiplier - 1) *
            (1 + number(o.ultimatePotencyBonus, 0, 3));
    }
    for (const { kind, slot, point } of planned) {
      const base = rules.kinds[kind],
        pack = kind === "hound" && o.talents.runningPack,
        ultimateScale = temporary
          ? 1 + number(o.ultimatePotencyBonus, 0, 2)
          : 1,
        health =
          base.health *
          multiplier(o.potency * (1 + o.healthBonus) * ultimateScale) *
          (pack ? 0.8 : 1),
        id = c.id();
      if (!Number.isSafeInteger(id) || id < 1 || this.entities.has(id))
        throw Error("Invalid retinue entity ID");
      const e: SummonEntity = {
        id,
        owner: p.id,
        kind,
        slot,
        ...point,
        oldX: point.x,
        oldY: point.y,
        aim: p.aim,
        actionAim: p.aim,
        health,
        maxHealth: health,
        radius: base.radius,
        speed: Math.min(
          500,
          base.speed * multiplier(1 + o.speedBonus) * (pack ? 1.12 : 1),
        ),
        damage:
          base.damage *
          multiplier(o.potency * (1 + o.damageBonus) * ultimateScale),
        range: Math.min(360, base.range * multiplier(1 + o.reachBonus)),
        attackInterval: Math.max(
          9,
          Math.ceil(base.attackTicks / multiplier(1 + o.attackRateBonus)),
        ),
        attackAt: c.tick + 6,
        bornAt: c.tick,
        expires: temporary ? c.tick + duration : 0,
        temporary,
        target: "",
        decisionAt: c.tick,
        gatherToken: 0,
        gatherHealed: true,
        armorUntil: 0,
        hurtUntil: 0,
        slowUntil: 0,
        poisonUntil: 0,
        poisonNextAt: 0,
        poisonDamage: 0,
        poisonInterval: 0,
        poisonSlowMultiplier: 1,
        action: "idle",
        actionAt: c.tick,
      };
      this.entities.set(id, e);
    }
    c.sound(temporary ? "summoner-muster" : "summoner-call", p);
    return true;
  }
  slow(id: number, until: number) {
    const e = this.entities.get(id);
    if (e && Number.isSafeInteger(until) && until >= 0)
      e.slowUntil = Math.max(e.slowUntil, until);
  }
  poison(
    id: number,
    damage: number,
    duration: number,
    interval: number,
    slowMultiplier: number,
    now: number,
  ) {
    const e = this.entities.get(id);
    if (
      !e ||
      !Number.isFinite(damage) ||
      damage <= 0 ||
      !Number.isSafeInteger(now) ||
      now < 0 ||
      !Number.isSafeInteger(duration) ||
      duration < 1 ||
      !Number.isSafeInteger(interval) ||
      interval < 1
    )
      return false;
    e.poisonNextAt =
      e.poisonUntil > now
        ? Math.min(e.poisonNextAt, now + interval)
        : now + interval;
    e.poisonUntil = Math.max(e.poisonUntil, now + duration);
    e.poisonDamage = Math.max(e.poisonDamage, damage);
    e.poisonInterval = interval;
    e.poisonSlowMultiplier = Math.min(
      e.poisonSlowMultiplier,
      number(slowMultiplier, 0.1, 1),
    );
    return true;
  }
  hit(id: number, amount: number, now: number, healthLossOnly = false) {
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(now) ||
      now < 0
    )
      return 0;
    const e = this.entities.get(id);
    if (!e || e.health <= 0) return 0;
    if (e.temporary && now >= e.expires) {
      this.remove(e.id);
      return 0;
    }
    const actual = Math.min(
      e.health,
      amount * (!healthLossOnly && now < e.armorUntil ? 0.55 : 1),
    );
    e.health -= actual;
    e.hurtUntil = now + 6;
    e.action = "hurt";
    e.actionAim = e.aim;
    e.actionAt = now;
    if (e.health <= 0) {
      e.action = "downed";
      this.fallen.set(id, { view: this.view(e), until: now + 18 });
      this.remove(id);
    }
    return actual;
  }
  private view(e: SummonEntity): SummonView {
    return {
      id: e.id,
      owner: e.owner,
      kind: e.kind,
      slot: e.slot,
      x: e.x,
      y: e.y,
      oldX: e.oldX,
      oldY: e.oldY,
      aim: e.aim,
      actionAim: e.actionAim,
      health: e.health,
      maxHealth: e.maxHealth,
      radius: e.radius,
      bornAt: e.bornAt,
      expires: e.expires,
      temporary: e.temporary,
      action: e.action,
      actionAt: e.actionAt,
      slowUntil: e.slowUntil,
      poisonUntil: e.poisonUntil,
    };
  }
  snapshot() {
    return [...this.entities.values()]
      .map((e) => this.view(e))
      .concat([...this.fallen.values()].map((e) => ({ ...e.view })));
  }
  private remove(id: number) {
    this.entities.delete(id);
    for (const navigator of this.navigators.values()) navigator.remove(id);
  }
  removeOwner(owner: string) {
    for (const e of this.entities.values())
      if (e.owner === owner) this.remove(e.id);
    for (const [id, e] of this.fallen)
      if (e.view.owner === owner) this.fallen.delete(id);
    this.states.delete(owner);
  }
  clear() {
    this.entities.clear();
    this.fallen.clear();
    this.states.clear();
    for (const nav of this.navigators.values()) nav.clear();
    this.navigators.clear();
  }
  private formation(
    e: SummonEntity,
    p: SummonerOwner,
    s: OwnerState,
    c: SummonerContext,
  ) {
    const anchor = s.order === "hold" ? s.anchor : p,
      angle = p.aim + Math.PI + (e.slot * Math.PI) / 4,
      point = {
        x: anchor.x + Math.cos(angle) * rules.formationRadius,
        y: anchor.y + Math.sin(angle) * rules.formationRadius,
      };
    return this.legal(point, e.radius, c)
      ? point
      : { x: anchor.x, y: anchor.y };
  }
  private choose(
    e: SummonEntity,
    p: SummonerOwner,
    s: OwnerState,
    c: SummonerContext,
  ) {
    if (s.order === "focus") {
      const marked = this.marked(p.id, s.mark, c.tick)
        ? c.target(s.mark)
        : undefined;
      return marked &&
        marked.health > 0 &&
        distance(p, marked) <= rules.focusAggroRadius
        ? marked
        : undefined;
    }
    const anchor = s.order === "hold" ? s.anchor : p,
      radius = s.order === "hold" ? rules.holdLeash : rules.escortAggroRadius;
    let chosen: SummonTarget | undefined,
      best = Infinity;
    for (const candidate of c.enemies) {
      if (candidate.health <= 0 || distance(candidate, anchor) > radius)
        continue;
      const d = distance(e, candidate);
      if (d < best || (d === best && candidate.key < (chosen?.key ?? ""))) {
        chosen = candidate;
        best = d;
      }
    }
    return chosen;
  }
  step(c: SummonerContext) {
    if (!c.combat) {
      this.clear();
      return;
    }
    if (c.paused) return;
    const owners = new Map(c.owners.filter(live).map((p) => [p.id, p]));
    for (const owner of this.states.keys())
      if (!owners.has(owner)) this.removeOwner(owner);
    for (const [id, e] of this.fallen)
      if (e.until <= c.tick || !owners.has(e.view.owner))
        this.fallen.delete(id);
    for (const e of this.entities.values()) {
      const p = owners.get(e.owner);
      if (!p || e.health <= 0 || (e.temporary && e.expires <= c.tick)) {
        this.remove(e.id);
        continue;
      }
      if (
        e.poisonUntil &&
        c.tick <= e.poisonUntil &&
        c.tick >= e.poisonNextAt
      ) {
        e.poisonNextAt += e.poisonInterval;
        this.hit(e.id, e.poisonDamage, c.tick);
        if (!this.entities.has(e.id)) continue;
      }
      if (e.poisonUntil && c.tick >= e.poisonUntil) {
        e.poisonUntil = e.poisonNextAt = e.poisonDamage = e.poisonInterval = 0;
        e.poisonSlowMultiplier = 1;
      }
      const s = this.state(p);
      if (s.mark && (!c.target(s.mark) || c.tick >= s.markUntil)) {
        s.mark = "";
        s.markUntil = 0;
        if (s.order === "focus") s.order = "escort";
      }
      const gathering =
        c.tick < s.gatherUntil &&
        e.gatherToken === s.gatherToken &&
        !e.gatherHealed;
      let target = e.target ? c.target(e.target) : undefined;
      const anchor = s.order === "hold" ? s.anchor : p,
        leash =
          s.order === "hold"
            ? rules.holdLeash
            : s.order === "focus"
              ? rules.focusLeash
              : rules.escortLeash;
      if (gathering) {
        e.target = "";
        target = undefined;
      } else if (
        c.tick >= e.decisionAt ||
        !target ||
        target.health <= 0 ||
        distance(e, anchor) > leash
      ) {
        target =
          distance(e, anchor) > leash ? undefined : this.choose(e, p, s, c);
        e.target = target?.key ?? "";
        e.decisionAt = c.tick + rules.decisionTicks;
      }
      const destination = gathering
          ? p
          : (target ?? this.formation(e, p, s, c)),
        stop = target
          ? e.range + target.radius
          : gathering
            ? rules.gatherArrivalRange - 2
            : 8;
      const clear = lineClear(
          e,
          destination,
          c.obstacles,
          target ? 0 : e.radius,
        ),
        near = distance(e, destination) <= stop;
      if (!near || !clear) {
        let nav = this.navigators.get(e.radius);
        if (!nav) {
          nav = new RatNavigator();
          this.navigators.set(e.radius, nav);
        }
        const next = nav.waypoint(
            e.id,
            e,
            destination,
            c.navigationObstacles ?? c.obstacles,
            e.radius,
            c.tick,
          ),
          d = distance(e, next);
        const direct = next === destination,
          travel = Math.min(
            e.speed *
              DT *
              (gathering ? rules.gatherSpeedMultiplier : 1) *
              Math.min(
                c.tick < e.slowUntil ? 0.65 : 1,
                c.tick < e.poisonUntil ? e.poisonSlowMultiplier : 1,
              ),
            Math.max(0, d - (direct ? stop : 0)),
          );
        e.oldX = e.x;
        e.oldY = e.y;
        const moved = moveBody(
          e,
          {
            x: d ? ((next.x - e.x) / d) * travel : 0,
            y: d ? ((next.y - e.y) / d) * travel : 0,
          },
          e.radius,
          c.obstacles,
        );
        e.x = clamp(
          moved.x,
          c.bounds.x + e.radius,
          c.bounds.x + c.bounds.width - e.radius,
        );
        e.y = clamp(
          moved.y,
          c.bounds.y + e.radius,
          c.bounds.y + c.bounds.height - e.radius,
        );
        if (distance(e, { x: e.oldX, y: e.oldY }) > 0.05) {
          e.aim = Math.atan2(e.y - e.oldY, e.x - e.oldX);
          if (
            (e.action !== "hurt" && e.action !== "attack") ||
            c.tick - e.actionAt >= 6
          ) {
            if (e.action !== "run") e.actionAt = c.tick;
            e.action = "run";
          }
        }
      } else {
        e.oldX = e.x;
        e.oldY = e.y;
        if (c.tick - e.actionAt >= 6) e.action = "idle";
      }
      if (gathering && distance(e, p) <= rules.gatherArrivalRange) {
        e.gatherHealed = true;
        if (s.closedRanks) e.armorUntil = c.tick + 120;
        else e.health = Math.min(e.maxHealth, e.health + s.gatherHealing);
        e.target = "";
        e.decisionAt = 0;
      }
      if (
        gathering ||
        !target ||
        target.health <= 0 ||
        c.tick < e.attackAt ||
        distance(e, target) > e.range + target.radius ||
        !lineClear(e, target, c.obstacles)
      )
        continue;
      // Attack commitment consumes its interval even if the shared damage callback
      // finds that another entity just defeated the target. Credit remains with Game.
      e.aim = Math.atan2(target.y - e.y, target.x - e.x);
      e.attackAt = c.tick + e.attackInterval;
      e.action = "attack";
      e.actionAim = e.aim;
      e.actionAt = c.tick;
      const damage =
          e.damage * (c.tick < s.ultimateUntil ? s.ultimateMultiplier : 1),
        speed = rules.kinds[e.kind].projectileSpeed;
      if (speed > 0) c.shoot(p, e, target, damage, speed);
      else
        c.strike(p, e, target, damage, this.marked(p.id, target.key, c.tick));
    }
  }
}
