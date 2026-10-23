import Phaser from 'phaser';
import './style.css';
import { CombatScene } from './scene.ts';
import { Session, type ConnectionOptions } from './session.ts';
import { Controls } from './controls.ts';
import { Prediction } from './prediction.ts';
import { AudioBus } from './audio.ts';
import { assets } from './assets.ts';
import { initialLanguage, languages, locale, number, setLanguage, t } from './i18n.ts';
import { prototypeNotice } from './runtime-messages.ts';
import { data } from '../shared/game.ts';
import type { ClassId } from '../shared/protocol.ts';
import type { View, PlayerView } from '../shared/view.ts';
const app = document.querySelector<HTMLElement>('#app')!,
  audio = new AudioBus();
let session: Session | undefined,
  game: Phaser.Game | undefined,
  scene: CombatScene | undefined,
  controls: Controls | undefined,
  prediction = new Prediction(),
  timer: ReturnType<typeof setInterval> | undefined,
  paused = false,
  uiKey = '',
  lastPhase = '',
  busy = false;
const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const text = (key: string, args: Record<string, string | number> = {}) => esc(t(key, args));
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const settings = {
  autoFire: false,
  aimAssist: false,
  hitboxes: true,
  reduceMotion: false,
  highContrast: false,
  volume: 0.45,
  music: 0.3,
  textScale: 1,
};
try {
  const stored = JSON.parse(localStorage.getItem('ga-settings') ?? '{}');
  for (const key of ['autoFire', 'aimAssist', 'hitboxes', 'reduceMotion', 'highContrast'] as const)
    if (typeof stored[key] === 'boolean') settings[key] = stored[key];
  for (const key of ['volume', 'music', 'textScale'] as const)
    if (Number.isFinite(stored[key]))
      settings[key] = Math.max(
        key === 'textScale' ? 0.9 : 0,
        Math.min(key === 'textScale' ? 1.4 : 1, stored[key]),
      );
} catch {}
const saveSettings = () => {
  try {
    localStorage.setItem('ga-settings', JSON.stringify(settings));
  } catch {}
  applySettings();
};
function applySettings() {
  document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
  if (controls) {
    controls.autoFire = settings.autoFire;
    controls.aimAssist = settings.aimAssist;
  }
  if (scene) {
    scene.hitboxes = settings.hitboxes;
    scene.reduceMotion = settings.reduceMotion;
    scene.highContrast = settings.highContrast;
  }
  audio.setVolume(settings.volume, settings.music);
}
const select = (id: string, label: string, options: [string, string][]) =>
  `<label>${text(label)}<select id="${id}">${options.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('')}</select></label>`;
