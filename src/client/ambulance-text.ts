import messages from "./ambulance-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
const extra = (variant: string, locale: string) =>
  variant === "normal"
    ? ""
    : " " +
      words(locale)["boss.black-ambulance.brutalHelp"] +
      (variant === "crazed"
        ? " " + words(locale)["boss.black-ambulance.crazedHelp"]
        : "");
export const ambulancePhaseName = (phase: number, locale: string) =>
  words(locale)[
    phase > 0 ? "boss.black-ambulance.phase.1" : "boss.black-ambulance.phase.0"
  ];
export const ambulancePhaseHint = (
  phase: number,
  variant: string,
  locale: string,
) =>
  words(locale)[
    phase > 0
      ? "boss.black-ambulance.phaseHint.1"
      : "boss.black-ambulance.phaseHint.0"
  ] + extra(variant, locale);
export const ambulanceHelp = (variant: string, locale: string) =>
  words(locale)["boss.black-ambulance.description"] + extra(variant, locale);
