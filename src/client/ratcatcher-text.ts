import messages from "./ratcatcher-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
export function ratcatcherPhaseName(phase: number, locale: string) {
  return words(locale)[
    phase > 0 ? "boss.ratcatcher.phase.1" : "boss.ratcatcher.phase.0"
  ];
}
export function ratcatcherPhaseHint(
  phase: number,
  variant: string,
  locale: string,
) {
  const w = words(locale);
  return (
    w[
      phase > 0 ? "boss.ratcatcher.phaseHint.1" : "boss.ratcatcher.phaseHint.0"
    ] + (variant !== "normal" ? " " + w["boss.ratcatcher.brutalHelp"] : "")
  );
}
export function ratcatcherHelp(variant: string, locale: string) {
  const w = words(locale);
  return (
    w["boss.ratcatcher.description"] +
    (variant !== "normal" ? " " + w["boss.ratcatcher.brutalHelp"] : "")
  );
}
