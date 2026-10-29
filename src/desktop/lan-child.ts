// Only the desktop main process launches this authority, following an explicit Host action.
import { createGameServer } from '../server/service.ts';
import { validLanPort } from '../shared/lan.ts';
import { BUILD_AUDIENCE } from '../client/build-audience.ts';
import { TeamRecordStore } from '../server/team-record-store.ts';
const port = Number(process.argv[2]);
type ParentPort = {
  postMessage(value: unknown): void;
  on(event: 'message', fn: (event: { data: { type: string } }) => void): void;
};
const parent = (process as NodeJS.Process & { parentPort?: ParentPort }).parentPort;
const send = (message: unknown) => (parent ? parent.postMessage(message) : process.send?.(message));
let closing = false;
async function start() {
  if (!validLanPort(port)) throw Error('invalidPort');
  let records: TeamRecordStore | undefined;
  try { records = new TeamRecordStore(process.argv[3] ?? ':memory:'); } catch { /* Room play remains available if storage cannot open. */ }
  const { server, httpServer } = createGameServer({ clientOrigins: ['grave://app'], audience: BUILD_AUDIENCE, records });
  const stop = async () => {
    if (closing) return;
    closing = true;
    await server.gracefullyShutdown(false);
    records?.close();
    process.exit(0);
  };
  parent?.on('message', (message) => {
    if (message.data?.type === 'stop') void stop();
  });
  process.on('message', (message: unknown) => {
    if ((message as { type?: string })?.type === 'stop') void stop();
  });
  process.on('disconnect', () => void stop());
  httpServer.once('error', (error: NodeJS.ErrnoException) => {
    send({ type: 'error', key: error.code === 'EADDRINUSE' ? 'ui.errorPort' : 'ui.errorServer' });
    setTimeout(() => process.exit(1), 25);
  });
  await server.listen(port, '0.0.0.0');
  send({ type: 'ready', port, practiceOnly: true });
}
start().catch((error: NodeJS.ErrnoException) => {
  send({ type: 'error', key: error.code === 'EADDRINUSE' ? 'ui.errorPort' : 'ui.errorServer' });
  setTimeout(() => process.exit(1), 25);
});
