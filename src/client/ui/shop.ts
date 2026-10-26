import {
  skillMapLayout,
  skillMapMarkup,
  prepareSkillMap,
  clampMapZoom,
  mapZoomScroll,
} from "./skill-map.ts";
import { data } from "../../shared/game.ts";
import type { Command } from "../../shared/protocol.ts";
import type { PlayerView } from "../../shared/view.ts";
import { t, number } from "../i18n.ts";
import { effectText, supplyText } from "../content-text.ts";
import { escape as e } from "./html.ts";
import { icon, effectIcon } from "./icons.ts";
import { assets } from "../assets.ts";
type Kind = Command["kind"];
let mapZoom = 1;
const itemArt = (kind: Kind, id: string, glyph: string) =>
  (
    kind === "upgrade"
      ? assets.upgrades[id]
      : assets.items[
          kind +
            "/" +
            (kind === "skill"
              ? data.skills.find((s) => s.id === id)?.subbranchId
              : id)
        ]
  )
    ? `<img class="item-art" src="${kind === "upgrade" ? assets.upgrades[id] : assets.items[kind + "/" + (kind === "skill" ? data.skills.find((s) => s.id === id)?.subbranchId : id)]}" alt="" aria-hidden="true">`
    : icon(glyph);
let tab: "gear" | "tree" = "tree",
  branchId = "",
  chosen: { kind: Kind; id: string } | null = null;
