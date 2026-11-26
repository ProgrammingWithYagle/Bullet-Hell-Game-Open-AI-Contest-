import { HZ, type Vec } from "./protocol.ts";
import { distance, segmentRect } from "./geometry.ts";
import { engineerRules as r, chargeLegal } from "./engineer-pathways.ts";
import { hasTalent } from "./class-talents.ts";
import type { Player } from "./game.ts";
import type { Construct, KitContext } from "./class-kits.ts";
const ticks = (s: number) => Math.ceil(s * HZ);
export const builderIds = {
  entry: "engineer-builder-1",
  longspan: "engineer-builder-longspan-1",
  wings: "engineer-builder-wings-1",
  hinge: "engineer-builder-hinge-1",
  repair: "engineer-builder-repair-1",
  linked: "engineer-builder-linked-1",
  survey: "engineer-builder-survey-1",
  redoubt: "engineer-builder-redoubt-1",
} as const;
export type BuilderCue = Vec & {
  kind: "engineer-builder-plan" | "engineer-builder-work";
  id: number;
  owner: string;
  toX: number;
  toY: number;
  at: number;
  until: number;
  radius: number;
  rejected?: boolean;
};
export type BuilderTower = Construct & {
  damage: number;
  fireAt: number;
  interval: number;
};
export type BuilderPose = Vec & { aim: number; halfSpan: number };
type Shape = "flat" | "longspan" | "wings" | "fort";
type Move = {
  from: Vec;
  to: Vec;
  fromAim: number;
  delta: number;
  at: number;
  until: number;
};
type Group = {
  id: number;
  owner: string;
  center: Vec;
  aim: number;
  shape: Shape;
  ids: number[];
  members: Map<number, number>;
  until: number;
  move?: Move;
  machine?: number;
};
type Repair = {
  owner: string;
  target: number;
  from: Vec;
  point: Vec;
  at: number;
  until: number;
  amount: number;
};
type Status = {
  technique1At: number;
  technique2At: number;
  builderRepairUntil: number;
  builderRepairTarget: number;
  builderGroups: number;
  builderGroupCapacity: number;
};
const live = (p: Player | undefined): p is Player =>
  !!p &&
  p.classId === "engineer" &&
  p.connected &&
  p.status === "active" &&
  p.health > 0;
