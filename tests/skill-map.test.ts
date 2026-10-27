import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import catalog from "../content/catalog.json";
import {
  skillMapLayout,
  skillMapMarkup,
  mapFocus,
  clampMapZoom,
  mapZoomScroll,
  prepareSkillMap,
} from "../src/client/ui/skill-map.ts";
import {
  defaultPreferences,
  validPreferences,
  migratePreferences,
} from "../src/client/preferences.ts";
import { createPracticeGame } from "../src/shared/practice-start.ts";
import { viewOf } from "../src/shared/view.ts";
import {
  recordProfileView,
  exportProfile,
  parseProfile,
} from "../src/client/profile.ts";
import { CONTENT_REVISION } from "../src/shared/protocol.ts";
import { build } from "esbuild";

test("each expanded class map exposes all 54 real skills and exactly their prerequisites without overlapping targets", () => {
  for (const cl of catalog.classes) {
    const map = skillMapLayout(cl.id),
      skills = catalog.skills.filter((s) => s.classId === cl.id);
    assert.equal(map.nodes.length, 54);
    assert.equal(map.groups.length, 3);
    assert.equal(map.paths.length, 9);
    assert.deepEqual(
      new Set(map.nodes.map((n) => n.id)),
      new Set(skills.map((s) => s.id)),
    );
    assert.deepEqual(
      new Set(map.edges.map((e) => e.from + ">" + e.to)),
      new Set(
        skills
          .filter((s) => s.prerequisite)
          .map((s) => s.prerequisite + ">" + s.id),
      ),
    );
    for (const n of map.nodes) {
      assert(
        n.x >= 87 &&
          n.x <= map.width - 87 &&
          n.y >= 250 &&
          n.y + 70 <= map.height,
      );
      for (const other of map.nodes)
        if (n.id !== other.id)
          assert(
            Math.abs(n.x - other.x) >= 174 || Math.abs(n.y - other.y) >= 104,
          );
    }
  }
  assert.throws(() => skillMapLayout("foreign"));
});

test("keyboard navigation follows path depth and neighboring branches with bounded Home and End", () => {
  const map = skillMapLayout("soldier"),
    middle = map.nodes.find((n) => n.lane === 4 && n.depth === 3)!;
  for (const [key, lane, depth] of [
    ["ArrowLeft", 3, 3],
    ["ArrowRight", 5, 3],
    ["ArrowUp", 4, 2],
    ["ArrowDown", 4, 4],
    ["Home", 4, 1],
    ["End", 4, 6],
  ] as const)
    assert.equal(
      mapFocus(map, middle.id, key),
      map.nodes.find((n) => n.lane === lane && n.depth === depth)!.id,
    );
  const first = map.nodes[0];
  assert.equal(mapFocus(map, first.id, "ArrowLeft"), first.id);
  assert.equal(mapFocus(map, first.id, "ArrowUp"), first.id);
  assert.equal(mapFocus(map, "missing", "ArrowDown"), null);
});

test("zoom retains a minimum target above 44 pixels and preserves the viewport center", () => {
  assert.equal(clampMapZoom(-3), 0.65);
  assert.equal(clampMapZoom(9), 1.4);
  assert.equal(clampMapZoom(NaN), 1);
  assert(76 * clampMapZoom(0) >= 44);
  for (const oldZoom of [0.65, 1, 1.4])
    for (const nextZoom of [0.65, 1, 1.4]) {
      const left = 500,
        viewport = 320,
        next = mapZoomScroll(left, viewport, oldZoom, nextZoom);
      assert(
        Math.abs(
          (left + viewport / 2) / oldZoom - (next + viewport / 2) / nextZoom,
        ) < 1e-9,
      );
    }
});

