import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { sniperBoreWorkerFlow } from "./helpers/sniper-bore-worker-flow.ts";
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
  for (const variant of ["through", "blocked"] as const)
    test(
      "optimized " +
        (testing ? "testing" : "public") +
        " Sniper " +
        variant +
        " worker uses ordinary Raid12SP/three purchases, actual interior cover, paid C settling/manual B release and pause",
      { timeout: 20000 },
      async () => {
        const result = await sniperBoreWorkerFlow(
          await bundle(testing),
          variant,
        );
        assert(
          result.variant === "through"
            ? result.actualNarrowCoverCrossing
            : result.deepCoverRejectsWithoutCrossing,
        );
      },
    );
