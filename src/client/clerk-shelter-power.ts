import rules from "../shared/clerk-appeal-rules.json";
import type { View, PlayerView } from "../shared/view.ts";
export function clerkShelterPower(view: View, p: PlayerView) {
  if (view.boss.id !== "quarantine-clerk") return 0;
  const safe = view.bossCues.some(
    (q) =>
      q.kind === "stamp" &&
      q.safeAt > 0 &&
      view.combatTick >= q.safeAt &&
      view.combatTick < q.until &&
      Math.hypot(p.x - q.x, p.y - q.y) + 9 <= q.radius,
  );
  return safe
    ? rules.shelterBossBonus[view.boss.variant][view.boss.phase > 0 ? 1 : 0]
    : 0;
}
