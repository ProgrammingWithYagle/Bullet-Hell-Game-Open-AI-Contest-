import { CONTENT_REVISION, PROTOCOL } from '../shared/protocol.ts';
const KEY = 'ga-offline-boundary-v1';
export function savedBoundary(): unknown | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > 32768) return null;
    const value = JSON.parse(raw);
    return value?.contentRevision === CONTENT_REVISION &&
      value?.protocolVersion === PROTOCOL &&
      value?.practiceOnly === true
      ? value
      : null;
  } catch {
    return null;
  }
}
export function storeBoundary(value: unknown) {
  try {
    if (value === null) localStorage.removeItem(KEY);
    else {
      const raw = JSON.stringify(value);
      if (raw.length > 32768) throw Error('Save too large');
      localStorage.setItem(KEY, raw);
    }
    return true;
  } catch {
    return false;
  }
}
