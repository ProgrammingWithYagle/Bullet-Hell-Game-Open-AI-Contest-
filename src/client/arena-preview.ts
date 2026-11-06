import { runtimeArena } from "../shared/arena-layouts.ts";
import { escape as e } from "./ui/html.ts";
import { arenaCoverPlan, arenaCoverPreview } from './arena-covers.ts';
import {arenaWorldPreview} from './arena-worlds.ts';

export function arenaPreviewModel(id: string, difficulty = "normal") {
  const arena = runtimeArena(id, difficulty);
  const padding = 100;
  return {
    arena,
    groundKey:
      id === "gatehouse"
        ? difficulty === "hard"
          ? "gatehouse-half"
          : ["insane", "hellish"].includes(difficulty)
            ? "gatehouse-open"
            : id
        : id,
    viewBox: [
      arena.bounds.x - padding,
      arena.bounds.y - padding,
      arena.width + padding * 2,
      arena.height + padding * 2,
    ].join(" "),
  };
}

type PreviewLabels = {
  name: string;
  difficulty: string;
  overview: string;
  start: string;
  boss: string;
  cover: string;
  lava: string;
};

export function arenaPreviewMarkup(
  id: string,
  difficulty: string,
  grounds: Record<string, string>,
  labels: PreviewLabels,
  covers: Record<string,string>,
  worlds: Record<string,string>,
) {
  const { arena: a, groundKey, viewBox } = arenaPreviewModel(id, difficulty);
  if (!grounds[groundKey])
    throw new Error("Missing arena preview ground: " + groundKey);
  if(a.lavaPits.length&&!covers['lava-pit'])throw Error('Missing painted lava preview');
  const marker = (x: number, y: number, boss: boolean) =>
    `<g class="arena-marker ${boss ? "arena-marker-boss" : "arena-marker-start"}" transform="translate(${x} ${y})"><circle r="30"/>${
      boss
        ? '<path d="M0 -16 15 0 0 16 -15 0Z"/><path d="M-5 -3H-2M2 -3H5M-4 7H4"/>'
        : '<circle cy="-7" r="6"/><path d="M-11 14V9C-11 1 11 1 11 9V14Z"/>'
    }</g>`;
  return `<figure class="arena-atlas"><figcaption class="arena-atlas-heading"><span>${e(labels.overview)}</span><bdi>${e(labels.difficulty)}</bdi></figcaption><svg class="arena-preview arena-plan" viewBox="${viewBox}" role="img" aria-label="${e(labels.name + " · " + labels.difficulty)}"><rect x="${a.bounds.x}" y="${a.bounds.y}" width="${a.width}" height="${a.height}" fill="${a.floor}"/><image href="${e(grounds[groundKey])}" x="${a.bounds.x}" y="${a.bounds.y}" width="${a.width}" height="${a.height}" preserveAspectRatio="none" opacity=".9"/>${id==='gatehouse'?`<rect class="arena-edge" x="${a.bounds.x}" y="${a.bounds.y}" width="${a.width}" height="${a.height}" fill="none"/>`:''}${arenaWorldPreview(id,worlds[id])}${arenaCoverPlan(id,difficulty).map(o=>arenaCoverPreview(id,o,covers[id])).join("")}${a.lavaPits.map((p) => `<g class="arena-lava"><image href="${e(covers['lava-pit'])}" x="${p.x-p.radius}" y="${p.y-p.radius}" width="${p.radius*2}" height="${p.radius*2}"/></g>`).join("")}${marker(a.bossSpawn.x, a.bossSpawn.y, true)}${marker(a.playerSpawn.x, a.playerSpawn.y, false)}</svg><div class="arena-legend"><span><i class="legend-start" aria-hidden="true"></i>${e(labels.start)}</span><span><i class="legend-boss" aria-hidden="true"></i>${e(labels.boss)}</span>${a.cover.length ? `<span><i class="legend-cover" aria-hidden="true"></i>${e(labels.cover)}</span>` : ""}${a.lavaPits.length ? `<span><i class="legend-lava" aria-hidden="true"></i>${e(labels.lava)}</span>` : ""}</div></figure>`;
}
