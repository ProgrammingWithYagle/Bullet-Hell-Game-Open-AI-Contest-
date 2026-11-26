import assert from "node:assert/strict";
import { Session } from "../../src/client/session.ts";
import {
  idleInput,
  validInput,
  type Event,
} from "../../src/shared/protocol.ts";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import { segmentRect, segmentCircle } from "../../src/shared/geometry.ts";
import { data } from "../../src/shared/game.ts";
export async function sniperPeerFlow(endpoint: string) {
  const host = new Session(endpoint),
    ally = new Session(endpoint),
    late = new Session(endpoint),
    events: Event[] = [],
    others: Event[] = [],
    purchases: any[] = [],
    foreign: any[] = [];
  host.onEvents = (e) => events.push(...e);
  ally.onEvents = (e) => others.push(...e);
  late.onEvents = (e) => others.push(...e);
  host.onPurchase = (r) => purchases.push(r);
  ally.onPurchase = (r) => foreign.push(r);
  let sequence = 0;
  const wait = async (check: () => boolean, label: string) => {
      const end = Date.now() + 6000;
      while (!check()) {
        assert(Date.now() < end, label);
        await new Promise((r) => setTimeout(r, 5));
      }
    },
    p = () => host.view!.players.find((p) => p.id === host.id)!,
    input = (action: object = {}) =>
      host.input({ ...idleInput(), sequence: ++sequence, aim: 0, ...action }),
    shots = () =>
      events
        .filter((e) => e.type === "shots")
        .flatMap((e) => e.shots)
        .filter((s) => s.owner === host.id),
    removed = (id: number) =>
      events.some((e) => e.type === "remove" && e.ids.includes(id));
  try {
    const join = {
      name: "Native Sniper host",
      classId: "soldier" as const,
      mode: "short" as const,
      difficulty: "normal",
      seed: 41,
      arenaSelection: "fixed" as const,
      openingArenaId: "gatehouse",
    };
    await host.connect(join);
    await ally.connect(
      { ...join, name: "Engineer peer", classId: "engineer" },
      { roomId: host.room!.roomId },
    );
    assert.equal(p().sp, 3);
    for (const item of ["soldier-ballistics-1", "soldier-sniper-1"]) {
      const before = purchases.length;
      host.purchase({ kind: "skill", item });
      await wait(
        () => purchases.length > before && p().skills.includes(item),
        "actual purchase result plus separate acknowledged view",
      );
      assert(purchases.at(-1).ok);
    }
    assert.equal(p().sp, 0);
    ally.purchase({ kind: "skill", item: "soldier-sniper-1" });
    await wait(() => foreign.length > 0, "foreign class rejection");
    assert(!foreign[0].ok);
    host.start();
    await wait(() => ally.view?.phase === "combat", "ordinary combat");
    // Harness-only manual lane selection from actual runtime cover/bounds and the visible boss.
    const arena = runtimeArena(host.view!.arenaId, "normal"),
      boss = host.view!.boss,
      radius = data.bosses.find((b) => b.id === boss.id)!.radius + 3;
    const lanes = Array.from({ length: 32 }, (_, n) => {
      const aim = (n * Math.PI) / 16,
        to = {
          x: p().x + Math.cos(aim) * 2000,
          y: p().y + Math.sin(aim) * 2000,
        };
      let fraction = 1;
      for (const w of arena.obstacles) {
        const hit = segmentRect(p(), to, w, 3);
        if (hit) fraction = Math.min(fraction, hit.t);
      }
      const body = segmentCircle(p(), to, boss, radius);
      if (body !== null) fraction = Math.min(fraction, body);
      for (const axis of ["x", "y"] as const) {
        const lo = arena.bounds[axis] + 3,
          hi =
            arena.bounds[axis] +
            (axis === "x" ? arena.bounds.width : arena.bounds.height) -
            3;
        if (to[axis] < lo || to[axis] > hi)
          fraction = Math.min(
            fraction,
            ((to[axis] < lo ? lo : hi) - p()[axis]) / (to[axis] - p()[axis]),
          );
      }
      return { aim, clear: 2000 * fraction };
    }).sort((a, b) => b.clear - a.clear);
    assert(
      lanes[0].clear > 420,
      "an actual open lane for paused host-exit flight",
    );
    const aim = Math.atan2(Math.sin(lanes[0].aim), Math.cos(lanes[0].aim)),
      ammo = p().ammo,
      eAt = p().eAt;
    assert(
      validInput({ ...idleInput(), sequence: 1, aim }),
      "selected manual angle is outside the ordinary protocol: " + aim,
    );
    input({ technique1: true, aim });
    await wait(
      () =>
        p().kit.sniperPrepared === true &&
        !!ally.view?.classCues.some(
          (c) => c.kind === "soldier-sight" && c.owner === host.id,
        ),
      "shared paid sight",
    );
    const until = p().kit.sniperUntil,
      at = p().kit.sniperRecoveryAt;
    assert.equal(p().ammo, ammo - 1);
    host.setMatchPaused(true);
    await wait(() => !!ally.view?.matchPaused, "shared pause");
    const tick = ally.view!.combatTick;
    ally.room!.send("pauseMatch", false);
    ally.room!.send("endMatch");
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(ally.view!.combatTick, tick);
    assert.equal(ally.view!.phase, "combat");
    await late.connect(
      { ...join, name: "Late medic", classId: "medic" },
      { roomId: host.room!.roomId },
    );
    await wait(() => !!late.view?.matchPaused, "late paused observation");
    assert(
      late.view!.classCues.some(
        (c) => c.kind === "soldier-sight" && c.owner === host.id,
      ),
    );
    assert.equal(
      late.view!.players.find((q) => q.id === late.id)!.skills.length,
      0,
    );
    for (const cue of late.view!.classCues.filter(
      (c) => c.kind === "soldier-sight",
    ))
      for (const key of [
        "reserved",
        "damage",
        "weapon",
        "fireLatch",
        "required",
      ])
        assert(!(key in cue));
    input({ technique1: true, fire: true, moveX: 1, reload: true });
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(ally.view!.combatTick, tick);
    assert.equal(p().kit.sniperUntil, until);
    assert.equal(p().ammo, ammo - 1);
    host.setMatchPaused(false);
    await wait(() => !!host.view && !host.view.matchPaused, "actual resume");
    input({ aim });
    await wait(
      () =>
        p().kit.sniperPrepared === true &&
        p().kit.sniperReadyAt! <= host.view!.combatTick,
      "real settling",
    );
    assert.equal(shots().length, 0);
    assert(
      validInput({ ...idleInput(), sequence: 1, aim }),
      "selected manual angle is outside the ordinary protocol: " + aim,
    );
    input({ technique1: true, aim });
    await wait(
      () => shots().length === 1 && !p().kit.sniperPrepared,
      "actual owner-only shot and separate release view",
    );
    const shot = shots()[0],
      firedAt = p().kit.sniperShotAt!;
    assert(firedAt > 0);
    host.setMatchPaused(true);
    await wait(() => !!ally.view?.matchPaused, "actual flight pause");
    await wait(
      () =>
        [ally, late].every(
          (s) =>
            s.view?.players.find((q) => q.id === host.id)?.kit.sniperShotAt ===
            firedAt,
        ),
      "shared actual firing time without a friendly trajectory",
    );
    assert(
      shot.expires > host.view!.combatTick && !removed(shot.id),
      "host exits with actual live flight",
    );
    assert.equal(p().ammo, ammo - 1);
    assert.equal(p().eAt, eAt);
    assert.equal(p().kit.sniperRecoveryAt, at);
    host.endMatch();
    await wait(
      () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
      "host exit to actual peers",
    );
    await wait(() => removed(shot.id), "actual owner removal");
    assert(
      !others.some(
        (e) => e.type === "shots" && e.shots.some((s) => s.owner === host.id),
      ),
    );
    assert(!others.some((e) => e.type === "remove" && e.ids.includes(shot.id)));
    for (const s of [host, ally, late])
      assert(!s.view!.classCues.some((c) => c.kind === "soldier-sight"));
    return {
      ordinaryStartingSP: 3,
      actualPurchases: 2,
      remainingSP: 0,
      oneRoundReservedOnlyOnce: true,
      manualReleaseAfterRealSettling: true,
      ownerOnlyFlightAndRemoval: true,
      sharedSightOmitsPaymentState: true,
      sharedActualFireTiming: true,
      pauseDiscardsRequests: true,
      nonHostPauseAndEndRejected: true,
      lateObserverWithoutOwnership: true,
      hostExitRemovesActualLiveShot: true,
      burstUnchanged: true,
      noCheckpointUploaded: true,
    };
  } finally {
    host.close();
    ally.close();
    late.close();
  }
}
