import { HZ } from '../shared/protocol.ts';
import hints from './constable-phase-hints.json';
export const constablePhaseHints = hints;
export function constablePhaseHint(phase: number, variant: string, language: string) {
  const words = hints[language as keyof typeof hints] ?? hints.en;
  const index = Math.max(0, Math.min(3, Math.floor(phase)));
  return words[(variant !== 'normal' ? 4 : 0) + index];
}
// One entry highlight per actual encounter/phase; repeated patches never restart it.
export class BossPhaseFeedback {
  private key = '';
  private beganAt = 0;
  sample(
    encounter: number,
    bossId: string,
    phase: number,
    variant: string,
    tick: number,
    combat: boolean,
  ) {
    if (!combat || !Number.isFinite(tick)) {
      this.key = '';
      return false;
    }
    const key = [encounter, bossId, phase, variant].join(':');
    if (key !== this.key || tick < this.beganAt) {
      this.key = key;
      this.beganAt = tick;
    }
    return tick - this.beganAt < 4 * HZ;
  }
}
