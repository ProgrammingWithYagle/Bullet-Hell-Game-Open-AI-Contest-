import { createGameServer } from './service.ts';
import { pathToFileURL } from 'node:url';
import { PROTOCOL, CONTENT_REVISION } from '../shared/protocol.ts';
import { TeamRecordStore } from './team-record-store.ts';
export { createGameServer };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let records: TeamRecordStore | undefined;
  try {
    if (process.env.GRAVE_RECORDS_DB !== 'disabled') records = new TeamRecordStore(process.env.GRAVE_RECORDS_DB ?? 'data/team-records.sqlite');
  } catch { console.error(JSON.stringify({ teamRecords: 'unavailable' })); }
  const { server, httpServer } = createGameServer({audience:process.env.GRAVE_TESTING_SERVER==='1'?'testing':'public', records});
  httpServer.once('close', () => records?.close());
  const port = Number(process.env.PORT ?? 2567),
    host = process.env.HOST ?? '127.0.0.1';
  await server.listen(port, host);
  console.log(
    JSON.stringify({
      listening: host + ':' + port,
      protocol: PROTOCOL,
      contentRevision: CONTENT_REVISION,
      practiceOnly: true,
    }),
  );
}
