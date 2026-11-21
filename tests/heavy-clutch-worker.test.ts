import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { heavyClutchWorkerFlow } from "./helpers/heavy-clutch-worker-flow.ts";
for (const testing of [false, true])
  for (const mode of ["loose", "spade", "floating"] as const)
    test(
      "whole unmodified optimized " +
        (testing ? "testing" : "public") +
        " Clutch " +
        mode +
        " lifts actual feed, forfeits slots and discards paused commands",
      { timeout: 20000 },
      async () => {
        const code = (
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
          ).outputFiles[0].text,
          result = await heavyClutchWorkerFlow(code, mode);
        assert(
          result.passed &&
            result.workerPatched === false &&
            result.wholeOptimizedWorkerExecuted &&
            result.actualAcceptedPurchases === (mode === "loose" ? 3 : 4),
        );
      },
    );
