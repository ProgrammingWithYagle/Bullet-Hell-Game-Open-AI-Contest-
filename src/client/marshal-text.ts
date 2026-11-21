import messages from "./marshal-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
export const marshalPhaseName = (phase: number, locale: string) =>
  words(locale)[
    phase > 0 ? "boss.chain-marshal.phase.1" : "boss.chain-marshal.phase.0"
  ];
const advanced = (variant: string, locale: string) =>
  variant === "normal"
    ? ""
    : " " +
      words(locale)["boss.chain-marshal.brutalHelp"] +
      (variant === "crazed"
        ? " " + words(locale)["boss.chain-marshal.crazedHelp"]
        : "");
export function marshalPhaseHint(
  phase: number,
  variant: string,
  locale: string,
) {
  return (
    words(locale)[
      phase > 0
        ? "boss.chain-marshal.phaseHint.1"
        : "boss.chain-marshal.phaseHint.0"
    ] + advanced(variant, locale)
  );
}
export function marshalHelp(variant: string, locale: string) {
  return (
    words(locale)["boss.chain-marshal.description"] + advanced(variant, locale)
  );
}
