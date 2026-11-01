import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, data, type Player } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  maximumPersonalShield,
  shieldCapacityBonus,
  startingShieldFraction,
} from "../src/shared/recovery-policy.ts";
import {
  CONTENT_REVISION,
  PROTOCOL,
  idleInput,
  type ClassId,
} from "../src/shared/protocol.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { skillMapLayout } from "../src/client/ui/skill-map.ts";
import { menuBundle, menuEnvironment } from "./helpers/menu-fixture.ts";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
const issued =
  "15da4f590d2f2041f065732e48498551543beab9818f1f187df710d5de521d34";
function buy(g: Game, p: Player, depth: number) {
  const cl = data.classes.find((c) => c.id === p.classId)!,
    path = cl.branches[2].subbranches[2];
  p.totalSp = Math.max(p.totalSp, (depth * (depth + 1)) / 2);
  for (const n of data.skills
    .filter(
      (s) =>
        s.classId === p.classId &&
        s.subbranchId === path.id &&
        s.depth <= depth,
    )
    .toSorted((a, b) => a.depth - b.depth))
    if (!p.skills.includes(n.id))
      assert(g.transact(p.id, { id: n.id, kind: "skill", item: n.id }).ok);
}
function built(classId: ClassId, difficulty: string, depth = 6) {
  const g = new Game({ mode: "endless", difficulty, maxPlayers: 1 }),
    p = g.addPlayer("solo", "Bram", classId);
  buy(g, p, depth);
  return { g, p };
}
test("two existing paths retain all IDs, prices, prerequisites and old bonuses, with bounded capacity unlocked at depths three, five and six", () => {
  for (const id of ["heavy", "tank"] as const) {
    const cl = data.classes.find((c) => c.id === id)!,
      path = cl.branches[2].subbranches[2];
    assert.equal(path.nameKey, "shieldPath." + id + ".name");
    assert.equal(skillMapLayout(id).nodes.length, 54);
    for (const [depth, bonus] of [
      [2, 0],
      [3, id === "heavy" ? 0.15 : 0.25],
      [5, id === "heavy" ? 0.3 : 0.5],
      [6, id === "heavy" ? 0.5 : 0.75],
    ]) {
      const { g, p } = built(id, "normal", depth);
      assert(Math.abs((g.stats(p).effects.shieldCapacity ?? 0) - bonus) < 1e-9);
      assert.equal(
        p.skills.reduce((n, s) => n + g.skillCost(s), 0),
        (depth * (depth + 1)) / 2,
      );
      assert(g.stats(p).effects.maxHealth > 0);
    }
  }
  assert.equal(data.skills.length, 432);
  assert.equal(
    data.skills.filter((s) => "shieldCapacity" in s.effects).length,
    6,
  );
});
test("capacity applies after difficulty and before final rounding across both classes, every difficulty and every investment stage", () => {
  for (const id of ["heavy", "tank"] as const)
    for (const [difficulty, multiplier] of [
      ["baby", 1],
      ["easy", 1],
      ["normal", 1],
      ["hard", 0.75],
      ["insane", 0.5],
      ["hellish", 0],
    ] as const)
      for (const depth of [0, 2, 3, 5, 6]) {
        const { g, p } = built(id, difficulty, depth),
          bonus = g.stats(p).effects.shieldCapacity ?? 0;
        g.start();
        const v = viewOf(g, p.id).players[0],
          expected = Math.floor(p.maxHealth * multiplier * (1 + bonus));
        assert.equal(
          v.maxShield,
          expected,
          id + "/" + difficulty + "/" + depth,
        );
        assert.equal(
          v.shield,
          Math.floor(expected * startingShieldFraction(id)),
        );
      }
  for (const id of ["soldier", "medic", "mage", "engineer", "assassin"])
    assert.equal(maximumPersonalShield("normal", 100, id, 999), 100);
  assert.equal(shieldCapacityBonus("heavy", 100), 0.5);
  assert.equal(shieldCapacityBonus("tank", 100), 0.75);
  assert.equal(shieldCapacityBonus("tank", -3), 0);
  assert.equal(shieldCapacityBonus("tank", Number.NaN), 0);
});
test("capacity purchases increase the limit without refilling existing shields, and unearned or foreign class nodes cannot be injected by purchases", () => {
  const g = new Game(),
    p = g.addPlayer("solo", "Hux", "heavy");
  p.shield = 7;
  buy(g, p, 3);
  assert.equal(p.shield, 7);
  assert(g.maximumShield(p) > p.maxHealth);
  const foreign = data.skills.find((s) => s.id === "tank-bastion-path-2-3")!;
  assert.equal(
    g.transact(p.id, { id: "foreign", kind: "skill", item: foreign.id }).ok,
    false,
  );
  const unearned = new Game(),
    tank = unearned.addPlayer("tank", "Bram", "tank");
  assert.equal(
    unearned.transact(tank.id, { id: "skip", kind: "skill", item: foreign.id })
      .ok,
    false,
  );
});
test("all shield sources share the expanded capacity and excess cannot absorb damage; Hellish remains entirely empty", () => {
  for (const id of ["heavy", "tank"] as const)
    for (const difficulty of ["normal", "hard", "insane", "hellish"]) {
      const { g, p } = built(id, difficulty);
      g.start();
      const cap = g.maximumShield(p);
      p.shield = cap / 2;
      p.supplyShield = 500;
      p.supplyShieldUntil = 1e9;
      g.classKits.protect(p.id, 500, 0, 1e9, g.combatTick);
      p.invulnerableUntil = 0;
      g.damage(p, cap + 10, false);
      assert(Math.abs(p.health - (p.maxHealth - 10)) < 1e-6);
      assert.equal(viewOf(g, p.id).players[0].shield, 0);
      if (difficulty === "hellish") {
        g.phase = "shop";
        p.coins = 1000;
        const plate = data.supplies.find((s) => s.effect === "shield")!;
        assert.equal(
          g.transact(p.id, { id: "plates", kind: "supply", item: plate.id })
            .reason,
          "shieldsDisabled",
        );
        assert.equal(p.coins, 1000);
      }
    }
});
test("known protocol44 saves migrate exactly and restored builds calculate their expanded cap while signed online and unknown revisions stay strict", () => {
  const g = new Game({ mode: "raid", difficulty: "hard", maxPlayers: 1 }),
    p = g.addPlayer("solo", "Bram", "tank");
  buy(g, p, 3);
  p.coins = 723;
  const old = g.offlineCheckpoint()!;
  old.contentRevision = issued;
  old.protocolVersion = 44;
  const restored = Game.restoreOffline(old),
    save = restored.offlineCheckpoint()!;
  assert.equal(save.contentRevision, CONTENT_REVISION);
  assert.equal(save.protocolVersion, PROTOCOL);
  assert.deepEqual(save.player, old.player);
  assert.deepEqual(save.settings, old.settings);
  assert(
    restored.maximumShield(restored.players.get("solo")!) > p.maxHealth * 0.75,
  );
  for (const bad of [
    { ...old, contentRevision: "f".repeat(64) },
    { ...old, serverOnly: true },
    { ...old, transactions: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad));
  assert.throws(() =>
    Game.restoreAuthoritative({
      ...g.authoritativeCheckpoint(),
      contentRevision: issued,
    }),
  );
  const profile = freshProfile();
  profile.contentRevision = issued;
  profile.settings.combatLayout = "separate";
  const after = parseProfile(JSON.stringify(profile));
  assert.deepEqual(after.settings, profile.settings);
  assert.deepEqual(after.controls, profile.controls);
  assert.equal(after.contentRevision, CONTENT_REVISION);
});
test("both skill views expose the localized shield path and capacity help in every catalog", async (context) => {
  const env = menuEnvironment(context),
    ui = await menuBundle(context, "src/client/content-text.ts");
  assert(
    ui.skillBehavior("heavy-endurance-path-2-3").includes("shieldPath.help"),
  );
  assert(
    !ui
      .skillBehavior("medic-preservation-path-2-3")
      .includes("shieldPath.help"),
  );
  for (const l of data.locales) {
    const m = JSON.parse(
      readFileSync("locales/" + l.id + ".json", "utf8"),
    ).messages;
    for (const key of [
      "stat.shieldCapacity",
      "shieldPath.heavy.name",
      "shieldPath.tank.name",
      "shieldPath.help",
    ])
      assert(typeof m[key] === "string" && m[key].length > 0);
    assert.notEqual(m["shieldPath.heavy.name"], m["shieldPath.tank.name"]);
  }
  assert.equal(env.saved.size, 0);
});
const wait = async (check: () => boolean) => {
  const end = Date.now() + 7000;
  while (!check()) {
    assert(Date.now() < end, "Shield specialization did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
};
test(
  "actual Heavy and Tank peers replicate purchased capacity, shared shielding and Hellish denial",
  { timeout: 25000 },
  async () => {
    const { server, httpServer } = createGameServer({ audience: "testing" });
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    try {
      for (const difficulty of ["normal", "hellish"]) {
        const a = new Session(endpoint),
          b = new Session(endpoint);
        try {
          const options = {
            name: "Hux",
            classId: "heavy" as const,
            mode: "raid" as const,
            difficulty,
            openingBossId: "chain-colossus" as const,
          };
          await a.connect(options);
          await b.connect(
            { ...options, name: "Bram", classId: "tank" },
            { roomId: a.room!.roomId },
          );
          await wait(() => a.view?.players.length === 2);
          const g = liveRooms.get(a.room!.roomId)!.game;
          buy(g, g.players.get(a.id)!, 3);
          buy(g, g.players.get(b.id)!, 3);
          a.start();
          await wait(() => b.view?.phase === "combat");
          g.boss.deadline = g.boss.staggerUntil = 1e9;
          await wait(() =>
            [a, b].every((s) =>
              s.view?.players.every(
                (p) => p.maxShield === g.maximumShield(g.players.get(p.id)!),
              ),
            ),
          );
          if (difficulty === "normal") {
            assert(a.view!.players.every((p) => p.maxShield > p.maxHealth));
            b.input({ ...idleInput(), sequence: 1, ultimate: true });
            await wait(() => g.players.get(b.id)!.ultimateAt > g.combatTick);
            await wait(() =>
              a.view!.players.some(
                (p) => p.classId === "heavy" && p.shield > p.maxHealth,
              ),
            );
            assert(a.view!.players.every((p) => p.shield <= p.maxShield));
          } else
            assert(
              a.view!.players.every((p) => p.shield === 0 && p.maxShield === 0),
            );
        } finally {
          await b.close();
          await a.close();
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
