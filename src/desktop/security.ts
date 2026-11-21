import { resolve, relative, isAbsolute } from 'node:path';
export const APP_ORIGIN = 'grave://app';
export function localDocument(url: string) {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'grave:' &&
      u.hostname === 'app' &&
      !u.port &&
      !u.username &&
      !u.password &&
      ['/', '/index.html'].includes(u.pathname) &&
      !u.search
    );
  } catch {
    return false;
  }
}
export function staticPath(root: string, address: string) {
  try {
    const url = new URL(address);
    if (
      url.protocol !== 'grave:' ||
      url.hostname !== 'app' ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    const name = decodeURIComponent(url.pathname);
    if (
      name.includes('\0') ||
      name.includes('\\') ||
      name.split('/').some((p) => p === '..' || p === '.') ||
      name.startsWith('//')
    )
      return null;
    const target = resolve(root, '.' + (name === '/' ? '/index.html' : name)),
      part = relative(root, target);
    return !part.startsWith('..') && !isAbsolute(part) ? target : null;
  } catch {
    return null;
  }
}
export function allowedExternal(address: string) {
  try {
    const u = new URL(address);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      u.hostname === 'github.com' &&
      (u.pathname === '/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-' ||
        u.pathname.startsWith('/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/'))
    );
  } catch {
    return false;
  }
}
export const contentSecurityPolicy =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self' https: wss: http: ws:; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'";
