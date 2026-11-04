import { data } from "../../shared/game.ts";
import type { PlayerView } from "../../shared/view.ts";
import { skirmisherIds as ids } from "../../shared/soldier-skirmisher.ts";
import {
  soldierActionId,
  soldierLoadId,
  soldierPaidStepAvailable,
} from "../soldier-actions.ts";
import type { ControlOptions } from "../input-bindings.ts";
import { actionLabel } from "./control-settings.ts";
import { bindingMarkup } from "./engineer-controls.ts";
import { locale, number, t } from "../i18n.ts";
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
    ...(p.skills.includes(ids.drill)
      ? [
          {
            action: "technique2" as const,
            nameKey: "skill." + soldierLoadId(p) + ".name",
            skill: soldierLoadId(p),
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
  const loadHelp = p.skills.includes(ids.drill)
    ? " " +
      t(
        p.skills.includes(ids.roving)
          ? "ui.soldier.rovingHelp"
          : "ui.soldier.drillHelp",
      )
    : "";
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
    e(
      help +
        loadHelp +
        (p.skills.includes(ids.volley)
          ? " " + t("ui.soldier.volleyHelp")
          : p.skills.includes(ids.ready)
            ? " " + t("ui.soldier.readyHelp")
            : ""),
    ) +
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

/** Owned HUD/touch labels use authority's clock and progress, including stop during recovery. */
export function soldierHudLabel(p: PlayerView, key: string, now: number) {
  if (key === "technique2") {
    const name = t("skill." + soldierLoadId(p) + ".name");
    return (
      name +
      ((p.kit.soldierLoadUntil ?? 0) > now
        ? " · " +
          t("ui.soldier.loading", {
            loaded: number(p.kit.soldierLoadInserted ?? 0),
            total: number(p.kit.soldierLoadTotal ?? 0),
            seconds: number(
              Number(
                (
                  Math.max(0, (p.kit.soldierLoadNextAt ?? now) - now) / 30
                ).toFixed(1),
              ),
            ),
          })
        : "")
    );
  }
  const name = t("skill." + soldierActionId(p) + ".name"),
    window = p.kit.soldierFollowupUntil ?? 0,
    recovery = p.kit.technique1At ?? 0;
  if ((p.kit.soldierStepUntil ?? 0) > now) return name;
  if (
    (p.kit.soldierStepRejectUntil ?? 0) > now &&
    p.kit.soldierStepRejectReason
  )
    return (
      name +
      " · " +
      t(
        {
          ground: "ui.soldier.rejectGround",
          direction: "ui.soldier.rejectDirection",
          ammunition: "ui.soldier.rejectAmmunition",
        }[p.kit.soldierStepRejectReason],
      )
    );
  if (window > now && recovery <= now)
    return (
      name +
      " · " +
      t("ui.soldier.opening", {
        seconds: number(Number(((window - now) / 30).toFixed(1))),
      })
    );
  if (soldierPaidStepAvailable(p, now))
    return (
      name +
      " · " +
      t(
        p.kit.soldierReadyRelay
          ? "ui.soldier.relayOpening"
          : "ui.soldier.paidOpening",
        {
          seconds: number(
            Number(((p.kit.soldierReadyUntil! - now) / 30).toFixed(1)),
          ),
        },
      )
    );
  return name;
}
