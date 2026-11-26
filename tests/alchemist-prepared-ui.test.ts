import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AlchemyControls } from '../src/client/alchemy-controls.ts';
import { alchemyCommitBlocked } from '../src/client/alchemy-presentation.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { Game } from '../src/shared/game.ts';
import { preparedIds } from '../src/shared/alchemist-prepared.ts';
import { reactiveIds } from '../src/shared/alchemist-reactive.ts';
import { viewOf } from '../src/shared/view.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry,brew,toss } = preparedIds;
const messages = JSON.parse(readFileSync('locales/en.json','utf8')).messages;
const icons = Object.fromEntries([...Object.values(preparedIds),...Object.values(reactiveIds)].map(id => [id,id + '.png']));
const stubs = {
  'assets.ts':'export const assets={items:{},upgrades:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts':'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('Prepared Compounds has its own issued root, working notes and two excluded fittings', () => {
  const graph = specializationMapLayout('alchemist',entry)!;
  assert.deepEqual(graph.nodes.filter(node => node.reference).map(node => node.id),['alchemist-reagents-1']);
  assert.deepEqual(graph.edges,[{from:'alchemist-reagents-1',to:entry},{from:entry,to:brew},{from:entry,to:toss}]);
  assert.deepEqual(graph.exclusions,[{a:brew,b:toss}]);
});

for (const expanded of [false,true]) test('Action 2 can be bought and remapped in the ' + (expanded ? 'expanded' : 'compact') + ' shop',async t => {
  const shell = menuEnvironment(t), module = await menuBundle(t,'src/client/ui/shop.ts',stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis,'CSS');
  Object.defineProperty(globalThis,'CSS',{configurable:true,value:{ escape:(value:string) => value }});
  t.after(() => css ? Object.defineProperty(globalThis,'CSS',css) : Reflect.deleteProperty(globalThis,'CSS'));
  const game = new Game({ mode:'endless' });
  game.encounter = 9;
  const player = game.addPlayer('perrin','Perrin','alchemist');
  const buy = (id:string) => game.transact(player.id,{ kind:'skill',item:id,id });
  assert(buy('alchemist-reagents-1').ok);
  const controls = defaultControls();
  controls.bindings.technique2 = ['KeyI','KeyJ'];
  const binding = [16,15,14,13,12,11,10,9,8].find(value => !Object.values(controls.gamepad).includes(value));
  assert(binding !== undefined);
  controls.gamepad.technique2 = binding;
  assert(validControls(controls));
  const purchases: string[] = [];
  function screen() {
    const actor = viewOf(game,player.id).players[0];
    const args = [[],expanded,'normal',undefined,true,controls] as const;
    shell.host.innerHTML = '<div class="loadout-editor">' + module.shopMarkup(actor,...args) + '</div>';
    const handle = module.bindShop(shell.host,actor,(request:{item:string}) => {
      assert(buy(request.item).ok);
      purchases.push(request.item);
    },...args);
    shell.host.querySelector('[data-shop-tab="specializations"]')!.click();
    shell.host.querySelector('[data-specialization-route="' + entry + '"]')!.click();
    return handle;
  }
  const inspect = (id:string) => shell.host.querySelector('[data-inspect="' + id + '"]')!.click();
  const fitting = expanded ? toss : brew, excluded = expanded ? brew : toss;
  let handle = screen();
  try {
    assert(shell.host.textContent.includes('Prepared Compounds'));
    assert(!shell.host.querySelector('[data-kit-action="technique2"]'));
    inspect(entry);
    assert(shell.host.textContent.includes('It still takes one slot'));
    shell.host.querySelector('#buy-selected')!.click();
  } finally { handle.dispose(); }
  handle = screen();
  try {
    const label = shell.host.querySelector('[data-kit-action="technique2"]')!.textContent;
    for (const name of ['Stow Flask','I','J',String(binding)]) assert(label.includes(name));
    inspect(fitting);
    assert(shell.host.querySelectorAll('img').some(node => node.getAttribute('src') === fitting + '.png'));
    shell.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchases,[entry,fitting]);
  } finally { handle.dispose(); }
  handle = screen();
  try {
    inspect(excluded);
    assert(shell.host.querySelector('#buy-selected')!.disabled);
    assert(!shell.host.textContent.includes('After the sleeve settles, use Action 2'));
  } finally { handle.dispose(); }
});

test('the ordinary controls show the reserved recipe and remaining time and use real capacity', t => {
  const { host } = menuEnvironment(t);
  const panel = new AlchemyControls(host as unknown as HTMLElement,(key,fields) => key + JSON.stringify(fields ?? {}),() => {});
  const game = new Game({ mode:'short' });
  game.addPlayer('perrin','Perrin','alchemist');
  assert(game.start());
  const view = viewOf(game,'perrin'), player = view.players[0];
  assert(view.phase === 'combat');
  player.kit.alchemyPrepared = ['binding'];
  player.kit.alchemyReserve = { fitting:'standard',stage:'latched',held:{recipe:'flare',readyAt:36,until:91} };
  assert(alchemyCommitBlocked(player,'q',0));
  assert(!alchemyCommitBlocked(player,'e',0));
  panel.update(view,player.id,false,'H');
  assert(host.textContent.includes('ui.alchemyReserve.held{"recipe":"ui.alchemy.flare{}","seconds":"4"}'));
  view.combatTick = 91;
  assert(!alchemyCommitBlocked(player,'q',91));
  panel.update(view,player.id,false,'H');
  assert(!host.textContent.includes('ui.alchemyReserve.held'));
  panel.dispose();
});

test('the prepared hotbar shows independent actions and truthful latch instructions',async t => {
  const module = await menuBundle(t,'src/client/alchemy-reactive-actions.ts',stubs) as typeof import('../src/client/alchemy-reactive-actions.ts');
  const game = new Game({ mode:'short' });
  game.addPlayer('perrin','Perrin','alchemist');
  const player = viewOf(game,'perrin').players[0];
  player.skills = [entry,reactiveIds.entry];
  player.kit.alchemyReaction = { fitting:'standard',stage:'ready',target:{x:50,y:100,radius:64} };
  player.kit.alchemyReserve = { fitting:'standard',stage:'latched',held:{recipe:'flare',readyAt:36,until:210} };
  assert.deepEqual(module.alchemyActions(player).extras,[
    {key:'technique1',id:reactiveIds.entry,at:0,blocked:false},
    {key:'technique2',id:entry,at:36,blocked:true},
  ]);
  player.skills.push(toss);
  player.kit.alchemyReserve = { ...player.kit.alchemyReserve,fitting:'toss',stage:'toss' };
  assert.equal(module.alchemyReserveLabel(player),'Throw a different flask');
  assert.equal(module.alchemyActions(player).extras[1].id,toss);
  assert(module.alchemyActions(player).extras[1].blocked);
});
