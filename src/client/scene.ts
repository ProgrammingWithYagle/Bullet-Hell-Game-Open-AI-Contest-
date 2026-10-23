import Phaser from 'phaser';
import { assets } from './assets.ts';
import type { View, PlayerView } from '../shared/view.ts';
import type { Event, Shot } from '../shared/protocol.ts';
import { arena, data } from '../shared/game.ts';
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
  private shadows!: Phaser.GameObjects.Graphics;
  private hazards!: Phaser.GameObjects.Graphics;
  private bullets!: Phaser.GameObjects.Graphics;
  private foreground!: Phaser.GameObjects.Graphics;
  private bossSprite!: Phaser.GameObjects.Sprite;
  private shots = new Map<number, Shot>();
  private lastPhase = '';
  readonly frameTimes: number[] = [];
  ready = false;
  constructor() {
    super('combat');
  }
  preload() {
    this.load.on('loaderror', () => this.rejectReady(Error('ui.errorServer')));
    this.load.image('gatehouse', assets.arena);
    this.load.spritesheet('soldier', assets.soldier, { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('constable', assets.boss, { frameWidth: 512, frameHeight: 512 });
    this.load.image('medic', assets.medic);
  }
  create() {
    this.add.image(800, 500, 'gatehouse').setDisplaySize(1600, 1000).setAlpha(0.8);
    this.add.rectangle(800, 500, 1600, 1000, 0x172b29, 0.18);
    this.shadows = this.add.graphics().setDepth(1);
    this.hazards = this.add.graphics().setDepth(2);
    this.bullets = this.add.graphics().setDepth(20);
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
    this.bossSprite = this.add
      .sprite(800, 315, 'constable', 0)
      .setOrigin(0.5, 0.84)
      .setDisplaySize(300, 300)
      .setDepth(5);
    this.ready = true;
    this.resolveReady();
  }
  apply(view: View) {
    if (this.lastPhase && view.phase !== this.lastPhase) this.shots.clear();
    this.lastPhase = view.phase;
    this.view = view;
  }
  ingest(events: Event[]) {
    for (const event of events) {
      if (event.type === 'shots')
        for (const shot of event.shots) this.shots.set(shot.id, { ...shot });
      if (event.type === 'remove') {
        if (!event.ids.length) this.shots.clear();
        for (const id of event.ids) this.shots.delete(id);
      }
    }
  }
  update(_time: number, delta: number) {
    if (!this.ready || !this.view) return;
    this.frameTimes.push(delta);
    if (this.frameTimes.length > 3600) this.frameTimes.shift();
    const view = this.view,
      dt = Math.min(delta, 100) / 1000,
      now = view.combatTick;
    this.shadows.clear();
    this.hazards.clear();
    this.bullets.clear();
    this.foreground.clear();
    const h = this.hazards,
      b = this.bullets,
      f = this.foreground;
    for (const rect of arena.obstacles) {
      this.shadows
        .fillStyle(0x132623, 0.85)
        .fillRoundedRect(rect.x, rect.y + 8, rect.width, rect.height, 10);
      this.shadows
        .fillStyle(0x687b6e, 0.9)
        .fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 10);
      this.shadows
        .lineStyle(3, 0xb9be9a, 0.6)
        .strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 10);
    }
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
    this.bossSprite.setVisible(view.phase === 'combat');
    this.bossSprite.setAlpha(now < view.boss.staggerUntil ? 0.55 : 1);
    if (
      view.warnings.some((w) => w.kind === 'fan') &&
      !this.bossSprite.anims.isPlaying &&
      !this.reduceMotion
    )
      this.bossSprite.play('constable-attack');
    if (view.phase === 'combat' && this.hitboxes)
      f.lineStyle(2, 0xf2c487, 0.65).strokeCircle(
        view.boss.x,
        view.boss.y,
        data.bosses.find((b) => b.id === 'constable')!.radius,
      );
    const existing = new Set<string>();
    for (const actual of view.players) {
      existing.add(actual.id);
      const p = actual.id === this.localId && this.predicted ? this.predicted : actual;
      let sprite = this.people.get(p.id);
      if (!sprite) {
        sprite = this.add
          .sprite(p.x, p.y, p.classId)
          .setOrigin(0.5, 0.86)
          .setDisplaySize(p.classId === 'medic' ? 72 : 128, p.classId === 'medic' ? 108 : 128);
        this.people.set(p.id, sprite);
      }
      const dx = p.x - sprite.x,
        dy = p.y - sprite.y,
        moving = Math.hypot(dx, dy) > 0.35,
        blend = p.id === this.localId ? 1 : Math.min(1, delta / 65);
      sprite.x += dx * blend;
      sprite.y += dy * blend;
      sprite.setDepth(5 + sprite.y / 1000);
      sprite.setFlipX(Math.cos(p.aim) < 0);
      sprite.setAlpha(
        p.status === 'waiting' ? 0.35 : p.status === 'eliminated' ? 0.2 : p.connected ? 1 : 0.4,
      );
      sprite.setTint(p.status === 'downed' ? 0xc58d7c : 0xffffff);
      if (p.classId === 'soldier') {
        if (moving && !this.reduceMotion && p.status === 'active') sprite.play('soldier-run', true);
        else {
          sprite.anims.stop();
          sprite.setFrame(0);
        }
      }
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
      }
    for (const [id, s] of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (now >= s.expires || s.x < 0 || s.x > 1600 || s.y < 0 || s.y > 1000) {
        this.shots.delete(id);
        continue;
      }
      const hostile = s.owner === 'hostile';
      b.fillStyle(hostile ? 0x44242c : 0x24453f, 1).fillCircle(s.x, s.y, s.radius + 2);
      b.fillStyle(hostile ? (this.highContrast ? 0xffc23e : 0xf08370) : 0xa7dcd0, 1).fillCircle(
        s.x,
        s.y,
        s.radius,
      );
      if (hostile) b.fillStyle(0xffe9b0, 1).fillCircle(s.x, s.y, Math.max(1, s.radius * 0.35));
    }
  }
}