function skillsOf(p: PlayerView) {
  return data.skills.filter((s) => s.classId === p.classId);
}
function canBuy(
  p: PlayerView,
  kind: Kind,
  id: string,
): { allowed: boolean; reason: string; price: number } {
  if (kind === "skill") {
    const node = skillsOf(p).find((s) => s.id === id)!;
    if (p.skills.includes(id))
      return { allowed: false, reason: t("ui.owned"), price: node.cost };
    if (node.prerequisite && !p.skills.includes(node.prerequisite))
      return {
        allowed: false,
        reason: t("ui.prerequisite", {
          name: t("skill." + node.prerequisite + ".name"),
        }),
        price: node.cost,
      };
    if (
      node.capstone &&
      p.skills.some((id) => data.skills.find((s) => s.id === id)?.capstone)
    )
      return {
        allowed: false,
        reason: t("ui.capstoneLimit"),
        price: node.cost,
      };
    return {
      allowed: p.sp >= node.cost,
      reason:
        p.sp < node.cost
          ? t("ui.skillPoints") +
            ": " +
            number(p.sp) +
            " / " +
            number(node.cost)
          : "",
      price: node.cost,
    };
  }
  if (kind === "weapon") {
    const w = data.weapons.find((w) => w.id === id)!;
    return {
      allowed: p.weapon !== id && p.coins >= w.price,
      reason:
        p.weapon === id
          ? t("ui.equipped")
          : p.coins < w.price
            ? t("ui.notEnoughCoins")
            : "",
      price: w.price,
    };
  }
  if (kind === "supply") {
    const item = data.supplies.find((s) => s.id === id)!;
    const slot =
      p.supplies.find((s) => s.id === id) ?? p.supplies.find((s) => !s.count);
    const full = !slot || slot.count >= item.maximumStack;
    return {
      allowed: !full && p.coins >= item.price,
      reason: full
        ? t("ui.inventoryFull")
        : p.coins < item.price
          ? t("ui.notEnoughCoins")
          : "",
      price: item.price,
    };
  }
  const u = data.upgrades.find((u) => u.id === id)!,
    level = p.upgrades[id] ?? 0,
    price = u.basePrice + level * u.priceStep;
  return {
    allowed: level < u.maximum && p.coins >= price,
    reason:
      level >= u.maximum
        ? t("ui.maximum")
        : p.coins < price
          ? t("ui.notEnoughCoins")
          : "",
    price,
  };
}
function nodeButton(
  p: PlayerView,
  kind: Kind,
  id: string,
  glyph: string,
  name: string,
  grade = "",
) {
  const state = canBuy(p, kind, id),
    owned =
      kind === "skill"
        ? p.skills.includes(id)
        : kind === "weapon"
          ? p.weapon === id
          : false;
  return `<button type="button" class="item-node ${kind === "skill" ? "skill-node" : ""} ${owned ? "owned" : ""} ${state.allowed ? "available" : "unavailable"} ${chosen?.kind === kind && chosen.id === id ? "inspected" : ""}" data-inspect="${id}" data-item-kind="${kind}" aria-label="${e(name + (grade ? " · " + grade : ""))}" aria-pressed="${chosen?.kind === kind && chosen.id === id}" title="${e(name + (grade ? " · " + grade : ""))}">${itemArt(kind, id, glyph)}${grade ? `<span class="node-grade" aria-hidden="true">${e(grade)}</span>` : ""}${owned ? `<span class="node-status">${icon("check")}</span>` : ""}</button>`;
}
export function shopMarkup(
  p: PlayerView,
  supplyBindings: readonly string[] = ["1", "2", "3"],
  expanded = false,
) {
  const cl = data.classes.find((c) => c.id === p.classId)!;
  if (!cl.branches.some((b) => b.id === branchId)) branchId = cl.branches[0].id;
  if (
    (chosen?.kind === "skill" &&
      !skillsOf(p).some((s) => s.id === chosen?.id)) ||
    (chosen?.kind === "weapon" &&
      !data.weapons.some((w) => w.id === chosen?.id && w.classId === p.classId))
  )
    chosen = null;
  const branch = cl.branches.find((b) => b.id === branchId)!;
  return `<div class="loadout-summary"><span>${icon("coins")}${number(p.coins)} ${e(t("ui.coins"))}</span><span>${icon("tree")}${number(p.sp)} ${e(t("ui.skillPoints"))}</span><small>${e(t("ui.capstoneLimit"))}</small></div><div class="loadout-tabs" role="tablist" aria-label="${e(t("ui.shop"))}"><button data-shop-tab="gear" role="tab" aria-selected="${tab === "gear"}">${icon("weapon")}${e(t("ui.equip"))} / ${e(t("ui.upgrade"))}</button><button data-shop-tab="tree" role="tab" aria-selected="${tab === "tree"}">${icon("tree")}${e(t("ui.skillTree"))}</button></div><div class="loadout-workspace"><div class="loadout-board">${
    tab === "gear"
      ? `<section class="armory"><h3>${e(t("ui.equip"))}</h3><div class="gear-icons">${data.weapons
          .filter((w) => w.classId === p.classId)
          .map((w) =>
            nodeButton(
              p,
              "weapon",
              w.id,
              w.tier === 0
                ? "weapon"
                : w.tier === 1
                  ? "rate"
                  : w.tier === 2
                    ? "extra"
                    : "pierce",
              t("weapon." + w.id + ".name"),
            ),
          )
          .join(
            "",
          )}</div><h3>${e(t("ui.upgrade"))}</h3><div class="gear-icons">${data.upgrades.map((u) => nodeButton(p, "upgrade", u.id, effectIcon({ [u.effect]: u.amount }), t("upgrade." + u.id + ".name"))).join("")}</div><h3>${e(t("ui.supplies"))} · ${e(supplyBindings.join(" / "))}</h3><p>${e(t("ui.supplyHelp", { bindings: supplyBindings.join(" / ") }))}</p><div class="gear-icons">${data.supplies.map((s) => nodeButton(p, "supply", s.id, supplyGlyph(s.effect), t("supply." + s.id + ".name"))).join("")}</div><p>${p.supplies.map((s, i) => `${e(supplyBindings[i])}: ${s.count ? e(t("supply." + s.id + ".name")) + " ×" + number(s.count) : "—"}`).join(" · ")}</p></section>`
      : expanded
        ? expandedMap(p)
        : `<div class="branch-tabs" role="tablist" aria-label="${e(t("ui.specializations"))}">${cl.branches.map((b) => `<button data-branch="${b.id}" role="tab" aria-selected="${b.id === branchId}">${e(t("branch." + b.id))}</button>`).join("")}</div><div class="skill-scroll"><div class="skill-tree" role="group" aria-label="${e(t("branch." + branch.id))}"><svg class="tree-connections" viewBox="0 0 600 700" preserveAspectRatio="none" aria-hidden="true"><path d="M300 40V80 M100 123V80H500V123 M300 80V123"/>${branch.subbranches
            .map((sub, i) => {
              const nodes = skillsOf(p)
                  .filter((s) => s.subbranchId === sub.id)
                  .sort((a, b) => a.depth - b.depth),
                x = 100 + 200 * i;
              return nodes
                .slice(1)
                .map(
                  (node, row) =>
                    `<path class="${p.skills.includes(nodes[row].id) ? "lit" : ""}" d="M${x} ${177 + 100 * row}V${223 + 100 * row}"/>`,
                )
                .join("");
            })
            .join(
              "",
            )}</svg><div class="tree-root">${icon(cl.id)}</div><div class="tree-lanes">${branch.subbranches
            .map(
              (sub) =>
                `<section class="tree-lane"><h4>${e(t(sub.nameKey))}</h4>${skillsOf(
                  p,
                )
                  .filter((s) => s.subbranchId === sub.id)
                  .sort((a, b) => a.depth - b.depth)
                  .map((s) =>
                    nodeButton(
                      p,
                      "skill",
                      s.id,
                      effectIcon(s.effects),
                      t("skill." + s.id + ".name"),
                      s.grade,
                    ),
                  )
                  .join("")}</section>`,
            )
            .join("")}</div></div></div>`
  }</div><aside id="item-details" class="item-details" aria-live="polite">${details(p)}</aside></div>`;
}

