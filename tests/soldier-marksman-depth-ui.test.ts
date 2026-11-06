import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game } from "../src/shared/game.ts";
import { viewOf } from "../src/shared/view.ts";
import { idleInput } from "../src/shared/protocol.ts";
import { marksmanId as id, marksmanIds as ids } from "../src/shared/soldier-marksman.ts";
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
  controls.bindings.technique2=["KeyN","KeyY"];controls.gamepad.technique2=9;
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

test('both authored views inspect each real fork and later input without buying, and the owned manual exposes exactly five remapped actions',async(t)=>{
  const f=await setup(t,['soldier-ballistics-1',id,ids.carom,ids.pair],'raid');
  for(const mode of ['map','list']){
    f.host.querySelector('[data-specialization-mode="'+mode+'"]')!.click();
    for(const skill of [ids.carom,ids.line,ids.pair]){
      f.host.querySelector('[data-inspect="'+skill+'"]')!.click();
      const panel=f.host.querySelector('#item-details')!;
      assert(panel.querySelector('[data-technique-control="technique2"]'));
      assert.equal(f.requests.length,0);
    }
  }
  assert.equal(viewOf(f.g,f.p.id).players[0].sp,4);
  assert(f.host.querySelector('#buy-selected')!.getAttribute('disabled')!==null,'owned operation cannot be bought twice');
  const v=viewOf(f.g,f.p.id).players[0];
  f.host.innerHTML=f.guide.soldierKitMarkup(v,f.controls,false);
  assert.equal(f.host.querySelectorAll('[data-kit-action]').length,5);
  const pair=f.host.querySelector('[data-kit-action="technique2"]')!;
  for(const word of ['Measured Pair','N','Y','9'])assert(pair.textContent.includes(word),word);
  assert(f.host.textContent.includes('second real masonry contact'));
  assert(!f.host.textContent.includes('Cartridge Drill'));
});

test('owned HUD order and follow-up labels use actual pair authority; inspection cannot add an action',async(t)=>{
  const f=await setup(t,['soldier-ballistics-1',id,ids.line,ids.pair],'raid');
  assert(f.g.start());let sequence=0;
  const step=(cast=false)=>{f.g.submitInput(f.p.id,{...idleInput(),sequence:++sequence,aim:Math.PI,technique2:cast});f.g.step();};
  step(true);for(let n=0;n<35&&!f.g.kitStatus(f.p.id).soldierPairUntil;n++)step();
  const at=f.g.combatTick,p=viewOf(f.g,f.p.id).players[0];assert(p.kit.soldierPairUntil!>at);
  const actions=soldierActions(p,at).extras;assert.deepEqual(actions.map(a=>a.key),['technique1','technique2']);
  assert.equal(actions[1].at,0);assert(!actions[1].blocked);assert.equal(p.kit.technique1At,0);
  assert(f.guide.soldierHudLabel(p,'technique2',at).includes('second shot'));
  assert(f.guide.soldierHudLabel(p,'technique1',at).includes('one body through'));
  f.p.ammo=0;const empty=viewOf(f.g,f.p.id).players[0];assert(soldierActions(empty,at).extras[1].blocked);
  assert(f.guide.soldierHudLabel(empty,'technique2',at).includes('one round needed'));
  const unowned={...p,skills:['soldier-ballistics-1',id]};assert.equal(soldierActions(unowned,at).extras.length,1);
});
