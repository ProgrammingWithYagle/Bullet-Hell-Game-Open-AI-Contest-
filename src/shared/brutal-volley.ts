import catalog from "../../content/catalog.json";
import { HZ, type Vec } from "./protocol.ts";
export type EchoCue = {
  kind: "brutal-echo";
  id: number;
  x: number;
  y: number;
  beganAt: number;
  at: number;
  until: number;
  wave: number;
  angles: number[];
  crazed: boolean;
};
type Echo = EchoCue & { speed: number; damage: number; radius: number };
const rules = catalog.rules.brutal;
/** Bounded, warned repeats. A half-wave alternates shots, retaining an exact rational budget. */
export class BrutalVolley {
  private pending: Echo[] = [];
  private projectiles = 0;
  private baseShots = 0;
  clear() {
    this.pending = [];
    this.projectiles = 0;
    this.baseShots = 0;
  }
  capture(
    now: number,
    point: Vec,
    angle: number,
    speed: number,
    damage: number,
    radius: number,
    _level: number,
    id: () => number,
    variant = "brutal",
  ) {
    const multiplier =
      variant === "crazed"
        ? catalog.rules.crazed.projectileMultiplier
        : rules.projectileMultiplier;
    const old = this.baseShots++;
    const extra =
      Math.floor(this.baseShots * multiplier) -
      Math.floor(old * multiplier) -
      1;
    for (let wave = 0; wave < extra; wave++) {
      if (this.projectiles >= rules.maximumPendingEchoProjectiles) break;
      const at =
        now +
        Math.ceil(
          (rules.echoDelaySeconds + rules.echoWaveSpacingSeconds * wave) * HZ,
        );
      let group = this.pending.find(
        (g) =>
          g.beganAt === now &&
          g.at === at &&
          g.x === point.x &&
          g.y === point.y &&
          g.speed === speed &&
          g.damage === damage &&
          g.radius === radius &&
          g.crazed === (variant === "crazed"),
      );
      if (!group) {
        if (this.pending.length >= rules.maximumPendingEchoOrigins) break;
        group = {
          kind: "brutal-echo",
          id: id(),
          x: point.x,
          y: point.y,
          beganAt: now,
          at,
          until: at,
          wave: wave + 2,
          angles: [],
          speed,
          damage,
          radius,
          crazed: variant === "crazed",
        };
        this.pending.push(group);
      }
      if (group.angles.length >= 200) continue;
      group.angles.push(angle);
      this.projectiles++;
    }
  }
  release(
    now: number,
    emit: (
      point: Vec,
      angle: number,
      speed: number,
      damage: number,
      radius: number,
    ) => void,
  ) {
    const due = this.pending.filter((g) => g.at <= now);
    this.pending = this.pending.filter((g) => g.at > now);
    for (const g of due) {
      this.projectiles -= g.angles.length;
      for (const angle of g.angles) emit(g, angle, g.speed, g.damage, g.radius);
    }
  }
  cues(): EchoCue[] {
    return this.pending.map(
      ({ kind, id, x, y, beganAt, at, until, wave, angles, crazed }) => ({
        kind,
        id,
        x,
        y,
        beganAt,
        at,
        until,
        wave,
        angles: [...angles],
        crazed,
      }),
    );
  }
  get queuedProjectiles() {
    return this.projectiles;
  }
}
