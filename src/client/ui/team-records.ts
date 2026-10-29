import { data } from '../../shared/game.ts';
import { squadBands, type RankedTeamRecord } from '../../shared/team-records.ts';
import { fetchBoard, fetchRoster, recentRecords, mondayUTC } from '../team-records.ts';
import type { TeamBoardSelection } from '../team-records.ts';
import { locale, number, t } from '../i18n.ts';
import { escape as e } from './html.ts';
import type { TeamRecordStatus } from '../../shared/team-records.ts';

const time = (ticks: number) => number(Math.floor(ticks / 1800)) + ':' + new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false }).format(Math.floor(ticks / 30) % 60);
export function teamResultMarkup(status?: TeamRecordStatus) {
  if (!status) return '';
  if (status.status !== 'saved') return `<p role="status">${e(t(status.status === 'unavailable' ? 'ui.teamRecordSaveFailed' : 'ui.teamRecordIneligible'))}</p>`;
  const r = status.record;
  return `<aside class="team-result" role="status"><strong>${e(t('ui.teamRecordSaved'))} · <bdi>#${number(r.rank)}</bdi></strong><p>${e(t('ui.leaderboardSharedRank'))}</p><p>${e(t(r.mode === 'endless' ? 'ui.leaderboardEncounters' : 'ui.leaderboardScore'))}: ${number(r.mode === 'endless' ? r.clears : r.score)} · ${e(t('ui.leaderboardTime'))}: <bdi>${time(r.lastClearTicks)}</bdi></p></aside>`;
}
export function mountTeamRecords(host: HTMLElement, endpoint: string, initialMode: string, initialDifficulty: string, selection?: TeamBoardSelection) {
  let mode = initialMode, difficulty = initialDifficulty, sizeBand: string = selection?.sizeBand ?? 'solo', week = false;
  let nextOffset: number | null = 0, sequence = 0, controller: AbortController;
  const rows = new Map<string, RankedTeamRecord>();
  host.innerHTML = `<div class="records-filters"><label>${e(t('ui.leaderboardMode'))}<select data-record-mode>${data.modes.map(m => `<option value="${m.id}" ${m.id === mode ? 'selected' : ''}>${e(t('mode.'+m.id+'.name'))}</option>`).join('')}</select></label><label>${e(t('ui.leaderboardDifficulty'))}<select data-record-difficulty>${data.difficulties.map(d => `<option value="${d.id}" ${d.id === difficulty ? 'selected' : ''}>${e(t('difficulty.'+d.id))}</option>`).join('')}</select></label><label>${e(t('ui.recordsSize'))}<select data-record-size></select></label></div><div class="records-tabs"><button data-record-all aria-pressed="true">${e(t('ui.recordsAllTime'))}</button><button data-record-week aria-pressed="false">${e(t('ui.recordsThisWeek'))}</button></div><p>${e(t('ui.leaderboardFilters'))} ${e(t('ui.leaderboardSharedRank'))}</p><p data-record-status role="status" aria-live="polite"></p><button data-record-retry hidden>${e(t('ui.retry'))}</button><div data-record-rows class="team-record-list"></div><button data-record-more hidden>${e(t('ui.recordsMore'))}</button>`;
  const get = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  function bands() {
    const max = data.modes.find(m => m.id === mode)!.maxPlayers;
    const choices = squadBands.filter((_b,i) => [1,2,5,9,17][i] <= max);
    if (!choices.includes(sizeBand as typeof squadBands[number])) sizeBand = 'solo';
    get<HTMLSelectElement>('[data-record-size]').innerHTML = choices.map(b => `<option value="${b}" ${b === sizeBand ? 'selected' : ''}>${b === 'solo' ? e(t('ui.solo')) : b.split('-').map(Number).map(number).join('–')}</option>`).join('');
  }
  function card(r: RankedTeamRecord) {
    const primary = r.mode === 'endless' ? t('ui.leaderboardEncounters') : t('ui.leaderboardScore');
    return `<article class="team-record-row"><div class="team-record-rank"><strong><bdi>#${number(r.rank)}</bdi></strong><span>${e(t('ui.leaderboardSquad'))} <bdi>${e(r.runId.slice(0,8))}</bdi></span></div><dl><div><dt>${e(primary)}</dt><dd>${number(r.mode === 'endless' ? r.clears : r.score)}</dd></div><div><dt>${e(t(r.mode === 'endless' ? 'ui.leaderboardSurvival' : 'ui.leaderboardTime'))}</dt><dd><bdi>${time(r.combatTicks)}</bdi></dd></div><div><dt>${e(t('ui.recordsSize'))}</dt><dd>${number(r.peakPlayers)}</dd></div></dl><details data-team-run="${r.runId}"><summary>${e(t('ui.leaderboardDetails'))}</summary><div class="team-roster"></div></details></article>`;
  }
  function renderRows() {
    const target = get('[data-record-rows]');
    for (const r of rows.values()) {
      const existing = target.querySelector(`[data-team-run="${r.runId}"]`)?.closest('article');
      if (existing) existing.querySelector('strong bdi')!.textContent = '#' + number(r.rank);
      else target.insertAdjacentHTML('beforeend', card(r));
    }
    host.querySelectorAll<HTMLDetailsElement>('[data-team-run]').forEach(details => {
      if (details.dataset.bound) return;
      details.dataset.bound = 'true';
      let loaded = false, rosterOffset: number | null = 0;
      const roster = details.querySelector<HTMLElement>('.team-roster')!;
      const loadRoster = async () => {
        if (rosterOffset === null) return;
        const offset = rosterOffset;
        roster.querySelector('button')?.remove();
        const status = document.createElement('p'); status.textContent = t('ui.loading'); roster.append(status);
        try {
          const page = await fetchRoster(endpoint, details.dataset.teamRun!, offset);
          if (!details.isConnected) return;
          status.remove(); loaded = true; rosterOffset = page.nextOffset;
          if (offset === 0) {
            const facts = document.createElement('p');
            facts.textContent = `${t('ui.leaderboardSurvivors')}: ${number(page.record.survivors)} / ${number(page.record.rosterCount)} · ${t('ui.leaderboardTime')}: ${time(page.record.lastClearTicks)}`;
            roster.append(facts);
          }
          const list = document.createElement('ul');
          list.innerHTML = page.participants.map(p => `<li><bdi>${e(p.name)}</bdi> · ${e(t('class.'+p.classId+'.name'))} · ${e(t('ui.leaderboardEncounters'))}: ${number(p.encounters)}</li>`).join('');
          roster.append(list);
          if (rosterOffset !== null) { const more = document.createElement('button'); more.textContent = t('ui.recordsMore'); more.onclick = () => void loadRoster(); roster.append(more); }
        } catch {
          if (!details.isConnected) return;
          status.textContent = t('ui.teamRecordUnavailable');
          const retry = document.createElement('button'); retry.textContent = t('ui.retry');
          retry.onclick = () => { status.remove(); void loadRoster(); }; roster.append(retry);
        }
      };
      details.ontoggle = () => { if (details.open && !loaded) { loaded = true; void loadRoster(); } };
    });
  }
  async function load(reset: boolean) {
    controller?.abort(); controller = new AbortController(); const current = ++sequence;
    if (reset) { rows.clear(); nextOffset = 0; get('[data-record-rows]').replaceChildren(); }
    if (nextOffset === null) return;
    const status = get('[data-record-status]'); status.textContent = t('ui.loading');
    get('[data-record-retry]').hidden = true; get<HTMLButtonElement>('[data-record-more]').disabled = true;
    host.setAttribute('aria-busy','true');
    const query = new URLSearchParams({ mode, difficulty, sizeBand, offset: String(nextOffset), limit: reset ? '10' : '25' });
    if (week) query.set('week',mondayUTC());
    try {
      const page = await fetchBoard(endpoint, query, controller.signal);
      if (current !== sequence || !host.isConnected) return;
      page.rows.forEach(r => rows.set(r.runId,r)); nextOffset = page.nextOffset;
      status.textContent = page.total ? `${number(page.total)} · ${t('ui.teamRecords')}` : t('ui.recordsEmpty');
      renderRows();
      const recent = recentRecords().find(r => r.endpoint === endpoint && r.mode === mode && r.difficulty === difficulty && r.sizeBand === sizeBand);
      const recentId = selection && selection.mode === mode && selection.difficulty === difficulty && selection.sizeBand === sizeBand
        ? selection.runId : recent?.runId;
      if (recentId) {
        if (!rows.has(recentId)) {
          const own = await fetchRoster(endpoint,recentId,0,controller.signal).catch(() => null);
          if (current !== sequence || !host.isConnected) return;
          const weekStart = Date.parse(mondayUTC()+'T00:00:00Z');
          if (own && (!week || own.record.endedAt >= weekStart && own.record.endedAt < weekStart + 7 * 86400000)) {
            get('[data-record-rows]').insertAdjacentHTML('afterbegin',card(own.record));
            renderRows();
          }
        }
        const ownRow = get('[data-record-rows]').querySelector(`[data-team-run="${recentId}"]`)?.closest('article');
        if (ownRow) {
          ownRow.classList.add('your-team-record');
          if (!ownRow.querySelector('.own-record-label')) {
            const label = document.createElement('p'); label.className = 'own-record-label'; label.textContent = t('ui.teamRecordSaved'); ownRow.prepend(label);
          }
        }
      }
    } catch (error) {
      if (current !== sequence || !host.isConnected || (error instanceof Error && error.name === 'AbortError')) return;
      status.textContent = t('ui.teamRecordUnavailable'); get('[data-record-retry]').hidden = false;
    } finally {
      if (current === sequence) { host.setAttribute('aria-busy','false'); get('[data-record-more]').hidden = nextOffset === null || !rows.size; get<HTMLButtonElement>('[data-record-more]').disabled = false; }
    }
  }
  get<HTMLSelectElement>('[data-record-mode]').onchange = event => { mode = (event.target as HTMLSelectElement).value; bands(); void load(true); };
  get<HTMLSelectElement>('[data-record-difficulty]').onchange = event => { difficulty = (event.target as HTMLSelectElement).value; void load(true); };
  get<HTMLSelectElement>('[data-record-size]').onchange = event => { sizeBand = (event.target as HTMLSelectElement).value; void load(true); };
  const period = (value: boolean) => { week = value; get('[data-record-all]').setAttribute('aria-pressed',String(!value)); get('[data-record-week]').setAttribute('aria-pressed',String(value)); void load(true); };
  get('[data-record-all]').onclick = () => period(false); get('[data-record-week]').onclick = () => period(true);
  get('[data-record-more]').onclick = () => void load(false); get('[data-record-retry]').onclick = () => void load(rows.size === 0);
  bands(); void load(true);
}
