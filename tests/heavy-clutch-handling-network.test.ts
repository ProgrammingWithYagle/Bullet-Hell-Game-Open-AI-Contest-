import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { openId, keyedId } from "../src/shared/heavy-traverse.ts";
import { earnedClutchHandlingPeerFlow } from "./helpers/heavy-clutch-handling-peer-flow.ts";
for (const [mode, handling] of [
  ["loose", openId],
  ["spade", keyedId],
  ["floating", keyedId],
] as const)
  test(
    "real nonhost Heavy earns Raid12→20 for " +
      mode +
      " " +
      handling +
      " and preserves owner streams/host removal",
    { timeout: 300000 },
    async () => {
      const { server, httpServer } = createGameServer();
      await server.listen(0, "127.0.0.1");
      const address = httpServer.address();
      assert(address && typeof address === "object");
      try {
        const result = await earnedClutchHandlingPeerFlow(
          "http://127.0.0.1:" + address.port,
          mode,
          handling,
          "raid",
        );
        assert(
          result.passed &&
            result.heavyOwnerIsNotRoomHost &&
            result.actualHostExit &&
            result.ownerOnlyFriendlyFlightsAndRemovals &&
            result.actualLatePeerWithoutOwnership &&
            result.nonHostPauseAndEndRejected &&
            result.sourceBoundMenuDOMAtActual12And20,
        );
        assert.deepEqual(result.actualEarnedSequence, [12, 20]);
        assert.equal(result.actualHandlingPurchaseAt, 20);
      } finally {
        await server.gracefullyShutdown(false);
      }
    },
  );
