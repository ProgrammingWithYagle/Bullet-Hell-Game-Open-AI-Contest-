import { bastionSoundIds, isTankBastionSound, isTankBulwarkSound, tankBulwarkDuration, tankBulwarkSample } from '../src/client/tank-bulwark-sound.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Game, data } from '../src/shared/game.ts';
import { bastionIds, type BastionCue } from '../src/shared/tank-bastion.ts';
import { bulwarkIds } from '../src/shared/tank-bulwark.ts';
import { viewOf } from '../src/shared/view.ts';
import { defaultControls, validControls } from '../src/client/input-bindings.ts';
import { drawTankGate } from '../src/client/tank-bastion-presentation.ts';
import { specializationMapLayout } from '../src/client/ui/specialization-map.ts';
import { menuBundle, menuEnvironment } from './helpers/menu-fixture.ts';

const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
const stubs = {
  'assets.ts': 'export const assets={upgrades:{},items:{},resourceIcons:{},specializationIcons:{}};',
  'i18n.ts': 'const m=' + JSON.stringify(messages) +
    ';export const locale="en",number=String,t=(key,args={})=>Object.entries(args).reduce((s,[k,v])=>s.replaceAll("{"+k+"}",String(v)),m[key]??key);',
};

test('owned Action 2 appears with saved remaps and yields to an owned wall fitting while carrying', async t => {
  const env = menuEnvironment(t);
  const guide = await menuBundle(t, 'src/client/ui/tank-controls.ts', stubs);
  const hud = await menuBundle(t, 'src/client/tank-actions.ts', stubs);
  const game = new Game({ mode: 'short' });
  game.encounter = 1;
  const tank = game.addPlayer('solo', 'Bastion', 'tank');
  const view = () => viewOf(game, tank.id).players[0];
  const controls = defaultControls();
  controls.bindings.technique2 = ['KeyN', 'KeyY'];
  controls.gamepad.technique2 = 9;
  assert(validControls(controls));
  env.host.innerHTML = guide.tankKitMarkup(view(), controls, true);
  assert(!env.host.querySelector('[data-kit-action="technique2"]'));
  for (const item of ['tank-protection-1', bastionIds.entry, bulwarkIds.entry, bulwarkIds.pivot]) {
    assert(game.transact(tank.id, { id: item, kind: 'skill', item }).ok, item);
  }
  const owned = view();
  env.host.innerHTML = guide.tankKitMarkup(owned, controls, true);
  const gate = [...env.host.querySelectorAll('[data-kit-action="technique2"]')].find(row => row.textContent.includes('Gate Signal'));
  assert(gate);
  for (const remap of ['N', 'Y', '9']) assert(gate.textContent.includes(remap));
  assert(env.host.textContent.includes('Braced Pivot'));
  assert(env.host.textContent.includes('The City Holds'));
  owned.kit.bastionCanPlant = true;
  const slot = () => hud.tankActions(owned, 0).extras.filter((a: { key: string }) => a.key === 'technique2');
  assert.deepEqual(slot(), [{ key: 'technique2', id: bastionIds.entry, at: 0, blocked: false }]);
  assert.equal(hud.tankHudLabel(owned, 'technique2', 0), 'Place Gate Signal');
  owned.kit.bulwarkCarried = true;
  owned.kit.bulwarkCanHandle = true;
  assert.deepEqual(slot(), [{ key: 'technique2', id: bulwarkIds.pivot, at: 0, blocked: false }]);
  assert.equal(hud.tankHudLabel(owned, 'technique2', 0), messages['ui.tank.turnShield']);
});

test('Bastion graph uses the actual Broad Guard prerequisite and fitting exclusion', () => {
  const route = specializationMapLayout('tank', bastionIds.entry)!;
  assert.deepEqual(route.nodes.filter(node => node.reference).map(node => node.id), ['tank-protection-1']);
  assert.deepEqual(route.edges, [
    { from: 'tank-protection-1', to: bastionIds.entry },
    { from: bastionIds.entry, to: bastionIds.split },
    { from: bastionIds.entry, to: bastionIds.corner },
    { from: bastionIds.split, to: bastionIds.relief },
    { from: bastionIds.corner, to: bastionIds.countermarch },
  ]);
  assert.deepEqual(route.exclusions, [{ a: bastionIds.split, b: bastionIds.corner }]);
});

