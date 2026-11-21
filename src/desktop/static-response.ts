import { createReadStream, statSync } from 'node:fs';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { contentSecurityPolicy } from './security.ts';

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.wasm': 'application/wasm',
};

/** The caller has already resolved and contained the path within the packaged root. */
export function localFileResponse(file: string, method = 'GET') {
  const headers = new Headers({
    'Content-Type': mime[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': String(statSync(file).size),
    'Content-Security-Policy': contentSecurityPolicy,
    'X-Content-Type-Options': 'nosniff',
  });
  // Node handles long Windows paths; Chromium's file-URL loader does not handle
  // every extracted package path. Keep this stream on the Node side of the protocol.
  const body = method === 'HEAD' ? null : Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(body, { status: 200, headers });
}
