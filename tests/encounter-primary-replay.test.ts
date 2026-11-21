import test from "node:test";
import assert from "node:assert/strict";
import { Game, type Player } from "../src/shared/game.ts";
import { HZ, idleInput, implementedClassIds } from "../src/shared/protocol.ts";

function press(
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

// Complete only the enemy for this boundary fixture. Intermission clocks,
// rewards, choices, checkpoints and the next encounter run through Game.
function boundaries(g: Game) {
  g.boss.health = 0;
  g.step();
  const copies: { phase: string; game: Game }[] = [];
  let previous = "",
    steps = 0;
  while (true) {
    if (g.phase !== previous) {
      previous = g.phase;
      const save = g.offlineCheckpoint();
      assert(save);
      const restored = Game.restoreOffline(JSON.parse(JSON.stringify(save)));
      assert.deepEqual(restored.offlineCheckpoint(), save);
      copies.push({ phase: g.phase, game: restored });
    }
    if (g.phase === "loading") break;
    assert(++steps < 5000);
    if (
      ["mutationVote", "contractVote"].includes(g.phase) &&
      !g.votes.has("solo")
    )
      assert(g.vote("solo", 0));
    g.step();
  }
  assert.deepEqual(
    copies.map((c) => c.phase),
    ["mutationVote", "contractVote", "shop", "loading"],
  );
  return [{ phase: "uninterrupted", game: g }, ...copies];
}

function nextCombat(g: Game) {
  let steps = 0;
  while (g.phase !== "combat") {
    assert(++steps < 5000);
    if (
      ["mutationVote", "contractVote"].includes(g.phase) &&
      !g.votes.has("solo")
    )
      assert(g.vote("solo", 0));
    g.step();
  }
  assert.equal(g.encounter, 1);
  return g.players.get("solo")!;
}

for (const classId of implementedClassIds) {
  test(
    classId +
      " starts each fresh encounter ready to fire and keeps identical held-fire results after any safe intermission restore",
    () => {
      const g = new Game({
        mode: "short",
        difficulty: "normal",
        seed: 2209,
        maxPlayers: 1,
        arenaSelection: "fixed",
        openingArenaId: "gatehouse",
      });
      const p = g.addPlayer("solo", "Replay fixture", classId);
      assert(g.start());
      const full = p.ammo;
      press(g, p, { fire: true });
      assert.equal(
        p.ammo,
        full - 1,
        "An actual primary commits before the first boundary",
      );
      assert(p.fireAt > g.combatTick);
      let reference: unknown[] | undefined;
      for (const copy of boundaries(g)) {
        const player = nextCombat(copy.game),
          magazine = player.ammo,
          samples = [];
        for (let i = 0; i <= HZ; i++) {
          press(copy.game, player, { fire: true });
          if (i === 0)
            assert.equal(
              player.ammo,
              magazine - 1,
              copy.phase + ": the refilled primary is ready immediately",
            );
          samples.push(
            structuredClone({
              tick: copy.game.combatTick,
              ammo: player.ammo,
              fireAt: player.fireAt,
              reloadAt: player.reloadAt,
              damage: player.damageDealt,
              bossHealth: copy.game.boss.health,
              shots: [...copy.game.shots.values()],
              kit: copy.game.kitStatus(player.id),
            }),
          );
        }
        if (reference)
          assert.deepEqual(
            samples,
            reference,
            copy.phase +
              ": restoration must not change primary timing, projectiles or outcomes",
          );
        else reference = samples;
      }
    },
  );
}

test("Fresh primary readiness never refreshes Engineer Q, E or ultimate recovery or reconstructs prior work", () => {
  const g = new Game({
    mode: "short",
    difficulty: "normal",
    seed: 2209,
    maxPlayers: 1,
    arenaSelection: "fixed",
    openingArenaId: "gatehouse",
  });
  const p = g.addPlayer("solo", "Tamsin", "engineer");
  assert(g.start());
  press(g, p, { q: true, e: true, ultimate: true, fire: true });
  const recovery = { qAt: p.qAt, eAt: p.eAt, ultimateAt: p.ultimateAt };
  assert(Object.values(recovery).every((at) => at > g.combatTick + HZ));
  assert(g.classCues().some((c) => c.owner === p.id));
  for (const copy of boundaries(g)) {
    const player = nextCombat(copy.game);
    assert.deepEqual(copy.game.classCues(), []);
    press(copy.game, player, { q: true, e: true, ultimate: true });
    assert.deepEqual(
      { qAt: player.qAt, eAt: player.eAt, ultimateAt: player.ultimateAt },
      recovery,
    );
    assert.deepEqual(
      copy.game.classCues(),
      [],
      copy.phase + ": blocked abilities cannot recreate constructs",
    );
  }
});
