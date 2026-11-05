import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { marksmanId as id } from "../src/shared/soldier-marksman.ts";
import { soldierActions } from "../src/client/soldier-actions.ts";
import { defaultControls } from "../src/client/input-bindings.ts";
import {
  specializationMapLayout,
  specializationRoutes,
} from "../src/client/ui/specialization-map.ts";
import {
  soldierBankSamples,
  isSoldierSound,
  playSoldierSound,
} from "../src/client/soldier-sound.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";

async function setup(
  t: any,
  skills: string[] = [],
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
  const messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages;
  const stubs = {
    "assets.ts":
      "export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{'soldier-skirmisher-1':'passing.png','soldier-marksman-1':'bank.png'}};",
    "i18n.ts":
      "const m=" +
      JSON.stringify(messages) +
      ';export const locale="en",number=String;export const t=(k,a={})=>Object.entries(a).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[k]??k);',
  };
  const shop = await menuBundle(t, "src/client/ui/shop.ts", stubs),
    guide = await menuBundle(t, "src/client/ui/soldier-controls.ts", stubs);
  const g = new Game({ mode }),
    p = g.addPlayer("solo", "Mara", "soldier"),
    controls = defaultControls();
  assert.equal(p.totalSp, mode === "raid" ? 12 : 3);
  for (const item of skills)
    assert(g.transact(p.id, { id: item, kind: "skill", item }).ok);
  controls.bindings.technique1 = ["KeyZ", "KeyG"];
  controls.gamepad.technique1 = 8;
  const requests: any[] = [],
    player = viewOf(g, p.id).players[0];
  env.host.innerHTML =
    '<div class="loadout-editor">' +
    shop.shopMarkup(player, [], true, "normal", undefined, true, controls) +
    "</div>";
  const binding = shop.bindShop(
    env.host,
    player,
    (request: any) => requests.push(request),
    [],
    true,
    "normal",
    undefined,
    true,
    controls,
  );
  t.after(() => binding.dispose());
  env.host.querySelector('[data-shop-tab="specializations"]')!.click();
  return { ...env, shop, guide, g, p, controls, player, requests };
}

test("the authored whole tree connects two implemented disciplines while retaining the issued Skirmisher region", () => {
  assert.deepEqual(
    specializationRoutes("soldier").map((route) => route.id),
    ["soldier-skirmisher-1", id],
  );
  const whole = specializationMapLayout("soldier")!,
    mark = specializationMapLayout("soldier", id)!,
    old = specializationMapLayout("soldier", "soldier-skirmisher-1")!;
  assert.equal(whole.nodes.filter((node) => node.reference).length, 1);
  assert.equal(whole.width, 2050);
  assert.equal(old.nodes.length, 8);
  assert.equal(old.edges.length, 7);
  assert.equal(mark.nodes.length, 5);
  assert.deepEqual(mark.edges, [{from:"soldier-ballistics-1",to:id},...['soldier-marksman-carom-1','soldier-marksman-line-1','soldier-marksman-pair-1'].map(to=>({from:id,to}))]);
  assert(
    whole.exclusions.some(
      (pair) => pair.a === "soldier-skirmisher-1" && pair.b === id,
    ),
  );
});

test("both native tree views inspect the real remapped action without buying, and a normal budget buys the actual technique", async (t) => {
  const f = await setup(t, ["soldier-ballistics-1"]);
  for (const mode of ["map", "list"]) {
    f.host.querySelector('[data-specialization-mode="' + mode + '"]')!.click();
    f.host.querySelector('[data-inspect="' + id + '"]')!.click();
    const panel = f.host.querySelector("#item-details")!,
      control = panel.querySelector('[data-technique-control="technique1"]')!;
    assert(
      control.textContent.includes("Z") &&
        control.textContent.includes("G") &&
        control.textContent.includes("8"),
    );
    assert(!panel.querySelector('[data-technique-control="technique2"]'));
    assert(!panel.querySelector('[data-technique-control="e"]'));
    assert.equal(
      f.host.querySelector("#buy-selected")!.getAttribute("disabled"),
      null,
    );
    assert.equal(f.requests.length, 0);
    assert.equal(viewOf(f.g, f.p.id).players[0].sp, 2);
    assert(!f.p.skills.includes(id));
  }
  f.host.querySelector("#buy-selected")!.click();
  assert.equal(f.requests.length, 1);
  const result = f.g.transact(f.p.id, {
    id: "marksman-native-buy",
    ...f.requests[0],
  });
  assert(result.ok);
  assert.equal(viewOf(f.g, f.p.id).players[0].sp, 0);
  assert(f.p.skills.includes(id));
  const actual = viewOf(f.g, f.p.id).players[0];
  f.host.innerHTML = f.guide.soldierKitMarkup(actual, f.controls, false);
  assert.equal(f.host.querySelectorAll("[data-kit-action]").length, 4);
  const one = f.host.querySelector('[data-kit-action="technique1"]')!;
  assert(
    one.textContent.includes("Bank Shot") &&
      one.textContent.includes("Z") &&
      one.textContent.includes("G") &&
      one.textContent.includes("8"),
  );
  assert(!f.host.querySelector('[data-kit-action="technique2"]'));
});

