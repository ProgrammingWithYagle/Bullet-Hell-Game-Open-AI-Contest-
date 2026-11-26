import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { grenadierIds as ids } from "../src/shared/soldier-grenadier.ts";
import { grenadeWorkerFlow } from "./helpers/grenadier-worker-flow.ts";
const bundle = async (testing: boolean) =>
  (
    await build({
      entryPoints: ["src/client/offline.worker.ts"],
      bundle: true,
      minify: true,
      write: false,
      platform: "browser",
      format: "esm",
      define: {
        __GA_TESTING_BUILD__: String(testing),
        "import.meta.env.DEV": "false",
      },
      logLevel: "silent",
    })
  ).outputFiles[0].text;
for (const testing of [false, true]) {
  for (const variant of [undefined, "skim", "contact"] as const)
    test(
      "optimized " +
        (testing ? "testing" : "public") +
        " Grenadier " +
        (variant ?? "plain") +
        " worker uses fresh actual budget purchases, ordinary walking, physical contact, finite fuse and pause",
      { timeout: 20000 },
      async () => {
        const r = await grenadeWorkerFlow(await bundle(testing), {
          mode: variant ? "raid" : "short",
          variant,
        });
        assert(r.actualCoverContact && r.actualExplosionAndRemoval);
      },
    );
  for (const choice of [ids.pin, ids.sling])
    test(
      "optimized " +
        (testing ? "testing" : "public") +
        " Grenadier " +
        choice +
        " worker handles the same late canister through kick/catch/rethrow in a controlled legal27SP local fixture",
      { timeout: 20000 },
      async () => {
        const g = new Game({
          mode: "endless",
          seed: 41,
          maxPlayers: 1,
          arenaSelection: "fixed",
          openingArenaId: "gatehouse",
        });
        g.encounter = 9;
        const p = g.addPlayer("solo", "Mara", "soldier");
        for (const item of [
          "soldier-ballistics-1",
          ids.entry,
          ids.skim,
          ids.pitch,
          choice,
          ids.kick,
          ids.return,
        ])
          assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
        const checkpoint = g.offlineCheckpoint();
        assert(checkpoint);
        assert(
          (
            await grenadeWorkerFlow(await bundle(testing), {
              checkpoint,
              late: true,
            })
          ).rethrowRetainsFuse,
        );
      },
    );
}
