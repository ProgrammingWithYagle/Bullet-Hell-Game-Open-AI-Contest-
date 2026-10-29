import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { Client } from '@colyseus/sdk';
import { Session } from '../src/client/session.ts';
import { PROTOCOL, CONTENT_REVISION } from '../src/shared/protocol.ts';

for (const audience of ['public', 'testing'] as const)
test(`compiled ${audience} desktop LAN authority reports the matching audience and enforces its opener policy`, { timeout: 25000 }, async t => {
  fs.mkdirSync('output', { recursive: true });
  const directory = fs.mkdtempSync(path.resolve('output', 'desktop-audience-'));
  const file = path.join(directory, 'lan.cjs');
  t.after(() => { fs.unlinkSync(file); fs.rmdirSync(directory); });
  await build({ entryPoints: ['src/desktop/lan-child.ts'], bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: file,
    define: { __GA_TESTING_BUILD__: JSON.stringify(audience === 'testing') }, logLevel: 'silent' });
  const portHolder = createServer(); portHolder.listen(0, '127.0.0.1'); await once(portHolder, 'listening');
  const address = portHolder.address(); assert(address && typeof address === 'object');
  const port = address.port; await new Promise<void>(resolve => portHolder.close(() => resolve()));
  const child = fork(file, [String(port)], { execArgv: [], stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  const client = new Session('http://127.0.0.1:' + port);
  try {
    const [ready] = await once(child, 'message'); assert.equal(ready.type, 'ready');
    const endpoint = 'http://127.0.0.1:' + port;
    const health = await fetch(endpoint + '/api/health').then(r => r.json());
    assert.equal(health.audience, audience); assert.equal(health.protocolVersion, PROTOCOL); assert.equal(health.contentRevision, CONTENT_REVISION);
    if (audience === 'public') {
      await assert.rejects(new Client(endpoint).create('grave', { openingBossId: 'constable' }), /testingSelectionDisabled/);
    }
    await client.connect({ name: 'Audience fixture', classId: 'soldier', mode: 'short', difficulty: 'baby', openingBossId: 'constable' });
    const deadline = Date.now() + 5000;
    while (!client.view?.players.some(p => p.id === client.id)) {
      assert(Date.now() < deadline, 'Initial LAN view timed out'); await new Promise(r => setTimeout(r, 20));
    }
    if (audience === 'testing') assert.equal(client.view!.boss.id, 'constable');
    client.start();
    while (client.view!.phase !== 'combat') {
      assert(Date.now() < deadline, 'LAN combat timed out'); await new Promise(r => setTimeout(r, 20));
    }
    assert(client.view!.boss.health > 0);
    await client.close();
    const stopped = once(child, 'exit'); child.send({ type: 'stop' }); await stopped;
  } finally {
    await client.close(); if (child.exitCode === null) child.kill();
  }
});
