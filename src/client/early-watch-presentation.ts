import library from "../../assets/production/motion/early-watch-library.json";
import type { Boss } from "../shared/game.ts";
import type { BossCue } from "../shared/boss-director.ts";
import { HZ } from "../shared/protocol.ts";
export const earlyWatchArt = library.entries;
export function earlyWatchPose(
  boss: Boss,
  worldTick: number,
  now: number,
  cues: BossCue[],
  reduced = false,
  drawingTick = worldTick,
) {
  const art = earlyWatchArt.find((e) => e.bossId === boss.id);
  if (!art) return null;
  const clock = Number.isFinite(drawingTick)
    ? Math.max(worldTick, drawingTick)
    : worldTick;
  const combatClock = now + clock - worldTick;
  if (boss.health <= 0) {
    const elapsed = Math.max(0, clock - boss.defeatedAt);
    return {
      frame:
        art.defeatStartFrame +
        (reduced
          ? art.defeatFrames - 1
          : Math.min(
              art.defeatFrames - 1,
              Math.floor((elapsed * art.defeatFps) / HZ),
            )),
      lift: 0,
    };
  }
  if (reduced || now < boss.staggerUntil) return { frame: 0, lift: 0 };
  const hop = cues.find(
    (c) => c.kind === "early-hop" && now >= c.at - HZ * 0.5 && now < c.until,
  );
  if (hop?.kind === "early-hop") {
    if (now < hop.at) return { frame: 5, lift: 0 };
    if (now < hop.landAt)
      return {
        frame: 6,
        lift:
          Math.sin(
            Math.PI *
              Math.min(1, (combatClock - hop.at) / (hop.landAt - hop.at)),
          ) * 46,
      };
    return { frame: 7, lift: 0 };
  }
  const active = cues.filter(
    (c): c is Extract<BossCue, { kind: "early-volley" | "early-lane" }> =>
      (c.kind === "early-volley" || c.kind === "early-lane") &&
      !c.cancelled &&
      now < c.until,
  );
  if (active.length) {
    const began = boss.castAt,
      release = Math.min(...active.map((c) => c.at));
    const frame =
      now < release
        ? Math.min(1, Math.floor((now - began) / 12))
        : now < release + 10
          ? 2
          : 3;
    return { frame: 4 + frame, lift: 0 };
  }
  return { frame: Math.floor((clock * 5.5) / HZ) % 4, lift: 0 };
}

// Deliberately simple, high-contrast geometric cues. Color is paired with shape/direction.
export function drawEarlyWatch(h: any, f: any, cues: BossCue[], now: number) {
  for (const c of cues) {
    if (c.kind === "early-prop") {
      const alive = c.health > 0;
      f.lineStyle(alive ? 2 : 1, alive ? 0xe2cb89 : 0x84928f, alive ? 1 : 0.3);
      if (c.role === "ticket") f.strokeRect(c.x - 20, c.y - 24, 40, 42);
      else if (c.role === "drain") f.strokeCircle(c.x, c.y, 19);
      else {
        f.beginPath()
          .moveTo(c.x, c.y - 23)
          .lineTo(c.x + 20, c.y + 18)
          .lineTo(c.x - 20, c.y + 18)
          .closePath()
          .strokePath();
      }
      if (alive) {
        f.fillStyle(0xead6a3, 0.95).fillRect(
          c.x - 22,
          c.y + 30,
          (44 * c.health) / c.maxHealth,
          4,
        );
      }
    } else if (c.kind === "early-hop") {
      h.fillStyle(
        now < c.at ? 0xe4bd6a : 0xe79e67,
        now < c.at ? 0.09 : 0.16,
      ).fillCircle(c.x, c.y, c.radius);
      f.lineStyle(3, 0xf4d18c, 0.95).strokeCircle(c.x, c.y, c.radius);
      f.lineStyle(1, 0xf4d18c, 0.75).strokeCircle(c.x, c.y, c.radius + 7);
    } else if (c.kind === "early-lane" && !c.cancelled) {
      const angle = Math.atan2(c.y2 - c.y1, c.x2 - c.x1),
        dx = Math.cos(angle),
        dy = Math.sin(angle),
        px = (-dy * c.width) / 2,
        py = (dx * c.width) / 2;
      h.fillStyle(
        c.role === "wind" ? 0x87c9c5 : 0xe0a376,
        now < c.at ? 0.08 : 0.2,
      );
      h.beginPath()
        .moveTo(c.x1 + px, c.y1 + py)
        .lineTo(c.x2 + px, c.y2 + py)
        .lineTo(c.x2 - px, c.y2 - py)
        .lineTo(c.x1 - px, c.y1 - py)
        .closePath()
        .fillPath();
      f.lineStyle(2, c.role === "wind" ? 0xb6e2d8 : 0xf0c48b, 0.95);
      for (const side of [-1, 1])
        f.beginPath()
          .moveTo(c.x1 + px * side, c.y1 + py * side)
          .lineTo(c.x2 + px * side, c.y2 + py * side)
          .strokePath();
      for (const fraction of [0.25, 0.5, 0.75]) {
        const x = c.x1 + (c.x2 - c.x1) * fraction,
          y = c.y1 + (c.y2 - c.y1) * fraction;
        f.beginPath()
          .moveTo(x - dx * 12 - dy * 8, y - dy * 12 + dx * 8)
          .lineTo(x, y)
          .lineTo(x - dx * 12 + dy * 8, y - dy * 12 - dx * 8)
          .strokePath();
      }
    } else if (c.kind === "early-volley" && !c.cancelled && now < c.at) {
      f.lineStyle(2, 0xebc889, 0.85);
      if (c.ring) {
        f.beginPath()
          .arc(c.x, c.y, 78, c.aim + c.arc / 2, c.aim + Math.PI * 2 - c.arc / 2)
          .strokePath();
      } else
        for (const edge of [-0.5, 0, 0.5]) {
          const angle = c.aim + c.arc * edge;
          f.beginPath()
            .moveTo(c.x, c.y)
            .lineTo(c.x + Math.cos(angle) * 340, c.y + Math.sin(angle) * 340)
            .strokePath();
        }
    }
  }
}