const angle = (n: number) => Math.atan2(Math.sin(n), Math.cos(n));
function corners(p: BuilderPose, pad = 0) {
  const co = Math.cos(p.aim),
    si = Math.sin(p.aim),
    a = 12 + pad,
    b = p.halfSpan + pad;
  return [-1, 1].flatMap((x) =>
    [-1, 1].map((y) => ({
      x: p.x + co * a * x - si * b * y,
      y: p.y + si * a * x + co * b * y,
    })),
  );
}
/** Exact oriented wall footprint against bounds, AABB cover and circular lava. */
export function builderPoseLegal(
  p: BuilderPose,
  c: Pick<KitContext, "obstacles" | "terrain">,
  pad = 0,
) {
  if (
    !c.terrain ||
    ![p.x, p.y, p.aim, p.halfSpan, pad].every(Number.isFinite) ||
    p.halfSpan <= 0 ||
    pad < 0
  )
    return false;
  const vertices = corners(p, pad),
    bounds = c.terrain.bounds;
  if (
    vertices.some(
      (v) =>
        v.x < bounds.x ||
        v.y < bounds.y ||
        v.x > bounds.x + bounds.width ||
        v.y > bounds.y + bounds.height,
    )
  )
    return false;
  const co = Math.cos(p.aim),
    si = Math.sin(p.aim),
    axes = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: co, y: si },
      { x: -si, y: co },
    ];
  for (const w of c.obstacles) {
    const cover = [
      { x: w.x, y: w.y },
      { x: w.x + w.width, y: w.y },
      { x: w.x, y: w.y + w.height },
      { x: w.x + w.width, y: w.y + w.height },
    ];
    if (
      axes.every((a) => {
        const u = vertices.map((v) => v.x * a.x + v.y * a.y),
          v = cover.map((v) => v.x * a.x + v.y * a.y);
        return (
          Math.max(...u) >= Math.min(...v) && Math.max(...v) >= Math.min(...u)
        );
      })
    )
      return false;
  }
  for (const lava of c.terrain.lava) {
    const dx = lava.x - p.x,
      dy = lava.y - p.y,
      x = dx * co + dy * si,
      y = -dx * si + dy * co,
      nearX = Math.max(-12 - pad, Math.min(12 + pad, x)),
      nearY = Math.max(-p.halfSpan - pad, Math.min(p.halfSpan + pad, y));
    if (Math.hypot(x - nearX, y - nearY) <= lava.radius) return false;
  }
  return true;
}
function layout(center: Vec, aim: number, shape: Shape): BuilderPose[] {
  const at = (
    forward: number,
    side: number,
    turn: number,
    halfSpan: number,
  ) => ({
    x: center.x + Math.cos(aim) * forward - Math.sin(aim) * side,
    y: center.y + Math.sin(aim) * forward + Math.cos(aim) * side,
    aim: aim + turn,
    halfSpan,
  });
  if (shape === "wings")
    return [-1, 1].map((side) =>
      at(
        -r.builderWingBack,
        side * r.builderWingSide,
        side * r.builderWingAngle,
        r.builderWingSpan,
      ),
    );
  if (shape === "fort")
    return [
      at(r.builderFortOffset, 0, 0, r.builderFortHalfSpan),
      at(0, -r.builderFortOffset, Math.PI / 2, r.builderFortHalfSpan),
      at(0, r.builderFortOffset, Math.PI / 2, r.builderFortHalfSpan),
    ];
  return [
    at(0, 0, 0, shape === "longspan" ? r.builderLongSpan : r.builderHalfSpan),
  ];
}
function sweptLegal(g: Group, to: Vec, aim: number, c: KitContext) {
  const delta = angle(aim - g.aim),
    span =
      Math.max(...layout(g.center, g.aim, g.shape).map((p) => p.halfSpan)) +
      r.builderWingSide +
      r.builderWingBack;
  // At most6px point travel per sample. A3px Minkowski pad covers each half interval.
  const count = Math.max(
    1,
    Math.ceil(
      (distance(g.center, to) + Math.abs(delta) * Math.hypot(span, 12)) / 6,
    ),
  );
  for (let i = 0; i <= count; i++) {
    const t = i / count,
      center = {
        x: g.center.x + (to.x - g.center.x) * t,
        y: g.center.y + (to.y - g.center.y) * t,
      };
    if (
      layout(center, g.aim + delta * t, g.shape).some(
        (p) => !builderPoseLegal(p, c, 3),
      )
    )
      return false;
  }
  return true;
}
/** Shared owned walls use the existing swept projectile/health machinery. */
export class EngineerBuilder {
  private groups: Group[] = [];
  private repairs: Repair[] = [];
  private flashes: BuilderCue[] = [];
  private states = new Map<string, Status>();
  clear() {
    this.groups = [];
    this.repairs = [];
    this.flashes = [];
    this.states.clear();
  }
  status(id: string) {
    return this.states.get(id);
  }
  private state(p: Player): Status {
    return (
      this.states.get(p.id) ?? {
        technique1At: 0,
        technique2At: 0,
        builderRepairUntil: 0,
        builderRepairTarget: 0,
        builderGroups: 0,
        builderGroupCapacity: p.skills.includes(builderIds.linked) ? 2 : 1,
      }
    );
  }
  private owned(p: Player, c: KitContext) {
    return this.groups.filter(
      (g) => g.owner === p.id && g.machine === undefined && c.tick < g.until,
    );
  }
  private shape(p: Player): Shape {
    return p.skills.includes(builderIds.longspan)
      ? "longspan"
      : p.skills.includes(builderIds.wings)
        ? "wings"
        : "flat";
  }
  private point(p: Player) {
    return {
      x: p.x + Math.cos(p.aim) * r.builderReach,
      y: p.y + Math.sin(p.aim) * r.builderReach,
    };
  }
  canDeploy(p: Player, c: KitContext) {
    const center = this.point(p),
      shape = this.shape(p);
    return (
      live(p) &&
      p.skills.includes(builderIds.entry) &&
      this.owned(p, c).length <
        (p.skills.includes(builderIds.linked) ? 2 : 1) &&
      chargeLegal(center, p, c) &&
      layout(center, p.aim, shape).every((pose) => builderPoseLegal(pose, c))
    );
  }
  private create(
    p: Player,
    c: KitContext,
    towers: Map<number, BuilderTower>,
    center: Vec,
    shape: Shape,
    health: number,
    seconds: number,
    assembly: number,
    machine?: number,
  ) {
    const poses = layout(center, p.aim, shape),
      id = c.id(),
      until = c.tick + ticks(seconds),
      group: Group = {
        id,
        owner: p.id,
        center: { ...center },
        aim: p.aim,
        shape,
        ids: [],
        members: new Map(),
        until,
        machine,
      };
    for (const [member, pose] of poses.entries()) {
      const bodyId = c.id();
      group.ids.push(bodyId);
      group.members.set(bodyId, member);
      towers.set(bodyId, {
        kind: "wall",
        id: bodyId,
        owner: p.id,
        x: pose.x,
        y: pose.y,
        aim: pose.aim,
        halfSpan: pose.halfSpan,
        radius: pose.halfSpan,
        health: health / poses.length,
        maxHealth: health / poses.length,
        at: c.tick,
        until,
        damage: 0,
        fireAt: 0,
        interval: 1,
        source:
          machine === undefined
            ? "engineer-builder-screen"
            : "engineer-builder-redoubt",
        builder: true,
        builderGroup: id,
        buildingAt: c.tick,
        buildingUntil: c.tick + ticks(assembly),
        linkedSiege: machine,
        retaliation: hasTalent(p, "return-current") ? 0.6 : 0,
      });
    }
    this.groups.push(group);
    this.updateStatus(p, c);
    return group;
  }
  deploy(p: Player, c: KitContext, towers: Map<number, BuilderTower>) {
    if (!this.canDeploy(p, c)) return false;
    this.create(
      p,
      c,
      towers,
      this.point(p),
      this.shape(p),
      r.builderHealth * c.stats(p).ability,
      r.builderSeconds,
      r.builderAssemblySeconds,
    );
    c.sound?.("engineer-build", p);
    return true;
  }
  fortify(
    p: Player,
    machine: number,
    c: KitContext,
    towers: Map<number, BuilderTower>,
  ) {
    const siege = towers.get(machine);
    if (
      !live(p) ||
      !p.skills.includes(builderIds.redoubt) ||
      !siege ||
      siege.owner !== p.id ||
      siege.kind !== "siege"
    )
      return false;
    const center = { x: siege.x, y: siege.y };
    if (
      layout(center, p.aim, "fort").some((pose) => !builderPoseLegal(pose, c))
    ) {
      this.flashes.push({
        kind: "engineer-builder-plan",
        id: c.id(),
        owner: p.id,
        ...center,
        toX: center.x,
        toY: center.y,
        at: c.tick,
        until: c.tick + ticks(0.6),
        radius: 35,
        rejected: true,
      });
      return false;
    }
    for (const old of this.groups.filter(
      (g) => g.owner === p.id && g.machine !== undefined,
    )) {
      for (const id of old.ids) towers.delete(id);
      old.until = 0;
    }
    const s = c.stats(p),
      seconds = Math.min(r.builderFortSeconds, (siege.until - c.tick) / HZ);
    this.create(
      p,
      c,
      towers,
      center,
      "fort",
      r.builderFortHealth *
        3 *
        s.ability *
        (1 + (s.effects.ultimatePotency ?? 0)),
      seconds,
      r.builderFortAssemblySeconds,
      machine,
    );
    c.sound?.("engineer-fortify", p);
    return true;
  }
  cast(
    p: Player,
    slot: "technique1" | "technique2",
    c: KitContext,
    towers: Map<number, BuilderTower>,
  ) {
    if (!live(p) || !p.skills.includes(builderIds.entry)) return false;
    const state = this.state(p),
      s = c.stats(p);
    if (slot === "technique2") {
      if (
        !p.skills.includes(builderIds.repair) ||
        c.tick < state.technique2At ||
        this.repairs.some((r) => r.owner === p.id)
      )
        return false;
      const target = [...towers.values()]
        .filter(
          (t) =>
            t.owner === p.id &&
            t.kind === "wall" &&
            t.health > 0 &&
            t.health < t.maxHealth &&
            c.tick < t.until &&
            c.tick >= (t.buildingUntil ?? 0) &&
            distance(t, p) <= r.builderRepairReach &&
            !c.obstacles.some((w) => segmentRect(p, t, w, 0) !== null),
        )
        .sort((a, b) => distance(a, p) - distance(b, p) || a.id - b.id)[0];
      if (!target || target.until <= c.tick + ticks(r.builderRepairSeconds))
        return false;
      const until = c.tick + ticks(r.builderRepairSeconds);
      this.repairs.push({
        owner: p.id,
        target: target.id,
        from: { x: p.x, y: p.y },
        point: { x: target.x, y: target.y },
        at: c.tick,
        until,
        amount: r.builderRepairHealth * s.ability,
      });
      this.states.set(p.id, {
        ...state,
        technique2At: c.tick + ticks(r.builderRepairCooldown * s.cooldown),
        builderRepairUntil: until,
        builderRepairTarget: target.id,
      });
      c.sound?.("engineer-repair", p);
      return true;
    }
    if (!p.skills.includes(builderIds.hinge) || c.tick < state.technique1At)
      return false;
    const target = this.point(p),
      survey = p.skills.includes(builderIds.survey),
      seconds = survey ? r.builderSurveySeconds : r.builderPivotSeconds;
    const group = this.owned(p, c)
      .filter(
        (g) =>
          !g.move &&
          g.until > c.tick + ticks(seconds) &&
          distance(g.center, p) <= r.builderWorkReach &&
          g.ids.some((id) => {
            const t = towers.get(id);
            return t && t.health > 0 && c.tick >= (t.buildingUntil ?? 0);
          }),
      )
      .sort(
        (a, b) =>
          distance(a.center, target) - distance(b.center, target) ||
          a.id - b.id,
      )[0];
    if (!group) return false;
    const d = distance(group.center, target),
      move = survey ? Math.min(1, r.builderSurveyDistance / (d || 1)) : 0,
      to = {
        x: group.center.x + (target.x - group.center.x) * move,
        y: group.center.y + (target.y - group.center.y) * move,
      },
      delta = angle(p.aim - group.aim);
    if (
      (distance(group.center, to) < 1 && Math.abs(delta) < 0.01) ||
      !sweptLegal(group, to, p.aim, c)
    )
      return false;
    group.move = {
      from: { ...group.center },
      to,
      fromAim: group.aim,
      delta,
      at: c.tick,
      until: c.tick + ticks(seconds),
    };
    for (const id of group.ids) {
      const t = towers.get(id);
      if (t) {
        t.buildingAt = c.tick;
        t.buildingUntil = group.move.until;
      }
    }
    this.states.set(p.id, {
      ...state,
      technique1At:
        c.tick +
        ticks(
          (survey ? r.builderSurveyCooldown : r.builderPivotCooldown) *
            s.cooldown,
        ),
    });
    c.sound?.("engineer-hinge", p);
    return true;
  }
  private updateStatus(p: Player, c: KitContext) {
    this.states.set(p.id, {
      ...this.state(p),
      builderGroups: this.owned(p, c).length,
      builderGroupCapacity: p.skills.includes(builderIds.linked) ? 2 : 1,
    });
  }
  step(c: KitContext, towers: Map<number, BuilderTower>) {
    for (const g of this.groups) {
      const owner = c.players.find((p) => p.id === g.owner),
        machine = g.machine === undefined ? undefined : towers.get(g.machine);
      if (
        !live(owner) ||
        c.tick >= g.until ||
        (g.machine !== undefined &&
          (!machine || machine.health <= 0 || c.tick >= machine.until))
      ) {
        for (const id of g.ids) towers.delete(id);
        g.until = 0;
        continue;
      }
      g.ids = g.ids.filter((id) => {
        const t = towers.get(id);
        return !!t && t.health > 0 && c.tick < t.until;
      });
      if (!g.ids.length) {
        g.until = 0;
        continue;
      }
      if (g.move) {
        const m = g.move,
          t = Math.max(0, Math.min(1, (c.tick - m.at) / (m.until - m.at))),
          center = {
            x: m.from.x + (m.to.x - m.from.x) * t,
            y: m.from.y + (m.to.y - m.from.y) * t,
          },
          aim = m.fromAim + m.delta * t,
          poses = layout(center, aim, g.shape);
        if (poses.some((pose) => !builderPoseLegal(pose, c))) {
          if (
            layout(g.center, g.aim, g.shape).some(
              (pose) => !builderPoseLegal(pose, c),
            )
          ) {
            for (const id of g.ids) towers.delete(id);
            g.until = 0;
          } else
            for (const id of g.ids) {
              const body = towers.get(id);
              if (body) body.buildingUntil = c.tick;
            }
          g.move = undefined;
          continue;
        }
        g.center = center;
        g.aim = aim;
        for (const id of g.ids) {
          const body = towers.get(id)!;
          const pose = poses[g.members.get(id)!];
          body.x = pose.x;
          body.y = pose.y;
          body.aim = pose.aim;
        }
        if (t >= 1) g.move = undefined;
      }
    }
    this.groups = this.groups.filter((g) => c.tick < g.until);
    for (const repair of this.repairs) {
      const owner = c.players.find((p) => p.id === repair.owner),
        body = towers.get(repair.target);
      if (
        !live(owner) ||
        !body ||
        body.health <= 0 ||
        body.until <= c.tick ||
        c.tick < (body.buildingUntil ?? 0) ||
        distance(owner, repair.from) > r.builderRepairMovement ||
        distance(owner, body) > r.builderRepairReach ||
        c.obstacles.some((w) => segmentRect(owner, body, w, 0) !== null)
      ) {
        repair.until = 0;
        continue;
      }
      repair.point = { x: body.x, y: body.y };
      if (c.tick >= repair.until) {
        body.health = Math.min(body.maxHealth, body.health + repair.amount);
        repair.until = 0;
      }
    }
    this.repairs = this.repairs.filter((r) => c.tick < r.until);
    this.flashes = this.flashes.filter(
      (f) => c.tick < f.until && live(c.players.find((p) => p.id === f.owner)),
    );
    for (const p of c.players)
      if (p.classId === "engineer") {
        if (p.skills.includes(builderIds.entry) || this.states.has(p.id)) {
          this.updateStatus(p, c);
          const repair = this.repairs.find((r) => r.owner === p.id);
          this.states.set(p.id, {
            ...this.state(p),
            builderRepairUntil: repair?.until ?? 0,
            builderRepairTarget: repair?.target ?? 0,
          });
        }
      }
    for (const id of this.states.keys())
      if (!c.players.some((p) => p.id === id)) this.states.delete(id);
  }
  cues(): BuilderCue[] {
    return [
      ...this.flashes,
      ...this.groups
        .filter((g) => g.move)
        .map((g) => ({
          kind: "engineer-builder-plan" as const,
          id: g.id,
          owner: g.owner,
          ...g.move!.from,
          toX: g.move!.to.x,
          toY: g.move!.to.y,
          at: g.move!.at,
          until: g.move!.until,
          radius: 20,
        })),
      ...this.repairs.map((r) => ({
        kind: "engineer-builder-work" as const,
        id: r.target,
        owner: r.owner,
        ...r.from,
        toX: r.point.x,
        toY: r.point.y,
        at: r.at,
        until: r.until,
        radius: 25,
      })),
    ];
  }
}
