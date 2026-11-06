import { sniperIds } from "../../shared/soldier-sniper.ts";
import type { PlayerView } from "../../shared/view.ts";
import type { ControlOptions } from "../input-bindings.ts";
import { bindingMarkup } from "./engineer-controls.ts";
import { actionLabel } from "./control-settings.ts";
import { escape as e } from "./html.ts";
import { t, locale, number } from "../i18n.ts";
export function sniperKitMarkup(
  p: PlayerView,
  controls: ControlOptions,
  open: boolean,
) {
  const rows = [
    ["q", "ability.soldier-q.name"],
    ["e", "ability.soldier-e.name"],
    ["ultimate", "ability.soldier-ultimate.name"],
    ["technique1", "skill.soldier-sniper-1.name"],
    ...(p.skills.includes(sniperIds.bore)
      ? [
          [
            "technique2",
            p.skills.includes(sniperIds.rest)
              ? "ui.sniper.restBoreName"
              : "skill." + sniperIds.bore + ".name",
          ] as const,
        ]
      : []),
    ...(p.skills.includes(sniperIds.clear)
      ? [["reload", "skill." + sniperIds.clear + ".name"] as const]
      : []),
  ] as const;
  return (
    '<details class="engineer-kit soldier-kit" data-class-kit data-soldier-kit' +
    (open ? " open" : "") +
    '><summary id="soldier-kit-controls"><span lang="' +
    e(locale) +
    '">' +
    e(t("ui.controls")) +
    "</span><small>" +
    e(t("ui.equipped")) +
    '</small></summary><p lang="en" dir="ltr">' +
    e(
      t(
        p.skills.includes(sniperIds.carry)
          ? "ui.sniper.carryHelp"
          : p.skills.includes(sniperIds.clear)
            ? "ui.sniper.clearHelp"
            : "ui.sniper.help",
      ),
    ) +
    (p.skills.includes(sniperIds.bore)
      ? " " + e(t("ui.sniper.boreHelp"))
      : "") +
    (p.skills.includes(sniperIds.rest)
      ? " " + e(t("ui.sniper.restHelp"))
      : "") +
    "</p><ul>" +
    rows
      .map(
        ([action, key]) =>
          '<li data-kit-action="' +
          action +
          '"><span class="engineer-kit-slot">' +
          e(actionLabel(action)) +
          '</span><strong lang="' +
          (action === "technique1" ||
          action === "technique2" ||
          action === "reload"
            ? "en"
            : e(locale)) +
          '">' +
          e(t(key)) +
          "</strong><div>" +
          bindingMarkup(action, controls) +
          "</div></li>",
      )
      .join("") +
    "</ul></details>"
  );
}
export function sniperHudLabel(p: PlayerView, now: number, bore = false) {
  if (bore && !p.kit.sniperPrepared && p.skills.includes(sniperIds.rest))
    return t(
      (p.kit.sniperRestUntil ?? 0) > now
        ? "ui.sniper.recallRest"
        : "ui.sniper.placeRest",
    );
  if (bore && !p.kit.sniperPrepared) return t("ui.sniper.boreAwait");
  if (
    !bore &&
    !p.kit.sniperPrepared &&
    p.kit.sniperRestReady &&
    Math.hypot(
      p.x - (p.kit.sniperRestX ?? 0),
      p.y - (p.kit.sniperRestY ?? 0),
    ) <= 6 &&
    Math.abs(
      Math.atan2(
        Math.sin(p.aim - (p.kit.sniperRestAim ?? 0)),
        Math.cos(p.aim - (p.kit.sniperRestAim ?? 0)),
      ),
    ) <=
      Math.PI / 15
  )
    return t("ui.sniper.claimRest");
  const settling = (p.kit.sniperReadyAt ?? 0) > now,
    target = settling ? p.kit.sniperReadyAt! : p.kit.sniperUntil!;
  return (p.kit.sniperUntil ?? 0) > now
    ? t(settling ? "ui.sniper.settling" : "ui.sniper.release", {
        seconds: number(Math.ceil(Math.max(0, target - now) / 3) / 10),
      })
    : t("ui.sniper.prepare");
}
