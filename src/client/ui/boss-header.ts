/** Stable text slots keep changing health/phase data out of the boss-name heading. */
export function bossHeaderMarkup() {
  return `<div class="boss-heading"><div class="boss-grade"><small id="boss-threat-label"></small><bdi id="boss-threat-code" dir="ltr"></bdi><span id="boss-form"></span></div><div class="boss-heading-main"><strong id="boss-name"></strong><div class="boss-subtitle"><span id="boss-phase-label"></span><span id="boss-phase-name"></span></div></div><div class="boss-clock"><span aria-hidden="true">◷</span><time id="deadline"></time></div></div>`;
}
