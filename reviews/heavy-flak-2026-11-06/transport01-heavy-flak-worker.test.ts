import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { heavyFlakWorkerFlow } from "./helpers/heavy-flak-worker-flow.ts";
for (const testing of [false, true])
  for (const variant of ["cover", "exit", "compact", "frontal"] as const)
    test(
      "whole optimized " +
        (testing ? "testing" : "public") +
        " Heavy " +
        variant +
        " uses actual ordinary purchases, physical flight/burst and discarded paused input",
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
          result = await heavyFlakWorkerFlow(code, variant);
        assert(
          result.passed &&
            result.workerPatched === false &&
            result.actualAcceptedPurchases ===
              (variant === "compact" || variant === "frontal" ? 4 : 2),
        );
      },
    );
