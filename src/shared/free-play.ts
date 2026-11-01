import catalog from "../../content/catalog.json";
import type { BossId } from "./protocol.ts";
export type RoomKind = "story" | "freeplay";
export type FreePlayOptions = {
  scenarioId?: "ward-approach";
  openingBossId?: BossId;
  variant?: "normal" | "brutal" | "crazed";
  seed?: number;
};
export const roomKind = (mode: string): RoomKind =>
  mode === "story" ? "story" : "freeplay";
export function validFreePlay(value: unknown): value is FreePlayOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as FreePlayOptions;
  return (
    Object.keys(v).every((k) =>
      ["openingBossId", "variant", "seed", "scenarioId"].includes(k),
    ) &&
    Object.values(v).some((value) => value !== undefined) &&
    (v.scenarioId === undefined ||
      (v.scenarioId === "ward-approach" &&
        v.openingBossId === undefined &&
        v.variant === undefined)) &&
    (v.openingBossId === undefined ||
      catalog.bosses.some((b) => b.id === v.openingBossId && !b.secret)) &&
    (v.variant === undefined ||
      ["normal", "brutal", "crazed"].includes(v.variant)) &&
    (v.seed === undefined ||
      (Number.isSafeInteger(v.seed) && v.seed >= 0 && v.seed <= 0xffffffff))
  );
}
/** Explicit custom openings/forms/seeds are sandbox runs; ordinary authored routes keep their records. */
export const customizedFreePlay = (value: FreePlayOptions | undefined) =>
  Boolean(
    value &&
    (value.scenarioId !== undefined ||
      value.openingBossId !== undefined ||
      value.seed !== undefined ||
      value.variant === "brutal" ||
      value.variant === "crazed"),
  );
