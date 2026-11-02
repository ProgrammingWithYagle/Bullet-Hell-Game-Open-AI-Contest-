import catalog from '../../content/catalog.json';
import type { ClassId } from './protocol.ts';
export const chapterCharacterIds: Record<ClassId, string> = {
  soldier: 'mara-rook',
  heavy: 'hux-bell',
  tank: 'bram-voss',
  medic: 'iona-vale',
  mage: 'sable-quill',
  engineer: 'tamsin-reed',
  assassin: 'vale-ash',
  bard: 'iven-cair',
  swordsman: 'dara-flint',
  summoner: 'joss-merrow',
  ranger: 'nela-venn',
};

export type TrainingEventKind =
  | 'rallied-hit'
  | 'suppressive-hit'
  | 'charge-hit'
  | 'patient-care'
  | 'sigil-control'
  | 'construct-hit'
  | 'concealed-hit'
  | 'phrased-hit'
  | 'measured-hit'
  | 'retinue-hit'
  | 'drawn-hit';
// A phrase counts only after spending cadence earned by a real primary hit.
export const chapterLessons: Record<
  ClassId,
  { techniqueId: string; event: TrainingEventKind; minimum: number }
> = {
  ranger: { techniqueId: 'ranger-fieldcraft-1', event: 'drawn-hit', minimum: 1 },
  summoner: { techniqueId: 'summoner-bonds-1', event: 'retinue-hit', minimum: 1 },
  swordsman: { techniqueId: 'swordsman-measure-1', event: 'measured-hit', minimum: 1 },
  bard: { techniqueId: 'bard-performance-1', event: 'phrased-hit', minimum: 1 },
  soldier: {
    techniqueId: 'soldier-command-1',
    event: 'rallied-hit',
    minimum: 1,
  },
  heavy: {
    techniqueId: 'heavy-suppression-1',
    event: 'suppressive-hit',
    minimum: 1,
  },
  tank: { techniqueId: 'tank-protection-1', event: 'charge-hit', minimum: 1 },
  medic: { techniqueId: 'medic-triage-1', event: 'patient-care', minimum: 16 },
  mage: { techniqueId: 'mage-control-1', event: 'sigil-control', minimum: 1 },
  engineer: {
    techniqueId: 'engineer-constructs-1',
    event: 'construct-hit',
    minimum: 1,
  },
  assassin: {
    techniqueId: 'assassin-ambush-1',
    event: 'concealed-hit',
    minimum: 1,
  },
};
for (const [classId, lesson] of Object.entries(chapterLessons)) {
  const node = catalog.skills.find((node) => node.id === lesson.techniqueId);
  if (!node || node.classId !== classId || node.depth !== 1 || node.prerequisite !== null)
    throw Error('Invalid opening lesson: ' + classId);
}
export type TrainingProof = {
  techniqueId: string;
  chapterId: 'one-place-left';
  sourceEncounter: string;
  sourceNode: 'street-clearance';
  ruleVersion: 1;
};
export type StoryTrainingState = {
  schemaVersion: 1;
  characterId: string;
  learned: string[];
  proofs: TrainingProof[];
  prepared: string[];
  focus: string | null;
};
const identifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const exactKeys = (value: unknown, names: string[]): value is Record<string, unknown> =>
  Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === names.length &&
    names.every((name) => Object.hasOwn(value, name)),
  );

