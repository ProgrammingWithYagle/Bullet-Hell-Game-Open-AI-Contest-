import type { PlayerView, View } from '../../shared/view.ts';
import type { ChapterStage } from '../../shared/story-chapter.ts';
import { chapterLessons } from '../../shared/story-training.ts';
import { data } from '../../shared/game.ts';
import { chapterText } from '../chapter-text.ts';
import { effectText } from '../content-text.ts';
import { locale, t, number } from '../i18n.ts';
import { escape as e } from './html.ts';
export function chapterTrainingMarkup(p: PlayerView, stage?: ChapterStage) {
  const copy = chapterText(locale),
    state = p.training!,
    lesson = chapterLessons[p.classId],
    node = data.skills.find((s) => s.id === lesson.techniqueId)!;
  const learned = state.learned.includes(node.id),
    proven = state.proofs.some((proof) => proof.techniqueId === node.id),
    prepared = state.prepared.includes(node.id);
  return `<section class="chapter-training" lang="${copy.language}" dir="ltr"><h3>${e(copy.training)}</h3><p>${e(stage === 'lobby' ? copy.locked : copy.readyHelp)}</p><article><h4>${e(t('skill.' + node.id + '.name'))} · D−</h4><p>${e(copy.lessons[p.classId])}</p><p>${e(effectText(node.effects))}</p><p class="training-status">${[learned ? copy.known : '', proven ? copy.proven : '', prepared ? copy.prepared : ''].filter(Boolean).map(e).join(' · ')}</p>${stage === 'prepare' ? `<div class="actions"><button data-training="study" data-technique="${node.id}" ${learned ? 'disabled' : ''}>${e(copy.study)}</button><button data-training="prepare" data-technique="${node.id}" ${!proven || prepared ? 'disabled' : ''}>${e(copy.prepare)}</button></div>` : ''}${!proven && stage !== 'lobby' ? `<p>${e(copy.notProven)}</p>` : ''}</article></section>`;
}
export function chapterResultMarkup(view: View, p: PlayerView) {
  const copy = chapterText(locale);
  return `<section class="chapter-result" lang="${copy.language}" dir="ltr"><h3>${e(copy.title)} · ${e(view.chapter?.stage === 'complete' ? copy.complete : copy.incomplete)}</h3><dl class="run-stat-list"><div><dt>${e(copy.objectives)}</dt><dd>${number(view.chapter?.completedNodes.length ?? 0)} / 3</dd></div><div><dt>${e(copy.bosses)}</dt><dd>${number(p.progress.clears)} / 2</dd></div></dl><p>${e(copy.resultHelp)}</p>${p.training ? chapterTrainingMarkup(p, view.chapter?.stage) : ''}</section>`;
}
