import type { MoldCue } from "../shared/mold-mixing.ts";
import { HZ } from "../shared/protocol.ts";
export function isMoldCue(q: { kind: string }): q is MoldCue {
  return [
    "mold-walk",
    "mold-flask",
    "mold-pool",
    "mold-gas",
    "mold-reactor",
    "mold-reaction",
    "mold-still",
    "mold-aerosol",
  ].includes(q.kind);
}
export function moldFrame(cues: MoldCue[], now: number, reduced = false) {
  if (reduced) return 0;
  const walk = cues.find((q) => q.kind === "mold-walk");
  if (walk && walk.kind === "mold-walk")
    return now < walk.at
      ? 1
      : 8 +
          (Math.floor((Math.max(0, now - walk.at) * walk.speed) / (HZ * 10)) %
            8);
  const flask = cues.find((q) => q.kind === "mold-flask");
  if (flask) return flask.at - now > 15 ? 2 : 3;
  if (cues.some((q) => q.kind === "mold-pool" && now - q.at < 8)) return 4;
  const gas = cues.find((q) => q.kind === "mold-gas");
  if (gas) return now < gas.at ? 2 : 5;
  const aerosol = cues.find(
    (q) => q.kind === "mold-aerosol" && q.state !== "quenched",
  );
  if (aerosol) return now < aerosol.at ? 2 : 5;
  if (cues.some((q) => q.kind === "mold-still" && q.state === "charging"))
    return 2;
  return 0;
}
