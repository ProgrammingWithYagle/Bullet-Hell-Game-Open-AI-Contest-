import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import type { View } from "../../src/shared/view.ts";
import type { Event } from "../../src/shared/protocol.ts";
import type { FlakBurstCue } from "../../src/shared/heavy-flak.ts";
import { heavyWait, type HeavyFlakAdapter } from "./heavy-flak-flow.ts";
import {
  heavyTraverseFlow,
  type TraverseVariant,
} from "./heavy-traverse-flow.ts";
export async function heavyTraverseWorkerFlow(
  code: string,
  variant: TraverseVariant,
) {
  const wrapper =
      "import{parentPort}from'node:worker_threads';globalThis.self={};globalThis.postMessage=m=>parentPort.postMessage(m);" +
      code +
      "\nparentPort.on('message',m=>self.onmessage({data:m}));parentPort.postMessage({type:'ready'});",
    worker = new Worker(
      new URL(
        "data:text/javascript;base64," +
          Buffer.from(wrapper).toString("base64"),
      ),
      { execArgv: [] },
    );
  let ready = false,
    current: View | undefined,
    error: unknown,
    serial = 0,
    pauseVersion = 0,
    pauseSignal: { value: boolean; combatTick: number } | undefined;
  const events: Event[] = [],
    purchases: any[] = [],
    bursts = new Map<number, FlakBurstCue>();
  worker.on("message", (m) => {
    if (m.type === "ready") ready = true;
    if (m.type === "view") {
      current = m.view;
      for (const c of current!.classCues)
        if (c.kind === "heavy-flak-burst") bursts.set(c.id, structuredClone(c));
    }
    if (m.type === "events") events.push(...m.events);
    if (m.type === "purchaseResult") purchases.push(m);
    if (m.type === "pauseState") {
      pauseVersion++;
      pauseSignal = m;
    }
    if (m.type === "error") error = m;
  });
  worker.on("error", (e) => (error = e));
  const view = () => {
      assert(!error, JSON.stringify(error));
      return current;
    },
    p = () => view()!.players.find((p) => p.id === "solo")!;
  try {
    await heavyWait(() => {
      assert(!error, JSON.stringify(error));
      return ready;
    }, "whole optimized Heavy worker ready");
    worker.postMessage({
      type: "init",
      settings: {
        mode: variant === "spade" || variant === "floating" ? "raid" : "short",
        seed: 41,
        difficulty: "normal",
        maxPlayers: 1,
        arenaSelection: "fixed",
        openingArenaId: "gatehouse",
      },
      name: "Hux",
      classId: "heavy",
    });
    await heavyWait(() => !!view(), "ordinary Heavy worker lobby");
    const adapter: HeavyFlakAdapter = {
      owner: "solo",
      view,
      events,
      bursts,
      input: (input) => worker.postMessage({ type: "input", input }),
      purchase: async (item) => {
        const id = "heavy-worker-" + ++serial;
        worker.postMessage({
          type: "purchase",
          request: { id, kind: "skill", item },
        });
        await heavyWait(
          () => purchases.some((r) => r.id === id) && p().skills.includes(item),
          "actual worker purchase result and separate ownership view",
        );
        assert(purchases.find((r) => r.id === id).ok);
      },
      start: async () => {
        worker.postMessage({ type: "start" });
        await heavyWait(
          () => view()?.phase === "combat",
          "ordinary worker start",
        );
      },
      pause: async (value) => {
        const before = pauseVersion;
        worker.postMessage({ type: "pause", value });
        await heavyWait(
          () =>
            pauseVersion > before &&
            pauseSignal?.value === value &&
            !!view() &&
            (value
              ? view()!.combatTick === pauseSignal.combatTick
              : view()!.combatTick >= pauseSignal.combatTick),
          "actual worker pause acknowledgment plus separate view",
        );
      },
    };
    const result = await heavyTraverseFlow(adapter, variant);
    return {
      ...result,
      workerPatched: false,
      wholeOptimizedWorkerExecuted: true,
      actualAcceptedPurchases: purchases.filter((r) => r.ok).length,
      noResumeOrTestingCommands: true,
    };
  } finally {
    await worker.terminate();
  }
}
