import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { idleInput, type InputFrame } from '../src/shared/protocol.ts';
import { pursuitIds, pursuitRules, type PursuitStatus } from '../src/shared/swordsman-pursuit.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationFocus, specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, through, cross } = pursuitIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries(Object.values(pursuitIds).map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('The Flowing Pursuit map shows an issued prerequisite and two exclusive fittings', () => {
  const path = specializationMapLayout('swordsman', entry)!;
  const overview = specializationMapLayout('swordsman')!;
  assert.deepEqual(path.nodes.filter(row => row.reference).map(row => row.id), ['swordsman-footwork-1']);
  assert.deepEqual(path.edges, [{ from:'swordsman-footwork-1', to:entry }, { from:entry, to:through }, { from:entry, to:cross }]);
  assert.deepEqual(path.exclusions, [{ a:through, b:cross }]);
  assert.equal(specializationFocus(path, entry, 'ArrowUp'), 'swordsman-footwork-1');
  assert.equal(specializationFocus(path, through, 'ArrowRight'), cross);
  assert(path.nodes.every(node => overview.nodes.some(candidate => candidate.id === node.id)));
  assert(overview.nodes.some(node=>node.id==='swordsman-held-edge-1'));
});

for (const expanded of [false, true]) test((expanded ? 'Expanded' : 'Compact') + ' Flowing Pursuit shop purchases and explains each fitting', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable:true, value:{ escape:(key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode:'short', seed:41, openingArenaId:'gatehouse', arenaSelection:'fixed' });
  game.encounter = 1;
  const dara = game.addPlayer('swordsman', 'Dara', 'swordsman');
  const controls = defaultControls();
  controls.bindings.technique3 = ['KeyI','KeyJ'];
  const pad = [16,15,14,13,12,11,10,9,8].find(number=>!Object.values(controls.gamepad).includes(number))!;
  assert(Number.isSafeInteger(pad));
  controls.gamepad.technique3 = pad;
  assert(validControls(controls));
  const buy = (item: string) => game.transact(dara.id, { id:'pursuit-ui-' + item, kind:'skill', item });
  assert(buy('swordsman-footwork-1').ok);
  const selected = expanded ? cross : through, excluded = expanded ? through : cross;
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
    assert(!env.host.querySelector('[data-kit-action="technique3"]'));
    inspect(entry);
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-swordsman-kit]')!;
    for (const token of ['Measured Cut','Frontal Guard','Long Measure']) assert(kit.textContent.includes(token));
    const action = kit.querySelector('[data-kit-action="technique3"]')!.textContent;
    for (const token of ['Passing Cut','I','J',String(pad)]) assert(action.includes(token));
    inspect(selected);
    assert(env.host.querySelectorAll('img').some(img => img.getAttribute('src') === selected + '.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry, selected]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    const kit = env.host.querySelector('[data-swordsman-kit]')!;
    assert(kit.textContent.includes(expanded ? 'take a crossing step' : 'continue along the approach'));
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { handle.dispose(); }
});

test('The shared Swordsman HUD offers the third action and shows the actual follow-up', async t => {
  const { swordsmanActions, swordsmanHudLabel } = await menuBundle(t,'src/client/sword-measured-actions.ts',stubs) as
    typeof import('../src/client/sword-measured-actions.ts');
  const game = new Game({ mode:'short' });
  const dara = game.addPlayer('dara','Dara','swordsman');
  const base = viewOf(game,dara.id).players[0], now = 55;
  assert.deepEqual(swordsmanActions(base,now).extras,[]);
  function check(update:Partial<PursuitStatus>, label:string, id:string, at:number, blocked:boolean, ammo=2) {
    const pursuit = { stride:0, heading:undefined, recoveryAt:0, followUntil:0, followStride:0, fitting:undefined, canStrike:false, ...update };
    const player = { ...base, ammo, qAt:75, eAt:65, skills:['swordsman-held-edge-1','swordsman-drawn-reply-1',entry],
      kit:{ ...base.kit, pursuit } };
    const actions = swordsmanActions(player,now);
    assert.equal(actions.qAt,75);
    assert.equal(swordsmanHudLabel(player,now,'technique3'),label);
    assert.deepEqual(actions.extras,[{ key:'technique1', id:'swordsman-held-edge-1', at:75, blocked:true },
      { key:'technique2', id:'swordsman-drawn-reply-1', at:65, blocked:true }, { key:'technique3', id, at, blocked } ]);
  }
  check({ stride:42.77 },'Walk the approach 42/54',entry,0,true);
  check({ stride:54 },'Face along your new footing',entry,0,true);
  check({ stride:54, canStrike:true },'Deliver Passing Cut',entry,0,false);
  check({ recoveryAt:90 },'Passing Cut recovering',entry,90,true);
  check({ followUntil:80, followStride:17, fitting:'through' },'Continue forward 17/32',through,0,true);
  check({ followUntil:80, followStride:32, fitting:'cross', canStrike:true },'Crossing Step',cross,0,false);
  check({ followUntil:80, followStride:29, fitting:'cross' },'Load another primary charge',cross,0,true,0);

  for (const item of ['swordsman-footwork-1', entry]) assert(game.transact(dara.id,{ id:item, item, kind:'skill' }).ok);
  assert(game.start());
  const arena = { ...game.arena, obstacles:[], lavaPits:[] };
  Object.defineProperty(game,'arena',{ get:() => arena });
  Object.assign(dara,{ x:500, y:500, oldX:500, oldY:500 });
  Object.assign(game.boss,{ x:1300, y:710, staggerUntil:9000, deadline:9000 });
  function step(input:Partial<InputFrame>) {
    assert(game.submitInput(dara.id,{ ...idleInput(), aim:0, sequence:dara.ack+1, clientTick:game.combatTick, ...input }));
    game.step();
    return viewOf(game,dara.id).players[0];
  }
  for (let i=0; i<30 && !game.kitStatus(dara.id).pursuit?.canStrike; i++) step({ moveX:1 });
  assert(game.kitStatus(dara.id).pursuit?.canStrike);
  const facingAway = step({ aim:Math.PI });
  assert.equal(swordsmanHudLabel(facingAway,game.combatTick,'technique3'),'Face along your new footing');
  const recovering = step({ fire:true });
  assert(dara.fireAt > game.combatTick && recovering.ammo > 0);
  assert.equal(recovering.kit.pursuit?.stride,pursuitRules.stride);
  assert.equal(recovering.kit.pursuit?.heading,recovering.aim);
  assert(!recovering.kit.pursuit?.canStrike);
  assert.equal(swordsmanHudLabel(recovering,game.combatTick,'technique3'),'Recover');
});
