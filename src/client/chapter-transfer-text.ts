import editions from './chapter-transfer-copy.json';
const keys = ['title','help','saved','empty','resume','export','choose','checking','use','replace','summary','training','invalid','changed','storage','exported','cancel','local'] as const;
export function chapterTransferText(language: string) {
  const row = editions[language as keyof typeof editions] ?? editions.en;
  return Object.fromEntries(keys.map((key, i) => [key, row[i]])) as Record<(typeof keys)[number], string>;
}
