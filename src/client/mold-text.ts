import messages from "./mold-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
const names = [
  "boss.alchemist.phase.0",
  "boss.alchemist.phase.1",
  "boss.alchemist.phase.2",
  "boss.alchemist.phase.3",
] as const;
const hints = [
  "boss.alchemist.phaseHint.0",
  "boss.alchemist.phaseHint.1",
  "boss.alchemist.phaseHint.2",
  "boss.alchemist.phaseHint.3",
] as const;
const extra = (variant: string, locale: string) =>
  variant === "normal"
    ? ""
    : " " +
      words(locale)["boss.alchemist.brutalHelp"] +
      (variant === "crazed"
        ? " " + words(locale)["boss.alchemist.crazedHelp"]
        : "");
export const moldPhaseName = (phase: number, locale: string) =>
  words(locale)[names[Math.max(0, Math.min(3, Math.floor(phase)))]];
export const moldPhaseHint = (phase: number, variant: string, locale: string) =>
  words(locale)[hints[Math.max(0, Math.min(3, Math.floor(phase)))]] +
  extra(variant, locale);
export const moldHelp = (variant: string, locale: string) =>
  words(locale)["boss.alchemist.description"] + extra(variant, locale);
