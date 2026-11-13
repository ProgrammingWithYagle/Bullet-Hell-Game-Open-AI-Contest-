import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { sniperRestWorkerFlow } from "./helpers/sniper-rest-worker-flow.ts";
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
      " Field Rest worker earns20SP through an actual first Raid clear, returns to its empty site, claims one paid round and manually releases after carried settling",
    async () => {
      const result = await sniperRestWorkerFlow(await bundle(testing));
      assert(
        result.actualFirstBossClear &&
          result.actualWalkingAwayAndBackToFixedSite &&
          result.actualShotAndRemoval &&
          result.wholeOptimizedWorkerExecuted,
      );
    },
  );
