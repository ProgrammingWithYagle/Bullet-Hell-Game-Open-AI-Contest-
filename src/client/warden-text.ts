import messages from './warden-help.json';
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
export function wardenPhaseName(phase: number, locale: string) {
  return words(locale)[
    phase > 0 ? 'boss.lantern-warden.phase.1' : 'boss.lantern-warden.phase.0'
  ];
}
export function wardenPhaseHint(
  phase: number,
  variant: string,
  locale: string,
) {
  const w = words(locale);
  return (
    w[
      phase > 0
        ? 'boss.lantern-warden.phaseHint.1'
        : 'boss.lantern-warden.phaseHint.0'
    ] + (variant === 'brutal' ? ' ' + w['boss.lantern-warden.brutalHelp'] : '')
  );
}
