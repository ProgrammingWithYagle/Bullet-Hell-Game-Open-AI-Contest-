import{sniperId}from'../../shared/soldier-sniper.ts';
import{sniperKitMarkup,sniperHudLabel}from'./sniper-controls.ts';
import{grenadierIds}from'../../shared/soldier-grenadier.ts';
import{grenadierKitMarkup,grenadierHudLabel}from'./grenadier-controls.ts';
import { marksmanId, marksmanIds } from "../../shared/soldier-marksman.ts";
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
  if(p.skills.includes(sniperId))return sniperKitMarkup(p,controls,open);
  if(p.skills.includes(grenadierIds.entry))return grenadierKitMarkup(p,controls,open);
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
    ...(p.skills.includes(ids.entry) || p.skills.includes(marksmanId)
      ? [
          {
            action: "technique1" as const,
            nameKey: "skill." + soldierActionId(p) + ".name",
            skill: soldierActionId(p),
          },
        ]
      : []),
    ...(p.skills.includes(marksmanId) && p.skills.includes(marksmanIds.pair)
      ? [
          {
            action: "technique2" as const,
            nameKey: "skill." + marksmanIds.pair + ".name",
            skill: marksmanIds.pair,
          },
        ]
      : []),
    ...(!p.skills.includes(marksmanId) && p.skills.includes(ids.drill)
      ? [
          {
            action: "technique2" as const,
            nameKey: "skill." + soldierLoadId(p) + ".name",
            skill: soldierLoadId(p),
          },
        ]
      : []),
  ];
  const help = p.skills.includes(marksmanId)
    ? t("ui.soldier.marksmanHelp")
    : p.skills.includes(ids.entry)
      ? t(
          p.skills.includes(ids.advance)
            ? "ui.soldier.advanceHelp"
            : p.skills.includes(ids.rear)
              ? "ui.soldier.rearHelp"
              : "ui.soldier.passingHelp",
        )
      : t("ui.soldier.kitHelp");
  const loadHelp =
    !p.skills.includes(marksmanId) && p.skills.includes(ids.drill)
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
        [marksmanIds.reserve, marksmanIds.relay, marksmanIds.twin]
          .filter((id) => p.skills.includes(id))
          .map(
            (id) =>
              " " +
              t("skill." + id + ".name") +
              ": " +
              t("skill." + id + ".description"),
          )
          .join("") +
        (p.skills.includes(marksmanIds.carom)
          ? " " + t("skill." + marksmanIds.carom + ".description")
          : p.skills.includes(marksmanIds.line)
            ? " " + t("skill." + marksmanIds.line + ".description")
            : "") +
        (p.skills.includes(marksmanIds.pair)
          ? " " + t("ui.soldier.pairHelp")
          : "") +
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
    "</ul>" +
    (p.skills.includes(marksmanIds.reserve)
      ? '<p data-reserve-control lang="en">' +
        e(actionLabel("reload")) +
        " " +
        bindingMarkup("reload", controls) +
        "</p>"
      : "") +
    "</details>"
  );
}

/** Owned HUD/touch labels use authority's clock and progress, including stop during recovery. */
export function soldierHudLabel(p: PlayerView, key: string, now: number) {
  if(p.skills.includes(sniperId)&&key==='technique1')return sniperHudLabel(p,now);
  if(p.skills.includes(grenadierIds.entry)&&key.startsWith("technique"))return grenadierHudLabel(p,key,now);
  if (key === "technique2" && p.skills.includes(marksmanIds.pair)) {
    const name = t("skill." + marksmanIds.pair + ".name"),
      until = p.kit.soldierPairUntil ?? 0;
    return (
      name +
      (p.ammo < 1
        ? " · " + t("ui.soldier.rejectAmmunition")
        : p.kit.soldierPairHeld
          ? " · " + t("ui.soldier.pairHeld")
          : until > now
            ? " · " +
              t("ui.soldier.pairOpening", {
                seconds: number(Number(((until - now) / 30).toFixed(1))),
              })
            : "")
    );
  }
  if (key === "technique1" && p.skills.includes(marksmanId)) {
    const name = t("skill." + marksmanId + ".name"),
      relay = p.kit.soldierRelayUntil ?? 0;
    if (relay > now && (p.kit.technique1At ?? 0) > now) {
      const twin = p.skills.includes(marksmanIds.twin);
      return (
        t("skill." + (twin ? marksmanIds.twin : marksmanIds.relay) + ".name") +
        " · " +
        (p.ammo < (p.kit.soldierBankAmmunition ?? 1)
          ? t(
              twin
                ? "ui.soldier.twinAmmunition"
                : "ui.soldier.rejectAmmunition",
            )
          : t("ui.soldier.relayShot", {
              seconds: number(Number(((relay - now) / 30).toFixed(1))),
            }))
      );
    }
    return (
      name +
      (p.ammo < 1
        ? " · " + t("ui.soldier.rejectAmmunition")
        : (p.kit.technique1At ?? 0) <= now && !p.kit.soldierBankBlocked
          ? " · " +
            t(
              p.skills.includes(marksmanIds.carom)
                ? "ui.soldier.caromReady"
                : p.skills.includes(marksmanIds.line)
                  ? "ui.soldier.lineReady"
                  : "ui.soldier.bankReady",
            )
          : "")
    );
  }
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