function expandedMap(p: PlayerView) {
  const layout = skillMapLayout(p.classId);
  return (
    `<div class="skill-map-toolbar"><p>${e(t("ui.skillMapHelp", { count: number(layout.nodes.length) }))}</p><button type="button" data-map-zoom="out" aria-label="${e(t("ui.zoomOut"))}" ${mapZoom <= 0.65 ? "disabled" : ""}>−</button><button type="button" data-map-zoom="reset" aria-label="${e(t("ui.resetZoom"))}">${number(Math.round(mapZoom * 100))}%</button><button type="button" data-map-zoom="in" aria-label="${e(t("ui.zoomIn"))}" ${mapZoom >= 1.4 ? "disabled" : ""}>+</button></div>` +
    skillMapMarkup(
      layout,
      p.skills,
      mapZoom,
      (key) => t(key),
      (id) => {
        const s = data.skills.find((s) => s.id === id)!;
        return nodeButton(
          p,
          "skill",
          id,
          effectIcon(s.effects),
          t("skill." + id + ".name"),
          s.grade,
        );
      },
      icon(p.classId),
    )
  );
}

function details(p: PlayerView) {
  if (!chosen)
    return `<div class="inspect-empty">${icon("tree")}<p>${e(t("ui.selectItem"))}</p></div>`;
  const { kind, id } = chosen,
    state = canBuy(p, kind, id);
  let name = "",
    body = "",
    glyph = "weapon",
    grade = "";
  if (kind === "skill") {
    const node = skillsOf(p).find((s) => s.id === id)!;
    name = t("skill." + id + ".name");
    glyph = effectIcon(node.effects);
    grade = node.grade;
    body = `<p class="eyebrow">${e(t("branch." + node.branchId))} · ${e(t(node.subbranchNameKey))}</p><p class="effect-list">${e(effectText(node.effects))}</p><p class="muted">${e(t("ui.ratingExplanation"))}</p>${node.prerequisite ? `<button class="prerequisite-link" data-prerequisite="${node.prerequisite}">${e(t("ui.prerequisite", { name: t("skill." + node.prerequisite + ".name") }))}</button>` : ""}${node.capstone ? `<p class="capstone-note">${icon("ultimate")}${e(t("ui.capstone"))} · ${e(t("ui.capstoneLimit"))}</p>` : ""}`;
  } else if (kind === "weapon") {
    const w = data.weapons.find((w) => w.id === id)!;
    name = t("weapon." + id + ".name");
    body = `<dl class="item-stats">${[
      ["stat.damage", w.damage],
      ["stat.fireRate", w.fireRate],
      ["stat.magazine", w.magazine],
      ["stat.reloadTime", w.reloadTime],
      ["stat.extraShots", w.pellets],
      ["stat.pierce", w.pierce],
    ]
      .map(
        ([key, value]) =>
          `<div><dt>${e(t(String(key)))}</dt><dd>${number(Number(value), 2)}</dd></div>`,
      )
      .join("")}</dl>`;
  } else if (kind === "supply") {
    const item = data.supplies.find((s) => s.id === id)!;
    name = t("supply." + id + ".name");
    glyph = supplyGlyph(item.effect);
    body = `<p>${e(supplyText(id))}</p><p>${e(t("ui.cooldown", { seconds: t("template.seconds", { value: number(item.cooldown) }) }))}</p><p>${number(p.supplies.find((s) => s.id === id)?.count ?? 0)} / ${number(item.maximumStack)}</p>`;
  } else {
    const u = data.upgrades.find((u) => u.id === id)!;
    name = t("upgrade." + id + ".name");
    glyph = effectIcon({ [u.effect]: u.amount });
    body = `<p class="effect-list">${e(effectText({ [u.effect]: u.amount }))}</p><p>${e(t("ui.upgrade"))} ${number(p.upgrades[id] ?? 0)} / ${number(u.maximum)}</p>`;
  }
  return `<div class="detail-symbol">${itemArt(kind, id, glyph)}${grade ? `<b>${e(grade)}</b>` : ""}</div><h3>${e(name)}</h3>${body}<div class="detail-purchase"><p class="price">${number(state.price)} ${e(t(kind === "skill" ? "ui.skillPoints" : "ui.coins"))}</p><button id="buy-selected" class="primary" ${state.allowed ? "" : "disabled"}>${e(t("ui.buy"))}</button>${state.reason ? `<p class="purchase-reason">${e(state.reason)}</p>` : ""}</div>`;
}
export const supplyGlyph = (effect: string) =>
  ({
    heal: "health",
    moveSpeed: "move",
    shield: "armor",
    cleanse: "heal",
    revive: "rescue",
    barrier: "tank",
    reload: "reload",
    abilityCooldown: "ability",
  })[effect] ?? "ability";
