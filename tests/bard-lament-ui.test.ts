import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { lamentIds, type LamentStatus } from '../src/shared/bard-lament.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, cross, closing } = lamentIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries(Object.values(lamentIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Lament map shows an issued prerequisite and two exclusive fittings', () => {
  const path = specializationMapLayout('bard', entry)!;
  const overview = specializationMapLayout('bard')!;
  assert.deepEqual(path.nodes.filter(row => row.reference).map(row => row.id), ['bard-notecraft-1']);
  assert.deepEqual(path.edges, [{ from:'bard-notecraft-1', to:entry }, { from:entry, to:cross }, { from:entry, to:closing }]);
  assert.deepEqual(path.exclusions, [{ a:cross, b:closing }]);
  assert.equal(specializationFocus(path, entry, 'ArrowUp'), 'bard-notecraft-1');
  assert.equal(specializationFocus(path, cross, 'ArrowRight'), closing);
  assert(path.nodes.every(node => overview.nodes.some(candidate => candidate.id === node.id)));
  assert(overview.nodes.some(node => node.id === 'bard-call-and-response-1'));
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Lament shop purchases and explains each fitting', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable:true, value:{ escape:(key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode:'short' });
  game.encounter = 1;
  const bard = game.addPlayer('bard', 'Iven', 'bard');
  const controls = defaultControls();
  controls.bindings.technique2 = ['KeyN','KeyY'];
  controls.gamepad.technique2 = 9;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(bard.id, { id:'lament-ui-' + item, kind:'skill', item });
  assert(buy('bard-notecraft-1').ok);
  const selected = expanded ? closing : cross, excluded = expanded ? cross : closing;
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
    assert(!env.host.querySelector('[data-kit-action="technique2"]'));
    inspect(entry);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-bard-kit]')!;
    for (const token of ['Resolving Phrase','Cut In','Encore']) assert(kit.textContent.includes(token));
    const action = kit.querySelector('[data-kit-action="technique2"]')!.textContent;
    for (const token of ['Mourning Measure','N','Y','9']) assert(action.includes(token));
    inspect(selected);
    assert(env.host.querySelectorAll('img').some(img => img.getAttribute('src') === selected + '.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry, selected]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-bard-kit]')!;
    assert(kit.textContent.includes(expanded ? 'one chord at its far end' : 'spending one of the original pulses'));
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { handle.dispose(); }
});

test('The shared HUD keeps Call and Response and Cut In available alongside Lament choices', async t => {
  const { bardActions,bardLamentLabel } = await menuBundle(t,'src/client/bard-actions.ts',stubs) as typeof import('../src/client/bard-actions.ts');
  const game=new Game({mode:'short'}), bard=game.addPlayer('bard','Iven','bard');
  const base=viewOf(game,bard.id).players[0];
  assert.deepEqual(bardActions(base).extras,[]);
  const lane={from:{x:100,y:100},to:{x:353,y:100}};
  function check(state:LamentStatus,label:string,id:string=entry,cadence=2,eAt=50){
    const conductor='bard-call-and-response-1';
    const player={...base,skills:[entry,id,conductor],eAt,qAt:83,ultimateAt:120,kit:{...base.kit,lamenting:state,cadence}};
    const actions=bardActions(player);
    assert.equal(actions.qAt,83);
    assert.equal(player.eAt,eAt);
    assert.equal(player.ultimateAt,120);
    assert.equal(bardLamentLabel(player,55),label);
    assert.deepEqual(actions.extras,[{key:'technique1',id:conductor,at:83,blocked:true},
      {key:'technique2',id,at:state.ready?0:state.until??eAt,blocked:!state.ready}]);
  }
  check({phase:'idle',ready:false},'Earn two cadence',entry,1);
  check({phase:'idle',ready:false},'Mourning Measure',entry,2,70);
  check({phase:'idle',ready:false},'Aim along clear ground');
  check({phase:'idle',ready:true,lane},'Begin the measure');
  check({phase:'sustain',ready:true,lane,left:3},'Sustain or end the lane');
  check({phase:'sustain',ready:true,lane,turn:{x:305,y:163},left:3},'Turn the lane',cross);
  check({phase:'sustain',ready:true,lane,closing:true,left:3,contacts:2},'Play the closing chord',closing);
});
