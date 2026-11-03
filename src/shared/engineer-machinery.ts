import { HZ, type Vec } from "./protocol.ts";
import { distance, segmentRect } from "./geometry.ts";
import { engineerRules as r, chargeLegal } from "./engineer-pathways.ts";
import type { Player } from "./game.ts";
import type { Construct, KitContext } from "./class-kits.ts";
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const machineryIds = {
  anchor: "engineer-machinery-anchor-1",
  survey: "engineer-machinery-survey-1",
  coil: "engineer-machinery-coil-1",
  prism: "engineer-machinery-prism-1",
  salvage: "engineer-machinery-salvage-1",
  convergence: "engineer-machinery-convergence-1",
} as const;
export type MachineryOrder = "follow" | "anchor" | "waypoint";
export type MachineryCue = Vec & {
  kind:
    | "engineer-coil"
    | "engineer-beam"
    | "engineer-collapse"
    | "engineer-salvage"
    | "engineer-order";
  id: number;
  owner: string;
  radius: number;
  at: number;
  until: number;
  toX?: number;
  toY?: number;
  rejected?: boolean;
  convergence?: boolean;
  impact?: boolean;
  rays?: Vec[];
};
type Machine = Construct & {
  fireAt: number;
  order?: MachineryOrder;
  goal?: Vec;
  formationOffset?: Vec;
  commandAt?: number;
};
type Channel = {
  owner: string;
  machine: number;
  point: Vec;
  aim: number;
  at: number;
  nextAt: number;
  remaining: number;
  index: number;
  damage: number;
  convergence: boolean;
  mark: Vec;
};
type Collapse = MachineryCue & {
  damage: number;
  machines: number[];
  delivered: boolean;
};
/** The same finite machinery simulation is available to either acquisition system. */
export class EngineerMachinery {
  private channels: Channel[] = [];
  private flashes: MachineryCue[] = [];
  private collapses: Collapse[] = [];
  private cooldowns = new Map<
    string,
    { technique1At: number; technique2At: number }
  >();
  clear() {
    this.channels = [];
    this.flashes = [];
    this.collapses = [];
    this.cooldowns.clear();
  }
  status(id: string) {
    return this.cooldowns.get(id) ?? { technique1At: 0, technique2At: 0 };
  }
  private live(p: Player, c: KitContext, towers: Map<number, Machine>) {
    return [...towers.values()].filter(
      (t) =>
        t.owner === p.id &&
        t.kind === "turret" &&
        t.machinery &&
        t.health > 0 &&
        t.until > c.tick &&
        p.connected &&
        p.status === "active" &&
        p.health > 0,
    );
  }
  busy(id: number) {
    return this.channels.some((ch) => ch.machine === id);
  }
  command(p: Player, c: KitContext, towers: Map<number, Machine>): boolean {
    const anchor = p.skills.includes(machineryIds.anchor),
      survey = p.skills.includes(machineryIds.survey);
    if (p.classId !== "engineer" || (!anchor && !survey) || c.tick >= p.qAt)
      return false;
    const machines = this.live(p, c, towers);
    if (
      !machines.length ||
      machines.some((t) => this.busy(t.id) || c.tick < (t.commandAt ?? 0))
    )
      return false;
    const recall = anchor && machines.every((t) => t.order === "anchor");
    const mark = {
      x: p.x + Math.cos(p.aim) * r.commandReach,
      y: p.y + Math.sin(p.aim) * r.commandReach,
    };
    const goals = machines.map((t) =>
      recall
        ? {
            x: p.x + (t.followOffset?.x ?? 0),
            y: p.y + (t.followOffset?.y ?? 0),
          }
        : anchor
          ? { x: t.x, y: t.y }
          : {
              x: mark.x + (t.formationOffset?.x ?? 0),
              y: mark.y + (t.formationOffset?.y ?? 0),
            },
    );
    if (
      !goals.every((point, i) =>
        chargeLegal(point, machines[i], c, machines[i].radius),
      )
    ) {
      this.flashes = this.flashes.filter(
        (f) => f.kind !== "engineer-order" || f.owner !== p.id,
      );
      this.flashes.push({
        kind: "engineer-order",
        id: c.id(),
        owner: p.id,
        ...mark,
        radius: 18,
        at: c.tick,
        until: c.tick + ticks(0.5),
        rejected: true,
      });
      return false;
    }
    c.sound?.("engineer-order", p);
    machines.forEach((t, i) => {
      t.order = recall ? "follow" : anchor ? "anchor" : "waypoint";
      t.goal = goals[i];
      t.commandAt = c.tick + ticks(r.commandSeconds);
      t.braceUntil = c.tick + ticks(r.braceSeconds);
      t.fireAt = c.tick;
    });
    return true;
  }
  cast(
    p: Player,
    slot: "technique1" | "technique2",
    c: KitContext,
    towers: Map<number, Machine>,
  ): boolean {
    if (p.classId !== "engineer" || !p.connected || p.status !== "active")
      return false;
    const state = this.status(p.id),
      machines = this.live(p, c, towers);
    if (slot === "technique2") {
      const nearby = machines.filter(
        (t) => distance(t, p) <= r.salvageReach && !this.busy(t.id),
      );
      if (
        !p.skills.includes(machineryIds.salvage) ||
        c.tick < state.technique2At ||
        !nearby.length ||
        p.qAt <= c.tick
      )
        return false;
      c.sound?.("engineer-salvage", p);
      for (const t of nearby) towers.delete(t.id);
      p.qAt = Math.max(c.tick, p.qAt - ticks(r.salvageRecovery));
      this.cooldowns.set(p.id, {
        ...state,
        technique2At: c.tick + ticks(r.salvageCooldown * c.stats(p).cooldown),
      });
      this.flashes.push({
        kind: "engineer-salvage",
        id: c.id(),
        owner: p.id,
        x: p.x,
        y: p.y,
        radius: r.salvageReach,
        at: c.tick,
        until: c.tick + ticks(0.45),
      });
      return true;
    }
    if (
      !p.skills.includes(machineryIds.coil) ||
      c.tick < state.technique1At ||
      !machines.length ||
      machines.some((t) => this.busy(t.id))
    )
      return false;
    const convergence = p.skills.includes(machineryIds.convergence),
      prism = !convergence && p.skills.includes(machineryIds.prism);
    const firstAt = c.tick + ticks(r.coilChargeSeconds),
      lastAt = firstAt + (prism ? 2 * ticks(r.prismInterval) : 0);
    const eligible = machines.filter((t) => t.until > lastAt);
    if (!eligible.length) return false;
    const selected = convergence
      ? eligible
      : [
          eligible.sort(
            (a, b) => distance(a, p) - distance(b, p) || a.id - b.id,
          )[0],
        ];
    // The shared mark is clipped from the caster: never place the collapse through cover.
    const mark = this.endpoint(p, p.aim, r.coilRange, c, 0),
      s = c.stats(p),
      multiplier = s.ability * (1 + (s.effects.turretDamage ?? 0));
    c.sound?.("engineer-charge", p);
    for (const t of selected) {
      const aim = convergence ? Math.atan2(mark.y - t.y, mark.x - t.x) : p.aim;
      this.channels.push({
        owner: p.id,
        machine: t.id,
        point: { x: t.x, y: t.y },
        aim,
        at: c.tick,
        nextAt: firstAt,
        remaining: prism ? 3 : 1,
        index: 0,
        damage:
          (convergence
            ? r.convergenceDamage
            : prism
              ? r.prismDamage
              : r.coilDamage) * multiplier,
        convergence,
        mark,
      });
      t.aim = aim;
      t.fireAt = firstAt;
      t.braceUntil = firstAt + ticks(r.braceSeconds);
    }
    if (convergence)
      this.collapses.push({
        kind: "engineer-collapse",
        id: c.id(),
        owner: p.id,
        ...mark,
        radius: r.collapseRadius,
        at: firstAt,
        until: firstAt + ticks(r.collapseSeconds),
        damage: r.collapseDamage * multiplier,
        machines: selected.map((t) => t.id),
        delivered: false,
        convergence: true,
      });
    this.cooldowns.set(p.id, {
      ...state,
      technique1At:
        c.tick +
        ticks(
          (convergence ? r.convergenceCooldown : r.coilCooldown) * s.cooldown,
        ),
    });
    return true;
  }
  private endpoint(
    from: Vec,
    aim: number,
    length: number,
    c: KitContext,
    pad: number,
  ): Vec {
    const end = {
      x: from.x + Math.cos(aim) * length,
      y: from.y + Math.sin(aim) * length,
    };
    let t = 1;
    if (c.terrain) {
      const b = c.terrain.bounds,
        dx = end.x - from.x,
        dy = end.y - from.y;
      if (dx > 0) t = Math.min(t, (b.x + b.width - pad - from.x) / dx);
      else if (dx < 0) t = Math.min(t, (b.x + pad - from.x) / dx);
      if (dy > 0) t = Math.min(t, (b.y + b.height - pad - from.y) / dy);
      else if (dy < 0) t = Math.min(t, (b.y + pad - from.y) / dy);
      t = Math.max(0, t);
    }
    for (const wall of c.obstacles) {
      const hit = segmentRect(from, end, wall, pad);
      if (hit) t = Math.min(t, Math.max(0, hit.t - 0.0001));
    }
    return {
      x: from.x + (end.x - from.x) * t,
      y: from.y + (end.y - from.y) * t,
    };
  }
  step(c: KitContext, towers: Map<number, Machine>) {
    const owner = (id: string) =>
      c.players.find(
        (p) =>
          p.id === id && p.connected && p.status === "active" && p.health > 0,
      );
    this.channels = this.channels.filter((ch) => {
      const t = towers.get(ch.machine);
      return !!owner(ch.owner) && !!t && t.health > 0 && c.tick < t.until;
    });
    for (const ch of this.channels) {
      if (c.tick < ch.nextAt) continue;
      const t = towers.get(ch.machine)!,
        p = owner(ch.owner)!,
        aim =
          ch.aim +
          (ch.remaining + ch.index > 1 ? (ch.index - 1) * r.prismArc : 0);
      const end = this.endpoint(
        ch.point,
        aim,
        ch.convergence ? distance(ch.point, ch.mark) : r.coilRange,
        c,
        r.beamRadius,
      );
      c.sound?.("engineer-rail", p);
      c.sweep(p, ch.point, end, r.beamRadius, ch.damage, new Set());
      if (ch.convergence && distance(end, ch.mark) <= r.beamRadius + 0.5) {
        const collapse = this.collapses.find(
          (cue) => cue.owner === ch.owner && cue.machines.includes(ch.machine),
        );
        if (collapse) collapse.delivered = true;
      }
      this.flashes.push({
        kind: "engineer-beam",
        id: c.id(),
        owner: p.id,
        ...ch.point,
        toX: end.x,
        toY: end.y,
        radius: r.beamRadius,
        at: c.tick,
        until: c.tick + ticks(r.beamSeconds),
        convergence: ch.convergence,
      });
      ch.index++;
      ch.remaining--;
      ch.nextAt += ticks(r.prismInterval);
      ch.at = c.tick;
      t.aim = aim;
      t.fireAt = c.tick + ticks(r.braceSeconds);
      t.braceUntil = c.tick + ticks(r.braceSeconds);
    }
    this.channels = this.channels.filter((ch) => ch.remaining > 0);
    for (const collapse of this.collapses) {
      const p = owner(collapse.owner);
      if (
        !p ||
        (c.tick >= collapse.at && !collapse.delivered) ||
        !collapse.machines.some((id) => {
          const t = towers.get(id);
          return t && t.health > 0 && c.tick < t.until;
        })
      ) {
        collapse.until = 0;
        continue;
      }
      if (c.tick < collapse.until) continue;
      c.sound?.("engineer-collapse", p);
      c.area(
        p,
        collapse,
        collapse.radius,
        collapse.damage,
        1,
        0,
        undefined,
        true,
      );
      const {
        damage: _damage,
        machines: _machines,
        delivered: _delivered,
        ...visual
      } = collapse;
      this.flashes.push({
        ...visual,
        at: c.tick,
        until: c.tick + ticks(0.3),
        impact: true,
      });
      collapse.until = 0;
    }
    this.collapses = this.collapses.filter((cue) => cue.until > c.tick);
    this.flashes = this.flashes.filter(
      (f) => f.until > c.tick && !!owner(f.owner),
    );
    for (const id of this.cooldowns.keys())
      if (!c.players.some((p) => p.id === id)) this.cooldowns.delete(id);
  }
  cues(c: KitContext): MachineryCue[] {
    return [
      ...this.flashes,
      ...this.collapses.map(
        ({ damage: _d, machines: _m, delivered: _delivered, ...cue }) => cue,
      ),
      ...this.channels.map((ch) => {
        const rays = Array.from({ length: ch.remaining }, (_, i) =>
          this.endpoint(
            ch.point,
            ch.aim +
              (ch.remaining + ch.index > 1
                ? (ch.index + i - 1) * r.prismArc
                : 0),
            ch.convergence ? distance(ch.point, ch.mark) : r.coilRange,
            c,
            r.beamRadius,
          ),
        );
        const end = rays[0];
        return {
          kind: "engineer-coil" as const,
          id: ch.machine,
          owner: ch.owner,
          ...ch.point,
          toX: end.x,
          toY: end.y,
          radius: r.beamRadius,
          at: ch.at,
          until: ch.nextAt,
          convergence: ch.convergence,
          rays,
        };
      }),
    ];
  }
}
