import {TESTING_BUILD} from './build-audience.ts';
import { showingBossDefeat } from '../shared/boss-defeat-flow.ts';
import {expeditionText} from './expedition-text.ts';
import {testingToolsMarkup,unlockTestingDifficulties} from './testing-ui.ts';
import {RoomChatUI} from './room-chat-ui.ts';
import {chatDeliveryText} from './chat-delivery-text.ts';
import {RoomInviteUI,roomInvitePlacement} from './room-invite-ui.ts';
import {HostMatchUI} from './host-match-ui.ts';
import {arenaCanvasToWorld} from './arena-camera.ts';
import {bindPasswordVisibility} from './ui/password-visibility.ts';
import {waitingRoomMarkup,bindRoomCode} from './ui/waiting-room.ts';
import {playerVitalsMarkup} from './ui/player-vitals.ts';
import {bossDefeatStatus} from './ui/boss-defeat-status.ts';
import { teamResultMarkup } from './ui/team-records.ts';
import type { TeamBoardSelection } from './team-records.ts';
import {clerkShelterPower} from './clerk-shelter-power.ts';
import {BossGuideState,bossGuideMarkup,bossGuideAvailable} from './boss-guide.ts';
import './ui/boss-guide.css';
import {bellPhaseName,bellPhaseHint} from './bell-text.ts';
import {moldPhaseName,moldPhaseHint} from './mold-text.ts';
import {matronPhaseName,matronPhaseHint} from './matron-text.ts';
import {ambulancePhaseName,ambulancePhaseHint} from './ambulance-text.ts';
import {widowPhaseName,widowPhaseHint} from './widow-text.ts';
import {marshalPhaseName,marshalPhaseHint} from './marshal-text.ts';
import {tollkeeperPhaseName,tollkeeperPhaseHint} from './tollkeeper-text.ts';
import {clerkPhaseName,clerkPhaseHint} from './clerk-text.ts';
import {ratcatcherPhaseName,ratcatcherPhaseHint} from './ratcatcher-text.ts';
import {courierPhaseName,courierPhaseHint} from './courier-text.ts';
import {bossHeaderMarkup} from './ui/boss-header.ts';
import { phaseCountdownMarkup, runResultsMarkup } from './ui/run-results.ts';
import {smallWakesPhaseName,smallWakesPhaseHint} from './small-wakes-text.ts';
import {bossPatternPhase, encounterPhases, phaseMarkers} from '../shared/encounter-policy.ts';
import {combatReviveAllowed,selfReviveAllowed} from '../shared/recovery-policy.ts';
import { BossPhaseFeedback, constablePhaseHint } from './boss-phase-feedback.ts';
import { constablePhaseName } from './constable-phase-text.ts';
import { bossThreat } from '../shared/boss-threat.ts';
import { classifiedThreatCode } from './threat-text.ts';
import { loadProfile, changeProfile, type CosmeticId } from './profile.ts';
import { defaultPreferences } from './preferences.ts';
import { defaultControls } from './input-bindings.ts';
import { controlsMarkup, bindControlSettings, bindingLabel } from './ui/control-settings.ts';
import { insignia } from './ui/insignia.ts';
import { profileText } from './profile-text.ts';
import {wardenPhaseName,wardenPhaseHint} from './warden-text.ts';
import { extensionText, signatureHelp } from './extension-ui.ts';
import Phaser from 'phaser';
import './style.css';
import './ui/polish.css';
import './ui/skill-map.css';
import './fonts.css';
import './ui/expedition.css';
import './ui/votes.css';
import './ui/runtime-extras.css';
import './ui/boss-defeat.css';
import './ui/waiting-room.css';
import './ui/interface-clarity.css';
import { CombatScene } from './scene.ts';
import { Session, type ConnectionOptions,type RoomJoin,type RoomJoinRetry } from './session.ts';
import {untilAborted} from './request-lifetime.ts';
import { Controls } from './controls.ts';
import { Prediction } from './prediction.ts';
import { assets } from './assets.ts';
import { AudioBus } from './audio.ts';
import { initialLanguage, locale, number, setLanguage, t } from './i18n.ts';
import { mountSetup, setupOptions } from './ui/setup.ts';
import { shopMarkup, bindShop, supplyGlyph } from './ui/shop.ts';
import { icon } from './ui/icons.ts';
import { supplyText } from './content-text.ts';
import { voteMarkup } from './ui/votes.ts';
import { rateBuild, buildGrade } from '../shared/build-rating.ts';
import { data } from '../shared/game.ts';
import type { View, PlayerView } from '../shared/view.ts';
const app = document.querySelector<HTMLElement>('#app')!,
  audio = new AudioBus(),
  bossPhaseFeedback = new BossPhaseFeedback(),
  bossGuide = new BossGuideState();
let guideReturnFocus: HTMLElement | null = null;
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
let setupCleanup: (() => void) | undefined;
let launchSerial = 0;
const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const text = (key: string, args: Record<string, string | number> = {}) => esc(t(key, args));
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let lastMetricsPaint = 0;
const ratingCache = new Map<string, { key: string; value: number }>();
function rating(p: PlayerView) {
  const key = JSON.stringify([p.classId, p.weapon, p.skills, p.upgrades]);
  let cached = ratingCache.get(p.id);
  if (cached?.key !== key) {
    cached = { key, value: rateBuild(p) };
    ratingCache.set(p.id, cached);
  }
  return cached!.value;
}
let roomChatUI:RoomChatUI|undefined;
let roomInviteUI:RoomInviteUI|undefined;
let hostMatchUI:HostMatchUI|undefined;
let lastMatchPaused = false;
let vitalsSizeObserver:ResizeObserver|undefined;
let lobbyPanel: 'room'|'equipment' = 'room';
const settings = defaultPreferences();
let inputOptions = defaultControls(),
  selectedCosmetic: CosmeticId = 'field-mark',
  profileError = false;
