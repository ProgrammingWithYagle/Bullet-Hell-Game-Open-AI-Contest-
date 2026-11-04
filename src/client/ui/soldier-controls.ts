import { data } from "../../shared/game.ts";
import type { PlayerView } from "../../shared/view.ts";
import { skirmisherIds as ids } from "../../shared/soldier-skirmisher.ts";
import { soldierActionId } from "../soldier-actions.ts";
import type { ControlOptions } from "../input-bindings.ts";
import { actionLabel } from "./control-settings.ts";
import { bindingMarkup } from "./engineer-controls.ts";
import { locale, t } from "../i18n.ts";
import { escape as e } from "./html.ts";
export function soldierKitMarkup(
  p: PlayerView,
  controls: ControlOptions,
  open: boolean,
) {
  if (p.classId !== "soldier" || p.training) return "";
  const cl = data.classes.find((c) => c.id === "soldier")!;
  const rows = [
    {
      action: "q" as const,
      nameKey: "ability." + cl.abilities[0].id + ".name",
    },
    {
      action: "e" as const,
      nameKey: "ability." + cl.abilities[1].id + ".name",
    },
    {
      action: "ultimate" as const,
      nameKey: "ability." + cl.ultimate.id + ".name",
    },
    ...(p.skills.includes(ids.entry)
      ? [
          {
            action: "technique1" as const,
            nameKey: "skill." + soldierActionId(p) + ".name",
            skill: soldierActionId(p),
          },
        ]
      : []),
  ];
  const help = p.skills.includes(ids.entry)
    ? t(
        p.skills.includes(ids.advance)
          ? "ui.soldier.advanceHelp"
          : p.skills.includes(ids.rear)
            ? "ui.soldier.rearHelp"
            : "ui.soldier.passingHelp",
      )
    : t("ui.soldier.kitHelp");
  return (
    '<details class="engineer-kit soldier-kit" data-class-kit data-soldier-kit' +
    (open ? " open" : "") +
    '><summary id="soldier-kit-controls"><span lang="' +
    e(locale) +
    '" dir="auto">' +
    e(t("ui.controls")) +
    '</span><small lang="' +
    e(locale) +
    '" dir="auto">' +
    e(t("ui.equipped")) +
    '</small></summary><p lang="en" dir="ltr">' +
    e(help) +
    "</p><ul>" +
    rows
      .map(
        (row) =>
          '<li data-kit-action="' +
          row.action +
          '"' +
          ("skill" in row ? ' data-skill="' + e(String(row.skill)) + '"' : "") +
          '><span class="engineer-kit-slot" lang="' +
          e(locale) +
          '" dir="auto">' +
          e(actionLabel(row.action)) +
          '</span><strong lang="' +
          e("skill" in row ? "en" : locale) +
          '" dir="auto">' +
          e(t(row.nameKey)) +
          "</strong><div>" +
          bindingMarkup(row.action, controls) +
          "</div></li>",
      )
      .join("") +
    "</ul></details>"
  );
}
