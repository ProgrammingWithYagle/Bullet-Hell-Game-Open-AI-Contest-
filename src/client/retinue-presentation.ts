import source from "../../assets/production/motion/retinue/library.json";
import delivery from "../../assets/delivery/retinue-motion-v1/library.json";
import type { SummonView } from "../shared/summoner-kit.ts";
import { HZ } from "../shared/protocol.ts";

const delivered = new Map(delivery.entries.map((e) => [e.id, e]));
export const retinueArt = source.entries.map((e) => {
  const copy = delivered.get(e.id);
  if (
    !copy ||
    copy.sourceSha256 !== e.atlasSha256 ||
    copy.frames !== e.frames ||
    copy.fps !== e.fps ||
    copy.origin.some((v, i) => v !== e.origin[i]) ||
    copy.displayCell !== e.displayCell
  )
    throw Error("Companion delivery mismatch: " + e.id);
  return { ...e, atlas: copy.atlas, cellSize: copy.cellSize };
});
const clips = new Map(retinueArt.map((e) => [e.id, e]));
export function retinuePose(
  entity: SummonView,
  animationTick: number,
  reduced = false,
) {
  const angle =
    entity.action === "attack" ||
    entity.action === "hurt" ||
    entity.action === "downed"
      ? entity.actionAim
      : entity.aim;
  const direction =
    Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))
      ? Math.sin(angle) < 0
        ? "north"
        : "south"
      : Math.cos(angle) < 0
        ? "west"
        : "east";
  const action = reduced && entity.action === "run" ? "idle" : entity.action;
  const clip = clips.get(
    "retinue-" + entity.kind + "-" + action + "-" + direction,
  );
  if (!clip) return undefined;
  const age = Math.max(0, animationTick - entity.actionAt),
    loop = action === "run";
  const frame = reduced
    ? action === "downed"
      ? clip.frames - 1
      : 0
    : loop
      ? Math.floor((age * clip.fps) / HZ) % clip.frames
      : Math.min(clip.frames - 1, Math.floor((age * clip.fps) / HZ));
  return {
    texture: clip.id,
    frame,
    origin: clip.origin,
    displayCell: clip.displayCell,
  };
}
