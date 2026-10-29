import {TESTING_BUILD} from '../build-audience.ts';
import {testingDifficultiesUnlocked,unlockTestingDifficulties} from '../testing-ui.ts';
import {difficultyRulesMarkup} from './difficulty-rules.ts';
import {encounterVariant} from '../../shared/encounter-policy.ts';
import { practiceVariantMarkup } from './practice-variant.ts';
import { desktopBridge } from '../desktop.ts';
import { mountLan, desktopText } from './lan.ts';
import {mountLeaderboards} from './leaderboards.ts';
import { mountProfile } from './profile.ts';
import { loadProfile, changeProfile, difficultyUnlocked } from '../profile.ts';
import history from '../../shared/update-history.json';
import revision from '../../../content/revision.json';
import changelogNotices from '../changelog-notices.json';
import { changelogHTML } from './changelog.ts';
import { runtimeArena } from '../../shared/arena-layouts.ts';
import { arenaPreviewMarkup, arenaPreviewModel } from '../arena-preview.ts';
import { expeditionText, type ExpeditionMessage } from '../expedition-text.ts';
import { data, implementedBossIds } from '../../shared/game.ts';
import { implementedClassIds, type ClassId, type BossId } from '../../shared/protocol.ts';
import { Session, type ConnectionOptions } from '../session.ts';
import { assets } from '../assets.ts';
import { bossClassification } from '../threat-text.ts';
import { languages, locale, number, setLanguage, t } from '../i18n.ts';
import { prototypeNotice } from '../runtime-messages.ts';
import { icon } from './icons.ts';
import { escape as e } from './html.ts';
import { tutorial, tutorialSeen } from './tutorial.ts';
import { savedBoundary } from '../storage.ts';
import { onlinePlaytestSlots } from '../deployment.ts';
type Hooks = {
  resume: () => void;
  launch: (
    online: boolean,
    options: ConnectionOptions,
    join?: { roomId?: string; code?: string },
    visibility?: 'public' | 'private',
  ) => void;
  profileChanged: () => Promise<void>;
  settingsHTML: () => string;
  bindSettings: () => void;
};
let selected: ConnectionOptions = {
  name: 'Survivor',
  classId: 'soldier',
  mode: 'short',
  difficulty: 'normal',
  openingBossId: 'constable',
  practiceVariant: 'normal',
};
let arenaId = 'gatehouse',
  visibility: 'offline' | 'public' | 'private' = 'offline';
