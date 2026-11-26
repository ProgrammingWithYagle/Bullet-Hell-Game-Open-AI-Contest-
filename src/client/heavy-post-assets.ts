import { nativePostedTextureDefinitions } from './heavy-post-renderer.ts';
const images = import.meta.glob('../../assets/production/motion/heavy-post-2026-11-10/*.png', {
  query: '?url', import: 'default', eager: true,
}) as Record<string, string>;
export const heavyPostedUrls = Object.fromEntries(nativePostedTextureDefinitions().map(t => {
  const url = images['../../' + t.file];
  if (!url) throw Error('Missing posted Heavy texture: ' + t.key);
  return [t.key, url];
}));
