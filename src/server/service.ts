import { implementedBossIds } from '../shared/game.ts';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'node:http';
import { GraveRoom, roomCodes, liveRooms } from './GraveRoom.ts';
import { capacity } from './capacity.ts';
import {
  CONTENT_REVISION,
  PROTOCOL,
  implementedClassIds,
  implementedModeIds,
} from '../shared/protocol.ts';
import type { RunJournal } from './run-journal.ts';
import { TeamRun } from './team-run.ts';
import type { TeamRecordStore, BoardFilter } from './team-record-store.ts';
import type { TeamRecordStatus } from '../shared/team-records.ts';
export function createGameServer(
  options: { createRunJournal?: () => RunJournal; clientOrigins?: string[]; audience?: 'testing'|'public'; records?: TeamRecordStore } = {},
) {
  const startedAt = new Date().toISOString();
  const origins = new Set(
    options.clientOrigins ??
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
  // One public IP can represent a full group. Failed code guesses have their own budget.
  const permit = (key: string, limit: number) => {
    const now = Date.now();
    let entry = requests.get(key);
    if (!entry || entry.reset <= now) {
      entry = { reset: now + 60000, count: 0 };
      requests.set(key, entry);
    }
    entry.count++;
    if (requests.size > 10000)
      for (const [id, old] of requests) if (old.reset <= now) requests.delete(id);
    return entry.count <= limit;
  };
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
          prototype: 'grave-accord-development',
          playable: {
            bosses: implementedBossIds.length,
            classes: implementedClassIds.length,
            modes: [...implementedModeIds],
          },
          protocolVersion: PROTOCOL,
          contentRevision: CONTENT_REVISION,
          practiceOnly: true,
          audience: options.audience??'testing',
          teamRecords: { available: Boolean(options.records), scope: 'server', persistent: options.records?.persistent ?? false },
          sourceCommit: process.env.RENDER_GIT_COMMIT ?? null,
          capacity: capacity.summary(),
        }),
      );
      app.use('/api/leaderboards', (req, res, next) => {
        if (!permit('records:' + (req.ip ?? 'local'), 360)) { res.setHeader('Retry-After','60'); res.status(429).json({ error:'rateLimited' }); return; }
        next();
      });
      const boardRead = (read: () => unknown, res: import('express').Response) => {
        res.setHeader('Cache-Control', 'no-store');
        if (!options.records) { res.status(503).json({ error: 'boardsUnavailable' }); return; }
        try {
          const result = read();
          if (!result) res.status(404).json({ error: 'recordNotFound' });
          else res.json(result);
        } catch (error) {
          res.status(error instanceof Error && error.name === 'BoardQueryError' ? 400 : 503)
            .json({ error: error instanceof Error && error.name === 'BoardQueryError' ? 'invalidBoardQuery' : 'boardsUnavailable' });
        }
      };
      app.get('/api/leaderboards', (req, res) => boardRead(() => {
        const keys = ['mode','difficulty','sizeBand','offset','limit','week'];
        if (Object.keys(req.query).some(k => !keys.includes(k))
          || Object.values(req.query).some(v => typeof v !== 'string')) {
          const error = Error('Invalid query'); error.name = 'BoardQueryError'; throw error;
        }
        return options.records!.board({ mode: (req.query.mode ?? 'short') as BoardFilter['mode'],
          difficulty: String(req.query.difficulty ?? 'normal'), sizeBand: String(req.query.sizeBand ?? 'solo'),
          offset: req.query.offset === undefined ? 0 : Number(req.query.offset),
          limit: req.query.limit === undefined ? 10 : Number(req.query.limit),
          week: req.query.week as string | undefined });
      }, res));
      app.get('/api/leaderboards/:runId', (req, res) => boardRead(() => {
        if (Object.keys(req.query).some(k => k !== 'offset') || Object.values(req.query).some(v => typeof v !== 'string')) {
          const error = Error('Invalid query'); error.name = 'BoardQueryError'; throw error;
        }
        return options.records!.roster(req.params.runId, req.query.offset === undefined ? 0 : Number(req.query.offset));
      }, res));
      app.post('/api/leaderboards', (_req, res) => { res.status(405).json({ error: 'serverResultsOnly' }); });
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
        if (!permit('admission:' + (req.ip ?? 'local'), 120)) {
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
              name: r.game.players.get(r.state.owner)?.name??'',
              mode: r.metadata.mode,
              difficulty: r.metadata.difficulty,
              players: r.clients.length,
              maximumPlayers: Math.min(r.maxClients, capacity.limit),
              phase: r.game.phase,
              hasPassword:r.hasPassword,
              contentRevision: CONTENT_REVISION,
            })),
        ),
      );
      app.get('/api/rooms/code/:code', (req, res) => {
        const code = req.params.code.toUpperCase();
        const roomId = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code) ? roomCodes.get(code) : undefined;
        const known = Boolean(roomId);
        if (!permit((known ? 'known-code:' : 'unknown-code:') + (req.ip ?? 'local'), known ? 120 : 30)) {
          res.setHeader('Retry-After', '60');
          res.status(429).json({ error: 'rateLimited' });
          return;
        }
        if (!roomId) {
          res.status(404).json({ error: 'invalidCode' });
          return;
        }
        res.json({ roomId,hasPassword:liveRooms.get(roomId)?.hasPassword??false });
      });
    },
  });
  class ServerRoom extends GraveRoom {
    protected override isTestingServer(){return options.audience!=='public';}
    protected override createRunJournal(){return options.createRunJournal?.();}
    protected override createTeamRun(changed: (status: TeamRecordStatus) => void) {
      return options.records && options.audience === 'public' ? new TeamRun(options.records, changed) : undefined;
    }
  }
  server.define('grave', ServerRoom).filterBy(['mode', 'difficulty', 'contentRevision']);
  return { server, httpServer };
}
