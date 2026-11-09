import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../../src/shared/game.ts";
import { viewOf } from "../../src/shared/view.ts";
import { idleInput } from "../../src/shared/protocol.ts";
import { traverseIds as ids } from "../../src/shared/heavy-traverse.ts";
import { heavyActions } from "../../src/client/heavy-actions.ts";
import {
  defaultControls,
  validControls,
} from "../../src/client/input-bindings.ts";
import {
  specializationMapLayout,
  specializationRoutes,
} from "../../src/client/ui/specialization-map.ts";
import { menuEnvironment, menuBundle } from "./menu-fixture.ts";
export async function clutchMenuFixture(
  t: any,
  mode: "short" | "raid" = "short",
) {
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
        "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'heavy-traverse-clutch-1':'clutch.png','heavy-traverse-1':'flak.png','heavy-traverse-spade-1':'compact.png','heavy-traverse-floating-1':'frontal.png','heavy-flak-command-1':'command.png'}};",
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
