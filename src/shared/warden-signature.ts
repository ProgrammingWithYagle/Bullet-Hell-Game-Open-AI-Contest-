// Shared Warden sector geometry and clock, used by Game and the local rehearsal.
// Candidate range/damage/ground projection tuning and final visual review remain open.
import catalog from "../../content/catalog.json" with { type: "json" };
import { HZ, type Vec } from "./protocol.ts";

const authored = catalog.bosses.find((boss) => boss.id === "lantern-warden")!;
const parameters: Record<string, unknown> = authored.signature.parameters;
function parameter(name: string): number {
  const value = parameters[name];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    throw new RangeError("Invalid authored Warden parameter: " + name);
  return value;
}
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
export const WARDEN_SIGNATURE = Object.freeze({
  warningTicks: ticks(parameter("warningSeconds")),
  activeTicks: ticks(parameter("activeSeconds")),
  restTicks: ticks(parameter("restSeconds")),
  coneRadians: radians(parameter("coneDegrees")),
  radiansPerTick: radians(parameter("rotationDegreesPerSecond")) / HZ,
  // Unspecified in the design catalog: explicit, provisional rehearsal tuning.
  radius: 420,
  trailingSafeRadians: radians(40),
  contactDamage: 9,
  contactIntervalTicks: ticks(0.5),
});
export const WARDEN_CYCLE_TICKS =
  WARDEN_SIGNATURE.warningTicks +
  WARDEN_SIGNATURE.activeTicks +
  WARDEN_SIGNATURE.restTicks;
export type WardenPhase = "warning" | "active" | "rest";
export type Sector = {
  x: number;
  y: number;
  radius: number;
  aim: number;
  arc: number;
};
export type WardenSample = {
  tick: number;
  cycle: number;
  phase: WardenPhase;
  phaseTick: number;
  remainingTicks: number;
  cone: Sector;
  trailingSafe: Sector;
};
export const wrappedAngle = (angle: number) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));

/** One clock owns both the rendered sector and collision, including boundaries. */
export function sampleWarden(
  tick: number,
  origin: Vec,
  lockedAim: number,
): WardenSample {
  if (
    !Number.isSafeInteger(tick) ||
    tick < 0 ||
    ![origin.x, origin.y, lockedAim].every(Number.isFinite)
  )
    throw new RangeError(
      "Warden clock and pose must be finite; ticks must be nonnegative integers",
    );
  const time = tick % WARDEN_CYCLE_TICKS;
  const rule = WARDEN_SIGNATURE;
  const phase: WardenPhase =
    time < rule.warningTicks
      ? "warning"
      : time < rule.warningTicks + rule.activeTicks
        ? "active"
        : "rest";
  const phaseTick =
    phase === "warning"
      ? time
      : phase === "active"
        ? time - rule.warningTicks
        : time - rule.warningTicks - rule.activeTicks;
  const duration =
    phase === "warning"
      ? rule.warningTicks
      : phase === "active"
        ? rule.activeTicks
        : rule.restTicks;
  const rotationTick =
    phase === "warning" ? 0 : phase === "active" ? phaseTick : rule.activeTicks;
  const aim = wrappedAngle(lockedAim + rotationTick * rule.radiansPerTick);
  const cone = { ...origin, radius: rule.radius, aim, arc: rule.coneRadians };
  const trailingSafe = {
    ...origin,
    radius: rule.radius,
    aim: wrappedAngle(aim - (rule.coneRadians + rule.trailingSafeRadians) / 2),
    arc: rule.trailingSafeRadians,
  };
  return {
    tick,
    cycle: Math.floor(tick / WARDEN_CYCLE_TICKS),
    phase,
    phaseTick,
    remainingTicks: duration - phaseTick,
    cone,
    trailingSafe,
  };
}

/** Exact disc/closed-sector contact, including radial edges and arc endpoints. */
export function sectorIntersectsCircle(
  sector: Sector,
  body: Vec,
  radius: number,
): boolean {
  if (
    ![
      sector.x,
      sector.y,
      sector.radius,
      sector.aim,
      sector.arc,
      body.x,
      body.y,
      radius,
    ].every(Number.isFinite) ||
    radius < 0 ||
    sector.radius <= 0 ||
    sector.arc <= 0 ||
    sector.arc > Math.PI * 2
  )
    throw new RangeError("Invalid sector or body");
  const x = body.x - sector.x,
    y = body.y - sector.y,
    distance = Math.hypot(x, y);
  if (distance > sector.radius + radius) return false;
  if (distance <= radius) return true;
  if (Math.abs(wrappedAngle(Math.atan2(y, x) - sector.aim)) <= sector.arc / 2)
    return true;
  for (const edge of [
    sector.aim - sector.arc / 2,
    sector.aim + sector.arc / 2,
  ]) {
    const ex = Math.cos(edge),
      ey = Math.sin(edge);
    const along = Math.min(sector.radius, Math.max(0, x * ex + y * ey));
    if (Math.hypot(x - ex * along, y - ey * along) <= radius + 1e-9)
      return true;
  }
  return false;
}

export function wardenCanHit(
  sample: WardenSample,
  body: Vec,
  radius: number,
): boolean {
  return (
    sample.phase === "active" &&
    sectorIntersectsCircle(sample.cone, body, radius)
  );
}

/** Lock the initial aim for a whole cycle; moving targets never redirect a tell. */
export class WardenClock {
  tick = 0;
  private lockedAim = 0;
  constructor(
    readonly origin: Vec,
    target: Vec,
  ) {
    this.reset(target);
  }
  private aimAt(target: Vec) {
    if (![target.x, target.y].every(Number.isFinite))
      throw new RangeError("Invalid target");
    this.lockedAim = Math.atan2(
      target.y - this.origin.y,
      target.x - this.origin.x,
    );
  }
  reset(target: Vec) {
    this.aimAt(target);
    this.tick = 0;
  }
  advance(target: Vec) {
    if (![target.x, target.y].every(Number.isFinite))
      throw new RangeError("Invalid target");
    this.tick++;
    if (this.tick % WARDEN_CYCLE_TICKS === 0) this.aimAt(target);
    return this.sample();
  }
  sample() {
    return sampleWarden(this.tick, this.origin, this.lockedAim);
  }
}
