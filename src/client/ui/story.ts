import type { View } from "../../shared/view.ts";
import {
  storyCampaign,
  storyEnding,
  storyLength,
} from "../../shared/story-campaign.ts";
import type { ProfileV1 } from "../profile.ts";
import { storyProgress } from "../story-progress.ts";
import { t, number } from "../i18n.ts";
import { escape as e } from "./html.ts";
const stance = (i: number) =>
  t("ui.storyStance." + ["shelter", "witness", "defiance"][i]);
const prose = (title: string, speaker: string, text: string) =>
  `<div class="story-prose" lang="en" dir="ltr"><h3>${e(title)}</h3><p class="story-speaker">${e(speaker)}</p><p>${e(text)}</p></div>`;
export function storyBriefingMarkup() {
  const act = storyCampaign.acts[0];
  return `<aside class="story-briefing"><p class="eyebrow">${e(t("ui.storyOriginal"))}</p>${prose(storyCampaign.title, "", storyCampaign.intro)}${prose(act.title, act.speaker, act.text)}<p>${e(t("mode.story.description"))}</p><p>${e(t("ui.storyEndingRule"))}</p></aside>`;
}
/** No story overlay appears in combat. Reading uses the existing intermission clock. */
export function storyReportMarkup(view: View, open = false) {
  if (view.run.mode !== "story" || view.phase === "combat") return "";
  if (view.phase === "lobby" || view.encounter === 0)
    return storyBriefingMarkup();
  const beat =
    storyCampaign.beats[
      Math.max(0, Math.min(storyLength - 1, view.encounter - 1))
    ];
  const ending = view.campaignBank
    ? storyCampaign.endings[storyEnding(view.storyChoices ?? [])]
    : undefined;
  const actIndex = Math.min(2, Math.floor(view.encounter / 5));
  const act = storyCampaign.acts[actIndex];
  const boundary = view.encounter === 5 || view.encounter === 10;
  return `<details class="story-report" data-story-report ${open ? "open" : ""}><summary id="story-report-toggle">${e(t(ending ? "ui.storyEnding" : "ui.storyAftermath"))} · <bdi lang="en" dir="ltr">${e(ending?.title ?? beat.title)}</bdi></summary><p class="muted">${e(t("ui.storyOriginal"))}</p>${prose(beat.title, beat.speaker, beat.text)}${boundary ? `<p class="eyebrow">${e(t("ui.storyAct", { number: number(actIndex + 1) }))}</p>${prose(act.title, act.speaker, act.text)}` : ""}${ending ? prose(ending.title, ending.speaker, ending.text) : ""}</details>`;
}
export function storyChoiceMarkup(view: View, index: number) {
  if (view.run.mode !== "story" || view.phase !== "contractVote") return "";
  const choice = storyCampaign.beats[view.encounter - 1]?.choices[index];
  if (!choice) return "";
  return `<span class="story-choice"><span class="story-stance">${e(stance(index))}</span><strong lang="en" dir="ltr">${e(choice.title)}</strong><span lang="en" dir="ltr">${e(choice.text)}</span><small>${e(t("arena." + choice.arenaId + ".name"))}</small></span>`;
}
export function storyEndingsMarkup(profile: ProfileV1) {
  const progress = storyProgress(profile);
  return `<section class="story-archive" aria-labelledby="story-endings-title"><h2 id="story-endings-title">${e(t("ui.storyEndings"))}</h2><p>${e(t("ui.storyEndingsProgress", { count: number(progress.endings.size) }))} · ${e(t("ui.storyActsProgress", { count: number(progress.acts) }))}</p><p>${e(t("ui.storyEndingRule"))}</p><div class="story-ending-grid">${storyCampaign.endings.map((ending, i) => `<article data-story-ending="${i}" class="story-ending ${progress.endings.has(i) ? "recovered" : "locked"}"><h3>${e(stance(i))}</h3>${progress.endings.has(i) ? `<details><summary>${e(t("ui.storyRead"))} · <bdi lang="en" dir="ltr">${e(ending.title)}</bdi></summary><p class="muted">${e(t("ui.storyOriginal"))}</p>${prose(ending.title, ending.speaker, ending.text)}</details>` : `<p>${e(t("ui.storyNotRecovered"))}</p>`}</article>`).join("")}</div></section>`;
}
