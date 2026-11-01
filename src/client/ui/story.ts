import {storyReaderMarkup} from './story-reader.ts';
import type { View } from "../../shared/view.ts";
import {
  storyCampaign,
  storyEnding,
  storyLength,
} from "../../shared/story-campaign.ts";
import { storyBook, storyDirection, type StoryBook } from "../story-book.ts";
import type { ProfileV1 } from "../profile.ts";
import { storyProgress } from "../story-progress.ts";
import { t, number, locale, languages } from "../i18n.ts";
import { escape as e } from "./html.ts";
const stance = (i: number) =>
  t("ui.storyStance." + ["shelter", "witness", "defiance"][i]);
const notice = (book: StoryBook) =>
  book.language === "en"
    ? t("ui.storyOriginal")
    : t("ui.language") +
      ": " +
      (languages.find(([id]) => id === book.language)?.[1] ?? book.language);
const prose = (book: StoryBook, title: string, speaker: string, text: string) =>
  `<div class="story-prose" lang="${e(book.language)}" dir="${storyDirection(book.language)}"><h3>${e(title)}</h3><p class="story-speaker">${e(speaker)}</p><p>${e(text)}</p></div>`;
const label = (book: StoryBook, title: string) =>
  `<bdi lang="${e(book.language)}" dir="${storyDirection(book.language)}">${e(title)}</bdi>`;
export function storyBriefingMarkup(language = locale) {
  const book = storyBook(language),
    act = book.acts[0];
  return `<aside class="story-briefing"><p class="eyebrow">${e(notice(book))}</p>${storyReaderMarkup({kind:"prologue",index:0},language,"briefing")}<p>${e(t("mode.story.description"))}</p><p>${e(t("ui.storyEndingRule"))}</p></aside>`;
}
/** Reading uses the existing intermission clock; combat never receives a story overlay. */
export function storyReportMarkup(view: View, open = false, language = locale) {
  if (view.run.mode !== "story" || view.phase === "combat") return "";
  if (view.phase === "lobby" || view.encounter === 0)
    return storyBriefingMarkup(language);
  const book = storyBook(language),
    beat =
      book.beats[Math.max(0, Math.min(storyLength - 1, view.encounter - 1))];
  const ending = view.campaignBank
    ? book.endings[storyEnding(view.storyChoices ?? [])]
    : undefined;
  const actIndex = Math.min(2, Math.floor(view.encounter / 5)),
    act = book.acts[actIndex],
    boundary = view.encounter === 5 || view.encounter === 10;
  return `<details class="story-report" data-story-report ${open ? "open" : ""}><summary id="story-report-toggle">${e(t(ending ? "ui.storyEnding" : "ui.storyAftermath"))} · ${label(book, ending?.title ?? beat.title)}</summary><p class="muted">${e(notice(book))}</p>${storyReaderMarkup({kind:"report",arenaId:view.arenaId,index:Math.max(0,view.encounter-1),...(ending?{ending:storyEnding(view.storyChoices??[])}:{})},language,view.run.id)}</details>`;
}
export function storyChoiceMarkup(
  view: View,
  index: number,
  language = locale,
) {
  if (view.run.mode !== "story" || view.phase !== "contractVote") return "";
  const canonical = storyCampaign.beats[view.encounter - 1]?.choices[index];
  if (!canonical) return "";
  const book = storyBook(language),
    choice = book.beats[view.encounter - 1].choices[index];
  return `<span class="story-choice"><span class="story-stance">${e(stance(index))}</span><strong lang="${e(book.language)}" dir="${storyDirection(book.language)}">${e(choice.title)}</strong><span lang="${e(book.language)}" dir="${storyDirection(book.language)}">${e(choice.text)}</span><small>${e(t("arena." + canonical.arenaId + ".name"))}</small></span>`;
}
export function storyEndingsMarkup(profile: ProfileV1, language = locale) {
  const progress = storyProgress(profile),
    book = storyBook(language);
  return `<section class="story-archive" aria-labelledby="story-endings-title"><h2 id="story-endings-title">${e(t("ui.storyEndings"))}</h2><p>${e(t("ui.storyEndingsProgress", { count: number(progress.endings.size) }))} · ${e(t("ui.storyActsProgress", { count: number(progress.acts) }))}</p><p>${e(t("ui.storyEndingRule"))}</p><div class="story-ending-grid">${book.endings.map((ending, i) => `<article data-story-ending="${i}" class="story-ending ${progress.endings.has(i) ? "recovered" : "locked"}"><h3>${e(stance(i))}</h3>${progress.endings.has(i) ? `<details><summary>${e(t("ui.storyRead"))} · ${label(book, ending.title)}</summary><p class="muted">${e(notice(book))}</p>${prose(book, ending.title, ending.speaker, ending.text)}</details>` : `<p>${e(t("ui.storyNotRecovered"))}</p>`}</article>`).join("")}</div></section>`;
}
