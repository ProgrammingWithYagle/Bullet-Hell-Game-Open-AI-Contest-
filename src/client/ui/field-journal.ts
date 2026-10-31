import catalog from "../../../content/catalog.json";
import {
  fieldJournal,
  journalPlan,
  type JournalCategory,
  type JournalGoal,
  type JournalPlan,
} from "../field-journal.ts";
import { loadProfile } from "../profile.ts";
import { locale, number, t } from "../i18n.ts";
import { journalText as j } from "../field-journal-text.ts";
import letters from "../survivor-letters.json";
import { escape as e } from "./html.ts";
import { icon } from "./icons.ts";
import "./field-journal.css";
const categories = [
  "all",
  "classes",
  "routes",
  "discoveries",
  "cooperation",
] as const;
function title(g: JournalGoal) {
  if (g.kind === "class")
    return j(locale, "classTitle", { name: t("class." + g.classId + ".name") });
  if (g.kind === "route" || g.kind === "collection")
    return j(locale, g.kind + "Title", { name: t("mode." + g.mode + ".name") });
  return j(locale, g.kind + "Title");
}
const description = (g: JournalGoal) =>
  j(
    locale,
    g.kind + "Help",
    g.classId ? { name: t("class." + g.classId + ".name") } : {},
  );
/** A menu-only journal: no combat overlay, network request or profile write. */
export function mountFieldJournal(
  host: HTMLElement,
  back: () => void,
  prepare: (plan: JournalPlan) => void,
) {
  let disposed = false,
    filter: "all" | JournalCategory = "all";
  const alive = () => !disposed && host.isConnected;
  function render(focus = "") {
    if (!alive()) return;
    const profile = loadProfile(localStorage),
      model = fieldJournal(profile),
      next = model.next;
    const rows = model.goals.filter(
      (g) => filter === "all" || g.category === filter,
    );
    host.innerHTML = `<section class="field-journal"><div class="section-heading"><div><p class="eyebrow">${e(j(locale, "eyebrow"))}</p><h1 tabindex="-1">${e(j(locale, "title"))}</h1></div><button data-journal-back>${e(t("ui.back"))}</button></div><p class="journal-notice">${e(j(locale, "notice"))}</p><p class="journal-totals">${e(j(locale, "totals", { count: number(model.stamps), total: number(model.maximumStamps), letters: number(model.letters.length) }))}</p><aside class="journal-next"><span class="journal-seal" aria-hidden="true">${icon(next.classId ?? "map")}</span><div><h2>${e(j(locale, "next"))}</h2><p>${e(title(next))}</p><p class="muted">${e(description(next))}</p></div><button data-journal-prepare="${next.id}" class="primary">${e(j(locale, "prepare"))}</button></aside><nav class="journal-filters" aria-label="${e(j(locale, "filter"))}">${categories.map((id) => `<button data-journal-filter="${id}" aria-pressed="${filter === id}">${e(j(locale, id))}</button>`).join("")}</nav><div class="journal-entries">${rows
      .map((g) => {
        const letter =
          g.classId && g.kind === "class" ? letters[g.classId] : undefined;
        const unlocked = Boolean(letter && g.tier > 0);
        return `<article class="journal-entry ${g.complete ? "journal-complete" : ""}" data-journal-goal="${g.id}"><div class="journal-entry-heading"><span class="journal-stamp" aria-label="${e(j(locale, "stamps", { count: number(g.tier) }))}">${["I", "II", "III"].map((n, i) => `<b ${i < g.tier ? 'class="earned"' : ""}>${n}</b>`).join("")}</span><h2>${e(title(g))}</h2></div><p>${e(description(g))}</p><p class="journal-progress-text"><bdi>${number(g.progress)} / ${number(g.target)}</bdi><span>${e(j(locale, g.complete ? "complete" : "target"))}</span></p><progress max="${g.target}" value="${Math.min(g.progress, g.target)}" aria-label="${e(title(g))}"></progress><div class="journal-entry-actions"><button data-journal-prepare="${g.id}">${e(j(locale, "prepare"))}</button>${letter ? `<span>${e(j(locale, unlocked ? "letterReady" : "letterLocked"))}</span>` : ""}</div>${unlocked ? `<details class="journal-letter"><summary>${e(j(locale, "letter"))} · ${e(catalog.classes.find((c) => c.id === g.classId)!.survivor)}</summary><p class="muted">${e(j(locale, "editorial"))}</p><div lang="en" dir="ltr"><h3>${e(letter!.title)}</h3><p>${e(letter!.body)}</p></div></details>` : ""}</article>`;
      })
      .join("")}</div></section>`;
    host.querySelector<HTMLButtonElement>("[data-journal-back]")!.onclick =
      () => {
        if (alive()) back();
      };
    for (const button of host.querySelectorAll<HTMLButtonElement>(
      "[data-journal-prepare]",
    ))
      button.onclick = () => {
        if (alive())
          prepare(
            journalPlan(
              loadProfile(localStorage),
              button.dataset.journalPrepare!,
            ),
          );
      };
    for (const button of host.querySelectorAll<HTMLButtonElement>(
      "[data-journal-filter]",
    ))
      button.onclick = () => {
        if (!alive()) return;
        const value = button.dataset.journalFilter!;
        if (!categories.some((c) => c === value)) return;
        filter = value as typeof filter;
        render(`[data-journal-filter="${filter}"]`);
      };
    if (focus) host.querySelector<HTMLElement>(focus)?.focus();
  }
  render();
  return () => {
    disposed = true;
  };
}
