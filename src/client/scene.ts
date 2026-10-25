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
import type { View, PlayerView } from '../shared/view.ts';
import type { Event, Shot } from '../shared/protocol.ts';
import { runtimeArena } from '../shared/arena-layouts.ts';
import { data } from '../shared/game.ts';
import { FrameMeter } from './frame-meter.ts';
import { wardenArt, wardenCombatPose, type WardenCombatClipId } from './warden-presentation.ts';
import { survivorArt, survivorPose, additionalSurvivors } from './survivor-presentation.ts';
import { survivorActionArt, SurvivorActionClock } from './survivor-action-presentation.ts';
import { heavyArt, heavyPose } from './heavy-presentation.ts';
import { encounterArt, encounterFrame } from './encounter-presentation.ts';
import type { Sector } from '../shared/warden-signature.ts';
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
  highContrast = false;
  reduceMotion = false;
  private people = new Map<string, Phaser.GameObjects.Sprite>();
  private survivorActions = new SurvivorActionClock();
  private actors = new Map<number, Phaser.GameObjects.Sprite>();
  private facings = new Map<string, string>();
  private shadows!: Phaser.GameObjects.Graphics;
  private hazards!: Phaser.GameObjects.Graphics;
  private bulletImages = new Map<number, Phaser.GameObjects.Image>();
  private bulletPool: Phaser.GameObjects.Image[] = [];
  private foreground!: Phaser.GameObjects.Graphics;
  private propImages = new Map<number, Phaser.GameObjects.Image>();
  private arenaImage!: Phaser.GameObjects.Image;
  private arenaGround!: Phaser.GameObjects.Graphics;
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
  private animatedWarning = 0;
  private lastFrameClock = 0;
  readonly frameMeter = new FrameMeter();
  ready = false;
  diagnostics() {
    return {
      ...this.frameMeter.summary(),
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
    this.load.image('gatehouse', assets.arena);
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
    this.load.spritesheet('soldier', assets.soldier, {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('constable', assets.boss, {
      frameWidth: 512,
      frameHeight: 512,
    });
    this.load.image('medic', assets.medic);
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
    for (const clip of encounterArt)
      this.load.spritesheet(clip.bossId + '-action', assets.encounters[clip.bossId], {
        frameWidth: clip.cellSize,
        frameHeight: clip.cellSize,
      });
    for (const [clip, url] of Object.entries(assets.warden)) {
      const size = wardenArt.clips[clip as WardenCombatClipId].cellSize;
      this.load.spritesheet('warden-' + clip, url, {
        frameWidth: size,
        frameHeight: size,
      });
    }
    for (const [key, url] of Object.entries(assets.directions)) {
      if (key.endsWith('North') || key.endsWith('South'))
        this.load.spritesheet(key, url, { frameWidth: 256, frameHeight: 256 });
      else this.load.image(key, url);
    }
  }
  create() {
    this.serviceArt = new ServicePresentation(this);
    this.raidArt = new RaidPresentation(this);
    this.endlessArt = new EndlessPresentation(this);
    this.districtArt = new DistrictPresentation(this, (id) => this.people.get(id));
    this.arenaImage = this.add
      .image(800, 500, 'gatehouse')
      .setDisplaySize(1600, 1000)
      .setAlpha(0.8);
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
    this.anims.create({
      key: 'soldier-run',
      frames: this.anims.generateFrameNumbers('soldier', { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'constable-attack',
      frames: this.anims.generateFrameNumbers('constable', {
        start: 0,
        end: 7,
      }),
      frameRate: 10,
      repeat: 0,
    });
    for (const key of ['soldierNorth', 'soldierSouth', 'medicNorth', 'medicSouth'])
      this.anims.create({
        key: key + '-walk',
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    this.bossSprite = this.add
      .sprite(800, 315, 'constable', 0)
      .setOrigin(0.5, 0.84)
      .setDisplaySize(300, 300)
      .setDepth(5);
    this.ready = true;
    this.resolveReady();
  }
  apply(view: View) {
    this.survivorActions.observe(view);
    if (this.lastPhase && view.phase !== this.lastPhase) {
      for (const id of this.shots.keys()) this.recycleBullet(id);
      this.shots.clear();
    }
    this.lastPhase = view.phase;
    this.view = view;
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
      now = view.combatTick;
    if (this.lastArenaId !== view.arenaId) {
      this.lastArenaId = view.arenaId;
      const map = runtimeArena(view.arenaId);
      this.arenaImage.setVisible(map.id === 'gatehouse');
      const ground = this.arenaGround;
      ground.clear();
      this.coverImages.forEach((image) => image.destroy());
      this.coverImages = [];
      if (map.id !== 'gatehouse') {
        const color = Number.parseInt(map.floor.slice(1), 16),
          shade = Number.parseInt(map.shadow.slice(1), 16);
        ground.fillStyle(0x101e1b, 1).fillRect(0, 0, 1600, 1000);
        ground.fillStyle(color, 0.8).fillRect(map.bounds.x, map.bounds.y, map.width, map.height);
        ground.lineStyle(2, shade, 0.25);
        for (let y = map.bounds.y; y < map.bounds.y + map.height; y += 100)
          ground.lineBetween(map.bounds.x, y, map.bounds.x + map.width, y);
        for (let x = map.bounds.x; x < map.bounds.x + map.width; x += 160)
          ground.lineBetween(x, map.bounds.y, x, map.bounds.y + map.height);
        for (const obstacle of map.cover) {
          const image = this.add.image(
            obstacle.x + obstacle.width / 2,
            obstacle.y + obstacle.height / 2,
            'environment-' + map.prop,
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
        ground
          .lineStyle(5, shade, 0.8)
          .strokeRect(map.bounds.x + 3, map.bounds.y + 3, map.width - 6, map.height - 6);
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
    for (const cue of view.bossCues) {
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
      } else if (cue.kind === 'stamp') {
        const safe = cue.safeAt > 0 && now >= cue.safeAt,
          active = now >= cue.at;
        const color = safe ? 0x9be6c9 : active ? 0xe77e61 : 0xe7c583;
        h.fillStyle(color, safe ? 0.13 : active ? 0.23 : 0.07).fillCircle(cue.x, cue.y, cue.radius);
        h.lineStyle(safe ? 5 : 3, color, 1).strokeCircle(cue.x, cue.y, cue.radius);
        // Roman marks give the order without relying on color or font shaping.
        for (let mark = 0; mark < cue.index; mark++)
          h.lineStyle(4, color, 1).lineBetween(
            cue.x + (mark - (cue.index - 1) / 2) * 12,
            cue.y - 12,
            cue.x + (mark - (cue.index - 1) / 2) * 12,
            cue.y + 12,
          );
        if (safe)
          h.lineStyle(4, color, 1)
            .lineBetween(cue.x - 18, cue.y + 25, cue.x - 3, cue.y + 38)
            .lineBetween(cue.x - 3, cue.y + 38, cue.x + 24, cue.y + 10);
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
          .setVisible(now >= cue.at)
          .setRotation(this.reduceMotion ? 0 : cue.rotation);
        h.lineStyle(2, 0xe6bf72, 0.9).strokeCircle(cue.x, cue.y, cue.radius);
      } else if (cue.kind === 'chain') {
        const active = now >= cue.at,
          broken = cue.health <= 0,
          color = broken ? 0x8bc9a7 : 0xe6b875;
        if (!active && !broken)
          this.paintSector(
            h,
            {
              x: cue.x,
              y: cue.y,
              aim: cue.startAngle + cue.sweep / 2,
              arc: cue.sweep,
              radius: cue.length,
            },
            color,
            0.07,
            2,
          );
        if (active && !broken) {
          const end = {
            x: cue.x + Math.cos(cue.angle) * cue.length,
            y: cue.y + Math.sin(cue.angle) * cue.length,
          };
          h.lineStyle(cue.width, color, 0.65).lineBetween(cue.x, cue.y, end.x, end.y);
          for (let d = 30; d < cue.length; d += 26)
            h.lineStyle(2, 0x302d26, 1).strokeCircle(
              cue.x + Math.cos(cue.angle) * d,
              cue.y + Math.sin(cue.angle) * d,
              7,
            );
        }
        f.lineStyle(4, color, 1).strokeCircle(cue.x, cue.y, cue.radius);
        f.fillStyle(0x142b27, 1).fillRect(cue.x - 30, cue.y - 42, 60, 6);
        f.fillStyle(color, 1).fillRect(
          cue.x - 30,
          cue.y - 42,
          (60 * cue.health) / cue.maxHealth,
          6,
        );
        if (broken)
          f.lineStyle(3, color, 1).lineBetween(cue.x - 14, cue.y - 14, cue.x + 14, cue.y + 14);
      } else if (cue.kind === 'gate') {
        const active = now >= cue.at,
          color = cue.open ? 0x9be6c9 : 0xe88664;
        h.fillStyle(color, cue.open ? 0.05 : active ? 0.3 : 0.07).fillRect(
          cue.x,
          cue.y,
          cue.width,
          cue.height,
        );
        h.lineStyle(cue.open ? 4 : 3, color, 1).strokeRect(cue.x, cue.y, cue.width, cue.height);
        if (cue.open)
          h.lineStyle(4, color, 1).lineBetween(
            cue.x + cue.width / 2,
            cue.y + cue.height + 30,
            cue.x + cue.width / 2,
            cue.y - 30,
          );
        else
          for (let x = cue.x + 14; x < cue.x + cue.width; x += 28)
            h.lineStyle(active ? 7 : 2, color, active ? 0.85 : 0.5).lineBetween(
              x,
              cue.y,
              x,
              cue.y + cue.height,
            );
        for (let n = 0; n <= cue.lane; n++)
          f.lineStyle(4, color, 1).lineBetween(
            cue.x + cue.width / 2 + (n - cue.lane / 2) * 10,
            cue.y + cue.height / 2 - 10,
            cue.x + cue.width / 2 + (n - cue.lane / 2) * 10,
            cue.y + cue.height / 2 + 10,
          );
      } else if (cue.kind === 'driver') {
        f.lineStyle(4, 0xf4d99c, 1).strokeCircle(cue.x, cue.y, cue.radius);
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
      view.classCues.filter((c) => c.kind === 'turret' || c.kind === 'siege').map((c) => c.id),
    );
    for (const [id, image] of this.constructImages)
      if (!constructIds.has(id)) {
        image.destroy();
        this.constructImages.delete(id);
      }
    for (const cue of view.classCues) {
      const color =
        cue.kind === 'sigil' || cue.kind === 'requiem'
          ? 0xb9a6df
          : cue.kind === 'citadel'
            ? 0xe9c27a
            : 0x97d8c7;
      if (cue.kind === 'wall') {
        const cosine = Math.cos(cue.aim),
          sine = Math.sin(cue.aim),
          points = [
            [-12, -110],
            [12, -110],
            [12, 110],
            [-12, 110],
          ].map(
            ([x, y]) =>
              new Phaser.Math.Vector2(cue.x + x * cosine - y * sine, cue.y + x * sine + y * cosine),
          );
        h.fillStyle(color, 0.28).fillPoints(points, true);
        h.lineStyle(4, color, 1).strokePoints(points, true);
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
    this.endlessArt.draw(
      h,
      f,
      view.bossCues.filter((c): c is EndlessCue => c.kind.startsWith('endless-')),
      now,
      this.reduceMotion,
      this.hitboxes,
    );
    this.raidArt.draw(
      h,
      f,
      view.bossCues.filter((c): c is RaidCue => c.kind.startsWith('raid-')),
      now,
      this.reduceMotion,
      this.hitboxes,
    );
    this.districtArt.draw(
      h,
      f,
      view.bossCues.filter((c): c is DistrictCue => c.kind.startsWith('district-')),
      now,
      this.reduceMotion,
      this.hitboxes,
    );
    this.serviceArt.draw(
      h,
      f,
      view.bossCues.filter((c): c is ServiceCue => c.kind.startsWith('service-')),
      now,
      runtimeArena(view.arenaId).bounds,
      this.reduceMotion,
      this.hitboxes,
    );
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
          .arc(point.x, point.y, 58, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * a.progress) / 60)
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
    this.bossSprite.setPosition(view.boss.x, view.boss.y + (view.boss.id === 'constable' ? 65 : 0));
    this.bossSprite.setAlpha(now < view.boss.staggerUntil ? 0.55 : 1);
    if (warden) {
      const pose = wardenCombatPose(view.boss, view.tick, now, view.signatures, this.reduceMotion);
      const clip = wardenArt.clips[pose.clip];
      this.bossSprite.anims.stop();
      this.bossSprite
        .setTexture('warden-' + pose.clip, pose.frame)
        .setOrigin(clip.origin[0], clip.origin[1])
        .setDisplaySize(clip.displayCell, clip.displayCell);
    } else if (view.boss.id !== 'constable') {
      const clip = encounterArt.find((entry) => entry.bossId === view.boss.id)!;
      this.bossSprite.anims.stop();
      this.bossSprite
        .setTexture(
          view.boss.id + '-action',
          encounterFrame(view.boss, now, view.bossCues, this.reduceMotion),
        )
        .setOrigin(clip.origin[0], clip.origin[1])
        .setDisplaySize(clip.displayCell, clip.displayCell);
    } else {
      if (this.bossSprite.texture.key !== 'constable')
        this.bossSprite.setTexture('constable', 0).setOrigin(0.5, 0.84).setDisplaySize(300, 300);
      const cast = view.warnings.find((warning) => warning.kind !== 'zone');
      if (cast && cast.id !== this.animatedWarning && !this.reduceMotion) {
        this.animatedWarning = cast.id;
        this.bossSprite.play('constable-attack');
      }
      if (!cast && !this.bossSprite.anims.isPlaying) this.bossSprite.setFrame(0);
    }
    if (view.phase === 'combat' && this.hitboxes)
      f.lineStyle(2, 0xf2c487, 0.65).strokeCircle(
        view.boss.x,
        view.boss.y,
        data.bosses.find((boss) => boss.id === view.boss.id)!.radius,
      );
    const existing = new Set<string>();
    for (const actual of view.players) {
      existing.add(actual.id);
      const p = actual.id === this.localId && this.predicted ? this.predicted : actual;
      let sprite = this.people.get(p.id);
      if (!sprite) {
        sprite = this.add
          .sprite(
            p.x,
            p.y,
            p.classId === 'heavy' || additionalSurvivors.some((id) => id === p.classId)
              ? p.classId + '-reference'
              : p.classId,
          )
          .setOrigin(0.5, 0.86)
          .setDisplaySize(p.classId === 'medic' ? 72 : 128, p.classId === 'medic' ? 108 : 128);
        this.people.set(p.id, sprite);
      }
      const dx = p.x - sprite.x,
        dy = p.y - sprite.y,
        moving = Math.hypot(dx, dy) > 0.35,
        blend = p.id === this.localId ? 1 : Math.min(1, wallDelta / 65);
      sprite.x += dx * blend;
      sprite.y += dy * blend;
      sprite.setDepth(5 + sprite.y / 1000);
      const actionPose = this.survivorActions.pose(p, view, moving, this.reduceMotion);
      if (actionPose) {
        sprite.anims.stop();
        sprite
          .setTexture(actionPose.texture, actionPose.frame)
          .setFlipX(false)
          .setOrigin(actionPose.origin[0], actionPose.origin[1])
          .setDisplaySize(actionPose.displayCell, actionPose.displayCell);
      } else if (additionalSurvivors.some((id) => id === p.classId)) {
        const pose = survivorPose(p.classId, p.aim, moving, p.status, now, this.reduceMotion);
        sprite.anims.stop();
        sprite
          .setTexture(pose.texture, pose.frame)
          .setFlipX(false)
          .setOrigin(pose.origin[0], pose.origin[1])
          .setDisplaySize(pose.displayCell, pose.displayCell);
      } else if (p.classId === 'heavy') {
        const pose = heavyPose(p.aim, moving, p.status, now, this.reduceMotion);
        sprite.anims.stop();
        sprite
          .setTexture(pose.texture, pose.frame)
          .setFlipX(false)
          .setOrigin(pose.origin[0], pose.origin[1])
          .setDisplaySize(pose.displayCell, pose.displayCell);
      } else {
        const vertical = Math.abs(Math.sin(p.aim)) > Math.abs(Math.cos(p.aim));
        const facing = vertical
          ? Math.sin(p.aim) < 0
            ? 'North'
            : 'South'
          : Math.cos(p.aim) < 0
            ? 'West'
            : 'East';
        const key = vertical || p.classId === 'medic' ? p.classId + facing : 'soldier';
        if (this.facings.get(p.id) !== facing) {
          sprite.anims.stop();
          sprite.setTexture(key, 0);
          this.facings.set(p.id, facing);
        }
        sprite.setOrigin(0.5, key === 'soldier' ? 0.86 : 232 / 256).setDisplaySize(128, 128);
        sprite.setFlipX(key === 'soldier' && facing === 'West');
        if (vertical || p.classId === 'soldier') {
          if (moving && !this.reduceMotion && p.status === 'active')
            sprite.play(vertical ? key + '-walk' : 'soldier-run', true);
          else {
            sprite.anims.stop();
            sprite.setFrame(0);
          }
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
      sprite.setTint(p.status === 'downed' ? 0xc58d7c : 0xffffff);
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
        this.facings.delete(id);
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
