import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { data } from '../../src/shared/game.ts';
import {bulwarkIds as lineworkIds} from '../../src/shared/tank-bulwark.ts';
import type { PlayerView } from '../../src/shared/view.ts';
import { defaultControls } from '../../src/client/input-bindings.ts';
import { menuBundle, menuEnvironment } from './menu-fixture.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const messages = JSON.parse(readFileSync(root + 'locales/en.json', 'utf8')).messages;
const iconUrls = Object.fromEntries(
  data.specializationSkills.map((skill) => [skill.id, `/fixture/${skill.id}.png`]),
);
const stubs = {
  'assets.ts':
    'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' +
    JSON.stringify(iconUrls) +
    '};',
  'i18n.ts':
    'const m=' +
    JSON.stringify(messages) +
    ';export const locale="en",number=String;export const t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[key]??key);',
};
const nodes = [...data.skills, ...data.generalSkills, ...data.specializationSkills];
export const spentBulwarkSP = (player: PlayerView) =>
  player.skills.reduce((spent, id) => spent + nodes.find((skill) => skill.id === id)!.cost, 0);

/** Exercise the source purchase button with the transport's acknowledged shop view. */
export async function bulwarkMenu(player: () => PlayerView) {
  const cleanups: (() => unknown)[] = [];
  const t = { after: (fn: () => unknown) => cleanups.push(fn) } as unknown as TestContext;
  const env = menuEnvironment(t);
  const previousCSS = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: { escape: (value: string) => value },
  });
  cleanups.push(() =>
    previousCSS
      ? Object.defineProperty(globalThis, 'CSS', previousCSS)
      : Reflect.deleteProperty(globalThis, 'CSS'),
  );
  const close = async () => {
    while (cleanups.length) await cleanups.pop()!();
  };
  let shop: Awaited<ReturnType<typeof menuBundle>>, guide: Awaited<ReturnType<typeof menuBundle>>;
  try {
    shop = await menuBundle(t, root + 'src/client/ui/shop.ts', stubs);
    guide = await menuBundle(t, root + 'src/client/ui/tank-controls.ts', stubs);
  } catch (error) {
    await close();
    throw error;
  }
  const controls = defaultControls();
  controls.bindings.technique1 = ['KeyZ', 'KeyG'];
  controls.bindings.technique2 = ['KeyN', 'KeyY'];
  controls.gamepad.technique1 = 8;
  controls.bindings.technique3 = ['KeyM', 'KeyP'];
  controls.gamepad.technique3 = 6;
  controls.gamepad.technique2 = 9;
  const observations: {
    item: string;
    earned: number;
    before: number;
    after: number;
    requests: number;
  }[] = [];
  const checkOwnedGuide=()=>{
    const current=player();env.host.innerHTML=guide.tankKitMarkup(current,controls,true);
    const entry=current.skills.includes(lineworkIds.entry),pivot=current.skills.includes(lineworkIds.pivot),port=current.skills.includes(lineworkIds.port);
    assert.equal(env.host.querySelectorAll('[data-kit-action]').length,!entry?3:port?7:pivot?6:5);
    assert.equal(!!env.host.querySelector('[data-kit-action="technique1"]'),entry);
    assert.equal(!!env.host.querySelector('[data-kit-action="technique2"]'),pivot||port);
    assert.equal(!!env.host.querySelector('[data-kit-action="fire"]'),port);
    if(entry)for(const label of ['Z','G','8'])assert(env.host.querySelector('[data-kit-action="technique1"]')!.textContent.includes(label));
    if(pivot||port)for(const label of ['N','Y','9'])assert(env.host.querySelector('[data-kit-action="technique2"]')!.textContent.includes(label));
  };
  const inspect = async (item: string, purchasable: boolean, purchase?: () => Promise<void>) => {
    const before = player();
    const node = nodes.find((skill) => skill.id === item);
    assert(node, item);
    let requests = 0,
      pending: Promise<void> | undefined;
    env.host.innerHTML =
      '<div class="loadout-editor">' +
      shop.shopMarkup(before, [], true, 'baby', undefined, true, controls) +
      '</div>';
    const binding = shop.bindShop(
      env.host,
      before,
      (request: { kind: string; item: string }) => {
        assert.deepEqual({ kind: request.kind, item: request.item }, { kind: 'skill', item });
        assert(purchase, 'An inspection must not dispatch a purchase');
        requests++;
        pending = purchase();
      },
      [],
      true,
      'baby',
      undefined,
      true,
      controls,
    );
    try {
      env.host.querySelector('[data-shop-tab="specializations"]')!.click();
      env.host.querySelector('[data-inspect="' + lineworkIds.entry + '"]')!.click();
      if (item === 'tank-protection-1')
        env.host.querySelector('[data-prerequisite="tank-protection-1"]')!.click();
      else env.host.querySelector('[data-inspect="' + item + '"]')!.click();
      if(item===lineworkIds.pivot||item===lineworkIds.port){
        const command=env.host.querySelector('#item-details [data-technique-control="technique2"]');assert(command);
        for(const label of ['N','Y','9'])assert(command.textContent.includes(label));
      }
      assert([3,9,15,21,27].includes(before.sp+spentBulwarkSP(before)));
      const button = env.host.querySelector('#buy-selected')!;
      assert.equal(button.disabled, !purchasable, item);
      if (purchase || !purchasable) button.click();
      if (purchase) {
        assert.equal(requests, 1);
        await pending;
        assert(player().skills.includes(item));
        assert.equal(player().sp, before.sp - node.cost);
      } else {
        assert.equal(requests, 0);
        assert.deepEqual(player().skills, before.skills);
        assert.equal(player().sp, before.sp);
      }
      observations.push({
        item,
        earned: before.sp + spentBulwarkSP(before),
        before: before.sp,
        after: player().sp,
        requests,
      });
    } finally {
      binding.dispose();
    }
    checkOwnedGuide();
  };
  return { inspect, close, observations, guide, controls };
}
