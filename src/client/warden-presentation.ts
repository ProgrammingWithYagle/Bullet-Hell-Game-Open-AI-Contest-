// Rendering choices are derived from the signature clock, never the other way round.
import contract from "../../assets/production/motion/warden-rehearsal.json";
import { HZ } from "../shared/protocol.ts";
import type { WardenSample } from "../shared/warden-signature.ts";

export type WardenClipId = "idle" | "attack" | "channel";
export const wardenArt = contract;
export function frameAt(
  durations: readonly number[],
  elapsedMs: number,
  loop: boolean,
) {
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  let time = loop
    ? Math.max(0, elapsedMs) % total
    : Math.min(Math.max(0, elapsedMs), total - 1e-6);
  for (let frame = 0; frame < durations.length; frame++) {
    if (time < durations[frame]) return frame;
    time -= durations[frame];
  }
  return durations.length - 1;
}
export function wardenPose(
  sample: WardenSample,
  reducedMotion = false,
): { clip: WardenClipId; frame: number } {
  const time = (sample.phaseTick * 1000) / HZ;
  if (sample.phase === "warning")
    return {
      clip: "attack",
      frame: frameAt(
        wardenArt.clips.attack.frameDurationsMs.slice(0, 4),
        time,
        false,
      ),
    };
  if (sample.phase === "active") {
    const release = wardenArt.clips.attack.frameDurationsMs[4];
    if (time < release) return { clip: "attack", frame: 4 };
    return {
      clip: "channel",
      frame: reducedMotion
        ? 0
        : frameAt(
            wardenArt.clips.channel.frameDurationsMs,
            time - release,
            true,
          ),
    };
  }
  const recovery = wardenArt.clips.attack.frameDurationsMs.slice(5);
  const recoveryMs = recovery.reduce((sum, duration) => sum + duration, 0);
  if (time < recoveryMs)
    return { clip: "attack", frame: 5 + frameAt(recovery, time, false) };
  return {
    clip: "idle",
    frame: reducedMotion
      ? 0
      : frameAt(wardenArt.clips.idle.frameDurationsMs, time - recoveryMs, true),
  };
}
export function lanternWorld(
  pose: { clip: WardenClipId; frame: number },
  foot: { x: number; y: number },
) {
  const clip = wardenArt.clips[pose.clip],
    local = clip.lanternCenters[pose.frame];
  return {
    x:
      foot.x +
      ((local[0] - wardenArt.origin[0] * wardenArt.cellSize) *
        wardenArt.displayCell) /
        wardenArt.cellSize,
    y:
      foot.y +
      ((local[1] - wardenArt.origin[1] * wardenArt.cellSize) *
        wardenArt.displayCell) /
        wardenArt.cellSize,
  };
}
