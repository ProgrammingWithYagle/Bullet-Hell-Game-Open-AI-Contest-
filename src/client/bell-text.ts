import messages from "./bell-help.json";
const words = (locale: string) =>
  messages[locale as keyof typeof messages] ?? messages.en;
const names = [
  "boss.bellringer.phase.0",
  "boss.bellringer.phase.1",
  "boss.bellringer.phase.2",
  "boss.bellringer.phase.3",
] as const;
const hints = [
  "boss.bellringer.phaseHint.0",
  "boss.bellringer.phaseHint.1",
  "boss.bellringer.phaseHint.2",
  "boss.bellringer.phaseHint.3",
] as const;
const extra = (v: string, l: string) =>
  v === "normal"
    ? ""
    : " " +
      words(l)["boss.bellringer.brutalHelp"] +
      (v === "crazed" ? " " + words(l)["boss.bellringer.crazedHelp"] : "");
export const bellPhaseName = (p: number, l: string) =>
  words(l)[names[Math.max(0, Math.min(3, Math.floor(p)))]];
export const bellPhaseHint = (p: number, v: string, l: string) =>
  words(l)[hints[Math.max(0, Math.min(3, Math.floor(p)))]] + extra(v, l);
export const bellHelp = (v: string, l: string) =>
  words(l)["boss.bellringer.description"] + extra(v, l);