function settingsMarkup() {
  return `<details class="settings"><summary>${text('ui.settings')}</summary><div class="settings-grid">${(['autoFire', 'aimAssist', 'hitboxes', 'reduceMotion', 'highContrast'] as const).map((key) => `<label class="check"><input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}>${text('ui.' + key)}</label>`).join('')}<label>${text('ui.effectsVolume')}<input data-setting="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label>${text('ui.musicVolume')}<input data-setting="music" type="range" min="0" max="1" step="0.05" value="${settings.music}"></label><label>${text('ui.textSize')}<input data-setting="textScale" type="range" min="0.9" max="1.4" step="0.1" value="${settings.textScale}"></label></div></details>`;
}
function bindSettings() {
  document.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) =>
    input.addEventListener('input', () => {
      const key = input.dataset.setting as keyof typeof settings;
      (settings as Record<string, boolean | number>)[key] =
        input.type === 'checkbox' ? input.checked : Number(input.value);
      saveSettings();
    }),
  );
}
function notice(value: string) {
  const e = $('notice');
  if (e) {
    e.textContent = value;
    e.hidden = !value;
  }
}
async function menu() {
  document.body.classList.remove('playing');
  app.innerHTML = `<div class="menu"><header class="hero"><img src="${assets.cover}" alt=""><div><p class="eyebrow">GRAVE ACCORD · 0.2.0</p><h1>Grave Accord</h1><p>${text('ui.tagline')}</p></div></header><section class="menu-body"><p class="prototype">${esc(prototypeNotice[locale] ?? prototypeNotice.en)}</p><div class="menu-grid"><section class="setup"><h2>${text('ui.newRun')}</h2><div class="form-grid"><label>${text('ui.displayName')}<input id="name" maxlength="24" value="Survivor" autocomplete="nickname"></label>${select(
    'class',
    'ui.chooseClass',
    [
      ['soldier', t('class.soldier.name')],
      ['medic', t('class.medic.name')],
    ],
  )}${select('mode', 'ui.chooseMode', [
    ['short', t('mode.short.name')],
    ['endless', t('mode.endless.name')],
  ])}${select(
    'difficulty',
    'ui.chooseDifficulty',
    ['baby', 'easy', 'normal', 'hard'].map((id) => [id, t('difficulty.' + id + '.name')]),
  )}${select('language', 'ui.language', languages as [string, string][])}</div><div class="actions"><button id="solo" class="primary">${text('ui.solo')}</button><button id="public">${text('ui.createRoom')} · ${text('ui.publicRooms')}</button><button id="private">${text('ui.createRoom')} · ${text('ui.privateRoom')}</button></div><p class="muted">${text('ui.offlineNotice')}</p></section><section class="join"><h2>${text('ui.joinRoom')}</h2><label>${text('ui.roomCode')}<div class="inline"><input id="code" maxlength="6" autocapitalize="characters" spellcheck="false"><button id="join-code">${text('ui.joinRoom')}</button></div></label><div class="section-heading"><h3>${text('ui.publicRooms')}</h3><button id="refresh">↻ <span>${text('ui.search')}</span></button></div><div id="rooms" class="rooms"><p>${text('ui.noRooms')}</p></div></section></div><p id="notice" role="status" hidden></p>${settingsMarkup()}<details><summary>${text('ui.controls')}</summary><p>${text('ui.tutorialMove', { binding: 'WASD / ↑←↓→' })}</p><p>${text('ui.tutorialDodge', { binding: 'Space / A' })} · ${text('ui.reload')}: R / X</p><p>Q · E · ${text('ui.ultimate')}: X / Y · ${text('ui.revive')}: F / B</p><p>${text('ui.portraitHint')}</p></details><footer><span>${text('ui.translationNotice')}</span><a href="https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki" target="_blank" rel="noopener">${text('ui.howToPlay')}</a><a href="https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/main/CHANGELOG.md" target="_blank" rel="noopener">${text('ui.changelog')}</a></footer></section></div>`;
  $('language').addEventListener('change', async () => {
    await setLanguage(($('language') as HTMLSelectElement).value);
    await menu();
  });
  ($('language') as HTMLSelectElement).value = locale;
  ($('difficulty') as HTMLSelectElement).value = 'normal';
  bindSettings();
  $('solo').onclick = () => void begin(false);
  $('public').onclick = () => void begin(true);
  $('private').onclick = () => void begin(true, undefined, 'private');
  $('join-code').onclick = () => {
    const code = ($('code') as HTMLInputElement).value.trim();
    if (/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/i.test(code)) void begin(true, { code });
    else notice(t('ui.errorCode'));
  };
  $('refresh').onclick = () => void refresh();
  applySettings();
}
function options(): ConnectionOptions {
  return {
    name: ($('name') as HTMLInputElement).value.trim() || 'Survivor',
    classId: ($('class') as HTMLSelectElement).value as ClassId,
    mode: ($('mode') as HTMLSelectElement).value as 'short' | 'endless',
    difficulty: ($('difficulty') as HTMLSelectElement).value,
  };
}
async function refresh() {
  try {
    const rooms = await new Session().rooms();
    const container = $('rooms');
    container.replaceChildren();
    if (!rooms.length) container.textContent = t('ui.noRooms');
    for (const room of rooms) {
      const button = document.createElement('button');
      button.textContent = `${t('mode.' + room.mode + '.name')} · ${t('difficulty.' + room.difficulty + '.name')} · ${number(room.players)}/${number(room.maximumPlayers)} · ${t('ui.' + (room.phase === 'lobby' ? 'ready' : 'lateJoin'))}`;
      button.disabled = room.players >= room.maximumPlayers;
      button.onclick = () => void begin(true, { roomId: room.roomId });
      container.append(button);
    }
  } catch {
    notice(t('ui.errorNetwork'));
  }
}
async function begin(
  online: boolean,
  join?: { roomId?: string; code?: string },
  visibility: 'public' | 'private' = 'public',
) {
  if (busy) return;
  busy = true;
  const opts = options();
  notice(t('ui.connecting'));
  await audio.unlock().catch(() => {});
  session = new Session();
  const active = session;
  try {
    setupGame();
    active.onView = update;
    active.onEvents = (events) => {
      scene?.ingest(events);
      for (const e of events) if (e.type === 'sound') void audio.sound(e.id);
    };
    active.onStatus = (key) => {
      const e = $('status');
      if (e) e.textContent = t(key, { seconds: 60 });
      if (controls) {
        controls.blocked =
          paused ||
          active.view?.phase !== 'combat' ||
          key === 'ui.reconnecting' ||
          key === 'ui.errorNetwork';
        if (controls.blocked) controls.clear();
      }
    };
    active.onPurchase = (r) => {
      if (!r.ok) {
        $('status').textContent = t(
          r.reason === 'insufficientCoins' ? 'ui.notEnoughCoins' : 'ui.errorPurchase',
        );
      } else void audio.sound('ui-confirm');
    };
    $('status').textContent = t('ui.loading');
    await scene!.prepared;
    if (online) await active.connect(opts, join, visibility);
    else active.offline(opts);
    timer = setInterval(() => {
      const view = active.view;
      if (!view || (paused && !active.online)) return;
      const p = prediction.player ?? view.players.find((p) => p.id === active.id);
      const frame = controls!.sample(view.tick, p, view.boss);
      active.input(frame);
      prediction.submit(frame, view);
      if (scene) scene.predicted = prediction.player;
    }, 1000 / 30);
  } catch (error) {
    await active.close().catch(() => {});
    destroy();
    await menu();
    notice(
      t(
        error instanceof Error && error.message.startsWith('ui.')
          ? error.message
          : 'ui.errorNetwork',
      ),
    );
  } finally {
    busy = false;
  }
}
function setupGame() {
  document.body.classList.add('playing');
  paused = false;
  uiKey = '';
  lastPhase = '';
  prediction = new Prediction();
  app.innerHTML = `<div id="stage" dir="ltr"></div><section class="hud" aria-label="${text('ui.health')}"><div class="topline"><div><strong id="encounter"></strong><small id="status" role="status"></small></div><div id="boss-panel"><strong>${text('boss.constable.name')}</strong><span id="deadline"></span><progress id="boss-health" max="1" value="1" aria-label="${text('ui.boss')}"></progress></div><button id="pause-button">Ⅱ <span>${text('ui.pause')}</span></button></div><div id="accord" class="accord" hidden></div><div class="bottomline"><div class="vitals"><strong id="player-name"></strong><progress id="health" max="1" value="1" aria-label="${text('ui.health')}"></progress><span id="health-text"></span><span id="ammo"></span><span id="currency"></span></div><div id="abilities" class="ability-list"></div><div id="squad" class="squad"></div></div></section><div id="modal" class="overlay" hidden></div><div id="pause-menu" class="overlay" hidden><section class="dialog"><h2>${text('ui.paused')}</h2><p>${text('ui.onlinePause')}</p>${settingsMarkup()}<div class="actions"><button id="resume" class="primary">${text('ui.continue')}</button><button id="leave">${text('ui.leaveRoom')}</button></div></section></div><div class="touch-buttons"><button data-action="Space">${text('ui.dodge')}</button><button data-action="KeyQ">Q</button><button data-action="KeyE">E</button><button data-action="KeyX">${text('ui.ultimate')}</button><button data-action="interact">${text('ui.revive')}</button><button data-action="KeyR">${text('ui.reload')}</button></div><div class="portrait-note">${text('ui.portraitHint')}</div>`;
  controls = new Controls($('stage'));
  scene = new CombatScene();
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'stage',
    width: 1600,
    height: 1000,
    backgroundColor: '#142a27',
    render: { antialias: true, roundPixels: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene],
    audio: { noAudio: true },
  });
  $('pause-button').onclick = () => togglePause();
  $('resume').onclick = () => togglePause();
  $('leave').onclick = () => void leave();
  bindSettings();
  applySettings();
}
function togglePause() {
  paused = !paused;
  $('pause-menu').hidden = !paused;
  session?.pause(paused);
  if (controls) {
    controls.clear();
    controls.blocked = paused || session?.view?.phase !== 'combat';
  }
}
function update(view: View) {
  if (!session || !scene) return;
  scene.localId = session.id;
  scene.apply(view);
  prediction.acknowledge(view, session.id);
  scene.predicted = prediction.player;
  const p = view.players.find((p) => p.id === session!.id);
  if (!p) return;
  controls!.blocked =
    paused ||
    view.phase !== 'combat' ||
    session.status === 'ui.reconnecting' ||
    session.status === 'ui.errorNetwork';
  $('encounter').textContent = t('ui.encounter', { number: view.encounter + 1 });
  $('player-name').textContent = p.name + ' · ' + t('class.' + p.classId + '.name');
  const hp = $<HTMLProgressElement>('health');
  hp.max = p.maxHealth;
  hp.value = p.health;
  $('health-text').textContent =
    number(Math.ceil(p.health)) +
    ' / ' +
    number(p.maxHealth) +
    (p.shield ? ' + ' + number(p.shield) : '');
  $('ammo').textContent =
    t(p.reloadAt > view.combatTick ? 'ui.reloading' : 'ui.ammo') + ' ' + number(p.ammo);
  $('currency').textContent =
    t('ui.coins') + ' ' + number(p.coins) + ' · ' + t('ui.skillPoints') + ' ' + number(p.sp);
  const boss = $<HTMLProgressElement>('boss-health');
  boss.max = view.boss.maxHealth;
  boss.value = view.boss.health;
  $('boss-panel').hidden = view.phase !== 'combat';
  $('deadline').textContent = clock((view.boss.deadline - view.combatTick) / 30);
  const accord = $('accord');
  accord.hidden = !view.accord;
  if (view.accord)
    accord.textContent =
      t('ui.accordBreak') +
      ' · ' +
      t('ui.accordInstruction', { count: view.accord.required, seconds: 2 }) +
      ' ' +
      clock((view.accord.until - view.combatTick) / 30);
  const cl = data.classes.find((c) => c.id === p.classId)!;
  $('abilities').replaceChildren();
  for (const [key, label, at, name] of [
    ['Space', t('ui.dodge'), p.dodgeAt, ''],
    ['Q', t('ui.abilityQ'), p.qAt, t('ability.' + cl.abilities[0].id + '.name')],
    ['E', t('ui.abilityE'), p.eAt, t('ability.' + cl.abilities[1].id + '.name')],
    ['X', t('ui.ultimate'), p.ultimateAt, t('ability.' + cl.ultimate.id + '.name')],
  ] as const) {
    const e = document.createElement('span');
    e.className = at <= view.combatTick ? 'ability ready' : 'ability';
    e.title = name;
    e.textContent =
      key + ' · ' + label + ' ' + (at > view.combatTick ? clock((at - view.combatTick) / 30) : '✓');
    $('abilities').append(e);
  }
  $('squad').textContent =
    t('ui.players') +
    ' ' +
    view.players.filter((p) => p.status === 'active').length +
    '/' +
    view.players.length +
    (session.code ? ' · ' + t('ui.roomCode') + ' ' + session.code : '');
  if (p.status === 'downed')
    $('status').textContent =
      t('ui.bleedout', { seconds: Math.max(0, Math.ceil((p.downUntil - view.combatTick) / 30)) }) +
      ' · ' +
      t('ui.revivePrompt', { binding: 'F / B', player: p.name });
  else if (p.status === 'waiting') $('status').textContent = t('ui.lateJoin');
  else if (p.status === 'eliminated') $('status').textContent = t('ui.eliminated');
  if (view.phase !== lastPhase) {
    lastPhase = view.phase;
    void audio.loop(view.phase === 'combat');
  }
  const key = JSON.stringify([
    view.phase,
    p.coins,
    p.sp,
    p.weapon,
    p.skills,
    p.upgrades,
    view.mutationCards,
    view.contractCards,
    view.owner,
    session.id,
  ]);
  if (uiKey !== key) {
    uiKey = key;
    renderOverlay(view, p);
  }
  const time = $('phase-time');
  if (time) time.textContent = clock((view.phaseEnds - view.tick) / 30);
  for (const e of document.querySelectorAll<HTMLElement>('[data-vote-count]')) {
    const i = Number(e.dataset.voteCount);
    e.textContent = number(Object.values(view.votes).filter((v) => v === i).length);
  }
}
function clock(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return number(Math.floor(value / 60)) + ':' + String(value % 60).padStart(2, '0');
}
function renderOverlay(view: View, p: PlayerView) {
  const overlay = $('modal');
  overlay.hidden = view.phase === 'combat';
  if (overlay.hidden) return;
  let body = '',
    title = '';
  if (view.phase === 'mutationVote') {
    title = t('ui.mutationVote');
    body = `<div class="cards">${view.mutationCards.map((id, i) => `<button data-vote="${i}"><h3>${text('mutation.' + id + '.name')}</h3><p>${text('mutation.' + id + '.description')}</p><span>${text('ui.vote')} · <b data-vote-count="${i}">0</b></span></button>`).join('')}</div>`;
  } else if (view.phase === 'contractVote') {
    title = t('ui.bossVote');
    body = `<div class="cards">${view.contractCards.map((c, i) => `<button data-vote="${i}"><h3>${text('ui.bossConcealed')} ${number(i + 1)}</h3><p>${text('ui.threat')} ${number(c.threat)} · ${text('ui.bounty')} ×${number(c.bounty, 2)}</p><p>${text('ui.recommended')} ×${number(c.recommendedRating, 2)}</p><span>${text('ui.vote')} · <b data-vote-count="${i}">0</b></span></button>`).join('')}</div><p class="muted">${esc(prototypeNotice[locale])}</p>`;
  } else if (view.phase === 'lobby' || view.phase === 'shop') {
    title = t(view.phase === 'lobby' ? 'ui.roomSettings' : 'ui.shop');
    body =
      shop(p) +
      (view.phase === 'lobby'
        ? `<div class="actions"><button id="start" class="primary" ${view.owner !== session!.id ? 'disabled' : ''}>${text('ui.start')}</button><button id="return-menu">${text('ui.leaveRoom')}</button></div>`
        : '');
  } else if (view.phase === 'loading') {
    title = t('ui.deploying');
    body = `<p>${text('ui.tutorialTeam')}</p>`;
  } else {
    title = t(view.phase === 'victory' ? 'ui.victory' : 'ui.defeat');
    body = `<p>${text('ui.offlineNotice')}</p><button id="return-menu" class="primary">${text('ui.mainMenu')}</button>`;
  }
  const focus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.focus
      : undefined;
  overlay.innerHTML = `<section class="dialog ${view.phase === 'lobby' || view.phase === 'shop' ? 'wide' : ''}"><div class="section-heading"><h2>${esc(title)}</h2><span id="phase-time"></span></div>${body}</section>`;
  overlay.querySelectorAll<HTMLButtonElement>('[data-vote]').forEach(
    (button) =>
      (button.onclick = () => {
        session?.vote(Number(button.dataset.vote));
        void audio.sound('ui-confirm');
      }),
  );
  overlay.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(
    (button) =>
      (button.onclick = () =>
        session?.purchase({
          kind: button.dataset.kind as 'weapon' | 'upgrade' | 'skill',
          item: button.dataset.item!,
        })),
  );
  const start = $('start');
  if (start) start.onclick = () => session?.start();
  const back = $('return-menu');
  if (back) back.onclick = () => void leave();
  if (focus)
    overlay.querySelector<HTMLElement>('[data-focus="' + CSS.escape(focus) + '"]')?.focus();
}
function shop(p: PlayerView) {
  const item = (
    kind: string,
    id: string,
    title: string,
    description: string,
    price: number,
    disabled: boolean,
    currency: string,
  ) =>
    `<button data-kind="${kind}" data-item="${id}" data-focus="${id}" ${disabled ? 'disabled' : ''}><strong>${esc(title)}</strong><small>${esc(description)}</small><span>${number(price)} ${text(currency)}</span></button>`;
  return `<div class="shop-summary">${text('ui.coins')} ${number(p.coins)} · ${text('ui.skillPoints')} ${number(p.sp)} · ${text('ui.capstoneLimit')}</div><div class="shop-columns"><section><h3>${text('ui.equip')}</h3><div class="shop-items">${data.weapons
    .filter((w) => w.classId === p.classId)
    .map((w) =>
      item(
        'weapon',
        w.id,
        t('weapon.' + w.id + '.name'),
        t('stat.damage') + ' ' + number(w.damage) + ' · ' + t('ui.ammo') + ' ' + w.magazine,
        w.price,
        p.weapon === w.id || p.coins < w.price,
        'ui.coins',
      ),
    )
    .join('')}</div><h3>${text('ui.upgrade')}</h3><div class="shop-items">${data.upgrades
    .map((u) => {
      const level = p.upgrades[u.id] ?? 0,
        price = u.basePrice + level * u.priceStep;
      return item(
        'upgrade',
        u.id,
        t('upgrade.' + u.id + '.name'),
        number(level) + ' / ' + number(u.maximum),
        price,
        level >= u.maximum || p.coins < price,
        'ui.coins',
      );
    })
    .join(
      '',
    )}</div></section><section><h3>${text('ui.skillTree')}</h3><div class="branches">${data.classes
    .find((c) => c.id === p.classId)!
    .branches.map(
      (branch) =>
        `<section><h4>${text('branch.' + branch.id)}</h4>${data.skills
          .filter((s) => s.classId === p.classId && s.branchId === branch.id)
          .map((s) =>
            item(
              'skill',
              s.id,
              t('skill.' + s.id + '.name'),
              t('skill.' + s.id + '.description'),
              s.cost,
              p.skills.includes(s.id) ||
                p.sp < s.cost ||
                Boolean(s.prerequisite && !p.skills.includes(s.prerequisite)) ||
                (s.capstone &&
                  p.skills.some((id) => data.skills.find((n) => n.id === id)?.capstone)),
              'ui.skillPoints',
            ),
          )
          .join('')}</section>`,
    )
    .join('')}</div></section></div>`;
}
async function leave() {
  controls?.clear();
  await session?.close().catch(() => {});
  destroy();
  await menu();
  audio.stop();
}
function destroy() {
  if (timer) clearInterval(timer);
  timer = undefined;
  controls?.destroy();
  game?.destroy(true);
  game = undefined;
  scene = undefined;
  controls = undefined;
  session = undefined;
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && session) togglePause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && session && !session.online && !paused) togglePause();
});
await setLanguage(initialLanguage());
await menu();
