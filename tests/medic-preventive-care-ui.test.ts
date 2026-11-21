import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { fieldSurgeryIds } from '../src/shared/medic-field-surgery.ts';
import { preventiveCareIds } from '../src/shared/medic-preventive-care.ts';
import { rapidResponseIds } from '../src/shared/medic-rapid-response.ts';
import { viewOf, type PlayerView } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, doorstep, layered } = preventiveCareIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const emblems = Object.fromEntries(Object.values(preventiveCareIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(emblems) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('Preventive Care shows its actual foundation, two choices and distinct Medic overview lanes', () => {
  const route = specializationMapLayout('medic', entry)!;
  const all = specializationMapLayout('medic')!;
  assert.deepEqual(route.nodes.filter(node => node.reference).map(node => node.id), ['medic-chemistry-1']);
  assert.deepEqual(route.edges, [
    { from: 'medic-chemistry-1', to: entry }, { from: entry, to: doorstep }, { from: entry, to: layered },
  ]);
  assert.deepEqual(route.exclusions, [{ a: doorstep, b: layered }]);
  assert.equal(specializationFocus(route, entry, 'ArrowUp'), 'medic-chemistry-1');
  assert.equal(specializationFocus(route, doorstep, 'ArrowRight'), layered);
  for (const [root, child] of [
    ['medic-chemistry-1', entry], ['medic-recovery-1', rapidResponseIds.entry], ['medic-triage-1', fieldSurgeryIds.entry],
  ]) assert.equal(all.nodes.find(node => node.id === root)?.x, all.nodes.find(node => node.id === child)?.x);
  assert.equal(new Set(all.nodes.map(node => node.x + ',' + node.y)).size, all.nodes.length);
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Medic shop preserves Action 3 bindings and confirms the selected fitting', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode: 'short' });
  game.encounter = 1;
  const medic = game.addPlayer('solo', 'Iona', 'medic');
  assert.equal(medic.totalSp, 9);
  const controls = defaultControls();
  controls.bindings.technique3 = ['KeyI', 'KeyJ'];
  controls.gamepad.technique3 = 16;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(medic.id, { id: 'confirm-' + item, kind: 'skill', item });
  const selected = expanded ? layered : doorstep;
  const rejected = expanded ? doorstep : layered;
  const confirmed: string[] = [];
  function show() {
    const player = viewOf(game, medic.id).players[0];
    env.host.innerHTML = '<div class="loadout-editor">' + shop.shopMarkup(player, [], expanded, 'normal', undefined, true, controls) + '</div>';
    const binding = shop.bindShop(env.host, player, (request: { item: string }) => {
      assert(buy(request.item).ok);
      confirmed.push(request.item);
    }, [], expanded, 'normal', undefined, true, controls);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    env.host.querySelector('[data-specialization-route="' + entry + '"]')!.click();
    return binding;
  }
  let binding = show();
  try {
    assert(!env.host.querySelector('[data-medic-kit] [data-kit-action="technique3"]'));
    env.host.querySelector('[data-inspect="' + entry + '"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { binding.dispose(); }
  assert(buy('medic-chemistry-1').ok);
  assert(buy(entry).ok);
  binding = show();
  try {
    const row = env.host.querySelector('[data-kit-action="technique3"]')!;
    for (const label of ['Precaution Wrap', 'I', 'J', '16']) assert(row.textContent.includes(label));
    env.host.querySelector('[data-inspect="' + selected + '"]')!.click();
    assert(env.host.querySelectorAll('img').some(img => img.getAttribute('src') === selected + '.png'));
    assert.deepEqual(confirmed, []);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(confirmed, [selected]);
  } finally { binding.dispose(); }
  binding = show();
  try {
    const guide = env.host.querySelector('[data-medic-kit]')!;
    assert(guide.textContent.includes(expanded ? 'After one or two wounds' : 'Walk in from outside'));
    env.host.querySelector('[data-inspect="' + rejected + '"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { binding.dispose(); }
});

test('The three owned Medic actions retain their respective clocks and fitting labels', async t => {
  const { medicActions, medicHudLabel } = await menuBundle(t, 'src/client/medic-actions.ts', stubs) as typeof import('../src/client/medic-actions.ts');
  const game = new Game({ mode: 'short' });
  const medic = game.addPlayer('solo', 'Iona', 'medic');
  const player = viewOf(game, medic.id).players[0];
  assert.deepEqual(medicActions(player, 0).extras, []);
  const withWrap = (precautionWrap: PlayerView['kit']['precautionWrap'], fitting: typeof doorstep | typeof layered = layered): PlayerView => ({
    ...player, qAt: 80, eAt: 200, skills: [fieldSurgeryIds.entry, rapidResponseIds.entry, entry, fitting],
    kit: { ...player.kit, fieldDressing: { phase: 'idle', ready: false }, rapidResponse: { phase: 'idle', ready: false }, precautionWrap },
  });
  const rearming = withWrap({ phase: 'idle', ready: false, until: 100 });
  assert.deepEqual(medicActions(rearming, 55).extras.map(({ key, at }) => [key, at]), [
    ['technique1', 80], ['technique2', 200], ['technique3', 100],
  ]);
  const floor = withWrap({ phase: 'armed', ready: true, until: 83, patient: 'solo', canPlace: true }, doorstep);
  assert.equal(medicHudLabel(floor, 'technique3', 55), 'Place Doorstep Kit');
  assert.deepEqual(medicActions(floor, 55).extras[2], { key: 'technique3', id: doorstep, at: 0, blocked: false });
  const ground = withWrap({ phase: 'station', ready: false, until: 83 }, doorstep);
  assert.equal(medicHudLabel(ground, 'technique3', 55), 'Kit on the ground');
  assert.equal(medicActions(ground, 55).extras[2].at, 83);
  const stored = withWrap({ phase: 'layered', ready: true, until: 83, patient: 'solo', capturedHits: 2 });
  assert.equal(medicHudLabel(stored, 'technique3', 55), 'Give layered dose');
  assert.equal(medicActions(stored, 55).extras[2].id, layered);
  const settling = withWrap({ phase: 'settling', ready: false, until: 61, patient: 'solo' });
  assert.equal(medicHudLabel(settling, 'technique3', 55), 'Dose settling');
  assert.equal(medicActions(settling, 55).extras[2].at, 61);
});