try {
  const p = loadProfile(localStorage);
  Object.assign(settings, p.settings);
  inputOptions = p.controls;
  selectedCosmetic = p.selectedCosmetic;
} catch {
  profileError = true;
}
const saveSettings = () => {
  try {
    changeProfile(localStorage, (p) => {
      p.settings = { ...settings };
    });
    localStorage.setItem('ga-settings', JSON.stringify(settings));
  } catch {
    notice(t('ui.errorSave'));
  }
  applySettings();
};
function applySettings() {
  document.body.dataset.reduceMotion=String(settings.reduceMotion);
  document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
  if (controls) {
    controls.configure(inputOptions);
    controls.autoFire = settings.autoFire;
    controls.aimAssist = settings.aimAssist;
  }
  if (scene) {
    scene.hitboxes = settings.hitboxes;
    scene.reduceMotion = settings.reduceMotion;
    scene.highContrast = settings.highContrast;
    scene.showNames = settings.showNames;
    scene.nameTextScale=settings.textScale;
  }
  roomChatUI?.configure(settings.roomChat,session?.online??false);
  roomChatUI?.setShortcutEnabled(!Object.values(inputOptions.bindings).some(keys => keys.includes('KeyC')));
  audio.setVolume(settings.volume, settings.music);
}
function settingsMarkup() {
  return `<details class="settings"><summary>${text('ui.settings')}</summary><div class="settings-grid">${(['autoFire', 'aimAssist', 'hitboxes', 'reduceMotion', 'highContrast', 'branchingTree', 'showNames', 'roomChat'] as const).map((key) => `<label class="check"><input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''}>${text('ui.' + key)}</label>`).join('')}<label>${text('ui.effectsVolume')}<input data-setting="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label>${text('ui.musicVolume')}<input data-setting="music" type="range" min="0" max="1" step="0.05" value="${settings.music}"></label><label>${text('ui.textSize')}<input data-setting="textScale" type="range" min="0.9" max="1.4" step="0.1" value="${settings.textScale}"></label></div>${controlsMarkup(inputOptions)}</details>`;
}
function bindSettings() {
  const root = document.querySelector<HTMLElement>('[data-controls]');
  if (root)
    bindControlSettings(
      root,
      () => inputOptions,
      (next) => {
        changeProfile(localStorage, (p) => {
          p.controls = structuredClone(next);
        });
        inputOptions = next;
        applySettings();
      },
    );

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
  const e = $('notice') ?? $('status');
  if (e) {
    e.textContent = value;
    e.hidden = !value;
  }
}
async function menu(initialRecords?: TeamBoardSelection,retryJoin?:RoomJoinRetry) {
  setupCleanup?.();
  document.body.classList.remove('playing', 'preparing');
  setupCleanup = mountSetup(app, {
    resume: () => {
      void begin(false, undefined, 'public', undefined, true);
    },
    launch: (online, opts, join, visibility,password) => {
      void begin(online, join, visibility, opts,false,password);
    },
    profileChanged: async () => {
      const p = loadProfile(localStorage);
      Object.assign(settings, p.settings);
      inputOptions = p.controls;
      selectedCosmetic = p.selectedCosmetic;
      await setLanguage(p.locale);
      applySettings();
    },
    settingsHTML: settingsMarkup,
    bindSettings,
  }, initialRecords,retryJoin);
  applySettings();
  if (profileError) {
    notice(t('ui.errorProfile'));
    profileError = false;
  }
}
function options(): ConnectionOptions {
  return setupOptions();
}
async function begin(
  online: boolean,
  join?: RoomJoin,
  visibility: 'public' | 'private' = 'public',
  prepared?: ConnectionOptions,
  resume = false,
  createPassword?:string,
) {
  if (busy) return;
  busy = true;
  const opts = prepared ?? options();
  const serial = ++launchSerial;
  notice(t('ui.connecting'));
  session = new Session(opts.serverEndpoint);
  const active = session;
  const current = () => launchSerial === serial && session === active;
  try {
    const unlocked = audio.unlock().catch(() => {});
    setupCleanup?.(); setupCleanup = undefined;
    setupGame(online,opts.classId);
    active.onView = view => { if (current()) update(view); };
    active.onEvents = (events) => {
      if (!current()) return;
      scene?.ingest(events);
      for (const e of events) if (e.type === 'sound') void audio.sound(e.id);
    };
    active.onTeamRecord = () => { if (current() && active.view) update(active.view); };
    active.onStatus = (key) => {
      if (!current()) return;
      const e = $('status');
      if (e) e.textContent = t(key, { seconds: 60, position: active.queuePosition });
      const loadingStatus = $('load-state');
      if (loadingStatus) loadingStatus.textContent = t(key, { seconds: 60, position: active.queuePosition });
      if (controls) {
        controls.blocked =
          (bossGuide.blocksInput(paused)||roomChatUI?.blocksInput===true||roomInviteUI?.open===true) ||
          active.view?.phase !== 'combat' || active.view.matchPaused === true ||
          key === 'ui.reconnecting' ||
          key === 'ui.errorNetwork';
        if (controls.blocked) controls.clear();
      }
    };
    active.onCheckpointStatus = (status) => {
      if (!current()) return;
      const element = $('checkpoint-notice');
      if (element)
        element.textContent =
          status === 'pending'
            ? t('ui.checkpointSaving')
            : status === 'unavailable'
              ? t('ui.checkpointUnavailable')
              : '';
    };
    active.onTestingResult=ok=>{if(!current())return;const status=$('testing-status');if(status)status.textContent=t(ok?'ui.testingApplied':'ui.testingRejected');};
    active.onPurchase = (r) => {
      if (!current()) return;
      if (!r.ok) {
        $('status').textContent = t(
          r.reason === 'matchPaused'
            ? 'ui.matchPaused' : r.reason === 'checkpointPending'
            ? 'ui.checkpointSaving'
            : r.reason === 'insufficientCoins'
              ? 'ui.notEnoughCoins'
              : r.reason === 'inventoryFull'
                ? 'ui.inventoryFull'
                : 'ui.errorPurchase',
        );
      } else void audio.sound('ui-confirm');
    };
    $('status').textContent = t('ui.loading');
    await untilAborted(Promise.all([scene!.prepared, unlocked]), active.signal);
    if (!current()) return;
    if (online) await active.connect(opts, join, visibility,createPassword);
    else await active.offline(opts, resume);
    if (!current()) return;
    roomChatUI?.configure(settings.roomChat,active.online);
    timer = setInterval(() => {
      const view = active.view;
      if (!view || view.matchPaused || bossGuide.pausesSimulation(paused,active.online)) return;
      const p = prediction.player ?? view.players.find((p) => p.id === active.id);
      const frame = controls!.sample(view.tick, p, view.boss);
      active.input(frame);
      prediction.submit(frame, view);
      if (scene) scene.predicted = prediction.player;
    }, 1000 / 30);
  } catch (error) {
    await active.close().catch(() => {});
    if (!current()) return;
    destroy();
    const retry=join&&error instanceof Error&&error.message==='ui.errorRoomPassword';
    await menu(undefined,retry?{roomId:join.roomId,code:join.code}:undefined);
    if(!retry)notice(
      error instanceof Error && error.message === 'assetsUnavailable'
        ? expeditionText(locale, 'loadError') : t(
          error instanceof Error && error.message.startsWith('ui.')
            ? error.message
            : 'ui.errorNetwork',
        ),
    );
  } finally {
    if (current()) busy = false;
  }
}
function setupGame(online: boolean,classId:string) {
  const serial = launchSerial;
  lobbyPanel = online ? 'room' : 'equipment';
  document.body.classList.add('playing', 'preparing');
  paused = false;
  lastMatchPaused = false;
  bossGuide.set(false);
  guideReturnFocus = null;
  uiKey = '';
  lastPhase = '';
  prediction = new Prediction();
  app.innerHTML = `<div id="stage" dir="ltr"></div><section class="hud" aria-label="${text('ui.health')}"><div class="topline"><div><strong id="encounter"></strong><small id="status" role="status"></small></div><div id="boss-panel">${bossHeaderMarkup()}<div class="boss-health-track" dir="ltr"><progress id="boss-health" max="1" value="1" aria-label="${text('ui.boss')}"></progress><div id="boss-phase-markers" aria-hidden="true"></div></div><p id="boss-phase-entry" class="boss-phase-entry" role="status" aria-live="polite" hidden></p><p id="boss-phase-note" class="boss-phase-note" role="status" aria-live="polite" hidden></p></div><div class="hud-actions"><button id="pause-button">Ⅱ <span>${text('ui.pause')}</span></button></div></div><div id="accord" class="accord" hidden></div><p id="signature-help" class="signature-help" role="status" aria-live="polite" hidden></p><div class="bottomline">${playerVitalsMarkup(classId,assets.portraits[classId],selectedCosmetic==='field-mark'?'':insignia(selectedCosmetic),t)}<div id="abilities" class="ability-list"></div><div id="squad" class="squad"></div></div></section><div id="modal" class="overlay" hidden></div><div id="pause-menu" class="overlay" hidden><section class="dialog"><h2>${text('ui.paused')}</h2><p id="pause-notice">${text(online ? 'ui.onlinePause' : 'ui.offlineNotice')}</p>${settingsMarkup()}<div class="actions"><button id="resume" class="primary">${text('ui.continue')}</button><button id="leave">${text('ui.leaveRoom')}</button></div></section></div><div class="touch-buttons"><button data-action="dodge">${text('ui.dodge')}</button><button data-action="q">Q</button><button data-action="e">E</button><button data-action="ultimate">${text('ui.ultimate')}</button><button data-action="interact">${text('ui.revive')}</button><button data-action="reload">${text('ui.reload')}</button></div><div class="portrait-note">${text('ui.portraitHint')}</div>`;
  vitalsSizeObserver=new ResizeObserver(()=>{
    if (serial !== launchSerial) return;
    const top=$('player-name-label').closest('.player-vitals')!.getBoundingClientRect().top;
    app.style.setProperty('--combat-chat-bottom',Math.ceil(window.innerHeight-top+8)+'px');
  });
  vitalsSizeObserver.observe(app.querySelector('.player-vitals')!);
  const loading = document.createElement('section');
  loading.id = 'loading-expedition';
  loading.className = 'loading-expedition';
  loading.setAttribute('role','dialog'); loading.setAttribute('aria-modal','true'); loading.setAttribute('aria-labelledby','loading-heading');
  loading.innerHTML = `<div class="loading-card"><span class="eyebrow">GRAVE ACCORD</span><h1 id="loading-heading" tabindex="-1">${text('ui.loading')}</h1><p>${esc(expeditionText(locale, 'loadingHelp'))}</p><progress id="assets-progress" value="0" max="1" aria-label="${text('ui.loading')}"></progress><div class="loading-state"><span id="load-state" role="status">${text('ui.loading')}</span><output id="assets-percent" aria-hidden="true">${number(0)}%</output></div><button id="cancel-loading" type="button">${text('ui.cancel')}</button></div>`;
  app.append(loading);
  $('cancel-loading').onclick = () => { if (serial === launchSerial) void leave(); };
  if (online) {
    $('pause-button').innerHTML = `${icon('settings')} <span>${text('ui.settings')}</span>`;
    $('pause-menu').querySelector('h2')!.textContent = t('ui.settings');
    $('resume').textContent = t('ui.back');
    hostMatchUI = new HostMatchUI(session!,app,$('pause-button'),$('pause-menu').querySelector('.dialog')!,t);
  }
  const defeatBanner = document.createElement('aside');
  defeatBanner.id = 'boss-defeated-banner'; defeatBanner.className = 'boss-defeated-banner'; defeatBanner.hidden = true;
  defeatBanner.setAttribute('role','status'); defeatBanner.setAttribute('aria-live','polite');
  defeatBanner.innerHTML = `<strong>${text('ui.bossDefeated')}</strong><span id="defeated-boss-name"></span><span class="boss-defeated-next"><span id="boss-defeated-next"></span><span id="boss-defeated-countdown" class="boss-defeated-countdown" aria-hidden="true"></span></span>`;
  app.append(defeatBanner);
  $('loading-heading').focus({ preventScroll: true });
  const guideMount=document.createElement('div');
  guideMount.innerHTML=bossGuideMarkup(locale,online);
  $('pause-button').before(guideMount.querySelector('#boss-guide-button')!);
  app.append(guideMount.querySelector('#boss-guide')!);
  $('boss-guide-copy').append($('boss-phase-note'),$('signature-help'));
  $('boss-guide-button').onclick=()=>setBossGuide(!bossGuide.open);
  const power=document.createElement('span');power.id='clerk-shelter-power';power.hidden=true;$('currency').before(power);
  if(online)roomInviteUI=new RoomInviteUI(app,t,()=>syncPauseState());
  roomChatUI=new RoomChatUI(session!,app,()=>syncPauseState(), {
    title: t('ui.roomChat'), message: t('ui.chatMessage'), send: t('ui.chatSend'), note: t('ui.chatEphemeral'), locale,
    keyboardHelp: t('ui.chatKeyboardHelp'),
    delivery:state=>chatDeliveryText(state,t),
  });
  roomChatUI.configure(settings.roomChat,online);
  roomChatUI.setShortcutEnabled(!Object.values(inputOptions.bindings).some(keys => keys.includes('KeyC')));
  for (const id of ['pause-menu', 'boss-guide']) {
    const dialog = $(id).querySelector<HTMLElement>('.dialog')!;
    const layout = document.createElement('div');
    layout.className = 'dialog-layout';
    for (const name of ['role','aria-modal','aria-labelledby','aria-label']) {
      const value = dialog.getAttribute(name);
      if (value !== null) { layout.setAttribute(name,value); dialog.removeAttribute(name); }
    }
    const inviteSlot=document.createElement('div');
    inviteSlot.id=id+'-room-invite-slot';inviteSlot.className='menu-room-invite-slot';
    dialog.querySelector('h2')!.after(inviteSlot);
    const slot = document.createElement('div');
    slot.id = id + '-chat-slot';
    slot.className = 'dialog-chat-slot';
    dialog.before(layout);
    layout.append(dialog, slot);
  }
  if(TESTING_BUILD){
    const marker=document.createElement('small');marker.id='testing-run-marker';marker.hidden=true;marker.textContent=t('ui.testingTools')+' · '+t('ui.leaderboardUnranked');$('currency').after(marker);
    const mount=document.createElement('div');mount.innerHTML=testingToolsMarkup(online);$('pause-menu').querySelector('.dialog')!.append(...Array.from(mount.childNodes));
    $('testing-apply').onclick=()=>session?.testingCommand({coins:Number($<HTMLInputElement>('testing-coins').value),sp:Number($<HTMLInputElement>('testing-sp').value)});
    $('testing-unlock').onclick=()=>{$('testing-status').textContent=t(unlockTestingDifficulties()?'ui.testingUnlocked':'ui.errorSave');};
  }
  $('boss-guide-close').onclick=$('boss-guide-resume').onclick=()=>setBossGuide(false);
  const supplyBar = document.createElement('div');
  const checkpointNotice = document.createElement('small');
  checkpointNotice.id = 'checkpoint-notice';
  checkpointNotice.setAttribute('role', 'status');
  $('status').after(checkpointNotice);
  supplyBar.id = 'supply-bar';
  supplyBar.className = 'supply-bar';
  supplyBar.setAttribute('aria-label', t('ui.supplies'));
  supplyBar.innerHTML = Array.from(
    { length: 3 },
    (_, i) =>
      `<button data-supply-slot="${i}" data-action="supply${i + 1}" disabled><b>${i + 1}</b><span data-supply-glyph>${icon('ability')}</span><small data-supply-count>—</small><small data-supply-time></small></button>`,
  ).join('');
  $('squad').before(supplyBar);
  controls = new Controls($('stage'),arenaCanvasToWorld);
  scene = new CombatScene();
  scene.onLoadProgress = value => {
    if (serial !== launchSerial) return;
    const progress = Math.max(0, Math.min(1, value));
    const bar = $<HTMLProgressElement>('assets-progress');
    const label = $('assets-percent');
    if (bar) bar.value = progress;
    if (label) label.textContent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(progress);
  };
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
  if (import.meta.env.DEV) {
    const panel = document.createElement('aside');
    panel.id = 'dev-metrics';
    panel.hidden = true;
    panel.style.cssText =
      'position:fixed;right:8px;top:80px;z-index:60;background:#061b14eb;color:#f3e7bf;padding:12px;border:1px solid #bbcc9c;font:12px monospace;max-width:330px;max-height:80vh;overflow:auto;pointer-events:auto';
    panel.innerHTML =
      '<strong>Development measurement · F8</strong><pre id="dev-metrics-data"></pre><button id="dev-metrics-reset">Reset render sample</button><button id="dev-metrics-baseline">Capture 20 s baseline</button><button id="dev-metrics-stress">Capture 20 s at 4,000 hostiles</button>';
    app.append(panel);
    $('dev-metrics-reset').onclick = () => scene?.frameMeter.reset();
    $('dev-metrics-baseline').onclick = () => scene?.frameMeter.beginCapture(20000);
    $('dev-metrics-stress').onclick = () => scene?.frameMeter.beginCapture(20000, 4000);
  }
}
function syncPauseState() {
  syncRoomChatPlacement();
  const simulationPaused=session?.view?.matchPaused===true||bossGuide.pausesSimulation(paused,session?.online??false);
  session?.pause(simulationPaused);
  prediction=new Prediction();
  if(session?.view)prediction.acknowledge(session.view,session.id);
  if(scene)scene.predicted=prediction.player;
  if(scene?.scene){
    if(simulationPaused&&!scene.scene.isPaused())scene.scene.pause();
    else if(!simulationPaused&&scene.scene.isPaused())scene.scene.resume();
  }
  if(controls){controls.clear();controls.blocked=simulationPaused||(bossGuide.blocksInput(paused)||roomChatUI?.blocksInput===true||roomInviteUI?.open===true)||session?.view?.phase!=='combat';}
}
function syncRoomChatPlacement() {
  const dock = paused ? $('pause-menu-chat-slot') : bossGuide.open
    ? $('boss-guide-chat-slot') : session?.view && session.view.phase !== 'combat' && !showingBossDefeat(session.view.boss,session.view.tick)
      ? $('phase-chat-slot') : undefined;
  roomChatUI?.place(dock ?? undefined);
  syncRoomInvitePlacement();
}
function syncRoomInvitePlacement(){
  if(!roomInviteUI)return;
  const view=session?.view;
  const place=roomInvitePlacement(paused,bossGuide.open,view?.phase,view?showingBossDefeat(view.boss,view.tick):false,lobbyPanel);
  roomInviteUI.root.hidden=!session?.code||place.hidden;
  roomInviteUI.place(place.slot?$(place.slot)??undefined:undefined);
}
function setBossGuide(value:boolean,restoreFocus=true) {
  if(value&&(session?.view?.phase!=='combat'||!bossGuideAvailable(session.view.run.difficulty)))return;
  if(value)guideReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  bossGuide.set(value);
  $('boss-guide').hidden=!value;
  $('boss-guide-button').setAttribute('aria-expanded',String(value));
  syncPauseState();
  if(value)$('boss-guide-close').focus({preventScroll:true});
  else if(restoreFocus)(guideReturnFocus?.isConnected?guideReturnFocus:$('boss-guide-button')).focus({preventScroll:true});
}
function togglePause() {
  paused=!paused;
  $('pause-menu').hidden=!paused;
  syncPauseState();
}
function update(view: View) {
  if (!session || !scene) return;
  $('pause-notice').textContent=t(view.run.testingModified?'ui.testingNoRecords':session.online?'ui.onlinePause':'ui.offlineNotice');
  if(TESTING_BUILD)$('testing-run-marker').hidden=!view.run.testingModified;
  if(view.phase!=='combat'&&bossGuide.open)setBossGuide(false,false);
  $<HTMLButtonElement>('boss-guide-button').disabled=view.phase!=='combat';
  $('boss-guide-button').hidden=!bossGuideAvailable(view.run.difficulty);
  $('boss-guide-boss-name').textContent=t('boss.'+view.boss.id+'.name');
  roomInviteUI?.update(session.code,session.hostPassword);
  hostMatchUI?.update();
  syncRoomInvitePlacement();
  scene.localId = session.id;
  scene.apply(view);
  if (lastMatchPaused !== (view.matchPaused === true)) {
    lastMatchPaused = view.matchPaused === true; syncPauseState();
  }
  prediction.acknowledge(view, session.id);
  scene.predicted = prediction.player;
  const p = view.players.find((p) => p.id === session!.id);
  if (!p) return;
  const defeated = showingBossDefeat(view.boss, view.tick), banner = $('boss-defeated-banner');
  const defeatId = view.run.id + ':' + view.boss.defeatedAt;
  if (defeated && banner.dataset.defeat !== defeatId) {
    $('defeated-boss-name').textContent = t('boss.' + view.boss.id + '.name');
    $('boss-defeated-next').textContent=t(bossDefeatStatus(view.phase,view.boss,view.tick).key);
    banner.dataset.defeat = defeatId;
  }
  if(defeated){
    const seconds=String(bossDefeatStatus(view.phase,view.boss,view.tick).seconds);
    const counter=$('boss-defeated-countdown');
    if(counter.dataset.seconds!==seconds){counter.dataset.seconds=seconds;counter.textContent=t('template.seconds',{value:number(Number(seconds))});}
  }
  banner.hidden = !defeated;
  $('loading-expedition')?.remove();
  document.body.classList.remove('preparing');
  controls!.blocked =
    (bossGuide.blocksInput(paused)||roomChatUI?.blocksInput===true||roomInviteUI?.open===true) ||
    view.phase !== 'combat' || view.matchPaused === true ||
    session.status === 'ui.reconnecting' ||
    session.status === 'ui.errorNetwork';
  $('encounter').textContent = t('ui.encounter', {
    number: defeated ? view.encounter : view.encounter + 1,
  });
  const power=clerkShelterPower(view,p),powerElement=$('clerk-shelter-power');
  powerElement.hidden=power<=0;powerElement.textContent=power>0?t('ui.shelterPower',{percent:number(Math.round(power*100))}):'';
  $('player-name-label').textContent=p.name;
  $('player-class').textContent=t('class.'+p.classId+'.name');
  $('player-build').textContent=t('ui.buildRating')+' '+buildGrade(rating(p));
  $('boss-name').textContent=t('boss.'+view.boss.id+'.name');
  $('boss-threat-label').textContent=t('ui.threat');
  $('boss-threat-code').textContent=classifiedThreatCode(view.boss.threat,bossThreat(view.boss.id).subtier,view.boss.variant);
  $('boss-form').textContent=t(view.boss.variant==='crazed'?'ui.variantCrazed':view.boss.variant==='brutal'?'ui.variantBrutal':'ui.variantNormal');
  $('boss-phase-label').textContent=t('ui.phaseCount',{number:number(view.boss.phase+1),total:number(encounterPhases(view.boss.id,view.boss.variant).length)});
  $('boss-phase-name').textContent=view.boss.id==='constable'?constablePhaseName(bossPatternPhase(view.boss.id,view.boss.variant,view.boss.phase),locale):
    view.boss.id==='bellringer'?bellPhaseName(view.boss.phase,locale):view.boss.id==='alchemist'?moldPhaseName(view.boss.phase,locale):view.boss.id==='matron'?matronPhaseName(view.boss.phase,locale):view.boss.id==='black-ambulance'?ambulancePhaseName(view.boss.phase,locale):view.boss.id==='gate-widow'?widowPhaseName(view.boss.phase,locale):view.boss.id==='chain-marshal'?marshalPhaseName(view.boss.phase,locale):view.boss.id==='tollkeeper'?tollkeeperPhaseName(view.boss.phase,locale):view.boss.id==='quarantine-clerk'?clerkPhaseName(view.boss.phase,locale):view.boss.id==='ratcatcher'?ratcatcherPhaseName(view.boss.phase,locale):view.boss.id==='courier'?courierPhaseName(view.boss.phase,locale):smallWakesPhaseName(view.boss.id,view.boss.phase,locale)??(view.boss.id==='lantern-warden'?wardenPhaseName(view.boss.phase,locale):
    ['ashen-usher','brass-toad','ragpicker-kite'].includes(view.boss.id)?t(`boss.${view.boss.id}.phase.${Math.min(2,bossPatternPhase(view.boss.id,view.boss.variant,view.boss.phase))}`):'');
  const hp = $<HTMLProgressElement>('health');
  hp.max = p.maxHealth;
  hp.value = p.health;
  $('health-text').textContent=number(Math.ceil(p.health))+' / '+number(p.maxHealth);
  const shield=$<HTMLProgressElement>('player-shield');
  shield.max=Math.max(1,p.maxShield);shield.value=Math.max(0,Math.min(p.maxShield,p.shield));
  shield.closest<HTMLElement>('.shield-meter')!.dataset.unavailable=String(p.maxShield===0);
  $('shield-text').textContent=number(p.shield)+' / '+number(p.maxShield);
  $('ammo-label').textContent=t(p.reloadAt>view.combatTick?'ui.reloading':'ui.ammo');
  $('ammo').textContent=number(p.ammo);
  $('coins-value').textContent=number(p.coins);
  $('skill-points-value').textContent=number(p.sp);
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-supply-slot]')) {
    const index = Number(button.dataset.supplySlot),
      slot = p.supplies[index];
    const item = data.supplies.find((s) => s.id === slot?.id);
    const remaining = Math.max(0, Math.ceil((p.supplyAt - view.combatTick) / 30));
    const name = item ? t('supply.' + item.id + '.name') : t('ui.supplies');
    button.disabled =
      !item ||
      !slot.count ||
      remaining > 0 ||
      p.status !== 'active' ||
      view.phase !== 'combat' || view.matchPaused === true ||
      (item?.effect==='revive' && !combatReviveAllowed(view.run.difficulty,p.classId)) ||
      (item?.effect==='shield' && !p.maxShield) ||
      (bossGuide.blocksInput(paused)||roomChatUI?.blocksInput===true||roomInviteUI?.open===true);
    button.setAttribute('aria-label', `${number(index + 1)} · ${name} ×${number(slot.count)}`);
    button.title = item
      ? name +
        '\n' +
        supplyText(item.id,view.run.difficulty,p.classId) +
        '\n' +
        t('ui.supplyHelp', {
          bindings: [1, 2, 3]
            .map((n) => bindingLabel(inputOptions.bindings[('supply' + n) as 'supply1'][0]))
            .join(' / '),
        })
      : t('ui.supplyHelp', {
          bindings: [1, 2, 3]
            .map((n) => bindingLabel(inputOptions.bindings[('supply' + n) as 'supply1'][0]))
            .join(' / '),
        });
    if (button.dataset.item !== slot.id) {
      button.dataset.item = slot.id;
      button.querySelector('[data-supply-glyph]')!.innerHTML =
        item && assets.items['supply/' + item.id]
          ? `<img class="supply-art" src="${assets.items['supply/' + item.id]}" alt="" aria-hidden="true">`
          : icon(item ? supplyGlyph(item.effect) : 'ability');
    }
    button.querySelector('b')!.textContent = bindingLabel(
      inputOptions.bindings[('supply' + (index + 1)) as 'supply1'][0],
    );
    button.querySelector('[data-supply-count]')!.textContent = item
      ? '×' + number(slot.count)
      : '—';
    button.querySelector('[data-supply-time]')!.textContent =
      item && remaining ? number(remaining) : '';
  }
  const boss = $<HTMLProgressElement>('boss-health');
  boss.max = view.boss.maxHealth;
  boss.value = view.boss.health;
  const phaseLabel=t('ui.phaseCount',{number:number(view.boss.phase+1),total:number(encounterPhases(view.boss.id,view.boss.variant).length)});
  boss.setAttribute('aria-label',t('boss.'+view.boss.id+'.name')+' · '+phaseLabel);
  const markers=$('boss-phase-markers'),markerKey=view.boss.id+':'+view.boss.variant;
  if(markers.dataset.phaseKey!==markerKey){markers.dataset.phaseKey=markerKey;markers.innerHTML=phaseMarkers(view.boss.id,view.boss.variant).map(percent=>`<i style="left:${percent}%"></i>`).join('');}
  const phaseNote = $('boss-phase-note');
  const phaseEntry = bossPhaseFeedback.sample(
    view.encounter,
    view.boss.id,
    view.boss.phase,
    view.boss.variant,
    view.tick,
    view.phase === 'combat',
  );
  $('boss-panel').dataset.variant = view.boss.variant;
  $('boss-panel').dataset.phase = String(view.boss.phase);
  $('boss-panel').classList.toggle('phase-entry', phaseEntry);
  const entry=$('boss-phase-entry');entry.hidden=!phaseEntry;
  const visualKey=[view.encounter,view.boss.id,view.boss.variant,view.boss.phase].join(':');
  if(phaseEntry && entry.dataset.entryKey!==visualKey){
    entry.dataset.entryKey=visualKey;
    for(const animation of entry.getAnimations())animation.cancel();
    if(!settings.reduceMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      entry.animate([{opacity:.4,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,easing:'ease-out'});
  }
  const entryText=t(view.boss.phase?'ui.phaseChanged':'ui.phaseCount',{number:number(view.boss.phase+1),total:number(encounterPhases(view.boss.id,view.boss.variant).length)});
  if(entry.textContent!==entryText)entry.textContent=entryText;
  const noteText =
    view.boss.id === 'constable'
      ? constablePhaseHint(bossPatternPhase(view.boss.id,view.boss.variant,view.boss.phase), view.boss.variant, locale)
      : view.boss.id==='bellringer'?bellPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='alchemist'?moldPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='matron'?matronPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='black-ambulance'?ambulancePhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='gate-widow'?widowPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='chain-marshal'?marshalPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='tollkeeper'?tollkeeperPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='quarantine-clerk'?clerkPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='ratcatcher'?ratcatcherPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='courier'?courierPhaseHint(view.boss.phase,view.boss.variant,locale):view.boss.id==='lantern-warden'?wardenPhaseHint(view.boss.phase,view.boss.variant,locale):smallWakesPhaseHint(view.boss.id,view.boss.phase,view.boss.variant,locale);
  const formHint=view.boss.variant==='crazed'?t('ui.crazedHelp'):'';
  const completeNote=[noteText,formHint].filter(Boolean).join(' ');
  phaseNote.hidden = !completeNote;
  if (phaseNote.textContent !== completeNote) phaseNote.textContent = completeNote;
  $('boss-panel').hidden = view.phase !== 'combat';
  $('deadline').textContent = clock((view.boss.deadline - view.combatTick) / 30);
  const help = $('signature-help'),
    helpText = [signatureHelp(view, locale),view.phase==='combat'&&view.bossCues.some(c=>c.kind==='variant-pressure')?t('ui.variantPressureHelp'):'',view.phase==='combat'&&view.run.difficulty==='hellish'?t('ui.lavaHelp'):''].filter(Boolean).join(' · ');
  help.hidden = !helpText;
  if (help.textContent !== helpText) help.textContent = helpText;
  const accord = $('accord');
  accord.hidden = !view.accord;
  if (view.accord)
    accord.textContent =
      t('ui.accordBreak') +
      ' · ' +
      t('ui.accordInstruction', { count: view.accord.required, seconds: view.accord.channelTicks / 30 }) +
      ' ' +
      clock((view.accord.until - view.combatTick) / 30);
  const cl = data.classes.find((c) => c.id === p.classId)!;
  const abilityList = $('abilities');
  for (const [key, label, at, name] of [
    ['dodge', t('ui.dodge'), p.dodgeAt, ''],
    ['q', t('ability.' + cl.abilities[0].id + '.name'), p.qAt, t('ability.' + cl.abilities[0].id + '.name')],
    [
      'e',
      t('ability.' + cl.abilities[1].id + '.name') + (p.kit.stepCharges > 0 ? ' ×' + number(p.kit.stepCharges) : ''),
      p.kit.stepCharges > 0 ? 0 : p.eAt,
      t('ability.' + cl.abilities[1].id + '.name'),
    ],
    ['ultimate', t('ability.' + cl.ultimate.id + '.name'), p.ultimateAt, t('ability.' + cl.ultimate.id + '.name')],
  ] as const) {
    let e = abilityList.querySelector<HTMLElement>('[data-ability="' + key + '"]');
    if (!e) {
      e = document.createElement('span');
      e.dataset.ability = key;
      abilityList.append(e);
    }
    e.className = at <= view.combatTick ? 'ability ready' : 'ability';
    e.title = name || label;
    const touch = document.querySelector<HTMLElement>('.touch-buttons [data-action="' + key + '"]');
    if (touch && touch.textContent !== label) touch.textContent = label;
    const value =
      bindingLabel(inputOptions.bindings[key][0]) +
      ' · ' +
      label +
      ' ' +
      (at > view.combatTick ? clock((at - view.combatTick) / 30) : '✓');
    if (e.textContent !== value) e.textContent = value;
  }
  $('squad').textContent =
    t('ui.players') +
    ' ' +
    view.players.filter((p) => p.status === 'active').length +
    '/' +
    view.players.length;
  if (p.status === 'downed')
    $('status').textContent =
      t('ui.bleedout', {
        seconds: Math.max(0, Math.ceil((p.downUntil - view.combatTick) / 30)),
      }) +
      ' · ' +
      (view.run.difficulty==='hellish'?t('ui.reviveNobody'):
        selfReviveAllowed(view.run.difficulty,p.classId,view.players.length)&&p.selfRevives>0
          ?t(inputOptions.interactMode==='toggle'?'ui.selfReviveToggleHelp':'ui.selfReviveHelp',{
            binding:bindingLabel(inputOptions.bindings.interact[0])+' / '+profileText(locale,'pad')+' '+inputOptions.gamepad.interact,
            count:number(p.selfRevives)})
          :t(['hard','insane'].includes(view.run.difficulty)?'ui.waitMedicRevive':'ui.waitTeammateRevive'));
  else if (p.status === 'waiting') $('status').textContent = t('ui.lateJoin');
  else if (p.status === 'eliminated') $('status').textContent = t('ui.eliminated');
  else if (session.status === 'ui.errorSave') $('status').textContent = t('ui.errorSave');
  else if (!['ui.reconnecting', 'ui.errorNetwork'].includes(session.status))
    $('status').textContent = '';
  audio.setEncounterIntensity(bossPatternPhase(view.boss.id,view.boss.variant,view.boss.phase), view.boss.variant);
  const musicPhase = defeated ? 'bossDefeated' : view.phase;
  if (musicPhase !== lastPhase) {
    lastPhase = musicPhase;
    void audio.loop(view.phase === 'combat' || defeated, view.boss.id);
  }
  const key = JSON.stringify([
    view.phase,
    defeated,
    lobbyPanel,
    view.phase==='lobby'?view.players.map(p=>[p.id,p.name,p.classId,p.connected]):null,
    view.secretStatus,
    settings.branchingTree,
    p.coins,
    p.sp,
    p.weapon,
    p.skills,
    p.upgrades,
    p.supplies,
    view.mutationCards,
    view.contractCards,
    view.owner,
    view.matchPaused,
    view.endedByHost,
    session.id,
    session.code,
    session.teamRecord,
  ]);
  if (uiKey !== key) {
    uiKey = key;
    renderOverlay(view, p);
  }
  const time = $('phase-time');
  if (time) time.textContent = clock((view.phaseEnds - view.tick) / 30);
  for (const e of document.querySelectorAll<HTMLElement>('[data-vote-count]')) {
    const i = Number(e.dataset.voteCount);
    e.textContent = number(
      Object.entries(view.votes).filter(
        ([id, v]) => v === i && view.players.some((p) => p.id === id && p.connected),
      ).length,
    );
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-vote]')) {
    const selected = view.votes[session.id] === Number(button.dataset.vote);
    button.classList.toggle('voted', selected);
    button.setAttribute('aria-pressed', String(selected));
    const marker = button.querySelector<HTMLElement>('[data-your-vote]');
    if (marker) marker.hidden = !selected;
  }
  if (import.meta.env.DEV) {
    const panel = $('dev-metrics');
    if (panel && !panel.hidden && performance.now() - lastMetricsPaint > 500) {
      lastMetricsPaint = performance.now();
      $('dev-metrics-data').textContent = JSON.stringify(
        {
          phase: view.phase,
          tick: view.tick,
          players: view.players.length,
          ...scene.diagnostics(),
        },
        null,
        2,
      );
    }
  }
}
function clock(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return number(Math.floor(value / 60)) + ':' + String(value % 60).padStart(2, '0');
}
function renderOverlay(view: View, p: PlayerView) {
  const overlay = $('modal');
  overlay.hidden = view.phase === 'combat' || showingBossDefeat(view.boss, view.tick);
  if (overlay.hidden) { syncRoomChatPlacement(); return; }
  let body = '',
    title = '', actions = '';
  if (view.phase === 'mutationVote') {
    title = t('ui.mutationVote');
    body = voteMarkup(view);
  } else if (view.phase === 'contractVote') {
    title = t('ui.bossVote');
    body = voteMarkup(view);
  } else if (view.phase === 'lobby' || view.phase === 'shop') {
    title = t(view.phase === 'shop' ? 'ui.shop' : session?.online && lobbyPanel === 'room' ? 'ui.lobbyTitle' : 'ui.prepareEquipment');
    const navigation = view.phase==='lobby'&&session?.online ? `<nav class="lobby-navigation"><button id="lobby-room" aria-pressed="${lobbyPanel==='room'}">${text('ui.lobbyTitle')}</button><button id="lobby-equipment" aria-pressed="${lobbyPanel==='equipment'}">${text('ui.prepareEquipment')}</button></nav>` : '';
    body = navigation + (view.phase==='lobby'&&session?.online&&lobbyPanel==='room'
      ? waitingRoomMarkup(view,session.id,session.code,t,number,assets.portraits,session.hasPassword,session.hostPassword) : shop(p));
    if (view.phase === 'lobby') actions = `<button id="start" class="primary" ${view.owner !== session!.id ? 'disabled' : ''}>${text('ui.start')}</button><button id="return-menu">${text('ui.leaveRoom')}</button>`;
  } else if (view.phase === 'secretOffer') {
    title = extensionText(locale, 'offerTitle');
    body = `<p>${esc(extensionText(locale, 'offerBody'))}</p><div class="actions"><button data-vote="1" class="primary">${esc(extensionText(locale, 'enter'))} <span data-vote-count="1">0</span></button><button data-vote="0">${esc(extensionText(locale, 'decline'))}</button></div>`;
  } else if (view.phase === 'loading') {
    title = t('ui.deploying');
    body = `<p>${text('ui.tutorialTeam')}</p>`;
  } else {
    title = expeditionText(locale, view.phase === 'victory' ? 'resultComplete' : 'resultEnded');
    body = (view.endedByHost ? `<p class="result-reason">${text('ui.matchEndedByHost')}</p>` : '') + runResultsMarkup(view, p, {
      language: locale, mode: t('mode.' + view.run.mode + '.name'), difficulty: t('difficulty.' + view.run.difficulty),
      className: t('class.' + p.classId + '.name'), number, clock,
    }) + `${view.campaignBank && ['cleared', 'failed'].includes(view.secretStatus) ? '<p>' + esc(extensionText(locale, view.secretStatus === 'cleared' ? 'cleared' : 'failed')) + '</p>' : ''}${session?.status === 'ui.errorSave' ? `<p role="alert">${text('ui.errorSave')}</p>` : ''}${view.run.testingModified ? '' : `<p>${text(session?.online ? 'ui.practiceNotice' : 'ui.offlineNotice')}</p>`}<button id="return-menu" class="primary">${text('ui.mainMenu')}</button>`;
  }
  const previous =
    document.activeElement instanceof HTMLElement && overlay.contains(document.activeElement)
      ? document.activeElement
      : null;
  if (['victory','defeat'].includes(view.phase)) body += teamResultMarkup(session?.teamRecord)
    + (session?.teamRecord?.status === 'saved' ? `<button id="view-team-record">${text('ui.teamRecords')}</button>` : '');
  if (view.run.mode === 'endless' && view.encounter > 0 && ['mutationVote','contractVote','shop','loading'].includes(view.phase))
    body += `<details class="end-run"><summary>${text('ui.endRun')}</summary><p>${text('ui.endRunHelp')}</p><button id="end-run" ${session?.online && view.owner !== session.id ? 'disabled' : ''}>${text('ui.endRun')}</button></details>`;
  const focusedId = previous?.id;
  const focusedItem = previous?.dataset.inspect;
  const oldScroll=overlay.querySelector('.skill-scroll');
  const contentScroll = overlay.querySelector('.phase-content')?.scrollTop ?? 0;
  const scroll = oldScroll?.scrollTop ?? 0, scrollLeft=oldScroll?.scrollLeft ?? 0;
  const samePhase = overlay.dataset.phase === view.phase;
  overlay.dataset.phase = view.phase;
  roomChatUI?.place();
  roomInviteUI?.place();
  overlay.innerHTML = `<div class="dialog-layout" role="dialog" aria-modal="true" aria-labelledby="phase-heading"><section class="dialog ${view.phase === 'lobby' || view.phase === 'shop' ? 'wide' : ''}"><div class="section-heading"><h2 id="phase-heading" tabindex="-1">${esc(title)}</h2>${phaseCountdownMarkup(view.phase, locale)}</div><div id="phase-room-invite-slot" class="menu-room-invite-slot"></div><div class="phase-content">${body}</div>${actions ? `<footer class="actions phase-actions">${actions}</footer>` : ''}</section><div id="phase-chat-slot" class="dialog-chat-slot"></div></div>`;
  syncRoomChatPlacement();
  const phaseContent = overlay.querySelector<HTMLElement>('.phase-content');
  if (phaseContent) phaseContent.inert = view.matchPaused === true;
  if (['lobby', 'shop'].includes(view.phase))
    bindShop(overlay, p, (request) => session?.purchase(request), supplyBindings(), settings.branchingTree,view.run.difficulty);
  overlay.querySelectorAll<HTMLButtonElement>('[data-vote]').forEach(
    (button) =>
      (button.onclick = () => {
        session?.vote(Number(button.dataset.vote));
        void audio.sound('ui-confirm');
      }),
  );
  if(view.phase==='lobby'&&session?.online){
    bindRoomCode(overlay,session.code,t);
    bindPasswordVisibility(overlay,t);
    for(const [id,panel] of [['lobby-room','room'],['lobby-equipment','equipment']] as const){
      const button=$(id);if(button)button.onclick=()=>{lobbyPanel=panel;uiKey='';if(session?.view)update(session.view);};
    }
  }
  const start = $('start');
  const endRun = $('end-run'); if (endRun) endRun.onclick = () => session?.endRun();
  const records = $('view-team-record'); if (records) records.onclick = () => void leave(true);
  if (start) start.onclick = () => session?.start();
  const back = $('return-menu');
  if (back) back.onclick = () => void leave();
  if (samePhase) {
    const content = overlay.querySelector('.phase-content'); if (content) content.scrollTop = contentScroll;
    const scroller = overlay.querySelector('.skill-scroll');
    if (scroller) {scroller.scrollTop = scroll;scroller.scrollLeft=scrollLeft;}
  }
  if (!view.matchPaused && !(bossGuide.blocksInput(paused)||roomChatUI?.blocksInput===true||roomInviteUI?.open===true)) {
    const target = focusedId
      ? overlay.querySelector<HTMLElement>('#' + CSS.escape(focusedId))
      : focusedItem
        ? overlay.querySelector<HTMLElement>('[data-inspect="' + CSS.escape(focusedItem) + '"]')
        : null;
    if (target && !(target instanceof HTMLButtonElement && target.disabled))
      target.focus({ preventScroll: true });
    else if (previous || !samePhase)
      overlay.querySelector<HTMLElement>('#phase-heading')!.focus({ preventScroll: true });
  }
}
const supplyBindings = () =>
  [1, 2, 3].map((n) => bindingLabel(inputOptions.bindings[('supply' + n) as 'supply1'][0]));
