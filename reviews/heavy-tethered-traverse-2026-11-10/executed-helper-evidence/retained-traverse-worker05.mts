import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { idleInput, validInput, type Shot } from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/protocol.ts";
import type { View } from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/view.ts";
import { restWait } from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/tests/helpers/sniper-rest-flow.ts";
import{earnedTraverseFlow}from'./retained-traverse-flow05.mts';import{menuAcquirer}from'./retained-traverse-menu.mts';type FuzeHandling='loose'|'spade'|'floating';
import type { FlakBurstCue } from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/src/shared/heavy-flak.ts";
import type { ObservedRestShot } from "../../../../../../OneDrive/Documents/ChatGPT/OpenAI Multiplayer Game Contest (Bullet Hell)/tests/helpers/sniper-rest-raid-policy.ts";
export async function earnedTraverseWorkerFlow(code: string,handling:FuzeHandling) {
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
    view: View | undefined,
    error: unknown,
    sequence = 0,
    serial = 0,
    paused = false, pauseTick=0,menu:any;
  const purchases: any[] = [],
    observed = new Map<number, ObservedRestShot>(),
    emitted: Shot[] = [],
    removed = new Set<number>(), bursts=new Map<number,any>(),privateEvents:any[]=[];
  worker.on("error", (e) => (error = e));
  worker.on("message", (m) => {
    if (m.type === "ready") ready = true;
    if (m.type === "view") {view = m.view;for(const c of view!.classCues)if(c.kind==="heavy-flak-burst"||c.kind==="heavy-flak-seam-contacts")bursts.set(c.id,structuredClone(c));}
    if (m.type === "error") error = m;
    if (m.type === "pauseState") {paused = m.value;pauseTick=m.combatTick;}
    if (m.type === "purchaseResult") purchases.push(m);
    if (m.type === "events")
      for (const e of m.events) {
        if(e.type==='private-class-cues')privateEvents.push(structuredClone(e));
        if (e.type === "shots")
          for (const s of e.shots) {
            observed.set(s.id, { ...s, seenAt: view?.combatTick ?? 0 });
            if (s.owner === "solo") emitted.push(s);
          }
        if (e.type === "remove")
          for (const id of e.ids) {
            removed.add(id);
            observed.delete(id);
          }
      }
  });
  try {
    await restWait(() => ready, "native worker ready");
    worker.postMessage({
      type: "init",
      settings: {
        mode: "short",
        seed: 41,
        difficulty: "baby",
        maxPlayers: 1,
        arenaSelection: "fixed",
        openingArenaId: "gatehouse",
      },
      name: "Hux",
      classId: "heavy",
    });
    menu=await menuAcquirer({id:"solo",get view(){return view;}});
    const result = await earnedTraverseFlow(
      {
        id: "solo",acquire:menu.acquire,
        view: () => {
          if (error) throw Error(JSON.stringify(error));
          return view;
        },
        input: (a) => {
          const input = {
            ...idleInput(),
            sequence: ++sequence,
            clientTick: view?.combatTick ?? 0,
            aim: 0,
            ...a,
          };
          assert(validInput(input));
          worker.postMessage({ type: "input", input });
          return sequence;
        },
        start: () => worker.postMessage({ type: "start" }),
        vote: (index) => worker.postMessage({ type: "vote", index }),
        request: async (request) => {
          const n = purchases.length;
          worker.postMessage({
            type: "purchase",
            request: { id: "heavy-handling-worker-" + ++serial, ...request },
          });
          await restWait(() => {
            const out = purchases[n],
              p = view?.players.find((p) => p.id === "solo");
            return (
              !!out &&
              (!out.ok ||
                (request.kind === "skill"
                  ? !!p?.skills.includes(request.item)
                  : request.kind === "weapon"
                    ? p?.weapon === request.item
                    : true))
            );
          }, "purchase response plus separate authoritative view");
          return purchases[n];
        },
        pause: (value) => worker.postMessage({ type: "pause", value }),
        paused: () => paused && view?.combatTick===pauseTick,
        observedShots: () => [...observed.values()],
        emittedShots: () => emitted,
        bursts:()=>[...bursts.values()],
        privateEvents:()=>privateEvents,
        removed: (id) => removed.has(id),
      },
      handling,
    );
    return {
      ...result,
      sourceBoundMenuDOMAtActual3And9:true,menuObservations:menu.observations,workerPatched: false,
      wholeOptimizedWorkerExecuted: true,
    };
  } finally {
    await menu?.close();await worker.terminate();
  }
}
