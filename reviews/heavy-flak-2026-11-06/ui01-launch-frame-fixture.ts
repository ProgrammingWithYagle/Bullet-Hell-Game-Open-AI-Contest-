import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { flakIds as ids } from "../src/shared/heavy-flak.ts";
import { heavyActions } from "../src/client/heavy-actions.ts";
import {
  defaultControls,
  validControls,
} from "../src/client/input-bindings.ts";
import {
  specializationMapLayout,
  specializationRoutes,
} from "../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
async function setup(t: any, mode: "short" | "raid" = "short") {
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
        "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'heavy-flak-1':'flak.png','heavy-flak-compact-1':'compact.png','heavy-flak-frontal-1':'frontal.png','heavy-flak-command-1':'command.png'}};",
      "i18n.ts":
        "const m=" +
        JSON.stringify(messages) +
        ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
    };
  const shop = await menuBundle(t, "src/client/ui/shop.ts", stubs),
    guide = await menuBundle(t, "src/client/ui/heavy-controls.ts", stubs),
    g = new Game({ mode }),
    p = g.addPlayer("solo", "Hux", "heavy"),
    controls = defaultControls(),
    requests: any[] = [],
    results: any[] = [];
  controls.bindings.technique1 = ["KeyZ", "KeyG"];
  controls.bindings.technique2 = ["KeyN", "KeyY"];
  controls.gamepad.technique1 = 8;
  controls.gamepad.technique2 = 9;
  assert(validControls(controls));
  let binding: any;
  const player = () => viewOf(g, p.id).players[0],
    render = () => {
      binding?.dispose();
      const current = player();
      env.host.innerHTML =
        '<div class="loadout-editor">' +
        shop.shopMarkup(
          current,
          [],
          true,
          "normal",
          undefined,
          true,
          controls,
        ) +
        "</div>";
      binding = shop.bindShop(
        env.host,
        current,
        (request: any) => {
          requests.push(request);
          results.push(
            g.transact(p.id, { ...request, id: "heavy-ui-" + requests.length }),
          );
        },
        [],
        true,
        "normal",
        undefined,
        true,
        controls,
      );
      env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    };
  t.after(() => binding?.dispose());
  render();
  const inspect = (id: string) =>
      env.host.querySelector('[data-inspect="' + id + '"]')!.click(),
    buy = (id: string) => {
      inspect(id);
      assert(!env.host.querySelector("#buy-selected")!.disabled, id);
      env.host.querySelector("#buy-selected")!.click();
      assert(results.at(-1).ok, id + ":" + results.at(-1).reason);
      render();
    },
    foundation = () => {
      inspect(ids.entry);
      env.host.querySelector('[data-prerequisite="heavy-ordnance-1"]')!.click();
      assert(!env.host.querySelector("#buy-selected")!.disabled);
      env.host.querySelector("#buy-selected")!.click();
      assert(results.at(-1).ok);
      render();
    };
  return {
    ...env,
    shop,
    guide,
    g,
    p,
    controls,
    requests,
    results,
    player,
    render,
    inspect,
    buy,
    foundation,
  };
}
test("the Heavy graph contains exactly its four actual techniques, one General reference and the real optional exclusion", () => {
  assert.deepEqual(
    specializationRoutes("heavy").map((r) => r.id),
    [ids.entry],
  );
  const map = specializationMapLayout("heavy", ids.entry)!;
  assert.equal(map.nodes.length, 5);
  assert.equal(map.edges.length, 4);
  assert.equal(map.exclusions.length, 1);
  assert(map.nodes.find((n) => n.id === "heavy-ordnance-1")!.reference);
  assert(map.edges.some((e) => e.from === ids.entry && e.to === ids.command));
  assert(
    !map.edges.some(
      (e) =>
        [ids.compact, ids.frontal].includes(e.from as any) &&
        e.to === ids.command,
    ),
  );
});
test("ordinary Short3SP inspects map/list and remapped controls without buying, then makes exactly two actual affordable purchases", async (t) => {
  const f = await setup(t);
  assert.equal(f.player().sp, 3);
  assert.equal(
    f.host.querySelector(".manual-emblem img")!.getAttribute("src"),
    "flak.png",
  );
  for (const mode of ["map", "list"]) {
    f.host.querySelector('[data-specialization-mode="' + mode + '"]')!.click();
    f.inspect(ids.entry);
    const row = f.host.querySelector(
      '#item-details [data-technique-control="technique1"]',
    )!;
    for (const label of ["Z", "G", "8"])
      assert(row.textContent.includes(label));
    assert.equal(f.requests.length, 0);
    assert(!f.p.skills.includes(ids.entry));
  }
  assert(!f.host.querySelector('[data-kit-action="technique1"]'));
  assert(!f.host.querySelector('[data-kit-action="technique2"]'));
  f.foundation();
  f.buy(ids.entry);
  assert.equal(f.requests.length, 2);
  assert.equal(f.results.filter((r) => r.ok).length, 2);
  assert.equal(f.player().sp, 0);
  f.host.innerHTML = f.guide.heavyKitMarkup(f.player(), f.controls, false);
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 4);
  assert(
    f.host
      .querySelector('[data-kit-action="technique1"]')!
      .textContent.includes("Flak Round"),
  );
  assert(!f.host.querySelector('[data-kit-action="technique2"]'));
});
for (const fork of [ids.compact, ids.frontal])
  test(
    fork +
      " and Manual Fuze are real independent Raid purchases with valid remapped C/B",
    async (t) => {
      const f = await setup(t, "raid");
      assert.equal(f.player().sp, 12);
      f.foundation();
      f.buy(ids.entry);
      f.buy(fork);
      const other = fork === ids.compact ? ids.frontal : ids.compact;
      f.inspect(other);
      assert(f.host.querySelector("#buy-selected")!.disabled);
      const count = f.requests.length;
      f.host.querySelector("#buy-selected")!.click();
      assert.equal(f.requests.length, count);
      f.buy(ids.command);
      assert.equal(f.requests.length, 4);
      assert.equal(f.player().sp, 4);
      assert.deepEqual(f.p.skills, [
        "heavy-ordnance-1",
        ids.entry,
        fork,
        ids.command,
      ]);
      f.host.innerHTML = f.guide.heavyKitMarkup(f.player(), f.controls, true);
      assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 5);
      const b = f.host.querySelector('[data-kit-action="technique2"]')!;
      for (const text of ["Manual Fuze", "N", "Y", "9"])
        assert(b.textContent.includes(text));
      assert(!f.host.querySelector('[data-kit-action="reload"]'));
    },
  );
