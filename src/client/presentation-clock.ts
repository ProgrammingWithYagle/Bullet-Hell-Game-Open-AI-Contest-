// A bounded drawing clock. No extrapolated value is written to simulation or network state.
import { HZ } from '../shared/protocol.ts';
import type { View } from '../shared/view.ts';

export const PRESENTATION_LEAD_TICKS = HZ * 0.05;
type Snapshot = Pick<View, 'run' | 'encounter' | 'tick' | 'combatTick' | 'phase'>;

export class PresentationClock {
  private snapshot: {
    run: string;
    encounter: number;
    tick: number;
    combatTick: number;
    phase: string;
  } | null = null;
  private receivedAt = 0;
  private drawnTick = 0;
  private drawnCombatTick = 0;

  observe(view: Snapshot, wallTimeMs: number) {
    const old = this.snapshot;
    const reset =
      !old ||
      old.run !== view.run.id ||
      old.encounter !== view.encounter ||
      old.phase !== view.phase ||
      view.tick < old.tick ||
      view.combatTick < old.combatTick;
    if (reset) {
      this.drawnTick = view.tick;
      this.drawnCombatTick = view.combatTick;
    }
    if (reset || old!.tick !== view.tick || old!.combatTick !== view.combatTick) {
      this.receivedAt = Number.isFinite(wallTimeMs) ? wallTimeMs : 0;
      this.snapshot = {
        run: view.run.id,
        encounter: view.encounter,
        phase: view.phase,
        tick: view.tick,
        combatTick: view.combatTick,
      };
    }
  }

  sample(wallTimeMs: number) {
    const snapshot = this.snapshot;
    if (!snapshot) return { tick: 0, combatTick: 0 };
    const elapsed = Number.isFinite(wallTimeMs) ? Math.max(0, wallTimeMs - this.receivedAt) : 0;
    const lead = Math.min(PRESENTATION_LEAD_TICKS, (elapsed * HZ) / 1000);
    this.drawnTick = Math.max(this.drawnTick, snapshot.tick + lead);
    this.drawnCombatTick = Math.max(
      this.drawnCombatTick,
      snapshot.combatTick + (snapshot.phase === 'combat' ? lead : 0),
    );
    return { tick: this.drawnTick, combatTick: this.drawnCombatTick };
  }
}
