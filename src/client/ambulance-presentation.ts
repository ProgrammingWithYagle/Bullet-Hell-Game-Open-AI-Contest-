import type { AmbulanceCue } from "../shared/ambulance-route.ts";
export function ambulanceFrame(
  cues: readonly AmbulanceCue[],
  now: number,
  reduced = false,
) {
  if (reduced) return 0;
  if (cues.some((q) => q.kind === "driver")) return 7;
  const lane = cues.find((q) => q.kind === "ambulance-lane");
  if (lane?.kind === "ambulance-lane")
    return now < lane.at
      ? lane.at - now > 15
        ? 1
        : 2
      : 3 + (Math.floor((now - lane.at) / 4) % 3);
  if (cues.some((q) => q.kind === "ambulance-stop")) return 6;
  return 0;
}
