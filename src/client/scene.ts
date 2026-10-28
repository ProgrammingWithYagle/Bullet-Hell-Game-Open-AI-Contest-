import {isMoldCue} from './mold-presentation.ts';
import {drawMoldCue} from './mold-cues.ts';
import {drawMatronCue} from './matron-cues.ts';
import {drawAmbulanceCue} from './ambulance-cues.ts';
import {drawWidowCue} from './widow-presentation.ts';
import clerkRules from '../shared/clerk-appeal-rules.json';
import {smallWakesPose,drawSmallWakes} from './small-wakes-presentation.ts';
import { earlyWatchPose, drawEarlyWatch } from './early-watch-presentation.ts';
import { EndlessPresentation } from './endless-presentation.ts';
import type { EndlessCue } from '../shared/endless-director.ts';
import { RaidPresentation } from './raid-presentation.ts';
import type { RaidCue } from '../shared/raid-director.ts';
import { DistrictPresentation } from './district-presentation.ts';
import type { DistrictCue } from '../shared/district-director.ts';
import { ServicePresentation } from './service-presentation.ts';
import type { ServiceCue } from '../shared/service-director.ts';
import Phaser from 'phaser';
import { assets } from './assets.ts';
import { arenaCoverPlan } from './arena-covers.ts';
import { bossVariantAppearance } from './boss-variant-appearance.ts';
import { BossVisualMotion } from './boss-visual-motion.ts';
import { SurvivorVisualMotion } from './survivor-visual-motion.ts';
import { bossDefeatFrame } from './boss-defeat-presentation.ts';
import { courierCombatFrame } from './courier-presentation.ts';
import {
  ARENA_BACKDROP_DEPTH,
  applyArenaGround,
  preloadArenaGrounds,
} from './arena-presentation.ts';
import {
  constableArt,
  constableCombatPose,
  type ConstableClipId,
} from './constable-presentation.ts';
import type { View, PlayerView } from '../shared/view.ts';
import type { Event, Shot } from '../shared/protocol.ts';
import { runtimeArena } from '../shared/arena-layouts.ts';
import { data } from '../shared/game.ts';
import { FrameMeter } from './frame-meter.ts';
import { wardenArt, wardenCombatPose, type WardenCombatClipId } from './warden-presentation.ts';
import {
  survivorArt,
  survivorPose,
  additionalSurvivors,
  legacySurvivors,
} from './survivor-presentation.ts';
import { survivorActionArt, SurvivorActionClock } from './survivor-action-presentation.ts';
import { heavyArt, heavyPose } from './heavy-presentation.ts';
import { encounterArt, encounterFrame } from './encounter-presentation.ts';
import type { Sector } from '../shared/warden-signature.ts';
import {
  BossTextureCache,
  bossTexturePresentation,
  preloadBossTextureBase,
  retireBossTexture,
} from './boss-textures.ts';
export class CombatScene extends Phaser.Scene {
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  readonly prepared = new Promise<void>((resolve, reject) => {
    this.resolveReady = resolve;
    this.rejectReady = reject;
  });
  view: View | null = null;
  localId = 'solo';
  predicted: PlayerView | null = null;
  hitboxes = true;
  showNames = true;
  nameTextScale = 1;
  private nameLabels = new Map<string,Phaser.GameObjects.Text>();
  highContrast = false;
  reduceMotion = false;
  private visualMotion = new SurvivorVisualMotion();
  private bossMotion = new BossVisualMotion();
  private people = new Map<string, Phaser.GameObjects.Sprite>();
  private bossTextures?: BossTextureCache;
  private bossTextureAlive = false;
  private cancelBossLoads = new Set<() => void>();
  private survivorActions = new SurvivorActionClock();
  private actors = new Map<number, Phaser.GameObjects.Sprite>();
  private shadows!: Phaser.GameObjects.Graphics;
  private hazards!: Phaser.GameObjects.Graphics;
  private bulletImages = new Map<number, Phaser.GameObjects.Image>();
  private bulletPool: Phaser.GameObjects.Image[] = [];
  private foreground!: Phaser.GameObjects.Graphics;
  private propImages = new Map<number, Phaser.GameObjects.Image>();
  private arenaImage!: Phaser.GameObjects.Image;
  private arenaGround!: Phaser.GameObjects.Graphics;
  private arenaBackdrop!: Phaser.GameObjects.Graphics;
  private lastArenaId = '';
  private serviceArt!: ServicePresentation;
  private endlessArt!: EndlessPresentation;
  private raidArt!: RaidPresentation;
  private districtArt!: DistrictPresentation;
  private coverImages: Phaser.GameObjects.Image[] = [];
  private constructImages = new Map<number, Phaser.GameObjects.Image>();
  private bossSprite!: Phaser.GameObjects.Sprite;
  private shots = new Map<number, Shot>();
  private lastPhase = '';
  private lastFrameClock = 0;
  readonly frameMeter = new FrameMeter();
  ready = false;
  diagnostics() {
    return {
      ...this.frameMeter.summary(),
      bossTextureLoading: this.bossTextures?.diagnostics(),
      renderedProjectiles: this.bulletImages.size,
      renderedHostiles: this.renderedHostiles,
      environment: {
        userAgent: navigator.userAgent,
        viewport: [innerWidth, innerHeight],
        pixelRatio: devicePixelRatio,
        renderer: this.game.renderer.type,
        internalCanvas: [this.game.canvas.width, this.game.canvas.height],
        displayedCanvas: [
          this.game.canvas.getBoundingClientRect().width,
          this.game.canvas.getBoundingClientRect().height,
        ],
      },
    };
  }
  private renderedHostiles = 0;
  constructor() {
    super('combat');
  }
  preload() {
    this.load.on('loaderror', () => this.rejectReady(Error('ui.errorServer')));
    preloadArenaGrounds(this.load, assets.arenaGrounds);
    for (const [id, url] of Object.entries(assets.constructs))
      this.load.image('construct-' + id, url);
    for (const [id, url] of Object.entries(assets.environment))
      this.load.image('environment-' + id, url);
    this.load.image('tollkeeper-wheel', assets.wheel);
    for (const [id, url] of Object.entries(assets.endlessProps))
      this.load.image('endless-prop-' + id, url);
    for (const [id, url] of Object.entries(assets.raidProps))
      this.load.image('raid-prop-' + id, url);
    for (const [id, url] of Object.entries(assets.pilgrimageProps))
      this.load.image('pilgrimage-prop-' + id, url);
    for (const [id, url] of Object.entries(assets.midnightProps))
      this.load.image('midnight-prop-' + id, url);
    for (const [name, url] of Object.entries(assets.constable)) {
      const clip = constableArt.clips[name as ConstableClipId];
      this.load.spritesheet('constable-' + name, url, {
        frameWidth: clip.cellSize,
        frameHeight: clip.cellSize,
      });
    }
    for (const [direction, url] of Object.entries(assets.heavy)) {
      const size =
        direction === 'reference'
          ? heavyArt.reference.cellSize
          : heavyArt.entries.find((entry) => entry.id === 'heavy-run-' + direction.toLowerCase())!
              .cellSize;
      this.load.spritesheet(
        direction === 'reference' ? 'heavy-reference' : 'heavy-run-' + direction,
        url,
        { frameWidth: size, frameHeight: size },
      );
    }
    for (const ref of survivorArt.references)
      this.load.spritesheet(ref.id + '-reference', assets.survivorReferences[ref.id], {
        frameWidth: ref.cellSize,
        frameHeight: ref.cellSize,
      });
    for (const clip of survivorArt.entries)
      this.load.spritesheet(clip.id, assets.survivorRuns[clip.id], {
        frameWidth: clip.cellSize,
        frameHeight: clip.cellSize,
      });
    for (const clip of survivorActionArt.entries)
      this.load.spritesheet(clip.id, assets.survivorActions[clip.id], {
        frameWidth: clip.cellSize,
        frameHeight: clip.cellSize,
      });
    preloadBossTextureBase(
      this.load,
      encounterArt,
      Object.fromEntries(
        Object.entries(assets.encounters).map(([id, url]) => [id + '-action', url]),
      ),
      assets.bossIdentities,
      assets.bossSettledIdentities,
    );
    for (const [clip, url] of Object.entries(assets.warden)) {
      const size = wardenArt.clips[clip as WardenCombatClipId].cellSize;
      this.load.spritesheet('warden-' + clip, url, {
        frameWidth: size,
        frameHeight: size,
      });
    }
  }
  create() {
    this.serviceArt = new ServicePresentation(this);
    this.raidArt = new RaidPresentation(this);
    this.endlessArt = new EndlessPresentation(this);
    this.districtArt = new DistrictPresentation(this, (id) => this.people.get(id));
    this.arenaImage = this.add.image(800, 500, 'arena-ground-gatehouse');
    applyArenaGround(this.arenaImage, 'gatehouse');
    this.arenaBackdrop = this.add.graphics().setDepth(ARENA_BACKDROP_DEPTH);
    this.arenaGround = this.add.graphics().setDepth(0);
    this.add.rectangle(800, 500, 1600, 1000, 0x172b29, 0.18);
    this.shadows = this.add.graphics().setDepth(1);
    this.hazards = this.add.graphics().setDepth(2);
    for (const [key, color] of [
      ['hostile', 0xf08370],
      ['contrast', 0xffc23e],
      ['friendly', 0xa7dcd0],
    ] as const) {
      const paint = this.make.graphics({ x: 0, y: 0 });
      paint.fillStyle(key === 'friendly' ? 0x24453f : 0x44242c).fillCircle(16, 16, 15);
      paint.fillStyle(color).fillCircle(16, 16, 10);
      if (key !== 'friendly') paint.fillStyle(0xffe9b0).fillCircle(16, 16, 3.5);
      paint.generateTexture('projectile-' + key, 32, 32);
      paint.destroy();
    }
    this.foreground = this.add.graphics().setDepth(30);
    this.bossSprite = this.add
      .sprite(800, 315, 'constable-idle', 0)
      .setOrigin(constableArt.clips.idle.origin[0], constableArt.clips.idle.origin[1])
      .setDisplaySize(constableArt.clips.idle.displayCell, constableArt.clips.idle.displayCell)
      .setDepth(5);
    this.bossTextureAlive = true;
    this.bossTextures = new BossTextureCache(
      {
        load: (id) => this.loadBossAtlas(id),
        evict: (id) =>
          retireBossTexture(id, this.bossTextureAlive ? this.bossSprite : undefined, this.textures),
      },
      () => performance.now(),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bossTextureAlive = false;
      this.bossTextures?.dispose();
      for (const cancel of [...this.cancelBossLoads]) cancel();
    });
    if (this.view) this.bossTextures.request(this.view.boss.id);
    this.ready = true;
    this.resolveReady();
  }
  apply(view: View) {
    this.survivorActions.observe(view, performance.now());
    this.visualMotion.observe(view);
    if (this.lastPhase && view.phase !== this.lastPhase) {
      for (const id of this.shots.keys()) this.recycleBullet(id);
      this.shots.clear();
    }
    this.lastPhase = view.phase;
    this.view = view;
    if (this.ready) this.bossTextures?.request(view.boss.id);
  }
  private loadBossAtlas(id: string): Promise<void> {
    const key = id + '-action';
    if (this.textures.exists(key)) return Promise.resolve();
    const clip = encounterArt.find((entry) => entry.bossId === id);
    const url = assets.encounters[id];
    if (!clip || !url) return Promise.reject(new Error('Missing boss atlas: ' + id));
    return new Promise((resolve, reject) => {
      const event = 'filecomplete-spritesheet-' + key;
      const cleanup = () => {
        this.load.off(event, complete);
        this.load.off('loaderror', failed);
        this.cancelBossLoads.delete(cancel);
      };
      const complete = () => {
        cleanup();
        resolve();
      };
      const failed = (file: Phaser.Loader.File) => {
        if (file.key !== key) return;
        cleanup();
        reject(new Error('Boss atlas load failed: ' + id));
      };
      const cancel = () => {
        cleanup();
        reject(new Error('Scene shut down'));
      };
      this.cancelBossLoads.add(cancel);
      this.load.once(event, complete);
      this.load.on('loaderror', failed);
      this.load.spritesheet(key, url, { frameWidth: clip.cellSize, frameHeight: clip.cellSize });
      if (!this.load.isLoading()) this.load.start();
    });
  }
  ingest(events: Event[]) {
    for (const event of events) {
      if (event.type === 'shots')
        for (const shot of event.shots) this.shots.set(shot.id, { ...shot });
      if (event.type === 'remove') {
        const ids = event.ids.length ? event.ids : [...this.shots.keys()];
        for (const id of ids) {
          this.shots.delete(id);
          this.recycleBullet(id);
        }
      }
    }
  }
  private paintSector(
    graphics: Phaser.GameObjects.Graphics,
    sector: Sector,
    color: number,
    alpha: number,
    width: number,
  ) {
    const points = [new Phaser.Math.Vector2(sector.x, sector.y)];
    for (let index = 0; index <= 40; index++) {
      const angle = sector.aim - sector.arc / 2 + (sector.arc * index) / 40;
      points.push(
        new Phaser.Math.Vector2(
          sector.x + Math.cos(angle) * sector.radius,
          sector.y + Math.sin(angle) * sector.radius,
        ),
      );
    }
    graphics.fillStyle(color, alpha).fillPoints(points, true);
    graphics.lineStyle(width, color, 1).strokePoints(points, true);
  }
  private recycleBullet(id: number) {
    const image = this.bulletImages.get(id);
    if (image) {
      image.setVisible(false);
      this.bulletPool.push(image);
      this.bulletImages.delete(id);
    }
  }
  update(_time: number, delta: number) {
    if (!this.ready || !this.view) return;
    const frameNow = performance.now(),
      wallDelta = this.lastFrameClock ? frameNow - this.lastFrameClock : delta;
    this.lastFrameClock = frameNow;
    const view = this.view,
      dt = Math.min(delta, 100) / 1000,
      now = view.combatTick,
      animationTime = this.survivorActions.timeAt(frameNow);
    if (this.lastArenaId !== view.arenaId+':'+view.run.difficulty) {
      this.lastArenaId = view.arenaId+':'+view.run.difficulty;
      const map = runtimeArena(view.arenaId,view.run.difficulty);
      const shade=Number.parseInt(map.shadow.slice(1),16);
      applyArenaGround(this.arenaImage, map.id,view.run.difficulty);
      this.arenaBackdrop.clear();
      const ground = this.arenaGround;
      ground.clear();
      this.coverImages.forEach((image) => image.destroy());
      this.coverImages = [];
      if (map.bounds.width < 1600 || map.bounds.height < 1000) {
        const color = Number.parseInt(map.floor.slice(1), 16);
        this.arenaBackdrop
          .fillStyle(0x101e1b, 1)
          .fillRect(0, 0, 1600, 1000)
          .fillStyle(color, 1)
          .fillRect(map.bounds.x, map.bounds.y, map.width, map.height);
        ground
          .lineStyle(5, shade, 0.8)
          .strokeRect(map.bounds.x + 3, map.bounds.y + 3, map.width - 6, map.height - 6);
      }
      for (const obstacle of arenaCoverPlan(map.id,view.run.difficulty)) {
        const image = this.add.image(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2,
          obstacle.texture,
        );
        const fit = Math.min(obstacle.width / image.width, obstacle.height / image.height);
        image.setScale(fit).setDepth(1);
        this.coverImages.push(image);
        ground
          .fillStyle(shade, 0.9)
          .fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ground
          .lineStyle(4, 0xc4c5a5, 0.8)
          .strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        ground
          .lineStyle(2, 0xc4c5a5, 0.45)
          .lineBetween(
            obstacle.x + 8,
            obstacle.y + 10,
            obstacle.x + obstacle.width - 8,
            obstacle.y + 10,
          );
      }
    }
    this.shadows.clear();
    this.hazards.clear();
    this.foreground.clear();
    const h = this.hazards,
      f = this.foreground;
    for (const field of view.fields) {
      const hostile = field.kind === 'zone',
        color = hostile ? 0xe2734f : field.kind === 'heal' ? 0x81ddc4 : 0xe3c776;
      h.fillStyle(color, hostile ? 0.22 : 0.1).fillCircle(field.x, field.y, field.radius);
      h.lineStyle(hostile ? 4 : 2, color, 0.9).strokeCircle(field.x, field.y, field.radius);
      if (hostile) {
        h.lineStyle(2, color, 0.7).lineBetween(
          field.x - field.radius * 0.55,
          field.y - field.radius * 0.55,
          field.x + field.radius * 0.55,
          field.y + field.radius * 0.55,
        );
        h.lineBetween(
          field.x + field.radius * 0.55,
          field.y - field.radius * 0.55,
          field.x - field.radius * 0.55,
          field.y + field.radius * 0.55,
        );
      }
    }
    for (const sample of view.signatures) {
      if (sample.phase === 'rest') continue;
      const turn=sample.direction??1,angle=sample.cone.aim+turn*.55,radius=sample.cone.radius*.7;
      const ax=sample.cone.x+Math.cos(angle)*radius,ay=sample.cone.y+Math.sin(angle)*radius;
      const tx=-Math.sin(angle)*turn,ty=Math.cos(angle)*turn;
      h.lineStyle(3,0xf4d6a0,.95).lineBetween(ax-tx*15,ay-ty*15,ax+tx*15,ay+ty*15)
       .lineBetween(ax+tx*15,ay+ty*15,ax+tx*3-ty*8,ay+ty*3+tx*8)
       .lineBetween(ax+tx*15,ay+ty*15,ax+tx*3+ty*8,ay+ty*3-tx*8);
      this.paintSector(
        h,
        sample.cone,
        this.highContrast ? 0xffc23e : 0xe9a361,
        sample.phase === 'active' ? 0.24 : 0.07,
        sample.phase === 'active' ? 5 : 2,
      );
    }
    const active = view.signatures.filter((sample) => sample.phase === 'active');
    const trailing = active.at(-1) ?? view.signatures.find((sample) => sample.phase === 'warning');
    if (trailing) this.paintSector(h, trailing.trailingSafe, 0xa5e2ce, 0.04, 3);
    for (const w of view.warnings) {
      const progress = 1 - Math.min(1, Math.max(0, (w.at - now) / 30)),
        color = this.highContrast ? 0xffb23d : 0xe9a361;
      if (w.kind === 'zone') {
        h.lineStyle(3, color, 1).strokeCircle(w.x, w.y, w.radius);
        h.lineStyle(4, color, 0.6)
          .beginPath()
          .arc(w.x, w.y, w.radius * 0.8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
          .strokePath();
        h.fillStyle(color, 0.1).fillCircle(w.x, w.y, w.radius);
      } else if (w.kind === 'ring') {
        h.lineStyle(3, color, 1)
          .beginPath()
          .arc(w.x, w.y, 125, w.aim + w.arc / 2, w.aim + Math.PI * 2 - w.arc / 2)
          .strokePath();
        for (const angle of [w.aim - w.arc / 2, w.aim + w.arc / 2])
          h.lineStyle(2, 0xf3e5b3, 0.8).lineBetween(
            w.x + Math.cos(angle) * 100,
            w.y + Math.sin(angle) * 100,
            w.x + Math.cos(angle) * 150,
            w.y + Math.sin(angle) * 150,
          );
      } else {
        const r = 210,
          points = [new Phaser.Math.Vector2(w.x, w.y)];
        for (let i = 0; i <= 16; i++) {
          const a = w.aim - w.arc / 2 + (w.arc * i) / 16;
          points.push(new Phaser.Math.Vector2(w.x + Math.cos(a) * r, w.y + Math.sin(a) * r));
        }
        h.fillStyle(color, 0.14).fillPoints(points, true);
        h.lineStyle(2, color, 0.7).strokePoints(points, true);
      }
    }
    const drawnDomains=new Set<string>();
    const drawnAmbulanceBursts = new Set<string>();
    const drawnMatronNeedles=new Set<number>();

    for (const cue of view.bossCues) {
      if(isMoldCue(cue)){drawMoldCue(h,f,cue,now,view.bossCues.filter(isMoldCue));continue;}
      if(cue.kind==='matron-walk'||cue.kind==='matron-brood'||cue.kind==='matron-pulse'||cue.kind==='matron-needles'){
        if(cue.kind==='matron-needles'){if(drawnMatronNeedles.has(cue.sourceId))continue;drawnMatronNeedles.add(cue.sourceId);}
        drawMatronCue(h,f,cue,now,view.bossCues.filter((q):q is import('../shared/matron-ward.ts').MatronCue=>q.kind==='matron-walk'||q.kind==='matron-brood'||q.kind==='matron-pulse'||q.kind==='matron-needles'||(q.kind==='service-prop'&&q.role==='nest')));continue;
      }
      if(cue.kind==='ambulance-patrol'||cue.kind==='ambulance-lane'||cue.kind==='ambulance-stop'||cue.kind==='ambulance-burst'){
        if(cue.kind==='ambulance-burst'){const key=cue.x+':'+cue.y;if(drawnAmbulanceBursts.has(key))continue;drawnAmbulanceBursts.add(key);}
        drawAmbulanceCue(h,f,cue,now,view.bossCues.filter((q):q is import('../shared/ambulance-route.ts').AmbulanceCue=>q.kind==='ambulance-patrol'||q.kind==='ambulance-lane'||q.kind==='ambulance-stop'||q.kind==='ambulance-burst'||q.kind==='driver'));continue;
      }
      if(cue.kind==='arena-lava') {
        const active=now>=cue.at;
        h.fillStyle(active?0x532818:0x3b3028,.92).fillCircle(cue.x,cue.y,cue.radius);
        h.lineStyle(5,active?0xffc36a:0xe2cf92,1).strokeCircle(cue.x,cue.y,cue.radius);
        h.lineStyle(2,0xf6ad55,.8);
        for(let row=-.65;row<=.65;row+=.32){
          const half=Math.sqrt(1-row*row)*cue.radius*.8;
          h.lineBetween(cue.x-half,cue.y+row*cue.radius,cue.x+half,cue.y+row*cue.radius);
        }
        f.fillStyle(0xffddb0,1).fillTriangle(cue.x,cue.y-17,cue.x-11,cue.y+5,cue.x+11,cue.y+5);
        f.fillStyle(0x43241c,1).fillRect(cue.x-1.5,cue.y-10,3,8);
        continue;
      }
      if(cue.kind==='variant-pressure') {
        const active=now>=cue.at,color=cue.crazed?0xd7a1ff:0xffbf8a;
        h.lineStyle(active?cue.width:2,color,active?.32:.9);
        h.lineBetween(cue.x1,cue.y1,cue.x2,cue.y2);
        h.lineStyle(3,color,1).strokeCircle(cue.x1,cue.y1,cue.width/2);
        if(cue.style==='pursuit') {
          const fraction=Math.max(0,Math.min(1,(now-cue.beganAt)/(cue.at-cue.beganAt)));
          h.fillStyle(color,active?.4:.12).fillCircle(cue.x1,cue.y1,cue.width/2);
          h.lineStyle(3,color,1).strokeCircle(cue.x1,cue.y1,(cue.width/2)*fraction);
        } else {
          const dx=cue.x2-cue.x1,dy=cue.y2-cue.y1,len=Math.hypot(dx,dy)||1,nx=-dy/len*cue.width/2,ny=dx/len*cue.width/2;
          h.lineStyle(2,color,1).lineBetween(cue.x1+nx,cue.y1+ny,cue.x2+nx,cue.y2+ny).lineBetween(cue.x1-nx,cue.y1-ny,cue.x2-nx,cue.y2-ny);
        }
        continue;
      }
      if(cue.kind==='brutal-echo') {
        const progress=Math.max(0,Math.min(1,(now-cue.beganAt)/(cue.at-cue.beganAt)));
        h.lineStyle(2,cue.crazed?0xd8a4ff:0xf5bc72,.5);
        for(const angle of cue.angles)h.lineBetween(cue.x+Math.cos(angle)*18,cue.y+Math.sin(angle)*18,cue.x+Math.cos(angle)*130,cue.y+Math.sin(angle)*130);
        h.lineStyle(3,cue.crazed?0xe6caff:0xffd7a0,.95).strokeCircle(cue.x,cue.y,12+progress*10);
        continue;
      }
      if (cue.kind === 'tollkeeper-patrol') {
        h.lineStyle(2, 0xdbbf8e, .85).lineBetween(cue.x1, cue.y1, cue.x2, cue.y2);
        h.lineStyle(3, 0xdbbf8e, 1).strokeRect(cue.x2 - 16, cue.y2 - 12, 32, 24);
        h.lineBetween(cue.x2 - 23, cue.y2 + 17, cue.x2 + 23, cue.y2 + 17);
        continue;
      }
      if (cue.kind === 'tollkeeper-bank') {
        const progress = Math.max(0, Math.min(1, (now - cue.beganAt) / Math.max(1, cue.at - cue.beganAt))), ring: Phaser.Math.Vector2[] = [];
        for (let n = 0; n <= 32; n++) {
          const angle = -Math.PI / 2 + Math.PI * 2 * progress * n / 32;
          ring.push(new Phaser.Math.Vector2(cue.x + Math.cos(angle) * 51, cue.y + Math.sin(angle) * 51));
        }
        h.lineStyle(4, 0xf2ca7e, .95).strokePoints(ring, false);
        for (let n = 1; n <= cue.legs; n++)
          h.lineStyle(2, 0xf2ca7e, n <= cue.leg ? 1 : .35).strokeCircle(cue.x + (n - (cue.legs + 1) / 2) * 15, cue.y - 68, 5);
        for (const angle of cue.angles)
          h.lineStyle(2, 0xf2ca7e, .7).lineBetween(cue.x + Math.cos(angle) * 48, cue.y + Math.sin(angle) * 48, cue.x + Math.cos(angle) * 225, cue.y + Math.sin(angle) * 225);
        continue;
      }
      if(drawWidowCue(h,f,cue,now))continue;
      if (cue.kind === 'marshal-patrol') {
        h.lineStyle(2,0xe6b875,.85).lineBetween(cue.x1,cue.y1,cue.x2,cue.y2);
        h.lineStyle(3,0xe6b875,1).strokeRect(cue.x2-18,cue.y2-15,36,30);
        continue;
      }
      if (cue.kind === 'marshal-barbs') {
        if(now<cue.beganAt)continue;
        const color=cue.crossing?0xc9a0e5:0xe6b875;
        for(const angle of cue.angles)h.lineStyle(2,color,.75).lineBetween(cue.x+Math.cos(angle)*31,cue.y+Math.sin(angle)*31,cue.x+Math.cos(angle)*200,cue.y+Math.sin(angle)*200);
        if(cue.crossing)h.lineStyle(3,color,1).lineBetween(cue.x-10,cue.y-58,cue.x+10,cue.y-44).lineBetween(cue.x-10,cue.y-44,cue.x+10,cue.y-58);
        continue;
      }
      if (cue.kind === 'clerk-volley') {
        if (now < cue.beganAt) continue;
        const progress = Math.max(0, Math.min(1, (now - cue.beganAt) / Math.max(1, cue.at - cue.beganAt))),
          length = Math.min(620, Math.hypot(cue.targetX - cue.x, cue.targetY - cue.y) + 110),
          aim = Math.atan2(cue.targetY - cue.y, cue.targetX - cue.x);
        h.lineStyle(1, 0xf1bf85, .5);
        for (const angle of cue.angles)
          h.lineBetween(cue.x + Math.cos(angle) * 26, cue.y + Math.sin(angle) * 26,
            cue.x + Math.cos(angle) * length, cue.y + Math.sin(angle) * length);
        h.lineStyle(3, 0xf1bf85, .95).strokeCircle(cue.x, cue.y, 19);
        if (now < cue.at) {
          const arc: Phaser.Math.Vector2[] = [];
          for (let n = 0; n <= 24; n++) {
            const a = -Math.PI / 2 + Math.PI * 2 * progress * n / 24;
            arc.push(new Phaser.Math.Vector2(cue.x + Math.cos(a) * 27, cue.y + Math.sin(a) * 27));
          }
          h.lineStyle(4, 0xf1bf85, .9).strokePoints(arc, false);
        }
        const tipX = cue.x + Math.cos(aim) * 47, tipY = cue.y + Math.sin(aim) * 47;
        h.lineStyle(3, 0xf1bf85, 1)
          .lineBetween(tipX - Math.cos(aim) * 13 - Math.sin(aim) * 8, tipY - Math.sin(aim) * 13 + Math.cos(aim) * 8, tipX, tipY)
          .lineBetween(tipX, tipY, tipX - Math.cos(aim) * 13 + Math.sin(aim) * 8, tipY - Math.sin(aim) * 13 - Math.cos(aim) * 8);
        continue;
      }
      if (cue.kind === 'clerk-block') {
        // A static broken-bullet mark comes from an actual authority interception.
        // No flashing, screen shake or decorative particle shower is needed.
        const nx = Math.cos(cue.angle), ny = Math.sin(cue.angle), tx = -ny, ty = nx;
        h.lineStyle(3, 0xc0ffe0, .95)
          .lineBetween(cue.x + tx * 11, cue.y + ty * 11, cue.x + nx * 7, cue.y + ny * 7)
          .lineBetween(cue.x + nx * 7, cue.y + ny * 7, cue.x - tx * 11, cue.y - ty * 11)
          .lineBetween(cue.x + nx * 13 + tx * 6, cue.y + ny * 13 + ty * 6, cue.x + nx * 21 + tx * 11, cue.y + ny * 21 + ty * 11)
          .lineBetween(cue.x + nx * 13 - tx * 6, cue.y + ny * 13 - ty * 6, cue.x + nx * 21 - tx * 11, cue.y + ny * 21 - ty * 11);
        continue;
      }
      if(cue.kind==='clerk-domain'){
        if(now<cue.beganAt)continue;
        const key=cue.x+':'+cue.y+':'+cue.radius;
        if(drawnDomains.has(key))continue;drawnDomains.add(key);
        const active=now>=cue.at,color=0xffb63d;
        h.fillStyle(0x7d4716,active?.32:.06).fillCircle(cue.x,cue.y,cue.radius);
        h.lineStyle(active?4:2,color,1).strokeCircle(cue.x,cue.y,cue.radius);
        const diamond=[[0,-cue.radius-5],[cue.radius+5,0],[0,cue.radius+5],[-cue.radius-5,0]].map(([x,y])=>new Phaser.Math.Vector2(cue.x+x,cue.y+y));
        h.lineStyle(2,color,.9).strokePoints(diamond,true);
        h.lineStyle(3,color,1).strokeCircle(cue.x-7,cue.y,8).strokeCircle(cue.x+7,cue.y,8);
        continue;
      }
      if(cue.kind==='clerk-patrol'){
        h.lineStyle(2,0xc6b8a0,.85).lineBetween(cue.x1,cue.y1,cue.x2,cue.y2);
        h.lineStyle(3,0xc6b8a0,1).strokeRect(cue.x2-12,cue.y2-12,24,24);
        continue;
      }
      if(cue.kind==='ratcatcher-patrol'){
        h.lineStyle(2,0xb8cba7,.8).lineBetween(cue.x1,cue.y1,cue.x2,cue.y2);
        h.lineStyle(3,0xb8cba7,1).strokeCircle(cue.x2,cue.y2,14);
        h.lineBetween(cue.x2-6,cue.y2,cue.x2+6,cue.y2).lineBetween(cue.x2,cue.y2-6,cue.x2,cue.y2+6);
        continue;
      }
      if(cue.kind==='ratcatcher-whistle'){
        if(now>=cue.at)continue;
        const progress=this.reduceMotion?1:Math.max(0,Math.min(1,(now-cue.beganAt)/Math.max(1,cue.at-cue.beganAt)));
        const start=cue.aim+cue.gap/2,arc=Math.PI*2-cue.gap,points=[];
        for(let n=0;n<=48;n++){const a=start+arc*n/48;points.push(new Phaser.Math.Vector2(cue.x+Math.cos(a)*170,cue.y+Math.sin(a)*170));}
        h.lineStyle(3,0xe6c88b,.8).strokePoints(points,false);
        for(const angle of cue.angles)h.lineStyle(1,0xe6c88b,.55).lineBetween(cue.x+Math.cos(angle)*35,cue.y+Math.sin(angle)*35,cue.x+Math.cos(angle)*190,cue.y+Math.sin(angle)*190);
        for(const side of [-1,1]){const a=cue.aim+side*cue.gap/2;h.lineStyle(3,0xadd4b4,1).lineBetween(cue.x+Math.cos(a)*55,cue.y+Math.sin(a)*55,cue.x+Math.cos(a)*215,cue.y+Math.sin(a)*215);}
        for(let mark=0;mark<cue.passes;mark++)h.lineStyle(3,0xe6c88b,mark<cue.pass?1:.3).lineBetween(cue.x+(mark-(cue.passes-1)/2)*12,cue.y-85,cue.x+(mark-(cue.passes-1)/2)*12,cue.y-73);
        h.lineStyle(3,0xe6c88b,.9).strokeCircle(cue.x,cue.y,18+progress*10);
        continue;
      }
      if(cue.kind==='courier-route'){
        const color=cue.state==='recovery'?0x9ac5ad:0xf7c176;
        for(let leg=0;leg<cue.legs;leg++){
          const x=cue.x+(leg-(cue.legs-1)/2)*14,y=cue.y-72;
          h.lineStyle(2,color,leg<cue.leg?1:.35).strokeRect(x-4,y-5,8,10);
          if(leg<cue.leg)h.fillStyle(color,.8).fillRect(x-2,y-3,4,6);
        }
        if(cue.state==='recovery')h.lineStyle(2,color,.8).strokeCircle(cue.x,cue.y,22);
        continue;
      }
      if(cue.kind==='courier-dispatch'){
        const progress=Math.max(0,Math.min(1,(now-cue.beganAt)/Math.max(1,cue.at-cue.beganAt)));
        for(const side of [-1,1]){
          const a=cue.aim+side*cue.halfGap,b=a+side*cue.wingArc;
          const points=[new Phaser.Math.Vector2(cue.x,cue.y)];
          for(let n=0;n<=16;n++){const angle=a+(b-a)*n/16;points.push(new Phaser.Math.Vector2(cue.x+Math.cos(angle)*210,cue.y+Math.sin(angle)*210));}
          h.fillStyle(0xf7c176,.07+progress*.07).fillPoints(points,true);
          h.lineStyle(2,0xf7c176,.85).strokePoints(points,true);
        }
        for(const angle of cue.angles)h.lineStyle(1,0xf7c176,.45).lineBetween(cue.x+Math.cos(angle)*24,cue.y+Math.sin(angle)*24,cue.x+Math.cos(angle)*210,cue.y+Math.sin(angle)*210);
        for(const side of [-1,1]){const a=cue.aim+side*cue.halfGap;h.lineStyle(3,0xadd4c5,.95).lineBetween(cue.x+Math.cos(a)*55,cue.y+Math.sin(a)*55,cue.x+Math.cos(a)*230,cue.y+Math.sin(a)*230);}
        h.lineStyle(3,0xf7c176,.9).strokeCircle(cue.x,cue.y,18+progress*10);
        continue;
      }
      if (cue.kind === 'charge' || cue.kind === 'scent' || cue.kind === 'trail') {
        const dx = cue.x2 - cue.x1,
          dy = cue.y2 - cue.y1,
          length = Math.hypot(dx, dy) || 1;
        const nx = ((-dy / length) * cue.width) / 2,
          ny = ((dx / length) * cue.width) / 2;
        const interrupted = 'interrupted' in cue && cue.interrupted;
        const color = interrupted
          ? 0x9ac7ad
          : cue.kind === 'trail'
            ? 0xdf7957
            : cue.kind === 'scent'
              ? 0xc7ab72
              : 0xf7c176;
        const points = [
          new Phaser.Math.Vector2(cue.x1 + nx, cue.y1 + ny),
          new Phaser.Math.Vector2(cue.x2 + nx, cue.y2 + ny),
          new Phaser.Math.Vector2(cue.x2 - nx, cue.y2 - ny),
          new Phaser.Math.Vector2(cue.x1 - nx, cue.y1 - ny),
        ];
        h.fillStyle(color, cue.kind === 'trail' ? 0.23 : 0.12).fillPoints(points, true);
        h.lineStyle(interrupted ? 1 : 3, color, 0.95).strokePoints(points, true);
        if (cue.kind !== 'trail')
          h.lineStyle(2, color, 1).lineBetween(
            cue.x2 - nx * 0.7,
            cue.y2 - ny * 0.7,
            cue.x2 + nx * 0.7,
            cue.y2 + ny * 0.7,
          );
        if(view.boss.id==='courier' && cue.kind==='charge' && length>30){
          const ux=dx/length,uy=dy/length,tipX=cue.x1+dx*.6,tipY=cue.y1+dy*.6;
          h.lineStyle(3,color,1)
            .lineBetween(tipX-ux*16-uy*9,tipY-uy*16+ux*9,tipX,tipY)
            .lineBetween(tipX,tipY,tipX-ux*16+uy*9,tipY-uy*16-ux*9);
        }
      } else if (cue.kind === 'stamp') {
        const safe = cue.safeAt > 0 && now >= cue.safeAt,
          active = now >= cue.at;
        const severity = cue.severity ?? 'red',
          color = safe ? 0x9be6c9 : severity === 'black' ? 0xe6d4ed : severity === 'purple' ? (active ? 0xbf63df : 0xd3a9e7) : active ? 0xe77e61 : 0xe7c583;
        h.fillStyle(!safe && severity === 'black' ? 0x14101d : color, safe ? 0.13 : active ? (severity === 'black' ? .8 : .23) : .07).fillCircle(cue.x, cue.y, cue.radius);
        h.lineStyle(safe ? 5 : 3, color, 1).strokeCircle(cue.x, cue.y, cue.radius);
        // Roman order and severity silhouettes remain readable without color alone.
        const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][cue.index - 1] ?? 'X';
        for (let n = 0; n < roman.length; n++) {
          const x = cue.x + (n - (roman.length - 1) / 2) * 13;
          h.lineStyle(3, color, 1);
          if (roman[n] === 'I') h.lineBetween(x, cue.y - 13, x, cue.y + 5);
          if (roman[n] === 'V') h.lineBetween(x - 5, cue.y - 13, x, cue.y + 5).lineBetween(x, cue.y + 5, x + 5, cue.y - 13);
          if (roman[n] === 'X') h.lineBetween(x - 5, cue.y - 13, x + 5, cue.y + 5).lineBetween(x + 5, cue.y - 13, x - 5, cue.y + 5);
        }
        if (!safe && severity === 'purple') {
          const triangle = [[0,17],[-14,41],[14,41]].map(([x,y]) => new Phaser.Math.Vector2(cue.x+x,cue.y+y));
          h.lineStyle(3,color,1).strokePoints(triangle,true);
          h.lineBetween(cue.x-4,cue.y+28,cue.x-4,cue.y+35).lineBetween(cue.x+4,cue.y+28,cue.x+4,cue.y+35);
        }
        if (!safe && severity === 'black') {
          const diamond = [[0,13],[-18,31],[0,49],[18,31]].map(([x,y]) => new Phaser.Math.Vector2(cue.x+x,cue.y+y));
          h.lineStyle(3,color,1).strokePoints(diamond,true);
          h.strokeCircle(cue.x,cue.y+28,8);
          h.lineBetween(cue.x-4,cue.y+27,cue.x-2,cue.y+29).lineBetween(cue.x+2,cue.y+29,cue.x+4,cue.y+27);
          h.lineBetween(cue.x-7,cue.y+39,cue.x+7,cue.y+43).lineBetween(cue.x-7,cue.y+43,cue.x+7,cue.y+39);
        }
        if(cue.safeAt>0&&!safe)h.lineStyle(3,0xbddccb,.95).lineBetween(cue.x-16,cue.y+cue.radius-4,cue.x,cue.y+cue.radius+10).lineBetween(cue.x,cue.y+cue.radius+10,cue.x+16,cue.y+cue.radius-4);
        if (safe) {
          // Shield geometry and a retiring outer rim express protection and expiry.
          const shield = [[-19, 20], [0, 13], [19, 20], [16, 39], [0, 51], [-16, 39]]
            .map(([x, y]) => new Phaser.Math.Vector2(cue.x + x, cue.y + y));
          h.lineStyle(3, color, 1).strokePoints(shield, true);
          h.lineStyle(3, color, 1)
            .lineBetween(cue.x - 9, cue.y + 31, cue.x - 1, cue.y + 38)
            .lineBetween(cue.x - 1, cue.y + 38, cue.x + 11, cue.y + 25);
          const remaining = Math.max(0, Math.min(1, (cue.until - now) / Math.max(1, cue.until - cue.safeAt))),
            rim: Phaser.Math.Vector2[] = [];
          for (let n = 0; n <= 48; n++) {
            const angle = -Math.PI / 2 + Math.PI * 2 * remaining * n / 48;
            rim.push(new Phaser.Math.Vector2(cue.x + Math.cos(angle) * (cue.radius + 8), cue.y + Math.sin(angle) * (cue.radius + 8)));
          }
          h.lineStyle(3, color, .85).strokePoints(rim, false);
        }
      } else if (cue.kind === 'wheel') {
        h.lineStyle(now < cue.at ? 4 : 2, 0xe6bf72, now < cue.at ? 0.9 : 0.3);
        for (let i = 1; i < cue.path.length; i++) {
          const a = cue.path[i - 1],
            b = cue.path[i];
          h.lineBetween(a.x, a.y, b.x, b.y);
          h.strokeCircle(b.x, b.y, 12);
        }
        let image = this.propImages.get(cue.id);
        if (!image) {
          image = this.add
            .image(cue.x, cue.y, 'tollkeeper-wheel')
            .setDepth(8)
            .setDisplaySize(100, 100);
          this.propImages.set(cue.id, image);
        }
        image
          .setPosition(cue.x, cue.y)
          .setVisible(now >= cue.at || cue.banked)
          .setRotation(this.reduceMotion ? 0 : cue.rotation);
        h.lineStyle(2, 0xe6bf72, 0.9).strokeCircle(cue.x, cue.y, cue.radius);
      } else if (cue.kind === 'chain') {
        const active=now>=cue.at&&now<cue.endsAt,broken=cue.health<=0,color=broken?0x8bc9a7:0xe6b875;
        if(now<cue.at&&!broken){
          const polygon=[new Phaser.Math.Vector2(cue.x,cue.y),...cue.edge.map(p=>new Phaser.Math.Vector2(p.x,p.y))];
          h.fillStyle(color,.07).fillPoints(polygon,true);
          h.lineStyle(cue.width,color,.12).strokePoints(polygon,true);
          h.lineStyle(2,color,.85).strokePoints(polygon,true);
          const middle=cue.startAngle+cue.sweep/2,sign=Math.sign(cue.sweep),edge=cue.edge[Math.floor(cue.edge.length/2)],
            px=cue.x+(edge.x-cue.x)*.7,py=cue.y+(edge.y-cue.y)*.7,tx=-Math.sin(middle)*sign,ty=Math.cos(middle)*sign;
          h.lineStyle(3,color,1).lineBetween(px-tx*15,py-ty*15,px+tx*15,py+ty*15)
            .lineBetween(px+tx*15,py+ty*15,px+tx*6+ty*7,py+ty*6-tx*7)
            .lineBetween(px+tx*15,py+ty*15,px+tx*6-ty*7,py+ty*6+tx*7);
        }
        if(active&&!broken){
          const end={x:cue.x+Math.cos(cue.angle)*cue.length,y:cue.y+Math.sin(cue.angle)*cue.length};
          h.lineStyle(cue.width,color,.65).lineBetween(cue.x,cue.y,end.x,end.y);
          for(let d=30;d<cue.length;d+=26)h.lineStyle(2,0x302d26,1).strokeCircle(cue.x+Math.cos(cue.angle)*d,cue.y+Math.sin(cue.angle)*d,7);
        }
        f.lineStyle(4,color,1).strokeCircle(cue.x,cue.y,cue.radius);
        for(let n=0;n<cue.index;n++)f.lineStyle(3,color,1).lineBetween(cue.x+(n-(cue.index-1)/2)*10,cue.y-9,cue.x+(n-(cue.index-1)/2)*10,cue.y+9);
        for(let n=1;n<=cue.legs;n++)f.lineStyle(2,color,n<=cue.leg?1:.35).strokeRect(cue.x+(n-(cue.legs+1)/2)*15-4,cue.y+35,8,8);
        f.fillStyle(0x142b27,1).fillRect(cue.x-30,cue.y-42,60,6);
        f.fillStyle(color,1).fillRect(cue.x-30,cue.y-42,60*cue.health/cue.maxHealth,6);
        if(broken)f.lineStyle(3,color,1).lineBetween(cue.x-14,cue.y-14, cue.x+14,cue.y+14);
      } else if (cue.kind === 'driver') {
        f.lineStyle(4, 0xf4d99c, 1).strokeCircle(cue.x, cue.y, cue.radius);
        f.lineStyle(4,0x9eddb8,.9).lineBetween(cue.x-28,cue.y+42,cue.x-28+56*Math.max(0,(cue.until-now)/Math.max(1,cue.until-cue.beganAt)),cue.y+42);
        f.lineStyle(3, 0xf4d99c, 1)
          .lineBetween(cue.x - 12, cue.y - cue.radius - 15, cue.x, cue.y - cue.radius - 3)
          .lineBetween(cue.x, cue.y - cue.radius - 3, cue.x + 12, cue.y - cue.radius - 15);
      } else if (cue.kind === 'sack') {
        f.lineStyle(2, cue.health > 0 ? 0xe4d291 : 0x94c6ad, 0.85).strokeCircle(
          cue.x,
          cue.y,
          cue.radius,
        );
        f.fillStyle(0x102a24, 0.9).fillRect(cue.x - 25, cue.y - 36, 50, 5);
        f.fillStyle(cue.health > 0 ? 0xe4d291 : 0x94c6ad, 1).fillRect(
          cue.x - 25,
          cue.y - 36,
          (50 * cue.health) / cue.maxHealth,
          5,
        );
      }
    }
    const liveProps = new Set(view.bossCues.filter((c) => c.kind === 'wheel').map((c) => c.id));
    for (const [id, image] of this.propImages)
      if (!liveProps.has(id)) {
        image.destroy();
        this.propImages.delete(id);
      }
    const constructIds = new Set(
      view.classCues.filter((c) => c.kind === 'turret' || c.kind === 'siege'||c.kind==='decoy').map((c) => c.id),
    );
    for (const [id, image] of this.constructImages)
      if (!constructIds.has(id)) {
        image.destroy();
        this.constructImages.delete(id);
      }
    for (const cue of view.classCues) {
      if(cue.kind==='talent-area'||cue.kind==='talent-link'){
        const pending=now<cue.at,color=cue.talent==='aftercut'||cue.talent==='unwritten-traps'?0xb9a6df:cue.talent==='furnace-vents'?0xe9bc83:0x9ce0c8;
        if(cue.kind==='talent-link'){
          h.lineStyle(pending?2:5,color,pending?.55:.85).lineBetween(cue.x,cue.y,cue.x2,cue.y2);
          h.lineStyle(2,color,.85).strokeCircle(cue.x2,cue.y2,7);
        }else{
          h.lineStyle(pending?2:3,color,.8).strokeCircle(cue.x,cue.y,cue.radius);
          h.fillStyle(color,pending?.025:.07).fillCircle(cue.x,cue.y,cue.radius);
          h.lineStyle(2,color,.6).strokeCircle(cue.x,cue.y,cue.radius*.65);
        }
        continue;
      }
      const color =
        cue.kind === 'sigil' || cue.kind === 'requiem'
          ? 0xb9a6df
          : cue.kind === 'citadel'
            ? 0xe9c27a
            : 0x97d8c7;
      if (cue.kind === 'wall') {
        const span=cue.halfSpan??110;
        const cosine = Math.cos(cue.aim),
          sine = Math.sin(cue.aim),
          points = [
            [-12, -span],
            [12, -span],
            [12, span],
            [-12, span],
          ].map(
            ([x, y]) =>
              new Phaser.Math.Vector2(cue.x + x * cosine - y * sine, cue.y + x * sine + y * cosine),
          );
        h.fillStyle(color, 0.28).fillPoints(points, true);
        h.lineStyle(4, color, 1).strokePoints(points, true);
      } else if(cue.kind==='decoy'){
        const owner=this.people.get(cue.owner);let ghost=this.constructImages.get(cue.id);
        if(owner){if(!ghost){ghost=this.add.image(cue.x,cue.y,owner.texture.key,owner.frame.name);this.constructImages.set(cue.id,ghost);}
          ghost.setTexture(owner.texture.key,owner.frame.name).setPosition(cue.x,cue.y).setDisplaySize(owner.displayWidth,owner.displayHeight).setAlpha(.38).setTint(0x9ccbd8).setDepth(5+cue.y/1000);
        }
        h.lineStyle(2,0x9ccbd8,.8).strokeCircle(cue.x,cue.y,cue.radius+4);
      } else if (cue.kind === 'turret' || cue.kind === 'siege') {
        const facing =
            Math.abs(Math.cos(cue.aim)) > Math.abs(Math.sin(cue.aim))
              ? Math.cos(cue.aim) > 0
                ? 1
                : 3
              : Math.sin(cue.aim) > 0
                ? 0
                : 2,
          texture = 'construct-' + (facing + (cue.kind === 'siege' ? 4 : 0));
        let image = this.constructImages.get(cue.id);
        if (!image) {
          image = this.add.image(cue.x, cue.y, texture);
          this.constructImages.set(cue.id, image);
        }
        image
          .setTexture(texture)
          .setPosition(cue.x, cue.y)
          .setDisplaySize(cue.kind === 'siege' ? 104 : 70, cue.kind === 'siege' ? 104 : 70)
          .setDepth(5 + cue.y / 1000);
        if (this.hitboxes) h.lineStyle(2, color, 0.8).strokeCircle(cue.x, cue.y, cue.radius);
      } else {
        h.fillStyle(color, 0.06).fillCircle(cue.x, cue.y, cue.radius);
        h.lineStyle(3, color, 0.85).strokeCircle(cue.x, cue.y, cue.radius);
        if (cue.kind === 'sigil')
          h.lineStyle(2, color, 0.6).strokeRect(
            cue.x - cue.radius * 0.6,
            cue.y - cue.radius * 0.6,
            cue.radius * 1.2,
            cue.radius * 1.2,
          );
        if (cue.kind === 'requiem')
          h.lineStyle(2, color, 0.6).strokeCircle(cue.x, cue.y, cue.radius * 0.7);
      }
      if ('health' in cue) {
        f.fillStyle(0x142b27, 1).fillRect(cue.x - 25, cue.y - cue.radius - 12, 50, 5);
        f.fillStyle(color, 1).fillRect(
          cue.x - 25,
          cue.y - cue.radius - 12,
          (50 * cue.health) / cue.maxHealth,
          5,
        );
      }
    }
    const partTint=bossVariantAppearance(view.boss.variant,view.boss.health>0).tint;
    this.endlessArt.draw(
      h,
      f,
      view.bossCues.filter((c): c is EndlessCue => c.kind.startsWith('endless-')),
      now,
      this.reduceMotion,
      this.hitboxes,
      partTint,
    );
    this.raidArt.draw(
      h,
      f,
      view.bossCues.filter((c): c is RaidCue => c.kind.startsWith('raid-')),
      now,
      this.reduceMotion,
      this.hitboxes,
      partTint,
    );
    this.districtArt.draw(
      h,
      f,
      view.bossCues.filter((c): c is DistrictCue => c.kind.startsWith('district-')),
      now,
      this.reduceMotion,
      this.hitboxes,
      partTint,
    );
    this.serviceArt.draw(
      h,
      f,
      view.bossCues.filter((c): c is ServiceCue => c.kind.startsWith('service-')),
      now,
      runtimeArena(view.arenaId,view.run.difficulty).bounds,
      this.reduceMotion,
      this.hitboxes,
      partTint,
    );
    drawSmallWakes(h, f, view.bossCues, now);
    drawEarlyWatch(h, f, view.bossCues, now);
    for(const cue of view.bossCues){
      if(cue.kind==='warden-patrol'){
        h.lineStyle(2,0xa5d7d2,.8).lineBetween(cue.x1,cue.y1,cue.x2,cue.y2).strokeCircle(cue.x2,cue.y2,14);
        const angle=Math.atan2(cue.y2-cue.y1,cue.x2-cue.x1);
        for(const side of [-1,1])h.lineBetween(cue.x2,cue.y2,cue.x2-Math.cos(angle+side*.5)*18,cue.y2-Math.sin(angle+side*.5)*18);
      }else if(cue.kind==='warden-return'){
        h.lineStyle(3,0xe8ad92,.9).strokeCircle(cue.x,cue.y,45);
        h.lineBetween(cue.x-15,cue.y-8,cue.x+15,cue.y-8).lineBetween(cue.x-15,cue.y+8,cue.x+15,cue.y+8);
      }
    }
    const actorIds = new Set(view.minions.map((a) => a.id));
    for (const actor of view.minions) {
      let sprite = this.actors.get(actor.id);
      if (!sprite) {
        sprite = this.add.sprite(
          actor.x,
          actor.y,
          actor.kind === 'rat' ? 'rat-action' : 'infirmary-minion-action',
          0,
        );
        this.actors.set(actor.id, sprite);
      }
      const clip = encounterArt.find(
        (entry) => entry.bossId === (actor.kind === 'rat' ? 'rat' : 'infirmary-minion'),
      )!;
      sprite
        .setPosition(actor.x, actor.y)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(clip.displayCell, clip.displayCell)
        .setDepth(5 + actor.y / 1000);
      const dx = actor.x - actor.oldX,
        dy = actor.y - actor.oldY;
      if (Math.hypot(dx, dy) > 0.01)
        sprite.setRotation(actor.kind === 'rat' ? Math.atan2(dy, dx) + Math.PI / 2 : 0);
      sprite
        .setFrame(this.reduceMotion ? 0 : Math.floor(now / 3) % 8)
        .setTint(now < actor.slowUntil ? 0x9dd8ce : 0xffffff);
      if (this.hitboxes) f.lineStyle(1, 0xe7c583, 0.9).strokeCircle(actor.x, actor.y, actor.radius);
      f.fillStyle(0x18352f, 0.9).fillRect(actor.x - 12, actor.y + 18, 24, 3);
      f.fillStyle(0xe4c08b, 1).fillRect(
        actor.x - 12,
        actor.y + 18,
        (24 * actor.health) / actor.maxHealth,
        3,
      );
    }
    for (const [id, sprite] of this.actors)
      if (!actorIds.has(id)) {
        sprite.destroy();
        this.actors.delete(id);
      }
    if (view.accord) {
      const a = view.accord;
      for (const point of a.points) {
        h.lineStyle(4, 0x9ce0c8, 0.95).strokeCircle(point.x, point.y, 65);
        h.lineStyle(7, 0xf1e2aa, 1)
          .beginPath()
          .arc(point.x, point.y, 58, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * a.progress) / a.channelTicks)
          .strokePath();
        h.lineStyle(2, 0xf1e2aa, 0.8).strokeRect(point.x - 11, point.y - 11, 22, 22);
      }
    }
    if (view.phase === 'combat' && ['regent', 'mirror-undertaker'].includes(view.boss.id)) {
      f.fillStyle(0x071410, 1).fillCircle(view.boss.x, view.boss.y, 9);
      f.lineStyle(2, 0xd2d7b7, 1).strokeCircle(view.boss.x, view.boss.y, 11);
    }
    const warden = view.boss.id === 'lantern-warden';
    this.bossSprite.setVisible(
      (view.phase === 'combat' &&
        view.boss.id !== 'choir' &&
        view.boss.id !== 'bell-triplets' &&
        !view.bossCues.some(
          (c) => c.kind === 'district-state' && c.style === 'dive' && now >= c.at && now < c.until,
        )) ||
        (view.boss.defeatedAt > 0 && view.boss.health <= 0),
    );
    const movingConstable = this.bossMotion.sample(
      view.boss,
      animationTime.tick,
      view.phase === 'combat' &&
        view.boss.id === 'constable' &&
        now >= view.boss.staggerUntil &&
        now >= view.boss.castEndsAt,
    );
    this.bossSprite.setPosition(
      view.boss.x,
      view.boss.y + (view.boss.id === 'constable' ? constableArt.groundOffsetY : 0),
    );
    const variantAppearance = bossVariantAppearance(view.boss.variant, view.boss.health > 0);
    this.bossSprite.setTint(variantAppearance.tint);
    if (view.phase === 'combat' && variantAppearance.marks) {
      f.lineStyle(2, variantAppearance.ring, variantAppearance.ringAlpha);
      for (let n = 0; n < variantAppearance.marks; n++) {
        const angle = (n * Math.PI * 2) / variantAppearance.marks;
        f.beginPath()
          .arc(view.boss.x, view.boss.y, 70, angle + 0.12, angle + 0.62)
          .strokePath();
      }
    }
    this.bossSprite.setAlpha(view.boss.health > 0 && now < view.boss.staggerUntil ? 0.55 : 1);
    if (warden) {
      const pose = wardenCombatPose(view.boss, view.tick, now, view.signatures, this.reduceMotion,view.bossCues.find(c=>c.kind==='warden-patrol'));
      const clip = wardenArt.clips[pose.clip];
      this.bossSprite.anims.stop();
      this.bossSprite
        .setTexture('warden-' + pose.clip, pose.frame)
        .setOrigin(clip.origin[0], clip.origin[1])
        .setDisplaySize(clip.displayCell, clip.displayCell);
    } else if (view.boss.id !== 'constable') {
      const early = earlyWatchPose(view.boss, view.tick, now, view.bossCues, this.reduceMotion, animationTime.tick);
      if (early) this.bossSprite.setY(view.boss.y - early.lift);
      const clip = encounterArt.find((entry) => entry.bossId === view.boss.id)!;
      this.bossSprite.anims.stop();
      const texturePose = bossTexturePresentation(
        view.boss.id,
        smallWakesPose(view.boss, view.tick, now, view.bossCues, this.reduceMotion, animationTime.tick)?.frame ?? early?.frame ?? courierCombatFrame(
          view.boss,
          view.tick,
          now,
          view.bossCues,
          this.reduceMotion,
          animationTime,
        ) ??
          bossDefeatFrame(view.boss, view.tick, this.reduceMotion, animationTime.tick) ??
          encounterFrame(view.boss, now, view.bossCues, this.reduceMotion),
        this.textures.exists(view.boss.id + '-action'),
        clip,
      );
      this.bossSprite
        .setTexture(texturePose.key, texturePose.frame)
        .setOrigin(texturePose.origin[0], texturePose.origin[1])
        .setDisplaySize(texturePose.displayWidth, texturePose.displayHeight);
    } else {
      const pose = constableCombatPose(
        view.boss,
        view.tick,
        now,
        this.reduceMotion,
        animationTime,
        movingConstable,
      );
      const clip = constableArt.clips[pose.clip];
      this.bossSprite.anims.stop();
      this.bossSprite
        .setTexture('constable-' + pose.clip, pose.frame)
        .setOrigin(clip.origin[0], clip.origin[1])
        .setDisplaySize(clip.displayCell, clip.displayCell);
    }
    if (view.phase === 'combat' && this.hitboxes)
      f.lineStyle(2, 0xf2c487, 0.65).strokeCircle(
        view.boss.x,
        view.boss.y,
        data.bosses.find((boss) => boss.id === view.boss.id)!.radius,
      );
    const existing = new Set<string>();
    const nameScale = Math.max(1, 1600 / Math.max(320, this.scale.displaySize.width)) * this.nameTextScale;
    for (const actual of view.players) {
      existing.add(actual.id);
      const p = actual.id === this.localId && this.predicted ? this.predicted : actual;
      let sprite = this.people.get(p.id);
      if (!sprite) {
        sprite = this.add
          .sprite(p.x, p.y, p.classId + '-idle-south')
          .setOrigin(0.5, 0.86)
          .setDisplaySize(p.classId === 'medic' ? 72 : 128, p.classId === 'medic' ? 108 : 128);
        this.people.set(p.id, sprite);
      }
      const dx = p.x - sprite.x,
        dy = p.y - sprite.y,
        visualMotion = this.visualMotion.sample(p, frameNow),
        moving = visualMotion.moving,
        blend = p.id === this.localId ? 1 : Math.min(1, wallDelta / 65);
      sprite.x += dx * blend;
      sprite.y += dy * blend;
      sprite.setDepth(5 + sprite.y / 1000);
      const actionPose = this.survivorActions.pose(
        p,
        view,
        moving,
        this.reduceMotion,
        frameNow,
        visualMotion.facing,
      );
      if (actionPose) {
        sprite.anims.stop();
        sprite
          .setTexture(actionPose.texture, actionPose.frame)
          .setFlipX(false)
          .setOrigin(actionPose.origin[0], actionPose.origin[1])
          .setDisplaySize(actionPose.displayCell, actionPose.displayCell);
      } else if (
        additionalSurvivors.some((id) => id === p.classId) ||
        legacySurvivors.some((id) => id === p.classId)
      ) {
        const pose = survivorPose(
          p.classId,
          p.aim,
          moving,
          p.status,
          animationTime.combatTick,
          this.reduceMotion,
          visualMotion.facing,
        );
        sprite.anims.stop();
        sprite
          .setTexture(pose.texture, pose.frame)
          .setFlipX(false)
          .setOrigin(pose.origin[0], pose.origin[1])
          .setDisplaySize(pose.displayCell, pose.displayCell);
      } else if (p.classId === 'heavy') {
        const pose = heavyPose(
          p.aim,
          moving,
          p.status,
          animationTime.combatTick,
          this.reduceMotion,
          visualMotion.facing,
        );
        sprite.anims.stop();
        sprite
          .setTexture(pose.texture, pose.frame)
          .setFlipX(false)
          .setOrigin(pose.origin[0], pose.origin[1])
          .setDisplaySize(pose.displayCell, pose.displayCell);
      }
      sprite.setAlpha(
        p.status === 'waiting'
          ? 0.35
          : p.status === 'eliminated'
            ? 0.2
            : now < Math.max(p.kit.veilUntil, p.kit.passageUntil)
              ? 0.45
              : p.connected
                ? 1
                : 0.4,
      );
      sprite.setTint(p.status === 'downed' ? 0xc58d7c : now < p.poisonUntil ? 0xd3a9e7 : 0xffffff);
      if (p.status === 'active' && now < p.poisonUntil) {
        const x=p.x+28,y=p.y-20;
        f.lineStyle(2,0xd3a9e7,1).strokePoints([new Phaser.Math.Vector2(x,y-10),new Phaser.Math.Vector2(x-9,y+7),new Phaser.Math.Vector2(x+9,y+7)],true);
        f.lineBetween(x-3,y-2,x-3,y+3).lineBetween(x+3,y-2,x+3,y+3);
        f.lineStyle(3,0xd3a9e7,.9).lineBetween(x-10,y+12,x-10+20*Math.max(0,Math.min(1,(p.poisonUntil-now)/(clerkRules.purplePoisonSeconds*30))),y+12);
      }
      let nameLabel=this.nameLabels.get(p.id);
      if(this.showNames&&!nameLabel){
        nameLabel=this.add.text(p.x,p.y-76,p.name,{fontFamily:getComputedStyle(document.body).fontFamily,fontSize:'14px',color:'#f4ebd4',backgroundColor:'#10201d',padding:{left:4,right:4,top:2,bottom:2}}).setOrigin(.5,1);
        this.nameLabels.set(p.id,nameLabel);
      }
      nameLabel?.setScale(nameScale).setText(p.name).setPosition(sprite.x,sprite.y-76).setDepth(8+sprite.y/1000).setVisible(this.showNames&&p.status!=='waiting');
      this.shadows.fillStyle(0x10201d, 0.35).fillEllipse(p.x, p.y + 4, 38, 14);
      if (p.id === this.localId) f.lineStyle(2, 0xf5e6af, 0.9).strokeEllipse(p.x, p.y + 4, 42, 20);
      if (this.hitboxes)
        f.lineStyle(
          p.id === this.localId ? 3 : 1,
          p.classId === 'medic' ? 0x9fe8da : 0xdbe7e3,
          0.9,
        ).strokeCircle(p.x, p.y, 9);
      if (p.status === 'downed') {
        f.lineStyle(4, 0xffb388, 1).strokeCircle(p.x, p.y, 24);
        f.lineStyle(3, 0xf5df9c, 1).lineBetween(p.x - 10, p.y, p.x + 10, p.y);
      }
      if (p.status === 'active' && now < p.braceUntil)
        f.lineStyle(3, 0xe5c77d, 0.85).strokeRoundedRect(p.x - 23, p.y - 19, 46, 38, 8);
      if (p.status === 'active' && now < p.overdriveUntil)
        f.lineStyle(3, 0xf1b06b, 0.9).strokeCircle(p.x, p.y, 29);
      if (p.status === 'active') {
        f.fillStyle(0x12251f, 0.9).fillRoundedRect(p.x - 20, p.y + 14, 40, 4, 2);
        f.fillStyle(p.classId === 'medic' ? 0x9ed9c4 : 0xe6d6a0, 1).fillRoundedRect(
          p.x - 20,
          p.y + 14,
          40 * Math.max(0, p.health / p.maxHealth),
          4,
          2,
        );
      }
    }
    for (const [id, sprite] of this.people)
      if (!existing.has(id)) {
        sprite.destroy();
        this.people.delete(id);
        this.nameLabels.get(id)?.destroy();this.nameLabels.delete(id);
      }
    this.renderedHostiles = 0;
    for (const [id, s] of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (now >= s.expires || s.x < 0 || s.x > 1600 || s.y < 0 || s.y > 1000) {
        this.shots.delete(id);
        this.recycleBullet(id);
        continue;
      }
      const key =
        'projectile-' +
        (s.owner === 'hostile' ? (this.highContrast ? 'contrast' : 'hostile') : 'friendly');
      let image = this.bulletImages.get(id);
      if (!image) {
        image = this.bulletPool.pop() ?? this.add.image(s.x, s.y, key).setDepth(20);
        this.bulletImages.set(id, image);
      }
      if (image.texture.key !== key) image.setTexture(key);
      image
        .setPosition(s.x, s.y)
        .setScale((s.radius + 2) / 15)
        .setVisible(true);
      if (s.owner === 'hostile') this.renderedHostiles++;
    }
    this.frameMeter.sample(
      performance.now(),
      !document.hidden,
      this.renderedHostiles,
      view.players.filter((p) => p.connected && p.status === 'active').length,
    );
  }
}
