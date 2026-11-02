// Preserve issued fifteen-boss Story prototype behavior through the restore-only compatibility path.
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { CONTENT_REVISION } from "../src/shared/protocol.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { storyProgress } from "../src/client/story-progress.ts";
import { idleInput, type Vec } from "../src/shared/protocol.ts";
import { menuBundle } from "./helpers/menu-fixture.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  LamplightWatch,
  lamplightRules,
  lamplightOrders,
  lamplightExposed,
  lamplightSafe,
  type LampShadow,
} from "../src/shared/lamplight-watch.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import {
  distance,
  segmentRect,
  segmentCircle,
} from "../src/shared/geometry.ts";
function fixture(form = "normal", phase = 0) {
  const d = new LamplightWatch();
  let serial = 1;
  const hurt: { id: string; amount: number }[] = [],
    c: SignatureContext = {
      tick: 0,
      bossId: "lamplighter",
      boss: { x: 800, y: 250 },
      radius: 58,
      bounds: { x: 0, y: 0, width: 1600, height: 1000 },
      obstacles: [],
      targets: [
        { id: "a", x: 600, y: 650, oldX: 600, oldY: 650 },
        { id: "b", x: 1100, y: 700, oldX: 1100, oldY: 700 },
      ],
      variant: form as "normal",
      brutal: form !== "normal",
      phase,
      damageScale: form === "normal" ? 1 : 2,
      id: () => serial++,
      damage: (id, amount) => hurt.push({ id, amount }),
      spawnRat() {},
    };
  const step = (until: number) => {
    for (let n = c.tick + 1; n <= until; n++) {
      c.tick = n;
      d.step(c);
    }
  };
  return { d, c, hurt, step };
}
test("Lamplighter gives every active survivor a reachable refuge and each phase a distinct watch", () => {
  for (let phase = 0; phase < 4; phase++) {
    const f = fixture("normal", phase);
    f.d.cast(f.c);
    const shadows = f.d
      .cues()
      .filter((q): q is LampShadow => q.kind === "service-lamp-shadow");
    assert.equal(shadows.length, 3);
    assert.equal(f.d.weakPoints().length, 3);
    assert(shadows.every((q) => q.at === 84));
    for (const p of f.c.targets) {
      const q = shadows.find((q) => q.owner === p.id)!;
      assert(q);
      assert(distance(p, { x: q.goalX, y: q.goalY }) <= 210);
      assert(
        lamplightSafe(
          { x: q.goalX, y: q.goalY },
          { ...q, x: q.endX, y: q.endY },
        ),
      );
    }
    assert.equal(
      lamplightOrders(phase, 0, false, false).length,
      [1, 1, 2, 3][phase],
    );
  }
});
test("Only actual exposure hurts, the first pulse frame ignores harmless motion and overlapping refuges cover a swept route", () => {
  assert.equal(
    lamplightExposed({ x: 20, y: 30 }, { x: 180, y: 30 }, [
      { x: 0, y: 0, width: 110, height: 100 },
      { x: 90, y: 0, width: 110, height: 100 },
    ]),
    false,
  );
  assert.equal(
    lamplightExposed({ x: 20, y: 30 }, { x: 180, y: 30 }, [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 110, y: 0, width: 90, height: 100 },
    ]),
    true,
  );
  const f = fixture();
  f.d.cast(f.c);
  const q = f.d
    .cues()
    .find(
      (q): q is LampShadow =>
        q.kind === "service-lamp-shadow" && q.owner === "a",
    )!;
  const p = f.c.targets[0];
  p.x = q.goalX;
  p.y = q.goalY;
  p.oldX = 20;
  p.oldY = 20;
  f.c.targets[1].x = f.c.targets[1].oldX = 30;
  f.c.targets[1].y = f.c.targets[1].oldY = 30;
  f.step(84);
  assert.deepEqual(
    f.hurt.map((q) => q.id),
    ["b"],
  );
  p.oldX = 30;
  p.oldY = 30;
  f.step(85);
  assert.deepEqual(
    f.hurt.map((q) => q.id),
    ["b", "a"],
  );
  f.step(110);
  assert.equal(f.hurt.length, 2);
});
test("Banking a wick widens and anchors only its linked promised shadows; queued returns retain phase and reset clears every owner", () => {
  const f = fixture("crazed", 1);
  f.d.cast(f.c);
  f.step(20);
  const wick = f.d.weakPoints()[0],
    before = f.d
      .cues()
      .filter((q): q is LampShadow => q.kind === "service-lamp-shadow");
  assert.equal(f.d.hitWick(wick.id, 999, f.c.tick), 35);
  for (const q of f.d
    .cues()
    .filter((q): q is LampShadow => q.kind === "service-lamp-shadow")) {
    const old = before.find((p) => p.id === q.id)!;
    if (q.lamp === wick.id) {
      assert(q.banked);
      assert.equal(q.width, old.width + lamplightRules.growth);
      assert.equal(q.x, q.endX);
      assert(lamplightSafe({ x: old.goalX, y: old.goalY }, q));
    } else assert.equal(q.width, old.width);
  }
  f.c.phase = 3;
  f.step(180);
  assert(f.d.cues().every((q) => q.phase === 1));
  f.step(324);
  assert(f.d.cues().every((q) => q.phase === 1));
  f.c.paused = true;
  f.step(325);
  assert.deepEqual(f.d.diagnostics(), { shapes: 0, queued: 0, hitGroups: 0 });
});
test("Lamplighter keeps candles and refuges bounded and each sampled base-Tank goal reachable on every map/difficulty/form/phase", () => {
  let cases = 0;
  for (const map of data.arenas)
    for (const difficulty of data.difficulties)
      for (const form of ["normal", "brutal", "crazed"] as const)
        for (let phase = 0; phase < 4; phase++) {
          const g = createPracticeGame(
            {
              mode: "endless",
              openingBossId: "lamplighter",
              openingArenaId: map.id,
              arenaSelection: "fixed",
              difficulty: difficulty.id,
            },
            "Shadow geometry",
            "tank",
            form,
          );
          g.start();
          const c = {
              ...(
                g as unknown as { signatureContext(): SignatureContext }
              ).signatureContext(),
              phase,
              brutal: form !== "normal",
              variant: form,
              damage() {},
            },
            d = new LamplightWatch();
          d.cast(c);
          const b = c.bounds!,
            cues = d.cues();
          assert.equal(d.weakPoints().length, 3);
          for (const q of cues) {
            if (q.kind === "service-lamp-wick") {
              assert(
                q.x - 30 >= b.x &&
                  q.y - 30 >= b.y &&
                  q.x + 30 <= b.x + b.width &&
                  q.y + 30 <= b.y + b.height,
              );
              assert(
                c.obstacles.every((o) => segmentRect(q, q, o, 30) === null),
              );
              assert(
                (c.hazardCircles ?? []).every(
                  (p) => distance(p, q) > p.radius + 30,
                ),
              );
            } else {
              assert(
                q.x >= b.x &&
                  q.y >= b.y &&
                  q.x + q.width <= b.x + b.width + 1e-7 &&
                  q.y + q.height <= b.y + b.height + 1e-7,
              );
              if (q.kind === "service-lamp-shadow") {
                const p = c.targets.find((p) => p.id === q.owner)!;
                const goal = { x: q.goalX, y: q.goalY };
                assert(distance(p, goal) <= 210);
                assert(
                  c.obstacles.every((o) => segmentRect(p, goal, o, 9) === null),
                );
                assert(
                  (c.hazardCircles ?? []).every(
                    (pit) =>
                      segmentCircle(p, goal, pit, pit.radius + 9) === null,
                  ),
                );
                assert(lamplightSafe(goal, { ...q, x: q.endX, y: q.endY }));
              }
            }
          }
          cases++;
        }
  assert.equal(cases, 432);
});

