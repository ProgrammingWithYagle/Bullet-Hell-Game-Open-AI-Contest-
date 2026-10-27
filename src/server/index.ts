import { createGameServer } from './service.ts';
import { pathToFileURL } from 'node:url';
import { PROTOCOL, CONTENT_REVISION } from '../shared/protocol.ts';
export { createGameServer };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server } = createGameServer({audience:process.env.GRAVE_TESTING_SERVER==='1'?'testing':'public'});
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
