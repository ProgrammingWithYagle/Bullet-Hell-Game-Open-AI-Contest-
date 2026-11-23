import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { counterstrokeIds, type CounterstrokeStatus } from '../src/shared/swordsman-counterstroke.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, needle, back } = counterstrokeIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries(Object.values(counterstrokeIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Counterstroke map shows an issued prerequisite and two exclusive fittings', () => {
  const path = specializationMapLayout('swordsman', entry)!;
  const overview = specializationMapLayout('swordsman')!;
  assert.deepEqual(path.nodes.filter(row => row.reference).map(row => row.id), ['swordsman-edgework-1']);
  assert.deepEqual(path.edges, [{ from:'swordsman-edgework-1', to:entry }, { from:entry, to:needle }, { from:entry, to:back }]);
  assert.deepEqual(path.exclusions, [{ a:needle, b:back }]);
  assert.equal(specializationFocus(path, entry, 'ArrowUp'), 'swordsman-edgework-1');
  assert.equal(specializationFocus(path, needle, 'ArrowRight'), back);
  assert(path.nodes.every(node => overview.nodes.some(candidate => candidate.id === node.id)));
  assert(overview.nodes.some(node=>node.id==='swordsman-held-edge-1'));
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Counterstroke shop purchases and explains each fitting', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable:true, value:{ escape:(key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode:'short' });
  game.encounter = 1;
  const dara = game.addPlayer('swordsman', 'Dara', 'swordsman');
  const controls = defaultControls();
  controls.bindings.technique2 = ['KeyI','KeyJ'];
  const pad = [16,15,14,13,12,11,10,9,8].find(number=>!Object.values(controls.gamepad).includes(number))!;
  assert(Number.isSafeInteger(pad));
  controls.gamepad.technique2 = pad;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(dara.id, { id:'drawn-reply-ui-' + item, kind:'skill', item });
  assert(buy('swordsman-edgework-1').ok);
  const selected = expanded ? back : needle, excluded = expanded ? needle : back;
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
    assert(!env.host.querySelector('[data-kit-action="technique2"]'));
    inspect(entry);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-swordsman-kit]')!;
    for (const token of ['Measured Cut','Frontal Guard','Long Measure']) assert(kit.textContent.includes(token));
    const action = kit.querySelector('[data-kit-action="technique2"]')!.textContent;
    for (const token of ['Drawn Reply','I','J',String(pad)]) assert(action.includes(token));
    inspect(selected);
    assert(env.host.querySelectorAll('img').some(img => img.getAttribute('src') === selected + '.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry, selected]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-swordsman-kit]')!;
    assert(kit.textContent.includes(expanded ? 'sweep beside or behind you' : 'one short return'));
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { handle.dispose(); }
});

test('The shared HUD offers the actual Counterstroke response alongside owned Held Edge',async t=>{
  const { swordsmanActions,swordsmanCounterstrokeLabel } = await menuBundle(t,'src/client/sword-measured-actions.ts',stubs) as typeof import('../src/client/sword-measured-actions.ts');
  const game = new Game({mode:'short'}), dara = game.addPlayer('dara','Dara','swordsman');
  const base = viewOf(game,dara.id).players[0], now = 55;
  assert.deepEqual(swordsmanActions(base,now).extras,[]);
  function check(update:Partial<CounterstrokeStatus>,label:string,id:string,at:number,blocked:boolean,eAt=68) {
    const counterstroke={canGuard:false,guardUntil:0,responseUntil:0,canAnswer:false,fitting:undefined,action:undefined,...update};
    const player={...base,qAt:75,eAt,skills:['swordsman-held-edge-1',entry],
      kit:{...base.kit,counterstroke}};
    const actions=swordsmanActions(player,now);
    assert.equal(actions.qAt,75);
    assert.equal(swordsmanCounterstrokeLabel(player,now),label);
    assert.deepEqual(actions.extras,[{key:'technique1',id:'swordsman-held-edge-1',at:75,blocked:true},{key:'technique2',id,at,blocked}]);
  }
  check({},'Frontal Guard recovering',entry,68,true);
  check({canGuard:true},'Raise the reply guard',entry,0,false,0);
  check({guardUntil:62},'Wait for a projectile',entry,62,true);
  check({guardUntil:53,responseUntil:77},'Face the front mark',entry,0,true);
  check({responseUntil:77,canAnswer:true},'Deliver the drawn reply',entry,0,false);
  check({responseUntil:77,fitting:needle},'Face the return line',needle,0,true);
  check({responseUntil:77,fitting:needle,canAnswer:true},'Needle Return',needle,0,false);
  check({responseUntil:77,fitting:back},'Face forward or toward a flank',back,0,true);
  check({responseUntil:77,fitting:back,canAnswer:true,action:'back'},'Back Answer',back,0,false);
  check({responseUntil:77,fitting:back,canAnswer:true,action:'front'},'Deliver the drawn reply',entry,0,false);
});