test("Dense legal-position samples and fifty survivors all receive bounded direct-walk refuges in Normal and Hellish", () => {
  let samples = 0,
    fullTeams = 0;
  for (const map of data.arenas)
    for (const difficulty of ["normal", "hellish"]) {
      const g = createPracticeGame(
        {
          mode: "endless",
          openingBossId: "lamplighter",
          openingArenaId: map.id,
          arenaSelection: "fixed",
          difficulty,
        },
        "Refuge grid",
        "tank",
        "crazed",
      );
      g.start();
      const base = (
          g as unknown as { signatureContext(): SignatureContext }
        ).signatureContext(),
        b = base.bounds!,
        points: Vec[] = [];
      for (let x = b.x + 12; x <= b.x + b.width - 12; x += 72)
        for (let y = b.y + 12; y <= b.y + b.height - 12; y += 72) {
          const p = { x, y };
          if (
            base.obstacles.every((o) => segmentRect(p, p, o, 10) === null) &&
            (base.hazardCircles ?? []).every(
              (q) => distance(q, p) > q.radius + 10,
            )
          )
            points.push(p);
        }
      assert(points.length >= 50);
      for (let phase = 0; phase < 4; phase++)
        for (let start = 0; start < points.length; start += 50) {
          const targets = points.slice(start, start + 50).map((p, i) => ({
              ...p,
              id: "grid-" + String(i).padStart(2, "0"),
              oldX: p.x,
              oldY: p.y,
            })),
            c = { ...base, phase, targets, damage() {} },
            d = new LamplightWatch();
          d.cast(c);
          const shadows = d
            .cues()
            .filter((q): q is LampShadow => q.kind === "service-lamp-shadow");
          assert.equal(shadows.length, Math.max(3, targets.length));
          assert(d.cues().length <= 54);
          if (targets.length === 50) {
            fullTeams++;
            assert(d.weakPoints().every((q) => q.maxHealth === 60));
          }
          for (const p of targets) {
            const q = shadows.find((q) => q.owner === p.id)!;
            assert(q);
            const goal = { x: q.goalX, y: q.goalY };
            assert(distance(p, goal) <= 210);
            assert(
              distance(p, goal) / g.movementSpeed(g.players.get("solo")!) <
                lamplightRules.warning,
            );
            assert(
              base.obstacles.every((o) => segmentRect(p, goal, o, 9) === null),
            );
            assert(
              (base.hazardCircles ?? []).every(
                (pit) => segmentCircle(p, goal, pit, pit.radius + 9) === null,
              ),
            );
            assert(lamplightSafe(goal, { ...q, x: q.endX, y: q.endY }));
            samples++;
          }
        }
    }
  assert(samples > 5000);
  assert(fullTeams >= 48);
});

