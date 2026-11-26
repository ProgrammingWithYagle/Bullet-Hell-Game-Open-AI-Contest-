import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { rapidResponseIds } from '../src/shared/medic-rapid-response.ts';
import { fieldSurgeryIds } from '../src/shared/medic-field-surgery.ts';
import { idleInput } from '../src/shared/protocol.ts';
import { viewOf, type PlayerView } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { Prediction } from '../src/client/prediction.ts';
import { specializationMapLayout, specializationFocus } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const emblems = Object.fromEntries(Object.values(rapidResponseIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(emblems) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('Rapid Response shows its real prerequisite, two exclusive choices and separate overview positions', () => {
  const route = specializationMapLayout('medic', rapidResponseIds.entry)!;
  const whole = specializationMapLayout('medic')!;
  assert.deepEqual(route.nodes.filter(node => node.reference).map(node => node.id), ['medic-recovery-1']);
  assert.deepEqual(route.edges, [
    { from: 'medic-recovery-1', to: rapidResponseIds.entry },
    { from: rapidResponseIds.entry, to: rapidResponseIds.switchback },
    { from: rapidResponseIds.entry, to: rapidResponseIds.handoff },
  ]);
  assert.deepEqual(route.exclusions, [{ a: rapidResponseIds.switchback, b: rapidResponseIds.handoff }]);
  assert.equal(specializationFocus(route, rapidResponseIds.entry, 'ArrowUp'), 'medic-recovery-1');
  assert.equal(specializationFocus(route, rapidResponseIds.switchback, 'ArrowRight'), rapidResponseIds.handoff);
  for (const [root, child] of [['medic-recovery-1', rapidResponseIds.entry], ['medic-triage-1', fieldSurgeryIds.entry]]) {
    assert.equal(whole.nodes.find(node => node.id === root)?.x, whole.nodes.find(node => node.id === child)?.x);
  }
  assert(new Set(whole.nodes.map(node => node.x + ',' + node.y)).size === whole.nodes.length);
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Medic shop peeks and buys one real choice with owned remaps', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode: 'short' });
  game.encounter = 1;
  const medic = game.addPlayer('solo', 'Iona', 'medic');
  const controls = defaultControls();
  controls.bindings.technique2 = ['KeyN', 'KeyY'];
  controls.gamepad.technique2 = 16;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(medic.id, { id: 'confirm-' + item, kind: 'skill', item });
  const selected = expanded ? rapidResponseIds.switchback : rapidResponseIds.handoff;
  const bought: string[] = [];
  function render() {
    const player = viewOf(game, medic.id).players[0];
    env.host.innerHTML = '<div class="loadout-editor">' + shop.shopMarkup(player, [], expanded, 'normal', undefined, true, controls) + '</div>';
    const binding = shop.bindShop(env.host, player, (request: { item: string }) => {
      assert(buy(request.item).ok);
      bought.push(request.item);
    }, [], expanded, 'normal', undefined, true, controls);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    env.host.querySelector('[data-specialization-route="' + rapidResponseIds.entry + '"]')!.click();
    return binding;
  }
  let binding = render();
  try {
    assert(!env.host.querySelector('[data-medic-kit] [data-kit-action="technique2"]'));
    env.host.querySelector('[data-inspect="' + rapidResponseIds.entry + '"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
    assert.deepEqual(bought, []);
  } finally { binding.dispose(); }
  assert(buy('medic-recovery-1').ok);
  assert(buy(rapidResponseIds.entry).ok);
  binding = render();
  try {
    const row = env.host.querySelector('[data-kit-action="technique2"]')!;
    for (const label of ['Rescue Run', 'N', 'Y', '16']) assert(row.textContent.includes(label));
    assert(env.host.querySelector('[data-kit-action="interact"]'));
    env.host.querySelector('[data-inspect="' + selected + '"]')!.click();
    assert(env.host.querySelectorAll('img').some(image => image.getAttribute('src') === selected + '.png'));
    assert.deepEqual(bought, []);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(bought, [selected]);
  } finally { binding.dispose(); }
  binding = render();
  try {
    const guide = env.host.querySelector('[data-medic-kit]')!;
    assert(guide.textContent.includes(expanded ? 'turn sharply' : 'give a smaller dose'));
    const opposite = expanded ? rapidResponseIds.handoff : rapidResponseIds.switchback;
    env.host.querySelector('[data-inspect="' + opposite + '"]')!.click();
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { binding.dispose(); }
});

test('The Medic HUD tracks the response and dressing independently on their issued E and Q clocks', async t => {
  const actions = await menuBundle(t, 'src/client/medic-actions.ts', stubs);
  const game = new Game({ mode: 'short' });
  const p = game.addPlayer('solo', 'Iona', 'medic');
  const player = viewOf(game, p.id).players[0];
  assert.deepEqual(actions.medicActions(player, 0).extras, []);
  const withResponse = (rapidResponse: PlayerView['kit']['rapidResponse']): PlayerView => ({ ...player,
    qAt: 200, eAt: 300, skills: [fieldSurgeryIds.entry, rapidResponseIds.entry, rapidResponseIds.handoff],
    kit: { ...player.kit, fieldDressing: { phase: 'idle', ready: false }, rapidResponse } });
  const idle = withResponse({ phase: 'idle', ready: false });
  assert.equal(actions.medicActions(idle, 33).extras[0].at, 200);
  assert.equal(actions.medicActions(idle, 33).extras[1].at, 300);
  const running = withResponse({ phase: 'running', ready: false, walked: 51, until: 49 });
  assert.equal(actions.medicResponseLabel(running), 'Stop to use the dose');
  assert(actions.medicActions(running, 33).extras[1].blocked);
  const handoff = withResponse({ phase: 'running', ready: true, walked: 51, until: 49, canHandoff: true, patient: p.id });
  assert.equal(actions.medicResponseLabel(handoff), 'Give dose while moving');
  assert.equal(actions.medicActions(handoff, 33).extras[1].id, rapidResponseIds.handoff);
  assert.equal(actions.medicActions(handoff, 33).extras[1].at, 0);
  const arrived = withResponse({ phase: 'arrived', ready: true, until: 52, patient: p.id });
  assert.equal(actions.medicResponseLabel(arrived), 'Give focused dose');
  assert.equal(actions.medicActions(arrived, 33).qAt, 200);
});

test('Prediction replays accepted Rescue Run walking and stops boosting on an ordinary primary input', () => {
  const game = new Game({ mode: 'short', arenaSelection: 'fixed', openingArenaId: 'gatehouse' });
  const owner = game.addPlayer('solo', 'Iona', 'medic');
  for (const item of ['medic-recovery-1', rapidResponseIds.entry]) assert(game.transact(owner.id, { id: item, kind: 'skill', item }).ok);
  assert(game.start());
  game.boss.deadline = game.boss.staggerUntil = 10000;
  const first = { ...idleInput(), moveX: 1, technique2: true, sequence: 1 };
  assert(game.submitInput(owner.id, first));
  game.step();
  const view = viewOf(game, owner.id);
  assert.equal(view.players[0].kit.rapidResponse?.phase, 'running');
  const predicted = new Prediction();
  predicted.acknowledge(view, owner.id);
  for (const fire of [false, true]) {
    const input = { ...idleInput(), moveX: 1, fire, sequence: owner.ack + 1, clientTick: game.combatTick };
    predicted.submit(input, view);
    assert(game.submitInput(owner.id, input));
    game.step();
    assert(Math.abs(predicted.player!.x - owner.x) < 1e-5);
    assert(Math.abs(predicted.player!.y - owner.y) < 1e-5);
  }
  assert.notEqual(predicted.player!.kit.rapidResponse?.phase, 'running');
  assert.equal(game.kitStatus(owner.id).rapidResponse?.phase, 'idle');
});
