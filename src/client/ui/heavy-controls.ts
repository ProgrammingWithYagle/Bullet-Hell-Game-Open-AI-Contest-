import{lineworkIds}from'../../shared/heavy-linework.ts';
import { postedBState } from "../heavy-post-state.ts";
import {
  lanyardId,
  traverseIds,
  clutchId,
  keyedId,
  openId,
  heavyTraverseRules,
} from "../../shared/heavy-traverse.ts";
import { seamId } from "../../shared/heavy-seam.ts";
import { data } from "../../shared/game.ts";
import { flakIds } from "../../shared/heavy-flak.ts";
import type { PlayerView } from "../../shared/view.ts";
import type { ControlOptions } from "../input-bindings.ts";
import { bindingMarkup } from "./engineer-controls.ts";
import { actionLabel } from "./control-settings.ts";
import { escape as e } from "./html.ts";
import { locale, number, t } from "../i18n.ts";
type KitAction = "q" | "e" | "ultimate" | "technique1" | "technique2" | "technique3";
export function heavyKitMarkup(
  p: PlayerView,
  controls: ControlOptions,
  open: boolean,
) {
  if (p.classId !== "heavy" || p.training) return "";
  const lineworkOwned=p.skills.includes(lineworkIds.entry);
  const postOwned = [traverseIds.entry, clutchId, lanyardId].every(id => p.skills.includes(id));
  const cl = data.classes.find((c) => c.id === "heavy")!,
    rows: { action: KitAction; key: string }[] = [
      { action: "q", key: "ability." + cl.abilities[0].id + ".name" },
      { action: "e", key: "ability." + cl.abilities[1].id + ".name" },
      { action: "ultimate", key: "ability." + cl.ultimate.id + ".name" },
      ...(lineworkOwned || p.skills.includes(traverseIds.entry) ||
      p.skills.includes(flakIds.entry)
        ? [
            {
              action: "technique1" as const,
              key: lineworkOwned?"ui.heavy.lineworkAction":p.skills.includes(traverseIds.entry)
                ? "ui.heavy.traverseAction"
                : p.skills.includes(seamId)
                  ? "ui.heavy.seamAction"
                  : "skill." + flakIds.entry + ".name",
            },
          ]
        : []),
      ...(lineworkOwned || p.skills.includes(clutchId) || p.skills.includes(flakIds.command)
        ? [
            {
              action: "technique2" as const,
              key: lineworkOwned?"ui.heavy.lineworkDrive":p.skills.includes(clutchId)
                ? postOwned
                  ? "skill." + lanyardId + ".name"
                  : p.skills.includes(keyedId)
                  ? "skill." + keyedId + ".name"
                  : p.skills.includes(openId)
                    ? "skill." + openId + ".name"
                    : "ui.heavy.clutchAction"
                : "skill." +
                  (p.skills.includes(flakIds.running)
                    ? flakIds.running
                    : p.skills.includes(flakIds.hanging)
                      ? flakIds.hanging
                      : flakIds.command) +
                  ".name",
            },
          ]
        : []),
      ...(lineworkOwned && p.skills.includes(lineworkIds.reserve)
        ? [{ action: "technique3" as const, key: "ui.heavy.reserveAction" }]
        : lineworkOwned && p.skills.includes(lineworkIds.guide)
          ? [{ action: "technique3" as const, key: "ui.heavy.guideAction" }]
          : []),
    ];
  const help = (
    lineworkOwned?[t("ui.heavy.lineworkHelp"),t(p.skills.includes(lineworkIds.yoke)?"ui.heavy.lineworkYokeHelp":p.skills.includes(lineworkIds.sheave)?"ui.heavy.lineworkSheaveHelp":"ui.heavy.lineworkBareHelp"),p.skills.includes(lineworkIds.reserve)?t("ui.heavy.reserveHelp"):p.skills.includes(lineworkIds.guide)?t("ui.heavy.guideHelp"):""]:postOwned ? [
      t("ui.heavy.lanyardHelp"),
      t(p.skills.includes(traverseIds.spade) ? "ui.heavy.lanyardSpadeHelp" : p.skills.includes(traverseIds.floating) ? "ui.heavy.lanyardFloatingHelp" : "ui.heavy.lanyardLooseHelp"),
      t(p.skills.includes(keyedId) ? "ui.heavy.lanyardKeyedHelp" : p.skills.includes(openId) ? "ui.heavy.lanyardOpenHelp" : "ui.heavy.lanyardPlainHelp"),
    ] :
    p.skills.includes(traverseIds.entry)
      ? [
          t("ui.heavy.traverseHelp"),
          p.skills.includes(traverseIds.spade)
            ? t("skill." + traverseIds.spade + ".description")
            : p.skills.includes(traverseIds.floating)
              ? t("skill." + traverseIds.floating + ".description")
              : "",
          p.skills.includes(clutchId)
            ? t(
                p.skills.includes(keyedId)
                  ? "ui.heavy.keyedHelp"
                  : p.skills.includes(openId)
                    ? "ui.heavy.openHelp"
                    : "ui.heavy.clutchHelp",
              )
            : "",
        ]
      : [
          t("ui.heavy.flakHelp"),
          p.skills.includes(seamId) ? t("ui.heavy.seamHelp") : "",
          p.skills.includes(flakIds.compact)
            ? t("skill." + flakIds.compact + ".description")
            : p.skills.includes(flakIds.frontal)
              ? t("skill." + flakIds.frontal + ".description")
              : "",
          p.skills.includes(flakIds.running)
            ? t("skill." + flakIds.running + ".description")
            : p.skills.includes(flakIds.hanging)
              ? t("skill." + flakIds.hanging + ".description")
              : p.skills.includes(flakIds.command)
                ? t("ui.heavy.commandHelp")
                : "",
        ]
  )
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
  slot: "technique1" | "technique2" | "technique3",
  now: number,
) {
  if(p.skills.includes(lineworkIds.entry)){
    if (slot === 'technique3') {
      const line = p.kit.lineworkConnection;
      if (!line || now >= line.until) return t('ui.heavy.reserveNeedsAnchor');
      if (p.skills.includes(lineworkIds.guide)) {
        if (line.guide) return t(p.kit.lineworkGuideBlocked ? 'ui.heavy.guideApproach' : 'ui.heavy.guideRedirect');
        if (line.guideUsed) return t('ui.heavy.guideSpent');
        if (line.active) return t('ui.heavy.guideBrake');
        return t(p.kit.lineworkGuideBlocked ? 'ui.heavy.guideAim' : 'ui.heavy.guideSet');
      }
      if (line.reserveFlight !== undefined) return t('ui.heavy.reserveWaiting');
      if (line.reserve) return t(line.active ? 'ui.heavy.reserveBrake' : 'ui.heavy.reserveSelect');
      if (line.reserveSpent) return t('ui.heavy.reserveSpent');
      return t(line.active ? 'ui.heavy.reserveBrake' : 'ui.heavy.reserveCast');
    }
    if(slot==='technique1')return(p.kit.lineworkFlight??0)>0||(p.kit.lineworkUntil??0)>now?t('ui.heavy.lineworkRelease'):t('skill.'+lineworkIds.entry+'.name');
    const guide = p.kit.lineworkConnection?.guide;
    if (guide && !p.kit.lineworkActive && p.kit.lineworkCommandBlocked)
      return t('ui.heavy.guideRedirectFirst');
    return(p.kit.lineworkUntil??0)>now?t(p.kit.lineworkActive?'ui.heavy.lineworkBrake':'ui.heavy.lineworkEngage'):(p.kit.lineworkFlight??0)>0?t('ui.heavy.lineworkWaiting'):t('ui.heavy.lineworkIdle');
  }
  const post = postedBState(p, now);
  if (slot === "technique2" && post) return t("ui.heavy.lanyard" + post.kind[0].toUpperCase() + post.kind.slice(1), { slots: number(post.remaining) });
  if (slot === "technique1" && post?.kind === "posted") return t("ui.heavy.lanyardRemaining", { slots: number(post.remaining) });
  if (
    slot === "technique2" &&
    p.skills.includes(clutchId) &&
    (p.kit.heavyTraverseUntil ?? 0) > now
  ) {
    if (
      p.kit.heavyClutchLifted &&
      (p.skills.includes(keyedId) || p.skills.includes(openId))
    )
      return t(
        p.skills.includes(keyedId)
          ? "ui.heavy.keyedEngage"
          : "ui.heavy.openEngage",
        { slots: number(p.kit.heavyClutchSlotsRemaining ?? 0) },
      );
    if (p.kit.heavyClutchUsed && p.skills.includes(keyedId))
      return t("ui.heavy.keyedSpent");
  }
  if (
    slot === "technique1" &&
    p.skills.includes(openId) &&
    p.kit.heavyClutchUsed &&
    (p.kit.heavyTraverseUntil ?? 0) > now
  )
    return t("ui.heavy.handlingFeedRemaining", {
      rounds: number(p.kit.heavyTraverseRounds ?? 0),
      converted: number(p.kit.heavyClutchConverted ?? 0),
      lost: number(
        Math.max(
          0,
          (p.kit.heavyClutchForfeited ?? 0) - (p.kit.heavyClutchConverted ?? 0),
        ),
      ),
    });
  if (slot === "technique2" && p.skills.includes(clutchId))
    return (p.kit.heavyTraverseUntil ?? 0) <= now
      ? t("ui.heavy.clutchIdle")
      : p.kit.heavyClutchLifted
        ? t("ui.heavy.clutchEngage", {
            slots: number(p.kit.heavyClutchSlotsRemaining ?? 0),
          })
        : p.kit.heavyClutchUsed
          ? t("ui.heavy.clutchSpent")
          : t("ui.heavy.clutchLift");
  if (
    slot === "technique1" &&
    p.skills.includes(clutchId) &&
    (p.kit.heavyTraverseUntil ?? 0) > now &&
    (p.kit.heavyClutchForfeited ?? 0) > 0
  )
    return t("ui.heavy.clutchFeedRemaining", {
      rounds: number(p.kit.heavyTraverseRounds ?? 0),
      lost: number(p.kit.heavyClutchForfeited ?? 0),
    });
  if (slot === "technique1" && p.skills.includes(traverseIds.entry))
    return (p.kit.heavyTraverseUntil ?? 0) > now
      ? t("ui.heavy.traverseRemaining", {
          rounds: number(p.kit.heavyTraverseRounds ?? 0),
          maximum: number(heavyTraverseRules.rounds),
        })
      : t("skill." + traverseIds.entry + ".name");
  if (slot === "technique1") {
    if (p.skills.includes(seamId) && (p.kit.heavyFlakUntil ?? 0) > now)
      return t(
        p.kit.heavyFlakSeamBroken
          ? "ui.heavy.seamBroken"
          : "ui.heavy.seamRemaining",
        {
          seconds: number(
            Math.ceil(((p.kit.heavyFlakUntil ?? 0) - now) / 3) / 10,
          ),
        },
      );
    return t("skill." + flakIds.entry + ".name");
  }
  const until = p.kit.heavyFlakUntil ?? 0;
  const name = p.skills.includes(flakIds.running)
    ? flakIds.running
    : p.skills.includes(flakIds.hanging)
      ? flakIds.hanging
      : flakIds.command;
  const label =
    name === flakIds.running
      ? (p.kit.heavyFlakRunningAt ?? 0) > 0
        ? "ui.heavy.runningSpent"
        : "ui.heavy.runningRemaining"
      : name === flakIds.hanging
        ? (p.kit.heavyFlakParkedAt ?? 0) > 0
          ? "ui.heavy.heldRemaining"
          : "ui.heavy.arrestRemaining"
        : "ui.heavy.commandRemaining";
  return until > now
    ? t(label, {
        seconds: number(Math.ceil((until - now) / 3) / 10),
      })
    : t("skill." + name + ".name");
}
