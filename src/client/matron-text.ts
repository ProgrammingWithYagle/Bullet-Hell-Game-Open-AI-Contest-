import messages from "./matron-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
const extra = (variant: string, locale: string) =>
  variant === "normal"
    ? ""
    : " " +
      words(locale)["boss.matron.brutalHelp"] +
      (variant === "crazed"
        ? " " + words(locale)["boss.matron.crazedHelp"]
        : "");
export const matronPhaseName = (phase: number, locale: string) =>
  words(locale)[phase > 0 ? "boss.matron.phase.1" : "boss.matron.phase.0"];
export const matronPhaseHint = (
  phase: number,
  variant: string,
  locale: string,
) =>
  words(locale)[
    phase > 0 ? "boss.matron.phaseHint.1" : "boss.matron.phaseHint.0"
  ] + extra(variant, locale);
export const matronHelp = (variant: string, locale: string) =>
  words(locale)["boss.matron.description"] + extra(variant, locale);
