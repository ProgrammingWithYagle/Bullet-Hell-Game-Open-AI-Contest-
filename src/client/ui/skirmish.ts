import type { View } from "../../shared/view.ts";
import { t, number } from "../i18n.ts";
import { escape as e } from "./html.ts";
export function skirmishHUD(view: View) {
  const objective = view.objective;
  if (!objective) return "";
  return `<strong>${e(t("ui.wardApproach"))}</strong><span>${e(t("ui.skirmishWave", { number: number(Math.max(1, objective.wave)), total: number(objective.waves) }))}</span><span role="status">${e(t("ui.skirmishRemaining", { count: number(objective.remaining) }))}</span>`;
}
export function skirmishResults(view: View) {
  const objective = view.objective;
  return objective
    ? `<section class="skirmish-results"><h3>${e(t(objective.status === "complete" ? "ui.skirmishComplete" : "ui.skirmishFailed"))}</h3><p>${e(t("ui.skirmishDefeated", { count: number(objective.defeated) }))}</p><p>${e(t("ui.wardApproachHelp"))}</p></section>`
    : "";
}
