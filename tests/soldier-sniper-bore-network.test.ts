import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { sniperBorePeerFlow } from "./helpers/sniper-bore-peer-flow.ts";
for (const variant of ["through", "exit"] as const)
  test(
    "real Raid12SP Bore " +
      variant +
      " peers use three actual purchases, physical narrow cover, owner streams, pause, late observation and host exit",
    { timeout: 20000 },
    async () => {
      const { server, httpServer } = createGameServer();
      await server.listen(0, "127.0.0.1");
      const address = httpServer.address();
      assert(address && typeof address === "object");
      try {
        const result = await sniperBorePeerFlow(
          "http://127.0.0.1:" + address.port,
          variant,
        );
        assert(
          result.variant === "through"
            ? result.sharedFinitePunctureToBothObservers
            : result.actualHostExitRemovesLiveBore,
        );
      } finally {
        await server.gracefullyShutdown(false);
      }
    },
  );
