import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { drawAlchemyReactionGuide } from '../src/client/alchemy-reactive-presentation.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { Game } from '../src/shared/game.ts';
import { reactiveIds, type AlchemyReactionStatus } from '../src/shared/alchemist-reactive.ts';
import { viewOf } from '../src/shared/view.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, wick, vent } = reactiveIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries(Object.values(reactiveIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={items:{},upgrades:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('the Reactive Mixtures map starts at Keep Two Apart and shows the fitting exclusion', () => {
  const map = specializationMapLayout('alchemist', entry)!;
  assert.deepEqual(map.nodes.filter(row => row.reference).map(row => row.id), ['alchemist-mixtures-1']);
  assert.deepEqual(map.edges, [{ from: 'alchemist-mixtures-1', to: entry }, { from: entry, to: wick }, { from: entry, to: vent }]);
  assert.deepEqual(map.exclusions, [{ a: wick, b: vent }]);
});

for (const expanded of [false, true]) test('the Alchemist can inspect, buy and remap Action 1 in the ' + (expanded ? 'expanded' : 'compact') + ' shop', async t => {
  const shell = menuEnvironment(t), shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (value: string) => value } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode: 'endless' });
  game.encounter = 9;
  const actor = game.addPlayer('perrin', 'Perrin', 'alchemist');
  const buy = (item: string) => game.transact(actor.id, { kind: 'skill', item, id: item });
  assert(buy('alchemist-mixtures-1').ok);
  const controls = defaultControls();
  controls.bindings.technique1 = ['KeyI', 'KeyJ'];
  const assignment = [16, 15, 14, 13, 12, 11, 10, 9, 8].find(value => !Object.values(controls.gamepad).includes(value));
  assert(assignment !== undefined);
  controls.gamepad.technique1 = assignment;
  assert(validControls(controls));
  const purchases: string[] = [];
  function show() {
    const player = viewOf(game, actor.id).players[0];
    const options = [[], expanded, 'normal', undefined, true, controls] as const;
    shell.host.innerHTML = '<div class="loadout-editor">' + shop.shopMarkup(player, ...options) + '</div>';
    const handle = shop.bindShop(shell.host, player, (request: { item: string }) => {
      assert(buy(request.item).ok);
      purchases.push(request.item);
    }, ...options);
    shell.host.querySelector('[data-shop-tab="specializations"]')!.click();
    return handle;
  }
  const inspect = (id: string) => shell.host.querySelector('[data-inspect="' + id + '"]')!.click();
  const fitting = expanded ? vent : wick, excluded = expanded ? wick : vent;
  let handle = show();
  try {
    assert(!shell.host.querySelector('[data-kit-action="technique1"]'));
    inspect(entry);
    assert(shell.host.textContent.includes('one extra chalk'));
    shell.host.querySelector('#buy-selected')!.click();
  } finally { handle.dispose(); }
  handle = show();
  try {
    const text = shell.host.querySelector('[data-kit-action="technique1"]')!.textContent;
    for (const label of ['Flash Reaction', 'I', 'J', String(assignment)]) assert(text.includes(label));
    inspect(fitting);
    assert(shell.host.querySelectorAll('img').some(node => node.getAttribute('src') === fitting + '.png'));
    shell.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchases, [entry, fitting]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    inspect(excluded);
    assert(shell.host.querySelector('#buy-selected')!.disabled);
  } finally { handle.dispose(); }
});

test('the Alchemist hotbar shows the owned fitting and the authority’s current reason', async t => {
  const ui = await menuBundle(t, 'src/client/alchemy-reactive-actions.ts', stubs) as typeof import('../src/client/alchemy-reactive-actions.ts');
  const game = new Game({ mode: 'short' });
  game.addPlayer('perrin', 'Perrin', 'alchemist');
  const actor = viewOf(game, 'perrin').players[0];
  assert.deepEqual(ui.alchemyReactiveActions(actor).extras, []);
  actor.skills = [entry, vent];
  actor.eAt = 422;
  for (const [stage, text, at, blocked] of [
    ['ready', 'Flash Reaction', 0, false], ['prepare', 'Put a prepared Flare first', 0, true],
    ['aim', 'Aim at a clear Binding pool', 0, true], ['spent', 'Advance already spent', 422, true],
  ] as const) {
    actor.kit.alchemyReaction = { stage, fitting: 'vent' };
    assert.equal(ui.alchemyReactionLabel(actor), text);
    assert.deepEqual(ui.alchemyReactiveActions(actor).extras, [{ key: 'technique1', id: vent, at, blocked }]);
  }
});

test('the private targeting guide marks one permitted Binding and clears with readiness', () => {
  const circles: number[][] = [], lines: number[][] = [], styles: number[][] = [];
  const graphics = {
    lineStyle(...args: number[]) { styles.push(args); return this; },
    strokeCircle(...args: number[]) { circles.push(args); return this; },
    lineBetween(...args: number[]) { lines.push(args); return this; },
  };
  const state: AlchemyReactionStatus = { fitting: 'vent', stage: 'ready', target: { x: 244, y: 288, radius: 60 } };
  drawAlchemyReactionGuide(graphics, state, true);
  assert.deepEqual(circles, [[244, 288, 60], [244, 288, 7]]);
  assert.equal(lines.length, 4);
  assert(styles.every(args => args[1] === 0xffffff));
  drawAlchemyReactionGuide(graphics, { ...state, stage: 'spent' }, false);
  assert.equal(circles.length, 2);
});
