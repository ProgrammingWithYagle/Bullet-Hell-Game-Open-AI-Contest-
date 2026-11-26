import messages from "./stitch-help.json";
const words = (locale: string): Record<string, string> =>
  messages[locale as keyof typeof messages] ?? messages.en;
export const stitchPhaseName = (p: number, l: string) =>
  words(l)[
    "boss.stitchwright.phase." + Math.max(0, Math.min(3, Math.floor(p)))
  ];
const extra = (v: string, l: string) =>
  v === "normal"
    ? ""
    : " " +
      words(l)["boss.stitchwright.brutalHelp"] +
      (v === "crazed" ? " " + words(l)["boss.stitchwright.crazedHelp"] : "");
export const stitchPhaseHint = (p: number, v: string, l: string) =>
  words(l)[
    "boss.stitchwright.phaseHint." + Math.max(0, Math.min(3, Math.floor(p)))
  ] + extra(v, l);
export const stitchHelp = (v: string, l: string) =>
  words(l)["boss.stitchwright.description"] + extra(v, l);
