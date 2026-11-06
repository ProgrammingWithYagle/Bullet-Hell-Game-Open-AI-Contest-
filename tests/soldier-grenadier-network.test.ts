import test from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { grenadePeerFlow } from "./helpers/grenadier-peer-flow.ts";
for (const variant of [undefined, "skim", "contact"] as const)
  test(
    "real Grenadier " +
      (variant ?? "plain") +
      " peers use ordinary purchases and movement, owner-only physical flight and paused late/host-exit authority",
    { timeout: 20000 },
    async () => {
      const { server, httpServer } = createGameServer();
      await server.listen(0, "127.0.0.1");
      const address = httpServer.address();
      assert(address && typeof address === "object");
      try {
        assert(
          (
            await grenadePeerFlow("http://127.0.0.1:" + address.port, {
              mode: variant ? "raid" : "short",
              variant,
            })
          ).hostExitRemovesActualCanister,
        );
      } finally {
        await server.gracefullyShutdown(false);
      }
    },
  );
test(
  "real late Grenadier peers serialize one finite charge through re-pin/kick/catch/rethrow in an explicitly controlled legal27SP authority fixture",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    try {
      const result = await grenadePeerFlow("http://127.0.0.1:" + address.port, {
        mode: "endless",
        variant: "skim",
        late: true,
        prepare: (host) => {
          const g = liveRooms.get(host.room!.roomId)!.game;
          g.encounter = 9;
          for (const p of g.players.values())
            p.totalSp = (g as any).skillBudget(9);
        },
      });
      assert(result.remainingFuseAndRecoveryExact);
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
