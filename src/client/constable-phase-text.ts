import labels from './constable-phase-labels.json';
export function constablePhaseName(phase: number, language: string) {
  const words = labels[language as keyof typeof labels] ?? labels.en;
  return words[Math.max(0, Math.min(3, Math.floor(phase)))] ?? words[0];
}
