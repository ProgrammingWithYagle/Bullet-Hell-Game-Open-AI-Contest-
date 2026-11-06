import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Session } from '../src/client/session.ts';
import { idleInput } from '../src/shared/protocol.ts';
const [audience, scope] = process.argv.slice(2);
assert(['testing', 'public'].includes(audience));
assert(/^reviews\/[a-z0-9-]+$/.test(scope));
const manifest = JSON.parse(fs.readFileSync(scope + '/preview-' + audience + '.json', 'utf8'));
const a = new Session(manifest.endpoint),
  b = new Session(manifest.endpoint),
  story = new Session(manifest.endpoint);
async function wait(check: () => boolean, label: string) {
  const until = Date.now() + 10000;
  while (!check()) {
    assert(Date.now() < until, label);
    await new Promise((r) => setTimeout(r, 15));
  }
}
try {
  const options = {
    name: 'Dara review',
    classId: 'swordsman' as const,
    mode: 'short' as const,
    difficulty: 'normal',
  };
  await a.connect(options);
  await b.connect(
    { ...options, name: 'Sword partner' },
    { roomId: a.room!.roomId, kind: 'freeplay' },
  );
  await wait(() => b.view?.players.length === 2, 'Sword roster missing');
  assert(
    b.view!.players.every(
      (p) => p.classId === 'swordsman' && p.weapon === 'swordsman-0' && p.sp === 3,
    ),
  );
  a.purchase({ kind: 'skill', item: 'swordsman-measure-1' });
  await wait(
    () =>
      b.view?.players.some((p) => p.id === a.id && p.skills.includes('swordsman-measure-1')) ===
      true,
    'Sword SP purchase missing',
  );
  assert.equal(b.view!.players.find((p) => p.id === b.id)!.sp, 3);
  a.start();
  await wait(() => b.view?.phase === 'combat', 'Sword combat missing');
  a.input({ ...idleInput(), sequence: 1, aim: 0, ultimate: true, e: true });
  await wait(
    () => b.view?.players.find((p) => p.id === a.id)?.kit.swordCuts === 3,
    'Sword stance missing',
  );
  assert.equal(b.view!.players.find((p) => p.id === b.id)!.kit.swordCuts, 0);
  a.input({ ...idleInput(), sequence: 2, aim: 0, fire: true });
  await wait(
    () => b.view?.players.find((p) => p.id === a.id)?.kit.swordCuts === 2,
    'Sword charge spend missing',
  );
  await a.close();
  await wait(
    () => b.view?.players.some((p) => p.id === a.id && !p.connected) === true,
    'Sword disconnect missing',
  );
  await wait(
    () => b.view?.classCues.every((c) => !c.kind.startsWith('sword-') || c.owner !== a.id) === true,
    'Sword owner cue not cleared',
  );
  await b.close();
  await story.connect({ ...options, mode: 'story' });
  await wait(() => story.view?.players.length === 1, 'Sword chapter missing');
  const p = story.view!.players[0];
  assert.equal(p.sp, 0);
  assert.equal(p.training?.characterId, 'dara-flint');
  assert.equal(p.training?.proofs.length, 0);
  assert(story.view!.chapter);
  await story.close();
  const receipt = {
    checkedAt: new Date().toISOString(),
    passed: true,
    audience,
    sourceCommit: manifest.sourceCommit,
    endpoint: manifest.endpoint,
    peers: 2,
    classId: 'swordsman',
    ownedFreePlaySpPurchase: true,
    empoweredChargesReplicated: true,
    committedPrimarySpendsCharge: true,
    ownerDisconnectClearsCues: true,
    storyCharacterIdentity: true,
    storySpZero: true,
    noFabricatedProof: true,
    probeRoomsClosed: true,
    limits: [
      'Frozen class-entry/build/stance/charge/cleanup probe. Actual melee hits, parry geometry and earned Story proofs are separate shared-authority and source-network tests.',
      'No rendered, listening, device, native-language or human balance acceptance.',
    ],
  };
  fs.writeFileSync(
    scope + '/swordsman-smoke-' + audience + '.json',
    JSON.stringify(receipt, null, 2) + '\n',
  );
  console.log(JSON.stringify(receipt));
} finally {
  await a.close();
  await b.close();
  await story.close();
}
