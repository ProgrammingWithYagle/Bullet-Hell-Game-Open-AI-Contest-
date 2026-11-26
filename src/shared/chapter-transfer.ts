import { Game } from './game.ts';
import { openingChapterId } from './story-chapter.ts';
import type { InspectedChapterCheckpoint } from './chapter-transfer-format.ts';
/** Read-only local inspection. Does not mutate the running game or issue online proof. */
export function inspectLocalChapterCheckpoint(value: unknown): InspectedChapterCheckpoint {
  const restored = Game.restoreOffline(value);
  const checkpoint = restored.offlineCheckpoint();
  if (!checkpoint || checkpoint.settings.mode !== 'story' ||
      checkpoint.settings.storyChapterId !== openingChapterId ||
      checkpoint.chapter?.id !== openingChapterId ||
      checkpoint.player.totalSp !== 0 || checkpoint.mutations.length !== 0 ||
      !checkpoint.player.training)
    throw Error('invalidChapterTransfer');
  const training = checkpoint.player.training;
  return {
    checkpoint,
    summary: {
      classId: checkpoint.player.classId,
      name: checkpoint.player.name,
      difficulty: checkpoint.settings.difficulty,
      chapterId: openingChapterId,
      stage: checkpoint.chapter.stage,
      completedObjectives: checkpoint.chapter.completedNodes.length,
      learned: training.learned.length,
      proven: training.proofs.length,
      prepared: training.prepared.length,
    },
  };
}
