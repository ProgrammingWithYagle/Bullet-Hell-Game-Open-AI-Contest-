import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { drawAlchemyDressingGuide } from '../src/client/alchemy-dressing-presentation.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { Game } from '../src/shared/game.ts';
import { restorativeIds, type AlchemyDressingStatus } from '../src/shared/alchemist-restorative.ts';
import { viewOf } from '../src/shared/view.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, shared, quick } = restorativeIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries(Object.values(restorativeIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={items:{},upgrades:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('the Restorative Practice starts at Roll the Sleeves and shows the fitting exclusion', () => {
  const map = specializationMapLayout('alchemist', entry)!;
  assert.deepEqual(map.nodes.filter(row => row.reference).map(row => row.id), ['alchemist-dyehouse-1']);
  assert.deepEqual(map.edges, [{ from: 'alchemist-dyehouse-1', to: entry }, { from: entry, to: shared }, { from: entry, to: quick }]);
  assert.deepEqual(map.exclusions, [{ a: shared, b: quick }]);
});

for (const expanded of [false, true]) test('the Alchemist can inspect, buy and remap Action 3 in the ' + (expanded ? 'expanded' : 'compact') + ' shop', async t => {
  const shell = menuEnvironment(t), shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (value: string) => value } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode: 'endless' });
  game.encounter = 9;
  const actor = game.addPlayer('perrin', 'Perrin', 'alchemist');
  const buy = (item: string) => game.transact(actor.id, { kind: 'skill', item, id: item });
  assert(buy('alchemist-dyehouse-1').ok);
  const controls = defaultControls();
  controls.bindings.technique3 = ['KeyI', 'KeyJ'];
  const assignment = [16, 15, 14, 13, 12, 11, 10, 9, 8].find(value => !Object.values(controls.gamepad).includes(value));
  assert(assignment !== undefined);
  controls.gamepad.technique3 = assignment;
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
    shell.host.querySelector('[data-specialization-route="' + entry + '"]')!.click();
    return handle;
  }
  const inspect = (id: string) => shell.host.querySelector('[data-inspect="' + id + '"]')!.click();
  const fitting = expanded ? quick : shared, excluded = expanded ? shared : quick;
  let handle = show();
  try {
    assert(!shell.host.querySelector('[data-kit-action="technique3"]'));
    inspect(entry);
    assert(shell.host.textContent.includes('your first prepared Mending'));
    shell.host.querySelector('#buy-selected')!.click();
  } finally { handle.dispose(); }
  handle = show();
  try {
    const text = shell.host.querySelector('[data-kit-action="technique3"]')!.textContent;
    for (const label of ['Set Dressing', 'I', 'J', String(assignment)]) assert(text.includes(label));
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

test('the third Alchemist control reports the authority’s real fitting and shared throw clock', async t => {
  const ui = await menuBundle(t,'src/client/alchemy-reactive-actions.ts',stubs) as typeof import('../src/client/alchemy-reactive-actions.ts');
  const game = new Game({mode:'short'});
  game.addPlayer('perrin','Perrin','alchemist');
  const actor = viewOf(game,'perrin').players[0];
  assert.deepEqual(ui.alchemyActions(actor).extras,[]);
  actor.skills = [entry,quick];
  actor.eAt = 422;
  for (const [stage,label,at,blocked] of [
    ['ready','Set Dressing',0,false], ['prepare','Put a prepared Mending first',0,true],
    ['aim','Aim at nearby clear ground',0,true], ['recovering','Cast Flask is recovering',422,true],
    ['placed','Dressing already placed or in flight',0,true],
  ] as const) {
    actor.kit.alchemyDressing = {stage,fitting:'quick'};
    assert.equal(ui.alchemyDressingLabel(actor),label);
    assert.deepEqual(ui.alchemyActions(actor).extras,[{key:'technique3',id:quick,at,blocked}]);
  }
});

test('the owner preview matches both split landings and clears when placement is spent', () => {
  const circles: number[][] = [], lines: number[][] = [], styles: number[][] = [];
  const graphics = {
    lineStyle(...args:number[]) { styles.push(args); },
    strokeCircle(...args:number[]) { circles.push(args); },
    lineBetween(...args:number[]) { lines.push(args); },
  };
  const targets = [{x:240,y:260,radius:45},{x:240,y:320,radius:45}];
  const state: AlchemyDressingStatus = {fitting:'shared',stage:'ready',targets};
  drawAlchemyDressingGuide(graphics,state,true);
  assert.deepEqual(circles,[[240,260,45],[240,320,45]]);
  assert.equal(lines.length,4);
  assert(styles.every(args => args[1] === 0xffffff));
  drawAlchemyDressingGuide(graphics,{...state,stage:'placed'},false);
  assert.equal(circles.length,2);
});
