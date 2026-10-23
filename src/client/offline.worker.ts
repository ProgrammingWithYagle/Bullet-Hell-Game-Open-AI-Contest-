import { Game, type Settings } from '../shared/game.ts';
import { viewOf } from '../shared/view.ts';
import type { ClassId } from '../shared/protocol.ts';
let game: Game | null = null,
  paused = false,
  last = performance.now(),
  accumulator = 0;
const emit = () => {
  if (!game) return;
  postMessage({ type: 'view', view: viewOf(game, 'solo') });
  const events = game.drainEvents();
  if (events.length) postMessage({ type: 'events', events });
};
self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'init') {
    game = new Game(m.settings as Settings);
    game.addPlayer('solo', m.name, m.classId as ClassId);
    paused = false;
    last = performance.now();
    accumulator = 0;
    emit();
  }
  if (!game) return;
  if (m.type === 'input') game.submitInput('solo', m.input);
  else if (m.type === 'start') {
    game.start();
    emit();
  } else if (m.type === 'vote') game.vote('solo', m.index);
  else if (m.type === 'purchase') {
    postMessage({ type: 'purchaseResult', id: m.request.id, ...game.transact('solo', m.request) });
    emit();
  } else if (m.type === 'pause') {
    paused = Boolean(m.value);
    last = performance.now();
    accumulator = 0;
  }
};
setInterval(() => {
  const now = performance.now();
  if (game && !paused) {
    accumulator += Math.min(250, now - last);
    let steps = 0;
    while (accumulator >= 1000 / 30 && steps++ < 8) {
      game.step();
      accumulator -= 1000 / 30;
    }
    if (steps) emit();
  }
  last = now;
}, 8);
