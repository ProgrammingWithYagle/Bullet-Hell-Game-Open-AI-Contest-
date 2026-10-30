import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';
import { Game } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
async function fixture(t: TestContext) {
  const env = menuEnvironment(t),
    ui = await menuBundle(t, 'src/client/ui/shop.ts', {
      'assets.ts': 'export const assets={items:{},upgrades:{}};',
    });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: { escape: (value: string) => value },
  });
  t.after(() =>
    descriptor
      ? Object.defineProperty(globalThis, 'CSS', descriptor)
      : Reflect.deleteProperty(globalThis, 'CSS'),
  );
  const game = new Game();
  game.addPlayer('qa', 'QA', 'soldier');
  const player = viewOf(game, 'qa').players[0],
    requests: unknown[] = [];
  env.host.innerHTML =
    '<div class="loadout-editor">' + ui.shopMarkup(player) + '</div>';
  const binding = ui.bindShop(env.host, player, (request: unknown) =>
    requests.push(request),
  );
  env.cleanup.push(() => binding?.dispose?.());
  return { ...env, ui, player, binding, requests };
}
test('switching equipment tabs retains focus on the current selected tab', async (t) => {
  const f = await fixture(t),
    old = f.host.querySelector('[data-shop-tab="gear"]')!;
  old.focus();
  old.click();
  const current = f.host.querySelector('[data-shop-tab="gear"]')!;
  assert(
    f.document.activeElement === current,
    'Focus must move to the live gear tab',
  );
  assert.equal(current.getAttribute('aria-selected'), 'true');
  assert.equal(current.tabIndex, 0);
  assert.equal(f.host.querySelector('[data-shop-tab="tree"]')!.tabIndex, -1);
});
test('switching skill branches retains focus and old detached tab handlers cannot redraw the panel', async (t) => {
  const f = await fixture(t),
    oldTab = f.host.querySelector('[data-shop-tab="gear"]')!,
    branch = f.host.querySelectorAll('[data-branch]')[1];
  branch.focus();
  branch.click();
  const current = f.host.querySelector(
    '[data-branch="' + branch.dataset.branch + '"]',
  )!;
  assert(
    f.document.activeElement === current,
    'Focus must move to the live branch tab',
  );
  oldTab.click();
  assert.equal(
    f.host
      .querySelector('[data-shop-tab="tree"]')!
      .getAttribute('aria-selected'),
    'true',
  );
});
test('arrow, Home and End keys navigate shop tabs, including mirrored horizontal direction', async (t) => {
  const f = await fixture(t);
  let prevented = false;
  const tree = f.host.querySelector('[data-shop-tab="tree"]')!;
  tree.focus();
  tree.dispatch('keydown', {
    key: 'Home',
    preventDefault() {
      prevented = true;
    },
  });
  assert(prevented);
  assert.equal(
    f.host
      .querySelector('[data-shop-tab="gear"]')!
      .getAttribute('aria-selected'),
    'true',
  );
  f.document.documentElement.setAttribute('dir', 'rtl');
  f.host
    .querySelector('[data-shop-tab="gear"]')!
    .dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(
    f.host
      .querySelector('[data-shop-tab="tree"]')!
      .getAttribute('aria-selected'),
    'true',
  );
});
test('disposed equipment ignores old connected controls and cannot submit a purchase', async (t) => {
  const f = await fixture(t);
  f.host.querySelector('[data-inspect="soldier-ballistics-1"]')!.click();
  f.binding?.dispose?.();
  f.host.querySelector('#buy-selected')!.click();
  assert.equal(f.requests.length, 0);
});
test('purchase errors remain in the current equipment status and clear on a fresh item choice', async (t) => {
  const f = await fixture(t);
  f.host.querySelector('[data-inspect="soldier-ballistics-1"]')!.click();
  f.binding?.reportPurchase?.({ ok: false, reason: 'insufficientCoins' });
  const status = f.host.querySelector('[data-shop-status]');
  assert(status, 'Equipment needs its own purchase status');
  assert.equal(status.textContent, 'ui.notEnoughCoins');
  assert.equal(status.hidden, false);
  f.host.querySelector('[data-inspect="soldier-ballistics-2"]')!.click();
  assert.equal(f.host.querySelector('[data-shop-status]')!.hidden, true);
  f.binding?.reportPurchase?.({ ok: false, reason: 'matchPaused' });
  assert.equal(
    f.host.querySelector('[data-shop-status]')!.textContent,
    'ui.matchPaused',
  );
});

test('a prerequisite link focuses its actual skill without resetting the skill scroll', async (t) => {
  const f = await fixture(t),
    scroll = f.host.querySelector('.skill-scroll')!;
  Object.assign(scroll, { scrollTop: 140, scrollLeft: 35 });
  f.host.querySelector('[data-inspect="soldier-ballistics-2"]')!.click();
  f.host.querySelector('[data-prerequisite]')!.click();
  assert(
    f.document.activeElement ===
      f.host.querySelector('[data-inspect="soldier-ballistics-1"]'),
  );
  assert.equal((f.host.querySelector('.skill-scroll') as any).scrollTop, 140);
  assert.equal((f.host.querySelector('.skill-scroll') as any).scrollLeft, 35);
});

test('hidden or inert equipment cannot spend currency and a disposed result cannot alter a newer panel', async (t) => {
  const f = await fixture(t);
  f.host.querySelector('[data-inspect="soldier-ballistics-1"]')!.click();
  f.host.hidden = true;
  f.host.querySelector('#buy-selected')!.click();
  assert.equal(f.requests.length, 0);
  f.host.hidden = false;
  (f.host as any).inert = true;
  f.host.querySelector('#buy-selected')!.click();
  assert.equal(f.requests.length, 0);
  f.binding.dispose();
  (f.host as any).inert = false;
  f.host.innerHTML = '<p data-shop-status>New panel</p>';
  f.binding.reportPurchase({ ok: false, reason: 'insufficientCoins' });
  assert.equal(
    f.host.querySelector('[data-shop-status]')!.textContent,
    'New panel',
  );
});
