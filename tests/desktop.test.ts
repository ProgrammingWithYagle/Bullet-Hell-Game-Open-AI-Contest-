import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { fork, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { normalizeLanEndpoint, privateIPv4, validLanPort } from '../src/shared/lan.ts';
import {
  staticPath,
  localDocument,
  allowedExternal,
  contentSecurityPolicy,
} from '../src/desktop/security.ts';
import { Session } from '../src/client/session.ts';
import { PROTOCOL } from '../src/shared/protocol.ts';
import { readFileSync } from 'node:fs';
import messages from '../src/client/desktop-messages.json';
import catalog from '../content/catalog.json';
test('LAN endpoints accept only canonical private/loopback IPv4 and bounded ports', () => {
  for (const value of [
    '127.0.0.1:2568',
    '192.168.2.30:65535',
    '10.0.0.4:2568',
    '172.16.0.1:1024',
    'localhost:2568',
  ])
    assert.equal(normalizeLanEndpoint(value), 'http://' + value);
  assert.equal(normalizeLanEndpoint('192.168.0.2'), 'http://192.168.0.2:2568');
  for (const value of [
    'https://192.168.0.1:2568',
    '192.168.0.1:80',
    '8.8.8.8:2568',
    'example.com:2568',
    '192.168.0.1:2568/path',
    'user@192.168.0.1:2568',
    '127.1:2568',
    '0177.0.0.1:2568',
    '127.0.0.1:2568#secret',
    '172.32.0.1:2568',
    '[::1]:2568',
    '192.168.0.1:99999',
  ])
    assert.equal(normalizeLanEndpoint(value), null, value);
  assert(privateIPv4('172.31.5.8'));
  assert(!privateIPv4('172.15.5.8'));
  assert(!validLanPort(0));
  assert(validLanPort(2568));
});
test('desktop static protocol contains decoded paths and restricts navigation/external links', () => {
  const root = process.platform === 'win32' ? 'C:\\game\\client' : '/game/client';
  assert(staticPath(root, 'grave://app/assets/game.js')?.endsWith('game.js'));
  for (const address of [
    'https://app/assets/game.js',
    'grave://evil/index.html',
    'grave://app/assets/%2e%2e%2f%2e%2e%2fsecret',
    'grave://app/assets/%5c..%5csecret',
    'grave://app/%00',
    'grave://user@app/index.html',
    'grave://app:555/index.html',
  ])
    assert.equal(staticPath(root, address), null, address);
  assert(localDocument('grave://app/index.html'));
  assert(!localDocument('grave://evil/index.html'));
  assert(!localDocument('grave://app/assets/a.js'));
  assert(
    allowedExternal(
      'https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki',
    ),
  );
  assert(
    !allowedExternal(
      'https://github.com.evil.test/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki',
    ),
  );
  assert(contentSecurityPolicy.includes("object-src 'none'"));
  assert(!contentSecurityPolicy.includes('unsafe-eval'));
});
test('desktop/LAN messages cover every authored locale with matching nonempty keys', () => {
  assert.deepEqual(Object.keys(messages).sort(), catalog.locales.map((l) => l.id).sort());
  for (const row of Object.values(messages)) {
    assert.deepEqual(Object.keys(row).sort(), Object.keys(messages.en).sort());
    assert(Object.values(row).every((t) => t.trim()));
  }
  const source = readFileSync(new URL('../src/desktop/main.ts', import.meta.url), 'utf8');
  assert(source.includes('sandbox:true') || source.includes('sandbox: true'));
  assert(source.includes('contextIsolation:true') || source.includes('contextIsolation: true'));
  assert(source.includes('nodeIntegration:false') || source.includes('nodeIntegration: false'));
  assert(
    source.includes('event.senderFrame!==main.webContents.mainFrame') ||
      source.includes('event.senderFrame !== main.webContents.mainFrame'),
  );
});
const waitMessage = (child: ChildProcess) =>
  new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('LAN child timeout')), 8000);
    child.once('message', (m) => {
      clearTimeout(timer);
      resolve(m);
    });
    child.once('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
test(
  'explicit LAN authority supports real clients and graceful stop, and preserves an occupied port',
  { timeout: 25000 },
  async () => {
    const held = createServer();
    held.listen(0, '0.0.0.0');
    await once(held, 'listening');
    const address = held.address();
    assert(address && typeof address === 'object');
    const port = address.port;
    const occupied = fork('src/desktop/lan-child.ts', [String(port)], {
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    try {
      const message = await waitMessage(occupied);
      assert.deepEqual(message, { type: 'error', key: 'ui.errorPort' });
      assert(held.listening);
    } finally {
      occupied.kill();
      await new Promise<void>((r) => held.close(() => r()));
    }
    const child = fork('src/desktop/lan-child.ts', [String(port)], {
      execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    const client = new Session('http://127.0.0.1:' + port);
    try {
      assert.equal((await waitMessage(child)).type, 'ready');
      const response = await fetch('http://127.0.0.1:' + port + '/api/health', {
        headers: { Origin: 'grave://app' },
      });
      assert.equal(response.headers.get('access-control-allow-origin'), 'grave://app');
      assert.equal((await response.json()).protocolVersion, PROTOCOL);
      await client.connect({
        name: 'LAN tester',
        classId: 'mage',
        mode: 'short',
        difficulty: 'hard',
      });
      assert.equal(client.view!.players[0].classId, 'mage');
      client.start();
      const end = Date.now() + 5000;
      while (client.view?.phase !== 'combat') {
        if (Date.now() > end) throw Error('LAN combat timeout');
        await new Promise((r) => setTimeout(r, 20));
      }
      assert(client.view!.boss.health > 0);
      assert.equal(client.view!.run.difficulty, 'hard');
      await client.close();
      const exited = once(child, 'exit');
      child.send({ type: 'stop' });
      await exited;
      await assert.rejects(fetch('http://127.0.0.1:' + port + '/api/health'));
    } finally {
      await client.close();
      if (child.exitCode === null) child.kill();
    }
  },
);
