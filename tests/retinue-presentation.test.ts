import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/shared/game.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { retinuePose, retinueArt } from "../src/client/retinue-presentation.ts";
import { summonerSoundSpecs } from "../src/client/summoner-sound.ts";

test("Late companion observations use the real action age and locked facing, and the short attack/reaction clips fit their simulation window", () => {
  const g = new Game(),
    p = g.addPlayer("p", "Joss", "summoner");
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  p.invulnerableUntil = 1e9;
  g.submitInput(p.id, { ...idleInput(), sequence: 1, q: true });
  g.step();
  const e = g.retinue.snapshot()[0];
  e.action = "attack";
  e.actionAt = 20;
  e.actionAim = 0;
  e.aim = Math.PI;
  const first = retinuePose(e, 20)!,
    late = retinuePose(e, 24)!;
  assert(first.texture.endsWith("attack-east"));
  assert.equal(first.frame, 0);
  assert.equal(late.frame, 1, "A late observer does not restart the attack");
  assert.deepEqual(
    retinuePose(e, 24),
    late,
    "A frozen simulation clock freezes presentation",
  );
  for (const clip of retinueArt.filter(
    (c) => c.action === "attack" || c.action === "hurt",
  ))
    assert((clip.frames / clip.fps) * 30 <= 6);
  assert.equal(retinueArt.length, 60);
  assert.equal(
    retinueArt.reduce((n, c) => n + c.frames, 0),
    132,
  );
  e.action = "downed";
  e.health = 0;
  assert.equal(retinuePose(e, 200, true)!.frame, 1);
  e.action = "run";
  assert(retinuePose(e, 25, true)!.texture.includes("-idle-"));
});

test("Summoner actions issue their own finite audio identities instead of a firearm fallback", () => {
  const g = new Game(),
    p = g.addPlayer("p", "Joss", "summoner");
  g.start();
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  p.invulnerableUntil = 1e9;
  g.submitInput(p.id, { ...idleInput(), sequence: 1, fire: true, q: true });
  g.step();
  const ids = g
    .drainEvents()
    .filter((e) => e.type === "sound")
    .map((e) => e.id);
  assert(ids.includes("summoner-beacon"));
  assert(ids.includes("summoner-call"));
  assert(!ids.includes("weapon-pistol"));
  for (const cue of Object.values(summonerSoundSpecs)) {
    assert(cue.duration > 0 && cue.duration <= 0.35);
    assert(cue.tones.every((n) => n >= 100 && n <= 2000));
  }
});
