import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { sniperWithdrawalPeerFlow } from "./helpers/sniper-withdrawal-peer-flow.ts";
test("real Prepared Withdrawal peers earn27SP through two ordinary Raid clears, settle a pair, claim one finite paid return, Clear its actual round with recovery debt and remove actual rest on host exit", async () => {
  const { server, httpServer } = createGameServer();
  await server.listen(0, "127.0.0.1");
  const address = httpServer.address();
  assert(address && typeof address === "object");
  try {
    const result = await sniperWithdrawalPeerFlow(
      "http://127.0.0.1:" + address.port,
    );
    assert(
      result.actualFirstBossClear &&
        result.actualSecondBossClear &&
        result.actualPaidReturnDuringRecovery &&
        result.actualReturnRoundCleared &&
        result.clearKeepsExtendedDebt &&
        result.actualReservedRoundReturned &&
        result.hostExitRemovesActualEmptyRest &&
        result.lateObserverWithoutOwnership,
    );
  } finally {
    await server.gracefullyShutdown(false);
  }
});
