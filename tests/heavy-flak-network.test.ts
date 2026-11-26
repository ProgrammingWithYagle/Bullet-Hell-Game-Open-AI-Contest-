import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { heavyFlakPeerFlow } from "./helpers/heavy-flak-peer-flow.ts";
for (const variant of ["cover", "exit", "compact", "frontal"] as const)
  test(
    "real Heavy " +
      variant +
      " peers use ordinary SP, owner-only friendly streams, shared actual contact geometry and host authority",
    { timeout: 20000 },
    async () => {
      const { server, httpServer } = createGameServer();
      await server.listen(0, "127.0.0.1");
      const address = httpServer.address();
      assert(address && typeof address === "object");
      try {
        const result = await heavyFlakPeerFlow(
          "http://127.0.0.1:" + address.port,
          variant,
        );
        assert(
          result.passed &&
            result.ownerOnlyFriendlyFlightAndRemoval &&
            result.noCheckpointUploaded,
        );
        if (variant !== "cover")
          assert(
            result.nonHostPauseAndEndRejected &&
              result.lateObserverWithoutOwnership,
          );
      } finally {
        await server.gracefullyShutdown(false);
      }
    },
  );
