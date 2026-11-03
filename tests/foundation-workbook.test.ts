import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, data } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { skillMapLayout } from "../src/client/ui/skill-map.ts";
import { menuEnvironment, menuBundle } from "./helpers/menu-fixture.ts";
async function fixture(t: TestContext, expanded = false) {
  const env = menuEnvironment(t),
    messages = JSON.parse(readFileSync("locales/en.json", "utf8")).messages;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (s: string) => s },
  });
  t.after(() =>
    descriptor
      ? Object.defineProperty(globalThis, "CSS", descriptor)
      : Reflect.deleteProperty(globalThis, "CSS"),
  );
  const shop = await menuBundle(t, "src/client/ui/shop.ts", {
    "assets.ts": "export const assets={upgrades:{},items:{},resourceIcons:{}};",
    "i18n.ts":
      "const messages=" +
      JSON.stringify(messages) +
      ';export const locale="en",number=String;export const t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),messages[key]??key);',
  });
  const g = new Game(),
    p = g.addPlayer("p", "Tamsin", "engineer"),
    v = viewOf(g, p.id).players[0],
    requests: unknown[] = [];
  env.host.innerHTML =
    '<div class="loadout-editor">' +
    shop.shopMarkup(v, [], expanded) +
    "</div>";
  const binding = shop.bindShop(
    env.host,
    v,
    (r: unknown) => requests.push(r),
    [],
    expanded,
  );
  t.after(() => binding.dispose());
  return { ...env, shop, g, p, v, requests };
}
test("General separates four shared techniques from the three issued branch trees; no purchase is duplicated or sent by inspection", async (t) => {
  const f = await fixture(t);
  assert.equal(f.host.querySelectorAll("[data-branch]").length, 4);
  assert.equal(f.host.querySelectorAll("[data-inspect]").length, 18);
  assert(!f.host.querySelector('[data-inspect="general-sprint"]'));
  const branches = data.classes.find((c) => c.id === "engineer")!.branches;
  for (const branch of branches) {
    f.host.querySelector('[data-branch="' + branch.id + '"]')!.click();
    assert.equal(f.host.querySelectorAll("[data-inspect]").length, 18);
    for (const n of data.skills.filter((s) => s.branchId === branch.id))
      assert(f.host.querySelector('[data-inspect="' + n.id + '"]'));
  }
  f.host.querySelector('[data-branch="general"]')!.click();
  assert.equal(f.host.querySelectorAll("[data-inspect]").length, 4);
  assert(!f.host.querySelector('[data-inspect="engineer-constructs-1"]'));
  f.host.querySelector('[data-inspect="general-course-correction"]')!.click();
  assert(f.host.querySelector("#buy-selected")!.disabled);
  assert.equal(f.requests.length, 0);
  f.host
    .querySelector('.shared-techniques [data-prerequisite="general-sprint"]')!
    .click();
  assert.equal(f.document.activeElement?.dataset.inspect, "general-sprint");
  assert.equal(f.requests.length, 0);
});
test("Expanded General keeps all 54 issued nodes, and its reading view preserves every purchase and real prerequisite", async (t) => {
  const f = await fixture(t, true),
    map = skillMapLayout("engineer");
  assert.equal(f.host.querySelectorAll("[data-inspect]").length, 54);
  f.host.querySelector('[data-foundation-mode="list"]')!.click();
  assert(f.host.querySelector(".foundation-reading"));
  assert.equal(f.host.querySelectorAll("[data-inspect]").length, 54);
  for (const edge of map.edges)
    assert(f.host.querySelector('[data-prerequisite="' + edge.from + '"]'));
  for (const b of f.host.querySelectorAll("[data-inspect]"))
    assert.equal(b.tabIndex, 0);
  f.host.querySelector('[data-foundation-mode="map"]')!.click();
  assert(f.host.querySelector(".skill-map-canvas"));
  assert.equal(f.host.querySelectorAll("[data-inspect]").length, 54);
  assert.equal(f.requests.length, 0);
});
test("Specialization overview zoom scales the complete map from 35 to 200 percent; Fit and reading view do not purchase or omit techniques", async (t) => {
  const f = await fixture(t);
  f.host.querySelector('[data-shop-tab="specializations"]')!.click();
  for (let n = 0; n < 15; n++)
    f.host.querySelector('[data-specialization-zoom="out"]')!.click();
  assert(f.host.querySelector('[data-specialization-zoom="out"]')!.disabled);
  assert(
    f.host
      .querySelector(".specialization-graph")!
      .getAttribute("style")!
      .includes("transform:scale(0.35)"),
  );
  assert(
    f.host
      .querySelector(".specialization-graph")!
      .getAttribute("style")!
      .includes("--graph-width:2100px"),
  );
  assert(
    f.host
      .querySelector(".specialization-sheet")!
      .getAttribute("style")!
      .includes("width:735px"),
  );
  for (let n = 0; n < 20; n++)
    f.host.querySelector('[data-specialization-zoom="in"]')!.click();
  assert(f.host.querySelector('[data-specialization-zoom="in"]')!.disabled);
  assert(
    f.host
      .querySelector(".specialization-graph")!
      .getAttribute("style")!
      .includes("transform:scale(2)"),
  );
  const viewport = f.host.querySelector(".specialization-viewport")!;
  Object.assign(viewport, { clientWidth: 500, clientHeight: 350 });
  f.host.querySelector('[data-specialization-zoom="fit"]')!.click();
  assert(
    f.host
      .querySelector(".specialization-graph")!
      .getAttribute("style")!
      .includes("transform:scale(0.35)"),
  );
  f.host.querySelector('[data-specialization-mode="list"]')!.click();
  assert(f.host.querySelector(".reading-view"));
  assert.equal(
    f.host.querySelectorAll("[data-inspect]").length,
    data.specializationSkills.length,
  );
  assert(f.host.querySelector('[data-specialization-zoom="fit"]')!.disabled);
  assert.equal(f.requests.length, 0);
});

