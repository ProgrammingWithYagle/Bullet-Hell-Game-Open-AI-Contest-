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
const issuedRosters:Record<string,readonly ClassId[]>={
 'f28e23fd7430e62d25e262869eadc77f945e62f821c473c638a9b8faefcef589':implementedClassIds,
 'df1b63cc4adf21486fe0e142275b7b7634798f274f6e11de6f737ea0340feb28':implementedClassIds,
 '172934435baf5582387756d83e3bfc10872847bbd3e74087497b1206656bcf2c':implementedClassIds,
 'b3945ea273e982b3eb64d95fb278fd4fb2806ce74406fbcb6bb5148f5a683a38':implementedClassIds,
 '1733aa5ad71626b1c2d08231f4fa1c3ebc87ec72cbd4e5eff60c3ddc96e86c9a':implementedClassIds,
 'b63c012f16073da48f623c3bee255bbb42126545f831e6c9e5ce4053fabee052':implementedClassIds,
 'dc74b9f4d60656db95f0ccaac4b73cda247cc9834370ddbc21df222fcd76e8b9':implementedClassIds,
 'ab9c05008157f8aa069f47c7f23cb022622f0d0ef6be51424ae5ce2b91cc6230':implementedClassIds,
 'dbed606e76c6a9eca213580505238a0b82ee041ec1590264b062e614928ae14c':implementedClassIds,
 '8cc259ca145f72fd2492e1e1f7576e567fb41a903fc1a8e7fb5fda042379e37f':implementedClassIds,
 '4ab2898a2eb9f7f6b6041753cac7a7d6a2ebc7581e6256e79e9858c95567d232':implementedClassIds,
 '87a0e537a0bb27015572bd340c9761b1a05298d8c6250817a25d5011433b144f':implementedClassIds,
 '78d78be91de271588e2c3a35baac583f5f2f93412a89160bff3b58832c4c13f7':implementedClassIds,
 'd86d223b830a1bd0a75ad54e5fa4ee1b69075313e05d32502c12672559ffb4cd':implementedClassIds,
 '833b5a88a27000579adf2b9d5c12f113805d83184eb99dae71f9fba8cbf6a2fd':implementedClassIds,
 'da03a1304940cf65d0a3298fba1c5e4d84c53a199203f0e3f4c42081c9ec3de6':implementedClassIds,
 'd7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510':implementedClassIds,
 '2bcf8d4f883afe0a674ea23066435376c1cc97631de03dff74dadb4cfe373fea':implementedClassIds,
 '1d1292a7442e6eeab687739ce510eba46fd061ae087abd3d8ff51d2f0b7e0186':implementedClassIds,
 '9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f':implementedClassIds,
 'a6a17f1935ebd8e91d8d5916a7c8ee920190e13bc42a07e09dec98723e94390f':implementedClassIds,
 '1dd8789a6050eac2ca2f677bc15a8cdbfafaf78d73226d5be7cfbfc3ed70ba04':implementedClassIds,
 '8bda5e247f3df132a9c80f244fd8a7c2b3eaf468e2c6a8927f87a35937fbe110':implementedClassIds.slice(0,11),
 'f099f438f83d4f79da2fd18bc8cd680e3e8616e5febb50d7b78609b47d09bb32':implementedClassIds.slice(0,10),
 'e74efafe14d4694ef9afd8ea6df038c3fd0e697e4b6d5039f9a6d70173c8b6bd':implementedClassIds.slice(0,9),
 '85c266d3bbb2457910b5237bbab3769bd1ada06014d39ded5eefe5854e5392cb':implementedClassIds.slice(0,8),
 '5b8c858463c86d7e5d2fb70a547dd95ddcb5c38e20be547c39c4f1707e31e779':implementedClassIds.slice(0,7),
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
        ((r.contentRevision === CONTENT_REVISION && r.protocol===PROTOCOL) || (r.contentRevision==='f28e23fd7430e62d25e262869eadc77f945e62f821c473c638a9b8faefcef589'&&r.protocol===70) || (r.contentRevision==='df1b63cc4adf21486fe0e142275b7b7634798f274f6e11de6f737ea0340feb28'&&r.protocol===69) || (r.contentRevision==='172934435baf5582387756d83e3bfc10872847bbd3e74087497b1206656bcf2c'&&r.protocol===68) || (r.contentRevision==='b3945ea273e982b3eb64d95fb278fd4fb2806ce74406fbcb6bb5148f5a683a38'&&r.protocol===67) || (r.contentRevision==='1733aa5ad71626b1c2d08231f4fa1c3ebc87ec72cbd4e5eff60c3ddc96e86c9a'&&r.protocol===66) || (r.contentRevision==='b63c012f16073da48f623c3bee255bbb42126545f831e6c9e5ce4053fabee052'&&r.protocol===65) || (r.contentRevision==='dc74b9f4d60656db95f0ccaac4b73cda247cc9834370ddbc21df222fcd76e8b9'&&r.protocol===64) || (r.contentRevision==='ab9c05008157f8aa069f47c7f23cb022622f0d0ef6be51424ae5ce2b91cc6230'&&r.protocol===63) || (r.contentRevision==='dbed606e76c6a9eca213580505238a0b82ee041ec1590264b062e614928ae14c'&&r.protocol===62) || (r.contentRevision==='8cc259ca145f72fd2492e1e1f7576e567fb41a903fc1a8e7fb5fda042379e37f'&&r.protocol===61) || (r.contentRevision==='4ab2898a2eb9f7f6b6041753cac7a7d6a2ebc7581e6256e79e9858c95567d232'&&r.protocol===60) || (r.contentRevision==='87a0e537a0bb27015572bd340c9761b1a05298d8c6250817a25d5011433b144f'&&r.protocol===59) || (r.contentRevision==='78d78be91de271588e2c3a35baac583f5f2f93412a89160bff3b58832c4c13f7'&&r.protocol===58) || (r.contentRevision==='d86d223b830a1bd0a75ad54e5fa4ee1b69075313e05d32502c12672559ffb4cd'&&r.protocol===57) || (r.contentRevision==='833b5a88a27000579adf2b9d5c12f113805d83184eb99dae71f9fba8cbf6a2fd'&&r.protocol===56) || (r.contentRevision==='da03a1304940cf65d0a3298fba1c5e4d84c53a199203f0e3f4c42081c9ec3de6'&&r.protocol===55) || (r.contentRevision==='d7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510'&&r.protocol===54) || (r.contentRevision==='a6a17f1935ebd8e91d8d5916a7c8ee920190e13bc42a07e09dec98723e94390f'&&[49,50].includes(r.protocol)) || (r.contentRevision==='9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f'&&r.protocol===51) || (r.contentRevision==='1d1292a7442e6eeab687739ce510eba46fd061ae087abd3d8ff51d2f0b7e0186'&&r.protocol===52) || (r.contentRevision==='2bcf8d4f883afe0a674ea23066435376c1cc97631de03dff74dadb4cfe373fea'&&r.protocol===53) || (Object.hasOwn(issuedRosters,r.contentRevision)&&r.contentRevision!=='172934435baf5582387756d83e3bfc10872847bbd3e74087497b1206656bcf2c'&&r.contentRevision!=='b3945ea273e982b3eb64d95fb278fd4fb2806ce74406fbcb6bb5148f5a683a38'&&r.contentRevision!=='1733aa5ad71626b1c2d08231f4fa1c3ebc87ec72cbd4e5eff60c3ddc96e86c9a'&&r.contentRevision!=='b63c012f16073da48f623c3bee255bbb42126545f831e6c9e5ce4053fabee052'&&r.contentRevision!=='dc74b9f4d60656db95f0ccaac4b73cda247cc9834370ddbc21df222fcd76e8b9'&&r.contentRevision!=='ab9c05008157f8aa069f47c7f23cb022622f0d0ef6be51424ae5ce2b91cc6230'&&r.contentRevision!=='dbed606e76c6a9eca213580505238a0b82ee041ec1590264b062e614928ae14c'&&r.contentRevision!=='8cc259ca145f72fd2492e1e1f7576e567fb41a903fc1a8e7fb5fda042379e37f'&&r.contentRevision!=='4ab2898a2eb9f7f6b6041753cac7a7d6a2ebc7581e6256e79e9858c95567d232'&&r.contentRevision!=='87a0e537a0bb27015572bd340c9761b1a05298d8c6250817a25d5011433b144f'&&r.contentRevision!=='78d78be91de271588e2c3a35baac583f5f2f93412a89160bff3b58832c4c13f7'&&r.contentRevision!=='d86d223b830a1bd0a75ad54e5fa4ee1b69075313e05d32502c12672559ffb4cd'&&r.contentRevision!=='833b5a88a27000579adf2b9d5c12f113805d83184eb99dae71f9fba8cbf6a2fd'&&r.contentRevision!=='da03a1304940cf65d0a3298fba1c5e4d84c53a199203f0e3f4c42081c9ec3de6'&&r.contentRevision!=='d7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510'&&r.contentRevision!=='2bcf8d4f883afe0a674ea23066435376c1cc97631de03dff74dadb4cfe373fea'&&r.contentRevision!=='1d1292a7442e6eeab687739ce510eba46fd061ae087abd3d8ff51d2f0b7e0186'&&r.contentRevision!=='9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f'&&r.contentRevision!=='a6a17f1935ebd8e91d8d5916a7c8ee920190e13bc42a07e09dec98723e94390f'&&r.protocol===(['1dd8789a6050eac2ca2f677bc15a8cdbfafaf78d73226d5be7cfbfc3ed70ba04','8bda5e247f3df132a9c80f244fd8a7c2b3eaf468e2c6a8927f87a35937fbe110','f099f438f83d4f79da2fd18bc8cd680e3e8616e5febb50d7b78609b47d09bb32'].includes(r.contentRevision)?48:47)) || (r.contentRevision === '1707fd9bd432dfb24107300944b99e70bcbe8a5e05077ddebaf0c2907013a1b1' && r.protocol === 47) || (r.contentRevision === 'e80e0f1d1bd444b1c5d16fae4c7aae322b31bcac70ac180b74964f6ba0326b48' && r.protocol === 47) || (r.contentRevision === '77b0d920d24b5f96e422f6697e8346e04cc88159920954261508b30d878d0264' && r.protocol === 47) || (r.contentRevision === 'f464a132bbc18083c5780239f18f24ff447a5be87de3e64db22d6881e7793290' && r.protocol === 47) || (r.contentRevision === '31bcd58adcfd8d9d1d76fc23b484237e68c266a513f2dedb2571f8a09067e131' && r.protocol === 46) || (r.contentRevision === '22f660b0d378316283eb081b458adcc4cd827f7465d9089ed9146ab2ac242c9c' && r.protocol === 46) || (r.contentRevision === 'fd77a95b869f368f49ce988f613db276385c45843e0152c69c3c67e13683a97b' && r.protocol <= 45) || (r.contentRevision === '5a4ffd871d1880ccb681aee1faa5e51a664385752977fa7a136b50d44c7c6927' && r.protocol <= 45) || (r.contentRevision === '39fd34dfd7530860d0ecfad5d7e86361438fae9bd3ac93881ec4fe51a3974322' && r.protocol <= 44) || (r.contentRevision === '15da4f590d2f2041f065732e48498551543beab9818f1f187df710d5de521d34' && r.protocol <= 44) || (r.contentRevision === '1ae4988671b4316e028ed42c6a9cd63c2efa26f046debad2fb75b8e1fc8e7f6d' && r.protocol <= 43)) &&
        Number.isSafeInteger(r.protocol) && r.protocol>0 &&
        (r.contentRevision===CONTENT_REVISION?implementedClassIds:issuedRosters[r.contentRevision]??implementedClassIds.slice(0,7)).includes(r.classId) &&
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
  if(view.chapter)return true;
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