test("map markup has every inspect target once, real prerequisite edges and escaped labels", () => {
  const map = skillMapLayout("medic"),
    owned = [map.nodes[0].id];
  const html = skillMapMarkup(
    map,
    owned,
    1,
    (key) => "<" + key + '&"',
    (id) => `<button data-inspect="${id}"></button>`,
    "<b>root</b>",
  );
  for (const node of map.nodes)
    assert.equal(html.split(`data-inspect="${node.id}"`).length - 1, 1);
  assert.equal((html.match(/data-from=/g) ?? []).length, 45);
  assert(html.includes('class="map-forks"'));
  assert(!html.includes("<branch."));
  assert(
    html.includes("&lt;") &&
      html.includes("&amp;") &&
      html.includes('aria-hidden="true"'),
  );
  assert(
    !html.includes("data-purchase="),
    "Inspection does not directly send a purchase",
  );
});

test("map adapter provides one roving tab stop and arrow focus without a purchase action", () => {
  const map = skillMapLayout("heavy");
  let focused = "",
    scrolled = "",
    prevented = false;
  const buttons = map.nodes.map((n) => ({
    dataset: { inspect: n.id },
    tabIndex: 0,
    getAttribute: () => null,
    closest() {
      return this;
    },
    addEventListener() {},
    focus() {
      focused = n.id;
    },
    scrollIntoView() {
      scrolled = n.id;
    },
  }));
  const viewport: any = { querySelectorAll: () => buttons, onkeydown: null };
  const host: any = { querySelector: () => viewport };
  prepareSkillMap(host, map);
  assert.equal(buttons.filter((b) => b.tabIndex === 0).length, 1);
  viewport.onkeydown({
    key: "ArrowRight",
    target: buttons[0],
    preventDefault() {
      prevented = true;
    },
  });
  const expected = map.nodes.find((n) => n.lane === 1 && n.depth === 1)!.id;
  assert(prevented);
  assert.equal(focused, expected);
  assert.equal(scrolled, expected);
  assert.equal(buttons.filter((b) => b.tabIndex === 0).length, 1);
});

test("classic is the default and issued eight-field profiles retain progress while migrating the option", () => {
  const defaults = defaultPreferences();
  assert.equal(defaults.branchingTree, false);
  assert(validPreferences(defaults));
  const old: any = { ...defaults, volume: 0.25 };
  delete old.branchingTree;
  assert.equal(migratePreferences(old).branchingTree, false);
  assert.equal(migratePreferences(old).volume, 0.25);
  assert(!validPreferences({ ...defaults, branchingTree: "yes" }));
  const g = createPracticeGame(
    { seed: 773, mode: "endless" },
    "Mara",
    "soldier",
  );
  g.encounter = 1;
  g.players.get("solo")!.progress = {
    clears: 1,
    rescues: 0,
    firstEncounter: 0,
    campaignClears: 0,
    clearedBossIds: ["constable"],
  };
  const memory = new Map<string, string>(),
    store = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
  recordProfileView(viewOf(g, "solo"), "solo", store);
  const issued = JSON.parse(exportProfile(store));
  issued.contentRevision =
    "43b7b2848b50bbe56072bfa134e5775355a7faca28092624744bdae6a0d318bb";
  delete issued.settings.branchingTree;
  delete issued.settings.showNames;
  delete issued.settings.roomChat;
  const serialized = JSON.stringify(issued),
    migrated = parseProfile(serialized);
  assert.equal(migrated.contentRevision, CONTENT_REVISION);
  assert.equal(migrated.settings.branchingTree, false);
  assert.deepEqual(migrated.runs, issued.runs);
  const currentIssued = parseProfile(
    JSON.stringify({ ...issued, contentRevision: CONTENT_REVISION }),
  );
  assert.equal(currentIssued.settings.branchingTree, false);
  assert.deepEqual(currentIssued.runs, issued.runs);
  assert.equal(JSON.stringify(issued), serialized);
  assert.throws(() =>
    parseProfile(
      JSON.stringify({ ...issued, contentRevision: "f".repeat(64) }),
    ),
  );
  assert.throws(() =>
    parseProfile(
      JSON.stringify({
        ...issued,
        settings: { ...issued.settings, volume: 5 },
      }),
    ),
  );
  const opted = {
    ...migrated,
    settings: { ...migrated.settings, branchingTree: true },
  };
  assert.equal(
    parseProfile(JSON.stringify(opted)).settings.branchingTree,
    true,
  );
});

