import type { View } from '../shared/view.ts';
import { recipes, type Recipe } from '../shared/alchemist-kit.ts';

type Translate = (key: string, values?: Record<string, string | number>) => string;
/** Recipe choices are requests; the displayed stock and queue come from authority. */
export class AlchemyControls {
  private buttons = new Map<Recipe, HTMLButtonElement>();
  private summary: HTMLElement;
  private selected: Recipe = 'flare';
  private disposed = false;
  constructor(readonly root: HTMLElement, private t: Translate, send: (recipe: Recipe) => void, private format: (n: number) => string = String) {
    root.className = 'alchemy-controls';
    root.hidden = true;
    root.setAttribute('aria-label', t('ui.alchemyRecipes'));
    this.summary = document.createElement('small');
    root.append(this.summary);
    const choices = document.createElement('div');
    choices.className = 'alchemy-recipe-buttons';
    for (const recipe of recipes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = t('ui.alchemy.' + recipe);
      button.title = t('ui.alchemy.' + recipe + 'Hint');
      button.setAttribute('data-alchemy-recipe', recipe);
      button.disabled = true;
      button.onclick = () => { if (!this.disposed && !root.hidden && !button.disabled) send(recipe); };
      choices.append(button);
      this.buttons.set(recipe, button);
    }
    root.append(choices);
  }
  update(view: View, owner: string, blocked: boolean, binding: string) {
    if (this.disposed) return;
    const p = view.players.find(p => p.id === owner);
    this.root.hidden = p?.classId !== 'alchemist';
    this.selected = p?.kit.alchemyRecipe ?? 'flare';
    const ready = !this.root.hidden && !blocked && !view.matchPaused && view.phase === 'combat' && p?.status === 'active';
    const queue = (p?.kit.alchemyPrepared ?? []).map(recipe => this.t('ui.alchemy.' + recipe)).join(' → ') || this.t('ui.alchemyEmpty');
    this.summary.textContent = this.t('ui.alchemyStock', {cinder: this.format(p?.kit.alchemyCinder ?? 3), chalk: this.format(p?.kit.alchemyChalk ?? 3), sap: this.format(p?.kit.alchemySap ?? 3)}) + ' · ' + this.t('ui.alchemyQueue', {queue, capacity: this.format(p?.kit.alchemyCapacity ?? 2)}) + ((p?.kit.alchemyBatchUntil??0)>view.combatTick?' · '+this.t('ui.alchemyBatch',{count:this.format(p?.kit.alchemyBatchCharges??0)}):'');
    this.summary.title = this.t('ui.alchemyCycleHint', {binding});
    for (const [recipe, button] of this.buttons) {
      button.disabled = !ready || recipe === this.selected;
      button.setAttribute('aria-pressed', String(recipe === this.selected));
    }
  }
  cycle() {
    if (this.disposed || this.root.hidden) return;
    const next = recipes[(recipes.indexOf(this.selected) + 1) % recipes.length];
    const button = this.buttons.get(next)!;
    if (!button.disabled) button.click();
  }
  dispose() { this.disposed = true; for (const button of this.buttons.values()) button.onclick = null; this.root.remove(); }
}