/** The first chapter teaches one authored foundation per discipline, not a spendable balance. */
export function validStoryTraining(value: unknown, classId: ClassId): value is StoryTrainingState {
  const techniqueId = chapterLessons[classId]?.techniqueId;
  if (
    !techniqueId ||
    !exactKeys(value, ['schemaVersion', 'characterId', 'learned', 'proofs', 'prepared', 'focus']) ||
    value.schemaVersion !== 1 ||
    value.characterId !== chapterCharacterIds[classId]
  )
    return false;
  const list = (rows: unknown): rows is string[] =>
    Array.isArray(rows) && rows.length <= 1 && rows.every((row) => row === techniqueId);
  if (
    !list(value.learned) ||
    !list(value.prepared) ||
    (value.focus !== null &&
      (value.focus !== techniqueId || !value.learned.includes(techniqueId))) ||
    !Array.isArray(value.proofs) ||
    value.proofs.length > 1
  )
    return false;
  const learned = value.learned;
  if (
    !value.proofs.every(
      (proof) =>
        exactKeys(proof, [
          'techniqueId',
          'chapterId',
          'sourceEncounter',
          'sourceNode',
          'ruleVersion',
        ]) &&
        proof.techniqueId === techniqueId &&
        learned.includes(techniqueId) &&
        proof.chapterId === 'one-place-left' &&
        proof.ruleVersion === 1 &&
        proof.sourceNode === 'street-clearance' &&
        identifier(proof.sourceEncounter),
    )
  )
    return false;
  return value.prepared.length === 0 || value.proofs.length === 1;
}

export class StoryTraining {
  private state: StoryTrainingState;
  private practice: { encounterId: string; amount: number; eligible: boolean } | undefined;
  constructor(
    readonly actorId: string,
    readonly classId: ClassId,
    saved?: StoryTrainingState,
  ) {
    if (
      !identifier(actorId) ||
      !Object.hasOwn(chapterLessons, classId) ||
      (saved !== undefined && !validStoryTraining(saved, classId))
    )
      throw Error('invalidStoryTraining');
    this.state = saved
      ? structuredClone(saved)
      : {
          schemaVersion: 1,
          characterId: chapterCharacterIds[classId],
          learned: [],
          proofs: [],
          prepared: [],
          focus: null,
        };
  }
  snapshot(): StoryTrainingState {
    return structuredClone(this.state);
  }
  study(techniqueId: string) {
    if (techniqueId !== chapterLessons[this.classId].techniqueId) return false;
    if (!this.state.learned.includes(techniqueId)) this.state.learned.push(techniqueId);
    this.state.focus = techniqueId;
    return true;
  }
  beginPractice(encounterId: string, eligible: boolean) {
    if (!identifier(encounterId)) throw Error('invalidPracticeEncounter');
    this.practice = { encounterId, amount: 0, eligible };
  }
  /** Called by authoritative successful effects, never by the client's study/prepare command. */
  observe(sourceId: string, encounterId: string, event: TrainingEventKind, actualAmount: number) {
    const practice = this.practice,
      lesson = chapterLessons[this.classId];
    if (
      !practice?.eligible ||
      sourceId !== this.actorId ||
      encounterId !== practice.encounterId ||
      event !== lesson.event ||
      this.state.focus !== lesson.techniqueId ||
      !this.state.learned.includes(lesson.techniqueId) ||
      !Number.isFinite(actualAmount) ||
      actualAmount <= 0
    )
      return false;
    practice.amount = Math.min(lesson.minimum, practice.amount + actualAmount);
    return true;
  }
  finishPractice(encounterId: string, cleared: boolean) {
    const practice = this.practice,
      lesson = chapterLessons[this.classId];
    if (!practice || practice.encounterId !== encounterId) return false;
    this.practice = undefined;
    if (
      !cleared ||
      !practice.eligible ||
      practice.amount < lesson.minimum ||
      this.state.focus !== lesson.techniqueId ||
      this.state.proofs.some((proof) => proof.techniqueId === lesson.techniqueId)
    )
      return false;
    this.state.proofs.push({
      techniqueId: lesson.techniqueId,
      chapterId: 'one-place-left',
      sourceEncounter: encounterId,
      sourceNode: 'street-clearance',
      ruleVersion: 1,
    });
    return true;
  }
  prepare(techniqueId: string) {
    if (
      !this.state.learned.includes(techniqueId) ||
      !this.state.proofs.some((proof) => proof.techniqueId === techniqueId)
    )
      return false;
    this.state.prepared = [techniqueId];
    return true;
  }
}
