import messages from "./courier-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
export function courierPhaseName(phase: number, locale: string) {
  return words(locale)[
    phase > 0 ? "boss.courier.phase.1" : "boss.courier.phase.0"
  ];
}
export function courierPhaseHint(
  phase: number,
  variant: string,
  locale: string,
) {
  const w = words(locale);
  return (
    w[phase > 0 ? "boss.courier.phaseHint.1" : "boss.courier.phaseHint.0"] +
    (variant !== "normal" ? " " + w["boss.courier.brutalHelp"] : "")
  );
}
export function courierHelp(variant: string, locale: string) {
  const w = words(locale);
  return (
    w["boss.courier.description"] +
    (variant !== "normal" ? " " + w["boss.courier.brutalHelp"] : "")
  );
}
