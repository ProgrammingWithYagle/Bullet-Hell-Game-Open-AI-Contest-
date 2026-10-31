import { escape as e } from './html.ts';
import { icon } from './icons.ts';

export type ResourceKind = 'equipment' | 'coins' | 'skills';
export type ResourceImages = Partial<Record<ResourceKind, string>>;

export function resourceArt(kind: ResourceKind, images: ResourceImages = {}) {
  const url = images[kind];
  return url
    ? `<img class="resource-art" data-resource-art="${kind}" src="${e(url)}" width="32" height="32" alt="" aria-hidden="true">`
    : icon(
        kind === 'equipment' ? 'weapon' : kind === 'skills' ? 'tree' : 'coins',
      );
}
