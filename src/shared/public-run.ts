import catalog from "../../content/catalog.json";
import { Random } from "./random.ts";
import threats from "./boss-threats.json";
import type { Settings } from "./game.ts";
import type { BossId } from "./protocol.ts";
/** Public openings use the authored mode pool; a browser cannot pick its boss. */
export function publicRunSettings(
  settings: Partial<Settings>,
): Partial<Settings> {
  const mode = settings.mode ?? "short",
    seed = settings.seed ?? 1;
  const source =
    mode === "raid"
      ? catalog.bossPools.raid.regular
      : mode === "endless"
        ? catalog.bossPools.endless.openingPool
        : catalog.bossPools.short.regular;
  const pool = source.filter(
    (id) =>
      mode === "raid" ||
      (threats.entries.find((p) => p.bossId === id)?.level ?? 11) <= 2,
  );
  const chosen = pool[
    Math.floor(new Random(seed ^ 0x7075626c).next() * pool.length)
  ] as BossId;
  return { ...settings, openingBossId: chosen };
}
