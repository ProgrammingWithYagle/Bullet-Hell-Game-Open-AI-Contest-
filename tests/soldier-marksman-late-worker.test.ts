import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Game } from "../src/shared/game.ts";
import { marksmanIds as ids } from "../src/shared/soldier-marksman.ts";
import { lateWorkerFlow } from "./helpers/marksman-late-worker.ts";
for (const testing of [false, true])
  for (const fork of [ids.carom, ids.line])
    test(
      "late " +
        fork +
        " optimized " +
        (testing ? "testing" : "public") +
        " worker holds a real reload, earns relay and pays Twin atomically in a controlled legal27SP local fixture",
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
          fork,
          ids.pair,
          ids.reserve,
          ids.relay,
          ids.twin,
        ])
          assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
        const checkpoint = g.offlineCheckpoint();
        assert(checkpoint);
        const bundle = await build({
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
        });
        assert(
          (await lateWorkerFlow(bundle.outputFiles[0].text, checkpoint))
            .earnedRelay,
        );
      },
    );
