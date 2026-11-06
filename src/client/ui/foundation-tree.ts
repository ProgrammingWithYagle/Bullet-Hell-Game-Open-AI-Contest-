import catalog from "../../../content/catalog.json";
import { generalSkills } from "../../shared/mobility.ts";
import { skillMapLayout, skillMapMarkup } from "./skill-map.ts";
import { escape as e } from "./html.ts";
type Options = {
  classId: string;
  skills: readonly string[];
  branch: string;
  expanded: boolean;
  mode: "map" | "list";
  zoom: number;
  label: (key: string, args?: Record<string, string | number>) => string;
  render: (id: string) => string;
  symbol: string;
  behavior: (id: string) => string;
};
const sharedPilot = (id: string) =>
  ["general-brake-step", "general-course-correction"].includes(id)
    ? ' lang="en" dir="ltr"'
    : "";
/** General is a workbench for the issued foundations, with its real purchase graph. */
export function foundationTreeMarkup(o: Options) {
  const cl = catalog.classes.find((c) => c.id === o.classId)!;
  const tabs = [
    { id: "general", name: o.label("ui.generalAbilities") },
    ...cl.branches.map((b) => ({ id: b.id, name: o.label("branch." + b.id) })),
    ...(o.expanded ? [{ id: "all", name: o.label("ui.foundationAll") }] : []),
  ];
  const heading =
    '<header class="foundation-heading"><div class="foundation-seal" aria-hidden="true">' +
    o.symbol +
    '</div><div><p class="eyebrow">' +
    e(o.label("branch.general")) +
    '</p><h3 lang="en" dir="ltr">' +
    e(o.label("ui.foundationManual")) +
    '</h3><p lang="en" dir="ltr">' +
    e(o.label("ui.foundationHelp")) +
    "</p></div></header>";
  const nav =
    '<div class="branch-tabs foundation-tabs" role="tablist" aria-label="' +
    e(o.label("ui.skillTree")) +
    '">' +
    tabs
      .map(
        (b) =>
          '<button type="button" data-branch="' +
          e(b.id) +
          '" role="tab" aria-selected="' +
          (b.id === o.branch) +
          '"' +
          (b.id === "all" ? ' lang="en" dir="ltr"' : "") +
          ">" +
          e(b.name) +
          "</button>",
      )
      .join("") +
    "</div>";
  let body: string;
  if (o.branch === "general") {
    body =
      '<section class="shared-foundations" aria-label="' +
      e(o.label("ui.generalAbilities")) +
      '"><p class="foundation-intro" lang="en" dir="ltr">' +
      e(o.label("ui.foundationSharedHelp")) +
      '</p><div class="shared-techniques">' +
      generalSkills
        .map(
          (s) =>
            '<article class="shared-technique">' +
            o.render(s.id) +
            "<div><h4" +
            sharedPilot(s.id) +
            ">" +
            e(o.label(s.nameKey)) +
            '</h4><p class="foundation-status">' +
            e(
              o.skills.includes(s.id)
                ? o.label("ui.owned")
                : s.cost + " " + o.label("ui.skillPoints"),
            ) +
            "</p><p" +
            sharedPilot(s.id) +
            ">" +
            e(o.behavior(s.id)) +
            "</p>" +
            (s.prerequisite
              ? '<button type="button" class="prerequisite-link" data-prerequisite="' +
                e(s.prerequisite) +
                '">' +
                e(
                  o.label("ui.prerequisite", {
                    name: o.label("skill." + s.prerequisite + ".name"),
                  }),
                ) +
                "</button>"
              : "") +
            "</div></article>",
        )
        .join("") +
      "</div></section>";
  } else {
    const map = skillMapLayout(
      o.classId,
      o.branch === "all" ? undefined : o.branch,
    );
    const button = (action: string, text: string, disabled = false) =>
      '<button type="button" data-map-zoom="' +
      action +
      '" ' +
      (disabled ? "disabled" : "") +
      (action === "fit" ? ' lang="en" dir="ltr"' : "") +
      ' aria-label="' +
      e(
        action === "in"
          ? o.label("ui.zoomIn")
          : action === "out"
            ? o.label("ui.zoomOut")
            : action === "reset"
              ? o.label("ui.resetZoom")
              : text,
      ) +
      '">' +
      e(text) +
      "</button>";
    body =
      '<div class="skill-map-toolbar"><p lang="en" dir="ltr">' +
      e(o.label("ui.foundationCount", { count: map.nodes.length })) +
      '</p><button type="button" data-foundation-mode="map" aria-pressed="' +
      (o.mode === "map") +
      '">' +
      e(o.label("ui.pathwayMap")) +
      '</button><button type="button" data-foundation-mode="list" aria-pressed="' +
      (o.mode === "list") +
      '">' +
      e(o.label("ui.pathwayList")) +
      "</button>" +
      button("fit", o.label("ui.treeFit"), o.mode === "list") +
      button("out", "−", o.zoom <= 0.35 || o.mode === "list") +
      button("reset", Math.round(o.zoom * 100) + "%", o.mode === "list") +
      button("in", "+", o.zoom >= 2 || o.mode === "list") +
      "</div>";
    if (o.mode === "list") {
      body +=
        '<div class="foundation-reading skill-scroll">' +
        map.paths
          .map(
            (path) =>
              "<section><h4>" +
              e(o.label(path.nameKey)) +
              "</h4><ol>" +
              map.nodes
                .filter((n) => n.pathId === path.id)
                .map((n) => {
                  const s = catalog.skills.find((s) => s.id === n.id)!;
                  return (
                    "<li>" +
                    o.render(n.id) +
                    "<div><strong>" +
                    e(o.label("skill." + n.id + ".name")) +
                    '</strong><p class="foundation-status">' +
                    e(
                      o.skills.includes(n.id)
                        ? o.label("ui.owned")
                        : s.cost + " " + o.label("ui.skillPoints"),
                    ) +
                    " · " +
                    e(s.grade) +
                    "</p>" +
                    (s.prerequisite
                      ? '<button type="button" class="prerequisite-link" data-prerequisite="' +
                        e(s.prerequisite) +
                        '">' +
                        e(
                          o.label("ui.prerequisite", {
                            name: o.label("skill." + s.prerequisite + ".name"),
                          }),
                        ) +
                        "</button>"
                      : "") +
                    "</div></li>"
                  );
                })
                .join("") +
              "</ol></section>",
          )
          .join("") +
        "</div>";
    } else
      body += skillMapMarkup(
        map,
        o.skills,
        o.zoom,
        o.label,
        o.render,
        o.symbol,
      );
  }
  return (
    '<section class="foundation-workbook">' +
    heading +
    nav +
    body +
    "</section>"
  );
}
