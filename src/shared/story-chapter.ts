import type { Phase } from './protocol.ts';
export const openingChapterId = 'one-place-left';
export const chapterNodeIds = ['gate-constable', 'street-clearance', 'ward-matron'] as const;
export type ChapterNodeId = (typeof chapterNodeIds)[number];
export type ChapterStage =
  'lobby' | 'combat' | 'reading' | 'choice' | 'prepare' | 'complete' | 'failed';
export type StoryChapterState = {
  schemaVersion: 1;
  id: typeof openingChapterId;
  stage: ChapterStage;
  completedNodes: ChapterNodeId[];
  route: 0 | 1 | 2 | null;
  participation: Record<string, ChapterNodeId[]>;
};
export const chapterParticipation = (
  chapter: StoryChapterState,
  actorId: string,
): ChapterNodeId[] =>
  Object.hasOwn(chapter.participation, actorId) ? chapter.participation[actorId] : [];
const id = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
export function validStoryChapter(value: unknown): value is StoryChapterState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as StoryChapterState;
  if (
    Object.keys(v).length !== 6 ||
    !['schemaVersion', 'id', 'stage', 'completedNodes', 'route', 'participation'].every((key) =>
      Object.hasOwn(v, key),
    ) ||
    v.schemaVersion !== 1 ||
    v.id !== openingChapterId ||
    !['lobby', 'combat', 'reading', 'choice', 'prepare', 'complete', 'failed'].includes(v.stage) ||
    !Array.isArray(v.completedNodes) ||
    v.completedNodes.length > 3 ||
    !v.completedNodes.every((node, index) => node === chapterNodeIds[index]) ||
    (v.route !== null && ![0, 1, 2].includes(v.route)) ||
    !v.participation ||
    typeof v.participation !== 'object' ||
    Array.isArray(v.participation) ||
    Object.keys(v.participation).length > 50
  )
    return false;
  const n = v.completedNodes.length;
  if (
    v.stage === 'lobby' &&
    (n !== 0 || v.route !== null || Object.keys(v.participation).length !== 0)
  )
    return false;
  if (v.stage === 'combat' && (n >= 3 || (n > 0 && v.route === null))) return false;
  if (v.stage === 'reading' && n === 0) return false;
  if (v.stage === 'reading' && n === 1 && v.route !== null) return false;
  if (v.stage === 'choice' && (n !== 1 || v.route !== null)) return false;
  if (v.stage === 'prepare' && (n < 1 || n > 2 || v.route === null)) return false;
  if (v.stage === 'complete' && (n !== 3 || v.route === null)) return false;
  if (n === 0 && v.route !== null) return false;
  if (n > 1 && v.route === null) return false;
  for (const [actorId, nodes] of Object.entries(v.participation)) {
    if (
      !id(actorId) ||
      !Array.isArray(nodes) ||
      nodes.length > n ||
      new Set(nodes).size !== nodes.length ||
      !nodes.every((node) => v.completedNodes.includes(node)) ||
      !nodes.every(
        (node, index) =>
          index === 0 || chapterNodeIds.indexOf(node) > chapterNodeIds.indexOf(nodes[index - 1]),
      )
    )
      return false;
  }
  return true;
}

export function validChapterBoundary(
  chapter: StoryChapterState,
  phase: Phase,
  encounter: number,
  choices: number[],
) {
  if (
    !validStoryChapter(chapter) ||
    encounter !== chapter.completedNodes.length ||
    !Array.isArray(choices) ||
    choices.length !== Number(chapter.route !== null) ||
    (chapter.route !== null && choices[0] !== chapter.route)
  )
    return false;
  return (
    {
      lobby: ['lobby'],
      combat: ['combat'],
      reading: ['storyScene'],
      choice: ['contractVote'],
      prepare: ['shop', 'loading'],
      complete: ['victory'],
      failed: ['defeat'],
    } as Record<ChapterStage, string[]>
  )[chapter.stage].includes(phase);
}

/** Chapter/objective history is separate from the old campaign's boss-clear counter. */
export class StoryChapter {
  private state: StoryChapterState;
  private eligible = new Set<string>();
  constructor(saved?: StoryChapterState) {
    if (saved && !validStoryChapter(saved)) throw Error('invalidStoryChapter');
    this.state = saved
      ? structuredClone(saved)
      : {
          schemaVersion: 1,
          id: openingChapterId,
          stage: 'lobby',
          completedNodes: [],
          route: null,
          participation: {},
        };
  }
  snapshot(): StoryChapterState {
    return structuredClone(this.state);
  }
  get nodeIndex() {
    return this.state.completedNodes.length;
  }
  get node() {
    return chapterNodeIds[this.nodeIndex];
  }
  get arenaId() {
    return this.nodeIndex === 0
      ? 'gatehouse'
      : this.nodeIndex === 1
        ? ['triage-yard', 'gatehouse', 'ossuary-works'][this.state.route ?? 0]
        : 'triage-yard';
  }
  get bossId() {
    return this.nodeIndex === 0
      ? ('constable' as const)
      : this.nodeIndex === 2
        ? ('matron' as const)
        : undefined;
  }
  get sceneId() {
    return this.state.completedNodes.length === 1
      ? 'first-return'
      : this.state.completedNodes.length === 2
        ? 'ward-after'
        : 'chapter-close';
  }
  start(actors: string[]) {
    if (
      !['lobby', 'prepare'].includes(this.state.stage) ||
      actors.length === 0 ||
      actors.length > 50 ||
      new Set(actors).size !== actors.length ||
      !actors.every(id)
    )
      return false;
    if (new Set([...Object.keys(this.state.participation), ...actors]).size > 50) return false;
    this.eligible = new Set(actors);
    this.state.stage = 'combat';
    for (const actorId of actors)
      if (!Object.hasOwn(this.state.participation, actorId))
        Object.defineProperty(this.state.participation, actorId, {
          value: [],
          enumerable: true,
          writable: true,
          configurable: true,
        });
    return true;
  }
  clear(node: ChapterNodeId, present: string[]) {
    if (
      this.state.stage !== 'combat' ||
      node !== this.node ||
      new Set(present).size !== present.length ||
      !present.every(id)
    )
      return false;
    this.state.completedNodes.push(node);
    for (const actorId of present)
      if (this.eligible.has(actorId)) this.state.participation[actorId].push(node);
    this.eligible.clear();
    this.state.stage = 'reading';
    return true;
  }
  ready() {
    if (this.state.stage !== 'reading') return false;
    this.state.stage =
      this.nodeIndex === 1 ? 'choice' : this.nodeIndex === 2 ? 'prepare' : 'complete';
    return true;
  }
  choose(route: number) {
    if (this.state.stage !== 'choice' || !Number.isSafeInteger(route) || route < 0 || route > 2)
      return false;
    this.state.route = route as 0 | 1 | 2;
    this.state.stage = 'prepare';
    return true;
  }
  fail() {
    this.eligible.clear();
    this.state.stage = 'failed';
  }
  fullParticipant(actorId: string) {
    return this.state.stage === 'complete' && this.state.participation[actorId]?.length === 3;
  }
}
