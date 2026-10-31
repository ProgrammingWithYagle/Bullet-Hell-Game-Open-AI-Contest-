import type Phaser from "phaser";
import { clamp } from "../shared/geometry.ts";
import { drawMoldStillCue } from "./mold-still-cues.ts";
import type {
  MoldCue,
  MoldPool,
  MoldReaction,
  Reagent,
} from "../shared/mold-mixing.ts";
const colors: Record<Reagent, number> = {
  acid: 0xe7a15d,
  alkali: 0x8ab6de,
  catalyst: 0xb990e2,
  water: 0xd4e5e1,
};
/** Uses the issued reaction lifetime; drawing never adds an attack or changes its radius. */
export function moldReactionVisual(
  q: MoldReaction,
  now: number,
  reduced = false,
) {
  const fired = q.fired || now >= q.at;
  const progress = fired
    ? clamp((now - q.at) / Math.max(1, q.until - q.at), 0, 1)
    : clamp((now - q.beganAt) / Math.max(1, q.at - q.beganAt), 0, 1);
  return {
    fired,
    progress,
    ringRadius: q.radius * (fired ? (reduced ? 1 : 0.3 + 0.7 * progress) : 1),
    alpha: fired ? 0.95 - progress * 0.45 : 0.85,
  };
}

function reactionBurst(
  g: Phaser.GameObjects.Graphics,
  q: MoldReaction,
  now: number,
  reduced: boolean,
) {
  const visual = moldReactionVisual(q, now, reduced);
  const catalytic = q.type === "catalytic";
  const color = catalytic ? 0xd4a5ff : 0xf0bf7b;
  // A local shock ring and starburst stay inside the real hit footprint.
  g.fillStyle(color, 0.13 * (1 - visual.progress)).fillCircle(
    q.x,
    q.y,
    q.radius,
  );
  g.lineStyle(3, color, visual.alpha).strokeCircle(q.x, q.y, q.radius);
  if (!reduced)
    g.lineStyle(4, color, visual.alpha).strokeCircle(
      q.x,
      q.y,
      visual.ringRadius,
    );
  const inner = q.radius * 0.18;
  const outer = q.radius * (reduced ? 0.63 : 0.34 + 0.36 * visual.progress);
  const points = Array.from({ length: 16 }, (_, i) => {
    const radius = i % 2 ? outer * 0.48 : outer;
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    return {
      x: q.x + Math.cos(angle) * radius,
      y: q.y + Math.sin(angle) * radius,
    };
  });
  g.fillStyle(color, 0.16 * (1 - visual.progress))
    .beginPath()
    .moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) g.lineTo(point.x, point.y);
  g.closePath().fillPath();
  g.lineStyle(catalytic ? 3 : 2, color, visual.alpha).strokePath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 8;
    g.lineBetween(
      q.x + Math.cos(angle) * q.radius * 0.78,
      q.y + Math.sin(angle) * q.radius * 0.78,
      q.x + Math.cos(angle) * q.radius * 0.92,
      q.y + Math.sin(angle) * q.radius * 0.92,
    );
  }
  if (catalytic) {
    g.lineStyle(2, 0xf5deff, visual.alpha).strokeCircle(q.x, q.y, inner);
  }
}
function mark(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  reagent: Reagent,
  r = 12,
) {
  g.lineStyle(2, colors[reagent], 0.95);
  if (reagent === "acid")
    g.strokeTriangle(x, y - r, x - r, y + r, x + r, y + r);
  else if (reagent === "alkali") g.strokeRect(x - r, y - r, r * 2, r * 2);
  else if (reagent === "catalyst") {
    g.lineBetween(x - r, y, x + r, y)
      .lineBetween(x, y - r, x, y + r)
      .lineBetween(x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7)
      .lineBetween(x - r * 0.7, y + r * 0.7, x + r * 0.7, y - r * 0.7);
  } else {
    g.strokeCircle(x - 5, y + 2, r * 0.6).strokeCircle(x + 5, y + 2, r * 0.6);
    g.lineBetween(x - 5, y - 9, x, y - 14).lineBetween(x + 5, y - 9, x, y - 14);
  }
}
function dashed(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
  alpha = 0.8,
) {
  g.lineStyle(2, color, alpha);
  for (let n = 0; n < 32; n++) {
    const a = (n * Math.PI) / 16,
      b = a + 0.12;
    g.lineBetween(
      x + Math.cos(a) * r,
      y + Math.sin(a) * r,
      x + Math.cos(b) * r,
      y + Math.sin(b) * r,
    );
  }
}
function vapor(
  g: Phaser.GameObjects.Graphics,
  q: Extract<MoldCue, { kind: "mold-gas" }>,
  pools: MoldPool[],
  now: number,
) {
  const half = q.bankWidth / 2,
    tangentLo = q.axis === "x" ? q.y : q.x,
    tangentHi = tangentLo + (q.axis === "x" ? q.height : q.width);
  for (let offset = -half; offset < half; offset += 10) {
    const line = q.head + offset;
    let spans: [[number, number], ...[number, number][]] = [
      [tangentLo, tangentHi],
    ];
    for (const water of pools)
      if (water.reagent === "water" && water.at <= now && water.until > now) {
        const d = line - (q.axis === "x" ? water.x : water.y);
        if (Math.abs(d) >= water.radius) continue;
        const chord = Math.sqrt(water.radius ** 2 - d * d),
          center = q.axis === "x" ? water.y : water.x,
          lo = center - chord,
          hi = center + chord,
          next: [number, number][] = [];
        for (const [a, b] of spans) {
          if (hi <= a || lo >= b) next.push([a, b]);
          else {
            if (lo > a) next.push([a, lo]);
            if (hi < b) next.push([hi, b]);
          }
        }
        spans = next as typeof spans;
      }
    for (const [a, b] of spans) {
      g.fillStyle(0xd8c4a2, 0.12 + 0.12 * (1 - Math.abs(offset) / half));
      if (q.axis === "x")
        g.fillRect(line, a, Math.min(10, half - offset), b - a);
      else g.fillRect(a, line, b - a, Math.min(10, half - offset));
    }
  }
  const edge = q.head + (q.end > q.start ? half : -half);
  g.lineStyle(2, 0xe1ceb1, 0.45);
  for (let n = tangentLo + 18; n < tangentHi; n += 46) {
    const p = q.axis === "x" ? { x: edge, y: n } : { x: n, y: edge };
    if (
      pools.some(
        (w) =>
          w.reagent === "water" &&
          w.at <= now &&
          w.until > now &&
          Math.hypot(w.x - p.x, w.y - p.y) <= w.radius,
      )
    )
      continue;
    g.strokeCircle(p.x, p.y, 8);
  }
}
export function drawMoldCue(
  h: Phaser.GameObjects.Graphics,
  f: Phaser.GameObjects.Graphics,
  q: MoldCue,
  now: number,
  cues: MoldCue[],
  reduced = false,
) {
  if (q.kind === "mold-still" || q.kind === "mold-aerosol") {
    drawMoldStillCue(h, q, now);
    return;
  }
  if (q.kind === "mold-walk") {
    h.lineStyle(2, 0xbac9c8, 0.55);
    for (let i = Math.max(1, q.index); i < q.path.length; i++)
      h.lineBetween(q.path[i - 1].x, q.path[i - 1].y, q.path[i].x, q.path[i].y);
    const p = q.path.at(-1)!;
    h.strokeCircle(p.x, p.y, 10);
    return;
  }
  if (q.kind === "mold-flask") {
    const t = clamp((now - q.beganAt) / Math.max(1, q.at - q.beganAt), 0, 1),
      x = q.fromX + (q.x - q.fromX) * t,
      y = q.fromY + (q.y - q.fromY) * t - Math.sin(t * Math.PI) * 100,
      c = colors[q.reagent];
    dashed(h, q.x, q.y, q.radius, c, 0.6);
    h.lineStyle(2, c, 0.65).strokeCircle(q.x, q.y, q.radius * (1 - t));
    mark(f, q.x, q.y, q.reagent, 10);
    f.fillStyle(c, 0.9).fillRect(x - 6, y - 6, 12, 14);
    f.lineStyle(2, 0x291f1d, 1)
      .strokeRect(x - 6, y - 6, 12, 14)
      .lineBetween(x - 3, y - 11, x + 3, y - 11)
      .lineBetween(x - 3, y - 11, x - 3, y - 6)
      .lineBetween(x + 3, y - 11, x + 3, y - 6);
    return;
  }
  if (q.kind === "mold-pool") {
    const c = colors[q.reagent],
      water = q.reagent === "water",
      spent = water && q.spentAt > 0,
      alpha = spent ? 0.07 : water ? 0.1 : 0.19;
    h.fillStyle(c, alpha).fillCircle(q.x, q.y, q.radius);
    h.lineStyle(water ? 3 : 2, c, spent ? 0.4 : 0.85).strokeCircle(
      q.x,
      q.y,
      q.radius,
    );
    mark(f, q.x, q.y, q.reagent, 14);
    for (let n = 0; n < 5; n++) {
      const a = n * 1.27 + (water ? 0.3 : 0),
        r = q.radius * (water ? 0.65 : 0.55);
      h.lineStyle(1.5, c, water ? 0.4 : 0.6).strokeCircle(
        q.x + Math.cos(a) * r,
        q.y + Math.sin(a) * r,
        water ? 4 : 7,
      );
    }
    if (spent) dashed(h, q.x, q.y, q.radius * 0.8, c, 0.45);
    return;
  }
  if (q.kind === "mold-reaction") {
    const c = q.type === "coupled" ? 0xe5b26d : 0xc3a0e6;
    const visual = moldReactionVisual(q, now, reduced);
    if (!visual.fired) {
      dashed(h, q.x, q.y, q.radius, c);
      h.fillStyle(c, 0.045).fillCircle(q.x, q.y, q.radius);
      h.lineStyle(2.5, c, 0.9).strokeCircle(q.x, q.y, q.radius);
      if (!reduced)
        h.lineStyle(2, c, 0.65).strokeCircle(
          q.x,
          q.y,
          q.radius * (1 - visual.progress),
        );
      if (q.type === "catalytic") {
        // An angular center distinguishes the violet eruption from pale mixed coolant.
        h.lineStyle(2, c, 0.95).strokeTriangle(
          q.x,
          q.y - 22,
          q.x - 20,
          q.y + 15,
          q.x + 20,
          q.y + 15,
        );
      }
    } else reactionBurst(h, q, now, reduced);
    const pools = cues.filter((p): p is MoldPool => p.kind === "mold-pool"),
      a = pools.find((p) => p.id === q.sources[0]),
      b = pools.find((p) => p.id === q.sources[1]);
    if (a && b && Math.hypot(q.x - a.x, q.y - a.y) < 1) {
      const count = Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 18);
      for (let n = 1; n < count; n++)
        h.lineStyle(1, c, 0.5).strokeCircle(
          a.x + ((b.x - a.x) * n) / count,
          a.y + ((b.y - a.y) * n) / count,
          3,
        );
    }
    mark(f, q.x, q.y, "catalyst", 11);
    return;
  }
  if (q.kind === "mold-reactor") {
    const cooled = q.state === "cooled",
      spent = q.state === "spent",
      c = cooled ? 0xd4e5e1 : 0xd5a461;
    h.fillStyle(0x2d302d, 0.8).fillRect(q.x - 18, q.y - 25, 36, 50);
    h.lineStyle(3, c, 0.9).strokeRect(q.x - 18, q.y - 25, 36, 50);
    const pressure = cooled
      ? 0
      : clamp((now - q.at) / Math.max(1, q.ruptureAt - q.at), 0, 1);
    for (let n = 0; n < 5; n++) {
      h.fillStyle(
        n < Math.ceil(pressure * 5) ? 0xe6ac61 : 0x696b61,
        0.9,
      ).fillRect(q.x - 10, q.y + 15 - n * 8, 20, 5);
    }
    if (cooled) {
      f.lineStyle(3, c, 0.95)
        .lineBetween(q.x - 9, q.y - 8, q.x + 9, q.y + 8)
        .lineBetween(q.x + 9, q.y - 8, q.x - 9, q.y + 8);
    } else if (q.state === "rupture") {
      dashed(h, q.x, q.y, q.blastRadius, 0xe2a56b);
      const t = clamp((q.burstAt - now) / (q.burstAt - q.ruptureAt), 0, 1);
      h.lineStyle(3, 0xe2a56b, 0.65).strokeCircle(q.x, q.y, q.blastRadius * t);
    } else if (spent)
      h.fillStyle(0xe9b987, 0.25).fillCircle(q.x, q.y, q.blastRadius);
    else dashed(h, q.x, q.y, 35, c, 0.5);
    return;
  }
  if (now < q.at) {
    const x = q.x + q.width / 2,
      y = q.y + q.height / 2,
      forward = q.end > q.start ? 1 : -1;
    h.lineStyle(3, 0xd8c4a2, 0.7);
    if (q.axis === "x") {
      const start = forward > 0 ? q.x + 28 : q.x + q.width - 28;
      for (let n = -2; n <= 2; n++) {
        const at = y + n * 85;
        h.lineBetween(start, at, start + forward * 45, at)
          .lineBetween(start + forward * 45, at, start + forward * 30, at - 10)
          .lineBetween(start + forward * 45, at, start + forward * 30, at + 10);
      }
    } else {
      const start = forward > 0 ? q.y + 28 : q.y + q.height - 28;
      for (let n = -3; n <= 3; n++) {
        const at = x + n * 100;
        h.lineBetween(at, start, at, start + forward * 45)
          .lineBetween(at, start + forward * 45, at - 10, start + forward * 30)
          .lineBetween(at, start + forward * 45, at + 10, start + forward * 30);
      }
    }
  } else
    vapor(
      h,
      q,
      cues.filter((p): p is MoldPool => p.kind === "mold-pool"),
      now,
    );
}