test('the arena draws an inward arrow only for the unspent half and draws nothing after expiry', () => {
  const lines: number[][] = [];
  const graphics = {
    lineStyle: () => graphics,
    lineBetween: (...args: number[]) => { lines.push(args); return graphics; },
    fillStyle: () => graphics, fillCircle: () => graphics, beginPath: () => graphics,
    arc: () => graphics, strokePath: () => graphics,
  };
  const gate: BastionCue = {
    kind: 'tank-gate-signal', x: 100, y: 100, id: 1, owner: 'tank', at: 30, until: 270, radius: 54,
    entrances: [{ aim: 0, half: 'left', open: true }, { aim: 0, half: 'right', open: false }],
  };
  drawTankGate(graphics as unknown as Parameters<typeof drawTankGate>[0], gate, 80, data.rules.playerRadius, true);
  const shaft = lines.find(([startX, , endX]) => startX === 120 && endX === 90);
  assert(shaft && shaft[1] < 100 && shaft[1] === shaft[3]);
  assert.equal(lines.length, 5);
  drawTankGate(graphics as unknown as Parameters<typeof drawTankGate>[0], gate, gate.until, data.rules.playerRadius, true);
  assert.equal(lines.length, 5);
});

test('Bastion’s three distinct cues use the shared finite synthesis without joining the issued wall registry', () => {
  assert.deepEqual(bastionSoundIds, ['tank-gate-plant', 'tank-gate-claim', 'tank-gate-adjust']);
  for (const rate of [32000, 44100, 48000]) {
    const fingerprints = new Set<string>();
    for (const id of bastionSoundIds) {
      assert(isTankBastionSound(id));
      assert(!isTankBulwarkSound(id));
      const duration = tankBulwarkDuration(id);
      const samples = Array.from({ length: Math.ceil(rate * duration) }, (_, i) => tankBulwarkSample(id, i / rate));
      assert(samples.every(sample => Number.isFinite(sample) && Math.abs(sample) < 0.4));
      assert(samples.some(sample => sample !== 0));
      assert.equal(tankBulwarkSample(id, duration), 0);
      fingerprints.add(samples.slice(0, 128).join(','));
    }
    assert.equal(fingerprints.size, 3);
  }
});

test('the remapped Action 2 describes ready late fittings and retains carried wall priority', async t => {
  const env = menuEnvironment(t);
  const guide = await menuBundle(t, 'src/client/ui/tank-controls.ts', stubs);
  const hud = await menuBundle(t, 'src/client/tank-actions.ts', stubs);
  const controls = defaultControls();
  controls.bindings.technique2 = ['KeyN', 'KeyY'];
  controls.gamepad.technique2 = 9;
  for (const [fitting, item, ready, label] of [
    [bastionIds.split, bastionIds.relief, 'relief', 'Move reserve to this half'],
    [bastionIds.corner, bastionIds.countermarch, 'turn', 'Reverse this entrance'],
  ] as const) {
    const game = new Game({ mode: 'short' });
    game.encounter = 2;
    const tank = game.addPlayer('solo', 'Bastion', 'tank');
    for (const skill of ['tank-protection-1', bastionIds.entry, fitting, item, bulwarkIds.entry, bulwarkIds.pivot]) {
      assert(game.transact(tank.id, { id: skill, kind: 'skill', item: skill }).ok, skill);
    }
    const player = viewOf(game, 'solo').players[0];
    env.host.innerHTML = guide.tankKitMarkup(player, controls, true);
    const row = [...env.host.querySelectorAll('[data-kit-action="technique2"]')].find(row => row.textContent.includes(messages['skill.' + item + '.name']));
    assert(row);
    for (const remap of ['N', 'Y', '9']) assert(row.textContent.includes(remap));
    player.ultimateAt = 1000;
    player.kit.bastionAdjustment = ready;
    const button = () => hud.tankActions(player, 0).extras.find((a: { key: string }) => a.key === 'technique2');
    assert.deepEqual(button(), { key: 'technique2', id: item, at: 0, blocked: false });
    assert.equal(hud.tankHudLabel(player, 'technique2', 0), label);
    player.kit.bulwarkCarried = true;
    player.kit.bulwarkCanHandle = true;
    assert.deepEqual(button(), { key: 'technique2', id: bulwarkIds.pivot, at: 0, blocked: false });
  }
});
