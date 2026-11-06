import type { PlayerView } from "../../shared/view.ts";
import { grenadierIds as ids } from "../../shared/soldier-grenadier.ts";
import type { ControlOptions } from "../input-bindings.ts";
import { t, locale, number } from "../i18n.ts";
import { escape as e } from "./html.ts";
import { actionLabel } from "./control-settings.ts";
import { bindingMarkup } from "./engineer-controls.ts";
export function grenadierKitMarkup(
  p: PlayerView,
  controls: ControlOptions,
  open: boolean,
) {
  const rows = [
    { action: "q" as const, key: "ability.soldier-q.name" },
    { action: "e" as const, key: "ability.soldier-e.name" },
    { action: "ultimate" as const, key: "ability.soldier-ultimate.name" },
    { action: "technique1" as const, key: "skill." + ids.entry + ".name" },
    ...(p.skills.includes(ids.pitch)
      ? [{ action: "technique2" as const, key: "skill." + ids.pitch + ".name" }]
      : []),
  ];
  const help =
    t("ui.grenadier.help") +
    " " +
    Object.values(ids)
      .filter((id) => id !== ids.entry && p.skills.includes(id))
      .map(
        (id) =>
          t("skill." + id + ".name") + ": " + t("skill." + id + ".description"),
      )
      .join(" ");
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
    e(help) +
    "</p><ul>" +
    rows
      .map(
        (row) =>
          '<li data-kit-action="' +
          row.action +
          '"><span class="engineer-kit-slot">' +
          e(actionLabel(row.action)) +
          '</span><strong lang="' +
          (row.action.startsWith("technique") ? "en" : e(locale)) +
          '">' +
          e(t(row.key)) +
          "</strong><div>" +
          bindingMarkup(row.action, controls) +
          "</div></li>",
      )
      .join("") +
    "</ul>" +
    (p.skills.includes(ids.pin)
      ? '<p data-grenadier-pin-control lang="en">' +
        e(t("skill." + ids.pin + ".name")) +
        " " +
        bindingMarkup("reload", controls) +
        "</p>"
      : "") +
    "</details>"
  );
}
export function grenadierHudLabel(p: PlayerView, key: string, now: number) {
  const seconds = (until: number) =>
      number(Number(((until - now) / 30).toFixed(1))),
    kit = p.kit;
  if (key === "technique1")
    return (
      t("skill." + ids.entry + ".name") +
      (kit.grenadierPinnedUntil! > now
        ? " · " +
          t("ui.grenadier.pinned", {
            seconds: seconds(kit.grenadierPinnedUntil!),
          })
        : kit.grenadierHolding
          ? " · " +
            t("ui.grenadier.fuse", {
              seconds: seconds(kit.grenadierFuseUntil!),
            })
          : kit.grenadierCanCatch
            ? " · " + t("ui.grenadier.catch")
            : !kit.grenadierBlocked && (kit.technique1At ?? 0) <= now
              ? " · " + t("ui.grenadier.prime")
              : "")
    );
  return (
    t("skill." + ids.pitch + ".name") +
    (kit.grenadierCanKick
      ? " · " + t("ui.grenadier.kick")
      : kit.grenadierHolding
        ? " · " +
          t("ui.grenadier.short", { seconds: seconds(kit.grenadierFuseUntil!) })
        : "")
  );
}
