import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { sniperPeerFlow } from "./helpers/sniper-peer-flow.ts";
test(
  "real ordinary Short Sniper peers retain paid sight, owner-only live flight/removal, pause, late observation and host-exit authority",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    try {
      assert(
        (await sniperPeerFlow("http://127.0.0.1:" + address.port))
          .hostExitRemovesActualLiveShot,
      );
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
