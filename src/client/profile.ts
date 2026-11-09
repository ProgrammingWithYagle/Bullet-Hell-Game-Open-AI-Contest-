import {validStoryChoices,storyLength} from '../shared/story-campaign.ts';
import catalog from "../../content/catalog.json";
import {
  CONTENT_REVISION,
  PROTOCOL,
  implementedClassIds,
  type ClassId,
  type ModeId,
  type BossId,
} from "../shared/protocol.ts";
import { validProgress } from "../shared/run-progress.ts";
import type { View } from "../shared/view.ts";
import { practiceRecords, type PracticeCampaignRecord } from "./progress.ts";
import {
  defaultControls,
  migrateMobilityControls,
  validControls,
  type ControlOptions,
} from "./input-bindings.ts";
import {
  defaultPreferences,
  migratePreferences,
  validPreferences,
  type Preferences,
} from "./preferences.ts";
export const PROFILE_KEY = "ga-profile-v1";
export const PROFILE_BACKUP_KEY = "ga-profile-v1-backup";
export const MAX_PROFILE_BYTES = 2 * 1024 * 1024;
export type ProfileStore = Pick<Storage, "getItem" | "setItem">;
export const cosmeticIds = [
  "field-mark",
  "bronze-bell",
  "silver-bell",
  "gilded-bell",
  "vigil-crown",
  "remembered-bell",
] as const;
export type CosmeticId = (typeof cosmeticIds)[number];
export const masteryThresholds = [0, 5, 15, 30, 60] as const;
export type RunReceipt = {
  runId: string;
  playerId: string;
  mode: ModeId;
  difficulty: string;
  classId: ClassId;
  clears: number;
  rescues: number;
  firstEncounter: number;
  campaignClears: number;
  bossIds: BossId[];
  teamClears: number;
  combatTicks: number;
  fullCampaign: boolean;
  memorial: boolean;
  storyChoices?: number[];
};
export type ProfileV1 = {
  schemaVersion: 1;
  contentRevision: string;
  practiceOnly: true;
  verified: false;
  locale: string;
  settings: Preferences;
  controls: ControlOptions;
  selectedCosmetic: CosmeticId;
  runs: RunReceipt[];
  legacyCampaigns: PracticeCampaignRecord[];
};
const id = (s: unknown, maximum = 100): s is string =>
  typeof s === "string" && s.length <= maximum && /^[A-Za-z0-9_-]+$/.test(s);
