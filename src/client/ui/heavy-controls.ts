import { data } from "../../shared/game.ts";
import { flakIds } from "../../shared/heavy-flak.ts";
import type { PlayerView } from "../../shared/view.ts";
import type { ControlOptions } from "../input-bindings.ts";
import { bindingMarkup } from "./engineer-controls.ts";
import { actionLabel } from "./control-settings.ts";
import { escape as e } from "./html.ts";
import { locale, number, t } from "../i18n.ts";
type KitAction = "q" | "e" | "ultimate" | "technique1" | "technique2";
export function heavyKitMarkup(
  p: PlayerView,
  controls: ControlOptions,
  open: boolean,
) {
  if (p.classId !== "heavy" || p.training) return "";
  const cl = data.classes.find((c) => c.id === "heavy")!,
    rows: { action: KitAction; key: string }[] = [
      { action: "q", key: "ability." + cl.abilities[0].id + ".name" },
      { action: "e", key: "ability." + cl.abilities[1].id + ".name" },
      { action: "ultimate", key: "ability." + cl.ultimate.id + ".name" },
      ...(p.skills.includes(flakIds.entry)
        ? [
            {
              action: "technique1" as const,
              key: "skill." + flakIds.entry + ".name",
            },
          ]
        : []),
      ...(p.skills.includes(flakIds.command)
        ? [
            {
              action: "technique2" as const,
              key: "skill." + flakIds.command + ".name",
            },
          ]
        : []),
    ];
  const help = [
    t("ui.heavy.flakHelp"),
    p.skills.includes(flakIds.compact)
      ? t("skill." + flakIds.compact + ".description")
      : p.skills.includes(flakIds.frontal)
        ? t("skill." + flakIds.frontal + ".description")
        : "",
    p.skills.includes(flakIds.command) ? t("ui.heavy.commandHelp") : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    '<details class="engineer-kit heavy-kit" data-class-kit data-heavy-kit' +
    (open ? " open" : "") +
    '><summary id="heavy-kit-controls"><span lang="' +
    e(locale) +
    '">' +
    e(t("ui.controls")) +
    "</span><small>" +
    e(t("ui.equipped")) +
    '</small></summary><p lang="en" dir="ltr">' +
    e(help) +
    "</p><ul>" +
    rows
      .map(
        ({ action, key }) =>
          '<li data-kit-action="' +
          action +
          '"><span class="engineer-kit-slot">' +
          e(actionLabel(action)) +
          '</span><strong lang="' +
          e(locale) +
          '" dir="auto">' +
          e(t(key)) +
          "</strong>" +
          bindingMarkup(action, controls) +
          "</li>",
      )
      .join("") +
    "</ul></details>"
  );
}
export function heavyHudLabel(
  p: PlayerView,
  slot: "technique1" | "technique2",
  now: number,
) {
  if (slot === "technique1") return t("skill." + flakIds.entry + ".name");
  const until = p.kit.heavyFlakUntil ?? 0;
  return until > now
    ? t("ui.heavy.commandRemaining", {
        seconds: number(Math.ceil((until - now) / 3) / 10),
      })
    : t("skill." + flakIds.command + ".name");
}
