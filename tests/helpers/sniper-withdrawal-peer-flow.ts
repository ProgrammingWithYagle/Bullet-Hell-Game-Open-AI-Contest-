import assert from "node:assert/strict";
import { Session } from "../../src/client/session.ts";
import { idleInput, validInput, type Shot } from "../../src/shared/protocol.ts";
import { data } from "../../src/shared/game.ts";
import { restWait } from "./sniper-rest-flow.ts";
import { sniperWithdrawalFlow } from "./sniper-withdrawal-flow.ts";
import {
  withdrawalRaidInput,
  type ObservedRestShot,
} from "./sniper-withdrawal-raid-policy.ts";
export async function sniperWithdrawalPeerFlow(
  endpoint: string,
  inspectWithdrawal?: (host: Session, canBuy: boolean) => Promise<unknown>,
) {
  const host = new Session(endpoint),
    ally = new Session(endpoint),
    late = new Session(endpoint),
    purchases: any[] = [],
    allyPurchases: any[] = [],
    observed = new Map<number, ObservedRestShot>(),
    emitted: Shot[] = [],
    removed = new Set<number>(),
    otherShots: Shot[] = [];
  let sequence = 0,
    allySequence = 0;
  host.onPurchase = (r) => purchases.push(r);
  ally.onPurchase = (r) => allyPurchases.push(r);
  host.onEvents = (events) => {
    for (const e of events) {
      if (e.type === "shots")
        for (const s of e.shots) {
          observed.set(s.id, { ...s, seenAt: host.view?.combatTick ?? 0 });
          if (s.owner === host.id) emitted.push(s);
        }
      if (e.type === "remove")
        for (const id of e.ids) {
          removed.add(id);
          observed.delete(id);
        }
    }
  };
  const otherRemovals = new Set<number>();
  ally.onEvents = late.onEvents = (events) => {
    for (const e of events) {
      if (e.type === "shots") otherShots.push(...e.shots);
      if (e.type === "remove") for (const id of e.ids) otherRemovals.add(id);
    }
  };
  const frame = (session: Session, input: object, n: number) => {
      const value = {
        ...idleInput(),
        sequence: n,
        clientTick: session.view?.combatTick ?? 0,
        aim: 0,
        ...input,
      };
      assert(validInput(value));
      session.input(value);
    },
    join = {
      name: "Native Prepared Withdrawal host",
      classId: "soldier" as const,
      mode: "raid" as const,
      difficulty: "baby",
      seed: 41,
      maxPlayers: 4,
      arenaSelection: "fixed" as const,
      openingArenaId: "gatehouse",
    };
  try {
    await host.connect(join);
    await ally.connect(
      { ...join, name: "Ordinary Soldier peer" },
      { roomId: host.room!.roomId },
    );
    for (const w of data.weapons
      .filter((w) => w.classId === "soldier")
      .toSorted((x, y) => y.tier - x.tier)) {
      const n = allyPurchases.length;
      ally.purchase({ kind: "weapon", item: w.id });
      await restWait(
        () =>
          allyPurchases.length > n &&
          (!allyPurchases[n].ok ||
            ally.view?.players.find((p) => p.id === ally.id)?.weapon === w.id),
        "ordinary peer equipment response plus view",
      );
      if (allyPurchases[n].ok) break;
    }
    const result = await sniperWithdrawalFlow(
      {
        id: host.id,
        view: () => host.view,
        input: (a) => {
          frame(host, a, ++sequence);
          return sequence;
        },
        start: () => host.start(),
        vote: (index) => {
          host.vote(index);
          ally.vote(index);
        },
        request: async (request) => {
          const n = purchases.length;
          host.purchase(request);
          await restWait(() => {
            const out = purchases[n],
              p = host.view?.players.find((p) => p.id === host.id);
            return (
              !!out &&
              (!out.ok ||
                (request.kind === "skill"
                  ? !!p?.skills.includes(request.item)
                  : request.kind === "weapon"
                    ? p?.weapon === request.item
                    : true))
            );
          }, "owner actual purchase result plus separate view");
          return purchases[n];
        },
        pause: (value) => host.setMatchPaused(value),
        paused: () => !!host.view?.matchPaused,
        observedShots: () => [...observed.values()],
        emittedShots: () => emitted,
        removed: (id) => removed.has(id),
        companions: () => {
          const view = ally.view,
            p = view?.players.find((p) => p.id === ally.id);
          if (view && p)
            frame(
              ally,
              withdrawalRaidInput(view, p, [...observed.values()]),
              ++allySequence,
            );
        },
        stopCompanions: () => frame(ally, {}, ++allySequence),
        inspectWithdrawal: async (canBuy) => {
          if (!canBuy) {
            await restWait(
              () => ally.view?.phase === "shop",
              "ordinary peer safe shop",
            );
            for (const request of [
              { kind: "upgrade", item: "health" },
              { kind: "upgrade", item: "damage" },
              { kind: "supply", item: "medkit" },
            ] as const) {
              const n = allyPurchases.length;
              ally.purchase(request);
              await restWait(
                () => allyPurchases.length > n,
                "ordinary peer equipment purchase",
              );
            }
          }
          if (inspectWithdrawal) return inspectWithdrawal(host, canBuy);
          if (canBuy) {
            const n = purchases.length;
            host.purchase({
              kind: "skill",
              item: "soldier-sniper-withdrawal-1",
            });
            await restWait(
              () =>
                !!purchases[n] &&
                (!purchases[n].ok ||
                  !!host.view?.players
                    .find((p) => p.id === host.id)
                    ?.skills.includes("soldier-sniper-withdrawal-1")),
              "actual default peer capstone purchase plus separate owner view",
            );
            assert(purchases[n].ok);
          }
          return undefined;
        },
        checkPairPaused: async () => {
          await restWait(
            () => !!ally.view?.matchPaused,
            "shared authoritative pause",
          );
          ally.room!.send("pauseMatch", false);
          ally.room!.send("endMatch");
          await late.connect(
            { ...join, name: "Late medic observer", classId: "medic" },
            { roomId: host.room!.roomId },
          );
          await restWait(
            () =>
              !!late.view?.matchPaused &&
              late.view.classCues.filter(
                (c) => c.kind === "soldier-rest" && c.owner === host.id,
              ).length === 2,
            "late observer receives both actual finite positions and authoritative pause",
          );
          const pair = late.view!.classCues.filter(
            (c) => c.kind === "soldier-rest" && c.owner === host.id,
          );
          assert.equal(
            pair.length,
            2,
            "late observer receives both actual independently settled positions",
          );
          for (const cue of pair)
            for (const key of [
              "pending",
              "armed",
              "fallback",
              "preparation",
              "weapon",
              "ammo",
              "damage",
              "health",
              "recovery",
              "receipt",
            ])
              assert(!Object.hasOwn(cue, key));
          const cue = late.view!.classCues.find(
            (c) => c.kind === "soldier-rest" && c.owner === host.id,
          )!;
          for (const key of [
            "ammo",
            "health",
            "damage",
            "recovery",
            "fireLatch",
          ])
            assert(!Object.hasOwn(cue, key));
          assert(
            !late
              .view!.players.find((p) => p.id === late.id)!
              .skills.includes("soldier-sniper-rest-1"),
          );
          await new Promise((r) => setTimeout(r, 60));
          assert(host.view?.matchPaused);
          assert.equal(host.view?.phase, "combat");
        },
      },
      "clear",
    );
    assert(
      !otherShots.some((s) => s.owner === host.id),
      "friendly flight remains owner-only",
    );
    assert(
      !emitted.some((s) => otherRemovals.has(s.id)),
      "all friendly removals stay with the owner",
    );
    const p = () => host.view!.players.find((p) => p.id === host.id)!;
    frame(host, { technique2: true, aim: p().aim }, ++sequence);
    await restWait(
      () => !!p().kit.sniperRestUntil,
      "actual new empty rest during spent recovery",
    );
    await restWait(
      () =>
        !!ally.view?.classCues.some(
          (c) => c.kind === "soldier-rest" && c.owner === host.id,
        ),
      "shared actual empty rest before host exit",
    );
    host.endMatch();
    await restWait(
      () => !!ally.view?.endedByHost && ally.view.classCues.length === 0,
      "host exit removes actual empty rest",
    );
    return {
      ...result,
      nonHostPauseAndEndRejected: true,
      lateObserverWithoutOwnership: true,
      sharedFiniteRestWithoutPaymentFields: true,
      ownerOnlyFriendlyStreams: true,
      ownerOnlyFriendlyRemovals: true,
      lateObserverSeesTwoFiniteActualPositions: true,
      hostExitRemovesActualEmptyRest: true,
      noCheckpointUploaded: true,
    };
  } finally {
    await host.close();
    await ally.close();
    await late.close();
  }
}
