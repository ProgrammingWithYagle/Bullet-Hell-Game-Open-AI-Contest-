import catalog from '../../content/catalog.json' with { type: 'json' };
import { type BossId } from './protocol.ts';
import { Random } from './random.ts';
import { exclusiveBossIds } from './endless-director.ts';
export const routeBossIds = catalog.bosses
  .filter((b) => ['short', 'standard', 'long', 'raid'].includes(b.route))
  .map((b) => b.id as BossId);
export const openingBossIds = [
  'constable',
  'courier',
  'tollkeeper',
  'lantern-warden',
  'ratcatcher',
  'quarantine-clerk',
] as const;
export type EndlessHistory = { recent: BossId[]; routeBag: BossId[]; exclusiveBag: BossId[] };
export const freshEndlessHistory = (): EndlessHistory => ({
  recent: [],
  routeBag: [],
  exclusiveBag: [],
});
export function validEndlessHistory(value: unknown): value is EndlessHistory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as EndlessHistory;
  return (
    Object.keys(s).length === 3 &&
    (['recent', 'routeBag', 'exclusiveBag'] as const).every(
      (k) =>
        Array.isArray(s[k]) &&
        new Set(s[k]).size === s[k].length &&
        s[k].length <= (k === 'recent' ? 12 : k === 'routeBag' ? 50 : 9) &&
        s[k].every((id) =>
          k === 'exclusiveBag'
            ? exclusiveBossIds.some((x) => x === id)
            : k === 'routeBag'
              ? routeBossIds.includes(id)
              : routeBossIds.includes(id) || exclusiveBossIds.some((x) => x === id),
        ),
    )
  );
}
/** Offered candidates stay in their seeded bag until actually defeated. */
export class EndlessSchedule {
  state = freshEndlessHistory();
  record(id: BossId) {
    if (id === 'uncounted') return;
    this.state.recent = [...this.state.recent, id].slice(-12);
    this.state.routeBag = this.state.routeBag.filter((x) => x !== id);
    this.state.exclusiveBag = this.state.exclusiveBag.filter((x) => x !== id);
  }
  offer(completed: number, rng: Random): BossId[] {
    const exclusive = (completed + 1) % 4 === 0,
      key = exclusive ? 'exclusiveBag' : 'routeBag',
      pool: readonly BossId[] = exclusive ? exclusiveBossIds : routeBossIds;
    const allowed = (id: BossId) =>
      !this.state.recent.includes(id) && (completed >= 3 || openingBossIds.some((x) => x === id));
    let candidates = this.state[key].filter(allowed);
    if (candidates.length < 3) {
      const refill = rng.shuffle(pool.filter((id) => allowed(id) && !this.state[key].includes(id)));
      this.state[key].push(...refill);
      candidates = this.state[key].filter(allowed);
    }
    if (candidates.length < 3)
      throw Error('Endless schedule has fewer than three eligible identities');
    return candidates.slice(0, 3);
  }
}
