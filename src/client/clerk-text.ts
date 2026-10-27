import messages from "./clerk-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
export function clerkPhaseName(phase: number, locale: string) {
  return words(locale)[
    phase > 0
      ? "boss.quarantine-clerk.phase.1"
      : "boss.quarantine-clerk.phase.0"
  ];
}
export function clerkPhaseHint(phase: number, variant: string, locale: string) {
  const w = words(locale);
  return (
    w[
      phase > 0
        ? "boss.quarantine-clerk.phaseHint.1"
        : "boss.quarantine-clerk.phaseHint.0"
    ] +
    (variant !== "normal" ? " " + w["boss.quarantine-clerk.brutalHelp"] : "")
  );
}
export function clerkHelp(variant: string, locale: string) {
  const w = words(locale);
  return (
    w["boss.quarantine-clerk.description"] +
    (variant !== "normal" ? " " + w["boss.quarantine-clerk.brutalHelp"] : "")
  );
}
