import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { data } from "../src/shared/game.ts";
import { runtimeArena } from "../src/shared/arena-layouts.ts";
import {
  arenaPreviewModel,
  arenaPreviewMarkup,
} from "../src/client/arena-preview.ts";
import {
  expeditionText,
  type ExpeditionMessage,
} from "../src/client/expedition-text.ts";
import words from "../src/client/expedition-messages.json";
import { drawMoldCue, moldReactionVisual } from "../src/client/mold-cues.ts";
import type { MoldReaction } from "../src/shared/mold-mixing.ts";
import type Phaser from "phaser";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { viewOf } from "../src/shared/view.ts";
import type { ClassId } from "../src/shared/protocol.ts";

test("all six opening arenas show the real bounds, cover, spawns and difficulty hazards", () => {
  const before = JSON.stringify(data.arenas);
  for (const map of data.arenas)
    for (const difficulty of data.difficulties) {
      const model = arenaPreviewModel(map.id, difficulty.id);
      const arena = runtimeArena(map.id, difficulty.id);
      const [x, y, width, height] = model.viewBox.split(" ").map(Number);
      assert(x < arena.bounds.x && y < arena.bounds.y);
      assert(x + width > arena.bounds.x + arena.width);
      assert(y + height > arena.bounds.y + arena.height);
      const grounds = { [model.groundKey]: "/ground.png" };
      const html = arenaPreviewMarkup(map.id, difficulty.id, grounds, {
        name: "Map <unsafe>",
        difficulty: difficulty.id,
        overview: "Arena overview",
        start: "Your start",
        boss: "Boss start",
        cover: "Cover",
        lava: "Lava",
      });
      assert(!html.includes("<unsafe>"));
      assert(html.includes("Map &lt;unsafe&gt;"));
      assert.equal(
        (html.match(/class="arena-cover"/g) ?? []).length,
        arena.cover.length,
      );
      assert.equal(
        (html.match(/class="arena-lava"/g) ?? []).length,
        arena.lavaPits.length,
      );
      for (const spawn of [arena.playerSpawn, arena.bossSpawn])
        assert(html.includes(`translate(${spawn.x} ${spawn.y})`));
      assert.equal(html.includes("legend-cover"), arena.cover.length > 0);
      assert.equal(html.includes("legend-lava"), arena.lavaPits.length > 0);
    }
  assert.equal(JSON.stringify(data.arenas), before);
  assert.equal(
    arenaPreviewModel("gatehouse", "hard").groundKey,
    "gatehouse-half",
  );
  assert.equal(
    arenaPreviewModel("gatehouse", "hellish").groundKey,
    "gatehouse-open",
  );
  assert.throws(
    () => arenaPreviewMarkup("gatehouse", "normal", {}, {} as never),
    /Missing arena preview ground/,
  );
});

test("welcome, map legends and difficulty explanations cover all fifteen supported locales", () => {
  const keys = Object.keys(words.en).sort();
  assert.deepEqual(
    Object.keys(words).sort(),
    data.locales.map((l) => l.id).sort(),
  );
  for (const language of data.locales) {
    const local = words[language.id as keyof typeof words];
    assert.deepEqual(Object.keys(local).sort(), keys);
    for (const key of keys) {
      const value = expeditionText(language.id, key as ExpeditionMessage);
      assert.equal(typeof value, "string");
      assert(value.trim().length > 0);
      assert(!/[{}<>]|\bTODO\b|\bTBD\b/.test(value));
    }
    for (const difficulty of data.difficulties)
      assert(
        Object.hasOwn(local, difficulty.id),
        language.id + ": missing difficulty explanation",
      );
  }
  assert.equal(expeditionText("unknown", "firstWatch"), words.en.firstWatch);
});

