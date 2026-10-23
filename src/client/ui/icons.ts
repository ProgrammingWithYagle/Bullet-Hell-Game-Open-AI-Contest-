const paths: Record<string, string> = {
  weapon: 'M5 12h19l3 3h-8l-2 8h-6l1-8H5z M20 10h7 M7 8h9',
  soldier: 'M7 12c1-9 17-9 18 0l-3 2H9z M10 15v5l6 6 6-6v-5 M12 11h8',
  medic: 'M12 4h8v6l6 4v13H6V14l6-4z M12 20l8-6 M13 24l8-6',
  heavy: 'M4 10h21v6H4z M8 16v11h6V16 M25 11h4 M6 7v3 M12 7v3 M18 7v3',
  tank: 'M6 5h20v15L16 28 6 20z M10 10h12 M16 10v12',
  mage: 'M15 5l2 22 M6 13l20 6 M7 23L25 8 M16 2v4 M3 15h4 M25 19h4',
  engineer: 'M20 4l-6 6 2 5 5 1 7-6c2 9-5 13-10 11l-8 8-6-6 8-8C10 9 13 3 20 4z',
  assassin: 'M7 4l20 20-3 4L4 8z M15 21l6-6 M9 27l5-5',
  damage: 'M16 3l3 9 10 4-10 3-3 10-3-10-10-3 10-4z',
  rate: 'M5 10h12l-5-4 M5 16h20l-5-4 M5 22h12l-5-4',
  magazine: 'M10 4h12l-2 24H8z M11 10h8 M10 16h8 M10 22h7',
  reload: 'M25 12a10 10 0 1 0 0 9 M25 5v8h-8 M13 10v7l5 3',
  health: 'M16 27S3 19 4 11c1-7 9-8 12-2 3-6 11-5 12 2 1 8-12 16-12 16z',
  armor: 'M16 3l11 5-2 13-9 8-9-8L5 8z M11 15l4 5 8-10',
  critical: 'M5 5l7 7 M20 20l7 7 M5 27l7-7 M20 12l7-7 M9 16h14 M16 9v14',
  heal: 'M8 24l16-16 M7 18l7 7 M17 7l8 8 M5 26l3-1',
  ability: 'M16 3l4 8 8 5-8 4-4 9-4-9-8-4 8-5z M16 11v10',
  ultimate: 'M5 22l-1-12 7 5 5-11 5 11 7-5-1 12z M7 27h18',
  move: 'M4 17l7-7v5h9l-4-6 5-4 8 14-9 8-4-4 5-4H11v5z',
  rescue: 'M10 4l6 4 6-4 6 7-5 9-7 8-7-8-5-9z M10 13l6 5 6-5',
  pierce: 'M3 16h24 M20 9l8 7-8 7 M10 5v6 M10 21v6 M17 5v6 M17 21v6',
  extra: 'M6 25l10-19 10 19 M5 17h22 M10 25h12',
  tree: 'M16 3v8 M6 17v-6h20v6 M6 22v6 M26 22v6 M16 11v17',
  map: 'M3 7l9-4 9 4 8-4v22l-8 4-9-4-9 4z M12 3v22 M21 7v22',
  bell: 'M6 23h20l-4-5v-7a6 6 0 0 0-12 0v7z M13 27h6 M16 3V1',
  infinity: 'M16 16c-12-16-17 10-6 5L22 11c11-5 6 21-6 5z',
  check: 'M6 16l7 8L27 7',
  lock: 'M8 14h16v14H8z M11 14V8a5 5 0 0 1 10 0v6',
  play: 'M10 5l17 11-17 11z',
  coins: 'M6 10a10 5 0 1 0 20 0 10 5 0 1 0-20 0 M6 10v12c0 7 20 7 20 0V10 M6 16c0 7 20 7 20 0',
};
export function icon(key: string) {
  return `<svg class="ink-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[key] ?? paths.ability}"/></svg>`;
}
export function effectIcon(effects: Record<string, number | undefined>) {
  const keys = Object.keys(effects).filter(
    (k) => typeof effects[k] === 'number' && effects[k] !== 0,
  );
  for (const [pattern, key] of [
    [/^ultimate/, 'ultimate'],
    [/healOnHit/, 'heal'],
    [/critical/, 'critical'],
    [/extraShots/, 'extra'],
    [/pierce/, 'pierce'],
    [/rally|ability|cooldown|sigil|turret|barrier|veil|suppression/, 'ability'],
    [/revive|selfRevive/, 'rescue'],
    [/dodge|moveSpeed/, 'move'],
    [/armor/, 'armor'],
    [/Health|regeneration/, 'health'],
    [/magazine/, 'magazine'],
    [/reload/, 'reload'],
    [/fireRate/, 'rate'],
    [/weaponDamage/, 'damage'],
  ] as [RegExp, string][])
    if (keys.some((k) => pattern.test(k))) return key;
  return 'ability';
}
