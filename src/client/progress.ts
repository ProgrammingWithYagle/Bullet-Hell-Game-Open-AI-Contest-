import {
  CONTENT_REVISION,
  PROTOCOL,
  implementedClassIds,
  type ClassId,
  type ModeId,
} from '../shared/protocol.ts';
import catalog from '../../content/catalog.json';
import type { View } from '../shared/view.ts';
export const PRACTICE_RECORDS_KEY = 'ga-practice-campaign-records-v1';
export type PracticeCampaignRecord = {
  schemaVersion: 1;
  id: string;
  practiceOnly: true;
  verified: false;
  contentRevision: string;
  protocol: number;
  mode: ModeId;
  difficulty: string;
  classId: ClassId;
  completedEncounters: number;
  accords: number;
  combatTicks: number;
  secret: View['secretStatus'];
  memorial: boolean;
};
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export function practiceRecords(store: Store): PracticeCampaignRecord[] {
  try {
    const raw = store.getItem(PRACTICE_RECORDS_KEY);
    if (!raw || raw.length > 100000) return [];
    const records = JSON.parse(raw);
    if (!Array.isArray(records) || records.length > 50) return [];
    return records.filter(
      (r: PracticeCampaignRecord) =>
        r &&
        r.schemaVersion === 1 &&
        typeof r.id === 'string' &&
        r.id.length <= 100 &&
        r.practiceOnly === true &&
        r.verified === false &&
        r.contentRevision === CONTENT_REVISION &&
        Number.isSafeInteger(r.protocol) &&
        implementedClassIds.includes(r.classId) &&
        catalog.modes.some(
          (m) => m.id === r.mode && m.id !== 'endless' && m.encounters === r.completedEncounters,
        ) &&
        catalog.difficulties.some((d) => d.id === r.difficulty) &&
        Number.isSafeInteger(r.accords) &&
        r.accords >= 0 &&
        Number.isSafeInteger(r.combatTicks) &&
        r.combatTicks >= 0 &&
        ['locked', 'offered', 'declined', 'active', 'cleared', 'failed'].includes(r.secret) &&
        typeof r.memorial === 'boolean' &&
        (!r.memorial || r.secret === 'cleared'),
    );
  } catch {
    return [];
  }
}
export function recordPracticeCampaign(view: View, playerId: string, store: Store) {
  if (view.run.testingModified) {
    try {
      const previous = practiceRecords(store), kept = previous.filter((r) => r.id !== view.run.id);
      if (kept.length !== previous.length) store.setItem(PRACTICE_RECORDS_KEY, JSON.stringify(kept));
      return true;
    } catch { return false; }
  }
  const bank = view.campaignBank,
    p = view.players.find((p) => p.id === playerId);
  if (!bank || !p || !p.eligible) return true;
  if (
    !catalog.modes.some(
      (m) => m.id === bank.mode && m.id !== 'endless' && m.encounters === bank.encounters,
    )
  )
    return false;
  const record: PracticeCampaignRecord = {
    schemaVersion: 1,
    id: bank.runId,
    practiceOnly: true,
    verified: false,
    contentRevision: CONTENT_REVISION,
    protocol: PROTOCOL,
    mode: bank.mode,
    difficulty: bank.difficulty,
    classId: p.classId,
    completedEncounters: bank.encounters,
    accords: bank.accords,
    combatTicks: bank.combatTick,
    secret:
      view.secretStatus === 'cleared' && !view.extensionParticipants.includes(playerId)
        ? 'declined'
        : view.secretStatus,
    memorial: view.secretStatus === 'cleared' && view.extensionParticipants.includes(playerId),
  };
  try {
    const previous = practiceRecords(store),
      old = previous.find((r) => r.id === record.id);
    if (old?.memorial) {
      record.memorial = true;
      record.secret = 'cleared';
    }
    const records = [record, ...previous.filter((r) => r.id !== record.id)].slice(0, 50);
    store.setItem(PRACTICE_RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
