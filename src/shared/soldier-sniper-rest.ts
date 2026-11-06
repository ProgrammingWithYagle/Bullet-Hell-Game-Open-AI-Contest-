export type RestPose = {
  id: string;
  x: number;
  y: number;
  aim: number;
  weapon: string;
  health: number;
};
export type RestPoint = RestPose & {
  cueId: number;
  at: number;
  readyAt: number;
  until: number;
  setting: boolean;
  fireLatch: boolean;
};
export type RestRules = {
  settleTicks: number;
  lifetimeTicks: number;
  claimRadius: number;
  aimArc: number;
  stationaryTolerance: number;
};
const angle = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));
/** An empty fixed position. Paying for a shot remains the caller's atomic operation. */
export class SniperFieldRest {
  private points = new Map<string, RestPoint>();
  constructor(readonly rules: RestRules) {}
  clear() {
    this.points.clear();
  }
  remove(owner: string) {
    this.points.delete(owner);
  }
  cancelSetup(owner: string) {
    if (this.points.get(owner)?.setting) this.remove(owner);
  }
  get(owner: string) {
    return this.points.get(owner);
  }
  owners() {
    return [...this.points.keys()];
  }
  place(p: RestPose, now: number, cueId: number, fireLatch: boolean) {
    this.points.set(p.id, {
      id: p.id,
      x: p.x,
      y: p.y,
      aim: p.aim,
      weapon: p.weapon,
      health: p.health,
      cueId,
      at: now,
      readyAt: now + this.rules.settleTicks,
      until: now + this.rules.lifetimeTicks,
      setting: true,
      fireLatch,
    });
  }
  sync(
    p: RestPose | undefined,
    owner: string,
    now: number,
    valid: boolean,
    canSettle: boolean,
  ) {
    const q = this.points.get(owner);
    if (!q) return;
    if (!p || !valid || p.weapon !== q.weapon || now >= q.until) {
      this.remove(owner);
      return;
    }
    if (q.setting) {
      if (
        !canSettle ||
        p.health < q.health ||
        Math.hypot(p.x - q.x, p.y - q.y) > this.rules.stationaryTolerance
      ) {
        this.remove(owner);
        return;
      }
      if (Math.abs(angle(p.aim - q.aim)) > this.rules.aimArc) {
        q.aim = p.aim;
        q.at = now;
        q.readyAt = now + this.rules.settleTicks;
      }
      if (now >= q.readyAt) q.setting = false;
    }
    return q;
  }
  react(
    owner: string,
    input: {
      fire: boolean;
      reload: boolean;
      dodge: boolean;
      e: boolean;
      ultimate: boolean;
    },
  ) {
    const q = this.points.get(owner);
    if (!q?.setting) return;
    if (!input.fire) q.fireLatch = false;
    if (
      (input.fire && !q.fireLatch) ||
      input.reload ||
      input.dodge ||
      input.e ||
      input.ultimate
    )
      this.remove(owner);
  }
  canClaim(p: RestPose, now: number) {
    const q = this.points.get(p.id);
    return (
      !!q &&
      !q.setting &&
      q.until > now &&
      q.weapon === p.weapon &&
      Math.hypot(p.x - q.x, p.y - q.y) <= this.rules.claimRadius &&
      Math.abs(angle(p.aim - q.aim)) <= this.rules.aimArc
    );
  }
  consume(p: RestPose, now: number) {
    if (!this.canClaim(p, now)) return false;
    this.remove(p.id);
    return true;
  }
  blocksPrimary(owner: string) {
    return this.points.get(owner)?.setting ?? false;
  }
}
