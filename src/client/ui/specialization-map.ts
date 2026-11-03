import catalog from "../../../content/catalog.json";
import { conflictingSkill } from "../../shared/skill-conflicts.ts";
import { escape as e } from "./html.ts";
type Point = { x: number; y: number };
export type SpecializationMap = {
  width: number;
  height: number;
  nodes: (Point & { id: string; reference: boolean })[];
  edges: { from: string; to: string }[];
  exclusions: { a: string; b: string }[];
};
// Authored positions belong to real techniques; no proposed family becomes an empty card.
const positions: Record<string, Point> = {
  "engineer-constructs-1": { x: 500, y: 75 },
  "engineer-machinery-1": { x: 340, y: 255 },
  "engineer-traps-1": { x: 800, y: 255 },
  "engineer-machinery-anchor-1": { x: 125, y: 460 },
  "engineer-machinery-survey-1": { x: 350, y: 460 },
  "engineer-machinery-coil-1": { x: 580, y: 545 },
  "engineer-machinery-prism-1": { x: 460, y: 770 },
  "engineer-machinery-salvage-1": { x: 800, y: 770 },
  "engineer-machinery-convergence-1": { x: 460, y: 1000 },
};
export function specializationMapLayout(
  classId: string,
): SpecializationMap | null {
  const techniques = catalog.specializationSkills.filter(
    (s) => s.classId === classId,
  );
  if (!techniques.length) return null;
  const ids = new Set(techniques.map((s) => s.id)),
    references = [
      ...new Set(
        techniques
          .map((s) => s.prerequisite)
          .filter((id) => id && !ids.has(id)),
      ),
    ];
  const nodes = [
    ...references.map((id) => ({ id, reference: true })),
    ...techniques.map((s) => ({ id: s.id, reference: false })),
  ].map((n) => {
    const point = positions[n.id];
    if (!point)
      throw Error("Specialization needs an authored position: " + n.id);
    return { ...n, ...point };
  });
  return {
    width: 1000,
    height: 1120,
    nodes,
    edges: techniques
      .filter((s) => s.prerequisite)
      .map((s) => ({ from: s.prerequisite!, to: s.id })),
    exclusions: techniques.flatMap((a, i) =>
      techniques
        .slice(i + 1)
        .filter((b) => conflictingSkill([a.id], b.id))
        .map((b) => ({ a: a.id, b: b.id })),
    ),
  };
}
export function specializationFocus(
  map: SpecializationMap,
  id: string,
  key: string,
): string | null {
  const current = map.nodes.find((n) => n.id === id);
  if (!current) return null;
  if (key === "Home") return map.nodes[0].id;
  if (key === "End") return map.nodes.at(-1)!.id;
  const d = (
    {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    } as Record<string, Point>
  )[key];
  if (!d) return id;
  const related =
    key === "ArrowUp"
      ? map.edges.filter((edge) => edge.to === id).map((edge) => edge.from)
      : key === "ArrowDown"
        ? map.edges.filter((edge) => edge.from === id).map((edge) => edge.to)
        : [];
  const candidates = related.length
    ? map.nodes.filter((n) => related.includes(n.id))
    : map.nodes;
  return (
    candidates
      .filter((n) => (n.x - current.x) * d.x + (n.y - current.y) * d.y > 0.01)
      .map((n) => {
        const dx = n.x - current.x,
          dy = n.y - current.y,
          along = dx * d.x + dy * d.y,
          across = Math.abs(dx * d.y - dy * d.x);
        return {
          id: n.id,
          score: (1000 * across) / along + Math.hypot(dx, dy),
        };
      })
      .sort((a, b) => a.score - b.score)[0]?.id ?? id
  );
}
export function specializationMapMarkup(
  map: SpecializationMap,
  owned: readonly string[],
  render: (id: string, reference: boolean) => string,
  options: { mode?: "map" | "list"; zoom?: number; selected?: string } = {},
) {
  const byId = new Map(map.nodes.map((n) => [n.id, n])),
    zoom = options.zoom ?? 1;
  const edges = map.edges
    .map((edge) => {
      const a = byId.get(edge.from)!,
        b = byId.get(edge.to)!,
        state = owned.includes(edge.to)
          ? "owned-route"
          : conflictingSkill(owned, edge.to)
            ? "conflicting-route"
            : owned.includes(edge.from)
              ? "available-route"
              : "locked-route";
      return (
        '<path class="' +
        state +
        '" data-from="' +
        e(edge.from) +
        '" data-to="' +
        e(edge.to) +
        '" d="M' +
        a.x +
        " " +
        (a.y + (a.reference ? 40 : 92)) +
        " C" +
        a.x +
        " " +
        (a.y + (a.reference ? 100 : 150)) +
        "," +
        b.x +
        " " +
        (b.y - 115) +
        "," +
        b.x +
        " " +
        (b.y - 66) +
        '"/>'
      );
    })
    .join("");
  const forks = map.exclusions
    .map(({ a, b }) => {
      const first = byId.get(a)!,
        second = byId.get(b)!;
      return (
        '<path class="exclusive-route" d="M' +
        (first.x + 66) +
        " " +
        first.y +
        " L" +
        (second.x - 66) +
        " " +
        second.y +
        '"/>'
      );
    })
    .join("");
  const listIds: string[] = [];
  const visit = (id: string) => {
    if (listIds.includes(id)) return;
    listIds.push(id);
    for (const edge of map.edges.filter((edge) => edge.from === id))
      visit(edge.to);
  };
  for (const n of map.nodes.filter((n) => n.reference)) visit(n.id);
  const nodes =
    options.mode === "list" ? listIds.map((id) => byId.get(id)!) : map.nodes;
  return (
    '<div class="specialization-viewport ' +
    (options.mode === "list" ? "reading-view" : "") +
    '"><div class="specialization-graph" role="group" aria-label="Specializations" style="--graph-width:' +
    map.width * zoom +
    "px;--graph-height:" +
    map.height * zoom +
    'px"><svg class="specialization-connections" viewBox="0 0 ' +
    map.width +
    " " +
    map.height +
    '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    edges +
    forks +
    "</svg>" +
    nodes
      .map(
        (n) =>
          '<div class="specialization-position ' +
          (n.reference ? "foundation-reference" : "technique-position") +
          '" data-graph-cell="' +
          e(n.id) +
          '" style="--node-x:' +
          (n.x / map.width) * 100 +
          "%;--node-y:" +
          (n.y / map.height) * 100 +
          '%">' +
          render(n.id, n.reference) +
          "</div>",
      )
      .join("") +
    "</div></div>"
  );
}
export function highlightSpecialization(
  host: HTMLElement,
  map: SpecializationMap,
  id: string,
) {
  const route = new Set([id]);
  let current = id;
  for (let i = 0; i < map.nodes.length; i++) {
    const edge = map.edges.find((edge) => edge.to === current);
    if (!edge) break;
    route.add(edge.from);
    current = edge.from;
  }
  for (const path of host.querySelectorAll<HTMLElement>("[data-from]"))
    path.classList.toggle(
      "inspected-route",
      route.has(path.dataset.from!) && route.has(path.dataset.to!),
    );
}
export function prepareSpecializationMap(
  host: HTMLElement,
  map: SpecializationMap,
) {
  const graph = host.querySelector<HTMLElement>(".specialization-graph");
  if (!graph) return;
  const buttons = [
      ...graph.querySelectorAll<HTMLButtonElement>("[data-graph-focus]"),
    ],
    selected =
      buttons.find((b) => b.getAttribute("aria-pressed") === "true") ??
      buttons[0];
  const reading = !!host.querySelector(".reading-view");
  for (const b of buttons) {
    b.tabIndex = reading || b === selected ? 0 : -1;
    b.addEventListener("focus", () => {
      if (!reading)
        for (const item of buttons) item.tabIndex = item === b ? 0 : -1;
    });
  }
  if (selected)
    highlightSpecialization(host, map, selected.dataset.graphFocus!);
  graph.onkeydown = (event) => {
    if (
      reading ||
      event.isComposing ||
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    const current = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-graph-focus]",
    );
    if (!current) return;
    const id = specializationFocus(map, current.dataset.graphFocus!, event.key),
      next = buttons.find((b) => b.dataset.graphFocus === id);
    if (!next) return;
    event.preventDefault();
    for (const item of buttons) item.tabIndex = item === next ? 0 : -1;
    next.focus({ preventScroll: true });
    next.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
      behavior: "auto",
    });
  };
}