test('The wider two-route manual opens fitted once and retains a deliberately chosen zoom across tabs',async t=>{
  const f=await fixture(t),prototype=Object.getPrototypeOf(f.host),saved=new Map<string,PropertyDescriptor|undefined>();
  for(const [key,size]of [['clientWidth',1000],['clientHeight',620]] as const){
    saved.set(key,Object.getOwnPropertyDescriptor(prototype,key));
    Object.defineProperty(prototype,key,{configurable:true,get(){return this.classList.contains('specialization-viewport')?size:0;},set(){}});
  }
  t.after(()=>{for(const [key,descriptor]of saved)descriptor?Object.defineProperty(prototype,key,descriptor):Reflect.deleteProperty(prototype,key);});
  f.host.querySelector('[data-shop-tab="specializations"]')!.click();
  let zoom=f.host.querySelector('.specialization-graph')!.getAttribute('style')!;
  assert(zoom.includes('transform:scale(0.47)'),'initial fit includes both route regions without rounding beyond the viewport');
  assert.equal(f.host.querySelectorAll('[data-inspect]').length,data.specializationSkills.length);
  f.host.querySelector('[data-specialization-zoom="reset"]')!.click();
  assert(f.host.querySelector('.specialization-graph')!.getAttribute('style')!.includes('transform:scale(1)'));
  f.host.querySelector('[data-shop-tab="general"]')!.click();f.host.querySelector('[data-shop-tab="specializations"]')!.click();
  zoom=f.host.querySelector('.specialization-graph')!.getAttribute('style')!;assert(zoom.includes('transform:scale(1)'));assert.equal(f.requests.length,0);
});
test("Each General branch draws exactly its eighteen issued IDs and prerequisite links with room for labels", () => {
  for (const cl of data.classes)
    for (const branch of cl.branches) {
      const map = skillMapLayout(cl.id, branch.id),
        skills = data.skills.filter(
          (s) => s.classId === cl.id && s.branchId === branch.id,
        );
      assert.equal(map.nodes.length, 18);
      assert.equal(map.groups.length, 1);
      assert.equal(map.paths.length, 3);
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
      for (const n of map.nodes)
        for (const other of map.nodes)
          if (n.id !== other.id)
            assert(
              Math.abs(n.x - other.x) >= 196 || Math.abs(n.y - other.y) >= 150,
            );
    }
});
