import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { sniperWithdrawalWorkerFlow } from "./helpers/sniper-withdrawal-worker-flow.ts";
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

for (const testing of [false, true])
  test(
    "whole optimized " +
      (testing ? "testing" : "public") +
      " Prepared Withdrawal worker earns27SP through two actual Raid clears, settles a real pair, fires and physically returns for one paid second release with extended recovery",
    async () => {
      const result = await sniperWithdrawalWorkerFlow(await bundle(testing));
      assert(
        result.actualFirstBossClear &&
          result.actualSecondBossClear &&
          result.actualSecondManualShot &&
          result.extendedRecoveryByOneOrdinaryDuration &&
          result.actualWalkingAwayAndBackToFixedSite &&
          result.actualShotAndRemoval &&
          result.wholeOptimizedWorkerExecuted,
      );
    },
  );
