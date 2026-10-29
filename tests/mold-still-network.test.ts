import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";
import { randomUUID } from "node:crypto";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { Game } from "../src/shared/game.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import type { MoldPool } from "../src/shared/mold-mixing.ts";
import { aerosolPosition } from "../src/shared/mold-still.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
const issued =
  "6bf9b3f3f87c98e2e552b99e4dbf6ae856b57b3aba032d03a72bcc97c8367cdd";
async function wait(check: () => boolean) {
  const until = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < until, "Still/condensation state did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
}
function advance(g: Game, check: () => boolean) {
  for (let n = 0; n < 2000 && !check(); n++) g.step();
  assert(check(), "Required authoritative still state missing");
}

test("exact issued37 local Practice/profile progress migrates to38 with strict rejection of foreign revisions and online state", () => {
  const g = createPracticeGame(
      { mode: "endless", openingBossId: "alchemist", seed: 491 },
      "Mara",
      "soldier",
      "crazed",
    ),
    save = g.offlineCheckpoint()!,
    old = {
      ...structuredClone(save),
      protocolVersion: 37,
      contentRevision: issued,
    };
  const after = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 40);
  assert.notEqual(CONTENT_REVISION, issued);
  assert.equal(after.protocolVersion, PROTOCOL);
  assert.equal(after.contentRevision, CONTENT_REVISION);
  for (const key of [
    "player",
    "completedBossForms",
    "selectedContract",
    "settings",
  ] as const)
    assert.deepEqual(after[key], save[key]);
  for (const bad of [
    { ...old, contentRevision: "f".repeat(64) },
    { ...old, contentRevision: CONTENT_REVISION },
    { ...old, serverOnly: true },
    { ...old, practiceOnly: false },
    { ...old, players: [] },
    { ...old, transactions: [] },
  ])
    assert.throws(() => Game.restoreOffline(bad), /versionMismatch/);
  assert.throws(() => Game.restoreAuthoritative(old));
  const p = freshProfile();
  p.contentRevision = issued;
  p.settings.showNames = false;
  p.settings.roomChat = false;
  const next = parseProfile(JSON.stringify(p));
  assert.equal(next.contentRevision, CONTENT_REVISION);
  assert.deepEqual(next.settings, p.settings);
  assert.deepEqual(next.controls, p.controls);
});

