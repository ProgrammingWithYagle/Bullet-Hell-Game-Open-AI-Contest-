import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { fieldSurgeryIds } from '../src/shared/medic-field-surgery.ts';
import { viewOf, type PlayerView } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const english = 'const m=' + JSON.stringify(messages) +
  ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),m[key]??key);";
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{}};',
  'i18n.ts': english,
};
test('the Medic tree draws the actual General prerequisite and the two mutually exclusive fittings', () => {
  const map = specializationMapLayout('medic', fieldSurgeryIds.entry)!;
  assert.deepEqual(new Set(map.nodes.filter(node => !node.reference).map(node => node.id)), new Set(Object.values(fieldSurgeryIds)));
  assert.deepEqual(map.nodes.filter(node => node.reference).map(node => node.id), ['medic-triage-1']);
  assert.equal(map.edges.length, 3);
  assert.equal(map.exclusions.length, 1);
  assert.deepEqual(new Set([map.exclusions[0].a, map.exclusions[0].b]), new Set([fieldSurgeryIds.step, fieldSurgeryIds.aside]));
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Medic guide follows the owned card and remapped controls', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const before = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (key: string) => key } });
  t.after(() => before ? Object.defineProperty(globalThis, 'CSS', before) : Reflect.deleteProperty(globalThis, 'CSS'));
  const g = new Game({ mode: 'short', seed: 41 });
  const p = g.addPlayer('solo', 'Iona', 'medic');
  const controls = defaultControls();
  controls.bindings.technique1 = ['KeyZ', 'KeyG'];
  controls.gamepad.technique1 = 16;
  assert(validControls(controls));
  const guide = async (owned: boolean) => {
    const player = viewOf(g, p.id).players[0];
    env.host.innerHTML = '<div class="loadout-editor">' + shop.shopMarkup(player, [], expanded, 'normal', undefined, true, controls) + '</div>';
    const binding = shop.bindShop(env.host, player, () => assert.fail('Inspection does not buy'), [], expanded, 'normal', undefined, true, controls);
    try {
      env.host.querySelector('[data-shop-tab="specializations"]')!.click();
      const kit = env.host.querySelector('[data-medic-kit]');
      assert(kit);
      assert(kit.textContent.includes('Healing Field'));
      const action = kit.querySelector('[data-kit-action="technique1"]');
      assert.equal(!!action, owned);
      if (owned) {
        assert(action);
        assert(action.textContent.includes('Field Dressing'));
        assert(action.textContent.includes('Z'));
        assert(action.textContent.includes('G'));
        assert(action.textContent.includes('16'));
      }
    } finally { binding.dispose(); }
  };
  await guide(false);
  for (const item of ['medic-triage-1', fieldSurgeryIds.entry]) assert(g.transact(p.id, { id: item, kind: 'skill', item }).ok);
  await guide(true);
});

test('both shared HUD paths use only the acknowledged private treatment state', async t => {
  const actions = await menuBundle(t, 'src/client/medic-actions.ts', stubs);
  const g = new Game({ mode: 'short' });
  const p = g.addPlayer('solo', 'Iona', 'medic');
  const original = viewOf(g, p.id).players[0];
  assert.deepEqual(actions.medicActions(original, 0).extras, []);
  const owned: PlayerView = { ...original, skills: ['medic-triage-1', fieldSurgeryIds.entry, fieldSurgeryIds.aside], qAt: 250 };
  const withStatus = (fieldDressing: PlayerView['kit']['fieldDressing']): PlayerView => ({ ...owned, kit: { ...owned.kit, fieldDressing } });
  assert.equal(actions.medicActions(owned, 12).extras[0].at, 250);
  const preparing = withStatus({ phase: 'preparing', ready: true, nextAt: 20 });
  assert.equal(actions.medicDressingLabel(preparing, 12), 'Preparing dressing');
  assert.equal(actions.medicActions(preparing, 12).extras[0].at, 20);
  const applying = withStatus({ phase: 'applying', ready: true, doses: 1, canHold: true });
  assert.equal(actions.medicDressingLabel(applying, 20), 'Set aside a dose');
  const held = withStatus({ phase: 'held', ready: false, nextAt: 48 });
  assert.equal(actions.medicDressingLabel(held, 32), 'Resume dressing');
  assert(actions.medicActions(held, 32).extras[0].blocked);
  assert.equal(actions.medicActions(held, 32).qAt, 250);
});
