import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { sniperWorkerFlow } from "./helpers/sniper-worker-flow.ts";
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
  for (const variant of ["cover", "cancel"] as const)
    test(
      "optimized " +
        (testing ? "testing" : "public") +
        " Sniper " +
        variant +
        " worker uses ordinary Short purchases, paid planted preparation, manual release/cancel and discarded paused inputs",
      { timeout: 20000 },
      async () => {
        const result = await sniperWorkerFlow(await bundle(testing), variant);
        assert(
          result.oneRoundReservedOnlyOnce ||
            result.paidRoundAndRecoveryRetained,
        );
      },
    );
