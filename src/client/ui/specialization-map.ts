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
  "heavy-traverse-keyed-1":{x:250,y:1030},"heavy-traverse-open-1":{x:750,y:1030},
  "heavy-traverse-clutch-1":{x:500,y:775},
  "heavy-traverse-1":{x:500,y:255},"heavy-traverse-spade-1":{x:230,y:505},"heavy-traverse-floating-1":{x:770,y:505},
  "heavy-ordnance-1":{x:500,y:75},"heavy-flak-1":{x:500,y:255},"heavy-flak-compact-1":{x:230,y:505},"heavy-flak-frontal-1":{x:770,y:505},"heavy-flak-command-1":{x:500,y:775},"heavy-flak-running-1":{x:250,y:1030},"heavy-flak-hanging-1":{x:750,y:1030},"heavy-flak-seam-1":{x:500,y:1285},
  "soldier-sniper-1": { x: 500, y: 255 },
  "soldier-sniper-bore-1": { x: 500, y: 775 },
  "soldier-sniper-rest-1": { x: 500, y: 1035 },
  "soldier-sniper-withdrawal-1": { x: 500, y: 1555 },
  "soldier-sniper-carry-1": { x: 230, y: 505 },
  "soldier-sniper-clear-1": { x: 770, y: 505 },
  "soldier-grenadier-1": { x: 500, y: 255 },
  "soldier-grenadier-skim-1": { x: 230, y: 505 },
  "soldier-grenadier-contact-1": { x: 770, y: 505 },
  "soldier-grenadier-pitch-1": { x: 500, y: 775 },
  "soldier-grenadier-pin-1": { x: 230, y: 1030 },
  "soldier-grenadier-sling-1": { x: 770, y: 1030 },
  "soldier-grenadier-kick-1": { x: 500, y: 1280 },
  "soldier-grenadier-return-1": { x: 500, y: 1530 },
  "soldier-marksman-1": { x: 500, y: 255 },
  "soldier-marksman-carom-1": { x: 250, y: 510 },
  "soldier-marksman-line-1": { x: 750, y: 510 },
  "soldier-marksman-pair-1": { x: 500, y: 780 },
  "soldier-marksman-reserve-1": { x: 250, y: 1030 },
  "soldier-marksman-relay-1": { x: 650, y: 1270 },
  "soldier-marksman-twin-1": { x: 500, y: 1510 },
  "soldier-ballistics-1": { x: 500, y: 75 },
  "soldier-skirmisher-1": { x: 500, y: 255 },
  "soldier-skirmisher-advance-1": { x: 250, y: 510 },
  "soldier-skirmisher-rear-1": { x: 750, y: 510 },
  "soldier-skirmisher-drill-1": { x: 500, y: 750 },
  "soldier-skirmisher-roving-1": { x: 650, y: 1000 },
  "soldier-skirmisher-ready-1": { x: 350, y: 1245 },
  "soldier-skirmisher-volley-1": { x: 650, y: 1490 },
  "engineer-constructs-1": { x: 500, y: 75 },
  "engineer-machinery-1": { x: 350, y: 255 },
  "engineer-traps-1": { x: 450, y: 255 },
  "engineer-traps-wire-1": { x: 160, y: 460 },
  "engineer-traps-switch-1": { x: 450, y: 460 },
  "engineer-traps-key-1": { x: 740, y: 545 },
  "engineer-traps-casings-1": { x: 600, y: 800 },
  "engineer-traps-haul-1": { x: 890, y: 800 },
  "engineer-traps-corridor-1": { x: 600, y: 1030 },
  "engineer-machinery-anchor-1": { x: 125, y: 460 },
  "engineer-machinery-survey-1": { x: 350, y: 460 },
  "engineer-machinery-coil-1": { x: 580, y: 545 },
  "engineer-machinery-prism-1": { x: 460, y: 770 },
  "engineer-machinery-salvage-1": { x: 800, y: 770 },
  "engineer-machinery-convergence-1": { x: 460, y: 1000 },
  "engineer-builder-1": { x: 500, y: 255 },
  "engineer-builder-longspan-1": { x: 210, y: 460 },
  "engineer-builder-wings-1": { x: 500, y: 460 },
  "engineer-builder-hinge-1": { x: 790, y: 545 },
  "engineer-builder-repair-1": { x: 210, y: 770 },
  "engineer-builder-survey-1": { x: 650, y: 800 },
  "engineer-builder-linked-1": { x: 350, y: 1030 },
  "engineer-builder-redoubt-1": { x: 500, y: 1270 },
};
export function specializationRoutes(classId: string) {
  return [
    ...new Map(
      catalog.specializationSkills
        .filter((s) => s.classId === classId)
        .map((s) => [
          s.subbranchId,
          { id: s.subbranchId, nameKey: s.subbranchNameKey },
        ]),
    ).values(),
  ];
}
export function specializationMapLayout(
  classId: string,
  route = "all",
): SpecializationMap | null {
  const routes = specializationRoutes(classId),
    single = routes.some((r) => r.id === route);
  const techniques = catalog.specializationSkills.filter(
    (s) => s.classId === classId && (!single || s.subbranchId === route),
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
    const technique = techniques.find((s) => s.id === n.id);
    const offset = single
      ? 0
      : routes.findIndex((r) => r.id === technique?.subbranchId) * 1050;
    return {
      ...n,
      ...point,
      x: n.reference
        ? single
          ? 500
          : (routes.length * 1050 - 50) / 2
        : point.x + offset,
    };
  });
  return {
    width: single ? 1000 : routes.length * 1050 - 50,
    height: Math.max(...nodes.map((n) => n.y)) + 130,
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
function connector(
  a: SpecializationMap["nodes"][number],
  b: SpecializationMap["nodes"][number],
) {
  const start = a.y + (a.reference ? 40 : 92),
    end = b.y - 66,
    mid = (start + end) / 2;
  // Long entry edges travel through clear gutters, leaving the early fork readable.
  if (a.id === "engineer-builder-1" && b.id === "engineer-builder-repair-1") {
    const gutter = a.x - 430;
    return `M${a.x} ${start} C${a.x} 360,${gutter} 360,${gutter} 390 L${gutter} 650 C${gutter} 685,${b.x} 680,${b.x} ${end}`;
  }
  return `M${a.x} ${start} C${a.x} ${a.reference ? mid : Math.min(mid, 360 + a.y - 255)},${b.x} ${a.reference ? mid : Math.min(mid, 360 + a.y - 255)},${b.x} ${end}`;
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
        : map.exclusions
            .flatMap((pair) =>
              pair.a === id ? [pair.b] : pair.b === id ? [pair.a] : [],
            )
            .filter((id) => {
              const n = map.nodes.find((n) => n.id === id)!;
              return (n.x - current.x) * d.x + (n.y - current.y) * d.y > 0.01;
            });
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
    zoom = Number.isFinite(options.zoom)
      ? Math.max(0.2, Math.min(2, options.zoom!))
      : 1;
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
        '" d="' +
        connector(a, b) +
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
        (second.x - first.x > 1500
          ? ` C${first.x + 66} 125,${second.x - 66} 125,${second.x - 66} ${second.y}`
          : ` L${second.x - 66} ${second.y}`) +
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
    '"><div class="specialization-sheet" style="width:' +
    map.width * zoom +
    "px;height:" +
    map.height * zoom +
    'px"><div class="specialization-graph" role="group" aria-label="Specializations" style="--graph-width:' +
    map.width +
    "px;--graph-height:" +
    map.height +
    "px;transform:scale(" +
    zoom +
    ')"><svg class="specialization-connections" viewBox="0 0 ' +
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
    "</div></div></div>"
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
