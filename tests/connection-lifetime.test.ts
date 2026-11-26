import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createServer, type RequestListener} from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Session} from '../src/client/session.ts';
import {CONTENT_REVISION, PROTOCOL} from '../src/shared/protocol.ts';
import {untilAborted} from '../src/client/request-lifetime.ts';
import {createGameServer} from '../src/server/index.ts';
import {liveRooms} from '../src/server/GraveRoom.ts';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {connectionClarityMessages} = await import(pathToFileURL(resolve('locales/source/connection-clarity.mjs')).href);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(check: () => boolean, ms = 2000) {
 const deadline = Date.now() + ms;
 while (!check()) { if (Date.now() > deadline) throw Error('Timed out'); await sleep(10); }
}
const health = {protocolVersion: PROTOCOL, contentRevision: CONTENT_REVISION, audience: 'public'};
async function fixture(t: TestContext, handler: RequestListener) {
 const sessions: Session[] = [], server = createServer(handler);
 await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
 const address = server.address(); assert(address && typeof address !== 'string');
 const endpoint = 'http://127.0.0.1:' + address.port;
 t.after(async () => { await Promise.allSettled(sessions.map(s => s.close())); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
 return {endpoint, session: () => {const s = new Session(endpoint); sessions.push(s); return s;}};
}
const abort = (error: unknown) => error instanceof Error && error.name === 'AbortError';
const opts = {name: 'Mara', classId: 'soldier' as const, mode: 'short' as const, difficulty: 'normal'};

for (const stage of ['health', 'rooms', 'code'] as const)
test(`leaving during delayed ${stage} aborts actual HTTP and settles the search promptly`, {timeout: 5000}, async t => {
 let pending = false, disconnected = false, requests = 0;
 const api = await fixture(t, (request, response) => {
  requests++;
  if ((stage === 'health' && request.url === '/api/health') || (stage === 'rooms' && request.url === '/api/rooms') || (stage === 'code' && request.url?.startsWith('/api/rooms/code/'))) {
   pending = true; response.on('close', () => {disconnected = true;}); return;
  }
  response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(health));
 });
 const s = api.session(), result = stage === 'code' ? s.lookupRoom('ABCDEF') : s.rooms();
 const rejection = assert.rejects(result, abort);
 await until(() => pending); const before = requests;
 await s.close(); await Promise.race([rejection, sleep(1000).then(() => {throw Error('Cancellation did not settle');})]);
 await until(() => disconnected, 1000);
 assert(s.signal.aborted); await sleep(40); assert.equal(requests, before);
});

test('leaving during server startup cancels the retry delay and makes no later request', {timeout: 4000}, async t => {
 let requests = 0;
 const api = await fixture(t, (_request, response) => {requests++; response.writeHead(503).end();});
 const s = api.session(), rejection = assert.rejects(s.rooms(), abort);
 await until(() => requests === 1); await sleep(25); await s.close(); await rejection;
 await sleep(80); assert.equal(requests, 1);
});

for (const delayedPoll of [false, true])
test(`cancelled admission releases the known ticket once${delayedPoll ? ' during a pending poll' : ' during its retry delay'}`, {timeout: 5000}, async t => {
 let queued = false, polling = false, deletes = 0;
 const id = randomUUID();
 const api = await fixture(t, (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/health') return response.end(JSON.stringify(health));
  if (request.method === 'DELETE') {deletes++; return response.end('{}');}
  if (request.method === 'GET') {polling = true; return;}
  queued = true; response.end(JSON.stringify({id, state: 'queued', position: 1}));
 });
 const s = api.session(), rejection = assert.rejects(s.connect(opts), abort);
 await until(() => queued && s.queuePosition === 1 && (!delayedPoll || polling));
 await s.close(); await rejection; await s.close();
 assert.equal(deletes, 1); assert.equal(s.room, undefined);
});

test('room discovery keeps version, rate-limit and server errors distinct from an empty list', {timeout: 6000}, async t => {
 let version = PROTOCOL - 1, status = 200, listRequests = 0;
 const api = await fixture(t, (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/health') return response.end(JSON.stringify({...health, protocolVersion: version}));
  listRequests++; response.writeHead(status).end(status === 200 ? '[]' : '{}');
 });
 await assert.rejects(api.session().rooms(), /ui.errorVersion/); assert.equal(listRequests, 0);
 version = PROTOCOL; status = 429; await assert.rejects(api.session().rooms(), /ui.errorRate/);
 status = 503; await assert.rejects(api.session().rooms(), /ui.errorServer/);
 status = 200; const s = api.session(), notices: string[] = []; s.onStatus = key => notices.push(key);
 assert.deepEqual(await s.rooms(), []); assert.deepEqual(notices, ['ui.serverWaking', 'ui.searchingRooms']);
});

test('code lookup distinguishes missing, throttled and failing servers', {timeout: 5000}, async t => {
 let status = 404;
 const api = await fixture(t, (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/health') return response.end(JSON.stringify(health));
  response.writeHead(status).end('{}');
 });
 for (const [code, key] of [[404, 'ui.errorCode'], [429, 'ui.errorRate'], [503, 'ui.errorServer']] as const) {
  status = code; await assert.rejects(api.session().lookupRoom('ABCDEF'), new RegExp(key));
 }
});

test('an incompatible HTTP address and startup throttling fail promptly with useful errors', {timeout: 5000}, async t => {
 let body = '<html>A different website</html>', status = 200;
 const api = await fixture(t, (_request,response) => {response.writeHead(status).end(body);});
 await assert.rejects(api.session().rooms(), /ui.errorServerAddress/);
 body = '{}'; await assert.rejects(api.session().rooms(), /ui.errorServerAddress/);
 status = 429; await assert.rejects(api.session().rooms(), /ui.errorRate/);
});

test('Cancel aborts the actual SDK matchmaking POST and releases admission', {timeout: 5000}, async t => {
 let pending = false, disconnected = false, deletes = 0;
 const api = await fixture(t, (request,response) => {
  response.setHeader('Content-Type','application/json');
  if(request.url==='/api/health')return response.end(JSON.stringify(health));
  if(request.method==='DELETE'){deletes++;return response.end('{}');}
  if(request.url==='/api/admission/create')return response.end(JSON.stringify({id:randomUUID(),state:'ready'}));
  pending=true;response.on('close',()=>{disconnected=true;});
 });
 const s=api.session(),rejection=assert.rejects(s.connect(opts),abort);
 await until(()=>pending);await s.close();await rejection;await until(()=>disconnected);
 assert.equal(deletes,1);assert.equal(s.room,undefined);
});

test('Cancel closes an actual SDK socket whose server never sends the room handshake', {timeout: 6000}, async t => {
 const sockets = new Set<import('node:stream').Duplex>();let connected = false, closed = false, deletes = 0, unexpectedSocketError: Error | undefined;
 const server = createServer((request,response)=>{
  response.setHeader('Content-Type','application/json');
  if(request.url==='/api/health')return response.end(JSON.stringify(health));
  if(request.method==='DELETE'){deletes++;return response.end('{}');}
  if(request.url==='/api/admission/create')return response.end(JSON.stringify({id:randomUUID(),state:'ready'}));
  response.end(JSON.stringify({name:'grave',roomId:'fixture-room',processId:'fixture-process',sessionId:'fixture-peer'}));
 });
 server.on('upgrade',(request,socket)=>{
  sockets.add(socket);
  const accept=createHash('sha1').update(request.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  connected=true;
  socket.on('data',data=>{if((data[0]&15)===8)socket.end(Buffer.from([0x88,0x02,0x0f,0xa0]));});
  socket.on('error',error=>{if((error as NodeJS.ErrnoException).code!=='ECONNRESET')unexpectedSocketError=error;});
  socket.on('close',()=>{closed=true;sockets.delete(socket);});
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert(address&&typeof address!=='string');
 const s=new Session('http://127.0.0.1:'+address.port);
 t.after(async()=>{await s.close();for(const socket of sockets)socket.destroy();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
 const rejection=assert.rejects(s.connect(opts),abort);await until(()=>connected);await s.close();await rejection;await until(()=>closed);
 assert.equal(deletes,1);assert.equal(s.room,undefined);assert.equal(unexpectedSocketError,undefined);
});

test('a room that closed after listing gives useful guidance and releases its join ticket', {timeout: 10000}, async () => {
 const {server,httpServer}=createGameServer();await server.listen(0,'127.0.0.1');const address=httpServer.address();assert(address&&typeof address!=='string');
 const endpoint='http://127.0.0.1:'+address.port,owner=new Session(endpoint),guest=new Session(endpoint);
 try {
  await owner.connect(opts);const roomId=owner.room!.roomId;await owner.close();await until(()=>!liveRooms.has(roomId));
  await assert.rejects(guest.connect(opts,{roomId}),/ui.errorRoomUnavailable/);
  const metrics=await (await fetch(endpoint+'/api/health')).json();assert.equal(metrics.capacity.queued,0);assert.equal(metrics.capacity.offeredSlots,0);
 } finally {await Promise.allSettled([owner.close(),guest.close()]);await server.gracefullyShutdown(false);}
});

test('closing offline startup settles before its first view and suppresses late worker events', {timeout: 3000}, async t => {
 const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker'), workers: FakeWorker[] = [];
 class FakeWorker {
  onmessage?: (event: {data: unknown}) => void; onerror?: () => void; terminated = 0;
  constructor() {workers.push(this);} postMessage() {} terminate() {this.terminated++;}
 }
 Object.defineProperty(globalThis, 'Worker', {configurable: true, value: FakeWorker});
 t.after(() => {if (descriptor) Object.defineProperty(globalThis, 'Worker', descriptor); else Reflect.deleteProperty(globalThis, 'Worker');});
 const s = new Session(); let events = 0; s.onEvents = () => {events++;};
 const rejection = assert.rejects(s.offline(opts), abort); await s.close(); await rejection;
 workers[0].onmessage?.({data: {type: 'events', events: []}}); assert.equal(events, 0); assert.equal(workers[0].terminated, 1);
 await assert.rejects(s.offline(opts), abort); assert.equal(workers.length, 1);
});

test('an unresolved asset task can be cancelled without accepting its late completion', async () => {
 const controller = new AbortController(); let complete!: (value: string) => void;
 const pending = untilAborted(new Promise<string>(resolve => {complete = resolve;}), controller.signal);
 const rejected = assert.rejects(pending, abort); controller.abort(new DOMException('Cancelled', 'AbortError'));
 await rejected; complete('late'); await Promise.resolve();
 await assert.rejects(untilAborted(Promise.resolve('already closed'), controller.signal), abort);
});

test('all fifteen catalogs contain source-backed plain connection progress and a Cancel action', () => {
 const catalog = JSON.parse(readFileSync('content/catalog.json', 'utf8'));
 assert.equal(catalog.locales.length, 15);
 for (const {id} of catalog.locales) {
  const messages = JSON.parse(readFileSync('locales/' + id + '.json', 'utf8')).messages;
  for (const [key, value] of Object.entries(connectionClarityMessages(id))) assert.equal(messages[key], value);
  assert.equal(typeof messages['ui.cancel'], 'string');
 }
});