test("compiled public setup offers an optional gentle confirmation, preserves the profile and never shows an opener or currency tools", async (t) => {
  const bundle = await build({
    entryPoints: ["src/client/ui/setup.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { __GA_TESTING_BUILD__: "false" },
    loader: { ".css": "empty" },
    plugins: [
      {
        name: "public-setup-fixtures",
        setup(builder) {
          builder.onResolve(
            { filter: /(?:i18n|assets|session)\.ts$/ },
            (args) => ({
              path: args.path.endsWith("i18n.ts")
                ? "i18n"
                : args.path.endsWith("session.ts")
                  ? "session"
                  : "assets",
              namespace: "setup-fixture",
            }),
          );
          builder.onLoad(
            { filter: /.*/, namespace: "setup-fixture" },
            (args) => ({
              loader: "js",
              contents:
                args.path === "i18n"
                  ? "export const locale='en';export const languages=[['en','English']];export const number=String;export const t=key=>key;export const setLanguage=async()=>{};"
                  : args.path === "session"
                    ? "export class Session { async rooms() { return []; } }"
                    : `export const assets={cover:'/cover.png',portraits:{},medic:'/medic.png',lineup:'/lineup.png',arenaGrounds:${JSON.stringify(Object.fromEntries([...data.arenas.map((a) => a.id), "gatehouse-half", "gatehouse-open"].map((id) => [id, "/" + id + ".png"])))}};`,
            }),
          );
        },
      },
    ],
  });
  const directory = mkdtempSync(join(tmpdir(), "grave-public-setup-"));
  const bundlePath = join(directory, "setup.mjs");
  writeFileSync(bundlePath, bundle.outputFiles[0].text);
  t.after(() => {
    unlinkSync(bundlePath);
    rmdirSync(directory);
  });
  const ui = await import(pathToFileURL(bundlePath).href);
  // A deliberately small DOM fixture exercises handlers and generated markup, not layout or browser rendering.
  class Element {
    nodes: Element[] = [];
    html = "";
    value = "";
    dataset: Record<string, string> = {};
    onclick?: () => void;
    oninput?: () => void;
    focused = false;
    constructor(
      public tag = "main",
      public attrs: Record<string, string> = {},
    ) {
      this.value = attrs.value ?? "";
      for (const [key, value] of Object.entries(attrs))
        if (key.startsWith("data-"))
          this.dataset[
            key.slice(5).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
          ] = value;
    }
    set innerHTML(html: string) {
      this.html = html;
      this.nodes = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)].map(
        (match) => {
          const attrs = Object.fromEntries(
            [...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [
              a[1],
              a[2],
            ]),
          );
          return new Element(match[1], attrs);
        },
      );
    }
    get innerHTML() {
      return this.html;
    }
    matches(selector: string) {
      if (selector.startsWith("#")) return this.attrs.id === selector.slice(1);
      if (selector.startsWith("[")) {
        const match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/)!;
        return (
          Object.hasOwn(this.attrs, match[1]) &&
          (match[2] === undefined || this.attrs[match[1]] === match[2])
        );
      }
      return this.tag === selector;
    }
    querySelectorAll(selector: string): Element[] {
      return this.nodes
        .flatMap((n) => [n, ...n.querySelectorAll("*")])
        .filter((n) => selector === "*" || n.matches(selector));
    }
    querySelector(selector: string): Element | undefined {
      if (selector === "#setup-content h1")
        return this.querySelector("#setup-content")?.querySelector("h1");
      return this.querySelectorAll(selector)[0];
    }
    focus() {
      this.focused = true;
    }
    click() {
      this.onclick?.();
    }
  }
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const saved = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { scrollTo() {} },
  });
  t.after(() => {
    for (const [key, descriptor] of [
      ["localStorage", previousStorage],
      ["window", previousWindow],
    ] as const)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
  });
  const host = new Element();
  const launches: unknown[][] = [];
  ui.mountSetup(host, {
    resume() {},
    launch: (...args: unknown[]) => launches.push(args),
    profileChanged: async () => {},
    settingsHTML: () => "<details></details>",
    bindSettings() {},
  });
  const content = () => host.querySelector("#setup-content")!;
  assert(content().innerHTML.includes("first-watch"));
  assert.equal(host.querySelectorAll("dialog").length, 0);
  assert(!content().innerHTML.includes("tutorial-overlay"));
  assert(host.querySelector("#gentle-start"));
  const storageBefore = [...saved.entries()];
  host.querySelector("#gentle-start")!.click();
  assert.equal(
    launches.length,
    0,
    "gentle preset must wait for the player to confirm",
  );
  assert(!host.querySelector("#opening-boss"));
  assert(!host.querySelector("#testing-unlock-home"));
  assert(!content().innerHTML.includes("testing-coins"));
  const name = host.querySelector("#name")!;
  name.value = "New survivor";
  name.oninput!();
  host.querySelector("#setup-back")!.click();
  host.querySelector('[data-difficulty="easy"]')!.click();
  assert(host.querySelector('[data-difficulty="easy"]')!.focused);
  host.querySelector("#setup-next")!.click();
  assert.equal(host.querySelector("#name")!.value, "New survivor");
  host.querySelector("#launch")!.click();
  assert.equal(launches.length, 1);
  const [online, options] = launches[0] as [boolean, Record<string, unknown>];
  assert.equal(online, false);
  assert.equal(options.name, "New survivor");
  assert.equal(options.difficulty, "easy");
  assert.equal(options.classId, "soldier");
  assert.equal(options.mode, "short");
  assert.equal(options.openingArenaId, "gatehouse");
  assert.equal(options.serverEndpoint, undefined);
  assert.equal(options.coins, undefined);
  assert.equal(options.sp, undefined);
  assert.deepEqual([...saved.entries()], storageBefore);
  saved.set("ga-tutorial-v1", "done");
  host.querySelector("#brand-home")!.click();
  assert(
    host.querySelector("#gentle-start"),
    "Reading the tutorial must not remove the first-run preset before a local run exists",
  );
});