test("Late activation is protected until its next complete warning and each later watch has a fresh hit budget", () => {
  const f = fixture("normal", 2);
  f.d.cast(f.c);
  for (const p of f.c.targets) {
    p.x = p.oldX = 30;
    p.y = p.oldY = 30;
  }
  f.step(83);
  f.c.targets.push({ id: "late", x: 30, y: 30, oldX: 30, oldY: 30 });
  f.step(110);
  assert.equal(f.hurt.filter((q) => q.id === "late").length, 0);
  assert.equal(f.hurt.filter((q) => q.id === "a").length, 1);
  f.step(144);
  const later = f.d.cues().filter((q) => q.wave === 1);
  assert(later.length);
  assert(later.every((q) => q.at === 228));
  for (const p of f.c.targets) {
    p.x = p.oldX = 1550;
    p.y = p.oldY = 950;
  }
  f.step(228);
  assert.equal(f.hurt.filter((q) => q.id === "late").length, 1);
  assert.equal(f.hurt.filter((q) => q.id === "a").length, 2);
});

test("Actual Soldier shots bank only the struck candle without boss damage and sixty full Crazed watches release their ownership", () => {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "lamplighter",
      openingArenaId: "gatehouse",
      difficulty: "normal",
    },
    "Wick shot",
    "soldier",
    "normal",
  );
  g.start();
  g.step();
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  const wick = g.director.services.lamplighter.weakPoints()[0],
    before = g.boss.health;
  assert(wick);
  p.x = p.oldX = wick.x;
  p.y = p.oldY = wick.y + 65;
  for (
    let i = 1;
    i <= 44 &&
    g.director.services.lamplighter.weakPoints().some((q) => q.id === wick.id);
    i++
  ) {
    g.submitInput(p.id, {
      ...idleInput(),
      sequence: i,
      fire: true,
      aim: -Math.PI / 2,
    });
    g.step();
  }
  assert(
    !g.director.services.lamplighter.weakPoints().some((q) => q.id === wick.id),
  );
  assert.equal(g.boss.health, before);
  assert(
    g.director.services.lamplighter
      .cues()
      .some(
        (q) =>
          q.kind === "service-lamp-shadow" && q.lamp === wick.id && q.banked,
      ),
  );
  assert(g.director.services.lamplighter.weakPoints().length >= 2);
  const f = fixture("crazed", 3);
  for (let cycle = 0; cycle < 60; cycle++) {
    f.c.auxiliaryBusy = false;
    f.d.nextSignatureAt = f.c.tick;
    f.d.cast(f.c);
    f.c.auxiliaryBusy = true;
    f.step(f.c.tick + 750);
    assert.deepEqual(f.d.diagnostics(), { shapes: 0, queued: 0, hitGroups: 0 });
  }
});

