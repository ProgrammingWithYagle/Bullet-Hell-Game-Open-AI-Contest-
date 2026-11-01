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
        (r.contentRevision === CONTENT_REVISION || (r.contentRevision === '1707fd9bd432dfb24107300944b99e70bcbe8a5e05077ddebaf0c2907013a1b1' && r.protocol === 47) || (r.contentRevision === 'e80e0f1d1bd444b1c5d16fae4c7aae322b31bcac70ac180b74964f6ba0326b48' && r.protocol === 47) || (r.contentRevision === '77b0d920d24b5f96e422f6697e8346e04cc88159920954261508b30d878d0264' && r.protocol === 47) || (r.contentRevision === 'f464a132bbc18083c5780239f18f24ff447a5be87de3e64db22d6881e7793290' && r.protocol === 47) || (r.contentRevision === '31bcd58adcfd8d9d1d76fc23b484237e68c266a513f2dedb2571f8a09067e131' && r.protocol === 46) || (r.contentRevision === '22f660b0d378316283eb081b458adcc4cd827f7465d9089ed9146ab2ac242c9c' && r.protocol === 46) || (r.contentRevision === 'fd77a95b869f368f49ce988f613db276385c45843e0152c69c3c67e13683a97b' && r.protocol <= 45) || (r.contentRevision === '5a4ffd871d1880ccb681aee1faa5e51a664385752977fa7a136b50d44c7c6927' && r.protocol <= 45) || (r.contentRevision === '39fd34dfd7530860d0ecfad5d7e86361438fae9bd3ac93881ec4fe51a3974322' && r.protocol <= 44) || (r.contentRevision === '15da4f590d2f2041f065732e48498551543beab9818f1f187df710d5de521d34' && r.protocol <= 44) || (r.contentRevision === '1ae4988671b4316e028ed42c6a9cd63c2efa26f046debad2fb75b8e1fc8e7f6d' && r.protocol <= 43)) &&
        Number.isSafeInteger(r.protocol) &&
        (r.mode!=='story'||(r.protocol>=46&&r.protocol<=PROTOCOL)) &&
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
  if (view.run.testingModified||view.run.customized) {
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
