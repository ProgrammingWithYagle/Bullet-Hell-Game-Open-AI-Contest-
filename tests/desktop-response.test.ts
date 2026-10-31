import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { localFileResponse } from '../src/desktop/static-response.ts';
import { contentSecurityPolicy } from '../src/desktop/security.ts';

test('packaged font responses stream exact bytes from Windows paths beyond 260 characters and keep HEAD empty', async t => {
  fs.mkdirSync('output', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('output', 'long-package-path-'));
  const directories = [root];
  while (directories.at(-1)!.length < 290) {
    const next = path.join(directories.at(-1)!, 'a-long-but-valid-package-directory');
    fs.mkdirSync(next); directories.push(next);
  }
  const file = path.join(directories.at(-1)!, 'packaged-font.woff2');
  t.after(() => { fs.unlinkSync(file); for (const directory of directories.reverse()) fs.rmdirSync(directory); });
  const bytes = Buffer.from([0, 17, 23, 255, 128, 0, 99]); fs.writeFileSync(file, bytes);
  assert(file.length > 260);
  const response = localFileResponse(file);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'font/woff2');
  assert.equal(response.headers.get('content-length'), String(bytes.length));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const head = localFileResponse(file, 'HEAD');
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.equal(head.headers.get('content-length'), String(bytes.length));
});

test('packaged module and stylesheet responses retain valid MIME types, CSP and nosniff', async t => {
  fs.mkdirSync('output', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('output', 'package-response-'));
  const members = [['app.js', 'text/javascript; charset=utf-8'], ['ui.css', 'text/css; charset=utf-8'], ['data.json', 'application/json']];
  t.after(() => { for (const [name] of members) fs.unlinkSync(path.join(root, name)); fs.rmdirSync(root); });
  for (const [name, mime] of members) {
    const file = path.join(root, name), content = 'local bytes for ' + name; fs.writeFileSync(file, content);
    const response = localFileResponse(file);
    assert.equal(response.headers.get('content-type'), mime);
    assert.equal(response.headers.get('content-security-policy'), contentSecurityPolicy);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await response.text(), content);
  }
});
