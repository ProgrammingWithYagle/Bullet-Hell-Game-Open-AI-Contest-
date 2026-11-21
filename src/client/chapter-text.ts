import en from './story/chapter/en.json';
export function chapterText(_language: string) {
  return { ...en, language: 'en' as const };
}
