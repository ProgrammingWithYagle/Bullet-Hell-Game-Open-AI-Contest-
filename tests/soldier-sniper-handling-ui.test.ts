import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { sniperIds as ids } from "../src/shared/soldier-sniper.ts";
import { defaultControls } from "../src/client/input-bindings.ts";
import {
  specializationMapLayout,
  specializationFocus,
} from "../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
test("the authored Sniper map has exactly its six live techniques, real foundation and one handling exclusion", () => {
  const map = specializationMapLayout("soldier", ids.entry)!;
  assert.equal(map.nodes.length,7);
  assert.equal(map.edges.length,6);
  assert.equal(map.exclusions.length, 1);
  assert.deepEqual(
    new Set([map.exclusions[0].a, map.exclusions[0].b]),
    new Set([ids.carry, ids.clear]),
  );
  for (const h of ["carry", "clear"] as const) {
    const node = map.nodes.find((n) => n.id === ids[h])!;
    assert(node.y > map.nodes.find((n) => n.id === ids.entry)!.y);
    assert(map.edges.some((e) => e.from === ids.entry && e.to === ids[h]));
    assert.equal(specializationFocus(map, ids[h], "ArrowUp"), ids.entry);
  }
  assert.equal(map.nodes.filter((n) => n.reference).length, 1);
});
for (const handling of ["carry", "clear"] as const)
  test(
    handling +
      " inspection/purchase/owned guide uses actual remapped actions in both views",
    async (t) => {
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
      const messages = JSON.parse(
          readFileSync("locales/en.json", "utf8"),
        ).messages,
        icons = Object.fromEntries(
          Object.values(ids).map((id) => [id, id + ".png"]),
        ),
        stubs = {
          "assets.ts":
            "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:" +
            JSON.stringify(icons) +
            "};",
          "i18n.ts":
            "const m=" +
            JSON.stringify(messages) +
            ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
        },
        shop = await menuBundle(t, "src/client/ui/shop.ts", stubs),
        g = new Game({ mode: "raid" }),
        p = g.addPlayer("solo", "Mara", "soldier"),
        controls = defaultControls();
      controls.bindings.technique1 = ["KeyZ", "KeyG"];
      controls.gamepad.technique1 = 8;
      controls.bindings.reload = ["KeyT", "KeyK"];
      controls.gamepad.reload = 11;
      let binding: any;
      const requests: any[] = [],
        render = () => {
          binding?.dispose();
          const v = viewOf(g, p.id).players[0];
          env.host.innerHTML =
            '<div class="loadout-editor">' +
            shop.shopMarkup(v, [], true, "normal", undefined, true, controls) +
            "</div>";
          binding = shop.bindShop(
            env.host,
            v,
            (r: any) => requests.push(r),
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
      for (const item of ["soldier-ballistics-1", ids.entry])
        assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
      render();
      for (const mode of ["map", "list"]) {
        env.host
          .querySelector('[data-specialization-mode="' + mode + '"]')!
          .click();
        env.host
          .querySelector('[data-inspect="' + ids[handling] + '"]')!
          .click();
        const detail = env.host.querySelector("#item-details")!;
        for (const key of ["Z", "G", "8"])
          assert(
            detail
              .querySelector('[data-technique-control="technique1"]')!
              .textContent.includes(key),
          );
        const reload = detail.querySelector(
          '[data-technique-control="reload"]',
        );
        if (handling === "clear") {
          assert(reload);
          for (const key of ["T", "K", "11"])
            assert(reload.textContent.includes(key));
        } else assert(!reload);
        assert.equal(requests.length, 0);
        assert(!env.host.querySelector("#buy-selected")!.disabled);
      }
      env.host.querySelector("#buy-selected")!.click();
      assert.equal(requests.length, 1);
      assert(
        g.transact(p.id, { id: "real-ui-" + handling, ...requests[0] }).ok,
      );
      render();
      const guide = env.host.querySelector("[data-soldier-kit]")!;
      assert.equal(
        guide.querySelectorAll("[data-kit-action]").length,
        handling === "clear" ? 5 : 4,
      );
      assert(!guide.querySelector('[data-kit-action="technique2"]'));
      assert(
        guide.textContent.includes(
          handling === "carry" ? "Careful Carry" : "Clear Chamber",
        ),
      );
      const reload = guide.querySelector('[data-kit-action="reload"]');
      if (handling === "clear") {
        assert(reload);
        for (const key of ["T", "K", "11"])
          assert(reload.textContent.includes(key));
      } else assert(!reload);
      for (const mode of ["map", "list"]) {
        env.host
          .querySelector('[data-specialization-mode="' + mode + '"]')!
          .click();
        env.host
          .querySelector(
            '[data-inspect="' +
              ids[handling === "carry" ? "clear" : "carry"] +
              '"]',
          )!
          .click();
        assert(env.host.querySelector("#buy-selected")!.disabled);
      }
      assert.equal(requests.length, 1);
      assert.equal(
        p.totalSp - p.skills.reduce((n, id) => n + g.skillCost(id), 0),
        7,
      );
    },
  );
