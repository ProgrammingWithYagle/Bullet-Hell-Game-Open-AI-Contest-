import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { measuredIds, type MeasuredStanceStatus } from '../src/shared/swordsman-measured.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, turn, follow } = measuredIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries(Object.values(measuredIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Measured Stance map shows an issued prerequisite and two exclusive fittings', () => {
  const path = specializationMapLayout('swordsman', entry)!;
  const overview = specializationMapLayout('swordsman')!;
  assert.deepEqual(path.nodes.filter(row => row.reference).map(row => row.id), ['swordsman-measure-1']);
  assert.deepEqual(path.edges, [{ from:'swordsman-measure-1', to:entry }, { from:entry, to:turn }, { from:entry, to:follow }]);
  assert.deepEqual(path.exclusions, [{ a:turn, b:follow }]);
  assert.equal(specializationFocus(path, entry, 'ArrowUp'), 'swordsman-measure-1');
  assert.equal(specializationFocus(path, turn, 'ArrowRight'), follow);
  assert(path.nodes.every(node => overview.nodes.some(candidate => candidate.id === node.id)));
  assert.equal(overview.nodes.filter(node=>!node.reference).length,3);
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Measured Stance shop purchases and explains each fitting', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable:true, value:{ escape:(key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode:'short' });
  game.encounter = 1;
  const dara = game.addPlayer('swordsman', 'Dara', 'swordsman');
  const controls = defaultControls();
  controls.bindings.technique1 = ['KeyI','KeyJ'];
  const pad = [16,15,14,13,12,11,10,9,8].find(number=>!Object.values(controls.gamepad).includes(number))!;
  assert(Number.isSafeInteger(pad));
  controls.gamepad.technique1 = pad;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(dara.id, { id:'held-edge-ui-' + item, kind:'skill', item });
  assert(buy('swordsman-measure-1').ok);
  const selected = expanded ? follow : turn, excluded = expanded ? turn : follow;
  const purchased: string[] = [];
  function show() {
    const player = viewOf(game, dara.id).players[0];
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
    const kit = env.host.querySelector('[data-swordsman-kit]')!;
    for (const token of ['Measured Cut','Frontal Guard','Long Measure']) assert(kit.textContent.includes(token));
    const action = kit.querySelector('[data-kit-action="technique1"]')!.textContent;
    for (const token of ['Held Edge','I','J',String(pad)]) assert(action.includes(token));
    inspect(selected);
    assert(env.host.querySelectorAll('img').some(img => img.getAttribute('src') === selected + '.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry, selected]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-swordsman-kit]')!;
    assert(kit.textContent.includes(expanded ? 'one smaller Second Line cut' : 'turn the arc once'));
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { handle.dispose(); }
});

test('The shared HUD exposes only the owned Held Edge action and the actual next command',async t=>{
  const { swordsmanActions,swordsmanHudLabel } = await menuBundle(t,'src/client/sword-measured-actions.ts',stubs) as typeof import('../src/client/sword-measured-actions.ts');
  const game = new Game({mode:'short'}), dara = game.addPlayer('dara','Dara','swordsman');
  const player = viewOf(game,dara.id).players[0], now = 55;
  assert.deepEqual(swordsmanActions(player,now).extras,[]);
  function check(update:Partial<MeasuredStanceStatus>, label:string, id:string, at:number, blocked:boolean, qAt=68) {
    const measuredStance = { canPlant:false, readyAt:0, until:0, turned:false, following:false, action:undefined,...update };
    const owned = { ...player, qAt, eAt:84, ultimateAt:128,
      skills:[entry,turn,follow], kit:{ ...player.kit, measuredStance } };
    const hud = swordsmanActions(owned,now);
    assert.equal(hud.qAt,qAt);
    assert.equal(swordsmanHudLabel(owned,now),label);
    assert.deepEqual(hud.extras,[{ key:'technique1',id,at,blocked }]);
  }
  check({},'Measured Cut recovering',entry,68,true);
  check({canPlant:true},'Set your edge',entry,0,false,0);
  check({readyAt:57,until:101},'Hold your footing',entry,57,true);
  check({readyAt:53,until:101},'Face the marked arc',entry,53,true);
  check({readyAt:53,until:101,action:'first'},'Release the held cut',entry,53,false);
  check({readyAt:53,until:101,action:'turn'},'Turn the edge once',turn,53,false);
  check({readyAt:50,until:71,following:true},'Aim beside the first cut',follow,50,true);
  check({readyAt:50,until:71,following:true,action:'follow'},'Second Line',follow,50,false);
});
