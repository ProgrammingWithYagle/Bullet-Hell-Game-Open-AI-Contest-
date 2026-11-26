import type { View } from "../../shared/view.ts";
import { bossThreat } from "../../shared/boss-threat.ts";
import { buildGrade, rateBuild } from "../../shared/build-rating.ts";
import { classifiedThreatCode, classifiedThreatText } from "../threat-text.ts";
import { t } from "../i18n.ts";
import { escape as e } from "./html.ts";
/** Only the just-cleared encounter is disclosed. Contract identities remain concealed. */
export function storyEncounterMarkup(view: View) {
  if (
    view.run.mode !== "story" ||
    view.phase !== "storyScene" ||
    view.encounter < 1
  )
    return "";
  const profile = bossThreat(view.boss.id),
    player = view.players.find((p) => p.id === view.owner);
  const variant = view.boss.variant;
  return `<details class="story-field-reference" data-story-encounter="${e(view.boss.id)}"><summary>${e(t("ui.bossDefeated"))}: ${e(t("boss." + view.boss.id + ".name"))}</summary><p>${e(t("ui.threat"))} <bdi data-story-threat>${e(classifiedThreatCode(profile.level, profile.subtier, variant))}</bdi> · ${e(classifiedThreatText(profile.level, profile.subtier))} · ${e(t(variant === "crazed" ? "ui.variantCrazed" : variant === "brutal" ? "ui.variantBrutal" : "ui.variantNormal"))}</p>${player ? `<p>${e(t("class." + player.classId + ".name"))} · ${e(t("ui.buildRating"))} <bdi data-story-build>${e(buildGrade(rateBuild(player)))}</bdi></p><p class="muted">${e(t("ui.ratingExplanation"))}</p>` : ""}</details>`;
}
