// Deliberately isolated test fixture: loopback only, test keys through inherited
// environment, synthetic clock through IPC, and no deployed game/HTTP test route.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { runService } from '../../src/server/run-service.ts';
import { openLedger } from './sqlite-ledger.ts';
const path = process.env.GRAVE_TEST_DB;
const writerKey = process.env.GRAVE_TEST_WRITE_KEY ?? '',
  boundaryKey = process.env.GRAVE_TEST_BOUNDARY_KEY ?? '';
if (!path || !/^[a-f0-9]{64}$/.test(writerKey) || !/^[a-f0-9]{64}$/.test(boundaryKey))
  throw Error('Missing isolated ledger test configuration');
const { sqlite, db } = openLedger(path);
let now = Number(process.env.GRAVE_TEST_NOW);
if (!Number.isSafeInteger(now)) throw Error('Invalid test clock');
const handler = runService(db, Buffer.from(boundaryKey, 'hex'), {
  test: { key: Buffer.from(writerKey, 'hex'), serverIds: ['test'] },
});
const server = createServer(async (req, res) => {
  try {
    const response = await handler(
      new Request('http://127.0.0.1' + req.url, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method === 'GET' ? undefined : Readable.toWeb(req),
        duplex: 'half',
      } as RequestInit),
      now,
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end('{}');
  }
});
process.on('message', (message) => {
  if (
    message &&
    typeof message === 'object' &&
    'now' in message &&
    Number.isSafeInteger(message.now)
  ) {
    now = message.now as number;
    process.send?.({ clock: now });
  }
});
process.on('SIGTERM', () =>
  server.close(() => {
    sqlite.close();
    process.exit(0);
  }),
);
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address === 'object') process.send?.({ port: address.port });
});
