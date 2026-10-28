import type { BellCue } from "../shared/bell-carillon.ts";
import { HZ } from "../shared/protocol.ts";
export function isBellCue(q: { kind: string }): q is BellCue {
  return ["bell-walk", "bell-ring", "bell-resonator"].includes(q.kind);
}
export function bellFrame(cues: BellCue[], now: number, reduced = false) {
  if (reduced) return 0;
  const walk = cues.find((q) => q.kind === "bell-walk");
  if (walk && walk.kind === "bell-walk")
    return now < walk.at
      ? 1
      : 8 +
          (Math.floor((Math.max(0, now - walk.at) * walk.speed) / (HZ * 10)) %
            8);
  const primary = cues.find((q) => q.kind === "bell-ring" && !q.echo);
  if (primary && primary.kind === "bell-ring") {
    if (primary.state === "warning") return primary.at - now > 15 ? 2 : 3;
    if (primary.state === "quiet") return 6;
    if (primary.state === "rewarn") return primary.resumeAt - now > 15 ? 2 : 3;
    return now - primary.motionAt < 8 ? 4 : 5;
  }
  return 0;
}
