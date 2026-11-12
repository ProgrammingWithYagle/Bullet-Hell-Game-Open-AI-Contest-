import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { skirmisherIds as ids } from "../src/shared/soldier-skirmisher.ts";
import { soldierActions } from "../src/client/soldier-actions.ts";
import {
  soldierReadySamples,
  soldierRejectSamples,
  isSoldierSound,
  soldierSamples,
} from "../src/client/soldier-sound.ts";
import { defaultControls } from "../src/client/input-bindings.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";

async function setup(t: any, late = false) {
  const env = menuEnvironment(t),
    old = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (s: string) => s },
  });
  t.after(() =>
    old
      ? Object.defineProperty(globalThis, "CSS", old)
      : Reflect.deleteProperty(globalThis, "CSS"),
  );
  const messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages,
    stubs = {
      "assets.ts":
        "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'soldier-skirmisher-ready-1':'ready.png','soldier-skirmisher-volley-1':'volley.png'}};",
      "i18n.ts":
        "const m=" +
        JSON.stringify(messages) +
        ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
    };
  const shop = await menuBundle(t, "src/client/ui/shop.ts", stubs),
    guide = await menuBundle(t, "src/client/ui/soldier-controls.ts", stubs),
    g = new Game({ mode: late ? "endless" : "raid" });
  if (late) g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier"),
    controls = defaultControls();
  controls.bindings.technique1 = ["KeyZ", "KeyG"];
  controls.gamepad.technique1 = 8;controls.gamepad.technique3=6;
  controls.bindings.technique2 = ["KeyN", "KeyH"];
  controls.gamepad.technique2 = 9;
  const requests: any[] = [],
    player = viewOf(g, p.id).players[0];
  env.host.innerHTML =
    '<div class="loadout-editor">' +
    shop.shopMarkup(player, [], true, "normal", undefined, true, controls) +
    "</div>";
  const binding = shop.bindShop(
    env.host,
    player,
    (r: any) => requests.push(r),
    [],
    true,
    "normal",
    undefined,
    true,
    controls,
  );
  t.after(() => binding.dispose());
  env.host.querySelector('[data-shop-tab="specializations"]')!.click();
  return { ...env, shop, guide, g, p, player, controls, requests };
}
const chain = [
  "soldier-ballistics-1",
  ids.entry,
  ids.drill,
  ids.roving,
  ids.ready,
  ids.volley,
];

test("both native tree views inspect the actual late controls and capstone without buying or bypassing earned gates", async (t) => {
  const f = await setup(t);
  for (const mode of ["map", "list"])
    for (const id of [ids.ready, ids.volley]) {
      f.host
        .querySelector('[data-specialization-mode="' + mode + '"]')!
        .click();
      f.host.querySelector('[data-inspect="' + id + '"]')!.click();
      const panel = f.host.querySelector("#item-details")!;
      for (const slot of ["technique1", "technique2", "e"])
        assert(panel.querySelector('[data-technique-control="' + slot + '"]'));
      const one = panel.querySelector('[data-technique-control="technique1"]')!,
        two = panel.querySelector('[data-technique-control="technique2"]')!;
      assert(
        one.textContent.includes("Z") &&
          one.textContent.includes("G") &&
          one.textContent.includes("8"),
      );
      assert(
        two.textContent.includes("N") &&
          two.textContent.includes("H") &&
          two.textContent.includes("9"),
      );
      assert(
        f.host.querySelector("#buy-selected")!.getAttribute("disabled") !==
          null,
      );
    }
  assert.deepEqual(f.requests, []);
  assert.equal(f.p.totalSp, 12);
  assert.equal(f.p.skills.length, 0);
});

test("a legal late purchase chain earns the culmination while the owned guide retains exactly five inputs", async (t) => {
  const f = await setup(t, true);
  for (const item of chain)
    assert(f.g.transact(f.p.id, { id: item, kind: "skill", item }).ok, item);
  assert.equal(f.p.totalSp, 27);
  assert.equal(
    f.p.skills.reduce((n, id) => n + f.g.skillCost(id), 0),
    18,
  );
  const player = viewOf(f.g, f.p.id).players[0];
  f.host.innerHTML = f.guide.soldierKitMarkup(player, f.controls, false);
  const kit = f.host.querySelector("[data-soldier-kit]")!;
  assert.equal(kit.querySelectorAll("[data-kit-action]").length, 5);
  assert.equal(
    kit
      .querySelector('[data-kit-action="technique1"]')!
      .getAttribute("data-skill"),
    ids.entry,
  );
  assert.equal(
    kit
      .querySelector('[data-kit-action="technique2"]')!
      .getAttribute("data-skill"),
    ids.roving,
  );
  assert(
    kit.textContent.includes("finishing the first paid step") &&
      kit.textContent.includes("three actual rounds"),
  );
  assert.equal(kit.getAttribute("open"), null);
});

