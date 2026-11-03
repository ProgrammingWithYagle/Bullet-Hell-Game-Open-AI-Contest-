import catalog from "../../../content/catalog.json";

export type MapNode = {
  id: string;
  prerequisite: string | null;
  branchId: string;
  pathId: string;
  lane: number;
  depth: number;
  x: number;
  y: number;
};
export type MapLayout = {
  width: number;
  height: number;
  root: { x: number; y: number };
  groups: { id: string; x: number; y: number }[];
  paths: { id: string; nameKey: string; x: number; y: number }[];
  nodes: MapNode[];
  edges: { from: string; to: string }[];
};
export function skillMapLayout(classId: string, branchId?: string): MapLayout {
  const cl = catalog.classes.find((c) => c.id === classId);
  if (!cl) throw Error("Unknown skill-map class");
  const branches = branchId
    ? cl.branches.filter((b) => b.id === branchId)
    : cl.branches;
  if (!branches.length) throw Error("Unknown foundation branch");
  const columns = branches.flatMap((b) =>
    b.subbranches.map((p) => ({
      branch: b.id,
      path: p.id,
      nameKey: p.nameKey,
    })),
  );
  const nodes = columns.flatMap((p, lane) =>
    catalog.skills
      .filter((s) => s.classId === classId && s.subbranchId === p.path)
      .sort((a, b) => a.depth - b.depth)
      .map((s) => ({
        id: s.id,
        prerequisite: s.prerequisite,
        branchId: s.branchId,
        pathId: s.subbranchId,
        lane,
        depth: s.depth,
        x: 120 + lane * 240 + (s.depth % 2 ? -18 : 18),
        y: 290 + (s.depth - 1) * 165,
      })),
  );
  return {
    width: columns.length * 240,
    height: 1220,
    root: { x: columns.length * 120, y: 48 },
    groups: branches.map((b, i) => ({ id: b.id, x: 360 + i * 720, y: 130 })),
    paths: columns.map((p, i) => ({
      id: p.path,
      nameKey: p.nameKey,
      x: 120 + i * 240,
      y: 205,
    })),
    nodes,
    edges: nodes
      .filter((n) => n.prerequisite)
      .map((n) => ({ from: n.prerequisite!, to: n.id })),
  };
}
export function mapFocus(layout: MapLayout, id: string, key: string) {
  const node = layout.nodes.find((n) => n.id === id);
  if (!node) return null;
  const lane =
    node.lane + (key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0);
  const depth =
    key === "Home"
      ? 1
      : key === "End"
        ? 6
        : node.depth + (key === "ArrowDown" ? 1 : key === "ArrowUp" ? -1 : 0);
  return (
    layout.nodes.find((n) => n.lane === lane && n.depth === depth)?.id ?? id
  );
}
export const clampMapZoom = (value: number,minimum=.35) =>
  Number.isFinite(value)
    ? Math.max(minimum, Math.min(2, Math.round(value * 100) / 100))
    : 1;
export const fitMapZoom = (width:number,height:number,logicalWidth:number,logicalHeight:number,minimum=.35) =>
  clampMapZoom(Math.floor(Math.min(width/logicalWidth,height/logicalHeight)*100)/100,minimum);
export function mapZoomScroll(
  scroll: number,
  viewport: number,
  oldZoom: number,
  newZoom: number,
  minimum=.35,
) {
  return Math.max(
    0,
    ((Math.max(0, scroll) + viewport / 2) / clampMapZoom(oldZoom,minimum)) *
      clampMapZoom(newZoom,minimum) -
      viewport / 2,
  );
}
const escape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export function skillMapMarkup(
  layout: MapLayout,
  owned: readonly string[],
  zoom: number,
  label: (key: string) => string,
  node: (id: string) => string,
  root: string,
) {
  const scale = clampMapZoom(zoom),
    byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const forks =
    layout.groups
      .map((g) => `M${layout.root.x} 78V95H${g.x}V${g.y - 20}`)
      .join("") +
    layout.paths
      .map((p, i) => {
        const first = layout.nodes.find(
          (n) => n.pathId === p.id && n.depth === 1,
        )!;
        return ` M${layout.groups[Math.floor(i / 3)].x} 149V170H${p.x}V${p.y - 20} M${p.x} ${p.y + 22}C${p.x} ${p.y + 34},${first.x} ${first.y - 64},${first.x} ${first.y - 46}`;
      })
      .join("");
  const edges = layout.edges
    .map((e) => {
      const a = byId.get(e.from)!,
        b = byId.get(e.to)!,
        side = Math.sign(b.x - a.x) || 1;
      return `<path class="${owned.includes(e.from) ? "lit" : ""}" data-from="${escape(e.from)}" data-to="${escape(e.to)}" d="M${a.x + side * 46} ${a.y}C${a.x + side * 120} ${a.y},${b.x + side * 120} ${b.y},${b.x + side * 46} ${b.y}"/>`;
    })
    .join("");
  return `<div class="skill-map-viewport skill-scroll" tabindex="0" role="group" aria-label="${escape(label("ui.skillTree"))}"><div class="skill-map-sheet" style="width:${layout.width * scale}px;height:${layout.height * scale}px"><div class="skill-map-canvas" style="width:${layout.width}px;height:${layout.height}px;transform:scale(${scale})"><svg class="skill-map-edges" width="${layout.width}" height="${layout.height}" aria-hidden="true" focusable="false"><path class="map-forks" d="${forks}"/>${edges}</svg><div class="skill-map-root" style="left:${layout.root.x}px;top:${layout.root.y}px">${root}</div>${layout.groups.map((g) => `<h3 class="skill-map-group" dir="auto" style="left:${g.x}px;top:${g.y}px">${escape(label("branch." + g.id))}</h3>`).join("")}${layout.paths.map((p) => `<p class="skill-map-path" dir="auto" style="left:${p.x}px;top:${p.y}px">${escape(label(p.nameKey))}</p>`).join("")}${layout.nodes.map((n) => `<div class="skill-map-node" data-map-cell="${escape(n.id)}" style="left:${n.x}px;top:${n.y}px">${node(n.id)}<small dir="auto">${escape(label("skill." + n.id + ".name"))}</small></div>`).join("")}</div></div></div>`;
}

export function prepareSkillMap(host: HTMLElement, layout: MapLayout) {
  const viewport = host.querySelector<HTMLElement>(".skill-map-viewport");
  if (!viewport) return;
  const buttons = [
    ...viewport.querySelectorAll<HTMLButtonElement>("[data-inspect]"),
  ];
  const selected =
    buttons.find((b) => b.getAttribute("aria-pressed") === "true") ??
    buttons[0];
  for (const b of buttons) b.tabIndex = b === selected ? 0 : -1;
  viewport.onkeydown = (event) => {
    if (
      ![
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    const target = event.target as HTMLElement;
    const current = target.closest<HTMLButtonElement>("[data-inspect]");
    if (!current) return;
    const id = mapFocus(layout, current.dataset.inspect!, event.key);
    if (!id) return;
    event.preventDefault();
    const next = buttons.find((b) => b.dataset.inspect === id);
    if (!next) return;
    for (const b of buttons) b.tabIndex = b === next ? 0 : -1;
    next.focus({ preventScroll: true });
    next.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "auto",
    });
  };
  for (const b of buttons)
    b.addEventListener("focus", () => {
      for (const item of buttons) item.tabIndex = item === b ? 0 : -1;
    });
}
