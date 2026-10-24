import Phaser from 'phaser';
import type { DistrictCue } from '../shared/district-director.ts';
import { encounterArt } from './encounter-presentation.ts';

/** Drawing only. Signature shape, timing, health and safe openings come from authority. */
export class DistrictPresentation {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private alive = new Set<string>();
  constructor(
    private scene: Phaser.Scene,
    private person: (id: string) => Phaser.GameObjects.Sprite | undefined,
  ) {}
  private image(
    id: string,
    key: string,
    x: number,
    y: number,
    w: number,
    h = w,
    frame: number | string = 0,
    alpha = 1,
    angle = 0,
  ) {
    if (!this.scene.textures.exists(key)) return;
    this.alive.add(id);
    let image = this.images.get(id);
    if (!image) {
      image = this.scene.add.image(x, y, key, frame);
      this.images.set(id, image);
    }
    image
      .setTexture(key, frame)
      .setPosition(x, y)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(w, h)
      .setAlpha(alpha)
      .setRotation(angle)
      .setDepth(5 + y / 1000);
  }
  draw(
    h: Phaser.GameObjects.Graphics,
    f: Phaser.GameObjects.Graphics,
    cues: DistrictCue[],
    now: number,
    reduced: boolean,
    hitboxes: boolean,
  ) {
    this.alive.clear();
    const circle = (x: number, y: number, r: number, color: number, fill = 0) => {
      h.lineStyle(3, color, 0.9).strokeCircle(x, y, r);
      if (fill) h.fillStyle(color, fill).fillCircle(x, y, r);
    };
    const rect = (x: number, y: number, w: number, height: number, color: number, fill = 0) => {
      h.lineStyle(3, color, 0.9).strokeRect(x - w / 2, y - height / 2, w, height);
      if (fill) h.fillStyle(color, fill).fillRect(x - w / 2, y - height / 2, w, height);
    };
    const arrow = (x: number, y: number, a: number, color: number, size = 26) => {
      h.lineStyle(2, color, 0.9).lineBetween(
        x - Math.cos(a) * size,
        y - Math.sin(a) * size,
        x + Math.cos(a) * size,
        y + Math.sin(a) * size,
      );
      for (const d of [-0.65, 0.65])
        h.lineBetween(
          x + Math.cos(a) * size,
          y + Math.sin(a) * size,
          x + Math.cos(a) * size - Math.cos(a + d) * 12,
          y + Math.sin(a) * size - Math.sin(a + d) * 12,
        );
    };
    for (const cue of cues) {
      if (now >= cue.until) continue;
      const active = now >= cue.at,
        color = active ? 0xf19a77 : 0xe4cf91,
        id = String(cue.id);
      if (cue.kind === 'district-prop') {
        if (cue.health <= 0) continue;
        const key =
          cue.role === 'core'
            ? 'detail-0'
            : 'signature-' +
              ({ coffin: 0, ridge: 1, anchor: 2, drone: 3, fragment: 4 } as const)[cue.role];
        const width = cue.width || cue.radius * 2.8,
          height = cue.height || cue.radius * 2.8;
        this.image(id, 'pilgrimage-prop-' + key, cue.x, cue.y, width + 16, height + 16);
        f.fillStyle(0x071713, 0.9).fillRect(cue.x - 26, cue.y + height / 2 + 7, 52, 5);
        f.fillStyle(cue.role === 'core' ? 0xe9c877 : 0xc3dfb5, 1).fillRect(
          cue.x - 26,
          cue.y + height / 2 + 7,
          (52 * cue.health) / cue.maxHealth,
          5,
        );
        if (hitboxes) {
          if (cue.width) rect(cue.x, cue.y, cue.width, cue.height, 0xe9d5a0);
          else circle(cue.x, cue.y, cue.radius, 0xe9d5a0);
        }
        if (cue.role === 'fragment') {
          const remaining = cue.until - now;
          h.lineStyle(3, remaining < 45 ? 0xf1a080 : 0xc7d0b3, 0.9)
            .beginPath()
            .arc(
              cue.x,
              cue.y,
              Math.max(width, height) / 2 + 14,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * Math.min(1, remaining / 90),
            )
            .strokePath();
        }
      } else if (cue.kind === 'district-line') {
        const lineColor = cue.disabled ? 0xaedec3 : color;
        h.lineStyle(
          cue.disabled ? 2 : cue.width,
          lineColor,
          cue.disabled ? 0.5 : active ? 0.38 : 0.14,
        ).lineBetween(cue.x1, cue.y1, cue.x2, cue.y2);
        h.lineStyle(cue.disabled ? 1 : 2, lineColor, 0.95).lineBetween(
          cue.x1,
          cue.y1,
          cue.x2,
          cue.y2,
        );
        if (cue.style === 'harp') {
          const mid = { x: (cue.x1 + cue.x2) / 2, y: (cue.y1 + cue.y2) / 2 };
          for (let n = 0; n <= cue.index; n++)
            circle(mid.x + 14, mid.y + (n - cue.index / 2) * 13, 3, lineColor, 1);
        }
        if (cue.disabled)
          arrow(
            (cue.x1 + cue.x2) / 2,
            (cue.y1 + cue.y2) / 2,
            Math.atan2(cue.y2 - cue.y1, cue.x2 - cue.x1) + Math.PI / 2,
            lineColor,
            17,
          );
      } else if (cue.kind === 'district-area') {
        const neutral = cue.style === 'cleanse' || cue.style === 'valve',
          safe = cue.disabled || neutral;
        const tint = safe
          ? 0xa7d9c3
          : cue.style === 'ice' || cue.style === 'water'
            ? 0xa5c5d0
            : color;
        if (cue.style === 'seal') {
          if (!cue.disabled) {
            this.image(id, 'pilgrimage-prop-signature-6', cue.x, cue.y - 65, 31, 38);
            circle(cue.x, cue.y, 16, 0xd79880);
          }
          continue;
        }
        if (cue.style === 'ghost') {
          if (!active) continue;
          if (cue.targetId === 'regent') {
            const clip = encounterArt.find((e) => e.bossId === 'regent');
            if (clip)
              this.image(
                id,
                'regent-action',
                cue.x,
                cue.y - clip.displayCell * 0.33,
                clip.displayCell,
                clip.displayCell,
                0,
                0.35,
              );
          } else {
            const source = this.person(cue.targetId);
            if (source)
              this.image(
                id,
                source.texture.key,
                cue.x,
                cue.y - source.displayHeight * 0.3,
                source.displayWidth,
                source.displayHeight,
                source.frame.name,
                0.35,
              );
          }
          circle(cue.x, cue.y, 11, 0xb3ccbc, 0.03);
          continue;
        }
        if (cue.radius) circle(cue.x, cue.y, cue.radius, tint, active && !safe ? 0.12 : 0.025);
        else if (cue.width) rect(cue.x, cue.y, cue.width, cue.height, tint, active ? 0.1 : 0.025);
        if (cue.style === 'valve') {
          this.image(
            id,
            'pilgrimage-prop-' + (cue.targetId === 'cool' ? 'signature-7' : 'signature-5'),
            cue.x,
            cue.y,
            45,
            45,
            0,
            cue.disabled ? 0.45 : 1,
          );
          h.lineStyle(5, 0xece1b5, 0.95)
            .beginPath()
            .arc(
              cue.x,
              cue.y,
              Math.max(25, cue.radius - 12),
              -Math.PI / 2,
              -Math.PI / 2 +
                Math.PI * 2 * Math.min(1, cue.progress / (cue.targetId === 'salt' ? 60 : 36)),
            )
            .strokePath();
        } else if (cue.style === 'cleanse') {
          h.lineStyle(3, 0xc5dfbd, 1).strokeRect(cue.x - 12, cue.y - 12, 24, 24);
          h.lineBetween(cue.x - 7, cue.y, cue.x + 7, cue.y).lineBetween(
            cue.x,
            cue.y - 7,
            cue.x,
            cue.y + 7,
          );
        } else if (cue.style === 'vent') {
          if (cue.disabled) {
            h.lineStyle(4, tint, 1)
              .lineBetween(cue.x - 15, cue.y, cue.x - 3, cue.y + 12)
              .lineBetween(cue.x - 3, cue.y + 12, cue.x + 20, cue.y - 15);
          } else for (const dx of [-24, 0, 24]) arrow(cue.x + dx, cue.y, -Math.PI / 2, tint, 20);
        } else if (cue.style === 'puddle') {
          if (cue.progress === 1)
            for (let i = 0; i < 3; i++)
              circle(
                cue.x + (i - 1) * 17,
                cue.y - 10 - (reduced ? 0 : (now + i * 7) % 25),
                3 + i,
                tint,
                0.1,
              );
          else {
            h.lineStyle(2, tint, 0.6).strokeCircle(cue.x, cue.y, 18);
          }
        } else if (cue.style === 'ice') {
          for (let i = -1; i <= 1; i++)
            h.lineStyle(2, tint, 0.6).lineBetween(
              cue.x - 30,
              cue.y + i * 75 + 25,
              cue.x + 30,
              cue.y + i * 75 - 25,
            );
        } else if (cue.style === 'water') {
          for (let i = -1; i <= 1; i++)
            h.lineStyle(2, tint, 0.55).lineBetween(
              cue.x - Math.min(cue.width / 3, 80),
              cue.y + i * 22,
              cue.x + Math.min(cue.width / 3, 80),
              cue.y + i * 22,
            );
        }
      } else if (cue.kind === 'district-ring') {
        // Draw the same union of safe openings the swept collision tests use.
        const radius = cue.radius;
        if (cue.style === 'swarm' && active) {
          h.lineStyle(1, 0xc4d6b2, 0.2).strokeCircle(cue.x, cue.y, cue.radius);
          for (const gap of cue.gaps)
            arrow(
              cue.x + Math.cos(gap.angle) * cue.radius,
              cue.y + Math.sin(gap.angle) * cue.radius,
              gap.angle,
              0xb5e0c7,
              20,
            );
          continue;
        }
        h.lineStyle(cue.width, color, active ? 0.38 : 0.12);
        const steps = 180;
        for (let i = 0; i < steps; i++) {
          const a = (i * Math.PI * 2) / steps,
            b = ((i + 1) * Math.PI * 2) / steps;
          const safe = cue.gaps.some(
            (g) =>
              Math.abs(
                Math.atan2(Math.sin((a + b) / 2 - g.angle), Math.cos((a + b) / 2 - g.angle)),
              ) <
              g.width / 2,
          );
          if (!safe)
            h.lineBetween(
              cue.x + Math.cos(a) * radius,
              cue.y + Math.sin(a) * radius,
              cue.x + Math.cos(b) * radius,
              cue.y + Math.sin(b) * radius,
            );
        }
        for (const gap of cue.gaps)
          arrow(
            cue.x + Math.cos(gap.angle) * radius,
            cue.y + Math.sin(gap.angle) * radius,
            gap.angle,
            0xb5e0c7,
            20,
          );
      } else if (cue.kind === 'district-bird') {
        if (!active) {
          h.lineStyle(1, 0xdccb9e, 0.25).lineBetween(cue.x, cue.y, cue.endX, cue.endY);
          arrow(
            cue.x + Math.cos(cue.angle) * 55,
            cue.y + Math.sin(cue.angle) * 55,
            cue.angle,
            0xe1cea1,
            17,
          );
          continue;
        }
        const clip = encounterArt.find((x) => x.bossId === 'crow');
        if (clip)
          this.image(
            id,
            'crow-action',
            cue.x,
            cue.y,
            clip.displayCell,
            clip.displayCell,
            reduced ? 0 : Math.floor((now - cue.at) / 3) % 8,
            1,
            cue.angle,
          );
        if (hitboxes) circle(cue.x, cue.y, cue.radius, 0xf1ae88);
      } else if (cue.kind === 'district-state') {
        if (cue.style === 'clock') {
          circle(cue.x, cue.y, 38, 0xd6c68e, 0.02);
          const a = -Math.PI / 2 + (active ? cue.progress : 0) * Math.PI * 2;
          h.lineStyle(4, 0xf1dca3, 0.9).lineBetween(
            cue.x,
            cue.y,
            cue.x + Math.cos(a) * 29,
            cue.y + Math.sin(a) * 29,
          );
        } else if (cue.style === 'armor') {
          rect(cue.x, cue.y, 110, 110, active ? 0xaeb7b2 : 0xd8c696, 0.02);
          h.lineStyle(3, 0xc3ccc2, 0.8).strokeRect(cue.x - 9, cue.y - 16, 18, 28);
        } else if (cue.style === 'warp' && cue.index !== -1) {
          circle(cue.endX, cue.endY, 40, 0xb9ccc0, 0.02);
          circle(cue.x, cue.y, 12, 0xc6c9ba, 0.08);
        } else if (cue.style === 'warp' && cue.index === -1) {
          h.lineStyle(3, color, 0.8).lineBetween(cue.x, cue.y, cue.x + cue.endX, cue.y + cue.endY);
          arrow(cue.x + cue.endX, cue.y + cue.endY, Math.atan2(cue.endY, cue.endX), color, 24);
        }
      }
    }
    for (const [id, image] of this.images)
      if (!this.alive.has(id)) {
        image.destroy();
        this.images.delete(id);
      }
  }
}
