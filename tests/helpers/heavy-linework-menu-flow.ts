import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { data } from '../../src/shared/game.ts';
import { lineworkIds } from '../../src/shared/heavy-linework.ts';
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
export const spentLineworkSP = (player: PlayerView) =>
  player.skills.reduce((spent, id) => spent + nodes.find((skill) => skill.id === id)!.cost, 0);

/** Exercise the source purchase button with the transport's acknowledged shop view. */
export async function lineworkMenu(player: () => PlayerView) {
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
    guide = await menuBundle(t, root + 'src/client/ui/heavy-controls.ts', stubs);
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
  const checkOwnedGuide = () => {
    const current = player();
    env.host.innerHTML = guide.heavyKitMarkup(current, controls, true);
    const ownsEntry = current.skills.includes(lineworkIds.entry);
    const ownsReserve = current.skills.includes(lineworkIds.reserve);
    const ownsGuide = current.skills.includes(lineworkIds.guide);
    assert.equal(
      env.host.querySelectorAll('[data-kit-action]').length,
      ownsEntry ? (ownsReserve || ownsGuide ? 6 : 5) : 3,
    );
    const evolution = env.host.querySelector('[data-kit-action="technique3"]');
    assert.equal(!!evolution, ownsReserve || ownsGuide);
    if (evolution)
      for (const label of [
        ownsGuide ? 'Set / redirect guide' : 'Cast / select reserve',
        'M',
        'P',
        '6',
      ])
        assert(evolution.textContent.includes(label));
    if (!ownsEntry) return;
    const cast = env.host.querySelector('[data-kit-action="technique1"]')!;
    const drive = env.host.querySelector('[data-kit-action="technique2"]')!;
    for (const label of ['Anchor / release', 'Z', 'G', '8'])
      assert(cast.textContent.includes(label), label);
    for (const label of ['Haul / brake', 'N', 'Y', '9'])
      assert(drive.textContent.includes(label), label);
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
      if (item === 'heavy-ordnance-1')
        env.host.querySelector('[data-prerequisite="heavy-ordnance-1"]')!.click();
      else env.host.querySelector('[data-inspect="' + item + '"]')!.click();
      if (item === lineworkIds.reserve || item === lineworkIds.guide) {
        const evolution = env.host.querySelector(
          '#item-details [data-technique-control="technique3"]',
        )!;
        assert(evolution);
        for (const label of ['M', 'P', '6']) assert(evolution.textContent.includes(label));
      }
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
        earned: before.sp + spentLineworkSP(before),
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
