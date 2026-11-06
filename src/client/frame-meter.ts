// Uses wall-clock render intervals, not Phaser's smoothed or capped simulation delta.
export class FrameMeter {
  private last = 0;
  private intervals: number[] = [];
  private hiddenFrames = 0;
  private hostileCounts: number[] = [];
  private activeCounts: number[] = [];
  private capture: {
    durationMs: number;
    requiredHostiles: number;
    startedAt: number | null;
    completedAt: number | null;
  } | null = null;
  reset() {
    this.last = 0;
    this.intervals.length = 0;
    this.hiddenFrames = 0;
    this.hostileCounts.length = 0;
    this.activeCounts.length = 0;
    this.capture = null;
  }
  beginCapture(durationMs: number, requiredHostiles = 0) {
    this.reset();
    this.capture = { durationMs, requiredHostiles, startedAt: null, completedAt: null };
  }
  sample(now: number, visible: boolean, renderedHostiles = 0, activePlayers = 0) {
    if (this.capture) {
      if (this.capture.completedAt !== null) return;
      if (this.capture.startedAt === null) {
        if (!visible || renderedHostiles < this.capture.requiredHostiles) return;
        this.capture.startedAt = now;
      }
    }
    if (!visible) this.hiddenFrames++;
    if (this.last) {
      this.intervals.push(now - this.last);
      this.hostileCounts.push(renderedHostiles);
      this.activeCounts.push(activePlayers);
    }
    this.last = now;
    if (this.intervals.length > 7200) {
      this.intervals.shift();
      this.hostileCounts.shift();
      this.activeCounts.shift();
    }
    if (this.capture && now - this.capture.startedAt! >= this.capture.durationMs)
      this.capture.completedAt = now;
  }
  summary() {
    const sorted = this.intervals.toSorted((a, b) => a - b);
    const total = this.intervals.reduce((n, v) => n + v, 0);
    const at = (q: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
    return {
      samples: sorted.length,
      intervalWindowMs: total,
      averageFps: total ? (sorted.length * 1000) / total : 0,
      frameP50Ms: at(0.5),
      frameP99Ms: at(0.99),
      frameMaxMs: sorted.at(-1) ?? 0,
      hiddenFrames: this.hiddenFrames,
      sampleHostilesMin: this.hostileCounts.length ? Math.min(...this.hostileCounts) : 0,
      sampleHostilesMax: this.hostileCounts.length ? Math.max(...this.hostileCounts) : 0,
      sampleActivePlayersMin: this.activeCounts.length ? Math.min(...this.activeCounts) : 0,
      sampleActivePlayersMax: this.activeCounts.length ? Math.max(...this.activeCounts) : 0,
      framesBelowRequiredHostiles: this.capture
        ? this.hostileCounts.filter((n) => n < this.capture!.requiredHostiles).length
        : null,
      capture: this.capture
        ? {
            ...this.capture,
            state:
              this.capture.completedAt !== null
                ? 'complete'
                : this.capture.startedAt !== null
                  ? 'recording'
                  : 'armed',
          }
        : null,
    };
  }
}
