import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { heavyTraversePeerFlow } from "./helpers/heavy-traverse-peer-flow.ts";
for (const mode of ["loose", "spade", "floating"] as const)
  test(
    "real non-host Heavy " +
      mode +
      " peers keep paid physical shots owner-only and obey Soldier host exit",
    { timeout: 20000 },
    async () => {
      const { server, httpServer } = createGameServer();
      await server.listen(0, "127.0.0.1");
      const address = httpServer.address();
      assert(address && typeof address === "object");
      try {
        const result = await heavyTraversePeerFlow(
          "http://127.0.0.1:" + address.port,
          mode,
        );
        assert(
          result.passed &&
            result.ownerWasRoomHost === false &&
            result.actualHostExit &&
            result.nonHostPauseAndEndRejected &&
            result.lateObserverWithoutOwnership &&
            result.ownerOnlyFriendlyFlightAndRemoval,
        );
      } finally {
        await server.gracefullyShutdown(false);
      }
    },
  );
