import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "@colyseus/sdk";
import { createGameServer } from "../src/server/index.ts";
import { liveRooms } from "../src/server/GraveRoom.ts";
import { Session } from "../src/client/session.ts";
import { Game } from "../src/shared/game.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { encounterPhases } from "../src/shared/encounter-policy.ts";
import { PROTOCOL, CONTENT_REVISION } from "../src/shared/protocol.ts";
import {
  bellChainPosition,
  type BellChain,
} from "../src/shared/bell-return-chain.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";

const issued =
  "6f97c9a4f3aabc87e6875b99e18aba60f667335d501ec50e94d215a1f8bc806c";
const chain = (g: Game) =>
  g.bossCues().find((q): q is BellChain => q.kind === "bell-chain");
async function wait(check: () => boolean) {
  const until = Date.now() + 8000;
  while (!check()) {
    assert(Date.now() < until, "Return-chain state did not replicate");
    await new Promise((r) => setTimeout(r, 15));
  }
}
function advance(g: Game, check: () => boolean) {
  for (let n = 0; n < 2000 && !check(); n++) g.step();
  assert(check(), "Authoritative return-chain state missing");
}

test("issued36 Practice/profile progress migrates to37; foreign revisions, forged online state and authoritative imports remain strict", () => {
  const g = createPracticeGame(
      { mode: "endless", openingBossId: "bellringer", seed: 491 },
      "Mara",
      "soldier",
      "crazed",
    ),
    save = g.offlineCheckpoint()!,
    old = {
      ...structuredClone(save),
      protocolVersion: 36,
      contentRevision: issued,
    };
  const restored = Game.restoreOffline(old).offlineCheckpoint()!;
  assert.equal(PROTOCOL, 40);
  assert.notEqual(CONTENT_REVISION, issued);
  assert.equal(restored.protocolVersion, PROTOCOL);
  assert.equal(restored.contentRevision, CONTENT_REVISION);
  for (const key of [
    "player",
    "completedBossForms",
    "selectedContract",
    "settings",
  ] as const)
    assert.deepEqual(restored[key], save[key]);
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
  "real owner and observer see the same phase-crossing advanced throw, return warning, damaged/broken head and unbroken Crazed return",
  { timeout: 45000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, "127.0.0.1");
    const address = httpServer.address();
    assert(address && typeof address === "object");
    const endpoint = "http://127.0.0.1:" + address.port;
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
            protocolVersion: 36,
            contentRevision,
          }),
          /versionMismatch/,
        );
      for (const difficulty of ["insane", "hellish"]) {
        const a = new Session(endpoint),
          b = new Session(endpoint);
        try {
          const options = {
            name: "Host",
            classId: "soldier" as const,
            mode: "endless" as const,
            difficulty,
            openingBossId: "bellringer" as const,
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
          advance(g, () => chain(g)?.state === "windup");
          const locked = structuredClone(chain(g)!);
          assert.equal(locked.maxHealth, difficulty === "hellish" ? 65 : 45);
          assert.equal(locked.at - locked.beganAt, 39);
          assert.equal(locked.returnAt - locked.returnWarnAt, 36);
          g.boss.health =
            g.boss.maxHealth *
            (encounterPhases(g.boss.id, g.boss.variant)[1].healthThreshold -
              0.001);
          g.step();
          assert.equal(g.boss.phase, 1);
          const validate = (q: BellChain) => {
            for (const key of [
              "originX",
              "originY",
              "endX",
              "endY",
              "at",
              "outwardEndAt",
              "returnWarnAt",
              "returnAt",
              "until",
              "damage",
              "maxHealth",
            ] as const)
              assert.equal(q[key], locked[key]);
          };
          await wait(() =>
            [a, b].every(
              (s) =>
                s.view?.boss.phase === 1 &&
                s.view.bossCues.some(
                  (q) => q.kind === "bell-chain" && q.id === locked.id,
                ),
            ),
          );
          for (const s of [a, b])
            validate(
              s.view!.bossCues.find(
                (q) => q.kind === "bell-chain" && q.id === locked.id,
              ) as BellChain,
            );
          advance(g, () => chain(g)?.state === "rewarn");
          assert(g.director.weakPoints().some((q) => q.id === locked.id));
          await wait(() =>
            [a, b].every((s) =>
              s.view?.bossCues.some(
                (q) =>
                  q.kind === "bell-chain" &&
                  q.id === locked.id &&
                  q.state === "rewarn",
              ),
            ),
          );
          assert.equal(
            g.director.hitWeakPoint(10, g.combatTick, locked.id),
            10,
          );
          g.step();
          await wait(() =>
            [a, b].every((s) =>
              s.view?.bossCues.some(
                (q) =>
                  q.kind === "bell-chain" &&
                  q.id === locked.id &&
                  q.health === locked.maxHealth - 10,
              ),
            ),
          );
          if (difficulty === "insane") {
            assert.equal(
              g.director.hitWeakPoint(999, g.combatTick, locked.id),
              locked.maxHealth - 10,
            );
            g.step();
            await wait(() =>
              [a, b].every((s) =>
                s.view?.bossCues.some(
                  (q) =>
                    q.kind === "bell-chain" &&
                    q.id === locked.id &&
                    q.state === "broken" &&
                    q.health === 0,
                ),
              ),
            );
            assert(!g.director.weakPoints().some((q) => q.id === locked.id));
            advance(g, () => !chain(g));
          } else {
            advance(
              g,
              () =>
                chain(g)?.state === "return" &&
                g.combatTick > locked.returnAt + 2,
            );
            await wait(() =>
              [a, b].every((s) =>
                s.view?.bossCues.some(
                  (q) =>
                    q.kind === "bell-chain" &&
                    q.id === locked.id &&
                    q.state === "return",
                ),
              ),
            );
            for (const s of [a, b]) {
              const q = s.view!.bossCues.find(
                (q) => q.kind === "bell-chain" && q.id === locked.id,
              ) as BellChain;
              validate(q);
              const p = bellChainPosition(q, s.view!.combatTick);
              assert(Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6);
              assert.equal(q.health, locked.maxHealth - 10);
            }
            assert(!g.director.weakPoints().some((q) => q.id === locked.id));
          }
          g.boss.health = 0;
          g.step();
          await wait(() =>
            [a, b].every(
              (s) =>
                s.view?.phase !== "combat" &&
                !s.view?.bossCues.some((q) => q.kind === "bell-chain"),
            ),
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
