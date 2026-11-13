import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { sniperRestPeerFlow } from "./helpers/sniper-rest-peer-flow.ts";
test("real Field Rest peers earn an ordinary first Raid clear, observe an empty fixed site, return/claim/Clear one paid round and remove actual rest on host exit", async () => {
  const { server, httpServer } = createGameServer();
  await server.listen(0, "127.0.0.1");
  const address = httpServer.address();
  assert(address && typeof address === "object");
  try {
    const result = await sniperRestPeerFlow("http://127.0.0.1:" + address.port);
    assert(
      result.actualFirstBossClear &&
        result.actualReservedRoundReturned &&
        result.hostExitRemovesActualEmptyRest &&
        result.lateObserverWithoutOwnership,
    );
  } finally {
    await server.gracefullyShutdown(false);
  }
});
