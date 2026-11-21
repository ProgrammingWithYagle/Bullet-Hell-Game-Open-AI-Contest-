import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { mageBindingIds, type PivotStatus } from '../src/shared/mage-pivot-sigil.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, fixed, reverse } = mageBindingIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const emblems = Object.fromEntries(Object.values(mageBindingIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(emblems) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Binding map points to Marked Ground and identifies mutually exclusive fittings', () => {
  const route = specializationMapLayout('mage', entry)!;
  assert.deepEqual(route.nodes.filter(node => node.reference).map(node => node.id), ['mage-control-1']);
  assert.deepEqual(route.edges, [
    { from: 'mage-control-1', to: entry }, { from: entry, to: fixed }, { from: entry, to: reverse },
  ]);
  assert.deepEqual(route.exclusions, [{ a: fixed, b: reverse }]);
  assert.equal(specializationFocus(route, entry, 'ArrowUp'), 'mage-control-1');
  assert.equal(specializationFocus(route, fixed, 'ArrowRight'), reverse);
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Mage shop shows remapped Action 1 and commits only the chosen fitting', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode: 'short' });
  game.encounter = 1;
  const mage = game.addPlayer('solo', 'Sable', 'mage');
  assert.equal(mage.totalSp, 9);
  const controls = defaultControls();
  controls.bindings.technique1 = ['KeyI', 'KeyJ'];
  controls.gamepad.technique1 = 16;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(mage.id, { id: 'confirm-' + item, kind: 'skill', item });
  const selected = expanded ? reverse : fixed;
  const rejected = expanded ? fixed : reverse;
  const confirmed: string[] = [];
  function show() {
    const player = viewOf(game, mage.id).players[0];
    env.host.innerHTML = '<div class="loadout-editor">' + shop.shopMarkup(player, [], expanded, 'normal', undefined, true, controls) + '</div>';
    const binding = shop.bindShop(env.host, player, (request: { item: string }) => {
      assert(buy(request.item).ok);
      confirmed.push(request.item);
    }, [], expanded, 'normal', undefined, true, controls);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    return binding;
  }
  let binding = show();
  try {
    assert(!env.host.querySelector('[data-mage-kit] [data-kit-action="technique1"]'));
    env.host.querySelector('[data-inspect="' + entry + '"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { binding.dispose(); }
  assert(buy('mage-control-1').ok);
  assert(buy(entry).ok);
  binding = show();
  try {
    const guide = env.host.querySelector('[data-mage-kit]')!;
    const row = guide.querySelector('[data-kit-action="technique1"]')!;
    for (const label of ['Pivot Sigil', 'I', 'J', '16']) assert(row.textContent.includes(label));
    for (const name of ['Binding Sigil', 'Ward Detonation', 'Silent Twelfth']) assert(guide.textContent.includes(name));
    env.host.querySelector('[data-inspect="' + selected + '"]')!.click();
    assert(env.host.querySelectorAll('img').some(img => img.getAttribute('src') === selected + '.png'));
    assert.deepEqual(confirmed, []);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(confirmed, [selected]);
  } finally { binding.dispose(); }
  binding = show();
  try {
    const guide = env.host.querySelector('[data-mage-kit]')!;
    assert(guide.textContent.includes(expanded ? 'face the opposite way' : 'keeps its original end time'));
    env.host.querySelector('[data-inspect="' + rejected + '"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { binding.dispose(); }
});

test('The HUD reflects every Binding stage and keeps the issued Q visible with its own clock', async t => {
  const { mageActions, mageBindingLabel } = await menuBundle(t, 'src/client/mage-actions.ts', stubs) as typeof import('../src/client/mage-actions.ts');
  const game = new Game({ mode: 'short' });
  const mage = game.addPlayer('solo', 'Sable', 'mage');
  const player = viewOf(game, mage.id).players[0];
  assert.deepEqual(mageActions(player).extras, []);
  const check = (pivotSigil: PivotStatus, label: string, shownId: string, cooldown: number, at: number) => {
    const owned = { ...player, qAt: cooldown, skills: [entry, shownId], kit: { ...player.kit, pivotSigil } };
    const hud = mageActions(owned);
    assert.equal(mageBindingLabel(owned, 55), label);
    assert.equal(hud.qAt, cooldown);
    assert.equal(hud.qBlocked, false);
    assert.deepEqual(hud.extras, [{ key: 'technique1', id: shownId, at, blocked: !pivotSigil.ready }]);
  };
  check({ phase: 'idle', ready: false, until: 50 }, 'Aim at clear floor', entry, 43, 50);
  check({ phase: 'idle', ready: true, until: 50 }, 'Mark pivot', entry, 43, 0);
  check({ phase: 'marked', ready: false, until: 79 }, 'Line up the stroke', entry, 43, 79);
  check({ phase: 'marked', ready: true, until: 79 }, 'Draw the line', entry, 43, 0);
  check({ phase: 'sweeping', ready: false, until: 67 }, 'Guide the stroke', entry, 201, 67);
  check({ phase: 'sweeping', ready: true, until: 67, canFix: true }, 'Fix the line', fixed, 201, 0);
  check({ phase: 'fixed', ready: false, until: 67 }, 'Line fixed', fixed, 201, 67);
  check({ phase: 'sweeping', ready: false, until: 67, reverseArmed: true }, 'Aim opposite', reverse, 201, 67);
  check({ phase: 'sweeping', ready: true, until: 67, reverseArmed: true, canReverse: true }, 'Reverse the line', reverse, 201, 0);
});
