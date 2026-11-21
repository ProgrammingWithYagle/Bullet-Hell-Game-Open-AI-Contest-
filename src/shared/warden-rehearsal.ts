// A bounded, local signature exercise, not a production boss encounter.
import catalog from "../../content/catalog.json" with { type: "json" };
import { moveBody } from "./geometry.ts";
import { DT, type Vec } from "./protocol.ts";
import {
  WardenClock,
  WARDEN_SIGNATURE,
  wardenCanHit,
} from "./warden-signature.ts";

const arena = catalog.arenas.find((entry) => entry.id === "gatehouse")!;
export const WARDEN_FOOT = Object.freeze({ x: 800, y: 430 });
// Deliberate 2.5D ground projection, separate from the moving artwork attachment.
export const WARDEN_GROUND = Object.freeze({ x: 855, y: 430 });
const spawn = () => ({ x: 930, y: 705 });
export class WardenRehearsal {
  readonly playerRadius = catalog.rules.playerRadius;
  readonly playerSpeed = 210;
  player = spawn();
  health = 100;
  hits = 0;
  clock = new WardenClock(WARDEN_GROUND, this.player);
  private lastHit = -Infinity;
  reset() {
    this.player = spawn();
    this.health = 100;
    this.hits = 0;
    this.lastHit = -Infinity;
    this.clock.reset(this.player);
  }
  sample() {
    return this.clock.sample();
  }
  step(movement: Vec) {
    if (![movement.x, movement.y].every(Number.isFinite))
      throw new RangeError("Invalid rehearsal movement");
    if (this.health <= 0) return this.sample();
    const length = Math.max(1, Math.hypot(movement.x, movement.y));
    this.player = moveBody(
      this.player,
      {
        x: (movement.x / length) * this.playerSpeed * DT,
        y: (movement.y / length) * this.playerSpeed * DT,
      },
      this.playerRadius,
      arena.obstacles,
    );
    const sample = this.clock.advance(this.player);
    if (
      sample.tick - this.lastHit >= WARDEN_SIGNATURE.contactIntervalTicks &&
      wardenCanHit(sample, this.player, this.playerRadius)
    ) {
      this.health = Math.max(0, this.health - WARDEN_SIGNATURE.contactDamage);
      this.hits++;
      this.lastHit = sample.tick;
    }
    return sample;
  }
}
