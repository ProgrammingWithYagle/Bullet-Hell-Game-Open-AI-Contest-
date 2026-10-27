import type { MatronCue } from "../shared/matron-ward.ts";
/** Uses the existing service atlas; moving bodies keep its idle pose until walking art exists. */
export function matronFrame(cues: MatronCue[], now: number, reduced = false) {
  if (reduced) return 0;
  const walk = cues.find((q) => q.kind === "matron-walk");
  if (walk?.kind === "matron-walk") return now < walk.at ? 1 : 0;
  const casts = cues.filter(
      (q) =>
        q.kind === "matron-pulse" ||
        q.kind === "matron-needles" ||
        q.kind === "matron-brood",
    ),
    next = casts.filter((q) => q.at > now).toSorted((a, b) => a.at - b.at)[0];
  if (next) return next.at - now > 15 ? 2 : 3;
  const recent = casts.find((q) => now >= q.at && now < q.at + 12);
  if (recent) return now - recent.at < 6 ? 4 : 5;
  return casts.length ? 6 : 0;
}
