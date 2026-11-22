import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { misdirectionIds, type MisdirectionStatus } from '../src/shared/bard-misdirection.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, wrong, second } = misdirectionIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries(Object.values(misdirectionIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Misdirection map shows an issued prerequisite and two exclusive fittings', () => {
  const path = specializationMapLayout('bard', entry)!;
  const overview = specializationMapLayout('bard')!;
  assert.deepEqual(path.nodes.filter(row => row.reference).map(row => row.id), ['bard-company-1']);
  assert.deepEqual(path.edges, [{ from:'bard-company-1', to:entry }, { from:entry, to:wrong }, { from:entry, to:second }]);
  assert.deepEqual(path.exclusions, [{ a:wrong, b:second }]);
  assert.equal(specializationFocus(path, entry, 'ArrowUp'), 'bard-company-1');
  assert.equal(specializationFocus(path, wrong, 'ArrowRight'), second);
  assert(path.nodes.every(node => overview.nodes.some(candidate => candidate.id === node.id)));
  assert(['bard-call-and-response-1','bard-mourning-measure-1'].every(id=>overview.nodes.some(node=>node.id===id)));
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Misdirection shop purchases and explains each fitting', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable:true, value:{ escape:(key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode:'short' });
  game.encounter = 1;
  const bard = game.addPlayer('bard', 'Iven', 'bard');
  const controls = defaultControls();
  controls.bindings.technique3 = ['KeyI','KeyJ'];
  controls.gamepad.technique3 = 16;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(bard.id, { id:'entrance-ui-' + item, kind:'skill', item });
  assert(buy('bard-company-1').ok);
  const selected = expanded ? second : wrong, excluded = expanded ? wrong : second;
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
    assert(!env.host.querySelector('[data-kit-action="technique3"]'));
    inspect(entry);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-bard-kit]')!;
    for (const token of ['Resolving Phrase','Cut In','Encore']) assert(kit.textContent.includes(token));
    const action = kit.querySelector('[data-kit-action="technique3"]')!.textContent;
    for (const token of ['False Entrance','I','J','16']) assert(action.includes(token));
    inspect(selected);
    assert(env.host.querySelectorAll('img').some(img => img.getAttribute('src') === selected + '.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry, selected]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-bard-kit]')!;
    assert(kit.textContent.includes(expanded ? 'draw a different pursuer' : 'move the same entrance once'));
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { handle.dispose(); }
});

test('The shared HUD keeps the issued Bard abilities and earlier pathways alongside the false entrance',async t=>{
  const {bardActions,bardMisdirectionLabel}=await menuBundle(t,'src/client/bard-actions.ts',stubs) as typeof import('../src/client/bard-actions.ts');
  const game=new Game({mode:'short'}), bard=game.addPlayer('bard','Iven','bard');
  const base=viewOf(game,bard.id).players[0], point={x:253,y:100};
  const conductor='bard-call-and-response-1', lament='bard-mourning-measure-1';
  assert.deepEqual(bardActions(base).extras,[]);
  function check(state:MisdirectionStatus,label:string,id:string=entry,cadence=2){
    const player={...base,skills:[conductor,lament,entry,id],qAt:68,eAt:84,ultimateAt:128,kit:{...base.kit,misdirecting:state,cadence}};
    const actions=bardActions(player);
    assert.equal(actions.qAt,68);
    assert.equal(player.eAt,84);
    assert.equal(player.ultimateAt,128);
    assert.equal(bardMisdirectionLabel(player,55),label);
    assert.deepEqual(actions.extras,[{key:'technique1',id:conductor,at:68,blocked:true},{key:'technique2',id:lament,at:84,blocked:true},
      {key:'technique3',id,at:state.ready?0:state.until??0,blocked:!state.ready}]);
  }
  check({phase:'idle',ready:false},'Earn two cadence',entry,1);
  check({phase:'idle',ready:false,until:70},'False Entrance');
  check({phase:'idle',ready:false},'Aim at clear floor');
  check({phase:'idle',ready:true,point},'Mark the false entrance');
  check({phase:'walk',ready:false,point,until:100},'Walk away from the call');
  check({phase:'waiting',ready:false,point,until:100},'Wait for a pursuer');
  check({phase:'distracting',ready:false,point,target:41,until:100},'Pursuer diverted');
  check({phase:'distracting',ready:true,point,target:41,alternative:{x:227,y:174},until:100},'Turn the false entrance',wrong);
  check({phase:'second',ready:false,point,until:100},'Earn one fresh cadence',second,0);
  check({phase:'second',ready:true,point,until:100},'Ring the entrance again',second,1);
});
