export const defaultPreferences = () => ({
  autoFire: false,
  aimAssist: false,
  hitboxes: true,
  reduceMotion: false,
  highContrast: false,
  volume: 0.45,
  music: 0.3,
  textScale: 1,
});
export type Preferences = ReturnType<typeof defaultPreferences>;
const toggles = ['autoFire', 'aimAssist', 'hitboxes', 'reduceMotion', 'highContrast'] as const;
const ranges = ['volume', 'music', 'textScale'] as const;
export function validPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as Preferences;
  return (
    Object.keys(p).length === 8 &&
    toggles.every((k) => typeof p[k] === 'boolean') &&
    ranges.every(
      (k) =>
        Number.isFinite(p[k]) &&
        p[k] >= (k === 'textScale' ? 0.9 : 0) &&
        p[k] <= (k === 'textScale' ? 1.4 : 1),
    )
  );
}
export function migratePreferences(value: unknown): Preferences {
  const result = defaultPreferences(),
    p = value as Partial<Preferences> | null;
  for (const k of toggles) if (typeof p?.[k] === 'boolean') result[k] = p[k];
  for (const k of ranges)
    if (typeof p?.[k] === 'number' && Number.isFinite(p[k]))
      result[k] = Math.max(
        k === 'textScale' ? 0.9 : 0,
        Math.min(k === 'textScale' ? 1.4 : 1, p[k]),
      );
  return result;
}
