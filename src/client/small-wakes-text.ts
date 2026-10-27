import help from "./small-wakes-help.json";
const words = (locale: string) =>
  (help[locale as keyof typeof help] ?? help.en) as Record<string, string>;
export function smallWakesPhaseName(
  bossId: string,
  phase: number,
  locale: string,
) {
  return words(locale)[`boss.${bossId}.phase.${phase > 0 ? 1 : 0}`] ?? "";
}
export function smallWakesPhaseHint(
  bossId: string,
  phase: number,
  variant: string,
  locale: string,
) {
  const w = words(locale),
    hint = w[`boss.${bossId}.phaseHint.${phase > 0 ? 1 : 0}`];
  return hint
    ? hint + (variant === "brutal" ? " " + w[`boss.${bossId}.brutalHelp`] : "")
    : "";
}
