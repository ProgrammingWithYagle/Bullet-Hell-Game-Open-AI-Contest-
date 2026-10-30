import type { BossId } from '../../shared/protocol.ts';
import { data } from '../../shared/game.ts';
import { assets } from '../assets.ts';
import { locale, number, t } from '../i18n.ts';
import { profileText } from '../profile-text.ts';
import {
  loadProfile,
  saveProfile,
  summary,
  cosmeticIds,
  masteryThresholds,
  parseProfile,
  exportProfile,
  PROFILE_BACKUP_KEY,
  MAX_PROFILE_BYTES,
  type CosmeticId,
} from '../profile.ts';
import { escape as e } from './html.ts';
import { icon } from './icons.ts';
import { insignia } from './insignia.ts';
import './profile.css';
const p = (key: Parameters<typeof profileText>[1], values: Record<string, string | number> = {}) =>
  profileText(locale, key, values);
const hasBackup = () => {
  try {
    return Boolean(localStorage.getItem(PROFILE_BACKUP_KEY));
  } catch {
    return false;
  }
};
export function mountProfile(host: HTMLElement, back: () => void, changed: (applyPreferences: boolean) => Promise<void | HTMLElement>) {
  let disposed = false, pending = false;
  const blocked = new Map<HTMLButtonElement | HTMLInputElement, boolean>();
  const alive = () => !disposed && host.isConnected;
  const dispose = () => { disposed = true; blocked.clear(); host.removeAttribute('aria-busy'); };
  const show = (message: string) => {
    if (!alive()) return;
    const status = host.querySelector<HTMLElement>('[data-profile-status]');
    if (status) status.textContent = message;
  };
  const busy = () => {
    if (!alive()) return;
    host.setAttribute('aria-busy', String(pending));
    if (pending) {
      for (const input of host.querySelectorAll<HTMLButtonElement | HTMLInputElement>('[data-cosmetic],[data-import-profile],[data-restore-profile]')) {
        if (!blocked.has(input)) blocked.set(input, input.disabled);
        input.disabled = true;
      }
    } else {
      for (const [input, disabled] of blocked) if (input.isConnected) input.disabled = disabled;
      blocked.clear();
    }
  };
  const begin = () => {
    if (!alive() || pending) return false;
    pending = true; busy(); show(t('ui.applyingProfile')); return true;
  };
  const finish = () => { pending = false; busy(); };
  const refresh = async (message = '', focusSelector = '', applyPreferences = false) => {
    try {
      const replacement = await changed(applyPreferences);
      if (replacement?.isConnected) {
        const status = replacement.querySelector<HTMLElement>('[data-profile-status]');
        if (status) status.textContent = message;
        if (focusSelector) replacement.querySelector<HTMLElement>(focusSelector)?.focus();
      } else if (alive()) {
        render();
        show(message);
        if (focusSelector) host.querySelector<HTMLElement>(focusSelector)?.focus();
      }
    } catch (error) {
      show(t(error instanceof Error && error.message === 'ui.errorLanguage' ? 'ui.errorLanguage' : 'ui.errorSave'));
    }
  };
  const applyImport = async (raw: string) => {
    let next;
    try { next = parseProfile(raw); }
    catch { show(t('ui.errorProfile')); return; }
    if (!alive()) return;
    try { saveProfile(localStorage, next); }
    catch { show(t('ui.errorSave')); return; }
    await refresh(p('imported'), '[data-import-profile]', true);
  };
  function render() {
    if (!alive()) return;
    try {
      const profile = loadProfile(localStorage),
        s = summary(profile);
      host.innerHTML = `<section class="profile-page"><div class="section-heading"><div><p class="eyebrow">${e(p('notice'))}</p><h1 tabindex="-1">${e(t('ui.profile'))}</h1></div><button data-profile-back>${e(t('ui.back'))}</button></div><div class="profile-totals">${[
        ['clears', s.totalClears],
        ['rescues', s.totalRescues],
        ['campaigns', s.campaigns],
      ]
        .map(
          ([key, n]) =>
            `<article><strong>${number(Number(n))}</strong><span>${e(p(key as 'clears'))}</span></article>`,
        )
        .join(
          '',
        )}</div><section aria-labelledby="mastery-title"><h2 id="mastery-title">${e(t('ui.mastery'))}</h2><p class="muted">${e(p('rule'))}</p><div class="mastery-grid">${data.classes
        .map((c) => {
          const m = s.classes[c.id as keyof typeof s.classes],
            next = masteryThresholds[Math.min(4, m.tier + 1)];
          return `<article class="mastery-card">${icon(c.id)}<div><h3>${e(t('class.' + c.id + '.name'))}</h3><p>${e(p(('cosmetic' + m.tier) as 'cosmetic0'))} · <bdi>${number(m.xp)} XP</bdi></p><progress max="${next}" value="${Math.min(next, m.clears)}" aria-label="${e(t('class.' + c.id + '.name') + ' · ' + t('ui.mastery'))}"></progress><small>${number(m.clears)} ${e(p('clears'))} · ${number(m.rescues)} ${e(p('rescues'))}</small></div></article>`;
        })
        .join(
          '',
        )}</div></section><section class="profile-unlocks"><h2>${e(t('ui.chooseDifficulty'))}</h2><p>${e(s.hardUnlocked ? t('ui.unlocked', { name: t('difficulty.insane') + ' / ' + t('difficulty.hellish') }) : t('ui.hardUnlock'))}</p></section><section><h2>${e(p('cosmetics'))}</h2><div class="insignia-grid">${cosmeticIds.map((id, i) => `<button data-cosmetic="${id}" ${s.cosmetics.includes(id) ? '' : 'disabled'} aria-pressed="${profile.selectedCosmetic === id}">${insignia(id)}<span>${e(p(('cosmetic' + i) as 'cosmetic0'))}</span><small>${i === 5 ? t('boss.uncounted.name') : number(masteryThresholds[Math.min(i, 4)]) + ' ' + e(p('clears'))}</small></button>`).join('')}</div></section><section><h2>${e(p('best'))}</h2>${
        Object.keys(s.streaks).length
          ? `<div class="streak-grid">${Object.entries(s.streaks)
              .map(
                ([difficulty, b]) =>
                  `<article><h3>${e(t('difficulty.' + difficulty))}</h3><p>${e(p('personal'))}: ${number(b.personal)} · ${e(p('squad'))}: ${number(b.squad)}</p></article>`,
              )
              .join('')}</div>`
          : `<p class="muted">${e(p('empty'))}</p>`
      }</section><section><h2>${e(p('lore'))} <small>${number(s.lore.size)} / ${number(data.bosses.length)}</small></h2><p class="muted">${e(p('loreNotice'))}</p><div class="codex-grid">${
        data.bosses
          .filter((b) => s.lore.has(b.id as BossId))
          .map(
            (b) =>
              `<details class="codex-entry"><summary>${assets.encounters[b.id] ? `<span class="codex-art" style="background-image:url('${assets.encounters[b.id]}')" aria-hidden="true"></span>` : icon('bell')}<span>${e(t('boss.' + b.id + '.name'))}</span></summary><p>${e(t('boss.' + b.id + '.description'))}</p><p lang="en" dir="ltr" class="boss-history">${e(b.lore)}</p></details>`,
          )
          .join('') || `<p>${e(p('empty'))}</p>`
      }</div></section>${profile.legacyCampaigns.length ? `<p class="muted">${e(p('legacy', { count: number(profile.legacyCampaigns.length) }))}</p>` : ''}<section class="profile-files"><p>${e(p('importHelp'))}</p><div class="actions"><button data-export-profile>${icon('map')}${e(t('ui.exportProfile'))}</button><label class="file-button">${e(t('ui.importProfile'))}<input data-import-profile type="file" accept="application/json,.json"></label>${hasBackup() ? `<button data-restore-profile>${e(p('restore'))}</button>` : ''}</div></section><p data-profile-status role="status" aria-live="polite"></p></section>`;
      host.querySelectorAll<HTMLButtonElement>('[data-cosmetic]').forEach(
        (button) =>
          (button.onclick = () => {
            if (!begin()) return;
            try {
              const current = loadProfile(localStorage);
              current.selectedCosmetic = button.dataset.cosmetic as CosmeticId;
              saveProfile(localStorage, current);
              void refresh('', '[data-cosmetic="' + button.dataset.cosmetic + '"]').finally(finish);
            } catch {
              show(t('ui.errorSave'));
              finish();
            }
          }),
      );
      host.querySelector<HTMLButtonElement>('[data-export-profile]')!.onclick = () => {
        if (!alive()) return;
        try {
          const blob = new Blob([exportProfile(localStorage)], { type: 'application/json' }),
            url = URL.createObjectURL(blob),
            a = document.createElement('a');
          a.href = url;
          a.download = 'grave-accord-profile-v1.json';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          show(p('exported'));
        } catch {
          show(t('ui.errorProfile'));
        }
      };
    } catch {
      host.innerHTML = `<section class="profile-page"><h1>${e(t('ui.profile'))}</h1><p role="alert">${e(t('ui.errorProfile'))}</p><p>${e(p('importHelp'))}</p><label class="file-button">${e(t('ui.importProfile'))}<input data-import-profile type="file" accept="application/json,.json"></label>${hasBackup() ? `<button data-restore-profile>${e(p('restore'))}</button>` : ''}<button data-profile-back>${e(t('ui.back'))}</button><p data-profile-status role="status"></p></section>`;
    }
    host.querySelector<HTMLButtonElement>('[data-profile-back]')!.onclick = () => { if (alive()) { dispose(); back(); } };
    const file = host.querySelector<HTMLInputElement>('[data-import-profile]')!;
    file.onchange = () =>
      void (async () => {
        const selected = file.files?.[0];
        if (!selected || !begin()) return;
        try {
          if (selected.size > MAX_PROFILE_BYTES) throw Error('oversized');
          const raw = await selected.text();
          if (!alive()) return;
          await applyImport(raw);
        } catch {
          show(t('ui.errorProfile'));
        } finally {
          if (file.isConnected) file.value = '';
          finish();
        }
      })();
    const restore = host.querySelector<HTMLButtonElement>('[data-restore-profile]');
    if (restore)
      restore.onclick = () =>
        void (async () => {
          if (!begin()) return;
          try {
            const raw = localStorage.getItem(PROFILE_BACKUP_KEY);
            if (!raw) throw Error('missing');
            await applyImport(raw);
          } catch {
            show(t('ui.errorProfile'));
          } finally {
            finish();
          }
        })();
    busy();
  }
  render();
  return dispose;
}
