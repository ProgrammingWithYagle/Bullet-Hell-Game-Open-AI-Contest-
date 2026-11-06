import { data } from "../../shared/game.ts";
import type { PlayerView } from "../../shared/view.ts";
import { engineerQNameKey } from "../../shared/engineer-pathways.ts";
import { machineryIds } from "../../shared/engineer-machinery.ts";
import { trapIds } from "../../shared/engineer-traps.ts";
import { builderIds } from "../../shared/engineer-builder.ts";
import { engineerActions } from "../engineer-actions.ts";
import type { ControlOptions } from "../input-bindings.ts";
import { actionLabel, bindingLabel } from "./control-settings.ts";
import { locale, number, t } from "../i18n.ts";
import { profileText } from "../profile-text.ts";
import { escape as e } from "./html.ts";

type KitAction = "q" | "e" | "ultimate" | "technique1" | "technique2" | "reload";
// These are affected inputs, not an inference from a technique's visual frame.
// Breach Casings also works when a placed charge triggers without remote input.
const controlsByTechnique: Record<string, readonly KitAction[]> = {
  'soldier-sniper-1':['technique1'],'soldier-sniper-bore-1':['technique1','technique2'],'soldier-sniper-rest-1':['technique1','technique2'],'soldier-sniper-carry-1':['technique1'],'soldier-sniper-clear-1':['technique1','reload'],
  'soldier-grenadier-1':['technique1'],'soldier-grenadier-skim-1':['technique1','technique2'],'soldier-grenadier-contact-1':['technique1','technique2'],'soldier-grenadier-pitch-1':['technique2'],'soldier-grenadier-pin-1':['reload','technique1'],'soldier-grenadier-sling-1':['e','technique1'],'soldier-grenadier-kick-1':['technique2'],'soldier-grenadier-return-1':['technique1'],
  'soldier-marksman-1':['technique1'],
  'soldier-marksman-carom-1':['technique1','technique2'],
  'soldier-marksman-line-1':['technique1','technique2'],
  'soldier-marksman-pair-1':['technique2'],
  'soldier-marksman-reserve-1':['reload','technique2'],
  'soldier-marksman-relay-1':['technique2','technique1'],
  'soldier-marksman-twin-1':['technique1'],
  'soldier-skirmisher-1':['e','technique1'],
  'soldier-skirmisher-advance-1':['technique1'],
  'soldier-skirmisher-rear-1':['technique1'],
  'soldier-skirmisher-drill-1':['technique2'],
  'soldier-skirmisher-roving-1':['technique2','e','technique1'],
  'soldier-skirmisher-ready-1':['technique2','technique1','e'],
  'soldier-skirmisher-volley-1':['technique2','technique1','e'],
  "engineer-machinery-1": ["q"],
  [machineryIds.anchor]: ["q"],
  [machineryIds.survey]: ["q"],
  [machineryIds.coil]: ["technique1"],
  [machineryIds.prism]: ["technique1"],
  [machineryIds.salvage]: ["technique2"],
  [machineryIds.convergence]: ["technique1"],
  "engineer-traps-1": ["q"],
  [trapIds.wire]: ["q"],
  [trapIds.switch]: ["q"],
  [trapIds.key]: ["technique1"],
  [trapIds.casings]: ["q", "technique1"],
  [trapIds.haul]: ["technique2"],
  [trapIds.corridor]: ["technique1"],
  [builderIds.entry]: ["q"],
  [builderIds.longspan]: ["q"],
  [builderIds.wings]: ["q"],
  [builderIds.hinge]: ["technique1"],
  [builderIds.repair]: ["technique2"],
  [builderIds.linked]: ["q"],
  [builderIds.survey]: ["technique1"],
  [builderIds.redoubt]: ["ultimate"],
};
export const techniqueControlSlots = (id: string) =>
  controlsByTechnique[id] ?? [];
export const techniqueSlotLabel = (slot: KitAction) =>
  slot === "q"
    ? "Q"
    : t(
        slot === "e"
          ? "ui.abilityE"
          : slot === "ultimate"
            ? "ui.pathwayUltimate"
            : slot === "technique1"
              ? "ui.pathwayAction1"
              : "ui.pathwayAction2",
      );

export function bindingMarkup(action: KitAction, controls: ControlOptions) {
  const keys = controls.bindings[action]
    .map((code) => '<kbd dir="auto">' + e(bindingLabel(code)) + "</kbd>")
    .join(" / ");
  return (
    '<span class="pathway-binding" lang="' +
    e(locale) +
    '" dir="auto"><span>' +
    e(profileText(locale, "keyboard")) +
    "</span> " +
    keys +
    "</span>" +
    '<span class="pathway-binding" lang="' +
    e(locale) +
    '" dir="auto"><span>' +
    e(profileText(locale, "pad")) +
    '</span> <kbd dir="ltr">' +
    number(controls.gamepad[action]) +
    "</kbd></span>"
  );
}

export function techniqueControlsMarkup(id: string, controls: ControlOptions) {
  const slots = techniqueControlSlots(id);
  if (!slots.length) return "";
  return (
    '<section class="pathway-controls" aria-label="' +
    e(t("ui.controls")) +
    '"><h4 lang="' +
    e(locale) +
    '" dir="auto">' +
    e(t("ui.controls")) +
    "</h4><ul>" +
    slots
      .map(
        (action) =>
          '<li data-technique-control="' +
          action +
          '"><strong lang="' +
          e(locale) +
          '" dir="auto">' +
          e(actionLabel(action)) +
          "</strong><div>" +
          bindingMarkup(action, controls) +
          "</div></li>",
      )
      .join("") +
    "</ul></section>"
  );
}

export function engineerKitMarkup(
  p: PlayerView,
  controls: ControlOptions,
  open: boolean,
) {
  if (p.classId !== "engineer" || p.training) return "";
  const cl = data.classes.find((c) => c.id === "engineer")!,
    q = engineerQNameKey(p),
    redoubt = p.skills.includes(builderIds.redoubt);
  const rows: { action: KitAction; nameKey: string; skill?: string }[] = [
    {
      action: "q",
      nameKey: q
        ? "skill." + q + ".name"
        : "ability." + cl.abilities[0].id + ".name",
      skill: q,
    },
    { action: "e", nameKey: "ability." + cl.abilities[1].id + ".name" },
    {
      action: "ultimate",
      nameKey: redoubt
        ? "skill." + builderIds.redoubt + ".name"
        : "ability." + cl.ultimate.id + ".name",
      skill: redoubt ? builderIds.redoubt : undefined,
    },
    // The combat HUD determines ownership and late evolution names as well.
    ...engineerActions(p, [], 0).extras.map((a) => ({
      action: a.key,
      nameKey: "skill." + a.id + ".name",
      skill: a.id,
    })),
  ];
  return (
    '<details class="engineer-kit" data-class-kit data-engineer-kit' +
    (open ? " open" : "") +
    '><summary id="engineer-kit-controls"><span lang="' +
    e(locale) +
    '" dir="auto">' +
    e(t("ui.controls")) +
    '</span><small lang="' +
    e(locale) +
    '" dir="auto">' +
    e(t("ui.equipped")) +
    "</small></summary><ul>" +
    rows
      .map(
        (row) =>
          '<li data-kit-action="' +
          row.action +
          '"' +
          (row.skill ? ' data-skill="' + e(row.skill) + '"' : "") +
          '><span class="engineer-kit-slot" lang="' +
          e(locale) +
          '" dir="auto">' +
          e(actionLabel(row.action)) +
          '</span><strong lang="' +
          e(row.skill ? "en" : locale) +
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
