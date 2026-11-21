import { escape as e } from './html.ts';

type Mode = { id: string; encounters: number | null; targetMinutes: number[] | null };
type Labels = {
  progression: string;
  fights: string;
  estimatedTime: string;
  minutes: string;
  noFinalFight: string;
  endlessTime: string;
  number: (value: number) => string;
};

/** A run's authored encounter count and time guide, independent of arena selection. */
export function modePreviewMarkup(mode: Mode, labels: Labels) {
  let route: string;
  if (mode.encounters === null) {
    route = '<path class="mode-track" d="M200 90C140 5 35 25 35 90s105 85 165 0S365 5 365 90 260 175 200 90Z"/><circle class="mode-stop" cx="35" cy="90" r="11"/><circle class="mode-stop" cx="200" cy="90" r="11"/><circle class="mode-stop" cx="365" cy="90" r="11"/><path class="mode-direction" d="m281 38 14 1-7 12 M105 139l-14-1 7-12"/>';
  } else {
    const count = mode.encounters;
    const columns = count <= 5 ? count : count <= 10 ? 5 : 8;
    const rows = Math.ceil(count / columns);
    const points = Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / columns), column = i % columns;
      return { x: columns === 1 ? 200 : 40 + (row % 2 ? columns - column - 1 : column) * 320 / (columns - 1), y: rows === 1 ? 90 : 50 + row * 80 };
    });
    route = `<path class="mode-track" d="${points.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' ')}"/>` +
      points.map((p, i) => `<g class="mode-stop ${i === count - 1 ? 'mode-finale' : ''}" data-encounter="${i + 1}" transform="translate(${p.x} ${p.y})"><circle r="${i === count - 1 ? 13 : 10}"/>${i === count - 1 ? '' : '<circle class="mode-stop-center" r="3"/>'}</g>`).join('');
  }
  const duration = mode.targetMinutes
    ? mode.targetMinutes.map(n => labels.number(n)).join('–') + ' ' + labels.minutes
    : labels.endlessTime;
  return `<figure class="mode-preview" data-mode-preview="${e(mode.id)}"><figcaption>${e(labels.progression)}</figcaption><svg class="mode-route" viewBox="0 0 400 180" aria-hidden="true" fill="none">${route}</svg><div class="mode-summary"><div><strong><bdi>${mode.encounters === null ? '∞' : e(labels.number(mode.encounters))}</bdi></strong><span>${e(mode.encounters === null ? labels.noFinalFight : labels.fights)}</span></div><div class="mode-duration"><strong><bdi>${e(duration)}</bdi></strong><span>${e(labels.estimatedTime)}</span></div></div></figure>`;
}
