import type { MoldCue } from "../shared/mold-mixing.ts";
export function moldFrame(cues: MoldCue[], now: number, reduced = false) {
  if (reduced) return 0;
  const walk = cues.find((c) => c.kind === "mold-walk");
  if (walk) return now < walk.at ? 1 : 0;
  const next = cues
    .filter((q) => q.at > now)
    .toSorted((a, b) => a.at - b.at)[0];
  if (next) return next.at - now > 15 ? 2 : 3;
  const front = cues.find((q) => q.kind === "mold-front");
  if (front) return now - front.at < 8 ? 4 : 5;
  const spray = cues.find(
    (q) => q.kind === "mold-spray" && now >= q.at && now < q.until,
  );
  if (spray) return 4;
  return cues.length ? 6 : 0;
}
