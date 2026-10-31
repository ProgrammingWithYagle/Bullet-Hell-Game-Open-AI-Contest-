import messages from "./glass-help.json";
const words = (locale: string): Record<string, string> =>
  messages[locale as keyof typeof messages] ?? messages.en;
export const glassPhaseName = (phase: number, locale: string) =>
  words(locale)[
    "boss.glass-surgeon.phase." + Math.max(0, Math.min(3, Math.floor(phase)))
  ];
const extra = (variant: string, locale: string) =>
  variant === "normal"
    ? ""
    : " " +
      words(locale)["boss.glass-surgeon.brutalHelp"] +
      (variant === "crazed"
        ? " " + words(locale)["boss.glass-surgeon.crazedHelp"]
        : "");
export const glassPhaseHint = (
  phase: number,
  variant: string,
  locale: string,
) =>
  words(locale)[
    "boss.glass-surgeon.phaseHint." +
      Math.max(0, Math.min(3, Math.floor(phase)))
  ] + extra(variant, locale);
export const glassHelp = (variant: string, locale: string) =>
  words(locale)["boss.glass-surgeon.description"] + extra(variant, locale);

export const glassLore = (locale: string) =>
  words(locale)["boss.glass-surgeon.lore"];
