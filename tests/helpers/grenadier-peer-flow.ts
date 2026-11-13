import assert from "node:assert/strict";
import { Session } from "../../src/client/session.ts";
import { idleInput, type Event } from "../../src/shared/protocol.ts";
import { runtimeArena } from "../../src/shared/arena-layouts.ts";
import { distance } from "../../src/shared/geometry.ts";
import { grenadierIds as ids } from "../../src/shared/soldier-grenadier.ts";
import { grenadeApproach } from "./grenadier-worker-flow.ts";
export async function grenadePeerFlow(
  endpoint: string,
  options: {
    mode?: "short" | "raid" | "endless";
    variant?: "skim" | "contact";
    late?: boolean;
    prepare?: (host: Session) => void;
  } = {},
) {
  const host = new Session(endpoint),
    ally = new Session(endpoint),
    late = new Session(endpoint),
    events: Event[] = [],
    other: Event[] = [];
  host.onEvents = (e) => events.push(...e);
  ally.onEvents = (e) => other.push(...e);
  const wait = async (check: () => boolean, label: string) => {
      const end = Date.now() + 6000;
      while (!check()) {
        assert(Date.now() < end, label);
        await new Promise((r) => setTimeout(r, 5));
      }
    },
    p = () => host.view!.players.find((p) => p.id === host.id)!,
    canisters = () =>
      events
        .filter((e) => e.type === "shots")
        .flatMap((e) => e.shots)
        .filter((s) => s.owner === host.id && s.visual === "canister"),
    removed = (id: number) =>
      events.some((e) => e.type === "remove" && e.ids.includes(id));
  let sequence = 0;
  const input = (action: object = {}) =>
      host.input({ ...idleInput(), sequence: ++sequence, aim: 0, ...action }),
    walk = async (point: { x: number; y: number }, reach: number) => {
      const end = Date.now() + 5500;
      while (distance(p(), point) > reach) {
        assert(Date.now() < end, "actual peer movement");
        const d = distance(p(), point);
        input({ moveX: (point.x - p().x) / d, moveY: (point.y - p().y) / d });
        await new Promise((r) => setTimeout(r, 25));
      }
      input();
      await wait(() => p().ack >= sequence, "actual movement stop view");
    },
    pause = async () => {
      host.setMatchPaused(true);
      await wait(() => !!ally.view?.matchPaused, "shared pause");
    },
    resume = async () => {
      host.setMatchPaused(false);
      await wait(() => !!host.view && !host.view.matchPaused, "shared resume");
      input();
    };
  try {
    const join = {
      name: "Native Grenadier host",
      classId: "soldier" as const,
      mode: options.mode ?? "short",
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
    const starting = options.late ? 27 : options.mode === "raid" ? 12 : 3;
    if (options.prepare) options.prepare(host);
    else assert.equal(p().sp, starting);
    const skills = [
      "soldier-ballistics-1",
      ids.entry,
      ...(options.variant ? [ids[options.variant], ids.pitch] : []),
      ...(options.late ? [ids.pin, ids.kick, ids.return] : []),
    ];
    for (const item of skills) {
      host.purchase({ kind: "skill", item });
      await wait(
        () => p().skills.includes(item),
        "real purchase and separate acknowledged view " + item,
      );
    }
    const remaining = p().sp;
    assert.equal(
      remaining,
      starting -
        skills.reduce(
          (n, id) =>
            n +
            ({
              [ids.entry]: 2,
              [ids.skim]: 2,
              [ids.contact]: 2,
              [ids.pitch]: 3,
              [ids.pin]: 3,
              [ids.kick]: 3,
              [ids.return]: 6,
              "soldier-ballistics-1": 1,
            }[id] ?? 0),
          0,
        ),
    );
    ally.purchase({ kind: "skill", item: ids.entry });
    await new Promise((r) => setTimeout(r, 50));
    assert(
      !ally
        .view!.players.find((p) => p.id === ally.id)!
        .skills.includes(ids.entry),
    );
    host.start();
    await wait(() => ally.view?.phase === "combat", "combat");
    const ammo = p().ammo,
      eAt = p().eAt;
    if (!options.late) {
      const approach = grenadeApproach(
        p(),
        runtimeArena(host.view!.arenaId, "normal"),
      );
      await walk(approach, 9);
      input({ technique1: true, aim: approach.aim });
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "soldier-fuse" && c.owner === host.id,
          ),
        "shared actual hand",
      );
      await pause();
      const tick = ally.view!.combatTick,
        until = p().kit.grenadierFuseUntil,
        at = p().kit.grenadierRecoveryAt;
      ally.room!.send("pauseMatch", false);
      ally.room!.send("endMatch");
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(ally.view!.combatTick, tick);
      assert.equal(ally.view!.phase, "combat");
      await late.connect(
        { ...join, name: "Late medic", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await wait(() => !!late.view?.matchPaused, "late shared pause");
      assert(
        late.view!.classCues.some(
          (c) => c.kind === "soldier-fuse" && c.owner === host.id,
        ),
      );
      assert.equal(
        late.view!.players.find((p) => p.id === late.id)!.skills.length,
        0,
      );
      input({ technique1: true, technique2: true, fire: true, reload: true });
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(p().ammo, ammo);
      assert.equal(p().kit.grenadierFuseUntil, until);
      assert.equal(ally.view!.combatTick, tick);
      await resume();
      input({
        [options.variant ? "technique2" : "technique1"]: true,
        aim: approach.aim,
      });
      await wait(
        () => canisters().length > 0,
        "actual owner-only flight event",
      );
      const first = canisters()[0];
      await wait(
        () =>
          !!ally.view?.classCues.some(
            (c) => c.kind === "soldier-grenade-contact" && c.owner === host.id,
          ),
        "shared actual cover contact",
      );
      await pause();
      assert.equal(p().ammo, ammo);
      assert.equal(p().eAt, eAt);
      assert.equal(p().kit.grenadierRecoveryAt, at);
      for (const cue of ally.view!.classCues.filter((c) =>
        c.kind.startsWith("soldier-grenade"),
      ))
        for (const key of ["pinUsed", "kicked", "caught", "proof", "required"])
          assert(!(key in cue));
      if (options.variant === "contact")
        await wait(
          () => removed(first.id),
          "impact removes actual owner flight",
        );
      if (options.variant !== "contact")
        assert(
          first.expires > host.view!.combatTick && !removed(first.id),
          "host exits with a live actual canister",
        );
      host.endMatch();
      await wait(
        () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
        "host exit to every actual peer",
      );
      await wait(() => removed(first.id), "actual owner removal");
      assert(
        !other.some(
          (e) =>
            e.type === "shots" &&
            e.shots.some((s) => s.owner === host.id && s.visual === "canister"),
        ),
      );
      assert(
        !other.some((e) => e.type === "remove" && e.ids.includes(first.id)),
      );
      for (const s of [host, ally, late]) {
        assert(!s.view!.classCues.some((c) => c.kind === "soldier-fuse"));
        assert.deepEqual(
          s.view!.players.find((p) => p.id === host.id)!.skills,
          skills,
        );
      }
      return {
        ordinaryStartingSP: starting,
        actualPurchases: skills.length,
        remainingSP: remaining,
        actualCoverContact: true,
        ownerOnlyFlightAndRemoval: true,
        sharedFeedbackOmitsHandlingRights: true,
        pauseDiscardsRequests: true,
        nonHostPauseAndEndRejected: true,
        lateObserverReceivesHandWithoutOwnership: true,
        hostExitRemovesActualCanister: true,
        ammoUnchanged: true,
        variant: options.variant ?? "plain",
        noCheckpointUploaded: true,
      };
    }
    input({ technique1: true });
    await wait(() => p().kit.grenadierHolding === true, "late hand");
    input({ reload: true });
    await wait(
      () => p().kit.grenadierPinnedUntil! > host.view!.combatTick,
      "actual re-pin",
    );
    await pause();
    const at = p().kit.grenadierRecoveryAt,
      pocket = p().kit.grenadierPinnedUntil,
      tick = ally.view!.combatTick;
    await late.connect(
      { ...join, name: "Late medic", classId: "medic" },
      { roomId: host.room!.roomId },
    );
    await wait(() => !!late.view?.matchPaused, "late pinned observation");
    assert(
      late.view!.players.find((q) => q.id === host.id)!.kit
        .grenadierPinnedUntil === pocket,
    );
    input({ technique1: true });
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(ally.view!.combatTick, tick);
    await resume();
    input({ technique1: true });
    await wait(
      () => p().kit.grenadierHolding === true,
      "same stored fuse resumes",
    );
    const until = p().kit.grenadierFuseUntil;
    input({ technique2: true });
    await wait(() => canisters().length > 0, "actual short-cast event");
    const first = canisters()[0];
    await wait(
      () =>
        canisters().some((s) => s.id === first.id && s.vx === 0 && s.vy === 0),
      "actual grounded short cast",
    );
    const beforeKick = canisters().length;
    input({ technique2: true, aim: Math.PI });
    await wait(
      () =>
        canisters()
          .slice(beforeKick)
          .some((s) => s.id === first.id && s.vx < 0),
      "same actual kick",
    );
    await wait(
      () =>
        canisters()
          .slice(beforeKick)
          .some((s) => s.id === first.id && s.vx === 0 && s.vy === 0),
      "actual kick ground",
    );
    const grounded = canisters()
      .filter((s) => s.id === first.id)
      .at(-1)!;
    if (distance(p(), grounded) > 43) await walk(grounded, 43);
    input({ technique1: true });
    await wait(
      () => p().kit.grenadierHolding === true && removed(first.id),
      "actual catch removal plus acknowledged hand",
    );
    assert.equal(p().kit.grenadierFuseUntil, until);
    assert.equal(p().kit.grenadierRecoveryAt, at);
    input({ technique1: true, aim: -Math.PI / 2 });
    await wait(
      () => new Set(canisters().map((s) => s.id)).size === 2,
      "actual same-charge rethrow",
    );
    const second = canisters().find((s) => s.id !== first.id)!;
    assert.equal(second.expires, until);
    await pause();
    assert(
      second.expires > host.view!.combatTick && !removed(second.id),
      "host exits with live rethrow",
    );
    host.endMatch();
    await wait(
      () => [host, ally, late].every((s) => s.view?.phase === "defeat"),
      "late paused host exit",
    );
    await wait(() => removed(second.id), "rethrow actual removal");
    assert(
      !other.some(
        (e) =>
          e.type === "shots" &&
          e.shots.some((s) => s.owner === host.id && s.visual === "canister"),
      ),
    );
    assert(
      !other.some(
        (e) =>
          (e.type === "remove" && e.ids.includes(first.id)) ||
          (e.type === "remove" && e.ids.includes(second.id)),
      ),
    );
    assert.equal(p().ammo, ammo);
    return {
      controlledLateBudget: 27,
      actualPurchases: skills.length,
      remainingSP: remaining,
      realPeers: true,
      oneCanisterThroughRePinKickCatchRethrow: true,
      actualCatchAndHostFlightRemovals: true,
      remainingFuseAndRecoveryExact: true,
      ownerOnlyTrajectoriesAndRemovals: true,
      latePauseObservedWithoutOwnership: true,
      noCheckpointUploaded: true,
    };
  } finally {
    host.close();
    ally.close();
    late.close();
  }
}
