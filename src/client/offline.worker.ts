import { createPracticeGame } from '../shared/practice-start.ts';
import { Game, type Settings } from '../shared/game.ts';
import { viewOf } from '../shared/view.ts';
import {idleInput,type ClassId} from '../shared/protocol.ts';
let game: Game | null = null,
  paused = false,
  last = performance.now(),
  accumulator = 0;
let lastSavedPhase = '',
  lastSavedTick = -1000;
const emit = (force = false) => {
  if (!game) return;
  postMessage({ type: 'view', view: viewOf(game, 'solo') });
  const events = game.drainEvents();
  if (events.length) postMessage({ type: 'events', events });
  if (['victory', 'defeat'].includes(game.phase)) {
    if (lastSavedPhase !== game.phase) postMessage({ type: 'checkpoint', value: null });
    lastSavedPhase = game.phase;
  } else if (
    game.phase !== 'combat' &&
    (force || game.phase !== lastSavedPhase || game.tick - lastSavedTick >= 30)
  ) {
    postMessage({ type: 'checkpoint', value: game.offlineCheckpoint() });
    lastSavedPhase = game.phase;
    lastSavedTick = game.tick;
  }
};
self.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === 'resume') {
    try {
      game = Game.restoreOffline(m.value);
      paused = false;
      last = performance.now();
      accumulator = 0;
      emit(true);
    } catch {
      postMessage({ type: 'error', key: 'ui.errorCheckpoint' });
      return;
    }
  }
  if (m.type === 'init') {
    try {
      game = createPracticeGame(
        m.settings as Settings,
        m.name,
        m.classId as ClassId,
        m.practiceVariant,
      );
    } catch {
      game = null;
      postMessage({ type: 'error', key: 'ui.errorServer' });
      return;
    }
    paused = false;
    last = performance.now();
    accumulator = 0;
    emit(true);
  }
  if (!game) return;
  if (m.type === 'input') game.submitInput('solo', m.input);
  else if (m.type === 'start') {
    game.start();
    emit();
  } else if (m.type === 'vote') {
    game.vote('solo', m.index);
    emit(true);
  } else if (m.type === 'purchase') {
    postMessage({ type: 'purchaseResult', id: m.request.id, ...game.transact('solo', m.request) });
    emit(true);
  } else if (m.type === 'pause') {
    paused = Boolean(m.value);
    if(paused){
      const player=game.players.get('solo');
      if(player){player.input={...idleInput(),sequence:player.ack,aim:player.aim};player.pending=[];player.wasFiring=false;}
    }
    postMessage({type:'pauseState',value:paused,tick:game.tick,combatTick:game.combatTick});
    emit();
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
