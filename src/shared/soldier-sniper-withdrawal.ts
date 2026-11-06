import type { RestPoint, RestPose } from "./soldier-sniper-rest.ts";
type Receipt = {
  preparation: number;
  site: number;
  weapon: string;
  until: number;
};
export type WithdrawalRules = {
  minimumDistance: number;
  claimRadius: number;
  aimArc: number;
};
/** A pair earns at most one finite right, after its exact paid preparation actually fires. */
export class SniperWithdrawal {
  private pending = new Map<string, Receipt>();
  private armed = new Map<string, Receipt>();
  constructor(readonly rules: WithdrawalRules) {}
  clear() {
    this.pending.clear();
    this.armed.clear();
  }
  has(owner: string) {
    return this.pending.has(owner) || this.armed.has(owner);
  }
  armedUntil(owner: string) {
    return this.armed.get(owner)?.until ?? 0;
  }
  remainingId(owner: string) {
    return this.pending.get(owner)?.site ?? this.armed.get(owner)?.site;
  }
  normalClaim(
    p: RestPose,
    preparation: number,
    first: RestPoint,
    other: RestPoint,
    now: number,
    recoveryAt: number,
    owned: boolean,
  ) {
    if (
      !owned ||
      this.has(p.id) ||
      recoveryAt > now ||
      first.id !== p.id ||
      other.id !== p.id ||
      first.cueId === other.cueId ||
      first.weapon !== p.weapon ||
      other.weapon !== p.weapon ||
      first.setting ||
      other.setting ||
      first.readyAt > now ||
      other.readyAt > now ||
      first.until <= now ||
      other.until <= now ||
      Math.hypot(first.x - other.x, first.y - other.y) <
        this.rules.minimumDistance
    )
      return false;
    this.pending.set(p.id, {
      preparation,
      site: other.cueId,
      weapon: p.weapon,
      until: other.until,
    });
    return true;
  }
  released(
    p: RestPose,
    preparation: number,
    other: RestPoint | undefined,
    now: number,
  ) {
    const q = this.pending.get(p.id);
    if (!q || q.preparation !== preparation) return false;
    this.pending.delete(p.id);
    if (
      !other ||
      q.weapon !== p.weapon ||
      other.weapon !== p.weapon ||
      other.id !== p.id ||
      other.cueId !== q.site ||
      other.until !== q.until ||
      now >= q.until ||
      other.setting ||
      now < other.readyAt
    )
      return false;
    this.armed.set(p.id, q);
    return true;
  }
  available(
    p: RestPose,
    site: RestPoint | undefined,
    now: number,
    owned: boolean,
  ) {
    const q = this.armed.get(p.id);
    return (
      !!q &&
      owned &&
      !!site &&
      site.id === p.id &&
      q.site === site.cueId &&
      q.weapon === p.weapon &&
      site.weapon === p.weapon &&
      q.until === site.until &&
      now < q.until &&
      !site.setting &&
      now >= site.readyAt &&
      Math.hypot(p.x - site.x, p.y - site.y) <= this.rules.claimRadius &&
      Math.abs(
        Math.atan2(Math.sin(p.aim - site.aim), Math.cos(p.aim - site.aim)),
      ) <= this.rules.aimArc
    );
  }
  consume(owner: string) {
    return this.armed.delete(owner);
  }
  abandonPaid(owner: string) {
    this.pending.delete(owner);
  }
  remove(owner: string) {
    this.pending.delete(owner);
    this.armed.delete(owner);
  }
  sync(
    owner: string,
    weapon: string | undefined,
    site: RestPoint | undefined,
    now: number,
    owned: boolean,
  ) {
    for (const map of [this.pending, this.armed]) {
      const q = map.get(owner);
      if (
        q &&
        (!owned ||
          q.weapon !== weapon ||
          !site ||
          site.cueId !== q.site ||
          site.id !== owner ||
          site.weapon !== weapon ||
          site.until !== q.until ||
          now >= q.until)
      )
        map.delete(owner);
    }
  }
}
