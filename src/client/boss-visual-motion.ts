import type { Boss } from '../shared/game.ts';
import { HZ } from '../shared/protocol.ts';

// Observes authoritative positions, rather than the alternating 30 Hz target/render residual.
export class BossVisualMotion {
  private prior?: { id: string; x: number; y: number; at: number; movedAt: number };
  sample(boss: Boss, worldDrawingTick: number, active: boolean) {
    const old = this.prior;
    if (!active || boss.health <= 0 || !Number.isFinite(worldDrawingTick)) {
      this.prior = undefined;
      return false;
    }
    if (!old || old.id !== boss.id || worldDrawingTick < old.at) {
      this.prior = { id: boss.id, x: boss.x, y: boss.y, at: worldDrawingTick, movedAt: -Infinity };
      return false;
    }
    const moved = Math.hypot(boss.x - old.x, boss.y - old.y) > 0.01;
    const movedAt = moved ? worldDrawingTick : old.movedAt;
    this.prior = { id: boss.id, x: boss.x, y: boss.y, at: worldDrawingTick, movedAt };
    return worldDrawingTick - movedAt <= HZ * 0.1;
  }
}
