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
    Object.keys(r).length === 14 &&
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
    if (
      old.schemaVersion === 1 &&
      old.practiceOnly === true &&
      old.verified === false &&
      [
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
      old.contentRevision = CONTENT_REVISION;
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
  if (view.run?.testingModified) {
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
    next.fullCampaign ||= old.fullCampaign;
    next.memorial ||= old.memorial;
    Object.assign(old, next);
  } else profile.runs.push(next);
  saveProfile(store, profile);
}