test(
  "real owner/observer receive isolated phase-crossing column/cloud locks, condensation, spent coolant and cooled apparatus, then encounter cleanup",
  { timeout: 40000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
    const a = new Session(endpoint),
      b = new Session(endpoint);
    try {
      for (const contentRevision of [issued, CONTENT_REVISION])
        await assert.rejects(
          new Client(endpoint).create("grave", {
            name: "Old client",
            classId: "soldier",
            mode: "endless",
            difficulty: "normal",
            visibility: "public",
            createKey: randomUUID(),
            protocolVersion: 37,
            contentRevision,
          }),
          /versionMismatch/,
        );
      const options = {
        name: "Host",
        classId: "soldier" as const,
        mode: "endless" as const,
        difficulty: "hellish",
        openingBossId: "alchemist" as const,
        openingArenaId: "gatehouse",
      };
      await a.connect(options);
      await b.connect(
        { ...options, name: "Observer" },
        { roomId: a.room!.roomId },
      );
      await wait(() => a.view?.players.length === 2);
      a.start();
      await wait(() => b.view?.phase === "combat");
      const g = liveRooms.get(a.room!.roomId)!.game;
      g.boss.deadline = 1e9;
      for (const p of g.players.values()) p.invulnerableUntil = 1e9;
      advance(g, () => g.bossCues().some((q) => q.kind === "mold-still"));
      const column = g.bossCues().find((q) => q.kind === "mold-still");
      assert(column && column.kind === "mold-still");
      assert.equal(column.releases, 2);
      await wait(() =>
        [a, b].every((s) =>
          s.view?.bossCues.some(
            (q) => q.id === column.id && q.kind === "mold-still",
          ),
        ),
      );
      for (const s of [a, b]) {
        const q: NonNullable<Session["view"]>["bossCues"][number] =
          s.view!.bossCues.find((q) => q.id === column.id)!;
        for (const key of [
          "x",
          "y",
          "radius",
          "phase",
          "releases",
          "at",
          "until",
        ])
          assert.equal(Reflect.get(q, key), Reflect.get(column, key));
      }
      advance(g, () =>
        g
          .bossCues()
          .some((q) => q.kind === "mold-aerosol" && q.state === "warning"),
      );
      const cloud = g.bossCues().find((q) => q.kind === "mold-aerosol");
      assert(cloud && cloud.kind === "mold-aerosol");
      assert.equal(cloud.at - cloud.beganAt, 54);
      g.boss.health = g.boss.maxHealth * 0.74;
      g.step();
      assert.equal(g.boss.phase, 1);
      await wait(() =>
        [a, b].every(
          (s) =>
            s.view?.boss.phase === 1 &&
            s.view.bossCues.some(
              (q) => q.id === cloud.id && q.kind === "mold-aerosol",
            ),
        ),
      );
      for (const s of [a, b]) {
        const q: NonNullable<Session["view"]>["bossCues"][number] =
          s.view!.bossCues.find((q) => q.id === cloud.id)!;
        for (const key of [
          "sourceId",
          "fromX",
          "fromY",
          "endX",
          "endY",
          "at",
          "until",
          "damage",
          "count",
          "reflux",
        ])
          assert.equal(Reflect.get(q, key), Reflect.get(cloud, key));
      }
      // Isolate transport of the already real owned apparatus/cloud. Actual recipe
      // baiting and health/prediction paths have separate real-authority tests.
      const owner = g.director.services.alchemist;
      for (const key of ["flasks", "pools", "reactors", "reactions"])
        Reflect.set(owner, key, []);
      Reflect.set(owner, "gas", null);
      Reflect.set(owner, "walk", null);
      Reflect.set(owner, "stage", "idle");
      owner.nextSignatureAt = 1e9;
      while (g.combatTick < cloud.at + 20) g.step();
      const active = g.bossCues().find((q) => q.id === cloud.id);
      assert(
        active && active.kind === "mold-aerosol" && active.state === "travel",
      );
      const context = (
        g as unknown as { signatureContext(): SignatureContext }
      ).signatureContext();
      const addWater = (p: { x: number; y: number }) => {
        const w: MoldPool = {
          kind: "mold-pool",
          id: context.id(),
          x: p.x,
          y: p.y,
          radius: 78,
          reagent: "water",
          index: 0,
          beganAt: g.combatTick,
          at: g.combatTick,
          until: g.combatTick + 300,
          spentAt: 0,
        };
        (Reflect.get(owner, "pools") as MoldPool[]).push(w);
        return w;
      };
      const at = aerosolPosition(active, g.combatTick),
        w = addWater(at);
      g.step();
      assert(
        g
          .bossCues()
          .some(
            (q) =>
              q.id === cloud.id &&
              q.kind === "mold-aerosol" &&
              q.state === "quenched",
          ),
      );
      await wait(() =>
        [a, b].every(
          (s) =>
            s.view?.bossCues.some(
              (q) =>
                q.id === cloud.id &&
                q.kind === "mold-aerosol" &&
                q.state === "quenched",
            ) &&
            s.view.bossCues.some(
              (q) => q.id === w.id && q.kind === "mold-pool" && q.spentAt > 0,
            ),
        ),
      );
      addWater(column);
      g.step();
      await wait(() =>
        [a, b].every((s) =>
          s.view?.bossCues.some(
            (q) =>
              q.id === column.id &&
              q.kind === "mold-still" &&
              q.state === "cooled",
          ),
        ),
      );
      g.boss.health = 0;
      g.step();
      await wait(() =>
        [a, b].every(
          (s) =>
            s.view?.phase !== "combat" &&
            !s.view?.bossCues.some(
              (q) => q.kind === "mold-still" || q.kind === "mold-aerosol",
            ),
        ),
      );
    } finally {
      await b.close();
      await a.close();
      await server.gracefullyShutdown(false);
    }
  },
);
