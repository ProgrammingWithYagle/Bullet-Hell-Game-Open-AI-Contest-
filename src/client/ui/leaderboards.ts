import { localRecords } from "../local-records.ts";
import { data } from "../../shared/game.ts";
import { loadProfile } from "../profile.ts";
import { locale, number, t } from "../i18n.ts";
import { escape as e } from "./html.ts";
import { mountTeamRecords } from './team-records.ts';
import { defaultGameEndpoint } from '../deployment.ts';
import type { TeamBoardSelection } from '../team-records.ts';
import { expeditionText } from '../expedition-text.ts';
export function mountLeaderboards(host: HTMLElement, back: () => void, endpoint = defaultGameEndpoint, selection?: TeamBoardSelection) {
  let mode: string = selection?.mode ?? "short",
    difficulty = selection?.difficulty ?? "normal",
    online = Boolean(selection);
  const render = () => {
    const rows = localRecords(loadProfile(localStorage).runs, mode, difficulty);
    host.innerHTML =
      '<section class="records-page"><div class="section-heading"><h1 tabindex="-1">' +
      e(t("ui.leaderboards")) +
      '</h1><button id="records-back">' +
      e(t("ui.back")) +
      '</button></div><div class="records-tabs"><button id="records-local" aria-pressed="' +
      !online +
      '">' +
      e(t("ui.localPracticeRecords")) +
      '</button><button id="records-online" aria-pressed="' +
      online +
      '">' +
      e(t("ui.onlineBoards")) +
      '</button></div><p class="prototype-note">' +
      e(online ? t("ui.teamRecordScope") : expeditionText(locale,'deviceRecords')) +
      "</p>" +
      (online
        ? '<div id="team-records-content"></div>'
        : '<div class="records-filters"><label>' +
          e(t("ui.leaderboardMode")) +
          '<select id="records-mode">' +
          data.modes
            .map(
              (m) =>
                '<option value="' +
                m.id +
                '" ' +
                (m.id === mode ? "selected" : "") +
                ">" +
                e(t("mode." + m.id + ".name")) +
                "</option>",
            )
            .join("") +
          "</select></label><label>" +
          e(t("ui.leaderboardDifficulty")) +
          '<select id="records-difficulty">' +
          data.difficulties
            .map(
              (d) =>
                '<option value="' +
                d.id +
                '" ' +
                (d.id === difficulty ? "selected" : "") +
                ">" +
                e(t("difficulty." + d.id)) +
                "</option>",
            )
            .join("") +
          "</select></label></div><p>" +
          e(t("ui.leaderboardLocal")) +
          " · " +
          e(t("ui.leaderboardUnranked")) +
          "</p>" +
          (rows.length
            ? '<div class="records-scroll"><table><thead><tr><th>' +
              e(t("ui.leaderboardLocal")) +
              "</th><th>" +
              e(t("ui.chooseClass")) +
              "</th><th>" +
              e(t("ui.leaderboardEncounters")) +
              "</th><th>" +
              e(t("ui.leaderboardSurvival")) +
              "</th><th>" +
              e(t("ui.leaderboardDetails")) +
              "</th></tr></thead><tbody>" +
              rows
                .map(
                  (r, i) =>
                    "<tr><td>" +
                    number(i + 1) +
                    "</td><td>" +
                    e(t("class." + r.classId + ".name")) +
                    "</td><td>" +
                    number(r.clears) +
                    "</td><td><bdi>" +
                    number(Math.floor(r.combatTicks / 30 / 60)) +
                    ":" +
                    new Intl.NumberFormat(locale, {
                      minimumIntegerDigits: 2,
                      useGrouping: false,
                    }).format(Math.floor(r.combatTicks / 30) % 60) +
                    "</bdi></td><td><details><summary>" +
                    e(t("ui.leaderboardDetails")) +
                    "</summary><p>" +
                    r.bossIds
                      .map((id) => e(t("boss." + id + ".name")))
                      .join(" · ") +
                    "</p><small><bdi>" +
                    e(r.runId) +
                    "</bdi></small></details></td></tr>",
                )
                .join("") +
              "</tbody></table></div>"
            : "<p>" + e(t("ui.noLocalRecords")) + "</p>")) +
      "</section>";
    if (online) mountTeamRecords(host.querySelector<HTMLElement>('#team-records-content')!, endpoint, mode, difficulty, selection);
    host.querySelector<HTMLButtonElement>("#records-back")!.onclick = back;
    host.querySelector<HTMLButtonElement>("#records-local")!.onclick = () => {
      online = false;
      render();
    };
    host.querySelector<HTMLButtonElement>("#records-online")!.onclick = () => {
      online = true;
      render();
    };
    const m = host.querySelector<HTMLSelectElement>("#records-mode");
    if (m)
      m.onchange = () => {
        mode = m.value;
        render();
      };
    const d = host.querySelector<HTMLSelectElement>("#records-difficulty");
    if (d)
      d.onchange = () => {
        difficulty = d.value;
        render();
      };
  };
  render();
}
