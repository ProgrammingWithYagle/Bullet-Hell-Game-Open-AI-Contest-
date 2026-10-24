import Phaser from 'phaser';
import { assets } from './assets.ts';
import type { View, PlayerView } from '../shared/view.ts';
import type { Event, Shot } from '../shared/protocol.ts';
import { arena, data } from '../shared/game.ts';
import { FrameMeter } from './frame-meter.ts';
import { wardenArt, wardenCombatPose, type WardenCombatClipId } from './warden-presentation.ts';
import { heavyArt, heavyPose } from './heavy-presentation.ts';
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
  private facings = new Map<string, string>();
  private shadows!: Phaser.GameObjects.Graphics;
  private hazards!: Phaser.GameObjects.Graphics;
  private bulletImages = new Map<number, Phaser.GameObjects.Image>();
  private bulletPool: Phaser.GameObjects.Image[] = [];
  private foreground!: Phaser.GameObjects.Graphics;
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
    this.load.spritesheet('soldier', assets.soldier, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('constable', assets.boss, { frameWidth: 512, frameHeight: 512 });
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
    for (const [clip, url] of Object.entries(assets.warden)) {
      const size = wardenArt.clips[clip as WardenCombatClipId].cellSize;
      this.load.spritesheet('warden-' + clip, url, { frameWidth: size, frameHeight: size });
    }
    for (const [key, url] of Object.entries(assets.directions)) {
      if (key.endsWith('North') || key.endsWith('South'))
        this.load.spritesheet(key, url, { frameWidth: 256, frameHeight: 256 });
      else this.load.image(key, url);
    }
  }
  create() {
    this.add.image(800, 500, 'gatehouse').setDisplaySize(1600, 1000).setAlpha(0.8);
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
      frames: this.anims.generateFrameNumbers('constable', { start: 0, end: 7 }),
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
    const warden = view.boss.id === 'lantern-warden';
    this.bossSprite.setVisible(
      view.phase === 'combat' || (warden && view.boss.defeatedAt > 0 && view.boss.health <= 0),
    );
    this.bossSprite.setPosition(view.boss.x, view.boss.y + (warden ? 0 : 65));
    this.bossSprite.setAlpha(now < view.boss.staggerUntil ? 0.55 : 1);
    if (warden) {
      const pose = wardenCombatPose(view.boss, view.tick, now, view.signatures, this.reduceMotion);
      const clip = wardenArt.clips[pose.clip];
      this.bossSprite.anims.stop();
      this.bossSprite
        .setTexture('warden-' + pose.clip, pose.frame)
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
          .sprite(p.x, p.y, p.classId === 'heavy' ? 'heavy-reference' : p.classId)
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
      if (p.classId === 'heavy') {
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
        p.status === 'waiting' ? 0.35 : p.status === 'eliminated' ? 0.2 : p.connected ? 1 : 0.4,
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
