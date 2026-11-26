import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { idleInput, HZ } from "../../src/shared/protocol.ts";
import { marksmanRules as rules } from "../../src/shared/soldier-marksman.ts";
/** Execute complete optimized worker bytes; only the native message transport is adapted. */
export async function lateWorkerFlow(code: string, checkpoint: unknown) {
  const wrapper =
    "import{parentPort}from'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
    code +
    "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});";
  const worker = new Worker(
    new URL(
      "data:text/javascript;base64," + Buffer.from(wrapper).toString("base64"),
    ),
    { execArgv: [] },
  );
  let ready = false,
    view: any,
    error: any,
    sequence = 0,
    pauseAt = -1;
  const shots: any[] = [],
    sounds: any[] = [],
    removals: number[] = [];
  worker.on("message", (m) => {
    if (m.type === "ready") ready = true;
    if (m.type === "view") view = m.view;
    if (m.type === "error") error = m;
    if (m.type === "pauseState" && m.value) pauseAt = m.combatTick;
    if (m.type === "events")
      for (const e of m.events) {
        if (e.type === "shots")
          shots.push(...e.shots.filter((s: any) => s.owner === "solo"));
        if (e.type === "sound") sounds.push(e);
        if (e.type === "remove") removals.push(...e.ids);
      }
  });
  worker.on("error", (e) => (error = e));
  const wait = async (check: () => boolean, label: string) => {
    const end = Date.now() + 6000;
    while (!check()) {
      assert(!error, JSON.stringify(error));
      assert(Date.now() < end, label);
      await new Promise((r) => setTimeout(r, 5));
    }
  };
  const input = (action: object) =>
      worker.postMessage({
        type: "input",
        input: {
          ...idleInput(),
          sequence: ++sequence,
          aim: Math.PI,
          ...action,
        },
      }),
    p = () => view.players.find((p: any) => p.id === "solo");
  const pause = async () => {
    worker.postMessage({ type: "pause", value: true });
    await wait(() => pauseAt === view.combatTick, "pause acknowledgment");
  };
  try {
    await wait(() => ready, "worker ready");
    worker.postMessage({ type: "resume", value: checkpoint });
    await wait(() => !!view, "local safe boundary");
    sequence = p().ack ?? 0;
    assert.equal((checkpoint as any).player.totalSp, 27);
    assert(p().sp >= 0);
    assert(p().skills.includes("soldier-marksman-twin-1"));
    assert(!p().kit.soldierRelayUntil);
    assert(!p().kit.soldierPairHeld);
    worker.postMessage({ type: "start" });
    await wait(() => view.phase === "combat", "ordinary start");
    const ammo = p().ammo,
      eAt = p().eAt;
    input({ technique1: true, technique2: true });
    await wait(
      () => p().kit.soldierPairUntil > view.combatTick,
      "first physical B bank",
    );
    await pause();
    const bankTick = view.combatTick,
      bankAt = p().kit.technique1At,
      pairAt = p().kit.technique2At;
    assert.equal(p().ammo, ammo - 2);
    assert(bankAt > bankTick && pairAt > bankTick);
    assert.equal(p().kit.soldierRelayUntil, 0);
    worker.postMessage({ type: "pause", value: false });
    input({ reload: true });
    await wait(() => p().kit.soldierPairHeld, "actual manual Reload reserve");
    await pause();
    const heldTick = view.combatTick,
      heldUntil = p().kit.soldierPairUntil,
      reloadAt = p().reloadAt;
    assert(reloadAt > heldTick);
    assert(heldUntil <= heldTick + Math.ceil(rules.reserveMaximum * HZ));
    input({ technique1: true, technique2: true, fire: true });
    await new Promise((r) => setTimeout(r, 70));
    assert.equal(view.combatTick, heldTick);
    assert.equal(p().ammo, ammo - 2);
    assert.equal(p().kit.soldierPairUntil, heldUntil);
    worker.postMessage({ type: "pause", value: false });
    input({});
    await wait(() => p().reloadAt === 0, "actual full reload completion");
    assert(p().kit.soldierPairUntil > view.combatTick);
    const full = p().ammo;
    input({ technique2: true });
    await wait(
      () => p().kit.soldierRelayUntil > view.combatTick,
      "only second B actual bank earns relay",
    );
    await pause();
    assert.equal(p().ammo, full - 1);
    assert.equal(p().kit.soldierPairUntil, 0);
    assert.equal(p().kit.technique2At, pairAt);
    const relayUntil = p().kit.soldierRelayUntil,
      frozen = view.combatTick;
    assert(relayUntil - frozen <= Math.ceil(rules.relayWindow * HZ));
    input({ technique1: true });
    await new Promise((r) => setTimeout(r, 70));
    assert.equal(view.combatTick, frozen);
    assert.equal(p().ammo, full - 1);
    assert.equal(p().kit.soldierRelayUntil, relayUntil);
    const before = new Set(shots.map((s) => s.id));
    worker.postMessage({ type: "pause", value: false });
    input({ technique1: true, aim: -Math.PI / 2 });
    await wait(() => p().ammo === full - 3, "two actual Twin rounds");
    await wait(
      () =>
        new Set(
          shots
            .filter((s) => !before.has(s.id) && s.vy < -800)
            .map((s) => s.id),
        ).size === 2,
      "separate Twin event message",
    );
    await pause();
    const twin = [
      ...new Map(
        shots
          .filter((s) => !before.has(s.id) && s.vy < -800)
          .map((s) => [s.id, s]),
      ).values(),
    ] as any[];
    assert.equal(twin.length, 2);
    assert(twin.some((s) => s.vx < 0) && twin.some((s) => s.vx > 0));
    assert.equal(p().kit.soldierRelayUntil, 0);
    assert.equal(p().eAt, eAt);
    assert(p().kit.technique1At > bankAt);
    const prior = p().ammo;
    input({ technique1: true });
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(p().ammo, prior);
    assert(!error);
    return {
      actualReloadReserved: true,
      actualReloadCompleted: true,
      earnedRelay: true,
      actualTwinRounds: 2,
      independentTrajectories: true,
      pauseDiscardedRequests: true,
      actualBankAt: bankTick,
      heldTicks: heldUntil - heldTick,
      relayTicks: relayUntil - frozen,
      oldRecovery: bankAt,
      newRecovery: p().kit.technique1At,
      pairRecoveryRetained: true,
      burstUnchanged: true,
      twinIds: twin.map((s) => s.id),
      separateEventMessagesAwaited: true,
    };
  } finally {
    await worker.terminate();
  }
}
