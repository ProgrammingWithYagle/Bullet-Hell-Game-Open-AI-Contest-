import { loadProfile, PROFILE_KEY } from './profile.ts';
import english from '../../locales/en.json';
import { formatMessage, type Message } from '../shared/messages.ts';
type Catalog = typeof english;
const loaders = import.meta.glob<Catalog>('../../locales/*.json', { import: 'default' });
export const languages = [
  ['en', 'English'],
  ['zh-Hans', '简体中文'],
  ['zh-Hant', '繁體中文'],
  ['ja', '日本語'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['pt-BR', 'Português (Brasil)'],
  ['ru', 'Русский'],
  ['hi', 'हिन्दी'],
  ['ar', 'العربية'],
  ['bn', 'বাংলা'],
  ['id', 'Bahasa Indonesia'],
  ['ur', 'اردو'],
  ['ko', '한국어'],
];
let catalog: Catalog = english;
export let locale = 'en';
export async function setLanguage(id: string) {
  if (!languages.some(([code]) => code === id)) id = 'en';
  catalog = id === 'en' ? english : await loaders['../../locales/' + id + '.json']();
  locale = id;
  document.documentElement.lang = id;
  document.documentElement.dir = catalog.meta.direction;
  try {
    localStorage.setItem('ga-language', id);
  } catch {}
}
export function initialLanguage() {
  let saved = '';
  try {
    saved =
      localStorage.getItem(PROFILE_KEY) !== null
        ? loadProfile(localStorage).locale
        : (localStorage.getItem('ga-language') ?? '');
  } catch {}
  if (languages.some(([id]) => id === saved)) return saved;
  const n = navigator.language;
  return (
    languages.find(([id]) => id.toLowerCase() === n.toLowerCase())?.[0] ??
    (n.startsWith('zh')
      ? n.includes('TW') || n.includes('HK')
        ? 'zh-Hant'
        : 'zh-Hans'
      : (languages.find(([id]) => id === n.split('-')[0])?.[0] ?? 'en'))
  );
}
export function number(n: number, digits = 0) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n);
}
export function t(key: string, args: Record<string, string | number> = {}): string {
  const messages = catalog.messages as Record<string, unknown>,
    fallback = english.messages as Record<string, unknown>;
  return formatMessage((messages[key] ?? fallback[key] ?? key) as Message, locale, args);
}
