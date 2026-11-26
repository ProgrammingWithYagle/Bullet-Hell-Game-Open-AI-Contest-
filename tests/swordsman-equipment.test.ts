import test from 'node:test';
import assert from 'node:assert/strict';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';
import english from '../locales/en.json';
import { Game } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
test('Swordsman gear renders its real blade statistics, Breath and canteen artwork while purchases retain the authoritative item IDs', async (t) => {
  const env = menuEnvironment(t),
    messages = english.messages;
  const ui = await menuBundle(t, 'src/client/ui/shop.ts', {
    'i18n.ts':
      'const m=' +
      JSON.stringify(messages) +
      ';export const locale="en",number=String,t=(key)=>m[key]??key;',
    'assets.ts':
      'export const assets={resourceIcons:{},upgrades:{},items:{"weapon/swordsman-0":"/blade.png","supply/swordsman-canteen":"/canteen.png","upgrade/swordsman-wrapped-grip":"/grip.png"}};',
  });
  const before = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: { escape: (v: string) => v },
  });
  t.after(() =>
    before
      ? Object.defineProperty(globalThis, 'CSS', before)
      : Reflect.deleteProperty(globalThis, 'CSS'),
  );
  const g = new Game(),
    p = g.addPlayer('p', 'Dara', 'swordsman');
  p.coins = 1000;
  const player = viewOf(g, p.id).players[0],
    requests: unknown[] = [];
  env.host.innerHTML = '<div class="loadout-editor">' + ui.shopMarkup(player) + '</div>';
  const binding = ui.bindShop(env.host, player, (request: unknown) => requests.push(request));
  env.cleanup.push(() => binding.dispose());
  env.host.querySelector('[data-shop-tab="gear"]')!.click();
  assert.equal(
    env.host.querySelector('[data-inspect="ammo-pouch"] img')!.getAttribute('src'),
    '/canteen.png',
  );
  assert.equal(
    env.host.querySelector('[data-inspect="magazine"] img')!.getAttribute('src'),
    '/grip.png',
  );
  env.host.querySelector('[data-inspect="swordsman-0"]')!.click();
  const text = env.host.textContent;
  for (const key of ['ui.swordBreath', 'stat.bladeReach', 'stat.bladeArc'] as const)
    assert(text.includes(messages[key]));
  assert(text.includes('108'));
  assert(!text.includes('Projectile speed'));
  env.host.querySelector('[data-inspect="ammo-pouch"]')!.click();
  assert(env.host.textContent.includes('Canteen'));
  assert(env.host.textContent.includes('Breath'));
  env.host.querySelector('#buy-selected')!.click();
  assert.deepEqual(requests, [{ kind: 'supply', item: 'ammo-pouch' }]);
});
