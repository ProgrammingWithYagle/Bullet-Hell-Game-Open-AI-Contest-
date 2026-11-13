export const DEFAULT_LAN_PORT = 2568;
export const validLanPort = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1024 && value <= 65535;
export function privateIPv4(host: string) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
  const p = host.split('.').map(Number);
  if (p.some((n, i) => n > 255 || String(n) !== host.split('.')[i])) return false;
  return (
    p[0] === 10 ||
    p[0] === 127 ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31)
  );
}
export function normalizeLanEndpoint(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 200) return null;
  const raw = value.trim();
  if (!raw || /[\\?#@]/.test(raw)) return null;
  try {
    const url = new URL(raw.includes('://') ? raw : 'http://' + raw);
    if (
      url.protocol !== 'http:' ||
      url.pathname !== '/' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    if (url.hostname !== 'localhost' && !privateIPv4(url.hostname)) return null;
    const authority = raw.replace(/^http:\/\//, '').replace(/\/$/, '');
    // Reject URL's abbreviated/octal IP normalization; only an explicit local address is accepted.
    if (authority.split(':')[0] !== url.hostname) return null;
    const port = authority.includes(':') ? Number(authority.split(':')[1]) : DEFAULT_LAN_PORT;
    if (!validLanPort(port)) return null;
    return 'http://' + url.hostname + ':' + port;
  } catch {
    return null;
  }
}
export type LanState = { active: boolean; port: number | null; endpoints: string[] };
export type DesktopBridge = {
  platform: 'windows';
  lanStatus(): Promise<LanState>;
  startLan(port: number): Promise<{ ok: true; state: LanState } | { ok: false; key: string }>;
  stopLan(): Promise<LanState>;
};