function shop(p: PlayerView) {
  return '<div class="loadout-editor">' + shopMarkup(p, supplyBindings(), settings.branchingTree,session?.view?.run.difficulty??'normal') + '</div>';
}
async function leave(showTeamRecord = false) {
  const active = session;
  const serial = ++launchSerial;
  const record = session?.teamRecord?.status === 'saved' ? session.teamRecord.record : null;
  const initialRecords = showTeamRecord && record && session
    ? { endpoint: session.endpoint, mode: record.mode, difficulty: record.difficulty, sizeBand: record.sizeBand, runId: record.runId } : undefined;
  controls?.clear();
  await active?.close().catch(() => {});
  if (serial !== launchSerial || session !== active) return;
  destroy();
  await menu(initialRecords);
  audio.stop();
}
function destroy() {
  launchSerial++; busy = false;
  vitalsSizeObserver?.disconnect();vitalsSizeObserver=undefined;
  app.style.removeProperty('--combat-chat-bottom');
  roomChatUI?.destroy();roomChatUI=undefined;
  roomInviteUI?.destroy();roomInviteUI=undefined;
  hostMatchUI?.destroy();hostMatchUI=undefined;
  if (timer) clearInterval(timer);
  timer = undefined;
  controls?.destroy();
  game?.destroy(true);
  game = undefined;
  scene = undefined;
  controls = undefined;
  session = undefined;
  ratingCache.clear();
}
window.addEventListener('keydown', (e) => {
  if ($('loading-expedition')) {
    if (e.code === 'Escape' && session) { e.preventDefault(); void leave(); }
    else if (e.code === 'Tab') { e.preventDefault(); $('cancel-loading').focus(); }
    return;
  }
  if (session && roomChatUI?.handleShortcut(e)) return;
  if (import.meta.env.DEV && e.code === 'F8' && scene) {
    e.preventDefault();
    const panel = $('dev-metrics');
    if (panel) {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) scene.frameMeter.reset();
    }
    return;
  }
  if(bossGuide.open&&e.code==='Tab'){
    const items=Array.from($('boss-guide').querySelectorAll<HTMLElement>('button,[tabindex="0"]'));
    const index=items.indexOf(document.activeElement as HTMLElement);
    if(e.shiftKey&&(index<=0)){e.preventDefault();items.at(-1)?.focus();}
    else if(!e.shiftKey&&(index<0||index===items.length-1)){e.preventDefault();items[0]?.focus();}
  }
  if(e.code==='Escape'&&session){e.preventDefault();if(roomInviteUI?.open)roomInviteUI.close();else if(bossGuide.open)setBossGuide(false);else togglePause();}
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && session && !session.online && !paused && !$('loading-expedition')) togglePause();
});
await setLanguage(initialLanguage());
await menu();
