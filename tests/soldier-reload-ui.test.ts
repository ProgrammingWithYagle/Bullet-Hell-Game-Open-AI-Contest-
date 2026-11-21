import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { skirmisherIds as ids } from "../src/shared/soldier-skirmisher.ts";
import { defaultControls } from "../src/client/input-bindings.ts";
import {
  soldierLoadSamples,
  isSoldierSound,
  soldierSamples,
} from "../src/client/soldier-sound.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";

async function setup(t: any, roving = false) {
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
        "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'soldier-skirmisher-drill-1':'drill.png','soldier-skirmisher-roving-1':'roving.png'}};",
      "i18n.ts":
        "const m=" +
        JSON.stringify(messages) +
        ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
    };
  const shop = await menuBundle(t, "src/client/ui/shop.ts", stubs),
    guide = await menuBundle(t, "src/client/ui/soldier-controls.ts", stubs),
    g = new Game({ mode: roving ? "endless" : "raid" });
  if (roving) g.encounter = 9;
  const p = g.addPlayer("solo", "Mara", "soldier"),
    controls = defaultControls();
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

test("native Raid tree inspects new techniques/remaps without buying and performs actual guarded purchases", async (t) => {
  const f = await setup(t);
  assert.equal(f.p.totalSp, 12);
  for (const mode of ["map", "list"]) {
    f.host.querySelector('[data-specialization-mode="' + mode + '"]')!.click();
    f.host.querySelector('[data-inspect="' + ids.drill + '"]')!.click();
    const panel = f.host.querySelector("#item-details")!,
      binding = panel.querySelector('[data-technique-control="technique2"]')!;
    assert(binding.textContent.includes("N"));
    assert(binding.textContent.includes("H"));
    assert(binding.textContent.includes("9"));
    assert(panel.textContent.includes("four missing rounds"));
    assert.equal(f.requests.length, 0);
  }
  f.host.querySelector('[data-inspect="' + ids.entry + '"]')!.click();
  f.host.querySelector('[data-prerequisite="soldier-ballistics-1"]')!.click();
  f.host.querySelector("#buy-selected")!.click();
  assert.equal(f.requests.at(-1).item, "soldier-ballistics-1");
  assert(f.g.transact(f.p.id, { id: "foundation", ...f.requests.at(-1) }).ok);
  Object.assign(f.player, viewOf(f.g, f.p.id).players[0]);
  f.host.querySelector('[data-shop-tab="specializations"]')!.click();
  for (const item of [ids.entry, ids.drill]) {
    f.host.querySelector('[data-inspect="' + item + '"]')!.click();
    f.host.querySelector("#buy-selected")!.click();
    assert.equal(f.requests.at(-1).item, item);
    assert(f.g.transact(f.p.id, { id: item, ...f.requests.at(-1) }).ok);
    Object.assign(f.player, viewOf(f.g, f.p.id).players[0]);
  }
  assert.deepEqual(f.p.skills, ["soldier-ballistics-1", ids.entry, ids.drill]);
  assert.equal(f.player.sp, 6);
  f.host.querySelector('[data-inspect="' + ids.roving + '"]')!.click();
  assert(
    f.host.querySelector("#buy-selected")!.getAttribute("disabled") !== null,
  );
});

test("owned guide adds exactly one loading input, evolves its meaning and uses actual remapped controls", async (t) => {
  const f = await setup(t, true);
  for (const item of ["soldier-ballistics-1", ids.entry, ids.drill])
    assert(f.g.transact(f.p.id, { id: item, kind: "skill", item }).ok);
  for (const evolved of [false, true]) {
    if (evolved)
      assert(
        f.g.transact(f.p.id, {
          id: ids.roving,
          kind: "skill",
          item: ids.roving,
        }).ok,
      );
    const player = viewOf(f.g, f.p.id).players[0];
    f.host.innerHTML = f.guide.soldierKitMarkup(player, f.controls, false);
    const kit = f.host.querySelector("[data-soldier-kit]")!;
    assert.equal(kit.querySelectorAll("[data-kit-action]").length, 5);
    assert.equal(kit.getAttribute("open"), null);
    const b = kit.querySelector('[data-kit-action="technique2"]')!;
    assert.equal(
      b.getAttribute("data-skill"),
      evolved ? ids.roving : ids.drill,
    );
    assert(
      b.textContent.includes("N") &&
        b.textContent.includes("H") &&
        b.textContent.includes("9"),
    );
    assert(
      kit.textContent.includes(
        evolved ? "continue through burst" : "held primary fire then resumes",
      ),
    );
  }
  const fresh = new Game(),
    p = fresh.addPlayer("f", "Mara", "soldier");
  assert(
    !f.guide
      .soldierKitMarkup(viewOf(fresh, p.id).players[0], f.controls, false)
      .includes('data-kit-action="technique2"'),
  );
});

test("HUD labels derive round progress and next-round time from authority rather than reusing the burst window", async (t) => {
  const f = await setup(t, true),
    p = f.player;
  p.skills.push(ids.entry, ids.drill);
  Object.assign(p.kit, {
    soldierLoadUntil: 150,
    soldierLoadNextAt: 129,
    soldierLoadTotal: 4,
    soldierLoadInserted: 2,
    soldierFollowupUntil: 0,
  });
  const label = f.guide.soldierHudLabel(p, "technique2", 120);
  assert(label.includes("Cartridge Drill"));
  assert(label.includes("2/4"));
  assert(label.includes("0.3s"));
  assert(label.includes("stop"));
  assert(!label.includes("opening"));
  p.skills.push(ids.roving);
  assert(
    f.guide.soldierHudLabel(p, "technique2", 120).startsWith("Roving Chamber"),
  );
  assert.equal(f.guide.soldierHudLabel(p, "technique2", 150), "Roving Chamber");
});

test("original finite loading sounds are bounded and distinct while the existing footwork stays finite", () => {
  for (const rate of [8000, 44100, 48000, 192000])
    for (const id of ["soldier-load-start", "soldier-load-round"] as const) {
      assert(isSoldierSound(id));
      const samples = soldierLoadSamples(rate, id);
      assert.equal(
        samples.length,
        Math.ceil(rate * (id === "soldier-load-start" ? 0.12 : 0.075)),
      );
      assert(samples.every((v) => Number.isFinite(v) && Math.abs(v) < 0.4));
      assert(samples.some((v) => Math.abs(v) > 0.01));
      assert(Math.abs(samples.at(-1)!) < 1e-5);
    }
  assert.equal(soldierSamples(48000).length, 11520);
  assert(!isSoldierSound("soldier-load-loop"));
  assert.throws(() => soldierLoadSamples(0, "soldier-load-start"));
});
