import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { openId, keyedId } from "../src/shared/heavy-traverse.ts";
import { earnedClutchHandlingWorkerFlow } from "./helpers/heavy-clutch-handling-worker-flow.ts";
// Representative transport contracts: Open primary, stable Keyed Spade, calibrated Keyed Floating. All six combinations are covered by Game and exact-served Short reviews.
for (const testing of [false, true])
  for (const [mode, handling] of [
    ["loose", openId],
    ["spade", keyedId],
    ["floating", keyedId],
  ] as const)
    test(
      "whole unmodified " +
        (testing ? "testing" : "public") +
        " worker earns Raid12→20 for " +
        mode +
        " " +
        handling,
      { timeout: 300000 },
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
          result = await earnedClutchHandlingWorkerFlow(
            code,
            mode,
            handling,
            "raid",
          );
        assert(
          result.passed &&
            result.workerPatched === false &&
            result.wholeOptimizedWorkerExecuted &&
            result.sourceBoundMenuDOMAtActual12And20 &&
            result.actualHandlingPurchaseAt === 20,
        );
        assert.deepEqual(result.actualEarnedSequence, [12, 20]);
        assert.equal(result.actualBossClears, 1);
        assert.equal(result.spentSkillSP, mode === "loose" ? 9 : 11);
      },
    );