export function bindShop(
  host: HTMLElement,
  p: PlayerView,
  purchase: (request: Omit<Command, "id">) => void,
  supplyBindings: readonly string[] = ["1", "2", "3"],
  expanded = false,
) {
  const redraw = () => {
    const workspace = host.querySelector<HTMLElement>(".loadout-editor");
    if (!workspace) return;
    const oldScroll = host.querySelector<HTMLElement>(".skill-scroll");
    const scroll = oldScroll?.scrollTop ?? 0,
      left = oldScroll?.scrollLeft ?? 0;
    workspace.innerHTML = shopMarkup(p, supplyBindings, expanded);
    bindShop(host, p, purchase, supplyBindings, expanded);
    const scroller = host.querySelector<HTMLElement>(".skill-scroll");
    if (scroller) {
      scroller.scrollTop = scroll;
      scroller.scrollLeft = left;
    }
    if (chosen?.kind === "skill")
      host
        .querySelector<HTMLButtonElement>(
          '[data-inspect="' + CSS.escape(chosen.id) + '"]',
        )
        ?.focus({ preventScroll: true });
  };
  const bindDetails = () => {
    const buy = host.querySelector<HTMLButtonElement>("#buy-selected");
    if (buy)
      buy.onclick = () => {
        if (chosen && canBuy(p, chosen.kind, chosen.id).allowed)
          purchase({ kind: chosen.kind, item: chosen.id });
      };
    const prerequisite = host.querySelector<HTMLButtonElement>(
      "[data-prerequisite]",
    );
    if (prerequisite)
      prerequisite.onclick = () => {
        chosen = { kind: "skill", id: prerequisite.dataset.prerequisite! };
        redraw();
      };
  };
  host
    .querySelectorAll<HTMLButtonElement>("[data-inspect]")
    .forEach((button) => {
      button.onclick = () => {
        chosen = {
          kind: button.dataset.itemKind as Kind,
          id: button.dataset.inspect!,
        };
        host.querySelectorAll("[data-inspect]").forEach((node) => {
          const active = (node as HTMLElement).dataset.inspect === chosen!.id;
          node.classList.toggle("inspected", active);
          node.setAttribute("aria-pressed", String(active));
        });
        host.querySelector("#item-details")!.innerHTML = details(p);
        bindDetails();
      };
    });
  host.querySelectorAll<HTMLButtonElement>("[data-shop-tab]").forEach(
    (button) =>
      (button.onclick = () => {
        tab = button.dataset.shopTab as typeof tab;
        redraw();
      }),
  );
  host.querySelectorAll<HTMLButtonElement>("[data-branch]").forEach(
    (button) =>
      (button.onclick = () => {
        branchId = button.dataset.branch!;
        chosen = null;
        redraw();
      }),
  );
  if (expanded) {
    const layout = skillMapLayout(p.classId);
    prepareSkillMap(host, layout);
    const viewport = host.querySelector<HTMLElement>(".skill-map-viewport");
    if (viewport && !chosen)
      viewport.scrollLeft = Math.max(
        0,
        (layout.width * mapZoom - viewport.clientWidth) / 2,
      );
    host.querySelectorAll<HTMLButtonElement>("[data-map-zoom]").forEach(
      (button) =>
        (button.onclick = () => {
          const viewport = host.querySelector<HTMLElement>(
              ".skill-map-viewport",
            ),
            sheet = host.querySelector<HTMLElement>(".skill-map-sheet"),
            canvas = host.querySelector<HTMLElement>(".skill-map-canvas");
          if (!viewport || !sheet || !canvas) return;
          const before = mapZoom;
          mapZoom =
            button.dataset.mapZoom === "reset"
              ? 1
              : clampMapZoom(
                  mapZoom + (button.dataset.mapZoom === "in" ? 0.1 : -0.1),
                );
          const left = mapZoomScroll(
              viewport.scrollLeft,
              viewport.clientWidth,
              before,
              mapZoom,
            ),
            top = mapZoomScroll(
              viewport.scrollTop,
              viewport.clientHeight,
              before,
              mapZoom,
            );
          sheet.style.width = layout.width * mapZoom + "px";
          sheet.style.height = layout.height * mapZoom + "px";
          canvas.style.transform = `scale(${mapZoom})`;
          viewport.scrollLeft = left;
          viewport.scrollTop = top;
          const reset = host.querySelector<HTMLElement>(
            '[data-map-zoom="reset"]',
          );
          if (reset)
            reset.textContent = number(Math.round(mapZoom * 100)) + "%";
          host
            .querySelectorAll<HTMLButtonElement>("[data-map-zoom]")
            .forEach(
              (b) =>
                (b.disabled =
                  b.dataset.mapZoom === "out"
                    ? mapZoom <= 0.65
                    : b.dataset.mapZoom === "in"
                      ? mapZoom >= 1.4
                      : false),
            );
        }),
    );
  }
  bindDetails();
}
