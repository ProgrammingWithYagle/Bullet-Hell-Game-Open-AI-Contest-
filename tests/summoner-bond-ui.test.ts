import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Game } from '../src/shared/game.ts';
import { bondIds, type BondCue, type BondStatus } from '../src/shared/summoner-bond.ts';
import { cohortIds } from '../src/shared/summoner-cohort.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { drawBondCue } from '../src/client/summoner-bond-presentation.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, close, homeward } = bondIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries([...Object.values(bondIds), ...Object.values(cohortIds)].map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('the Bonded Companion map advertises both fitting choices and their exclusion', () => {
  const map = specializationMapLayout('summoner', entry)!;
  assert.deepEqual(map.nodes.filter(row => row.reference).map(row => row.id), ['summoner-bonds-1']);
  assert.deepEqual(map.edges, [{ from: 'summoner-bonds-1', to: entry }, { from: entry, to: close }, { from: entry, to: homeward }]);
  assert.deepEqual(map.exclusions, [{ a: close, b: homeward }]);
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' shop prepares independent remaps and mutually exclusive Bond fittings', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode: 'raid' });
  const joss = game.addPlayer('joss', 'Joss', 'summoner');
  const controls = defaultControls();
  controls.bindings.technique1 = ['KeyZ', 'KeyG'];
  controls.bindings.technique2 = ['KeyN', 'KeyY'];
  const pad = [16,15,14,13,12,11,10,9,8].find(value => !Object.values(controls.gamepad).includes(value))!;
  controls.gamepad.technique2 = pad;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(joss.id, { id: 'bond-ui-' + item, kind: 'skill', item });
  assert(buy('summoner-bonds-1').ok && buy(cohortIds.entry).ok);
  const fitted = expanded ? close : homeward, excluded = expanded ? homeward : close;
  const purchased: string[] = [];
  function show() {
    const player = viewOf(game, joss.id).players[0];
    const context = [[], expanded, 'normal', undefined, true, controls] as const;
    env.host.innerHTML = '<div class="loadout-editor">' + shop.shopMarkup(player, ...context) + '</div>';
    const handle = shop.bindShop(env.host, player, (request: { item: string }) => {
      assert(buy(request.item).ok);
      purchased.push(request.item);
    }, ...context);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    env.host.querySelector('[data-specialization-route="' + entry + '"]')!.click();
    return handle;
  }
  const inspect = (id: string) => env.host.querySelector('[data-inspect="' + id + '"]')!.click();
  let handle = show();
  try {
    assert(!env.host.querySelector('[data-kit-action="technique2"]'));
    inspect(entry);
    assert(env.host.textContent.includes('two permanent retinue slots'));
    assert.deepEqual(purchased, []);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const slot = env.host.querySelector('[data-kit-action="technique2"]')!.textContent;
    for (const key of ['Mending Bond', 'N', 'Y', String(pad)]) assert(slot.includes(key));
    const other = env.host.querySelector('[data-kit-action="technique1"]')!.textContent;
    for (const key of ['Cohort Drive', 'Z', 'G']) assert(other.includes(key));
    inspect(fitted);
    assert(env.host.querySelectorAll('img').some(node => node.getAttribute('src') === fitted + '.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry, fitted]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
    assert(env.host.textContent.includes(expanded ? 'damaging beacon hit' : 'walkable approach'));
  } finally { handle.dispose(); }
});

test('Action 2 uses the authoritative status and the public tether is finite and legible', async t => {
  const { summonerActions, summonerBondLabel } = await menuBundle(t, 'src/client/summoner-cohort-actions.ts', stubs) as
    typeof import('../src/client/summoner-cohort-actions.ts');
  const game = new Game({ mode: 'short' });
  const joss = game.addPlayer('joss', 'Joss', 'summoner');
  const base = viewOf(game, joss.id).players[0];
  for (const [stage, label, blocked] of [
    ['ready', 'Homeward Thread', false], ['returning', 'Companion returning', true],
    ['companion', 'Stay near a wounded companion', true], ['focus', 'Rebind for two Focus', true],
    ['gathering', 'Wait for Gather to finish', true], ['cohort', 'Wait for Cohort Drive to finish', true],
  ] as const) {
    const bond: BondStatus = { stage, fitting: 'homeward', until: 110, recoveryAt: 0 };
    const player = { ...base, skills: [entry, homeward], kit: { ...base.kit, bond } };
    assert.equal(summonerBondLabel(player), label);
    assert.deepEqual(summonerActions(player, 80).extras, [{ key: 'technique2', id: homeward, at: 0, blocked }]);
  }
  const strokes: number[][] = [], colors: number[] = [];
  const graphics = {
    lineStyle(_width: number, color: number) { colors.push(color); return this; },
    lineBetween(...coords: number[]) { strokes.push(coords); return this; },
    strokeCircle(...coords: number[]) { strokes.push(coords); return this; },
    fillStyle() { return this; }, fillCircle() { return this; },
  };
  const cue: BondCue = { kind: 'summoner-bond', id: 1, owner: joss.id, unit: 2, ownerX: 20, ownerY: 25,
    x: 30, y: 38, at: 65, until: 100, radius: 15, state: 'return' };
  drawBondCue(graphics, cue, 80, false, true);
  assert.deepEqual(strokes.slice(0, 2), [[20, 25, 30, 38], [30, 38, 15]]);
  assert.equal(strokes.length, 4);
  assert(colors.every(color => color === 0xffffff));
  drawBondCue(graphics, cue, cue.until, true, false);
  assert.equal(strokes.length, 4);
});
