import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { sniperHandlingWorkerFlow } from "./helpers/sniper-handling-worker-flow.ts";
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
  for (const variant of ["carry", "clear"] as const)
    test(
      "optimized " +
        (testing ? "testing" : "public") +
        " Sniper " +
        variant +
        " worker uses ordinary Raid12SP/three purchases, real carried settling or chamber return, and discarded paused inputs",
      { timeout: 20000 },
      async () => {
        const result = await sniperHandlingWorkerFlow(
          await bundle(testing),
          variant,
        );
        assert(
          result.variant === "clear"
            ? result.exactReservedRoundReturned
            : result.actualMovementRetainsPreparation,
        );
      },
    );
