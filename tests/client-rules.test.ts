import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { idleInput } from '../src/shared/protocol.ts';
import { Prediction } from '../src/client/prediction.ts';
import { formatMessage, type Message } from '../src/shared/messages.ts';

test('prediction reconciles acknowledged input and replays only the pending movement', () => {
  const g = new Game(),
    p = g.addPlayer('p', 'Mara', 'soldier');
  g.start();
  g.boss.staggerUntil = 1e9;
  const predictor = new Prediction();
  predictor.acknowledge(viewOf(g, p.id), p.id);
  let delayed = viewOf(g, p.id);
  for (let sequence = 1; sequence <= 10; sequence++) {
    const input = { ...idleInput(), sequence, moveX: 1, moveY: -1, dodge: sequence === 2 };
    predictor.submit(input, viewOf(g, p.id));
    g.submitInput(p.id, input);
    g.step();
    if (sequence === 5) delayed = viewOf(g, p.id);
  }
  predictor.acknowledge(delayed, p.id);
  assert(Math.abs(predictor.player!.x - p.x) < 1e-9);
  assert(Math.abs(predictor.player!.y - p.y) < 1e-9);
  predictor.acknowledge(viewOf(g, p.id), p.id);
  assert.equal(predictor.player!.ack, 10);
  assert.equal(predictor.player!.x, p.x);
});

test('Endless keeps normalized base income while paying fixed-classification bounty premiums', () => {
  const g = new Game({ mode: 'endless' }),
    p = g.addPlayer('p', 'Mara', 'soldier');
  g.start();
  let expectedCoins = 120;
  for (let encounter = 0; encounter < 9; encounter++) {
    const beforeIncome = p.incomeGranted;
    g.boss.health = 0;
    g.step();
    expectedCoins += Math.floor((p.incomeGranted - beforeIncome) * 1.12);
    g.phase = 'loading';
    g.phaseEnds = g.tick;
    g.step();
  }
  assert.equal(g.encounter, 9);
  assert.equal(p.totalSp, 27);
  assert.equal(p.incomeGranted, 2400);
  assert.equal(p.coins, expectedCoins);
  assert(p.coins > p.incomeGranted);
});

test('late arrivals receive boundary income once and purchased coins are not refunded', () => {
  const g = new Game(),
    p = g.addPlayer('p', 'Mara', 'soldier');
  g.transact(p.id, { id: 'early', kind: 'upgrade', item: 'damage' });
  assert.equal(p.coins, 30);
  g.start();
  assert.equal(p.coins, 30);
  const late = g.addPlayer('late', 'Iona', 'medic');
  g.boss.health = 0;
  g.step();
  assert.equal(late.coins, 120);
  assert.equal(p.coins, 668);
  g.phase = 'loading';
  g.phaseEnds = g.tick;
  g.step();
  assert.equal(late.coins, 690);
  assert.equal(p.coins, 668);
});

test('all shipped language plural forms format numbers without recursive substitution', () => {
  for (const locale of [
    'en',
    'zh-Hans',
    'zh-Hant',
    'ja',
    'es',
    'fr',
    'de',
    'pt-BR',
    'ru',
    'hi',
    'ar',
    'bn',
    'id',
    'ur',
    'ko',
  ]) {
    const catalog = JSON.parse(
      readFileSync(new URL('../locales/' + locale + '.json', import.meta.url), 'utf8'),
    );
    for (const count of [0, 1, 2, 3, 11, 101]) {
      const value = formatMessage(catalog.messages['count.players'] as Message, locale, { count });
      assert(!value.includes('{count}'));
      assert(value.length > 0);
    }
  }
  assert.equal(
    formatMessage('Revive {player}: {progress}', 'en', { player: '{progress}', progress: '50%' }),
    'Revive {progress}: 50%',
  );
});
