import {TESTING_BUILD} from './build-audience.ts';
import messages from "./boss-guide-messages.json";
// Testing retains all-difficulty guides; the public build keeps Baby optional.
export const BOSS_GUIDES_FOR_TESTING = TESTING_BUILD;
export const bossGuideAvailable = (difficulty: string, testing = BOSS_GUIDES_FOR_TESTING) => testing || difficulty === 'baby';
export class BossGuideState {
  open = false;
  set(value: boolean) {
    this.open = value;
  }
  blocksInput(menuPaused: boolean) {
    return menuPaused || this.open;
  }
  pausesSimulation(menuPaused: boolean, online: boolean) {
    return !online && this.blocksInput(menuPaused);
  }
}
export const bossGuideText = (locale: string, key: keyof typeof messages.en) =>
  (messages[locale as keyof typeof messages] ?? messages.en)[key];
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function bossGuideMarkup(locale: string, online: boolean) {
  const t = (key: keyof typeof messages.en) =>
    escape(bossGuideText(locale, key));
  return `<button id="boss-guide-button" class="boss-guide-toggle" aria-controls="boss-guide" aria-expanded="false" disabled>? <span>${t("ui.bossGuide")}</span></button><div id="boss-guide" class="overlay boss-guide-overlay" hidden><section class="dialog boss-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="boss-guide-title"><div class="boss-guide-toolbar"><h2 id="boss-guide-title">${t("ui.bossGuide")}</h2><button id="boss-guide-close">${t("ui.closeBossGuide")}</button></div><p id="boss-guide-mode">${t(online ? "ui.bossGuideOnline" : "ui.bossGuidePaused")}</p><div id="boss-guide-copy" tabindex="0"><h3 id="boss-guide-boss-name"></h3></div><button id="boss-guide-resume" class="primary">${t(online ? "ui.closeBossGuide" : "ui.bossGuideResume")}</button></section></div>`;
}
