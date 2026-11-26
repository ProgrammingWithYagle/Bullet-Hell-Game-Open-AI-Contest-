import type { View } from "../shared/view.ts";
import {
  validSeamPrivateEvent,
  type SeamPrivateEvent,
  type FlakSeamOwnerCue,
} from "../shared/heavy-seam.ts";

/** Private transient presentation only. No positions are stored in shared View or results. */
export class HeavySeamPresentation {
  private scope = "";
  private watermark = -1;
  private cues: FlakSeamOwnerCue[] = [];
  clear() {
    this.scope = "";
    this.watermark = -1;
    this.cues = [];
  }
  observe(view: View | null, owner: string) {
    const scope = view
      ? JSON.stringify([view.run.id, view.encounter, owner])
      : "";
    if (scope !== this.scope) {
      this.clear();
      this.scope = scope;
    }
    if (!view || view.phase !== "combat") this.cues = [];
    else this.cues = this.cues.filter((c) => c.until > view.combatTick);
  }
  ingest(event: SeamPrivateEvent, view: View | null, owner: string) {
    this.observe(view, owner);
    if (
      !view ||
      view.phase !== "combat" ||
      !validSeamPrivateEvent(event) ||
      event.owner !== owner ||
      event.run !== view.run.id ||
      event.encounter !== view.encounter ||
      event.at < this.watermark
    )
      return;
    this.watermark = event.at;
    this.cues = event.cues
      .filter((c) => c.until > view.combatTick)
      .map((c) => ({ ...c, points: c.points.map((p) => ({ ...p })) }));
  }
  frame(view: View, owner: string) {
    this.observe(view, owner);
    return this.cues.map((c) => ({
      ...c,
      points: c.points.map((p) => ({ ...p })),
    }));
  }
}
type Pen = {
  lineStyle(width: number, color: number, alpha: number): Pen;
  lineBetween(x1: number, y1: number, x2: number, y2: number): Pen;
};
/** A stationary hairline, with a finite cut fade and no extra firing pose or particles. */
export function drawHeavySeam(
  pen: Pen,
  cues: readonly FlakSeamOwnerCue[],
  now: number,
  highContrast: boolean,
) {
  for (const c of cues) {
    if (c.until <= now) continue;
    const cut = c.stage === "cut",
      fade = cut
        ? Math.max(
            0,
            Math.min(1, (c.until - now) / Math.max(1, c.until - c.at)),
          )
        : 1;
    pen.lineStyle(
      cut ? 2 : 1,
      c.broken ? 0x86897f : highContrast ? 0xf4d38f : 0xc1aa7d,
      (c.broken ? 0.35 : cut ? 0.8 : 0.55) * fade,
    );
    for (let i = 1; i < c.points.length; i++) {
      const a = c.points[i - 1],
        b = c.points[i];
      pen.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
