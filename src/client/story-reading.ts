import { storyCampaign } from "../shared/story-campaign.ts";
import type { StoryScene } from "./story-scenes.ts";
export const STORY_READING_KEY = "ga-story-reading-v1";
export const STORY_READING_LIMIT = 512;
type Store = Pick<Storage, "getItem" | "setItem">;
type Mark = [key: string, revision: string, index: number];
type Snapshot = { schemaVersion: 1; marks: Mark[] };
const fallback = new Map<string, Mark>(),
  sessions = new WeakMap<Store, Map<string, Mark>>();
function browserStore(): Store | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
function memory(store: Store | undefined) {
  if (!store) return fallback;
  let marks = sessions.get(store);
  if (!marks) {
    marks = new Map();
    sessions.set(store, marks);
  }
  return marks;
}
function remember(marks: Map<string, Mark>, mark: Mark) {
  marks.delete(mark[0]);
  marks.set(mark[0], mark);
  if (marks.size > STORY_READING_LIMIT)
    marks.delete(marks.keys().next().value!);
}
function snapshot(store: Store | undefined): Snapshot | undefined {
  if (!store) return undefined;
  try {
    const raw = store.getItem(STORY_READING_KEY);
    if (raw === null) return { schemaVersion: 1, marks: [] };
    if (typeof raw !== "string" || raw.length > 100000) return undefined;
    const v = JSON.parse(raw);
    if (
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).length !== 2 ||
      v.schemaVersion !== 1 ||
      !Array.isArray(v.marks) ||
      v.marks.length > STORY_READING_LIMIT
    )
      return undefined;
    const ids = new Set<string>();
    for (const m of v.marks) {
      if (
        !Array.isArray(m) ||
        m.length !== 3 ||
        typeof m[0] !== "string" ||
        m[0].length > 160 ||
        !m[0].startsWith(storyCampaign.id + ":") ||
        !/^[a-z0-9:_-]+$/i.test(m[0]) ||
        ids.has(m[0]) ||
        typeof m[1] !== "string" ||
        !/^[a-f0-9]{8}:\d{1,7}$/.test(m[1]) ||
        !Number.isSafeInteger(m[2]) ||
        m[2] < 0 ||
        m[2] > 100000
      )
        return undefined;
      ids.add(m[0]);
    }
    return v;
  } catch {
    return undefined;
  }
}
function key(scene: StoryScene) {
  return storyCampaign.id + ":" + scene.language + ":" + scene.id;
}
/** Non-security content stamp: edits restart reading instead of skipping new text. */
function revision(scene: StoryScene) {
  const text = JSON.stringify(
    scene.lines.map(({ kind: _kind, ...line }) => line),
  );
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, "0") + ":" + text.length;
}
export function storyReadingPosition(
  scene: StoryScene,
  store: Store | undefined = browserStore(),
) {
  const id = key(scene),
    stamp = revision(scene),
    saved = snapshot(store),
    local = memory(store).get(id),
    stored = saved?.marks.find((m) => m[0] === id),
    mark = local ?? stored;
  return {
    index: mark?.[1] === stamp ? Math.min(scene.lines.length - 1, mark[2]) : 0,
    persistent:
      saved !== undefined &&
      (!local ||
        Boolean(stored && stored[1] === local[1] && stored[2] === local[2])),
  };
}
/** Only local reading state is written. Profiles, unlocks, votes and rewards are separate. */
export function saveStoryReading(
  scene: StoryScene,
  index: number,
  store: Store | undefined = browserStore(),
) {
  const value = Number.isFinite(index)
      ? Math.max(0, Math.min(scene.lines.length - 1, Math.floor(index)))
      : 0,
    mark: Mark = [key(scene), revision(scene), value];
  remember(memory(store), mark);
  const saved = snapshot(store);
  if (!saved || !store) return false;
  const marks = saved.marks.filter((m) => m[0] !== mark[0]);
  marks.push(mark);
  while (marks.length > STORY_READING_LIMIT) marks.shift();
  try {
    store.setItem(
      STORY_READING_KEY,
      JSON.stringify({ schemaVersion: 1, marks }),
    );
    return true;
  } catch {
    return false;
  }
}
