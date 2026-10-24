import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { GraveRoom, privateRooms, liveRooms } from './GraveRoom.ts';
import { capacity } from './capacity.ts';
import { CONTENT_REVISION, PROTOCOL } from '../shared/protocol.ts';
import type { RunJournal } from './run-journal.ts';
export function createGameServer(options: { createRunJournal?: () => RunJournal } = {}) {
  const startedAt = new Date().toISOString();
  const origins = new Set(
    (process.env.CLIENT_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((s) => s.trim()),
  );
  const httpServer = createServer();
  const transport = new WebSocketTransport({
    server: httpServer,
    maxPayload: 16384,
    beforeUpgrade: (request) => {
      const origin = request.headers.get('origin');
      if (origin && !origins.has(origin))
        return new Response('Origin not permitted', { status: 403 });
    },
  });
  const requests = new Map<string, { reset: number; count: number }>();
  const server = new Server({
    transport,
    greet: false,
    gracefullyShutdown: false,
    express: (app) => {
      app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && origins.has(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.sendStatus(204);
          return;
        }
        next();
      });
      app.get('/api/health', (_req, res) =>
        res.json({
          status: 'ok',
          startedAt,
          uptimeSeconds: process.uptime(),
          prototype: 'three-class-five-boss-practice',
          protocolVersion: PROTOCOL,
          contentRevision: CONTENT_REVISION,
          practiceOnly: true,
          sourceCommit: process.env.RENDER_GIT_COMMIT ?? null,
          capacity: capacity.summary(),
        }),
      );
      // Aggregate operational data only: no names, private codes or room IDs.
      // A short cache bounds percentile work when multiple clients inspect it.
      let metricsAt = 0;
      let metricsBody: object = {};
      app.get('/api/metrics', (_req, res) => {
        if (Date.now() - metricsAt >= 1000) {
          const rooms = [...liveRooms.values()];
          const samples = rooms.flatMap((r) => r.telemetry.ticks.slice(-600)).sort((a, b) => a - b);
          metricsBody = {
            measuredAt: new Date().toISOString(),
            protocolVersion: PROTOCOL,
            sourceCommit: process.env.RENDER_GIT_COMMIT ?? null,
            uptimeSeconds: process.uptime(),
            processMemory: process.memoryUsage(),
            rooms: rooms.length,
            connections: rooms.reduce((n, r) => n + r.clients.length, 0),
            activePlayers: rooms.reduce(
              (n, r) =>
                n +
                [...r.game.players.values()].filter((p) => p.connected && p.status === 'active')
                  .length,
              0,
            ),
            hostiles: rooms.reduce(
              (n, r) => n + [...r.game.shots.values()].filter((s) => s.owner === 'hostile').length,
              0,
            ),
            encodedOutboundBytes: rooms.reduce((n, r) => n + r.telemetry.encodedOutboundBytes, 0),
            acceptedInputs: rooms.reduce((n, r) => n + r.telemetry.acceptedInputs, 0),
            rejectedInputs: rooms.reduce((n, r) => n + r.telemetry.rejectedInputs, 0),
            tickWindow: {
              maximumSamplesPerRoom: 600,
              samples: samples.length,
              p99Ms: samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.99))] ?? 0,
              maxMs: samples.at(-1) ?? 0,
            },
            capacity: capacity.summary(),
          };
          metricsAt = Date.now();
        }
        res.setHeader('Cache-Control', 'no-store');
        res.json(metricsBody);
      });
      app.post('/api/admission/:kind', (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        if (!['create', 'join'].includes(req.params.kind)) {
          res.status(400).json({ error: 'invalidRequest' });
          return;
        }
        const key = 'admission:' + (req.ip ?? 'local'),
          now = Date.now();
        let entry = requests.get(key);
        if (!entry || entry.reset < now) {
          entry = { reset: now + 60000, count: 0 };
          requests.set(key, entry);
        }
        if (++entry.count > 60) {
          res.setHeader('Retry-After', '60');
          res.status(429).json({ error: 'rateLimited' });
          return;
        }
        try {
          res.json(capacity.enqueue(req.params.kind as 'create' | 'join'));
        } catch {
          res.setHeader('Retry-After', '5');
          res.status(503).json({ error: 'queueFull' });
        }
      });
      app.get('/api/admission/:id', (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        const ticket = capacity.admission(req.params.id);
        if (!ticket) {
          res.status(404).json({ error: 'expiredAdmission' });
          return;
        }
        res.json(ticket);
      });
      app.delete('/api/admission/:id', (req, res) => {
        capacity.cancelAdmission(req.params.id);
        res.sendStatus(204);
      });
      app.get('/api/rooms', (_req, res) =>
        res.json(
          [...liveRooms.values()]
            .filter((r) => !r.privateCode)
            .map((r) => ({
              roomId: r.roomId,
              name: 'Gatehouse Vigil',
              mode: r.metadata.mode,
              difficulty: r.metadata.difficulty,
              players: r.clients.length,
              maximumPlayers: Math.min(r.maxClients, capacity.limit),
              phase: r.game.phase,
              contentRevision: CONTENT_REVISION,
            })),
        ),
      );
      app.get('/api/rooms/code/:code', (req, res) => {
        const now = Date.now(),
          key = req.ip ?? 'local';
        let entry = requests.get(key);
        if (!entry || entry.reset < now) {
          entry = { reset: now + 60000, count: 0 };
          requests.set(key, entry);
        }
        if (++entry.count > 30) {
          res.setHeader('Retry-After', '60');
          res.status(429).json({ error: 'rateLimited' });
          return;
        }
        if (requests.size > 10000)
          for (const [id, slot] of requests) if (slot.reset < now) requests.delete(id);
        const code = req.params.code.toUpperCase();
        if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) {
          res.status(404).json({ error: 'invalidCode' });
          return;
        }
        const roomId = privateRooms.get(code);
        if (!roomId) {
          res.status(404).json({ error: 'invalidCode' });
          return;
        }
        res.json({ roomId });
      });
    },
  });
  const ServerRoom = options.createRunJournal
    ? class extends GraveRoom {
        protected override createRunJournal() {
          return options.createRunJournal!();
        }
      }
    : GraveRoom;
  server.define('grave', ServerRoom).filterBy(['mode', 'difficulty', 'contentRevision']);
  return { server, httpServer };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server } = createGameServer();
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
