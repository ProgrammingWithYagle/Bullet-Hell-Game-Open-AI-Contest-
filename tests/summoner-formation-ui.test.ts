import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game } from '../src/shared/game.ts';
import { formationIds, type FormationCue, type FormationStatus } from '../src/shared/summoner-formation.ts';
import { cohortIds } from '../src/shared/summoner-cohort.ts';
import { bondIds } from '../src/shared/summoner-bond.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { drawFormationCue } from '../src/client/summoner-formation-presentation.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const { entry, walking, turn } = formationIds;
const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const icons = Object.fromEntries([...Object.values(formationIds), ...Object.values(bondIds), ...Object.values(cohortIds)].map(id => [id, id + '.png']));
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:' + JSON.stringify(icons) + '};',
  'i18n.ts': 'const messages=' + JSON.stringify(messages) +
    ";export const locale='en',number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),messages[key]??key);",
};

test('the formation map shows its foundation and the real fitting exclusion', () => {
  const map = specializationMapLayout('summoner', entry)!;
  assert.deepEqual(map.nodes.filter(row => row.reference).map(row => row.id), ['summoner-bonds-1']);
  assert.deepEqual(map.edges, [{ from: 'summoner-bonds-1', to: entry }, { from: entry, to: walking }, { from: entry, to: turn }]);
  assert.deepEqual(map.exclusions, [{ a: walking, b: turn }]);
});

for (const expanded of [false, true]) test('formation purchase and three independent remaps in the ' + (expanded ? 'expanded' : 'compact') + ' shop', async t => {
  const env = menuEnvironment(t);
  const shop = await menuBundle(t, 'src/client/ui/shop.ts', stubs);
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS');
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (key: string) => key } });
  t.after(() => css ? Object.defineProperty(globalThis, 'CSS', css) : Reflect.deleteProperty(globalThis, 'CSS'));
  const game = new Game({ mode: 'endless' });
  game.encounter = 9;
  const joss = game.addPlayer('joss', 'Joss', 'summoner');
  const buy = (item: string) => game.transact(joss.id, { id: 'formation-ui-' + item, kind: 'skill', item });
  for (const item of ['summoner-bonds-1', cohortIds.entry, bondIds.entry]) assert(buy(item).ok);
  const controls = defaultControls();
  controls.bindings.technique1 = ['KeyZ', 'KeyG'];
  controls.bindings.technique2 = ['KeyN', 'KeyY'];
  controls.bindings.technique3 = ['KeyI', 'KeyJ'];
  const pad = [16,15,14,13,12,11,10,9,8].find(value => !Object.values(controls.gamepad).includes(value))!;
  controls.gamepad.technique3 = pad;
  assert(validControls(controls));
  const fitted = expanded ? walking : turn, excluded = expanded ? turn : walking;
  const purchased: string[] = [];
  function show() {
    const actor = viewOf(game, joss.id).players[0];
    const context = [[], expanded, 'normal', undefined, true, controls] as const;
    env.host.innerHTML = '<div class="loadout-editor">' + shop.shopMarkup(actor, ...context) + '</div>';
    const handle = shop.bindShop(env.host, actor, (request: { item: string }) => { assert(buy(request.item).ok); purchased.push(request.item); }, ...context);
    env.host.querySelector('[data-shop-tab="specializations"]')!.click();
    env.host.querySelector('[data-specialization-route="' + entry + '"]')!.click();
    return handle;
  }
  const inspect = (id: string) => env.host.querySelector('[data-inspect="' + id + '"]')!.click();
  let handle = show();
  try {
    assert(!env.host.querySelector('[data-kit-action="technique3"]'));
    inspect(entry);
    assert(env.host.textContent.includes('give up their attacks'));
    assert.deepEqual(purchased, []);
    env.host.querySelector('#buy-selected')!.click();
  } finally { handle.dispose(); }
  handle = show();
  try {
    for (const [slot, words] of Object.entries({ technique1:['Cohort Drive','Z','G'], technique2:['Mending Bond','N','Y'], technique3:['Set the Line','I','J',String(pad)] })) {
      const row = env.host.querySelector('[data-kit-action="' + slot + '"]')!.textContent;
      for (const word of words) assert(row.includes(word), word);
    }
    inspect(fitted);
    assert(env.host.querySelectorAll('img').some(node => node.getAttribute('src') === fitted + '.png'));
    env.host.querySelector('#buy-selected')!.click();
    assert.deepEqual(purchased, [entry, fitted]);
  } finally { handle.dispose(); }
  handle = show();
  try {
    inspect(excluded);
    assert(env.host.querySelector('#buy-selected')!.disabled);
  } finally { handle.dispose(); }
});

test('Action 3 distinguishes walking to posts, holding and turning, and the public cue draws a front only after settling', async t => {
  const api = await menuBundle(t, 'src/client/summoner-cohort-actions.ts', stubs) as typeof import('../src/client/summoner-cohort-actions.ts');
  const game = new Game({ mode: 'short' });
  game.addPlayer('joss', 'Joss', 'summoner');
  const actor = viewOf(game, 'joss').players[0];
  for (const [stage, canCommand, label] of [
    ['ready',true,'Quarter Turn'],['setting',false,'Companions taking their posts'],
    ['set',true,'Aim to a side to turn the line'],['set',false,'Companions holding the line'],
  ] as const) {
    const formation: FormationStatus = { stage, fitting:'turn', canCommand, catches:0, recoveryAt:0, until:110 };
    const p = { ...actor, skills:[entry,turn], kit:{ ...actor.kit, formation } };
    assert.equal(api.summonerFormationLabel(p), label);
    assert.deepEqual(api.summonerActions(p, 80).extras,[{ key:'technique3', id:turn, at:0, blocked:!canCommand }]);
  }
  const lines: number[][] = [], rings: number[][] = [];
  const graphics = {
    strokeCircle(...values: number[]) { rings.push(values); return this; },
    lineBetween(...values: number[]) { lines.push(values); return this; },
    lineStyle() { return this; }, fillStyle() { return this; }, fillCircle() { return this; },
  };
  const cue: FormationCue = { kind:'summoner-formation', id:2, owner:'joss', state:'seeking', x:25, y:25,
    ax:20, ay:30, bx:30, by:20, aim:0, radius:7, at:10, until:110 };
  drawFormationCue(graphics, cue, 40, true, false);
  assert.equal(rings.length, 2);
  assert.equal(lines.length, 0);
  drawFormationCue(graphics, { ...cue, state:'holding' }, 50, false, true);
  assert.deepEqual(lines[0], [20,30,30,20]);
  assert.equal(lines.length, 4);
  drawFormationCue(graphics, cue, cue.until, true, false);
  assert.equal(rings.length, 4);
});
