import test from "node:test";
import assert from "node:assert/strict";
import { Game, type Player } from "../src/shared/game.ts";
import { idleInput, HZ } from "../src/shared/protocol.ts";
import { viewOf } from "../src/shared/view.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const fixtures = {
  machinery: ["engineer-machinery-1", "engineer-machinery-coil-1"],
  traps: ["engineer-traps-1", "engineer-traps-key-1"],
  builder: [
    "engineer-builder-1",
    "engineer-builder-hinge-1",
    "engineer-builder-repair-1",
  ],
};
function input(
  g: Game,
  p: Player,
  extra: Partial<ReturnType<typeof idleInput>>,
) {
  assert(
    g.submitInput(p.id, {
      ...idleInput(),
      sequence: p.ack + 1,
      aim: -Math.PI / 2,
      ...extra,
    }),
  );
  g.step();
}
for (const [route, skills] of Object.entries(fixtures))
  test(
    "Ending a live " +
      route +
      " run removes owned work, constructs and technique state from its final snapshot",
    () => {
      const g = new Game({
        mode: "endless",
        seed: 41,
        maxPlayers: 1,
        arenaSelection: "fixed",
        openingArenaId: "gatehouse",
      });
      g.encounter = 9;
      const p = g.addPlayer("solo", "Tamsin", "engineer");
      for (const item of ["engineer-constructs-1", ...skills])
        assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
      assert(g.start());
      input(g, p, { q: true });
      for (let i = 0; i < HZ; i++) g.step();
      input(g, p, {
        technique1: true,
        aim: route === "builder" ? -Math.PI / 4 : -Math.PI / 2,
      });
      assert(g.classCues().length > 0);
      const owned = [...p.skills],
        coins = p.coins,
        totalSp = p.totalSp,
        damage = p.damageDealt;
      assert(g.endByHost());
      const v = viewOf(g, p.id);
      assert.equal(v.phase, "defeat");
      assert.deepEqual(v.classCues, []);
      assert.equal(v.players[0].kit.technique1At ?? 0, 0);
      assert.equal(v.players[0].kit.builderGroups ?? 0, 0);
      for (let i = 0; i < 3 * HZ; i++) g.step();
      assert.deepEqual(g.classCues(), []);
      assert.equal(p.damageDealt, damage);
      assert.deepEqual(p.skills, owned);
      assert.equal(p.coins, coins);
      assert.equal(p.totalSp, totalSp);
      assert(!g.endByHost());
      assert.equal(g.offlineCheckpoint(), null);
    },
  );

test("Ending during committed maintenance cancels repair, without applying health or leaving a repair target in the final view", () => {
  const g = new Game({
    mode: "endless",
    seed: 41,
    maxPlayers: 1,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Tamsin", "engineer");
  for (const item of ["engineer-constructs-1", ...fixtures.builder])
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  g.start();
  input(g, p, { q: true });
  for (let i = 0; i < HZ; i++) g.step();
  const wall = g.classKits.constructs()[0];
  assert(wall?.builder);
  g.classKits.hitConstruct(wall.id, 50);
  input(g, p, { technique2: true });
  assert(g.classCues().some((c) => c.kind === "engineer-builder-work"));
  assert(g.kitStatus(p.id).builderRepairUntil! > g.combatTick);
  const health = p.health,
    damage = p.damageDealt;
  g.endByHost();
  assert.deepEqual(g.classCues(), []);
  assert.equal(g.kitStatus(p.id).builderRepairUntil ?? 0, 0);
  assert.equal(g.kitStatus(p.id).builderRepairTarget ?? 0, 0);
  for (let i = 0; i < HZ; i++) g.step();
  assert.equal(p.health, health);
  assert.equal(p.damageDealt, damage);
});

test(
  "A real paused host exit clears all three Engineer owners for peers and late observers; non-host end requests cannot erase their work",
  { timeout: 20000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    const host = new Session(endpoint),
      trapper = new Session(endpoint),
      builder = new Session(endpoint),
      late = new Session(endpoint),
      peers = [host, trapper, builder, late];
    const wait = async (check: () => boolean, label: string) => {
      const until = Date.now() + 6000;
      while (!check()) {
        assert(Date.now() < until, label);
        await new Promise((r) => setTimeout(r, 12));
      }
    };
    try {
      const options = {
        name: "Tamsin",
        classId: "engineer" as const,
        mode: "endless" as const,
        difficulty: "normal",
        arenaSelection: "fixed" as const,
        openingArenaId: "gatehouse",
      };
      await host.connect(options);
      await trapper.connect(
        { ...options, name: "Trapper" },
        { roomId: host.room!.roomId },
      );
      await builder.connect(
        { ...options, name: "Builder" },
        { roomId: host.room!.roomId },
      );
      const room = liveRooms.get(host.room!.roomId)!,
        g = room.game;
      g.encounter = 9;
      for (const [peer, route] of [
        [host, "machinery"],
        [trapper, "traps"],
        [builder, "builder"],
      ] as const) {
        g.players.get(peer.id)!.totalSp = 27;
        for (const item of ["engineer-constructs-1", ...fixtures[route]]) {
          peer.purchase({ kind: "skill", item });
          await wait(() => g.players.get(peer.id)!.skills.includes(item), item);
        }
      }
      host.start();
      await wait(() => builder.view?.phase === "combat", "combat");
      for (const peer of [host, trapper, builder])
        peer.input({ ...idleInput(), sequence: 1, aim: -Math.PI / 2, q: true });
      await wait(
        () =>
          !!builder.view?.classCues.some(
            (c) => c.kind === "turret" && c.owner === host.id,
          ) &&
          !!builder.view.classCues.some(
            (c) => c.kind === "engineer-charge" && c.owner === trapper.id,
          ) &&
          !!builder.view.classCues.some(
            (c) => c.kind === "wall" && c.builder && c.owner === builder.id,
          ),
        "owned live work",
      );
      trapper.room!.send("endMatch");
      await new Promise((r) => setTimeout(r, 80));
      assert.equal(g.phase, "combat");
      assert(g.classCues().length > 0);
      host.setMatchPaused(true);
      await wait(() => !!builder.view?.matchPaused, "pause");
      await late.connect(
        { ...options, name: "Late observer", classId: "medic" },
        { roomId: host.room!.roomId },
      );
      await wait(
        () => !!late.view?.matchPaused && !!late.view.classCues.length,
        "late live work view",
      );
      const tick = g.combatTick;
      host.endMatch();
      await wait(
        () => !!builder.view?.endedByHost && builder.view.phase === "defeat",
        "owned host exit",
      );
      assert.equal(g.combatTick, tick);
      assert.deepEqual(builder.view!.classCues, []);
      assert.deepEqual(trapper.view!.classCues, []);
      assert.deepEqual(g.classCues(), []);
      await wait(() => late.view?.phase === "defeat", "late final view");
      assert.deepEqual(late.view!.classCues, []);
      assert.equal(
        late.view!.players.find((p) => p.id === builder.id)!.kit
          .builderGroups ?? 0,
        0,
      );
      assert.equal(late.view!.endedByHost, true);
    } finally {
      for (const peer of peers) peer.close();
      await server.gracefullyShutdown(false);
    }
  },
);
