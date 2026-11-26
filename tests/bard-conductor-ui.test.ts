import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { conductorIds, type ConductorStatus } from '../src/shared/bard-kit.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, side, reprise } = conductorIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries(Object.values(conductorIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Conductor map shows an issued prerequisite and two exclusive fittings', () => {
  const path = specializationMapLayout('bard', entry)!;
  const overview = specializationMapLayout('bard')!;
  assert.deepEqual(path.nodes.filter(row => row.reference).map(row => row.id), ['bard-performance-1']);
  assert.deepEqual(path.edges, [{ from:'bard-performance-1', to:entry }, { from:entry, to:side }, { from:entry, to:reprise }]);
  assert.deepEqual(path.exclusions, [{ a:side, b:reprise }]);
  assert.equal(specializationFocus(path, entry, 'ArrowUp'), 'bard-performance-1');
  assert.equal(specializationFocus(path, side, 'ArrowRight'), reprise);
  assert(path.nodes.every(node => overview.nodes.some(candidate => candidate.id === node.id)));
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Conductor shop purchases and explains each fitting', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable:true, value:{ escape:(key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode:'short' });
  game.encounter = 1;
  const bard = game.addPlayer('bard', 'Iven', 'bard');
  const controls = defaultControls();
  controls.bindings.technique1 = ['KeyZ','KeyG'];
  controls.gamepad.technique1 = 9;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(bard.id, { id:'conductor-ui-' + item, kind:'skill', item });
  assert(buy('bard-performance-1').ok);
  const selected = expanded ? reprise : side, excluded = expanded ? side : reprise;
  const purchased: string[] = [];
  function show() {
    const player = viewOf(game, bard.id).players[0];
    const context = [[], expanded, 'normal', undefined, true, controls] as const;
    env.host.innerHTML = '<div class="loadout-editor">' + shop.shopMarkup(player, ...context) + '</div>';
    const handle = shop.bindShop(env.host, player, (request: { item: string }) => {
      assert(buy(request.item).ok);
      purchased.push(request.item);
    }, ...context);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    return handle;
  }
  function inspect(id: string) { env.host.querySelector('[data-inspect="' + id + '"]')!.click(); }
  let handle = show();
  try {
    assert(!env.host.querySelector('[data-kit-action="technique1"]'));
    inspect(entry);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-bard-kit]')!;
    for (const token of ['Resolving Phrase','Cut In','Encore']) assert(kit.textContent.includes(token));
    const action = kit.querySelector('[data-kit-action="technique1"]')!.textContent;
    for (const token of ['Call and Response','Z','G','9']) assert(action.includes(token));
    inspect(selected);
    assert(env.host.querySelectorAll('img').some(img => img.getAttribute('src') === selected + '.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry, selected]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-bard-kit]')!;
    assert(kit.textContent.includes(expanded ? 'face the original call site' : 'one fresh cadence'));
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { handle.dispose(); }
});

test('The shared HUD action presents cadence, stage proof and reply targets alongside the issued Q', async t => {
  const { bardActions, bardHudLabel } = await menuBundle(t, 'src/client/bard-actions.ts', stubs) as typeof import('../src/client/bard-actions.ts');
  const game = new Game({ mode:'short' });
  const bard = game.addPlayer('bard', 'Iven', 'bard');
  const base = viewOf(game, bard.id).players[0];
  assert.deepEqual(bardActions(base).extras, []);
  const stage = { x:250, y:100 }, origin = { x:100, y:100 };
  function check(state: ConductorStatus, label: string, id: string = entry, cadence = 2, qAt = 50) {
    const player = { ...base, qAt, skills:[entry,id], kit:{ ...base.kit, cadence, conducting:state } };
    const actions = bardActions(player);
    assert.equal(actions.qAt, qAt);
    assert.equal(actions.qNameKey, null);
    assert.equal(actions.qBlocked, false);
    assert.equal(bardHudLabel(player, 55), label);
    assert.deepEqual(actions.extras, [{ key:'technique1', id, at:state.ready ? 0 : state.until ?? qAt, blocked:!state.ready }]);
    assert.deepEqual(bardActions({ ...player, training:{ schemaVersion:1, characterId:'iven', learned:[], proofs:[], prepared:[], focus:null } }).extras, []);
  }
  check({ phase:'idle', ready:false }, 'Earn two cadence', entry, 1);
  check({ phase:'idle', ready:false }, 'Call and Response', entry, 2, 70);
  check({ phase:'idle', ready:false }, 'Aim at clear ground');
  check({ phase:'idle', ready:true, stage }, 'Start the call');
  check({ phase:'listening', ready:false, stage, until:100 }, 'Land a note from the stage');
  check({ phase:'listening', ready:true, stage, until:100, adjustment:{ x:230, y:160 } }, 'Move the reply stage', side);
  check({ phase:'answer', ready:false, stage, until:100 }, 'Move within range');
  check({ phase:'answer', ready:true, stage, until:100, answerAt:stage }, 'Answer at the stage');
  check({ phase:'answer', ready:true, stage, until:100, answerAt:origin, returning:true }, 'Answer at the call', reprise);
});
