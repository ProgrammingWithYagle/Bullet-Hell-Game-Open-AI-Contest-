import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import {
  CONTENT_REVISION,
  idleInput,
  type Vec,
} from "../src/shared/protocol.ts";
import { freshProfile, parseProfile } from "../src/client/profile.ts";
import { storyProgress } from "../src/client/story-progress.ts";
import { menuBundle } from "./helpers/menu-fixture.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  StationSignals,
  stationPlan,
  stationTrackRect,
  stationRules,
  type StationTrack,
} from "../src/shared/station-signals.ts";
import type { SignatureContext } from "../src/shared/boss-director.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { data } from "../src/shared/game.ts";
import {
  segmentRect,
  segmentCircle,
  distance,
} from "../src/shared/geometry.ts";
function fixture(form = "normal", phase = 0) {
  const d = new StationSignals();
  let serial = 1;
  const hurt: { id: string; amount: number }[] = [];
  const c: SignatureContext = {
    tick: 0,
    bossId: "stationmaster",
    boss: { x: 800, y: 250 },
    radius: 58,
    bounds: { x: 0, y: 0, width: 1600, height: 1000 },
    obstacles: [],
    targets: [
      { id: "a", x: 528, y: 40, oldX: 528, oldY: 40 },
      { id: "b", x: 1072, y: 40, oldX: 1072, oldY: 40 },
    ],
    damageScale: form === "normal" ? 1 : 2,
    variant: form as "normal",
    brutal: form !== "normal",
    phase,
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
test("Stationmaster phases use distinct train directions, retain an open track and announce delayed crossings anew", () => {
  for (let phase = 0; phase < 4; phase++) {
    const f = fixture("normal", phase);
    f.d.cast(f.c);
    const tracks = f.d
      .cues()
      .filter((q): q is StationTrack => q.kind === "service-train-track");
    assert.equal(tracks.length, phase === 1 || phase === 2 ? 3 : 2);
    assert.equal(tracks.filter((q) => q.open).length, 1);
    assert(tracks.every((q) => q.at === 60));
    if (phase >= 2) {
      f.c.auxiliaryBusy = true;
      f.step(phase === 2 ? 120 : 108);
      const fresh = f.d
        .cues()
        .filter(
          (q) => q.kind === "service-train-track" && q.beganAt === f.c.tick,
        );
      assert.equal(fresh.length, 2);
      assert(fresh.every((q) => q.at - q.beganAt === 60));
    }
  }
  assert.notDeepEqual(stationPlan(0, 0), stationPlan(0, 1));
});
test("The safe track never hits, only actual swept cars hurt and an entire dispatch shares one hit budget", () => {
  const f = fixture();
  f.d.cast(f.c);
  f.step(59);
  assert.equal(f.hurt.length, 0);
  f.step(65);
  assert.deepEqual(
    f.hurt.map((h) => h.id),
    ["b"],
  );
  f.step(130);
  assert.equal(f.hurt.length, 1);
  const cut = fixture();
  cut.d.cast(cut.c);
  cut.step(1);
  const signal = cut.d.weakPoints()[0];
  assert.equal(cut.d.hitSignal(signal.id, 999, 1), 35);
  assert(
    cut.d
      .cues()
      .filter((q) => q.kind === "service-train-track")
      .every((q) => q.open),
  );
  cut.step(130);
  assert.equal(cut.hurt.length, 0);
});
test("Stationmaster bounded track/car bodies and clear shootable signals cover every map/difficulty/form/phase", () => {
  let cases = 0;
  for (const map of data.arenas)
    for (const difficulty of data.difficulties)
      for (const form of ["normal", "brutal", "crazed"] as const)
        for (let phase = 0; phase < 4; phase++) {
          const g = createPracticeGame(
            {
              mode: "endless",
              openingBossId: "stationmaster",
              openingArenaId: map.id,
              arenaSelection: "fixed",
              difficulty: difficulty.id,
            },
            "Station geometry",
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
          };
          const d = new StationSignals();
          d.cast(c);
          for (let n = 1; n <= 130; n++) {
            c.tick = n;
            d.step(c);
          }
          const b = c.bounds!;
          for (const q of d.cues()) {
            if (q.kind === "service-train-signal") {
              assert(
                q.x - q.radius >= b.x &&
                  q.y - q.radius >= b.y &&
                  q.x + q.radius <= b.x + b.width &&
                  q.y + q.radius <= b.y + b.height,
              );
              assert(
                c.obstacles.every(
                  (o) => segmentRect(q, q, o, q.radius + 2) === null,
                ),
              );
              assert(
                (c.hazardCircles ?? []).every(
                  (p) => distance(q, p) > q.radius + p.radius + 2,
                ),
              );
            } else {
              assert(
                q.x >= b.x &&
                  q.y >= b.y &&
                  q.x + q.width <= b.x + b.width + 1e-8 &&
                  q.y + q.height <= b.y + b.height + 1e-8,
              );
              assert(
                q.carX >= q.x &&
                  q.carY >= q.y &&
                  q.carX + q.carWidth <= q.x + q.width + 1e-8 &&
                  q.carY + q.carHeight <= q.y + q.height + 1e-8,
              );
            }
          }
          cases++;
        }
  assert.equal(cases, 432);
});
test("Stationmaster advanced returns retain their phase and reset cancels announced and queued dispatches", () => {
  const f = fixture("crazed", 1);
  f.d.cast(f.c);
  f.c.phase = 3;
  f.step(210);
  const second = f.d.cues().filter((q) => q.dispatch === 1);
  assert(second.length > 0);
  assert(second.every((q) => q.phase === 1 && q.at >= 210));
  f.step(360);
  const third = f.d.cues().filter((q) => q.dispatch === 2);
  assert(third.length > 0);
  assert(third.every((q) => q.phase === 1 && q.beganAt === 360));
  f.c.paused = true;
  f.step(361);
  assert.deepEqual(f.d.diagnostics(), { shapes: 0, queued: 0, hitGroups: 0 });
});

test("Only first active-frame motion is ignored; later sweeps and delayed crossings share the dispatch hit budget", () => {
  const f = fixture();
  f.d.cast(f.c);
  f.step(59);
  const p = f.c.targets[1];
  p.oldX = 1119;
  p.x = 1132;
  p.oldY = p.y = 80;
  f.step(60);
  assert.equal(f.hurt.length, 0);
  p.oldX = 1132;
  p.x = 1119;
  f.step(61);
  assert.deepEqual(
    f.hurt.map((q) => q.id),
    ["b"],
  );
  const cross = fixture("normal", 3);
  cross.d.cast(cross.c);
  const target = cross.c.targets[1];
  target.x = target.oldX = 1120;
  target.y = target.oldY = 40;
  cross.step(65);
  assert.equal(cross.hurt.length, 1);
  target.x = target.oldX = 1540;
  target.y = target.oldY = 300;
  cross.step(180);
  assert.equal(
    cross.hurt.length,
    1,
    "the later crossing belongs to the first dispatch",
  );
  const tunnel = fixture();
  const fast = tunnel.c.targets[1];
  fast.x = fast.oldX = 800;
  fast.y = fast.oldY = 100;
  tunnel.d.cast(tunnel.c);
  tunnel.step(60);
  assert.equal(tunnel.hurt.length, 0);
  fast.oldX = 800;
  fast.x = 1300;
  fast.oldY = fast.y = 100;
  tunnel.step(61);
  assert(tunnel.hurt.some((q) => q.id === "b"));
});

test("A base Tank can leave every sampled closed track before its warning ends using actual cover and lava sweeps", () => {
  let checked = 0;
  for (const map of data.arenas)
    for (const difficulty of data.difficulties) {
      const g = createPracticeGame(
        {
          mode: "endless",
          openingBossId: "stationmaster",
          openingArenaId: map.id,
          arenaSelection: "fixed",
          difficulty: difficulty.id,
        },
        "Track escape",
        "tank",
        "crazed",
      );
      g.start();
      const c = (
          g as unknown as { signatureContext(): SignatureContext }
        ).signatureContext(),
        b = c.bounds!,
        speed = g.movementSpeed(g.players.get("solo")!);
      assert.equal(speed, 180);
      const legal = (from: Vec, p: Vec) =>
        p.x >= b.x + 10 &&
        p.y >= b.y + 10 &&
        p.x <= b.x + b.width - 10 &&
        p.y <= b.y + b.height - 10 &&
        c.obstacles.every((o) => segmentRect(from, p, o, 10) === null) &&
        (c.hazardCircles ?? []).every(
          (pit) => segmentCircle(from, p, pit, pit.radius + 10) === null,
        );
      for (let phase = 0; phase < 4; phase++)
        for (const plan of stationPlan(phase, 0)) {
          const closed = plan.offsets.flatMap((off, i) =>
            i === plan.open ? [] : [stationTrackRect(b, plan.axis, off)],
          );
          for (const lane of closed) {
            let start: Vec | undefined;
            for (let ring = 0; ring <= 180 && !start; ring += 18)
              for (let a = 0; a < 16 && !start; a++) {
                const p = {
                  x:
                    lane.x +
                    lane.width / 2 +
                    Math.cos((a * Math.PI) / 8) * ring,
                  y:
                    lane.y +
                    lane.height / 2 +
                    Math.sin((a * Math.PI) / 8) * ring,
                };
                if (legal(p, p) && segmentRect(p, p, lane, 0) !== null)
                  start = p;
              }
            assert(start, map.id + "/" + phase);
            const queue = [{ ...start, cost: 0 }],
              seen = new Set<string>();
            let found = false;
            for (let head = 0; head < queue.length && !found; head++) {
              const p = queue[head];
              if (closed.every((q) => segmentRect(p, p, q, 10) === null)) {
                found = true;
                break;
              }
              if (p.cost + 18 > speed * stationRules.warning) continue;
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
            assert(found, map.id + "/" + difficulty.id + "/" + phase);
            checked++;
          }
        }
    }
  assert.equal(checked, 288);
});

test("Ordinary Soldier fire opens only the shot signal, while repeated full dispatches release all queues and hit groups", () => {
  const g = createPracticeGame(
    {
      mode: "endless",
      openingBossId: "stationmaster",
      difficulty: "normal",
      openingArenaId: "gatehouse",
    },
    "Signal shot",
    "soldier",
    "normal",
  );
  g.start();
  const p = g.players.get("solo")!;
  p.invulnerableUntil = 1e9;
  g.step();
  const signal = g.director.services.stationmaster.weakPoints()[0],
    before = g.boss.health;
  assert(signal);
  p.x = signal.x;
  p.y = signal.y + 65;
  p.oldX = p.x;
  p.oldY = p.y;
  for (
    let i = 1;
    i <= 44 &&
    g.director.services.stationmaster
      .weakPoints()
      .some((q) => q.id === signal.id);
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
    !g.director.services.stationmaster
      .weakPoints()
      .some((q) => q.id === signal.id),
  );
  assert.equal(g.boss.health, before);
  assert(
    g.director.services.stationmaster
      .cues()
      .every((q) => q.signal !== signal.id || q.open),
  );
  const three = fixture("normal", 1);
  three.d.cast(three.c);
  const [one, two] = three.d.weakPoints();
  assert(one && two);
  three.d.hitSignal(one.id, 999, three.c.tick);
  assert(three.d.weakPoints().some((q) => q.id === two.id));
  assert(three.d.cues().some((q) => q.signal === two.id && !q.open));
  const f = fixture("crazed", 3);
  for (let cycle = 0; cycle < 60; cycle++) {
    f.c.auxiliaryBusy = false;
    f.d.nextSignatureAt = f.c.tick;
    f.d.cast(f.c);
    f.c.auxiliaryBusy = true;
    f.step(f.c.tick + 650);
    assert.deepEqual(f.d.diagnostics(), { shapes: 0, queued: 0, hitGroups: 0 });
  }
});

test("Fifteen catalogs explain all signals and timed crossings, and issued local Story/Free Play saves keep earned data", () => {
  for (const language of data.locales) {
    const messages = JSON.parse(
      readFileSync("locales/" + language.id + ".json", "utf8"),
    ).messages;
    assert.equal(
      new Set(
        Array.from(
          { length: 4 },
          (_, i) => messages["boss.stationmaster.phase." + i],
        ),
      ).size,
      4,
    );
    for (let i = 0; i < 4; i++)
      assert(messages["boss.stationmaster.phaseHint." + i].length > 20);
    assert(messages["boss.stationmaster.phaseHint.2"].includes("4"));
    assert(messages["boss.stationmaster.phaseHint.3"].includes("3.6"));
    assert(messages["boss.stationmaster.brutalHelp"].includes("7"));
    assert(messages["boss.stationmaster.crazedHelp"].includes("12"));
    assert(messages["boss.stationmaster.lore"].length > 80);
  }
  const issued =
      "f464a132bbc18083c5780239f18f24ff447a5be87de3e64db22d6881e7793290",
    story = new Game({ mode: "story", maxPlayers: 1 });
  story.addPlayer("solo", "Reader", "medic");
  const save = story.offlineCheckpoint()!;
  save.contentRevision = issued;
  assert.deepEqual(Game.restoreOffline(save).storyChoices, []);
  assert.throws(
    () =>
      Game.restoreAuthoritative({
        ...story.authoritativeCheckpoint(),
        contentRevision: issued,
      }),
    /versionMismatch/,
  );
  const custom = new Game({
    mode: "standard",
    maxPlayers: 1,
    freePlay: { openingBossId: "stationmaster", variant: "brutal", seed: 7 },
  });
  custom.addPlayer("solo", "Traveller", "tank");
  const free = custom.offlineCheckpoint()!;
  free.contentRevision = issued;
  const after = Game.restoreOffline(free);
  assert.equal(after.customized, true);
  assert.deepEqual(after.settings.freePlay, custom.settings.freePlay);
  const profile = freshProfile();
  profile.contentRevision = issued;
  profile.locale = "ar";
  profile.runs = [
    {
      runId: "station-old-ending",
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

test("Native train drawing uses the visible car rectangle and disposes its images after the dispatch", async (context) => {
  const { ServicePresentation } = await menuBundle(
    context,
    "src/client/service-presentation.ts",
    { phaser: "export default {};" },
  );
  const calls: { method: string; args: unknown[] }[] = [],
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
  f.step(80);
  const tracks = f.d
    .cues()
    .filter(
      (q): q is StationTrack => q.kind === "service-train-track" && !q.open,
    );
  art.draw(chain(), chain(), f.d.cues(), 80, f.c.bounds, true, true);
  assert.equal(images.length, 2);
  for (const q of tracks) {
    assert(
      calls.some(
        (c) =>
          c.method === "strokeRect" &&
          JSON.stringify(c.args) ===
            JSON.stringify([q.carX, q.carY, q.carWidth, q.carHeight]),
      ),
    );
    assert(
      calls.some(
        (c) =>
          c.method === "setPosition" &&
          JSON.stringify(c.args) ===
            JSON.stringify([q.carX + q.carWidth / 2, q.carY + q.carHeight / 2]),
      ),
    );
  }
  art.draw(chain(), chain(), [], 81, f.c.bounds, true, true);
  assert.equal(calls.filter((c) => c.method === "destroy").length, 2);
});

test("Every delayed crossing and advanced dispatch receives one fresh audible warning, without per-track duplication", () => {
  const f = fixture("crazed", 3);
  let warnings = 0;
  f.c.warn = () => warnings++;
  f.d.cast(f.c);
  assert.equal(warnings, 1);
  f.c.auxiliaryBusy = true;
  f.step(107);
  assert.equal(warnings, 1);
  f.step(108);
  assert.equal(warnings, 2);
  f.step(210);
  assert.equal(warnings, 3);
  f.step(318);
  assert.equal(warnings, 4);
  f.step(360);
  assert.equal(warnings, 5);
  f.step(468);
  assert.equal(warnings, 6);
  f.step(650);
  assert.equal(warnings, 6);
});
