import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  defaultControls,
  validControls,
} from "../src/client/input-bindings.ts";
import { engineerActions } from "../src/client/engineer-actions.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
import type { MenuElement } from "./helpers/menu-dom.ts";

async function fixture(t: any, skills: string[] = [], expanded = false) {
  const env = menuEnvironment(t),
    messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages;
  const original = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (s: string) => s },
  });
  t.after(() =>
    original
      ? Object.defineProperty(globalThis, "CSS", original)
      : Reflect.deleteProperty(globalThis, "CSS"),
  );
  const shop = await menuBundle(t, "src/client/ui/shop.ts", {
    "assets.ts": "export const assets={upgrades:{},items:{},resourceIcons:{}};",
    "i18n.ts":
      "const m=" +
      JSON.stringify(messages) +
      ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
  });
  const g = new Game({ mode: "endless" });
  g.encounter = 9;
  const p = g.addPlayer("solo", "Tamsin", "engineer");
  for (const item of skills)
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok, item);
  const player = viewOf(g, p.id).players[0],
    controls = defaultControls(),
    requests: unknown[] = [];
  Object.assign(controls.bindings, {
    q: ["KeyJ"],
    technique1: ["KeyZ", "KeyG"],
    technique2: ["KeyN"],
    ultimate: ["KeyU"],
  });
  Object.assign(controls.gamepad, {
    q: 16,
    technique1: 8,
    technique2: 9,
    ultimate: 6,
  });
  assert(validControls(controls));
  env.host.innerHTML =
    '<div class="loadout-editor">' +
    shop.shopMarkup(player, [], expanded, "normal", undefined, true, controls) +
    "</div>";
  const binding = shop.bindShop(
    env.host,
    player,
    (r: unknown) => requests.push(r),
    [],
    expanded,
    "normal",
    undefined,
    true,
    controls,
  );
  env.host.querySelector('[data-shop-tab="specializations"]')!.click();
  t.after(() => binding.dispose());
  return { ...env, shop, g, p, player, controls, requests, binding };
}

test("Inspecting an acquired-action or ultimate evolution shows actual alternate keyboard and gamepad bindings in both map and reading view", async (t) => {
  const f = await fixture(t);
  for (const reading of [false, true]) {
    f.host
      .querySelector(
        '[data-specialization-mode="' + (reading ? "list" : "map") + '"]',
      )!
      .click();
    for (const [id, action, keys, pad] of [
      ["engineer-machinery-coil-1", "technique1", ["Z", "G"], "8"],
      ["engineer-traps-haul-1", "technique2", ["N"], "9"],
      ["engineer-builder-redoubt-1", "ultimate", ["U"], "6"],
    ] as const) {
      f.host.querySelector('[data-inspect="' + id + '"]')!.click();
      const row = f.host.querySelector(
        '#item-details [data-technique-control="' + action + '"]',
      );
      assert(row, id);
      for (const key of keys)
        assert(row.textContent.includes(key), id + ": " + key);
      const gamepad = row.querySelectorAll(".pathway-binding")[1];
      assert.equal(
        gamepad.querySelector("span")!.textContent,
        "Gamepad button",
      );
      assert.equal(gamepad.querySelector("kbd")!.textContent, pad);
      assert(!row.textContent.includes("KeyZ"));
    }
  }
  assert.deepEqual(f.requests, []);
  assert.equal(f.p.skills.length, 0);
  assert.equal(f.player.sp, 27);
});

test("The owned kit starts with three issued actions and reveals only purchased actions with the same evolved names used in combat", async (t) => {
  const rows = [
    [
      "engineer-machinery-1",
      "anchor",
      "coil",
      "prism",
      "salvage",
      "convergence",
    ],
    ["engineer-traps-1", "switch", "key", "casings", "haul", "corridor"],
    [
      "engineer-builder-1",
      "longspan",
      "hinge",
      "repair",
      "linked",
      "survey",
      "redoubt",
    ],
  ];
  for (const route of rows) {
    const entry = route[0],
      prefix = entry.replace(/-1$/, "-"),
      skills = [
        "engineer-constructs-1",
        entry,
        ...route.slice(1).map((s) => prefix + s + "-1"),
      ];
    // These are legal late-run build fixtures, not natural-clear evidence.
    const f = await fixture(t, skills, true),
      kit = f.host.querySelector("[data-engineer-kit]");
    assert(kit, entry);
    assert.equal(kit.querySelectorAll("[data-kit-action]").length, 5);
    for (const action of engineerActions(f.player, [], 0).extras) {
      const row: MenuElement | null = kit.querySelector(
        '[data-kit-action="' + action.key + '"]',
      );
      assert(row);
      assert.equal(row.getAttribute("data-skill"), action.id);
    }
    assert(
      kit.querySelector('[data-kit-action="q"]')!.textContent.includes("J"),
    );
    const ult = kit.querySelector('[data-kit-action="ultimate"]')!;
    if (entry === "engineer-builder-1")
      assert.equal(
        ult.getAttribute("data-skill"),
        "engineer-builder-redoubt-1",
      );
    assert(!kit.querySelector("[data-inspect]"));
    assert.deepEqual(f.requests, []);
    f.binding.dispose();
  }
  const plain = await fixture(t);
  const kit = plain.host.querySelector("[data-engineer-kit]");
  assert(kit);
  assert.equal(kit.querySelectorAll("[data-kit-action]").length, 3);
  assert(!kit.querySelector('[data-kit-action="technique1"]'));
});

test("Breach Casings explains both placement-triggered and remote firing controls instead of implying it is only action 1", async (t) => {
  const f = await fixture(t);
  f.host.querySelector('[data-inspect="engineer-traps-casings-1"]')!.click();
  const panel = f.host.querySelector("#item-details")!;
  assert(panel.querySelector('[data-technique-control="q"]'));
  assert(panel.querySelector('[data-technique-control="technique1"]'));
  assert.deepEqual(f.requests, []);
});

test("The optional control guide keeps its open state across route and reading changes without spending or showing unowned late actions", async (t) => {
  const f = await fixture(t, ["engineer-constructs-1", "engineer-builder-1"]);
  const guide = f.host.querySelector("[data-engineer-kit]");
  assert(guide);
  assert.equal(guide.getAttribute("open"), null);
  guide.setAttribute("open", "");
  guide.open = true;
  f.host
    .querySelector('[data-specialization-route="engineer-builder-1"]')!
    .click();
  assert.notEqual(
    f.host.querySelector("[data-engineer-kit]")!.getAttribute("open"),
    null,
  );
  f.host.querySelector('[data-specialization-mode="list"]')!.click();
  assert.notEqual(
    f.host.querySelector("[data-engineer-kit]")!.getAttribute("open"),
    null,
  );
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 3);
  assert.deepEqual(f.requests, []);
});
