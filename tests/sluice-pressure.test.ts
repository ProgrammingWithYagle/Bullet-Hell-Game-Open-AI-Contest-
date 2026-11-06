// Preserve issued fifteen-boss Story prototype behavior through the restore-only compatibility path.
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { serviceMovement } from "../src/shared/service-director.ts";
import { Prediction } from "../src/client/prediction.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  idleInput,
  CONTENT_REVISION,
  type ClassId,
} from "../src/shared/protocol.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { storyProgress } from "../src/client/story-progress.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  SluicePressure,
  sluiceRules,
  sluiceLanes,
  sluiceLaneRect,
  type SluiceWave,
} from "../src/shared/sluice-pressure.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import {
  segmentRect,
  segmentCircle,
  distance,
} from "../src/shared/geometry.ts";
function fixture(variant = "normal", phase = 0) {
  const d = new SluicePressure();
  let serial = 1;
  const hurt: number[] = [],
    warnings: number[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "sluice-keeper",
    boss: { x: 800, y: 250 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [{ id: "a", x: 30, y: 500, oldX: 30, oldY: 500 }],
    damageScale: variant === "normal" ? 1 : 2,
    brutal: variant !== "normal",
    variant: variant as "normal",
    phase,
    id: () => serial++,
    damage: (_id, amount) => hurt.push(amount),
    spawnRat() {},
    warn: () => warnings.push(c.tick),
  };
  const step = (until: number) => {
    for (let n = c.tick + 1; n <= until; n++) {
      c.tick = n;
      d.step(c);
    }
  };
  return { c, d, hurt, warnings, step };
}
test("Sluice bounds every phase lane and places shootable valves clear of actual cover and lava", () => {
  let cases = 0;
  for (const map of data.arenas)
    for (const difficulty of data.difficulties)
      for (const form of ["normal", "brutal", "crazed"] as const)
        for (let phase = 0; phase < 4; phase++) {
          const g = createPracticeGame(
            {
              mode: "endless",
              openingBossId: "sluice-keeper",
              openingArenaId: map.id,
              arenaSelection: "fixed",
              difficulty: difficulty.id,
            },
            "Geometry",
            "tank",
            form,
          );
          g.start();
          const c = {
            ...(
              g as unknown as { signatureContext(): SignatureContext }
            ).signatureContext(),
            phase,
            variant: form,
            brutal: form !== "normal",
            damage() {},
          };
          const d = new SluicePressure();
          d.cast(c);
          const b = c.bounds!;
          for (let tick = 1; tick <= 75; tick++) {
            c.tick = tick;
            d.step(c);
          }
          for (const q of d.cues()) {
            if (q.kind === "service-sluice-valve") {
              assert(
                q.x - q.radius >= b.x &&
                  q.x + q.radius <= b.x + b.width &&
                  q.y - q.radius >= b.y &&
                  q.y + q.radius <= b.y + b.height,
              );
              assert(
                c.obstacles.every(
                  (o) => segmentRect(q, q, o, q.radius + 2) === null,
                ),
              );
              assert(
                (c.hazardCircles ?? []).every(
                  (p) => distance(p, q) > p.radius + q.radius + 2,
                ),
              );
            } else
              assert(
                q.x >= b.x &&
                  q.y >= b.y &&
                  q.x + q.width <= b.x + b.width + 1e-8 &&
                  q.y + q.height <= b.y + b.height + 1e-8,
              );
          }
          cases++;
        }
  assert.equal(cases, 432);
  const b = { x: 400, y: 300, width: 800, height: 520 };
  for (const lane of sluiceLanes(3, 1)) {
    const q = sluiceLaneRect(b, lane);
    assert(
      q.x >= 400 &&
        q.y >= 300 &&
        q.x + q.width <= 1200 &&
        q.y + q.height <= 820,
    );
  }
});
test("Sluice currents are harmless and only the moving crest contacts once after its own complete warning", () => {
  const f = fixture();
  f.d.cast(f.c);
  f.step(74);
  assert.equal(f.hurt.length, 0);
  const wave = f.d
    .cues()
    .find((q): q is SluiceWave => q.kind === "service-sluice-wave")!;
  assert.equal(wave.at - wave.beganAt, 54);
  assert.equal(wave.at, 75);
  f.step(75);
  assert.deepEqual(f.hurt, [16]);
  f.step(180);
  assert.deepEqual(f.hurt, [16]);
  const cut = fixture();
  cut.d.cast(cut.c);
  cut.step(1);
  const valve = cut.d.weakPoints()[0];
  assert.equal(cut.d.hit(valve.id, 999, 1), sluiceRules.valveHealth);
  assert(
    cut.d
      .cues()
      .every(
        (q) =>
          q.kind !== "service-current" || (q.forceX === 0 && q.forceY === 0),
      ),
  );
  cut.step(180);
  assert.equal(cut.hurt.length, 0);
});
test("Sluice late batches keep their phase and warning, and reset clears all queued/hit ownership", () => {
  const f = fixture("crazed", 1);
  f.d.cast(f.c);
  f.c.phase = 3;
  f.step(153);
  const next = f.d.cues().filter((q) => q.batch === 1);
  assert(next.length > 0);
  assert(next.every((q) => q.phase === 1 && q.beganAt >= 153));
  f.c.paused = true;
  f.step(154);
  assert.deepEqual(f.d.diagnostics(), { shapes: 0, queued: 0, hitGroups: 0 });
});

test("The first crest frame ignores harmless warning motion, while later swept contact remains real", () => {
  const f = fixture();
  f.d.cast(f.c);
  f.step(74);
  f.c.targets[0].oldX = 62;
  f.c.targets[0].x = 68;
  f.step(75);
  assert.equal(f.hurt.length, 0);
  f.c.targets[0].oldX = 68;
  f.step(76);
  assert.equal(f.hurt.length, 1);
});

test("All seven classes share exact authority/prediction current force on every map in Normal and Hellish", () => {
  for (const map of data.arenas)
    for (const difficulty of ["normal", "hellish"])
      for (const cl of data.classes) {
        const g = createPracticeGame(
          {
            mode: "endless",
            openingBossId: "sluice-keeper",
            openingArenaId: map.id,
            arenaSelection: "fixed",
            difficulty,
          },
          "Flow",
          cl.id as ClassId,
          "brutal",
        );
        g.start();
        const p = g.players.get("solo")!;
        p.invulnerableUntil = 1e9;
        g.boss.health = g.boss.maxHealth * 0.2;
        for (let guard = 0; g.boss.phase < 3; guard++) {
          assert(guard < 5);
          g.step();
        }
        g.director.services.sluice.reset(g.combatTick);
        for (let i = 0; i < 104; i++) g.step();
        const b = g.arena.bounds;
        p.x = b.x + b.width * 0.5;
        p.y = b.y + b.height * 0.28;
        p.oldX = p.x;
        p.oldY = p.y;
        const view = viewOf(g, "solo"),
          force = serviceMovement(view.bossCues, p, p.id, g.combatTick);
        assert(Math.hypot(force.x, force.y) <= 90 + 1e-9);
        assert(Math.hypot(force.x, force.y) > 0);
        const prediction = new Prediction();
        prediction.acknowledge(view, p.id);
        for (let i = 1; i <= 35; i++) {
          const input = {
            ...idleInput(),
            sequence: i,
            moveX: -0.6,
            moveY: 0.4,
          };
          prediction.submit(input, viewOf(g, p.id));
          g.submitInput(p.id, input);
          g.step();
          assert(
            Math.abs(prediction.player!.x - p.x) < 1e-6,
            map.id + "/" + difficulty + "/" + cl.id,
          );
          assert(
            Math.abs(prediction.player!.y - p.y) < 1e-6,
            map.id + "/" + difficulty + "/" + cl.id,
          );
        }
      }
});
test("Base Tank escape witnesses reach a dry bank before the first flow using real cover/lava sweeps", () => {
  let checked = 0;
  for (const map of data.arenas)
    for (const difficulty of data.difficulties) {
      const g = createPracticeGame(
        {
          mode: "endless",
          openingBossId: "sluice-keeper",
          openingArenaId: map.id,
          arenaSelection: "fixed",
          difficulty: difficulty.id,
        },
        "Escape",
        "tank",
        "crazed",
      );
      g.start();
      const c = (
          g as unknown as { signatureContext(): SignatureContext }
        ).signatureContext(),
        b = c.bounds!,
        lanes = sluiceLanes(3, 0).map((l) => sluiceLaneRect(b, l));
      const legal = (
        from: { x: number; y: number },
        p: { x: number; y: number },
      ) =>
        p.x >= b.x + 10 &&
        p.y >= b.y + 10 &&
        p.x <= b.x + b.width - 10 &&
        p.y <= b.y + b.height - 10 &&
        c.obstacles.every((o) => segmentRect(from, p, o, 10) === null) &&
        (c.hazardCircles ?? []).every(
          (pit) => segmentCircle(from, p, pit, pit.radius + 10) === null,
        );
      const dry = (p: { x: number; y: number }) =>
        lanes.every((q) => segmentRect(p, p, q, 10) === null);
      for (const lane of lanes) {
        let start: { x: number; y: number } | undefined;
        for (let ring = 0; ring <= Math.max(b.width,b.height) && !start; ring += 18)
          for (let a = 0; a < 16 && !start; a++) {
            const p = {
              x: lane.x + lane.width / 2 + Math.cos((a * Math.PI) / 8) * ring,
              y: lane.y + lane.height / 2 + Math.sin((a * Math.PI) / 8) * ring,
            };
            if (legal(p, p) && segmentRect(p, p, lane, 0) !== null) start = p;
          }
        assert(start, map.id + "/" + difficulty.id);
        const queue = [{ ...start, cost: 0 }],
          seen = new Set<string>();
        let found = false;
        for (let head = 0; head < queue.length && !found; head++) {
          const p = queue[head];
          if (dry(p)) {
            found = true;
            break;
          }
          if (p.cost + 18 > 180 * sluiceRules.warning) continue;
          for (const [dx, dy] of [
            [18, 0],
            [-18, 0],
            [0, 18],
            [0, -18],
          ]) {
            const next = { x: p.x + dx, y: p.y + dy, cost: p.cost + 18 },
              key = next.x.toFixed(3) + ":" + next.y.toFixed(3);
            if (!seen.has(key) && legal(p, next)) {
              seen.add(key);
              queue.push(next);
            }
          }
        }
        assert(found, map.id + "/" + difficulty.id);
        checked++;
      }
    }
  assert.equal(checked, 108);
});
test("Real Soldier fire drains a valve without hurting the boss, and repeated casts release every queue and hit group", () => {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "sluice-keeper",
      difficulty: "normal",
      openingArenaId: "gatehouse",
    },
    "Valve shot",
    "soldier",
    "normal",
  );
  g.start();
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  g.step();
  const valve = g.director.services.sluice.weakPoints()[0],
    before = g.boss.health;
  assert(valve);
  p.x = valve.x;
  p.y = valve.y + 65;
  p.oldX = p.x;
  p.oldY = p.y;
  for (
    let i = 1;
    i <= 44 &&
    g.director.services.sluice.weakPoints().some((q) => q.id === valve.id);
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
    !g.director.services.sluice.weakPoints().some((q) => q.id === valve.id),
  );
  assert.equal(g.boss.health, before);
  assert(
    g.director.services.sluice
      .cues()
      .every(
        (q) =>
          q.valve !== valve.id || q.kind !== "service-current" || q.drained,
      ),
  );
  const f = fixture("crazed", 3);
  for (let cycle = 0; cycle < 60; cycle++) {
    f.c.auxiliaryBusy = false;
    f.d.nextSignatureAt = f.c.tick;
    f.d.cast(f.c);
    f.c.auxiliaryBusy = true;
    f.step(f.c.tick + 570);
    assert.deepEqual(f.d.diagnostics(), { shapes: 0, queued: 0, hitGroups: 0 });
  }
});
test("Fifteen catalogs explain pressure phases, delayed returns and Ressa Noll lore, while issued Story progress migrates exactly", () => {
  for (const language of data.locales) {
    const messages = JSON.parse(
      readFileSync("locales/" + language.id + ".json", "utf8"),
    ).messages;
    assert.equal(
      new Set(
        Array.from(
          { length: 4 },
          (_, i) => messages["boss.sluice-keeper.phase." + i],
        ),
      ).size,
      4,
    );
    for (let i = 0; i < 4; i++)
      assert(messages["boss.sluice-keeper.phaseHint." + i].length > 20);
    assert(messages["boss.sluice-keeper.brutalHelp"].includes("5.1"));
    assert(messages["boss.sluice-keeper.crazedHelp"].includes("10.2"));
    assert(messages["boss.sluice-keeper.lore"].length > 80);
  }
  const issued =
      "31bcd58adcfd8d9d1d76fc23b484237e68c266a513f2dedb2571f8a09067e131",
    g = new Game({ mode: "story", maxPlayers: 1 }, true);
  g.addPlayer("solo", "Reader", "medic");
  const save = g.offlineCheckpoint()!;
  save.contentRevision = issued;
  save.protocolVersion=46;
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
      runId: "sluice-old-ending",
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
  const after = parseProfile(JSON.stringify(profile));
  assert.equal(after.contentRevision, CONTENT_REVISION);
  assert.deepEqual([...storyProgress(after).endings], [2]);
  assert.equal(after.locale, "ar");
});
