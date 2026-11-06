import type { View } from "../../shared/view.ts";
import { t, number,locale } from "../i18n.ts";
import {chapterText} from '../chapter-text.ts';
import { escape as e } from "./html.ts";
export function skirmishHUD(view: View,owner?:string) {
  const objective = view.objective;
  if (!objective) return "";
  const patient=view.patients?.find(p=>p.owner===owner);
  return `<strong>${e(t("ui.wardApproach"))}</strong><span>${e(t("ui.skirmishWave", { number: number(Math.max(1, objective.wave)), total: number(objective.waves) }))}</span><span role="status">${e(t("ui.skirmishRemaining", { count: number(objective.remaining) }))}</span>${patient?`<span>${e(chapterText(locale).patient)} · ${number(Math.ceil(patient.health))} / ${number(patient.maxHealth)}</span>`:''}${view.chapter?`<details lang="${chapterText(locale).language}"><summary>${e(chapterText(locale).training)}</summary><p>${e(chapterText(locale).lessons[view.players.find(p=>p.id===owner)?.classId??'soldier'])}</p></details>`:''}`;
}
export function skirmishResults(view: View) {
  const objective = view.objective;
  return objective
    ? `<section class="skirmish-results"><h3>${e(t(objective.status === "complete" ? "ui.skirmishComplete" : "ui.skirmishFailed"))}</h3><p>${e(t("ui.skirmishDefeated", { count: number(objective.defeated) }))}</p><p>${e(t("ui.wardApproachHelp"))}</p></section>`
    : "";
}
