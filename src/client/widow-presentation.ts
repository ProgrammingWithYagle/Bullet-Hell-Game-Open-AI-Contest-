import type Phaser from "phaser";
import type { BossCue } from "../shared/boss-director.ts";
import { widowPallRects, widowPallTracks } from "../shared/widow-gates.ts";
export function drawWidowCue(
  h: Phaser.GameObjects.Graphics,
  f: Phaser.GameObjects.Graphics,
  cue: BossCue,
  now: number,
) {
  if (cue.kind === "widow-walk") {
    h.lineStyle(2, 0xe6c69a, 0.8).lineBetween(cue.x1, cue.y1, cue.x2, cue.y2);
    h.lineStyle(3, 0xe6c69a, 1).strokeRect(cue.x2 - 18, cue.y2 - 18, 36, 36);
    return true;
  }
  if (cue.kind === "widow-needles") {
    if (now < cue.beganAt) return true;
    const color = cue.crossing ? 0xc4a0e0 : 0xe6bb82;
    h.lineStyle(3, color, 1).strokeCircle(cue.x, cue.y, 10);
    for (const angle of cue.angles)
      h.lineStyle(2, color, 0.8).lineBetween(
        cue.x + Math.cos(angle) * 13,
        cue.y + Math.sin(angle) * 13,
        cue.x + Math.cos(angle) * 215,
        cue.y + Math.sin(angle) * 215,
      );
    if (cue.crossing)
      h.lineStyle(3, color, 1)
        .lineBetween(cue.x - 7, cue.y - 26, cue.x + 7, cue.y - 12)
        .lineBetween(cue.x + 7, cue.y - 26, cue.x - 7, cue.y - 12);
    return true;
  }
  if (cue.kind === "widow-pall") {
    const color = 0xe79b88,
      active = now >= cue.at;
    for (const r of widowPallTracks(cue)) {
      if (!active)
        h.fillStyle(color, 0.025).fillRect(r.x, r.y, r.width, r.height);
      h.lineStyle(1, color, 0.45).strokeRect(r.x, r.y, r.width, r.height);
      const x = r.x + r.width / 2,
        y = r.y + r.height / 2,
        dx = cue.axis === "horizontal" ? 0 : cue.direction,
        dy = cue.axis === "horizontal" ? cue.direction : 0;
      h.lineStyle(2, color, 0.75)
        .lineBetween(x - dx * 18, y - dy * 18, x + dx * 18, y + dy * 18)
        .lineBetween(
          x + dx * 18,
          y + dy * 18,
          x + dx * 8 - dy * 8,
          y + dy * 8 + dx * 8,
        )
        .lineBetween(
          x + dx * 18,
          y + dy * 18,
          x + dx * 8 + dy * 8,
          y + dy * 8 - dx * 8,
        );
    }
    if (active && now < cue.until)
      for (const r of widowPallRects(cue, now))
        h.fillStyle(color, 0.4)
          .fillRect(r.x, r.y, r.width, r.height)
          .lineStyle(3, color, 1)
          .strokeRect(r.x, r.y, r.width, r.height);
    return true;
  }
  if (cue.kind !== "gate") return false;
  const active = now >= cue.at,
    color = cue.open ? 0x9be6c9 : 0xe88664,
    horizontal = cue.axis === "horizontal";
  h.fillStyle(color, cue.open ? 0.04 : active ? 0.28 : 0.06).fillRect(
    cue.x,
    cue.y,
    cue.width,
    cue.height,
  );
  h.lineStyle(cue.open ? 4 : 3, color, 1).strokeRect(
    cue.x,
    cue.y,
    cue.width,
    cue.height,
  );
  if (cue.open) {
    const p = cue.passage,
      dx = horizontal ? 0 : 1,
      dy = horizontal ? 1 : 0;
    h.lineStyle(4, color, 1)
      .lineBetween(p.x - dx * 48, p.y - dy * 48, p.x + dx * 48, p.y + dy * 48)
      .lineBetween(
        p.x + dx * 48,
        p.y + dy * 48,
        p.x + dx * 34 - dy * 10,
        p.y + dy * 34 + dx * 10,
      )
      .lineBetween(
        p.x + dx * 48,
        p.y + dy * 48,
        p.x + dx * 34 + dy * 10,
        p.y + dy * 34 - dx * 10,
      );
  } else {
    const start = horizontal ? cue.x : cue.y,
      length = horizontal ? cue.width : cue.height;
    for (let at = start + 14; at < start + length; at += 28)
      h.lineStyle(active ? 7 : 2, color, active ? 0.85 : 0.5).lineBetween(
        horizontal ? at : cue.x,
        horizontal ? cue.y : at,
        horizontal ? at : cue.x + cue.width,
        horizontal ? cue.y + cue.height : at,
      );
  }
  const x = cue.x + cue.width / 2,
    y = cue.y + cue.height / 2;
  for (let n = 0; n <= cue.lane; n++)
    f.lineStyle(4, color, 1).lineBetween(
      x + (n - cue.lane / 2) * 10,
      y - 10,
      x + (n - cue.lane / 2) * 10,
      y + 10,
    );
  for (let n = 1; n <= cue.legs; n++)
    f.lineStyle(2, color, n <= cue.leg ? 1 : 0.35).strokeRect(
      x + (n - (cue.legs + 1) / 2) * 15 - 4,
      y + 20,
      8,
      8,
    );
  return true;
}
