import messages from "./widow-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
export const widowPhaseName = (phase: number, locale: string) =>
  words(locale)[
    phase > 0 ? "boss.gate-widow.phase.1" : "boss.gate-widow.phase.0"
  ];
const advanced = (variant: string, locale: string) =>
  variant === "normal"
    ? ""
    : " " +
      words(locale)["boss.gate-widow.brutalHelp"] +
      (variant === "crazed"
        ? " " + words(locale)["boss.gate-widow.crazedHelp"]
        : "");
export function widowPhaseHint(phase: number, variant: string, locale: string) {
  return (
    words(locale)[
      phase > 0 ? "boss.gate-widow.phaseHint.1" : "boss.gate-widow.phaseHint.0"
    ] + advanced(variant, locale)
  );
}
export function widowHelp(variant: string, locale: string) {
  return (
    words(locale)["boss.gate-widow.description"] + advanced(variant, locale)
  );
}
