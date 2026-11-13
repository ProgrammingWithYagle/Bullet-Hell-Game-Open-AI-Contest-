import assert from "node:assert/strict";
import { Session } from "../../src/client/session.ts";
import type { Event } from "../../src/shared/protocol.ts";
import type { View } from "../../src/shared/view.ts";
import type { FlakBurstCue } from "../../src/shared/heavy-flak.ts";
import { heavyWait, type HeavyFlakAdapter } from "./heavy-flak-flow.ts";
import {
  heavyTraverseFlow,
  type TraverseVariant,
} from "./heavy-traverse-flow.ts";
export async function heavyTraversePeerFlow(
  endpoint: string,
  variant: TraverseVariant,
  options: {
    purchase?: (item: string, request: () => Promise<void>) => Promise<void>;
  } = {},
) {
  const host = new Session(endpoint),
    ally = new Session(endpoint),
    late = new Session(endpoint),
    sessions = [host, ally],
    events: Event[] = [],
    others: Event[] = [],
    purchases: any[] = [],
    foreign: any[] = [],
    maps = new Map<Session, Map<number, FlakBurstCue>>([
      [host, new Map()],
      [ally, new Map()],
      [late, new Map()],
    ]);
  let lateJoined = false,
    nonHostChecked = false;
  host.onEvents = (e) => events.push(...e);
  ally.onEvents = (e) => others.push(...e);
  late.onEvents = (e) => others.push(...e);
  host.onPurchase = (r) => purchases.push(r);
  ally.onPurchase = (r) => foreign.push(r);
  for (const s of [host, ally, late])
    s.onView = (view: View) => {
      for (const c of view.classCues)
        if (c.kind === "heavy-flak-burst")
          maps.get(s)!.set(c.id, structuredClone(c));
    };
  const p = () => host.view!.players.find((p) => p.id === host.id)!;
  try {
    const join = {
      name: "Native Heavy host",
      classId: "heavy" as const,
      mode:
        variant === "spade" || variant === "floating"
          ? ("raid" as const)
          : ("short" as const),
      difficulty: "normal",
      seed: 41,
      arenaSelection: "fixed" as const,
      openingArenaId: "gatehouse",
    };
    await ally.connect({
      ...join,
      name: "Soldier authority",
      classId: "soldier",
    });
    await host.connect(
      { ...join, name: "Heavy non-host owner" },
      { roomId: ally.room!.roomId },
    );
    await heavyWait(
      () => !!host.view && !!ally.view,
      "ordinary Heavy peer lobbies",
    );
    ally.purchase({ kind: "skill", item: "heavy-traverse-1" });
    await heavyWait(
      () => foreign.length > 0,
      "actual foreign-class purchase rejection",
    );
    assert(!foreign[0].ok);
    const purchase = async (item: string) => {
      const before = purchases.length;
      host.purchase({ kind: "skill", item });
      await heavyWait(
        () => purchases.length > before && p().skills.includes(item),
        "actual peer purchase and separate acknowledged view: " + item,
      );
      assert(purchases.at(-1).ok);
    };
    assert.notEqual(
      host.view!.owner,
      host.id,
      "Heavy is the non-host owner in a Soldier-hosted room",
    );
    const adapter: HeavyFlakAdapter = {
      owner: host.id,
      view: () => host.view ?? undefined,
      events,
      bursts: maps.get(host)!,
      input: (input) => host.input(input),
      purchase,
      start: async () => {
        ally.start();
        await heavyWait(
          () => sessions.every((s) => s.view?.phase === "combat"),
          "ordinary peer combat",
        );
      },
      pause: async (value) => {
        ally.setMatchPaused(value);
        await heavyWait(
          () =>
            sessions.every((s) => !!s.view && !!s.view.matchPaused === value),
          "actual shared host pause state",
        );
      },
      end: async () => {
        ally.endMatch();
        await heavyWait(
          () => sessions.every((s) => s.view?.phase === "defeat"),
          "actual host end reaches all peers",
        );
      },
      lateAndNonHostChecks: async () => {
        const tick = host.view!.combatTick;
        host.room!.send("pauseMatch", false);
        host.room!.send("endMatch");
        await new Promise((r) => setTimeout(r, 60));
        assert.equal(ally.view!.combatTick, tick);
        assert(ally.view!.matchPaused && ally.view!.phase === "combat");
        nonHostChecked = true;
        await late.connect(
          { ...join, name: "Late medic", classId: "medic" },
          { roomId: host.room!.roomId },
        );
        sessions.push(late);
        lateJoined = true;
        await heavyWait(
          () => !!late.view?.matchPaused,
          "late peer observes the actual paused flight clock",
        );
        assert.equal(
          late.view!.players.find((p) => p.id === late.id)!.skills.length,
          0,
        );
        const owner = late.view!.players.find((p) => p.id === host.id)!;
        assert.equal(
          owner.kit.heavyTraverseShotAt,
          p().kit.heavyTraverseShotAt,
        );
        assert(
          !Object.hasOwn(owner.kit, "heavyFlakX") &&
            !Object.hasOwn(owner.kit, "heavyFlakY"),
        );
      },
      checkOwnerStreams: (id) => {
        assert(
          !others.some(
            (e) =>
              e.type === "shots" && e.shots.some((s) => s.owner === host.id),
          ),
        );
        assert(!others.some((e) => e.type === "remove" && e.ids.includes(id)));
      },
      checkSharedBurst: async (cue) => {
        await heavyWait(
          () => sessions.every((s) => maps.get(s)!.has(cue.id)),
          "actual finite burst/contact geometry reaches every present peer",
        );
        for (const s of sessions)
          assert.deepEqual(maps.get(s)!.get(cue.id), cue);
      },
    };
    const result = await heavyTraverseFlow(
      adapter,
      variant,
      options.purchase
        ? { purchase: (item) => options.purchase!(item, () => purchase(item)) }
        : {},
    );
    assert.equal(
      purchases.filter((r) => r.ok).length,
      result.actualSkillPurchases,
    );
    return {
      ...result,
      actualAcceptedPurchases: purchases.filter((r) => r.ok).length,
      ownerOnlyFriendlyFlightAndRemoval: true,
      ownerWasRoomHost: host.view!.owner === host.id,
      nonHostPauseAndEndRejected: nonHostChecked,
      lateObserverWithoutOwnership: lateJoined,
      foreignClassRejected: true,
      noCheckpointUploaded: true,
    };
  } finally {
    host.close();
    ally.close();
    late.close();
  }
}