test("HUD distinguishes free burst, paid loaded and relay openings while retaining the authority's real recovery", async (t) => {
  const f = await setup(t, true),
    p = f.player;
  p.skills.push(...chain.slice(1, -1));
  p.ammo = 2;
  Object.assign(p.kit, {
    technique1At: 180,
    soldierFollowupUntil: 0,
    soldierReadyUntil: 156,
    soldierStepUntil: 0,
  });
  let action = soldierActions(p, 120).extras.find(
    (a) => a.key === "technique1",
  )!;
  assert(action.blocked && action.at === 180);
  p.skills.push(ids.volley);
  action = soldierActions(p, 120).extras.find((a) => a.key === "technique1")!;
  assert(!action.blocked && action.at === 0);
  assert.equal(p.kit.technique1At, 180);
  assert(
    f.guide
      .soldierHudLabel(p, "technique1", 120)
      .includes("loaded step · 1.2s"),
  );
  Object.assign(p.kit, { soldierReadyRelay: true, soldierReadyUntil: 144 });
  assert(
    f.guide.soldierHudLabel(p, "technique1", 120).includes("relay step · 0.8s"),
  );
  Object.assign(p.kit, { technique1At: 0, soldierFollowupUntil: 150 });
  const free = f.guide.soldierHudLabel(p, "technique1", 120);
  assert(
    free.includes("1s opening") &&
      !free.includes("loaded") &&
      !free.includes("relay"),
  );
  p.kit.soldierStepUntil = 130;
  assert.equal(f.guide.soldierHudLabel(p, "technique1", 120), "Passing Shot");
});

test("earned readiness has a distinct finite quiet original cue and never creates an audio loop", () => {
  assert(isSoldierSound("soldier-ready"));
  assert(!isSoldierSound("soldier-ready-loop"));
  for (const rate of [8000, 44100, 48000, 192000]) {
    const samples = soldierReadySamples(rate);
    assert.equal(samples.length, Math.ceil(rate * 0.14));
    assert(samples.every((v) => Number.isFinite(v) && Math.abs(v) < 0.2));
    assert(samples.some((v) => Math.abs(v) > 0.01));
    assert(Math.abs(samples[0]) === 0 && Math.abs(samples.at(-1)!) < 1e-7);
  }
  assert.throws(() => soldierReadySamples(0));
  assert.equal(soldierSamples(48000).length, 11520);
  assert(isSoldierSound("soldier-step-reject"));
  for (const rate of [8000, 44100, 48000, 192000]) {
    const samples = soldierRejectSamples(rate);
    assert.equal(samples.length, Math.ceil(rate * 0.07));
    assert(samples.every((v) => Number.isFinite(v) && Math.abs(v) < 0.1));
    assert(Math.abs(samples.at(-1)!) < 1e-6);
  }
});

test("HUD explains a finite rejected request while leaving its unspent paid opening eligible for an immediate retry", async (t) => {
  const f = await setup(t, true),
    p = f.player;
  p.skills.push(...chain.slice(1));
  p.ammo = 1;
  Object.assign(p.kit, {
    technique1At: 180,
    soldierReadyUntil: 156,
    soldierStepUntil: 0,
    soldierStepRejectUntil: 130,
  });
  for (const [reason, label] of [
    ["ground", "last route blocked"],
    ["direction", "hold a direction"],
    ["ammunition", "one round needed"],
  ] as const) {
    p.kit.soldierStepRejectReason = reason;
    assert(f.guide.soldierHudLabel(p, "technique1", 120).includes(label));
    const a = soldierActions(p, 120).extras.find(
      (a) => a.key === "technique1",
    )!;
    assert(!a.blocked && a.at === 0);
  }
  assert(f.guide.soldierHudLabel(p, "technique1", 131).includes("loaded step"));
  assert.equal(p.kit.technique1At, 180);
});
