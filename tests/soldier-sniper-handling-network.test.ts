import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { sniperHandlingPeerFlow } from "./helpers/sniper-handling-peer-flow.ts";
for (const handling of ["carry", "clear"] as const)
  test(
    "real Raid12SP Sniper " +
      handling +
      " peers use three actual purchases, physical handling, pause, late observation and host-exit authority",
    { timeout: 20000 },
    async () => {
      const { server, httpServer } = createGameServer();
      await server.listen(0, "127.0.0.1");
      const address = httpServer.address();
      assert(address && typeof address === "object");
      try {
        const result = await sniperHandlingPeerFlow(
          "http://127.0.0.1:" + address.port,
          handling,
        );
        assert(
          result.handling === "clear"
            ? result.exactReservedRoundReturned
            : result.hostExitRemovesActualLiveShot,
        );
      } finally {
        await server.gracefullyShutdown(false);
      }
    },
  );