test("owned discipline inspection preserves fold state and rejects replacing an owned Skirmisher operation", async (t) => {
  const f = await setup(t, ["soldier-ballistics-1", id], "raid");
  assert.equal(
    f.host.querySelector(".manual-emblem img")!.getAttribute("src"),
    "bank.png",
  );
  f.host
    .querySelector('[data-specialization-route="soldier-skirmisher-1"]')!
    .click();
  assert.equal(
    f.host.querySelector(".manual-emblem img")!.getAttribute("src"),
    "passing.png",
  );
  f.host
    .querySelector('[data-specialization-route="soldier-marksman-1"]')!
    .click();
  assert.equal(
    f.host.querySelector(".manual-emblem img")!.getAttribute("src"),
    "bank.png",
  );
  f.host.querySelector('[data-specialization-route="all"]')!.click();
  const guide = f.host.querySelector("[data-soldier-kit]")!;
  guide.setAttribute("open", "");
  guide.open = true;
  f.host.querySelector('[data-specialization-mode="list"]')!.click();
  assert.equal(f.host.querySelector("[data-soldier-kit]")!.open, true);
  f.host.querySelector('[data-inspect="soldier-skirmisher-1"]')!.click();
  assert(
    f.host.querySelector("#buy-selected")!.getAttribute("disabled") !== null,
  );
  assert.equal(f.requests.length, 0);
  assert.equal(viewOf(f.g, f.p.id).players[0].sp, 9);
  assert(f.p.skills.includes(id));
  assert(!f.p.skills.includes("soldier-skirmisher-1"));
  assert(!f.host.textContent.includes("Sniper"));
  assert(!f.host.textContent.includes("Field Logistics"));
});

test("HUD availability and cartridge guidance use actual authority recovery, ammunition and reload state", async (t) => {
  const f = await setup(t, ["soldier-ballistics-1", id]);
  let p = viewOf(f.g, f.p.id).players[0];
  let action = soldierActions(p, 0).extras[0];
  assert.equal(action.id, id);
  assert.equal(action.key, "technique1");
  assert.equal(action.at, 0);
  assert(!action.blocked);
  assert(
    f.guide.soldierHudLabel(p, "technique1", 0).includes("one cover bank"),
  );
  f.p.ammo = 0;
  p = viewOf(f.g, f.p.id).players[0];
  assert(soldierActions(p, 0).extras[0].blocked);
  assert(
    f.guide.soldierHudLabel(p, "technique1", 0).includes("one round needed"),
  );
  f.p.ammo = 5;
  f.p.reloadAt = 60;
  p = viewOf(f.g, f.p.id).players[0];
  assert(soldierActions(p, 0).extras[0].blocked);
  f.p.reloadAt = 0;
  assert(f.g.start());
  assert(
    f.g.submitInput(f.p.id, {
      ...idleInput(),
      sequence: 1,
      aim: 0,
      technique1: true,
    }),
  );
  f.g.step();
  p = viewOf(f.g, f.p.id).players[0];
  action = soldierActions(p, f.g.combatTick).extras[0];
  assert(action.at > f.g.combatTick);
  assert.equal(action.at, f.g.kitStatus(f.p.id).technique1At);
  assert(
    !f.guide
      .soldierHudLabel(p, "technique1", f.g.combatTick)
      .includes("one cover bank"),
  );
});

test("original new report/contact synthesis is finite and each native voice releases once", () => {
  for (const id of ["soldier-bank-shot", "soldier-bank"] as const) {
    assert(isSoldierSound(id));
    for (const rate of [8000, 44100, 48000, 96000, 192000]) {
      const samples = soldierBankSamples(rate, id);
      assert.deepEqual(samples, soldierBankSamples(rate, id));
      assert(samples.length < rate * 0.12);
      assert(samples.every(Number.isFinite));
      assert(samples.some((value) => value !== 0));
      assert(samples.every((value) => Math.abs(value) < 0.5));
      assert.equal(samples[0], 0);
      assert(Math.abs(samples.at(-1)!) < 0.001);
    }
    assert.throws(() => soldierBankSamples(1, id), /rate/);
    let source: any,
      disconnected = 0,
      ended = 0;
    const context = {
      sampleRate: 48000,
      destination: {},
      createBuffer: (_channels: number, length: number) => ({
        getChannelData: () => new Float32Array(length),
      }),
      createBufferSource: () =>
        (source = {
          connect() {
            return this;
          },
          disconnect() {
            disconnected++;
          },
          start() {},
          buffer: null,
          onended: null,
        }),
      createGain: () => ({
        gain: { value: 0 },
        connect() {
          return this;
        },
        disconnect() {
          disconnected++;
        },
      }),
    };
    playSoldierSound(context as unknown as AudioContext, id, 1, () => ended++);
    source.onended();
    source.onended();
    assert.equal(ended, 1);
    assert.equal(disconnected, 2);
  }
  assert(!isSoldierSound("soldier-bank-unknown"));
});
