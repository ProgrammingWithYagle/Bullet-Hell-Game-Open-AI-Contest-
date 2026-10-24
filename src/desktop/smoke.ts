import type {} from '../client/desktop.ts';
import {
  PROTOCOL,
  CONTENT_REVISION,
  implementedClassIds,
  implementedModeIds,
  idleInput,
} from '../shared/protocol.ts';
import catalog from '../../content/catalog.json';
import { freshProfile, saveProfile, loadProfile } from '../client/profile.ts';
type Meta = {
  worker: string;
  music: { id: string; url: string; frames: number; sampleRate: number }[];
  font: string;
};
declare global {
  interface Window {
    graveSmoke: { finish(result: unknown): Promise<void> };
  }
}
async function run() {
  const assert = (value: unknown, message: string) => {
    if (!value) throw Error(message);
  };
  const meta: Meta = await (await fetch('./bundle.json')).json();
  assert(
    typeof (globalThis as { require?: unknown }).require === 'undefined',
    'Node require must be unavailable',
  );
  assert(
    typeof (globalThis as { process?: unknown }).process === 'undefined',
    'Node process must be unavailable',
  );
  const lan = await window.graveDesktop!.lanStatus();
  assert(!lan.active, 'Offline startup must not start LAN');
  const worker = new Worker(meta.worker, { type: 'module' });
  let view: any,
    checkpoint: any,
    shots = 0;
  worker.onmessage = (event) => {
    const m = event.data;
    if (m.type === 'view') view = m.view;
    if (m.type === 'checkpoint') checkpoint = m.value;
    if (m.type === 'events')
      shots += m.events
        .filter((e: any) => e.type === 'shots')
        .reduce((n: number, e: any) => n + e.shots.length, 0);
  };
  let workerError = '';
  worker.onerror = (event) => {
    workerError = event.message;
  };
  const until = async (check: () => boolean) => {
    const deadline = performance.now() + 5000;
    while (!check()) {
      if (workerError) throw Error(workerError);
      if (performance.now() > deadline) throw Error('Offline worker timeout');
      await new Promise((r) => setTimeout(r, 10));
    }
  };
  let cases = 0;
  for (const classId of implementedClassIds)
    for (const mode of implementedModeIds)
      for (const difficulty of catalog.difficulties) {
        const id = 'desktop-smoke-' + ++cases;
        view = null;
        checkpoint = null;
        worker.postMessage({
          type: 'init',
          name: 'Portable tester',
          classId,
          settings: { seed: 11, runId: id, mode, difficulty: difficulty.id, maxPlayers: 1 },
        });
        await until(
          () => view?.run.id === id && view.phase === 'lobby' && checkpoint?.settings.runId === id,
        );
        assert(
          checkpoint.protocolVersion === PROTOCOL &&
            checkpoint.contentRevision === CONTENT_REVISION,
          'Checkpoint version',
        );
        worker.postMessage({ type: 'start' });
        await until(() => view?.phase === 'combat');
        assert(view.players[0].classId === classId && view.boss.health > 0, 'Deployed class/boss');
        worker.postMessage({ type: 'pause', value: true });
      }
  assert(cases === 210, 'Seven classes, five modes and six difficulties');
  view = null;
  worker.postMessage({ type: 'resume', value: checkpoint });
  await until(() => view?.phase === 'lobby');
  worker.postMessage({ type: 'start' });
  await until(() => view?.phase === 'combat');
  const x = view.players[0].x;
  worker.postMessage({
    type: 'input',
    input: { ...idleInput(), sequence: 1, moveX: 1, fire: true },
  });
  await until(() => view.tick >= 5 && shots > 0);
  assert(view.players[0].x > x, 'Fixed-step movement');
  worker.terminate();
  const profile = freshProfile();
  profile.locale = 'ar';
  saveProfile(localStorage, profile);
  assert(loadProfile(localStorage).locale === 'ar', 'Profile persistence');
  const font = new FontFace('PackagedTest', `url(${meta.font})`);
  await font.load();
  const context = new AudioContext(),
    music = [];
  for (const track of meta.music) {
    const buffer = await context.decodeAudioData(await (await fetch(track.url)).arrayBuffer());
    assert(
      Math.abs(buffer.length / buffer.sampleRate - track.frames / track.sampleRate) <=
        2 / buffer.sampleRate,
      track.id + ' browser decode duration',
    );
    music.push({ id: track.id, sampleRate: buffer.sampleRate, frames: buffer.length });
  }
  await context.close();
  await window.graveSmoke.finish({
    passed: true,
    protocol: PROTOCOL,
    contentRevision: CONTENT_REVISION,
    workerCases: cases,
    fixedStepMovement: true,
    weaponShotMessages: shots,
    profileRoundTrip: true,
    bundledFontLoaded: true,
    compressedMusicDecoded: music.length,
    music,
    nodeUnavailable: true,
    renderedReviewed: false,
    limits: [
      'Automated packaged Electron renderer/worker/decode fixture. No manual gameplay, visual, listening, physical-device or network acceptance.',
    ],
  });
}
run().catch(
  (error) =>
    void window.graveSmoke.finish({
      passed: false,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      renderedReviewed: false,
    }),
);
