import type { CosmeticId } from '../profile.ts';
const base = 'M7 23h18l-4-5v-6a5 5 0 0 0-10 0v6z M13 27h6 M16 5V3';
const marks: Record<CosmeticId, string> = {
  'field-mark': 'M10 9l6-5 6 5v14l-6 5-6-5z M16 10v12',
  'bronze-bell': base,
  'silver-bell': base + ' M4 20l-1-5 M28 20l1-5 M5 11l2-4 M27 11l-2-4',
  'gilded-bell': base + ' M4 26V11 M28 26V11 M13 16l3-3 3 3-3 3z',
  'vigil-crown': base + ' M4 10V3l5 4 7-6 7 6 5-4v7 M4 28h6 M22 28h6',
  'remembered-bell':
    'M7 23h7l-2-4 3-5-2-5a5 5 0 0 0-2 4v5z M19 8a5 5 0 0 1 2 4v6l4 5h-7 M13 27h6 M16 3V1 M3 8l4 2 M29 8l-4 2',
};
export function insignia(id: CosmeticId) {
  return `<svg class="profile-insignia ${id}" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${marks[id] ?? marks['field-mark']}"/></svg>`;
}
