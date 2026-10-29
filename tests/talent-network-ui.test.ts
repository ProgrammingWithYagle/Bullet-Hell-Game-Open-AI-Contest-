import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Game, data } from '../src/shared/game.ts';
import { viewOf } from '../src/shared/view.ts';
import { idleInput, type ClassId } from '../src/shared/protocol.ts';
import { createGameServer } from '../src/server/index.ts';
import { liveRooms } from '../src/server/GraveRoom.ts';
import { Session } from '../src/client/session.ts';
const until = async (check: () => boolean) => {
  const end = Date.now() + 5000;
  while (!check()) {
    if (Date.now() > end) throw Error('Talent network state timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
};
test(
  'real owner purchases and observer replication preserve transformed fields, walls, turrets, timed cues and decoys for all seven classes',
  { timeout: 30000 },
  async () => {
    const { server, httpServer } = createGameServer();
    await server.listen(0, '127.0.0.1');
    const address = httpServer.address();
    assert(address && typeof address === 'object');
    try {
      for (const cl of data.classes) {
        const owner = new Session('http://127.0.0.1:' + address.port),
          guest = new Session('http://127.0.0.1:' + address.port);
        try {
          const options = {
            name: 'Host',
            classId: cl.id as ClassId,
            mode: 'endless' as const,
            difficulty: 'normal',
          };
          await owner.connect(options);
          await guest.connect(
            { ...options, name: 'Observer', classId: 'soldier' },
            { roomId: owner.room!.roomId },
          );
          await until(() => owner.view?.players.length === 2);
          const g = liveRooms.get(owner.room!.roomId)!.game,
            p = g.players.get(owner.id)!;
          p.totalSp = 27;
          for (const node of data.skills
            .filter(
              (s) =>
                s.classId === cl.id &&
                s.branchId === cl.branches[1].id &&
                s.depth <= 3,
            )
            .sort((a, b) => a.depth - b.depth)) {
            owner.purchase({ kind: 'skill', item: node.id });
            await until(() => p.skills.includes(node.id));
          }
          owner.start();
          await until(() => guest.view?.phase === 'combat');
          g.boss.staggerUntil = g.boss.deadline = 1e9;
          g.boss.health = g.boss.maxHealth = 1e6;
          for (const a of g.players.values()) {
            a.x = a.oldX = 800;
            a.y = a.oldY = 700;
            a.invulnerableUntil = 1e9;
          }
          const ally = g.players.get(guest.id)!;
          ally.health = 20;
          owner.input({
            ...idleInput(),
            sequence: 1,
            aim: -Math.PI / 2,
            q: true,
            e: true,
            ultimate: true,
          });
          await until(
            () =>
              guest.view!.classCues.length > 0 ||
              guest.view!.fields.some((f) => !!f.anchor),
          );
          const v = guest.view!;
          assert.equal(v.players.length, 2);
          assert(v.players.every((a) => !a.id.startsWith('decoy:')));
          if (cl.id === 'soldier')
            assert(v.fields.some((f) => f.anchor === owner.id));
          if (cl.id === 'heavy')
            assert(
              v.classCues.some(
                (c) => c.kind === 'wall' && c.follow && c.halfSpan === 65,
              ),
            );
          if (cl.id === 'tank')
            assert.equal(
              v.classCues.filter((c) => c.kind === 'wall' && c.halfSpan === 55)
                .length,
              2,
            );
          if (cl.id === 'medic')
            assert(v.fields.some((f) => f.anchor === guest.id));
          if (cl.id === 'mage')
            assert.equal(
              v.classCues.filter((c) => c.kind === 'sigil').length,
              2,
            );
          if (cl.id === 'engineer') {
            assert.equal(
              v.classCues.filter((c) => c.kind === 'turret').length,
              2,
            );
            assert(v.classCues.some((c) => c.kind === 'siege' && c.mobile));
          }
          if (cl.id === 'assassin')
            assert(
              v.classCues.some((c) => c.kind === 'decoy' && c.health === 60),
            );
          g.boss.health = 0;
          await until(() => guest.view?.phase !== 'combat');
          assert.equal(guest.view!.classCues.length, 0);
          assert.equal(guest.view!.fields.length, 0);
        } finally {
          await Promise.allSettled([owner.close(), guest.close()]);
        }
      }
    } finally {
      await server.gracefullyShutdown(false);
    }
  },
);
test('both actual shop layouts show localized talent help and retain prerequisite and affordability guards', async () => {
  const messages = JSON.parse(readFileSync('locales/en.json', 'utf8')).messages;
  const bundle = await build({
    entryPoints: ['src/client/ui/shop.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'talent-shop-fixtures',
        setup(b) {
          b.onResolve({ filter: /(?:i18n|assets)\.ts$/ }, (a) => ({
            path: a.path.endsWith('i18n.ts') ? 'i18n' : 'assets',
            namespace: 'talent-fixture',
          }));
          b.onLoad({ filter: /.*/, namespace: 'talent-fixture' }, (a) => ({
            loader: 'js',
            contents:
              a.path === 'assets'
                ? 'export const assets={upgrades:{},items:{}};'
                : 'const messages=' +
                  JSON.stringify(messages) +
                  ';export const locale="en";export const t=k=>messages[k]??k;export const number=String;',
          }));
        },
      },
    ],
  });
  const shop = await import(
    'data:text/javascript;base64,' +
      Buffer.from(bundle.outputFiles[0].text).toString('base64')
  );
  for (const cl of data.classes) {
    const g = new Game(),
      p = g.addPlayer('p', 'Survivor', cl.id as ClassId),
      node = data.skills.find((s) => s.classId === cl.id && 'transform' in s)!;
    p.totalSp = 27;
    const v = viewOf(g, p.id).players[0];
    for (const expanded of [false, true]) {
      shop.shopMarkup(v, [], expanded);
      const button: any = {
        dataset: { inspect: node.id, itemKind: 'skill' },
        classList: { toggle() {} },
        setAttribute() {},
        onclick: null,
      };
      const details: any = { innerHTML: '' },
        buy: any = {},
        requests: unknown[] = [];
      const host: any = {
        querySelector: (key: string) =>
          key === '#buy-selected'
            ? buy
            : key === '#item-details'
              ? details
              : null,
        querySelectorAll: (key: string) =>
          key === '[data-inspect]' ? [button] : [],
      };
      shop.bindShop(host, v, (r: unknown) => requests.push(r), [], expanded);
      button.onclick();
      assert.equal(requests.length, 0);
      assert(
        details.innerHTML.includes(
          messages[
            'talent.' +
              ('transform' in node ? node.transform : '') +
              '.description'
          ],
        ),
      );
      buy.onclick();
      assert.equal(requests.length, 0);
      v.skills = [node.prerequisite!];
      v.sp = 2;
      buy.onclick();
      assert.equal(requests.length, 0);
      v.sp = 3;
      buy.onclick();
      assert.equal(requests.length, 1);
      assert.deepEqual(requests[0], { kind: 'skill', item: node.id });
      v.skills = [];
    }
  }
});