const integer = (n: unknown, maximum = 0xffffffff): n is number =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= maximum;
const mode = (s: unknown) => catalog.modes.find((m) => m.id === s);
const difficulty = (s: unknown) => catalog.difficulties.some((d) => d.id === s);
export function freshProfile(): ProfileV1 {
  return {
    schemaVersion: 1,
    contentRevision: CONTENT_REVISION,
    practiceOnly: true,
    verified: false,
    locale: "en",
    settings: defaultPreferences(),
    controls: defaultControls(),
    selectedCosmetic: "field-mark",
    runs: [],
    legacyCampaigns: [],
  };
}
export function summary(profile: ProfileV1) {
  const classes = Object.fromEntries(
    implementedClassIds.map((id) => [
      id,
      { clears: 0, rescues: 0, xp: 0, tier: 0 },
    ]),
  ) as Record<
    ClassId,
    { clears: number; rescues: number; xp: number; tier: number }
  >;
  const lore = new Set<BossId>(),
    streaks: Record<string, { personal: number; squad: number }> = {};
  let hardUnlocked = false,
    memorial = false;
  for (const r of profile.runs) {
    classes[r.classId].clears += r.clears;
    classes[r.classId].rescues += r.rescues;
    for (const b of r.bossIds) lore.add(b);
    hardUnlocked ||= r.fullCampaign && r.difficulty === "hard";
    memorial ||= r.memorial;
    if (r.mode === "endless") {
      const best = (streaks[r.difficulty] ??= { personal: 0, squad: 0 });
      best.personal = Math.max(best.personal, r.clears);
      best.squad = Math.max(best.squad, r.teamClears);
    }
  }
  let totalClears = 0,
    totalRescues = 0;
  for (const c of Object.values(classes)) {
    c.xp = c.clears * 100;
    c.tier = masteryThresholds.filter((n) => c.clears >= n).length - 1;
    totalClears += c.clears;
    totalRescues += c.rescues;
  }
  const cosmetics: CosmeticId[] = cosmeticIds.filter((c, i) =>
    i < 5 ? totalClears >= masteryThresholds[i] : memorial,
  );
  return {
    classes,
    lore,
    streaks,
    hardUnlocked,
    memorial,
    cosmetics,
    totalClears,
    totalRescues,
    campaigns: profile.runs.filter((r) => r.fullCampaign).length,
  };
}
function validReceipt(value: unknown): value is RunReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as RunReceipt,
    m = mode(r.mode);
  return (
    Object.keys(r).length === (r.mode === "story" ? 15 : 14) &&
    (r.mode === "story" ? (validStoryChoices(r.storyChoices) && r.storyChoices.length >= Math.min(Math.max(0,r.teamClears-1),storyLength-1) && r.storyChoices.length <= Math.min(r.teamClears,storyLength-1) && (!r.fullCampaign || r.storyChoices.length===storyLength-1)) : r.storyChoices === undefined) &&
    id(r.runId) &&
    id(r.playerId, 64) &&
    Boolean(m) &&
    difficulty(r.difficulty) &&
    implementedClassIds.includes(r.classId) &&
    integer(r.teamClears, 1000000) &&
    integer(r.combatTicks) &&
    validProgress(
      {
        clears: r.clears,
        rescues: r.rescues,
        firstEncounter: r.firstEncounter,
        campaignClears: r.campaignClears,
        clearedBossIds: [],
      },
      r.teamClears,
    ) &&
    Array.isArray(r.bossIds) &&
    r.bossIds.length <= catalog.bosses.length &&
    new Set(r.bossIds).size === r.bossIds.length &&
    r.bossIds.every((id) => catalog.bosses.some((b) => b.id === id)) &&
    typeof r.fullCampaign === "boolean" &&
    typeof r.memorial === "boolean" &&
    (!r.fullCampaign ||
      (r.mode !== "endless" &&
        r.firstEncounter === 0 &&
        r.campaignClears === m!.encounters)) &&
    (!r.memorial ||
      (r.mode !== "endless" &&
        r.bossIds.includes("uncounted") &&
        r.clears > r.campaignClears))
  );
}
export function validateProfile(value: unknown): asserts value is ProfileV1 {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("ui.errorProfile");
  const p = value as ProfileV1;
  if (
    Object.keys(p).length !== 10 ||
    p.schemaVersion !== 1 ||
    p.contentRevision !== CONTENT_REVISION ||
    p.practiceOnly !== true ||
    p.verified !== false ||
    !catalog.locales.some((l) => l.id === p.locale) ||
    !validPreferences(p.settings) ||
    !validControls(p.controls) ||
    !Array.isArray(p.runs) ||
    p.runs.length > 10000 ||
    !p.runs.every(validReceipt) ||
    new Set(p.runs.map((r) => r.runId + ":" + r.playerId)).size !==
      p.runs.length ||
    !Array.isArray(p.legacyCampaigns) ||
    p.legacyCampaigns.length > 50
  )
    throw Error("ui.errorProfile");
  // Retained legacy clears have no personal participation proof and never award mastery/unlocks.
  const old = practiceRecords({
    getItem: () => JSON.stringify(p.legacyCampaigns),
    setItem: () => {},
  });
  const legacyKeys = new Set([
    "schemaVersion",
    "id",
    "practiceOnly",
    "verified",
    "contentRevision",
    "protocol",
    "mode",
    "difficulty",
    "classId",
    "completedEncounters",
    "accords",
    "combatTicks",
    "secret",
    "memorial",
  ]);
  if (
    old.length !== p.legacyCampaigns.length ||
    p.legacyCampaigns.some((r) =>
      Object.keys(r).some((k) => !legacyKeys.has(k)),
    ) ||
    !summary(p).cosmetics.includes(p.selectedCosmetic)
  )
    throw Error("ui.errorProfile");
}
export function parseProfile(raw: string): ProfileV1 {
  if (
    typeof raw !== "string" ||
    raw.length > MAX_PROFILE_BYTES ||
    new TextEncoder().encode(raw).byteLength > MAX_PROFILE_BYTES
  )
    throw Error("ui.errorProfile");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error("ui.errorProfile");
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const old = value as Record<string, unknown>;
    const issuedRevision=old.contentRevision;
    // An older edition cannot contain clears from a discipline not yet in its roster.
    if(typeof old.contentRevision==='string'&&old.contentRevision!==CONTENT_REVISION){
      const recentRosters:Record<string,number>={
        'df1b63cc4adf21486fe0e142275b7b7634798f274f6e11de6f737ea0340feb28':12,
        '172934435baf5582387756d83e3bfc10872847bbd3e74087497b1206656bcf2c':12,
        'b3945ea273e982b3eb64d95fb278fd4fb2806ce74406fbcb6bb5148f5a683a38':12,
        '1733aa5ad71626b1c2d08231f4fa1c3ebc87ec72cbd4e5eff60c3ddc96e86c9a':12,
        'b63c012f16073da48f623c3bee255bbb42126545f831e6c9e5ce4053fabee052':12,
        'dc74b9f4d60656db95f0ccaac4b73cda247cc9834370ddbc21df222fcd76e8b9':12,
        'ab9c05008157f8aa069f47c7f23cb022622f0d0ef6be51424ae5ce2b91cc6230':12,
        'dbed606e76c6a9eca213580505238a0b82ee041ec1590264b062e614928ae14c':12,
        '8cc259ca145f72fd2492e1e1f7576e567fb41a903fc1a8e7fb5fda042379e37f':12,
        '4ab2898a2eb9f7f6b6041753cac7a7d6a2ebc7581e6256e79e9858c95567d232':12,
        '87a0e537a0bb27015572bd340c9761b1a05298d8c6250817a25d5011433b144f':12,
        '78d78be91de271588e2c3a35baac583f5f2f93412a89160bff3b58832c4c13f7':12,
        'd86d223b830a1bd0a75ad54e5fa4ee1b69075313e05d32502c12672559ffb4cd':12,
        '833b5a88a27000579adf2b9d5c12f113805d83184eb99dae71f9fba8cbf6a2fd':12,
        'da03a1304940cf65d0a3298fba1c5e4d84c53a199203f0e3f4c42081c9ec3de6':12,
        'd7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510':12,
        '2bcf8d4f883afe0a674ea23066435376c1cc97631de03dff74dadb4cfe373fea':12,
        '1d1292a7442e6eeab687739ce510eba46fd061ae087abd3d8ff51d2f0b7e0186':12,
        '9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f':12,
        'a6a17f1935ebd8e91d8d5916a7c8ee920190e13bc42a07e09dec98723e94390f':12,
        '1dd8789a6050eac2ca2f677bc15a8cdbfafaf78d73226d5be7cfbfc3ed70ba04':12,
        '8bda5e247f3df132a9c80f244fd8a7c2b3eaf468e2c6a8927f87a35937fbe110':11,
        'f099f438f83d4f79da2fd18bc8cd680e3e8616e5febb50d7b78609b47d09bb32':10,
        'e74efafe14d4694ef9afd8ea6df038c3fd0e697e4b6d5039f9a6d70173c8b6bd':9,
        '85c266d3bbb2457910b5237bbab3769bd1ada06014d39ded5eefe5854e5392cb':8,
      };
      const roster:readonly string[]=implementedClassIds.slice(0,recentRosters[old.contentRevision]??7);
      if(Array.isArray(old.runs)&&old.runs.some(r=>r&&typeof r==='object'&&typeof r.classId==='string'&&!roster.includes(r.classId)))throw Error('ui.errorProfile');
    }
    if(old.contentRevision==='df1b63cc4adf21486fe0e142275b7b7634798f274f6e11de6f737ea0340feb28'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='172934435baf5582387756d83e3bfc10872847bbd3e74087497b1206656bcf2c'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='b3945ea273e982b3eb64d95fb278fd4fb2806ce74406fbcb6bb5148f5a683a38'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='1733aa5ad71626b1c2d08231f4fa1c3ebc87ec72cbd4e5eff60c3ddc96e86c9a'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='b63c012f16073da48f623c3bee255bbb42126545f831e6c9e5ce4053fabee052'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='dc74b9f4d60656db95f0ccaac4b73cda247cc9834370ddbc21df222fcd76e8b9'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='ab9c05008157f8aa069f47c7f23cb022622f0d0ef6be51424ae5ce2b91cc6230'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='dbed606e76c6a9eca213580505238a0b82ee041ec1590264b062e614928ae14c'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='8cc259ca145f72fd2492e1e1f7576e567fb41a903fc1a8e7fb5fda042379e37f'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='4ab2898a2eb9f7f6b6041753cac7a7d6a2ebc7581e6256e79e9858c95567d232'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='87a0e537a0bb27015572bd340c9761b1a05298d8c6250817a25d5011433b144f'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='78d78be91de271588e2c3a35baac583f5f2f93412a89160bff3b58832c4c13f7'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='d86d223b830a1bd0a75ad54e5fa4ee1b69075313e05d32502c12672559ffb4cd'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='833b5a88a27000579adf2b9d5c12f113805d83184eb99dae71f9fba8cbf6a2fd'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='da03a1304940cf65d0a3298fba1c5e4d84c53a199203f0e3f4c42081c9ec3de6'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='d7aea7cb50f954a88d02ff12291808900bbd00d1e4445c4e0af2655168132510'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='2bcf8d4f883afe0a674ea23066435376c1cc97631de03dff74dadb4cfe373fea'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='1d1292a7442e6eeab687739ce510eba46fd061ae087abd3d8ff51d2f0b7e0186'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='9b4db7927068a0b75ba0d915094354eb66102090eeed913b8d013e3c9459233f'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='a6a17f1935ebd8e91d8d5916a7c8ee920190e13bc42a07e09dec98723e94390f'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='1dd8789a6050eac2ca2f677bc15a8cdbfafaf78d73226d5be7cfbfc3ed70ba04'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='8bda5e247f3df132a9c80f244fd8a7c2b3eaf468e2c6a8927f87a35937fbe110'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false)old.contentRevision=CONTENT_REVISION;
    if(old.contentRevision==='f099f438f83d4f79da2fd18bc8cd680e3e8616e5febb50d7b78609b47d09bb32'&&old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false){
      if(Array.isArray(old.runs)&&old.runs.some(r=>r?.classId==='ranger'))throw Error('ui.errorProfile');
      old.contentRevision=CONTENT_REVISION;
    }
    if(old.schemaVersion===1&&old.practiceOnly===true&&old.verified===false&&(old.contentRevision==="e74efafe14d4694ef9afd8ea6df038c3fd0e697e4b6d5039f9a6d70173c8b6bd"||old.contentRevision==="85c266d3bbb2457910b5237bbab3769bd1ada06014d39ded5eefe5854e5392cb"||old.contentRevision==="5b8c858463c86d7e5d2fb70a547dd95ddcb5c38e20be547c39c4f1707e31e779"||old.contentRevision==="fd913548f72bfaea33f52a16821f786491d647c10677d8c8957b248c2da799db"||old.contentRevision==="1707fd9bd432dfb24107300944b99e70bcbe8a5e05077ddebaf0c2907013a1b1"||old.contentRevision==="e80e0f1d1bd444b1c5d16fae4c7aae322b31bcac70ac180b74964f6ba0326b48"||old.contentRevision==="77b0d920d24b5f96e422f6697e8346e04cc88159920954261508b30d878d0264"||old.contentRevision==="f464a132bbc18083c5780239f18f24ff447a5be87de3e64db22d6881e7793290"||old.contentRevision==="22f660b0d378316283eb081b458adcc4cd827f7465d9089ed9146ab2ac242c9c"||old.contentRevision==="31bcd58adcfd8d9d1d76fc23b484237e68c266a513f2dedb2571f8a09067e131"))old.contentRevision=CONTENT_REVISION;
    if (
      old.schemaVersion === 1 &&
      old.practiceOnly === true &&
      old.verified === false &&
      [
        "fd77a95b869f368f49ce988f613db276385c45843e0152c69c3c67e13683a97b",
        "5a4ffd871d1880ccb681aee1faa5e51a664385752977fa7a136b50d44c7c6927",
        "39fd34dfd7530860d0ecfad5d7e86361438fae9bd3ac93881ec4fe51a3974322",
        "15da4f590d2f2041f065732e48498551543beab9818f1f187df710d5de521d34",
        "1ae4988671b4316e028ed42c6a9cd63c2efa26f046debad2fb75b8e1fc8e7f6d",
        "6bf9b3f3f87c98e2e552b99e4dbf6ae856b57b3aba032d03a72bcc97c8367cdd",
        "6f97c9a4f3aabc87e6875b99e18aba60f667335d501ec50e94d215a1f8bc806c",
        "7266df2511e22b94f34915a97c0b4a61e2881778de5cfddff4011a41c2f29fe2",
        "94552a8007ad25febb2f9c8e212ffdf28360bcb1df528a7c7ab226f7388ee675","0d8d0df4d5bd156da29529164a249489dcb3f3dbdda7026921bcc76555eb6266",
        "b6cdeb5a0d7475f65192d16f26a91d31660e9593843704738e1ddf494f5191bb",
        "90c1bd18708bffd5fab92a98490b9f173ba4cdb85956aabda8fef67c4cd6c28d",
        "850f5e0dd38cfd283ff0dbf079892b3595ccc489a95c70586e4fd4a24505402b",
        "e6db0059a1510315047e400e2c135ca2fd3a0368cea21c035946ff6a877631b2",
        "39ca64136ddb477d344eb75408a22ed239af57efb1d3a3a4f5893ac33c13864d",
        "43b7b2848b50bbe56072bfa134e5775355a7faca28092624744bdae6a0d318bb",
        "cbb6b8e68c9fb6f3191a3f0ef4a6411c8a3d3e41e3aeca783c122b07ab73d546",
        "1ad00eee45a117a45929e56884c6a39a8c4eb614b0728ab31e847403fb8735bb",
        "d4419d906f67286576ca3f6795e03a921269aff861b36e2e82ce68aa2e501775",
        "535eb34c7cdabce5ad2fe910ea0a792278a7cc08e360b4f5712d7ee2d9e767f6",
        "b6d1eca2e4cc89073c4e45a5007b4e39ff98bc30ba98337782777170210a0438",
        "cc48fbf30b18e546d600b05f4c4648330cfd012631c53fd7a4fe57b734b7a97b",
        "a36ec57bba4b76a595d42ac812c69bbda0ab2305ea22cf131b1770e03a57d9d2",
        "27c4b2e298912b53f88b115654857f923966aeccdb80b730e449536a2045ef27",
        "da37e2a0e2beb54343495ce39027211df254fa1c79ab42ec3f3360373ad792db",
        "9598869248912ad6a787d6e72791183acf4e12d38da92f2a677164f93e3f51c7",
        "312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006",
        "86ace79844ae1abe21b7fa54d18fa2de1f4316a2b5a0578c1878e6b27479ffdf",
        "82763fd1f5288303f8170a798b656f5443fc8f5236b652786a9e3b27070c41af",
        "b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241",
      ].includes(String(old.contentRevision))
    )
      {
        if(Array.isArray(old.runs)&&old.runs.some(r=>r?.mode==="story"))throw Error("ui.errorProfile");
        old.controls=migrateMobilityControls(old.controls);old.contentRevision = CONTENT_REVISION;
      }
    if(issuedRevision!==CONTENT_REVISION&&old.contentRevision===CONTENT_REVISION)old.controls=migrateMobilityControls(old.controls);
    const prefs = old.settings;
    if (
      prefs &&
      typeof prefs === "object" &&
      !Array.isArray(prefs) &&
      Object.keys(prefs).length === 8 &&
      !Object.hasOwn(prefs, "branchingTree")
    )
      old.settings = { ...prefs, branchingTree: false };
    const current=old.settings;
    if(current&&typeof current==='object'&&!Array.isArray(current)&&Object.keys(current).length===9&&!Object.hasOwn(current,'showNames')&&!Object.hasOwn(current,'roomChat'))old.settings={...current,showNames:true,roomChat:true};
    const layout=old.settings;
    if(layout&&typeof layout==='object'&&!Array.isArray(layout)&&Object.keys(layout).length===11&&!Object.hasOwn(layout,'combatLayout'))old.settings={...layout,combatLayout:'grouped'};
  }
  validateProfile(value);
  return value;
}
export function loadProfile(store: ProfileStore): ProfileV1 {
  const raw = store.getItem(PROFILE_KEY);
  if (raw !== null) return parseProfile(raw);
  const p = freshProfile();
  const locale = store.getItem("ga-language");
  if (catalog.locales.some((l) => l.id === locale)) p.locale = locale!;
  try {
    p.settings = migratePreferences(
      JSON.parse(store.getItem("ga-settings") ?? "{}"),
    );
  } catch {}
  p.legacyCampaigns = practiceRecords(store);
  return p;
}
/** localStorage replaces one value atomically. Keep the old bytes before replacing it. */
export function saveProfile(store: ProfileStore, profile: ProfileV1) {
  validateProfile(profile);
  const raw = JSON.stringify(profile);
  if (new TextEncoder().encode(raw).byteLength > MAX_PROFILE_BYTES)
    throw Error("ui.errorSave");
  const previous = store.getItem(PROFILE_KEY);
  if (previous === raw) return;
  if (previous !== null) store.setItem(PROFILE_BACKUP_KEY, previous);
  store.setItem(PROFILE_KEY, raw);
}
export function changeProfile(
  store: ProfileStore,
  change: (p: ProfileV1) => void,
) {
  const p = loadProfile(store);
  change(p);
  saveProfile(store, p);
  return p;
}
export function importProfile(store: ProfileStore, raw: string) {
  const next = parseProfile(raw);
  saveProfile(store, next);
  return next;
}
export function exportProfile(store: ProfileStore) {
  return JSON.stringify(loadProfile(store), null, 2) + "\n";
}
export function difficultyUnlocked(profile: ProfileV1, difficultyId: string) {
  const d = catalog.difficulties.find((d) => d.id === difficultyId);
  return Boolean(d && (!d.locked || summary(profile).hardUnlocked));
}
export function recordProfileView(
  view: View,
  playerId: string,
  store: ProfileStore,
) {
  if(view.chapter)return;
  if (view.run?.testingModified||view.run?.customized) {
    changeProfile(store, (profile) => {
      profile.runs = profile.runs.filter((r) => r.runId !== view.run.id || r.playerId !== playerId);
      profile.legacyCampaigns = profile.legacyCampaigns.filter((r) => r.id !== view.run.id);
      if (!summary(profile).cosmetics.includes(profile.selectedCosmetic)) profile.selectedCosmetic = "field-mark";
    });
    return;
  }
  const p = view.players.find((p) => p.id === playerId);
  if (
    !p ||
    !view.run ||
    p.progress.firstEncounter < 0 ||
    !validProgress(p.progress, view.encounter)
  )
    return;
  if (p.progress.clears === 0 && p.progress.rescues === 0) return;
  const next: RunReceipt = {
    ...(view.run.mode === "story" ? {storyChoices:[...(view.storyChoices??[])]} : {}),
    runId: view.run.id,
    playerId,
    mode: view.run.mode,
    difficulty: view.run.difficulty,
    classId: p.classId,
    clears: p.progress.clears,
    rescues: p.progress.rescues,
    firstEncounter: p.progress.firstEncounter,
    campaignClears: p.progress.campaignClears,
    bossIds: [...p.progress.clearedBossIds],
    teamClears: view.encounter,
    combatTicks: view.combatTick,
    fullCampaign: Boolean(
      view.campaignBank &&
      p.progress.firstEncounter === 0 &&
      p.progress.campaignClears === view.campaignBank.encounters,
    ),
    memorial: Boolean(
      view.campaignBank &&
      view.secretStatus === "cleared" &&
      view.extensionParticipants.includes(playerId) &&
      p.progress.clearedBossIds.includes("uncounted"),
    ),
  };
  if (!validReceipt(next)) throw Error("ui.errorProfile");
  const profile = loadProfile(store),
    old = profile.runs.find(
      (r) => r.runId === next.runId && r.playerId === playerId,
    );
  if (old) {
    if (
      old.classId !== next.classId ||
      old.mode !== next.mode ||
      old.difficulty !== next.difficulty ||
      old.firstEncounter !== next.firstEncounter
    )
      throw Error("ui.errorProfile");
    // Old checkpoint views must never erase already banked progress or duplicate its reward.
    for (const k of [
      "clears",
      "rescues",
      "campaignClears",
      "teamClears",
      "combatTicks",
    ] as const)
      next[k] = Math.max(old[k], next[k]);
    next.bossIds = [...new Set([...old.bossIds, ...next.bossIds])];
    if(next.mode === "story" && (old.fullCampaign || (old.storyChoices?.length??0) > (next.storyChoices?.length??0)))next.storyChoices=[...old.storyChoices!];
    next.fullCampaign ||= old.fullCampaign;
    next.memorial ||= old.memorial;
    Object.assign(old, next);
  } else profile.runs.push(next);
  saveProfile(store, profile);
}
