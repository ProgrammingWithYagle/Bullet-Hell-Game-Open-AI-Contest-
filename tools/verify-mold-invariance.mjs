import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { MoldMixing as Issued } from "../reviews/volatile-distillation-2026-10-28/issued-mold-mixing.ts";
const root = path.resolve(import.meta.dirname, "..");
const load = (p) =>
  import(pathToFileURL(root + "/src/shared/" + p + ".ts").href);
const { MoldMixing: Current } = await load("mold-mixing"),
  { createPracticeGame } = await load("practice-start"),
  { data } = await load("game"),
  { runtimeArenas } = await load("arena-layouts"),
  { encounterPhases, encounterVariant } = await load("encounter-policy");
const hash = () => {
  const walk = (d) =>
      fs
        .readdirSync(d)
        .sort()
        .flatMap((n) => {
          const p = d + "/" + n;
          return fs.statSync(p).isDirectory() ? walk(p) : [p];
        }),
    h = createHash("sha256");
  for (const p of walk(root + "/src")
    .map((p) => p.slice(root.length + 1))
    .sort()) {
    h.update(p + "\0");
    h.update(fs.readFileSync(root + "/" + p));
  }
  return h.digest("hex");
};
const fixtureRoot = path.join(root, "reviews/volatile-distillation-2026-10-28"),
  binding = JSON.parse(
    fs.readFileSync(
      path.join(fixtureRoot, "issued-owner-binding.json"),
      "utf8",
    ),
  ),
  raw = fs.readFileSync(path.join(fixtureRoot, "issued-mold-mixing.ts.raw"));
assert.equal(createHash("sha256").update(raw).digest("hex"), binding.rawSha256);
const normalized = raw
  .toString("utf8")
  .replace(/from "\.\/([^\"]+)"/g, 'from "../../src/shared/$1"')
  .replaceAll("\r\n", "\n");
assert.equal(
  fs
    .readFileSync(path.join(fixtureRoot, "issued-mold-mixing.ts"), "utf8")
    .replaceAll("\r\n", "\n"),
  normalized,
  "Issued fixture changed beyond explicit import/line-ending normalization",
);
const runtimeSourceSha256 = hash(),
  rows = [];
let ticks = 0,
  comparedCues = 0;
for (const map of runtimeArenas)
  for (const difficulty of data.difficulties)
    for (const requested of ["normal", "brutal", "crazed"]) {
      const form = encounterVariant(difficulty.id, requested);
      if (form === "crazed") continue;
      for (
        let phase = 0;
        phase < encounterPhases("alchemist", form).length;
        phase++
      ) {
        const game = createPracticeGame(
          {
            mode: "endless",
            openingBossId: "alchemist",
            openingArenaId: map.id,
            difficulty: difficulty.id,
            seed: 491,
          },
          "Mara",
          "soldier",
          requested,
        );
        game.start();
        const base = game.signatureContext();
        const make = (Type) => {
          let id = 0;
          const hurt = [],
            c = {
              ...base,
              phase,
              boss: { x: base.boss.x, y: base.boss.y },
              targets: base.targets.map((p) => ({ ...p })),
              id: () => ++id,
              damage: (id, damage) => hurt.push({ id, damage, at: c.tick }),
              warn: () => {},
            };
          c.aimTargets = c.targets;
          return { d: new Type(), c, hurt };
        };
        const a = make(Issued),
          b = make(Current);
        for (let tick = 0; tick < 900; tick++) {
          for (const f of [a, b]) {
            f.c.tick = tick;
            f.c.paused = tick === 450;
            const p = f.c.targets[0],
              bounds = base.bounds;
            p.oldX = p.x;
            p.oldY = p.y;
            // Controlled target drift exercises fresh aiming, walking and mixing.
            p.x = Math.min(
              bounds.x + bounds.width - 30,
              Math.max(
                bounds.x + 30,
                base.targets[0].x + Math.sin(tick / 90) * 130,
              ),
            );
            p.y = Math.min(
              bounds.y + bounds.height - 30,
              Math.max(
                bounds.y + 30,
                base.targets[0].y + Math.cos(tick / 115) * 90,
              ),
            );
            f.d.step(f.c);
          }
          assert.deepEqual(b.c.boss, a.c.boss);
          assert.deepEqual(b.d.cues(), a.d.cues());
          assert.deepEqual(b.hurt, a.hurt);
          assert.equal(b.d.busy, a.d.busy);
          assert.equal(b.d.nextSignatureAt, a.d.nextSignatureAt);
          ticks++;
          comparedCues += a.d.cues().length;
        }
        rows.push({
          map: map.id,
          difficulty: difficulty.id,
          requestedForm: requested,
          effectiveForm: form,
          phase,
          ticks: 900,
        });
      }
    }
assert.equal(
  hash(),
  runtimeSourceSha256,
  "Runtime changed during invariance probe",
);
const report = {
  passed: true,
  issuedOwnerSource: "7661e0d0d02d2448252a0003a55f5afd7ba1e517",
  runtimeSourceSha256,
  cases: rows.length,
  ticks,
  comparedCues,
  rows,
  limits: [
    "Only the issued chemistry owner is loaded alongside the current owner with identical current real-map contexts. All legal non-Crazed requested mappings and phases receive900ticks, controlled target drift and one pause; this is not a rendered or human clear.",
    "Exact boss movement, cue geometry/timelines, actual damage callbacks, busy state and recovery clocks match. The full Game, network and renderer have separate checks.",
  ],
};
fs.writeFileSync(
  process.argv[2] ??
    path.join(
      root,
      "reviews/volatile-distillation-2026-10-28/invariance-current.json",
    ),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, rows: undefined }));