test("The announced schedule matches canonical phases and each wave sounds exactly once", () => {
  const boss = data.bosses.find((b) => b.id === "lamplighter")!;
  for (const form of ["normal", "brutal", "crazed"] as const) {
    const phases = form === "normal" ? boss.phases : boss.variants[form].phases;
    for (let phase = 0; phase < phases.length; phase++) {
      const f = fixture(form, phase);
      let sounds = 0;
      f.c.warn = () => sounds++;
      f.d.cast(f.c);
      assert.equal(
        f.d.nextSignatureAt,
        Math.ceil(phases[phase].attacks[0].interval * 30),
      );
      f.c.auxiliaryBusy = true;
      f.step(750);
      assert.equal(
        sounds,
        lamplightOrders(phase, 0, form !== "normal", form === "crazed").length,
      );
    }
  }
});

test("Native shadow drawing preserves promised endpoints, group marks and disposable candle ownership", async (context) => {
  const { ServicePresentation } = await menuBundle(
      context,
      "src/client/service-presentation.ts",
      { phaser: "export default {};" },
    ),
    calls: { method: string; args: unknown[] }[] = [],
    images: unknown[] = [];
  const chain = () => {
    const value: object = new Proxy(
      {},
      {
        get:
          (_target, key) =>
          (...args: unknown[]) => {
            calls.push({ method: String(key), args });
            return value;
          },
      },
    );
    return value;
  };
  const scene = {
      textures: { exists: () => true },
      add: {
        image: (...args: unknown[]) => {
          images.push(args);
          return chain();
        },
      },
    },
    art = new ServicePresentation(scene),
    f = fixture("normal", 1);
  f.d.cast(f.c);
  f.step(15);
  const shadows = f.d
    .cues()
    .filter((q): q is LampShadow => q.kind === "service-lamp-shadow");
  art.draw(chain(), chain(), f.d.cues(), 15, f.c.bounds, true, true);
  assert.equal(images.length, 3);
  for (const q of shadows)
    assert(
      calls.some(
        (c) =>
          c.method === "strokeRect" &&
          JSON.stringify(c.args) ===
            JSON.stringify([q.endX, q.endY, q.width, q.height]),
      ),
    );
  art.draw(chain(), chain(), [], 16, f.c.bounds, true, true);
  assert.equal(calls.filter((c) => c.method === "destroy").length, 3);
});

test("Fifteen editions describe the actual watches and banked refuges, while issued Story progress migrates without weakening online identity", () => {
  for (const language of data.locales) {
    const messages = JSON.parse(
      readFileSync("locales/" + language.id + ".json", "utf8"),
    ).messages;
    assert.equal(
      new Set(
        Array.from(
          { length: 4 },
          (_, i) => messages["boss.lamplighter.phase." + i],
        ),
      ).size,
      4,
    );
    assert(messages["boss.lamplighter.phaseHint.0"].includes("2.8"));
    assert(messages["boss.lamplighter.phaseHint.2"].includes("4.8"));
    assert(messages["boss.lamplighter.brutalHelp"].includes("6"));
    assert(messages["boss.lamplighter.crazedHelp"].includes("4.8"));
    assert(messages["boss.lamplighter.lore"].length > 80);
    assert(messages["ui.readingSaved"].length > 10);
    assert(messages["ui.readingSessionOnly"].length > 10);
  }
  const issued =
      "77b0d920d24b5f96e422f6697e8346e04cc88159920954261508b30d878d0264",
    g = new Game({ mode: "story", maxPlayers: 1 }, true);
  g.addPlayer("solo", "Reader", "medic");
  const save = g.offlineCheckpoint()!;
  save.contentRevision = issued;
  save.protocolVersion = 47;
  assert.deepEqual(Game.restoreOffline(save).storyChoices, []);
  assert.throws(
    () =>
      Game.restoreAuthoritative({
        ...g.authoritativeCheckpoint(),
        contentRevision: issued,
      }),
    /versionMismatch/,
  );
  const profile = freshProfile();
  profile.contentRevision = issued;
  profile.locale = "ar";
  profile.runs = [
    {
      runId: "lamp-old-ending",
      playerId: "solo",
      mode: "story",
      difficulty: "normal",
      classId: "medic",
      clears: 15,
      rescues: 0,
      firstEncounter: 0,
      campaignClears: 15,
      bossIds: ["constable"],
      teamClears: 15,
      combatTicks: 3000,
      fullCampaign: true,
      memorial: false,
      storyChoices: Array(14).fill(2),
    },
  ];
  const recovered = parseProfile(JSON.stringify(profile));
  assert.equal(recovered.contentRevision, CONTENT_REVISION);
  assert.deepEqual([...storyProgress(recovered).endings], [2]);
  assert.equal(recovered.locale, "ar");
});
