import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { sniperIds as ids } from "../src/shared/soldier-sniper.ts";
import { soldierActions } from "../src/client/soldier-actions.ts";
import { defaultControls } from "../src/client/input-bindings.ts";
import { specializationMapLayout } from "../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
test("Bore is an actual authored optional acquired node, with the handling fork retained", () => {
  const map = specializationMapLayout("soldier", ids.entry)!;
  assert.equal(map.nodes.length, 5);
  assert.equal(map.edges.length, 4);
  assert.equal(map.exclusions.length, 1);
  assert(map.edges.some((e) => e.from === ids.entry && e.to === ids.bore));
  assert(
    map.nodes.find((n) => n.id === ids.bore)!.y >
      map.nodes.find((n) => n.id === ids.carry)!.y,
  );
  assert(!map.exclusions.some((e) => e.a === ids.bore || e.b === ids.bore));
});
for (const clear of [false, true])
  test(
    "Bore inspection/owned controls preserve remapped C/B" +
      (clear ? " and contextual R" : ""),
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
      controls.bindings.technique2 = ["KeyN", "KeyY"];
      controls.gamepad.technique2 = 9;
      controls.bindings.reload = ["KeyT", "KeyK"];
      controls.gamepad.reload = 11;
      for (const item of [
        "soldier-ballistics-1",
        ids.entry,
        ...(clear ? [ids.clear] : []),
      ])
        assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
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
      render();
      assert.equal(
        soldierActions(viewOf(g, p.id).players[0], 0).extras.length,
        1,
      );
      for (const mode of ["map", "list"]) {
        env.host
          .querySelector('[data-specialization-mode="' + mode + '"]')!
          .click();
        env.host.querySelector('[data-inspect="' + ids.bore + '"]')!.click();
        const detail = env.host.querySelector("#item-details")!;
        for (const [action, labels] of [
          ["technique1", ["Z", "G", "8"]],
          ["technique2", ["N", "Y", "9"]],
        ] as const)
          for (const label of labels)
            assert(
              detail
                .querySelector('[data-technique-control="' + action + '"]')!
                .textContent.includes(label),
            );
        assert(!env.host.querySelector("#buy-selected")!.disabled);
        assert.equal(requests.length, 0);
      }
      env.host.querySelector("#buy-selected")!.click();
      assert.equal(requests.length, 1);
      assert(
        g.transact(p.id, { id: "owned-bore-" + clear, ...requests[0] }).ok,
      );
      render();
      const guide = env.host.querySelector("[data-soldier-kit]")!;
      assert.equal(
        guide.querySelectorAll("[data-kit-action]").length,
        clear ? 6 : 5,
      );
      const b = guide.querySelector('[data-kit-action="technique2"]')!;
      for (const label of ["Bore Through", "N", "Y", "9"])
        assert(b.textContent.includes(label));
      if (clear) {
        const row = guide.querySelector('[data-kit-action="reload"]')!;
        for (const label of ["Clear Chamber", "T", "K", "11"])
          assert(row.textContent.includes(label));
      } else assert(!guide.querySelector('[data-kit-action="reload"]'));
      const extras = soldierActions(viewOf(g, p.id).players[0], 0).extras;
      assert.equal(extras.length, 2);
      assert.equal(extras[1].id, ids.bore);
      assert(extras[1].blocked);
      assert(g.start());
      g.boss.staggerUntil = g.boss.deadline = 1e6;
      let sequence = 0;
      const step = (input: object = {}) => {
        assert(
          g.submitInput(p.id, {
            ...idleInput(),
            sequence: ++sequence,
            ...input,
          }),
        );
        g.step();
      };
      step({ technique1: true });
      assert(
        soldierActions(viewOf(g, p.id).players[0], g.combatTick).extras[1]
          .blocked,
      );
      const ready = g.kitStatus(p.id).sniperReadyAt!;
      while (g.combatTick < ready) step();
      assert(
        !soldierActions(viewOf(g, p.id).players[0], g.combatTick).extras[1]
          .blocked,
      );
      assert.equal(requests.length, 1);
      assert.equal(
        p.skills.reduce((n, id) => n + g.skillCost(id), 0),
        clear ? 8 : 6,
      );
    },
  );
