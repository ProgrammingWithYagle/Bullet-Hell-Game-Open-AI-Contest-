import { PostedHeavyScene, preloadPostedHeavy } from "./heavy-post-scene.ts";
import { heavyPostedUrls as postedUrls } from "./heavy-post-assets.ts";
import { traverseHandlingIndicator } from "./heavy-traverse-handling-presentation.ts";
import{HeavySeamPresentation,drawHeavySeam}from"./heavy-seam-presentation.ts";
import {flakFlightBearing}from"./heavy-flak-presentation.ts";
import {skirmisherRules}from"../shared/soldier-skirmisher.ts";
import {drawAlchemyCue} from "./alchemy-presentation.ts";
import {drawRangerCue} from "./ranger-presentation.ts";
import {drawSwordCue} from "./sword-presentation.ts";
import {retinueArt,retinuePose} from "./retinue-presentation.ts";
import {drawSkirmishWarnings,drawWardPatient} from "./skirmish-presentation.ts";
import {drawStitchCue, isStitchCue} from "./stitch-cues.ts";
import {isBellCue} from "./bell-presentation.ts";
import {drawBellCue} from "./bell-cues.ts";
import {isMoldCue} from "./mold-presentation.ts";
import {drawMoldCue} from "./mold-cues.ts";
import {drawMatronCue} from "./matron-cues.ts";
import {drawAmbulanceCue} from "./ambulance-cues.ts";
import {drawWidowCue} from "./widow-presentation.ts";
import clerkRules from "../shared/clerk-appeal-rules.json";
import {smallWakesPose,drawSmallWakes} from "./small-wakes-presentation.ts";
import {trackArenaViewport,applyArenaCamera,arenaCamera,arenaCameraForBounds,arenaCanvasToWorld} from "./arena-camera.ts";
import { earlyWatchPose, drawEarlyWatch } from "./early-watch-presentation.ts";
import { EndlessPresentation } from "./endless-presentation.ts";
import type { EndlessCue } from "../shared/endless-director.ts";
import { RaidPresentation } from "./raid-presentation.ts";
import type { RaidCue } from "../shared/raid-director.ts";
import { DistrictPresentation } from "./district-presentation.ts";
import type { DistrictCue } from "../shared/district-director.ts";
import { ServicePresentation } from "./service-presentation.ts";
import type { ServiceCue } from "../shared/service-director.ts";
import Phaser from 'phaser';
import {engineerRules} from "../shared/engineer-pathways.ts";
import { assets } from "./assets.ts";
import { arenaCoverPlan, arenaCoverPlacement, preloadArenaCovers } from "./arena-covers.ts";
import {arenaWorldPlacement,arenaWorldTiles,preloadArenaWorlds} from "./arena-worlds.ts";
import { bossVariantAppearance } from "./boss-variant-appearance.ts";
import { BossVisualMotion } from "./boss-visual-motion.ts";
import { SurvivorVisualMotion } from "./survivor-visual-motion.ts";
import { bossDefeatFrame } from "./boss-defeat-presentation.ts";
import { courierCombatFrame } from "./courier-presentation.ts";
import {
  ARENA_BACKDROP_DEPTH,
  ARENA_GROUND_DEPTH,
  applyArenaGround,
  preloadArenaGrounds,
} from "./arena-presentation.ts";
import {
  constableArt,
  constableCombatPose,
  type ConstableClipId,
} from "./constable-presentation.ts";
import type { View, PlayerView } from "../shared/view.ts";
import type { Event, Shot } from "../shared/protocol.ts";
import { runtimeArena } from "../shared/arena-layouts.ts";
import { data } from "../shared/game.ts";
import { FrameMeter } from "./frame-meter.ts";
import { wardenArt, wardenCombatPose, type WardenCombatClipId } from "./warden-presentation.ts";
import {
  survivorArt,
  survivorPose,
  additionalSurvivors,
  legacySurvivors,
} from "./survivor-presentation.ts";
import { survivorActionArt } from "./survivor-action-presentation.ts";
import { SurvivorActionClock } from "./survivor-action-presentation.ts";
import { heavyArt, heavyPose } from "./heavy-presentation.ts";
import { encounterArt, encounterFrame } from "./encounter-presentation.ts";
import type { Sector } from "../shared/warden-signature.ts";
import {
  BossTextureCache,
  bossTexturePresentation,
  preloadBossTextureBase,
  retireBossTexture,
} from "./boss-textures.ts";
export class CombatScene extends Phaser.Scene {
  onLoadProgress?: (progress: number) => void;
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  readonly prepared = new Promise<void>((resolve, reject) => {
    this.resolveReady = resolve;
    this.rejectReady = reject;
  });
  view: View | null = null;
  localId = 'solo';
  private heavySeam=new HeavySeamPresentation();
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
  private postedHeavy = new PostedHeavyScene(() => this.add.sprite(0, 0, 'hux-posted-weapon'));
  private actors = new Map<number, Phaser.GameObjects.Sprite>();
  private companions = new Map<number,Phaser.GameObjects.Sprite>();
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
  private coverImages: Phaser.GameObjects.NineSlice[] = [];
  private lavaImages: {image:Phaser.GameObjects.Image;x:number;y:number}[] = [];
  private sceneryImages: Phaser.GameObjects.Image[] = [];
  private constructImages = new Map<number, Phaser.GameObjects.Image>();
  private bossSprite!: Phaser.GameObjects.Sprite;
  private shots = new Map<number, Shot>();
  private lastPhase = '';
  private lastFrameClock = 0;
  readonly frameMeter = new FrameMeter();
  ready = false;
  private cameraFrame = arenaCamera;
  viewport() {
    return {width:this.scale?.gameSize.width ?? 1600,height:this.scale?.gameSize.height ?? 1000};
  }
  canvasToWorld(point:{x:number;y:number}) {return arenaCanvasToWorld(point,this.viewport(),this.cameraFrame);}
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
        arenaZoom: this.cameras.main.zoom,
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
    this.load.on('progress', (progress: number) => this.onLoadProgress?.(progress));
    this.load.on('loaderror', () => this.rejectReady(Error('assetsUnavailable')));
    preloadArenaGrounds(this.load, assets.arenaGrounds);
    preloadArenaCovers(this.load, assets.arenaCovers);
    preloadArenaWorlds(this.load,assets.arenaWorlds);
    this.load.image('arena-lava-pit',assets.arenaCovers['lava-pit']);
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
    preloadPostedHeavy(this.load, postedUrls);
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
    for(const clip of retinueArt)this.load.spritesheet(clip.id,assets.retinue[clip.id],{frameWidth:clip.cellSize,frameHeight:clip.cellSize});
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
    const stopFitting = trackArenaViewport(this.cameras.main,this.scale,()=>this.cameraFrame);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,stopFitting);
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
    const note=this.make.graphics({x:0,y:0});
    note.lineStyle(4,0xffd58b,1).strokeEllipse(16,17,20,11);
    note.lineStyle(2,0x423c2d,1).lineBetween(8,17,24,17);
    note.generateTexture('projectile-note',32,32);note.destroy();
    const beacon=this.make.graphics({x:0,y:0});beacon.lineStyle(3,0xe8ce8a,1).strokeCircle(16,16,8);beacon.fillStyle(0xabc8bd,1).fillCircle(16,16,4);beacon.generateTexture('projectile-beacon',32,32);beacon.destroy();
    const canister=this.make.graphics({x:0,y:0});canister.fillStyle(0x384349,1).fillCircle(16,18,8);canister.lineStyle(2,0xc1a477,1).strokeCircle(16,18,8);canister.fillStyle(0xb5a06f,1).fillRect(12,6,8,6);canister.lineStyle(2,0xd8c69c,1).lineBetween(18,7,24,12);canister.generateTexture('projectile-canister',32,32);canister.destroy();
    const flak=this.make.graphics({x:0,y:0});flak.fillStyle(0x394349,1).fillRoundedRect(6,11,20,10,4);flak.lineStyle(2,0xbba272,1).strokeRoundedRect(6,11,20,10,4);flak.lineStyle(2,0xd1bf8d,1).lineBetween(20,12,20,20);flak.generateTexture('projectile-flak',32,32);flak.destroy();
    const arrow=this.make.graphics({x:0,y:0});arrow.lineStyle(3,0x3c3024,1).lineBetween(3,16,28,16);arrow.lineStyle(1.5,0xe0cf9d,1).lineBetween(3,16,28,16);arrow.lineStyle(2,0xa8bec0,1).lineBetween(22,11,28,16).lineBetween(28,16,22,21);arrow.lineStyle(2,0x94ad88,1).lineBetween(4,12,8,16).lineBetween(4,20,8,16);arrow.generateTexture('projectile-arrow',32,32);arrow.destroy();
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
      this.postedHeavy.clear();
      this.bossTextureAlive = false;
      this.bossTextures?.dispose();
      for (const cancel of [...this.cancelBossLoads]) cancel();
    });
    if (this.view) this.bossTextures.request(this.view.boss.id);
    this.ready = true;
    this.resolveReady();
  }
  apply(view: View) {
    this.heavySeam.observe(view,this.localId);
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
      if(event.type==='private-class-cues')this.heavySeam.ingest(event,this.view,this.localId);
      if (event.type === 'shots')
        for (const shot of event.shots) this.shots.set(shot.id, { ...shot });
      if (event.type === 'remove') {
        if(!event.ids.length)this.heavySeam.clear();
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
      this.cameraFrame=arenaCameraForBounds(map.bounds);
      applyArenaCamera(this.cameras.main,this.viewport(),this.cameraFrame);
      const shade=Number.parseInt(map.shadow.slice(1),16);
      applyArenaGround(this.arenaImage, map.id,view.run.difficulty);
      this.arenaBackdrop.clear();
      this.arenaBackdrop.fillStyle(0x101e1b,1).fillRect(arenaCamera.x,arenaCamera.y,arenaCamera.width,arenaCamera.height);
      const ground = this.arenaGround;
      ground.clear();
      this.coverImages.forEach((image) => image.destroy());
      this.coverImages = [];
      this.sceneryImages.forEach(image=>image.destroy());this.sceneryImages=[];
      const world=arenaWorldPlacement(map.id);
      this.arenaImage.setVisible(true);
      if(world){
        const texture=this.textures.get(world.entry.texture);
        for(const tile of arenaWorldTiles(map.id)){
          const s=tile.source;if(!texture.has(tile.frame))texture.add(tile.frame,0,s.x,s.y,s.width,s.height);
          this.sceneryImages.push(this.add.image(tile.x+tile.width/2,tile.y+tile.height/2,world.entry.texture,tile.frame)
            .setDisplaySize(tile.width,tile.height).setFlip(tile.flipX,tile.flipY).setDepth(ARENA_GROUND_DEPTH).setAlpha(.8));
        }
      }
      this.lavaImages.forEach(pit=>pit.image.destroy());
      this.lavaImages = map.lavaPits.map(pit=>({x:pit.x,y:pit.y,image:this.add.image(pit.x,pit.y,'arena-lava-pit')
        .setDisplaySize(pit.radius*2,pit.radius*2).setDepth(.5)}));
      if (!world && (map.bounds.width < 1600 || map.bounds.height < 1000)) {
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
        const placement = arenaCoverPlacement(map.id,obstacle);
        const surface = this.add.nineslice(placement.x,placement.y,placement.texture,undefined,
          placement.width,placement.height,placement.cap,placement.cap,0,0);
        surface.setScale(placement.scale).setRotation(placement.rotation).setDepth(1);
        this.coverImages.push(surface);
      }
    }
    for(const pit of this.lavaImages){
      const cue=view.bossCues.find(c=>c.kind==='arena-lava'&&c.x===pit.x&&c.y===pit.y);
      const active=cue?.kind==='arena-lava'&&now>=cue.at;
      pit.image.setAlpha(active?1:cue?.5:.23).setTint(active?0xffffff:0x65736b);
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
      if(isStitchCue(cue)){drawStitchCue(h,f,cue,now);continue;}
      if(isBellCue(cue)){drawBellCue(h,f,cue,now);continue;}
      if(isMoldCue(cue)){drawMoldCue(h,f,cue,now,view.bossCues.filter(isMoldCue),this.reduceMotion);continue;}
      if(cue.kind==='matron-walk'||cue.kind==='matron-brood'||cue.kind==='matron-pulse'||cue.kind==='matron-needles'){
        if(cue.kind==='matron-needles'){if(drawnMatronNeedles.has(cue.sourceId))continue;drawnMatronNeedles.add(cue.sourceId);}
        drawMatronCue(h,f,cue,now,view.bossCues.filter((q):q is import("../shared/matron-ward.ts").MatronCue=>q.kind==='matron-walk'||q.kind==='matron-brood'||q.kind==='matron-pulse'||q.kind==='matron-needles'||(q.kind==='service-prop'&&q.role==='nest')));continue;
      }
      if(cue.kind==='ambulance-patrol'||cue.kind==='ambulance-lane'||cue.kind==='ambulance-stop'||cue.kind==='ambulance-burst'){
        if(cue.kind==='ambulance-burst'){const key=cue.x+':'+cue.y;if(drawnAmbulanceBursts.has(key))continue;drawnAmbulanceBursts.add(key);}
        drawAmbulanceCue(h,f,cue,now,view.bossCues.filter((q):q is import("../shared/ambulance-route.ts").AmbulanceCue=>q.kind==='ambulance-patrol'||q.kind==='ambulance-lane'||q.kind==='ambulance-stop'||q.kind==='ambulance-burst'||q.kind==='driver'));continue;
      }
      if(cue.kind==='arena-lava') {
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
    drawHeavySeam(h,this.heavySeam.frame(view,this.localId),now,this.highContrast);
    for (const cue of view.classCues) {
      if(cue.kind==='engineer-builder-plan'||cue.kind==='engineer-builder-work'){
        const work=cue.kind==='engineer-builder-work',color=cue.rejected?0xd78965:work?0xa9d7b5:0xd8c28a;
        if(work||cue.owner===this.localId){
          const progress=Math.max(0,Math.min(1,(now-cue.at)/Math.max(1,cue.until-cue.at)));
          h.lineStyle(2,color,.7).lineBetween(cue.x,cue.y,cue.toX,cue.toY);
          h.lineStyle(2,color,.5).strokeCircle(cue.toX,cue.toY,18);
          h.lineStyle(4,color,.9).beginPath().arc(cue.toX,cue.toY,22,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();
          if(cue.rejected){h.lineStyle(3,color,.9).lineBetween(cue.x-10,cue.y-10,cue.x+10,cue.y+10);h.lineBetween(cue.x+10,cue.y-10,cue.x-10,cue.y+10);}
        }
        continue;
      }
      if(cue.kind==='engineer-coil'||cue.kind==='engineer-beam'){
        const charging=cue.kind==='engineer-coil',color=cue.convergence?0xe4cd83:0x86d7cb;
        const endX=cue.toX??cue.x,endY=cue.toY??cue.y;
        for(const ray of charging?(cue.rays??[{x:endX,y:endY}]):[{x:endX,y:endY}]){
          h.lineStyle(charging?2:cue.radius*2,color,charging?.5:.25).lineBetween(cue.x,cue.y,ray.x,ray.y);
          h.lineStyle(charging?1:4,color,charging?.8:1).lineBetween(cue.x,cue.y,ray.x,ray.y);
        }
        h.lineStyle(2,color,.9).strokeCircle(cue.x,cue.y,charging?24:18);
        if(charging){const progress=Math.max(0,Math.min(1,(now-cue.at)/Math.max(1,cue.until-cue.at)));h.lineStyle(4,color,1).beginPath().arc(cue.x,cue.y,27,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();}
        continue;
      }
      if(cue.kind==='engineer-collapse'||cue.kind==='engineer-salvage'||cue.kind==='engineer-order'){
        if(cue.kind==='engineer-order'&&cue.owner!==this.localId)continue;
        const color=cue.rejected?0xd78965:cue.kind==='engineer-salvage'?0xdac687:0xb5e1cc;
        h.lineStyle(cue.impact?5:2,color,.9).strokeCircle(cue.x,cue.y,cue.radius);
        h.fillStyle(color,cue.impact?.23:.05).fillCircle(cue.x,cue.y,cue.radius);
        if(cue.impact){h.lineStyle(3,color,1).strokeCircle(cue.x,cue.y,cue.radius*.55);h.fillStyle(0xfff0bd,.7).fillCircle(cue.x,cue.y,18);}
        const size=cue.rejected?9:6;
        h.lineStyle(2,color,1).lineBetween(cue.x-size,cue.y-size,cue.x+size,cue.y+size).lineBetween(cue.x-size,cue.y+size,cue.x+size,cue.y-size);
        continue;
      }
      if(cue.kind==='engineer-wire'||cue.kind==='engineer-jet'||cue.kind==='engineer-haul'||cue.kind==='engineer-corridor'){
        const impact=!!cue.impact,wire=cue.kind==='engineer-wire',haul=cue.kind==='engineer-haul';
        const color=wire?0x9bc8b4:haul?0xc3b983:impact?0xf0d49a:0xd0ad70;
        const dx=cue.toX-cue.x,dy=cue.toY-cue.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
        if(!wire&&!haul){
          h.lineStyle(cue.radius*2,color,impact?.28:.07).lineBetween(cue.x,cue.y,cue.toX,cue.toY);
          for(const side of [-1,1])h.lineStyle(impact?2:1,color,.85).lineBetween(cue.x+nx*cue.radius*side,cue.y+ny*cue.radius*side,cue.toX+nx*cue.radius*side,cue.toY+ny*cue.radius*side);
        }
        h.lineStyle(impact?4:wire?2:1,color,impact?1:.8).lineBetween(cue.x,cue.y,cue.toX,cue.toY);
        h.lineStyle(2,color,.9).strokeCircle(cue.x,cue.y,wire?6:9).strokeCircle(cue.toX,cue.toY,wire?6:9);
        if(!wire&&!haul&&!impact){const progress=Math.max(0,Math.min(1,(now-cue.at)/Math.max(1,cue.until-cue.at)));h.lineStyle(3,color,1).beginPath().arc(cue.x,cue.y,16,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();}
        continue;
      }
      if(cue.kind==='soldier-load'){
        const local=cue.owner===this.localId,color=cue.roving?0xd6c28f:0xb8c1af;
        // Four cartridge pips and one quiet timing arc, attached to the actual owner.
        const progress=Math.max(0,Math.min(1,(now-cue.roundAt)/Math.max(1,cue.nextAt-cue.roundAt)));
        h.lineStyle(1,color,local?.65:.3).beginPath().arc(cue.x,cue.y,cue.radius,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();
        for(let n=0;n<cue.total;n++){
          const x=cue.x+(n-(cue.total-1)/2)*6,y=cue.y+cue.radius+6;
          if(n<cue.loaded)h.fillStyle(color,local?.9:.45).fillRect(x-1.5,y-3,3,6);
          else h.lineStyle(1,color,local?.5:.2).strokeRect(x-1.5,y-3,3,6);
        }
        continue;
      }
      if(cue.kind==='heavy-flak-seam-contacts'){
        const fade=Math.max(0,Math.min(1,(cue.until-now)/Math.max(1,cue.until-cue.at)));h.lineStyle(1.8,0xc1aa7d,.8*fade);for(const p of cue.contacts)h.lineBetween(p.x-3,p.y-3,p.x+3,p.y+3).lineBetween(p.x+3,p.y-3,p.x-3,p.y+3);continue;
      }
      if(cue.kind==='heavy-flak-burst'){
        const fade=Math.max(0,Math.min(1,(cue.until-now)/Math.max(1,cue.until-cue.at)));h.lineStyle(1.8,0xb7bc9a,.75*fade);
        if(cue.arc>=Math.PI*2-1e-6)h.strokeCircle(cue.x,cue.y,cue.radius);
        else{const a=cue.aim-cue.arc/2,b=cue.aim+cue.arc/2;h.beginPath().moveTo(cue.x,cue.y).lineTo(cue.x+Math.cos(a)*cue.radius,cue.y+Math.sin(a)*cue.radius).arc(cue.x,cue.y,cue.radius,a,b).closePath().strokePath();}
        for(const point of cue.contacts)h.lineBetween(point.x-2,point.y-2,point.x+2,point.y+2).lineBetween(point.x+2,point.y-2,point.x-2,point.y+2);
        h.strokeCircle(cue.x,cue.y,2);continue;
      }
      if(cue.kind==='soldier-puncture'){
        const alpha=Math.max(0,Math.min(1,(cue.until-now)/(cue.until-cue.at))),dx=-Math.sin(cue.aim)*5,dy=Math.cos(cue.aim)*5;h.lineStyle(1.8,0xc4bd93,.8*alpha);for(const point of [{x:cue.x,y:cue.y},{x:cue.exitX,y:cue.exitY}]){h.strokeCircle(point.x,point.y,4);h.lineBetween(point.x-dx,point.y-dy,point.x+dx,point.y+dy);}continue;
      }
      if(cue.kind==='soldier-rest'){
        const local=cue.owner===this.localId,ready=now>=cue.readyAt,fade=Math.min(1,Math.max(0,(cue.until-now)/15)),color=ready?0xb7ad86:0x879da2;h.lineStyle(ready?1.8:1,color,(local?.8:.3)*fade).strokeRect(cue.x-6,cue.y-4,12,8);h.lineBetween(cue.x+Math.cos(cue.aim)*8,cue.y+Math.sin(cue.aim)*8,cue.x+Math.cos(cue.aim)*19,cue.y+Math.sin(cue.aim)*19);if(!ready){const progress=Math.max(0,Math.min(1,(now-cue.at)/(cue.readyAt-cue.at)));h.beginPath().arc(cue.x,cue.y,9,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();}continue;
      }
      if(cue.kind==='soldier-sight'){
        const local=cue.owner===this.localId,ready=now>=cue.readyAt,color=ready?0xc4bd93:0x879da2,alpha=local?.8:.28,length=Math.min(cue.radius,36);h.lineStyle(ready?2:1.2,color,alpha).strokeCircle(cue.x,cue.y,12);for(const side of [-1,1]){const a=cue.aim+side*Math.PI/15;h.lineBetween(cue.x+Math.cos(a)*15,cue.y+Math.sin(a)*15,cue.x+Math.cos(a)*length,cue.y+Math.sin(a)*length);}continue;
      }
      if(cue.kind==='soldier-fuse'||cue.kind==='soldier-grenade-contact'||cue.kind==='soldier-grenade-blast'||cue.kind==='soldier-grenade-vent'){
        const local=cue.owner===this.localId,fade=Math.max(0,Math.min(1,(cue.until-now)/Math.max(1,cue.until-cue.at))),color=cue.kind==='soldier-grenade-vent'?0x8d998e:0xc6ae7d;
        if(cue.kind==='soldier-fuse'){const progress=1-fade;h.lineStyle(1.5,color,local?.8:.35).beginPath().arc(cue.x,cue.y,cue.radius,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();h.lineStyle(2,color,local?.8:.35).strokeRect(cue.x-3,cue.y-cue.radius-7,6,5);}
        else {h.lineStyle(cue.kind==='soldier-grenade-blast'?2:1,color,fade*(local?.7:.35)).strokeCircle(cue.x,cue.y,cue.radius);if(cue.kind==='soldier-grenade-blast')for(let n=0;n<8;n++){const a=n*Math.PI/4;h.lineBetween(cue.x+Math.cos(a)*(cue.radius-7),cue.y+Math.sin(a)*(cue.radius-7),cue.x+Math.cos(a)*cue.radius,cue.y+Math.sin(a)*cue.radius);}}continue;
      }
      if(cue.kind==='soldier-bank'){
        const fade=Math.max(0,1-(now-cue.at)/(cue.until-cue.at)),local=cue.owner===this.localId,color=0xc6ae7d;
        // An actual finite contact, with no permanent aiming overlay or particle spray.
        h.lineStyle(1.5,color,fade*(local?.8:.35))
          .lineBetween(cue.x-Math.cos(cue.incomingAim)*11,cue.y-Math.sin(cue.incomingAim)*11,cue.x,cue.y)
          .lineBetween(cue.x,cue.y,cue.x+Math.cos(cue.outgoingAim)*15,cue.y+Math.sin(cue.outgoingAim)*15);
        h.fillStyle(color,fade*.5).fillCircle(cue.x,cue.y,1.5);continue;
      }
      if(cue.kind==='soldier-step-reject'){
        const local=cue.owner===this.localId,color=0xbba680;
        if(cue.reason==='ground')h.lineStyle(1,color,local?.6:.25).lineBetween(cue.x,cue.y,cue.toX,cue.toY).strokeCircle(cue.toX,cue.toY,cue.radius);
        else {const x=cue.x,y=cue.y-cue.radius-6;h.lineStyle(2,color,local?.7:.3).lineBetween(x-3,y-3,x+3,y+3).lineBetween(x+3,y-3,x-3,y+3);}
        continue;
      }
      if(cue.kind==='soldier-ready'){
        const local=cue.owner===this.localId,color=cue.relay?0xdfc18b:0xbfcdb8,x=cue.x,y=cue.y-cue.radius;
        // Stationary one/two-leg chevrons: no extra full ring, flash or particles.
        h.lineStyle(2,color,local?.85:.4).lineBetween(x-5,y-3,x,y).lineBetween(x,y,x+5,y-3);
        if(cue.relay)h.lineBetween(x-5,y+2,x,y+5).lineBetween(x,y+5,x+5,y+2);
        continue;
      }
      if(cue.kind==='soldier-step'){
        const local=cue.owner===this.localId,color=cue.loaded?(cue.relay?0xdfc18b:0xbfcdb8):cue.mode==='rear'?0xb9cbbd:0xa5bdcf;
        if(cue.mode==='rear'){
          const mid=Math.ceil((cue.until-cue.at)/2)/(cue.until-cue.at),x=cue.x+(cue.toX-cue.x)*mid,y=cue.y+(cue.toY-cue.y)*mid;
          h.lineStyle(skirmisherRules.guardRadius*2,color,local?.08:.035).lineBetween(x,y,x+Math.cos(cue.aim)*skirmisherRules.guardReach,y+Math.sin(cue.aim)*skirmisherRules.guardReach);
          h.lineStyle(1,color,local?.55:.25).lineBetween(x,y,x+Math.cos(cue.aim)*skirmisherRules.guardReach,y+Math.sin(cue.aim)*skirmisherRules.guardReach);
        }
        h.lineStyle(2,color,local?.75:.35).lineBetween(cue.x,cue.y,cue.toX,cue.toY);
        h.lineStyle(1,color,local?.8:.4).strokeCircle(cue.toX,cue.toY,cue.radius+3);
        const dx=cue.toX-cue.x,dy=cue.toY-cue.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
        h.lineBetween(cue.toX-dx/length*9+nx*5,cue.toY-dy/length*9+ny*5,cue.toX,cue.toY).lineBetween(cue.toX-dx/length*9-nx*5,cue.toY-dy/length*9-ny*5,cue.toX,cue.toY);
        continue;
      }
      if(cue.kind==='engineer-charge'){
        const armed=cue.state==='ready',fuse=cue.state==='fuse',spent=cue.state==='spent';
        const color=fuse?0xf0b262:cue.held?0xc4b687:armed?0x97d8c7:0x9a9b8a;
        const radius=fuse||spent?engineerRules.blastRadius:cue.radius;
        h.lineStyle(fuse?3:2,color,.85).strokeCircle(cue.x,cue.y,radius);
        h.fillStyle(color,spent?.20:.05).fillCircle(cue.x,cue.y,radius);
        h.fillStyle(color,.9).fillRect(cue.x-7,cue.y-7,14,14);
        h.lineStyle(2,color,.9).lineBetween(cue.x-11,cue.y,cue.x+11,cue.y).lineBetween(cue.x,cue.y-11,cue.x,cue.y+11);
        if(cue.held&&!fuse&&!spent)h.lineStyle(3,0x424c3b,1).lineBetween(cue.x-3,cue.y-5,cue.x-3,cue.y+5).lineBetween(cue.x+3,cue.y-5,cue.x+3,cue.y+5);
        if(cue.aim!==undefined&&!spent)h.lineStyle(2,color,.9).lineBetween(cue.x+Math.cos(cue.aim)*14,cue.y+Math.sin(cue.aim)*14,cue.x+Math.cos(cue.aim)*25,cue.y+Math.sin(cue.aim)*25);
        if(!armed&&!spent&&cue.state!=='hauling'){const start=fuse?cue.detonateAt-Math.ceil(engineerRules.fuseSeconds*30):cue.at,end=fuse?cue.detonateAt:cue.armedAt;const progress=Math.max(0,Math.min(1,(now-start)/(end-start)));h.lineStyle(3,color,1).beginPath().arc(cue.x,cue.y,18,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();}
        continue;
      }
      if(cue.kind==='alchemy-brew'||cue.kind==='alchemy-flask'||cue.kind==='alchemy-pool'||cue.kind==='alchemy-combination'){drawAlchemyCue(h,cue,now,this.localId);continue;}
      if(cue.kind==='ranger-draw'||cue.kind==='ranger-release'||cue.kind==='ranger-trap'||cue.kind==='ranger-survey'){drawRangerCue(h,cue,now,this.localId);continue;}
      if(cue.kind==='sword-cut'||cue.kind==='sword-windup'||cue.kind==='sword-guard'||cue.kind==='sword-parry'||cue.kind==='sword-return'){drawSwordCue(h,cue,now,this.reduceMotion);continue;}
      if(cue.kind==='bard-phrase'||cue.kind==='bard-cut'){
        const color=cue.encore?0xe5c379:0xc4dcb9;
        if(cue.kind==='bard-cut')h.lineStyle(4,color,.8).lineBetween(cue.x,cue.y,cue.x2??cue.x,cue.y2??cue.y);
        else {
          const progress=Math.max(0,Math.min(1,(now-cue.at)/(cue.until-cue.at)));
          h.lineStyle(2,color,.8*(1-progress)).strokeCircle(cue.x,cue.y,cue.radius*(.65+.35*progress));
          for(let beat=0;beat<3;beat++)h.fillStyle(color,beat===cue.beat%3?.8:.25).fillCircle(cue.x+(beat-1)*10,cue.y-22,3);
        }
        continue;
      }
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
        const folding=now<(cue.buildingUntil??0),panelColor=cue.builder?0xa6c2aa:color;
        h.fillStyle(panelColor,folding?.06:.28).fillPoints(points, true);
        h.lineStyle(folding?2:4,panelColor,folding?.5:1).strokePoints(points, true);
        if(cue.builder){
          for(const side of [-1,1]){const along=side*(span-10);h.fillStyle(0xd1b46c,folding?.4:1).fillCircle(cue.x-along*sine,cue.y+along*cosine,4);}
          if(folding){const began=cue.buildingAt??cue.at,progress=Math.max(0,Math.min(1,(now-began)/Math.max(1,(cue.buildingUntil??now)-began)));h.lineStyle(3,0xd1b46c,.9).beginPath().arc(cue.x,cue.y,20,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();}
        }
      } else if(cue.kind==='decoy'){
        const owner=this.people.get(cue.owner);let ghost=this.constructImages.get(cue.id);
        if(owner){if(!ghost){ghost=this.add.image(cue.x,cue.y,owner.texture.key,owner.frame.name);this.constructImages.set(cue.id,ghost);}
          ghost.setTexture(owner.texture.key,owner.frame.name).setPosition(cue.x,cue.y).setDisplaySize(owner.displayWidth,owner.displayHeight).setAlpha(.38).setTint(0x9ccbd8).setDepth(5+cue.y/1000);
        }
        h.lineStyle(2,0x9ccbd8,.8).strokeCircle(cue.x,cue.y,cue.radius+4);
      } else if (cue.kind === 'turret' || cue.kind === 'siege') {
        if(cue.machinery&&cue.owner===this.localId&&cue.order==='waypoint'&&cue.goal){h.lineStyle(1,0xc7b374,.7).lineBetween(cue.x,cue.y,cue.goal.x,cue.goal.y);h.lineStyle(2,0xc7b374,.9).strokeCircle(cue.goal.x,cue.goal.y,12);}
        if(cue.machinery&&cue.order==='anchor')h.lineStyle(3,0xc7b374,.95).strokeRect(cue.x-24,cue.y-24,48,48);
        if(cue.machinery){h.lineStyle(2,0xdac687,.8).strokeCircle(cue.x,cue.y,25);if(now<(cue.braceUntil??0))h.lineStyle(3,0xdac687,.9).lineBetween(cue.x-15,cue.y+27,cue.x+15,cue.y+27);}
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
    drawSkirmishWarnings(h,view.objective,view.phase,now);
    drawWardPatient(h,view,this.localId);
    const warden = view.boss.id === 'lantern-warden';
    this.bossSprite.setVisible(
      (!view.objective && view.phase === 'combat' &&
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
    if (!view.objective && view.phase === 'combat' && variantAppearance.marks) {
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
    this.postedHeavy.beginFrame();
    const existing = new Set<string>();
    const nameScale = Math.max(1, this.scale.gameSize.width / Math.max(320, this.scale.displaySize.width)) * this.nameTextScale / this.cameras.main.zoom;
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
      if (!this.postedHeavy.apply(sprite, actual, view, this.localId, {
        moving, facing: visualMotion.facing, combatTick: animationTime.combatTick,
        reduceMotion: this.reduceMotion, action: actionPose, drawnBody: p,
      })) {
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
      if(p.id===this.localId){
        const feed=traverseHandlingIndicator([actual],this.localId,view.phase,view.combatTick);
        if(feed){f.lineStyle(2,feed.state==='keyed'?0xe9bf70:0xc4d4d9,.9);for(const[a,b]of feed.lines)f.lineBetween(a.x,a.y,b.x,b.y);}
      }
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
    this.postedHeavy.endFrame((a, b) => {
      f.lineStyle(1.5, 0xc4c0a4, 0.65).lineBetween(a.x, a.y, b.x, b.y);
    });
    for (const [id, sprite] of this.people)
      if (!existing.has(id)) {
        sprite.destroy();
        this.people.delete(id);
        this.nameLabels.get(id)?.destroy();this.nameLabels.delete(id);
      }
    const companionIds=new Set<number>();
    for(const entity of view.retinue??[]){
      const pose=retinuePose(entity,animationTime.combatTick,this.reduceMotion);if(!pose)continue;companionIds.add(entity.id);
      let sprite=this.companions.get(entity.id);
      if(!sprite){sprite=this.add.sprite(entity.x,entity.y,pose.texture,pose.frame);this.companions.set(entity.id,sprite);}
      const blend=1-Math.exp(-20*dt);sprite.x+=(entity.x-sprite.x)*blend;sprite.y+=(entity.y-sprite.y)*blend;
      sprite.setTexture(pose.texture,pose.frame).setOrigin(pose.origin[0],pose.origin[1]).setDisplaySize(pose.displayCell,pose.displayCell).setDepth(4.8+sprite.y/1000).setAlpha(entity.health<=0?.35:entity.owner===this.localId?.95:.65).setTint(now<entity.poisonUntil?0xd3a9e7:0xffffff);
      if(entity.health>0&&entity.owner===this.localId){
        f.lineStyle(1,entity.temporary?0xe0c88c:0xa4c4a1,.7).strokeCircle(sprite.x,sprite.y,entity.radius);
        f.fillStyle(0x10221b,.9).fillRect(sprite.x-13,sprite.y+entity.radius+3,26,2);
        f.fillStyle(now<entity.poisonUntil?0xd3a9e7:0xb7cea8,1).fillRect(sprite.x-13,sprite.y+entity.radius+3,26*Math.max(0,entity.health/entity.maxHealth),2);
      }
    }
    for(const [id,sprite]of this.companions)if(!companionIds.has(id)){sprite.destroy();this.companions.delete(id);}
    const caller=view.players.find(p=>p.id===this.localId&&p.classId==='summoner');
    if(caller?.kit.retinueOrder==='hold'&&caller.kit.retinueCount){const x=caller.kit.retinueHoldX??caller.x,y=caller.kit.retinueHoldY??caller.y;f.lineStyle(1,0xb7cea8,.7).strokeCircle(x,y,7).lineBetween(x-10,y,x+10,y).lineBetween(x,y-10,x,y+10);}
    const mark=caller?.kit.retinueMarkKey;
    if(mark&&(caller?.kit.retinueMarkUntil??0)>now){
      const target=mark==='boss'?view.boss:mark.startsWith('ordinary:')?view.minions.find(m=>m.id===Number(mark.slice(9))):view.bossCues.find(c=>'id'in c&&c.id===Number(mark.slice(5)));
      if(target&&'x'in target&&'y'in target)f.lineStyle(2,0xe7d19a,.8).strokeCircle(target.x,target.y,18);
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
        (s.visual==='flak'?'flak':s.visual==='canister'?'canister':s.owner === 'hostile' ? (this.highContrast ? 'contrast' : 'hostile') : view.players.find(p=>p.id===s.owner)?.classId==='bard'?'note':view.players.find(p=>p.id===s.owner)?.classId==='summoner'?'beacon':view.players.find(p=>p.id===s.owner)?.classId==='ranger'?'arrow':'friendly');
      let image = this.bulletImages.get(id);
      if (!image) {
        image = this.bulletPool.pop() ?? this.add.image(s.x, s.y, key).setDepth(20);
        this.bulletImages.set(id, image);
      }
      if (image.texture.key !== key) image.setTexture(key);
      image
        .setPosition(s.x, s.y)
        .setRotation(key==='projectile-flak'?flakFlightBearing(s,view.players.find(p=>p.id===s.owner)?.kit.heavyFlakShotAim):key==='projectile-arrow'?Math.atan2(s.vy,s.vx):0)
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