test("actual armory presents all seven classes' existing names and prices while inspection and unaffordable buys spend nothing", async (t) => {
  const bundle = await build({
    entryPoints: ["src/client/ui/shop.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    loader: { ".css": "empty" },
    plugins: [
      {
        name: "armory-fixture",
        setup(builder) {
          builder.onResolve({ filter: /(?:i18n|assets)\.ts$/ }, (args) => ({
            path: args.path.endsWith("i18n.ts") ? "i18n" : "assets",
            namespace: "armory-fixture",
          }));
          builder.onLoad(
            { filter: /.*/, namespace: "armory-fixture" },
            (args) => ({
              loader: "js",
              contents:
                args.path === "i18n"
                  ? "export const locale='en';export const t=key=>key;export const number=String;"
                  : "export const assets={upgrades:{},items:{}};",
            }),
          );
        },
      },
    ],
  });
  const directory = mkdtempSync(join(tmpdir(), "grave-armory-"));
  const file = join(directory, "shop.mjs");
  writeFileSync(file, bundle.outputFiles[0].text);
  t.after(() => {
    unlinkSync(file);
    rmdirSync(directory);
  });
  const ui = await import(pathToFileURL(file).href);
  for (const cl of data.classes) {
    const g = createPracticeGame(
      { mode: "short" },
      "New player",
      cl.id as ClassId,
    );
    const player = viewOf(g, "solo").players[0];
    player.coins = 0;
    const weapons = data.weapons.filter((w) => w.classId === cl.id);
    const buttons = weapons.map((w) => ({
      dataset: { inspect: w.id, itemKind: "weapon" },
      onclick: undefined as undefined | (() => void),
      classList: { toggle() {} },
      setAttribute() {},
    }));
    const gear = {
      dataset: { shopTab: "gear" },
      onclick: undefined as undefined | (() => void),
    };
    const workspace = { innerHTML: "" },
      details = { innerHTML: "" },
      buy = { onclick: undefined as undefined | (() => void) };
    const requests: unknown[] = [];
    const host = {
      querySelector: (selector: string) =>
        selector === ".loadout-editor"
          ? workspace
          : selector === "#item-details"
            ? details
            : selector === "#buy-selected"
              ? buy
              : null,
      querySelectorAll: (selector: string) =>
        selector === "[data-shop-tab]"
          ? [gear]
          : selector === "[data-inspect]"
            ? buttons
            : [],
    };
    ui.bindShop(host, player, (request: unknown) => requests.push(request));
    gear.onclick!();
    const markup = workspace.innerHTML;
    assert.equal(
      (markup.match(/class="gear-name"/g) ?? []).length,
      weapons.length + data.upgrades.length + data.supplies.length,
    );
    assert(markup.includes(words.en.shopHelp));
    for (const weapon of weapons) {
      const tile = markup
        .split('data-inspect="' + weapon.id + '"')[1]
        ?.split("</button>")[0];
      assert(tile?.includes("weapon." + weapon.id + ".name"));
      assert(
        tile?.includes(
          weapon.id === player.weapon
            ? "ui.equipped"
            : String(weapon.price) + " ui.coins",
        ),
      );
    }
    const premium = weapons.find((w) => w.price > 0)!;
    buttons.find((b) => b.dataset.inspect === premium.id)!.onclick!();
    assert.equal(
      requests.length,
      0,
      "Inspection must not buy or spend currency",
    );
    buy.onclick!();
    assert.equal(requests.length, 0, "An unaffordable item stays guarded");
    assert(details.innerHTML.includes("ui.notEnoughCoins"));
    player.coins = premium.price;
    buy.onclick!();
    assert.deepEqual(requests, [{ kind: "weapon", item: premium.id }]);
  }
});

const reaction = (fired = false): MoldReaction => ({
  kind: "mold-reaction",
  id: 42,
  x: 500,
  y: 400,
  radius: 90,
  type: "catalytic",
  beganAt: 10,
  at: 40,
  until: 48,
  fired,
  sources: [],
});

test("catalytic warnings retain their real radius and produce a bounded local eruption with a static reduced-motion alternative", () => {
  for (const reduced of [false, true])
    for (const now of [10, 25, 39, 40, 44, 47]) {
      const cue = reaction(now >= 40);
      const before = structuredClone(cue);
      const calls: { name: string; args: number[] }[] = [];
      const graphics = new Proxy(
        {},
        {
          get(_target, key) {
            return (...args: number[]) => {
              calls.push({ name: String(key), args });
              return graphics;
            };
          },
        },
      ) as Phaser.GameObjects.Graphics;
      drawMoldCue(graphics, graphics, cue, now, [cue], reduced);
      assert.deepEqual(cue, before);
      assert(
        calls.some(
          (c) =>
            c.name === "strokeCircle" &&
            c.args[0] === cue.x &&
            c.args[1] === cue.y &&
            c.args[2] === cue.radius,
        ),
      );
      for (const call of calls.filter(
        (c) => c.name === "fillCircle" || c.name === "strokeCircle",
      )) {
        assert(call.args.every(Number.isFinite));
        assert(call.args[2] <= cue.radius);
      }
      assert(calls.length < 90);
      if (now >= cue.at) {
        assert.equal(calls.filter((c) => c.name === "lineBetween").length, 8);
        assert.equal(calls.filter((c) => c.name === "lineTo").length, 15);
      }
      const state = moldReactionVisual(cue, now, reduced);
      assert.equal(state.fired, now >= cue.at);
      assert(state.progress >= 0 && state.progress <= 1);
      if (reduced) assert.equal(state.ringRadius, cue.radius);
    }
});