export const setupOptions = () => ({ ...selected });
export function portrait(classId: string, size = 'large') {
  const index = data.classes.findIndex((c) => c.id === classId);
  const productionPortrait = assets.portraits[classId];
  const isolated = classId === 'medic' || Boolean(productionPortrait);
  const image = productionPortrait ?? (classId === 'medic' ? assets.medic : assets.lineup);
  return `<div class="survivor-portrait ${size} ${isolated ? 'isolated' : ''}" role="img" aria-label="${e(data.classes[index]?.survivor ?? '')}" style="--person:${index};background-image:url('${image}')"></div>`;
}
export function mountSetup(host: HTMLElement, hooks: Hooks) {
  let page = 'home',
    previewClass: string = selected.classId,
    previewMode: string = selected.mode,
    previewMap = arenaId;
  const availableClass = (id: string) => implementedClassIds.includes(id as ClassId),
    availableMode = (id: string) => ['short', 'standard', 'long', 'raid', 'endless'].includes(id);
  const modeCapacity = (id: string, maximum: number) =>
    availableMode(id)
      ? Math.min(maximum, selected.serverEndpoint ? maximum : (onlinePlaytestSlots ?? maximum))
      : maximum;
  const capacityNotice = () =>
    onlinePlaytestSlots && !selected.serverEndpoint
      ? `<p class="prototype-note">${e(t('ui.playtestCapacity', { count: number(onlinePlaytestSlots) }))}</p>`
      : '';
  const steps = ['class', 'mode', 'map', 'difficulty', 'review'];
  const labels: Record<string, string> = {
    home: 'ui.mainMenu',
    class: 'ui.chooseClass',
    mode: 'ui.chooseMode',
    map: 'ui.map',
    difficulty: 'ui.chooseDifficulty',
    review: 'ui.setupConfirm',
    settings: 'ui.settings',
    join: 'ui.joinRoom',
  };
  const button = (id: string, title: string, glyph: string, extra = '') =>
    `<button id="${id}" ${extra}>${icon(glyph)}<span>${e(title)}</span></button>`;
  const copy = (key: ExpeditionMessage) => e(expeditionText(locale, key));
  const modeMap = (id: string) => data.modes.find((m) => m.id === id)!;
  const mapPreview = (id: string) => arenaPreviewMarkup(id, selected.difficulty, assets.arenaGrounds, {
    name: t('arena.' + id + '.name'), difficulty: t('difficulty.' + selected.difficulty),
    overview: expeditionText(locale, 'overview'), start: expeditionText(locale, 'start'),
    boss: expeditionText(locale, 'boss'), cover: expeditionText(locale, 'cover'),
    lava: expeditionText(locale, 'lava'),
  });
  const difficultyCaption = (id: string) => copy(id as ExpeditionMessage);
  const difficultyAvailable = (id: string) => {
    try {
      return (TESTING_BUILD&&testingDifficultiesUnlocked())||difficultyUnlocked(loadProfile(localStorage), id);
    } catch {
      return !data.difficulties.find((d) => d.id === id)?.locked;
    }
  };
  function render(focusSelector?: string) {
    if (!difficultyAvailable(selected.difficulty)) selected.difficulty = 'normal';
    if(['insane','hellish'].includes(selected.difficulty))selected.practiceVariant=encounterVariant(selected.difficulty);
    const stage = steps.indexOf(page);
    host.innerHTML = `<div class="expedition-shell ${page === 'home' ? 'at-home' : ''}"><header class="masthead"><button id="brand-home" class="brand">${icon('bell')}<span>GRAVE ACCORD<small>${e(t('ui.tagline'))}</small></span></button><div class="masthead-controls"><label class="sr-only" for="language">${e(t('ui.language'))}</label><select id="language" aria-label="${e(t('ui.language'))}">${languages.map(([id, label]) => `<option value="${id}" ${id === locale ? 'selected' : ''}>${e(label)}</option>`).join('')}</select><button id="guide" class="icon-button" aria-label="${e(t('ui.playTutorial'))}" title="${e(t('ui.playTutorial'))}">${icon('tree')}</button><button id="settings" class="icon-button" aria-label="${e(t('ui.settings'))}">${icon('engineer')}</button></div></header>${stage >= 0 ? `<nav class="setup-steps" aria-label="${e(t('ui.chooseSetup'))}">${steps.map((step, i) => `<button data-page="${step}" class="${i === stage ? 'current' : ''}" ${i === stage ? 'aria-current="step"' : ''} ${i > stage ? 'disabled' : ''}><b>${number(i + 1)}</b><span>${e(t(labels[step]))}</span></button>`).join('')}</nav>` : ''}<section id="setup-content" class="setup-content"></section><p id="notice" class="setup-notice" role="status" hidden></p><footer class="setup-footer"><details class="setup-build"><summary><bdi>Grave Accord · ${e(revision.version)}</bdi></summary><p>${e(prototypeNotice[locale])}</p><p>${e(t('ui.translationNotice'))}</p><small><bdi>${e(history.buildId)}</bdi></small></details><a href="https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki" target="_blank" rel="noopener">${e(t('ui.howToPlay'))}</a><button id="changelog" class="footer-link">${e(t('ui.changelog'))}</button></footer></div>`;
    const content = host.querySelector<HTMLElement>('#setup-content')!;
    if (page === 'home')
      content.innerHTML = `<div class="home-composition"><div class="home-art"><img src="${assets.cover}" alt="Grave Accord" fetchpriority="high"></div><div class="home-actions"><p class="eyebrow">${e(t('ui.chooseSetup'))}</p><h1>${e(t('ui.tagline'))}</h1>${!tutorialSeen() ? `<aside class="first-watch"><h2>${copy('firstWatch')}</h2><p>${copy('welcome')}</p><button id="gentle-start">${icon('play')}<span>${copy('gentleStart')}<small>${e(t('ui.solo'))} · ${e(t('mode.short.name'))} · ${e(t('difficulty.baby'))}</small></span></button></aside>` : ''}<div class="home-buttons">${button('new-run', t('ui.newRun'), 'play', 'class="primary"')}${savedBoundary() ? button('resume-boundary', t('ui.resumeCheckpoint'), 'bell') : ''}${button('join', t('ui.joinRoom'), 'rescue')}${desktopBridge() ? button('lan', desktopText('title'), 'rescue') : ''}${button('profile', t('ui.profile'), 'bell')}<button id="leaderboards">${icon('bell')}<span>${e(t('ui.localPracticeRecords'))}<small>${copy('deviceRecords')}</small></span></button>${button('tutorial', t('ui.controls'), 'tree')}</div><p class="setup-helper">${copy('controlsHint')}</p>${capacityNotice()}</div></div>`;
    if (page === 'class') {
      const c = data.classes.find((c) => c.id === previewClass)!;
      content.innerHTML = `<div class="setup-heading"><h1>${e(t(labels[page]))}</h1><p>${e(t('ui.tutorialTeam'))}</p></div><div class="class-composition"><div class="character-roster" role="group" aria-label="${e(t('ui.chooseClass'))}">${data.classes.map((cl) => `<button data-class="${cl.id}" aria-pressed="${cl.id === previewClass}" class="character-pick ${cl.id === previewClass ? 'selected' : ''}">${portrait(cl.id, 'small')}<span>${e(t('class.' + cl.id + '.name'))}<small>${e(cl.survivor)}</small></span>${availableClass(cl.id) ? '' : icon('lock')}</button>`).join('')}</div><div class="character-reveal">${portrait(c.id)}<span class="character-sigil">${icon(c.id)}</span></div><article class="character-story"><span class="eyebrow">${e(c.survivor)}</span><h2>${e(t('class.' + c.id + '.name'))}</h2><p>${e(t('class.' + c.id + '.role'))}</p><p class="lore">${e(t('class.' + c.id + '.lore'))}</p><div class="stat-ribbon"><span>${icon('health')}${number(c.health)} ${e(t('stat.health'))}</span><span>${icon('move')}${number(c.speed)} ${e(t('stat.moveSpeed'))}</span></div><div class="starting-abilities">${[...c.abilities, c.ultimate].map((a) => `<article>${icon(a.slot === 'ultimate' ? 'ultimate' : 'ability')}<div><h3>${e(t('ability.' + a.id + '.name'))}</h3><p>${e(t('ability.' + a.id + '.description'))}</p><small>${e(t('ui.cooldown', { seconds: t('template.seconds', { value: number(a.cooldown) }) }))}</small></div></article>`).join('')}</div>${availableClass(c.id) ? '' : `<p class="availability">${e(t('ui.inProduction'))}</p>`}</article></div>${navigation(!availableClass(c.id))}`;
    }
    if (page === 'mode') {
      const m = modeMap(previewMode);
      content.innerHTML = `<div class="setup-heading"><h1>${e(t(labels[page]))}</h1></div><div class="route-composition"><div class="route-list">${data.modes.map((m) => `<button data-mode="${m.id}" class="route-pick ${m.id === previewMode ? 'selected' : ''}" aria-pressed="${m.id === previewMode}">${icon(m.id === 'endless' ? 'infinity' : 'map')}<span>${e(t('mode.' + m.id + '.name'))}<small>${number(modeCapacity(m.id, m.maxPlayers))} ${e(t('ui.players'))}</small></span>${availableMode(m.id) ? '' : icon('lock')}</button>`).join('')}</div><article class="route-detail">${mapPreview('gatehouse')}<div><p class="eyebrow">${e(t('ui.chooseMode'))}</p><h2>${e(t('mode.' + m.id + '.name'))}</h2><p>${e(t('mode.' + m.id + '.description'))}</p><div class="stat-ribbon"><span>${icon('rescue')}${number(m.minPlayers)}–${number(modeCapacity(m.id, m.maxPlayers))}</span><span>${icon(m.encounters ? 'bell' : 'infinity')}${m.encounters ? number(m.encounters) : '∞'}</span></div><p class="prototype-note">${availableMode(m.id) ? e(prototypeNotice[locale]) : e(t('ui.inProduction'))}</p></div></article></div>${navigation(!availableMode(m.id))}`;
    }
    if (page === 'map') {
      const a = runtimeArena(previewMap);
      content.innerHTML = `<div class="setup-heading"><h1>${e(t('ui.map'))}</h1><p>${copy('mapIntro')}</p></div><div class="map-composition"><div class="map-strip" role="group" aria-label="${e(t('ui.map'))}">${data.arenas.map((a) => `<button data-map="${a.id}" class="map-pick ${a.id === previewMap ? 'selected' : ''}" aria-pressed="${a.id === previewMap}"><span class="map-thumbnail" aria-hidden="true"><img src="${e(assets.arenaGrounds[arenaPreviewModel(a.id, selected.difficulty).groundKey])}" alt="" loading="lazy" decoding="async"></span><span>${e(t('arena.' + a.id + '.name'))}</span></button>`).join('')}</div><article class="map-detail">${mapPreview(a.id)}<div><h2>${e(t('arena.' + a.id + '.name'))}</h2><p>${e(t('arena.' + a.id + '.description'))}</p><p class="setup-helper">${copy('mapDifficulty')}</p></div></article></div>${navigation(false)}`;
    }
    if (page === 'difficulty')
      content.innerHTML = `<div class="setup-heading"><h1>${e(t(labels[page]))}</h1><p>${copy('difficultyIntro')}</p></div><div class="difficulty-cards" role="group" aria-label="${e(t(labels[page]))}">${data.difficulties.map((d, i) => `<button data-difficulty="${d.id}" class="difficulty-pick ${d.id === selected.difficulty ? 'selected' : ''}" ${!difficultyAvailable(d.id) ? 'disabled' : ''} aria-pressed="${d.id === selected.difficulty}"><span class="difficulty-bells" aria-hidden="true">${Array.from({ length: i + 1 }, () => icon('bell')).join('')}</span><span class="difficulty-name">${e(t('difficulty.' + d.id))}</span>${d.id === 'baby' ? `<span class="difficulty-recommendation">${copy('recommended')}</span>` : ''}<span class="difficulty-description">${difficultyCaption(d.id)}</span>${!difficultyAvailable(d.id) ? `<small>${icon('lock')}${e(t('ui.hardUnlock'))}</small>` : ''}</button>`).join('')}</div><section class="difficulty-summary" aria-live="polite" aria-atomic="true"><div><h2>${e(t('difficulty.' + selected.difficulty))}</h2><p>${e(t('ui.reviveRulesHelp'))}</p>${difficultyRulesMarkup(selected.difficulty)}</div><dl class="difficulty-stats">${(() => {const d = data.difficulties.find(d => d.id === selected.difficulty)!; return [['stat.health', d.health], ['stat.damage', d.damage], ['stat.bossSpeed', d.speed]].map(([key, value]) => `<div><dt>${e(t(String(key)))}</dt><dd>×${number(Number(value), 2)}</dd></div>`).join('');})()}</dl></section>${navigation(false)}`;
    if (page === 'review')
      content.innerHTML = `<div class="setup-heading"><h1>${e(t(labels[page]))}</h1></div><div class="review-composition"><div class="review-portrait">${portrait(selected.classId)}</div><section><h2>${e(t('class.' + selected.classId + '.name'))} · ${e(t('mode.' + selected.mode + '.name'))}</h2><p>${e(t('arena.' + arenaId + '.name'))} · ${e(t('difficulty.' + selected.difficulty))}</p>${difficultyRulesMarkup(selected.difficulty)}${selected.serverEndpoint ? `<p class="prototype-note">${e(desktopText('target'))}: <bdi>${e(selected.serverEndpoint)}</bdi></p>` : ''}${TESTING_BUILD ? `<label class="name-label">${e(t('ui.boss'))}<select id="opening-boss">${implementedBossIds.map((id) => `<option value="${id}" ${id === selected.openingBossId ? 'selected' : ''}>${e(t('boss.' + id + '.name'))} · ${e(bossClassification(id, visibility === 'offline' ? selected.practiceVariant : 'normal'))}</option>`).join('')}</select></label>${visibility === 'offline' ? practiceVariantMarkup(locale, encounterVariant(selected.difficulty,selected.practiceVariant), t('ui.variantNormal'), t('ui.variantBrutal'),['insane','hellish'].includes(selected.difficulty),t('ui.variantCrazed'),t('ui.forcedFormHelp')) : ''}` : ''}<label class="name-label">${e(t('ui.displayName'))}<input id="name" value="${e(selected.name)}" maxlength="24" autocomplete="nickname"></label><div class="connection-choices" role="group" aria-label="${e(t('ui.roomSettings'))}">${[
        ['offline', 'ui.solo', 'soldier'],
        ['public', 'ui.publicRooms', 'rescue'],
        ['private', 'ui.privateRoom', 'lock'],
      ]
        .map(
          ([id, key, glyph]) =>
            `<button data-visibility="${id}" aria-pressed="${visibility === id}" class="${visibility === id ? 'selected' : ''}">${icon(glyph)}${e(t(key))}</button>`,
        )
        .join(
          '',
        )}</div><p class="muted">${e(t(visibility === 'offline' ? 'ui.offlineNotice' : 'ui.practiceNotice'))}</p>${capacityNotice()}${button('launch', t('ui.play'), 'play', 'class="primary launch"')}</section></div>${navigation(false, true)}`;
    if(TESTING_BUILD&&page==='home'){
      const banner=document.createElement('p');banner.className='testing-banner';banner.textContent=t('ui.testingBuild');
      content.prepend(banner);
      const unlock=document.createElement('button');unlock.id='testing-unlock-home';unlock.textContent=t('ui.testingUnlock');
      content.querySelector('.home-buttons')?.append(unlock);
      unlock.onclick=()=>{unlockTestingDifficulties();unlock.textContent=t('ui.testingUnlocked');};
    }
    if(page==='leaderboards')mountLeaderboards(content,()=>go('home'));
    if (page === 'profile')
      mountProfile(
        content,
        () => go('home'),
        async () => {
          await hooks.profileChanged();
          render();
        },
      );
    if (page === 'lan')
      mountLan(
        content,
        (endpoint) => {
          selected.serverEndpoint = endpoint;
          visibility = 'public';
          go('class');
        },
        (endpoint) => {
          selected.serverEndpoint = endpoint;
          go('join');
        },
        () => go('home'),
      );
    if (page === 'changelog')
      content.innerHTML = changelogHTML(
        {
          title: t('ui.changelog'),
          back: t('ui.back'),
          english: changelogNotices[locale as keyof typeof changelogNotices] ?? changelogNotices.en,
        },
        locale,
      );
    if (page === 'settings')
      content.innerHTML = `<div class="settings-page"><h1>${e(t('ui.settings'))}</h1>${hooks.settingsHTML()}<div class="actions">${button('back-home', t('ui.back'), 'map')}</div></div>`;
    if (page === 'join')
      content.innerHTML = `<div class="join-page"><div class="setup-heading"><h1>${e(t('ui.joinRoom'))}</h1>${selected.serverEndpoint ? `<p>${e(desktopText('target'))}: <bdi>${e(selected.serverEndpoint)}</bdi></p>` : ''}</div><div class="join-options"><label>${e(t('ui.displayName'))}<input id="name" maxlength="24" value="${e(selected.name)}"></label><label>${e(t('ui.chooseClass'))}<select id="join-class">${implementedClassIds.map((id) => `<option value="${id}" ${selected.classId === id ? 'selected' : ''}>${e(t('class.' + id + '.name'))}</option>`).join('')}</select></label><label>${e(t('ui.roomCode'))}<div class="inline"><input id="code" maxlength="6" autocapitalize="characters" spellcheck="false"><button id="join-code">${e(t('ui.joinRoom'))}</button></div></label></div><div class="section-heading"><h2>${e(t('ui.publicRooms'))}</h2><button id="refresh">${e(t('ui.search'))}</button></div><div id="rooms" class="rooms"><p>${e(t('ui.noRooms'))}</p></div><div class="actions">${button('back-home', t('ui.back'), 'map')}</div></div>`;
    const byId = (id: string, fn: () => void) => {
      const el = host.querySelector<HTMLElement>('#' + id);
      if (el) el.onclick = fn;
    };
    byId('brand-home', () => go('home'));
    byId('new-run', () => {
      selected.serverEndpoint = undefined;
      visibility = 'offline';
      go('class');
    });
    byId('resume-boundary', hooks.resume);
    byId('gentle-start', () => {
      selected = { ...selected, classId: 'soldier', mode: 'short', difficulty: 'baby',
        openingBossId: 'constable', openingArenaId: 'gatehouse', practiceVariant: 'normal',
        serverEndpoint: undefined };
      previewClass = selected.classId;
      previewMode = selected.mode;
      arenaId = previewMap = 'gatehouse';
      visibility = 'offline';
      go('review');
    });
    byId('join', () => {
      selected.serverEndpoint = undefined;
      go('join');
    });
    byId('lan', () => go('lan'));
    byId('settings', () => go('settings'));
    byId('changelog', () => go('changelog'));
    byId('profile', () => go('profile'));
    byId('leaderboards',()=>go('leaderboards'));
    byId('back-home', () => go('home'));
    for (const id of ['guide', 'tutorial']) byId(id, () => tutorial(host, () => render('#' + id)));
    byId('setup-back', () => go(stage <= 0 ? 'home' : steps[stage - 1]));
    byId('setup-next', () => {
      if (page === 'class') selected.classId = previewClass as ClassId;
      if (page === 'mode') {
        selected.mode = previewMode as 'short' | 'standard' | 'long' | 'raid' | 'endless';
        selected.openingBossId =
          selected.mode === 'raid'
            ? 'chain-colossus'
            : selected.mode === 'long'
              ? 'constable'
              : selected.mode === 'standard'
                ? 'constable'
                : 'constable';
      }
      if (page === 'map') {
        arenaId = previewMap;
        selected.openingArenaId = previewMap;
      }
      go(steps[stage + 1]);
    });
    const openingBoss = host.querySelector<HTMLSelectElement>('#opening-boss');
    if (openingBoss)
      openingBoss.onchange = () => {
        selected.openingBossId = openingBoss.value as BossId;
      };
    const practiceVariant = host.querySelector<HTMLSelectElement>('#practice-variant');
    if (practiceVariant)
      practiceVariant.onchange = () => {
        selected.practiceVariant = practiceVariant.value === 'crazed' ? 'crazed' : practiceVariant.value === 'brutal' ? 'brutal' : 'normal';
        for (const option of openingBoss?.options ?? [])
          option.textContent =
            t('boss.' + option.value + '.name') +
            ' · ' +
            bossClassification(option.value, selected.practiceVariant);
      };
    byId('launch', () => {
      selected.name = host.querySelector<HTMLInputElement>('#name')!.value.trim() || 'Survivor';
      hooks.launch(
        visibility !== 'offline',
        { ...selected },
        undefined,
        visibility === 'private' ? 'private' : 'public',
      );
    });
    host.querySelector<HTMLSelectElement>('#language')!.onchange = async (event) => {
      await setLanguage((event.target as HTMLSelectElement).value);
      try {
        changeProfile(localStorage, (p) => {
          p.locale = locale;
        });
      } catch {
        showError('ui.errorSave');
      }
      render('#language');
    };
    host
      .querySelectorAll<HTMLButtonElement>('[data-page]')
      .forEach((b) => (b.onclick = () => go(b.dataset.page!)));
    host.querySelectorAll<HTMLButtonElement>('[data-class]').forEach(
      (b) =>
        (b.onclick = () => {
          previewClass = b.dataset.class!;
          render(`[data-class="${previewClass}"]`);
        }),
    );
    host.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(
      (b) =>
        (b.onclick = () => {
          previewMode = b.dataset.mode!;
          render(`[data-mode="${previewMode}"]`);
        }),
    );
    host.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(
      (b) =>
        (b.onclick = () => {
          previewMap = b.dataset.map!;
          render(`[data-map="${previewMap}"]`);
        }),
    );
    host.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(
      (b) =>
        (b.onclick = () => {
          if (!difficultyAvailable(b.dataset.difficulty!)) return;
          selected.difficulty = b.dataset.difficulty!;
          render(`[data-difficulty="${selected.difficulty}"]`);
        }),
    );
    host.querySelectorAll<HTMLButtonElement>('[data-visibility]').forEach(
      (b) =>
        (b.onclick = () => {
          selected.name = host.querySelector<HTMLInputElement>('#name')!.value.trim() || 'Survivor';
          visibility = b.dataset.visibility as typeof visibility;
          render(`[data-visibility="${visibility}"]`);
        }),
    );
    const nameInput = host.querySelector<HTMLInputElement>('#name');
    if (nameInput) nameInput.oninput = () => { selected.name = nameInput.value; };
    if (page === 'settings') {
      host.querySelector<HTMLDetailsElement>('details')!.open = true;
      hooks.bindSettings();
    }
    if (page === 'join') {
      const capture = () => {
        selected.name = host.querySelector<HTMLInputElement>('#name')!.value.trim() || 'Survivor';
        selected.classId = host.querySelector<HTMLSelectElement>('#join-class')!.value as ClassId;
      };
      byId('join-code', () => {
        capture();
        const code = host.querySelector<HTMLInputElement>('#code')!.value.trim().toUpperCase();
        if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) {
          showError('ui.errorCode');
          return;
        }
        hooks.launch(true, { ...selected }, { code });
      });
      host.querySelector<HTMLInputElement>('#code')!.onkeydown = event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          host.querySelector<HTMLButtonElement>('#join-code')!.click();
        }
      };
      byId('refresh', () => {
        void (async () => {
          try {
            const rooms = await new Session(selected.serverEndpoint).rooms(),
              list = host.querySelector<HTMLElement>('#rooms');
            if (!list) return;
            list.replaceChildren();
            if (!rooms.length) list.textContent = t('ui.noRooms');
            for (const room of rooms) {
              const b = document.createElement('button');
              b.textContent =
                t('mode.' + room.mode + '.name') +
                ' · ' +
                t('difficulty.' + room.difficulty) +
                ' · ' +
                number(room.players) +
                '/' +
                number(room.maximumPlayers);
              b.disabled = room.players >= room.maximumPlayers;
              b.onclick = () => {
                capture();
                hooks.launch(true, { ...selected }, { roomId: room.roomId });
              };
              list.append(b);
            }
          } catch {
            showError('ui.errorNetwork');
          }
        })();
      });
    }
    if (focusSelector) host.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true });
  }
  function navigation(disabled: boolean, backOnly = false) {
    return `<div class="setup-navigation"><button id="setup-back">← ${e(t('ui.back'))}</button>${backOnly ? '' : `<button id="setup-next" class="primary" ${disabled ? 'disabled' : ''}>${e(t('ui.next'))} →</button>`}</div>`;
  }
  function go(next: string) {
    page = next;
    render();
    window.scrollTo({ top: 0, behavior: 'auto' });
    const heading = host.querySelector<HTMLElement>('#setup-content h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  function showError(key: string) {
    const notice = host.querySelector<HTMLElement>('#notice');
    if (notice) {
      notice.textContent = t(key);
      notice.hidden = false;
    }
  }
  render();
}