test("all fifteen locales expose the option, navigation help and zoom controls with placeholder parity", () => {
  for (const locale of catalog.locales) {
    const messages = JSON.parse(
      readFileSync("locales/" + locale.id + ".json", "utf8"),
    ).messages;
    for (const key of [
      "branchingTree",
      "skillMapHelp",
      "zoomIn",
      "zoomOut",
      "resetZoom",
    ])
      assert(
        typeof messages["ui." + key] === "string" &&
          messages["ui." + key].trim().length > 0,
      );
    assert(messages["ui.skillMapHelp"].includes("{count}"));
  }
});

test("the actual shop switches between 18 and 54 skills and expanded inspection uses the existing guarded purchase path", async () => {
  const bundle = await build({
    entryPoints: ["src/client/ui/shop.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    plugins: [
      {
        name: "shop-module-fixtures",
        setup(builder) {
          builder.onResolve({ filter: /(?:i18n|assets)\.ts$/ }, (args) => ({
            path: args.path.endsWith("i18n.ts") ? "i18n" : "assets",
            namespace: "shop-fixture",
          }));
          builder.onLoad(
            { filter: /.*/, namespace: "shop-fixture" },
            (args) => ({
              loader: "js",
              contents:
                args.path === "assets"
                  ? "export const assets={upgrades:{},items:{}};"
                  : "export const t=(key,values={})=>key+JSON.stringify(values);export const number=(value)=>String(value);",
            }),
          );
        },
      },
    ],
  });
  const shop = await import(
    "data:text/javascript;base64," +
      Buffer.from(bundle.outputFiles[0].text).toString("base64")
  );
  for (const cl of catalog.classes) {
    const g = createPracticeGame(
      { seed: 773, mode: "endless" },
      "Mara",
      cl.id as any,
    );
    const p = viewOf(g, "solo").players[0];
    assert.equal(
      (shop.shopMarkup(p, [], false).match(/data-inspect=/g) ?? []).length,
      18,
    );
    const expanded = shop.shopMarkup(p, [], true);
    assert.equal((expanded.match(/data-inspect=/g) ?? []).length, 54);
    assert.equal((expanded.match(/data-from=/g) ?? []).length, 45);
    const first = catalog.skills.find(
      (s) => s.classId === cl.id && s.lane === 0 && s.depth === 1,
    )!;
    const second = catalog.skills.find((s) => s.prerequisite === first.id)!;
    const buttons = [first, second].map((s) => ({
      dataset: { inspect: s.id, itemKind: "skill" },
      onclick: null as any,
      classList: { toggle() {} },
      setAttribute() {},
    }));
    const buy: any = { onclick: null },
      details: any = { innerHTML: "" },
      requests: any[] = [];
    const host: any = {
      querySelector: (key: string) =>
        key === "#buy-selected"
          ? buy
          : key === "#item-details"
            ? details
            : null,
      querySelectorAll: (key: string) =>
        key === "[data-inspect]" ? buttons : [],
    };
    shop.bindShop(
      host,
      p,
      (request: unknown) => requests.push(request),
      [],
      true,
    );
    buttons[0].onclick();
    assert.equal(requests.length, 0, "Inspecting never buys");
    buy.onclick();
    assert.deepEqual(requests, [{ kind: "skill", item: first.id }]);
    p.sp = 0;
    buy.onclick();
    assert.equal(requests.length, 1, "No affordable points means no request");
    p.sp = 27;
    buttons[1].onclick();
    buy.onclick();
    assert.equal(
      requests.length,
      1,
      "Missing actual prerequisite means no request",
    );
  }
});
