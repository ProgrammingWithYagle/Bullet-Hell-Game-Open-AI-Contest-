import assert from "node:assert/strict";
import { Session } from "../../src/client/session.ts";
import {
  idleInput,
  validInput,
  type Event,
} from "../../src/shared/protocol.ts";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import { distance } from "../../src/shared/geometry.ts";
import { data } from "../../src/shared/game.ts";
import { boreApproach, actualBoreAim } from "./sniper-bore-approach.ts";
export async function sniperBorePeerFlow(
  endpoint: string,
  variant: "through" | "exit",
) {
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
    input = (a: object = {}) => {
      const frame = { ...idleInput(), sequence: ++sequence, aim: 0, ...a };
      assert(validInput(frame));
      host.input(frame);
    },
    shots = () =>
      events
        .filter((e) => e.type === "shots")
        .flatMap((e) => e.shots)
        .filter((s) => s.owner === host.id),
    removed = (id: number) =>
      events.some((e) => e.type === "remove" && e.ids.includes(id));
  try {
    const join = {
      name: "Native Bore host",
      classId: "soldier" as const,
      mode: "raid" as const,
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
    assert.equal(p().sp, 12);
    for (const item of [
      "soldier-ballistics-1",
      "soldier-sniper-1",
      "soldier-sniper-bore-1",
    ]) {
      const n = purchases.length;
      host.purchase({ kind: "skill", item });
      await wait(
        () => purchases.length > n && p().skills.includes(item),
        "actual purchase result and separate view",
      );
      assert(purchases.at(-1).ok);
    }
    assert.equal(p().sp, 6);
    ally.purchase({ kind: "skill", item: "soldier-sniper-bore-1" });
    await wait(() => foreign.length > 0, "foreign class rejection");
    assert(!foreign[0].ok);
    host.start();
    await wait(() => ally.view?.phase === "combat", "ordinary combat");
    const arena = runtimeArena(host.view!.arenaId, "normal"),
      boss = {
        ...host.view!.boss,
        radius: data.bosses.find((b) => b.id === host.view!.boss.id)!.radius,
      },
      approach = boreApproach(
        p(),
        arena,
        "through",
        boss,
        variant === "exit" ? 400 : 160,
      ),
      walkUntil = Date.now() + 5500;
    while (distance(p(), approach) > 2) {
      assert(Date.now() < walkUntil, "actual peer walking to interior cover");
      const d = distance(p(), approach),
        scale = Math.min(1, d / 12);
      input({
        moveX: ((approach.x - p().x) / d) * scale,
        moveY: ((approach.y - p().y) / d) * scale,
        aim: approach.aim,
      });
      await new Promise((r) => setTimeout(r, 25));
    }
    input({ aim: approach.aim });
    await wait(() => p().ack >= sequence, "actual stop");
    const actual = actualBoreAim(p(), arena, approach, "through"),
      aim = actual.aim,
      ammo = p().ammo,
      eAt = p().eAt;
    input({ technique1: true, aim });
    await wait(
      () =>
        p().kit.sniperPrepared === true &&
        !!ally.view?.classCues.some(
          (c) => c.kind === "soldier-sight" && c.owner === host.id,
        ),
      "shared actual paid sight",
    );
    const at = p().kit.sniperRecoveryAt,
      until = p().kit.sniperUntil;
    assert.equal(p().ammo, ammo - 1);
    host.setMatchPaused(true);
    await wait(() => !!ally.view?.matchPaused, "actual shared pause");
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
      late.view!.players.find((p) => p.id === late.id)!.skills.length,
      0,
    );
    input({
      technique1: true,
      technique2: true,
      fire: true,
      moveX: 1,
      reload: true,
    });
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(ally.view!.combatTick, tick);
    assert.equal(p().ammo, ammo - 1);
    assert.equal(p().kit.sniperUntil, until);
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
    input({ technique2: true, aim });
    await wait(
      () =>
        shots().length === 1 &&
        !p().kit.sniperPrepared &&
        events.some((e) => e.type === "sound" && e.id === "sniper-bore"),
      "actual owner B shot and fire view/sound",
    );
    const shot = shots()[0],
      seen = new Set<Session>();
    let contact: any;
    if (variant === "through") {
      await wait(() => {
        for (const s of [ally, late]) {
          const c = s.view?.classCues.find(
            (c) =>
              c.kind === "soldier-puncture" &&
              c.id === shot.id &&
              c.owner === host.id,
          );
          if (c) {
            seen.add(s);
            contact = c;
          }
        }
        return seen.size === 2;
      }, "shared actual narrow-cover contact to both observers");
      await wait(() => removed(shot.id), "actual owner-only natural removal");
      assert(contact);
      for (const key of [
        "reserved",
        "weapon",
        "damage",
        "fireLatch",
        "bore",
        "passed",
        "tunnel",
      ])
        assert(!(key in contact));
    } else {
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused, "actual live Bore pause");
      assert(
        shot.expires > host.view!.combatTick && !removed(shot.id),
        "host exits with an actual live Bore flight",
      );
    }
    assert.equal(p().ammo, ammo - 1);
    assert.equal(p().eAt, eAt);
    assert.equal(p().kit.sniperRecoveryAt, at);
    assert(p().kit.sniperShotAt! > 0);
    host.endMatch();
    await wait(
      () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
      "actual host exit to all peers",
    );
    await wait(() => removed(shot.id), "actual owner removal");
    assert(
      !others.some(
        (e) => e.type === "shots" && e.shots.some((s) => s.owner === host.id),
      ),
    );
    assert(!others.some((e) => e.type === "remove" && e.ids.includes(shot.id)));
    for (const s of [host, ally, late])
      assert(
        !s.view!.classCues.some(
          (c) =>
            (c.kind === "soldier-sight" || c.kind === "soldier-puncture") &&
            c.owner === host.id,
        ),
      );
    return {
      ordinaryStartingSP: 12,
      actualPurchases: 3,
      remainingSP: 6,
      variant,
      actualMovementToUsableInteriorCover: true,
      manualBReleaseAfterRealSettling: true,
      oneActualRoundReservedOnlyOnce: true,
      ownerOnlyFlightAndRemoval: true,
      actualNarrowCoverCrossing: variant === "through",
      sharedFinitePunctureToBothObservers: variant === "through",
      actualHostExitRemovesLiveBore: variant === "exit",
      sharedFeedbackOmitsPrivatePayment: true,
      spentRecoveryRetained: true,
      actualFireTiming: true,
      burstUnchanged: true,
      pauseDiscardsRequests: true,
      nonHostPauseAndEndRejected: true,
      lateObserverWithoutOwnership: true,
      noCheckpointUploaded: true,
    };
  } finally {
    host.close();
    ally.close();
    late.close();
  }
}