test("Heavy action presentation follows actual live flight, acquired command and spent recovery", async (t) => {
  const f = await setup(t, "raid");
  f.foundation();
  f.buy(ids.entry);
  assert.equal(heavyActions(f.player(), 0).extras.length, 1);
  f.buy(ids.command);
  assert.equal(heavyActions(f.player(), 0).extras.length, 2);
  assert(heavyActions(f.player(), 0).extras[1].blocked);
  assert(f.g.start());
  f.g.boss.staggerUntil = 1e6;
  Object.defineProperty(f.g, "arena", { value: structuredClone(f.g.arena) });
  f.g.arena.obstacles.length = 0;
  f.p.x = f.p.oldX = 600;
  f.p.y = f.p.oldY = 600;
  assert(
    f.g.submitInput(f.p.id, {
      ...idleInput(),
      sequence: 1,
      aim: 0,
      technique1: true,
    }),
  );
  f.g.step();
  let p = f.player(),
    actions = heavyActions(p, f.g.combatTick);
  assert(actions.extras[0].blocked);
  assert(actions.extras[0].at > f.g.combatTick);
  assert(!actions.extras[1].blocked);
  assert(
    f.guide.heavyHudLabel(p, "technique2", f.g.combatTick).includes("fuse"),
  );
  assert(
    f.g.submitInput(f.p.id, {
      ...idleInput(),
      sequence: 2,
      aim: 0,
      technique2: true,
    }),
  );
  f.g.step();
  p = f.player();
  actions = heavyActions(p, f.g.combatTick);
  assert(actions.extras[1].blocked);
  assert(actions.extras[0].at > f.g.combatTick);
  assert.equal(p.ammo, f.g.stats(f.p).magazine - 1);
});
