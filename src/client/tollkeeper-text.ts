import messages from "./tollkeeper-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
export const tollkeeperPhaseName = (phase: number, locale: string) =>
  words(locale)[
    phase > 0 ? "boss.tollkeeper.phase.1" : "boss.tollkeeper.phase.0"
  ];
export function tollkeeperPhaseHint(
  phase: number,
  variant: string,
  locale: string,
) {
  const w = words(locale);
  return (
    w[
      phase > 0 ? "boss.tollkeeper.phaseHint.1" : "boss.tollkeeper.phaseHint.0"
    ] + (variant !== "normal" ? " " + w["boss.tollkeeper.brutalHelp"] : "")
  );
}
export function tollkeeperHelp(variant: string, locale: string) {
  const w = words(locale);
  return (
    w["boss.tollkeeper.description"] +
    (variant !== "normal" ? " " + w["boss.tollkeeper.brutalHelp"] : "")
  );
}
