import Phaser from 'phaser';
import type { EndlessCue } from '../shared/endless-director.ts';
import { encounterArt } from './encounter-presentation.ts';
/** Draw the actual signature shapes, including harmless history and route markers. */
export class EndlessPresentation {
  private images = new Map<number, Phaser.GameObjects.Image>();
  private labels = new Map<number, Phaser.GameObjects.Text>();
  constructor(private scene: Phaser.Scene) {}
  draw(
    h: Phaser.GameObjects.Graphics,
    f: Phaser.GameObjects.Graphics,
    cues: EndlessCue[],
    now: number,
    reduced: boolean,
    hitboxes: boolean,
  ) {
    const alive = new Set<number>(),
      texts = new Set<number>();
    const image = (
      id: number,
      key: string,
      x: number,
      y: number,
      w: number,
      height = w,
      frame = 0,
      originY = 0.5,
      rotation = 0,
    ) => {
      if (!this.scene.textures.exists(key)) return;
      alive.add(id);
      let im = this.images.get(id);
      if (!im) {
        im = this.scene.add.image(x, y, key, frame);
        this.images.set(id, im);
      }
      im.setTexture(key, frame)
        .setPosition(x, y)
        .setOrigin(0.5, originY)
        .setDisplaySize(w, height)
        .setDepth(5 + y / 1000)
        .setRotation(rotation);
    };
    const label = (id: number, text: string, x: number, y: number) => {
      texts.add(id);
      let t = this.labels.get(id);
      if (!t) {
        t = this.scene.add
          .text(x, y, text, {
            fontFamily: 'sans-serif',
            fontSize: '19px',
            fontStyle: 'bold',
            color: '#f2dfad',
            backgroundColor: '#16352d',
            padding: { x: 5, y: 3 },
          })
          .setOrigin(0.5);
        this.labels.set(id, t);
      }
      t.setText(text).setPosition(x, y).setDepth(8);
    };
    const circle = (x: number, y: number, r: number, color: number, alpha = 0.02) => {
      h.lineStyle(3, color, 0.9).strokeCircle(x, y, r);
      h.fillStyle(color, alpha).fillCircle(x, y, r);
    };
    const arrow = (x: number, y: number, a: number, color: number) => {
      const dx = Math.cos(a),
        dy = Math.sin(a);
      h.lineStyle(2, color, 0.9)
        .lineBetween(x - dx * 16, y - dy * 16, x + dx * 16, y + dy * 16)
        .lineBetween(x + dx * 16, y + dy * 16, x + dx * 5 - dy * 8, y + dy * 5 + dx * 8)
        .lineBetween(x + dx * 16, y + dy * 16, x + dx * 5 + dy * 8, y + dy * 5 - dx * 8);
    };
    for (const c of cues) {
      if (now >= c.until) continue;
      const active = now >= c.at,
        color = active ? 0xee9e7b : 0xe5d099;
      if (c.kind === 'endless-line') {
        const guide = ['replay', 'entry', 'exit', 'fold'].includes(c.style),
          tint = c.style === 'exit' ? 0xa9ccd0 : color;
        if (c.style === 'replay') {
          const dx = c.x2 - c.x1,
            dy = c.y2 - c.y1,
            d = Math.hypot(dx, dy);
          h.lineStyle(1, c.index ? 0xb6d5c3 : tint, 0.45);
          for (let i = 0; i < d; i += 28) {
            const a = i / d,
              z = Math.min(d, i + 13) / d;
            h.lineBetween(c.x1 + dx * a, c.y1 + dy * a, c.x1 + dx * z, c.y1 + dy * z);
          }
          continue;
        }
        h.lineStyle(
          guide ? 2 : c.width,
          tint,
          c.disabled ? 0.12 : guide ? 0.8 : active ? 0.3 : 0.09,
        ).lineBetween(c.x1, c.y1, c.x2, c.y2);
        if (!guide && !c.disabled) {
          h.fillStyle(tint, active ? 0.3 : 0.09)
            .fillCircle(c.x1, c.y1, c.width / 2)
            .fillCircle(c.x2, c.y2, c.width / 2);
        }
        h.lineStyle(2, tint, 0.9).lineBetween(c.x1, c.y1, c.x2, c.y2);
        if (c.style === 'entry' || c.style === 'exit')
          arrow((c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2, Math.atan2(c.y2 - c.y1, c.x2 - c.x1), tint);
        if (c.style === 'trail') label(c.id, String(c.index + 1), c.x1, c.y1 - 18);
      } else if (c.kind === 'endless-marker') {
        if (c.style === 'moth') {
          if (!active) {
            h.lineStyle(1, 0xdacb9c, 0.25).lineBetween(
              c.centerX,
              c.centerY,
              c.centerX + c.pathWidth,
              c.centerY,
            );
            continue;
          }
          const clip = encounterArt.find((e) => e.bossId === 'moth')!;
          image(
            c.id,
            'moth-action',
            c.x,
            c.y,
            clip.displayCell,
            clip.displayCell,
            reduced ? 0 : Math.floor((now - c.at) / 3) % 8,
            0.5,
            c.angle + Math.PI / 2,
          );
          if (hitboxes) circle(c.x, c.y, c.radius, color);
        } else {
          const safe = c.style === 'safe-orbit';
          h.lineStyle(safe ? 3 : 1, safe ? 0xb3dbc3 : 0xc2b79a, safe ? 0.6 : 0.22).strokeCircle(
            c.centerX,
            c.centerY,
            c.orbit,
          );
          circle(c.x, c.y, c.radius, safe ? 0xb8e0c7 : color, safe ? 0.01 : active ? 0.28 : 0.04);
          if (!safe) image(c.id, 'endless-prop-3', c.x, c.y, 44);
          else {
            h.lineStyle(3, 0xb8e0c7, 0.9).strokeRect(c.x - 11, c.y - 11, 22, 22);
          }
        }
      } else if (c.kind === 'endless-pad') {
        circle(c.x, c.y, c.radius, c.correct ? 0xb4dfc5 : 0xbdc7b1, c.correct ? 0.045 : 0.015);
        label(c.id, String(c.index + 1), c.x, c.y);
        if (c.index === 0) h.lineStyle(3, 0xe9d5aa, 0.9).strokeCircle(c.x, c.y, 30);
        else if (c.index === 1)
          h.lineStyle(3, 0xe9d5aa, 0.9).strokeRect(c.x - 30, c.y - 30, 60, 60);
        else
          h.lineStyle(3, 0xe9d5aa, 0.9).strokeTriangle(
            c.x,
            c.y - 35,
            c.x - 33,
            c.y + 28,
            c.x + 33,
            c.y + 28,
          );
        if (c.correct) arrow(c.x, c.y - c.radius - 27, Math.PI / 2, 0xb4dfc5);
      } else if (c.kind === 'endless-prop') {
        if (c.health <= 0) continue;
        if (c.role === 'core' && !active) {
          circle(c.x, c.y, 17, 0x8d9d91);
          continue;
        }
        image(
          c.id,
          'endless-prop-' + (c.role === 'core' ? 2 : c.index),
          c.x,
          c.y,
          c.role === 'block' ? c.width : c.radius * 2.8,
          c.role === 'block' ? c.height : c.radius * 2.8,
        );
        if (c.role === 'block') {
          h.lineStyle(2, active ? 0xc2ccb6 : color, 0.9).strokeRect(
            c.x - c.width / 2,
            c.y - c.height / 2,
            c.width,
            c.height,
          );
          h.lineStyle(2, 0xc3d1b7, 0.4).strokeRect(
            c.endX - c.width / 2,
            c.endY - c.height / 2,
            c.width,
            c.height,
          );
          arrow(c.endX, c.endY, Math.atan2(c.endY - c.startY, c.endX - c.startX), 0xb8d8c2);
        } else circle(c.x, c.y, c.radius, 0xe8d59d, 0.04);
        f.fillStyle(0x10281f, 1).fillRect(
          c.x - 24,
          c.y + (c.height || c.radius * 2) / 2 + 10,
          48,
          4,
        );
        f.fillStyle(0xc3dfb5, 1).fillRect(
          c.x - 24,
          c.y + (c.height || c.radius * 2) / 2 + 10,
          (48 * c.health) / c.maxHealth,
          4,
        );
      } else if (c.kind === 'endless-echo') {
        circle(c.x, c.y, c.radius, color, active ? 0.2 : 0.025);
        label(c.id, String(c.index + 1), c.x, c.y);
        if (!active) circle(c.x, c.y, Math.max(12, c.radius * (1 - (c.at - now) / 80)), 0xd4c9a4);
      } else if (c.kind === 'endless-ring') {
        const radius = c.radius,
          start = c.gapAngle + c.gap / 2,
          end = c.gapAngle + Math.PI * 2 - c.gap / 2;
        h.lineStyle(c.width, color, active ? 0.35 : 0.1)
          .beginPath()
          .arc(c.x, c.y, radius, start, end)
          .strokePath();
        arrow(
          c.x + Math.cos(c.gapAngle) * radius,
          c.y + Math.sin(c.gapAngle) * radius,
          c.gapAngle,
          0xb7dfc5,
        );
      } else if (c.kind === 'endless-state') {
        if (c.style === 'fan') {
          if (!active)
            label(
              c.id,
              c.index === 1
                ? '↺ ' + Math.ceil((c.at - now) / 30)
                : String(Math.ceil((c.at - now) / 30)),
              c.x,
              c.y - 45,
            );
        } else if (c.style === 'dash' && !active) {
          circle(c.endX, c.endY, 37, 0xdacb9c);
          label(c.id, String(c.index + 1), c.endX, c.endY);
        } else if (c.style === 'beat') {
          const safe = c.history[0];
          label(c.id, String(c.index + 1) + ' / 4', c.x, c.y - 65);
          for (let n = 0; n < 4; n++)
            circle(
              c.x + (n - 1.5) * 27,
              c.y - 38,
              6,
              n === c.index ? 0xf0d4a1 : 0x9aac9e,
              n === c.index ? 0.5 : 0.03,
            );
        } else if (c.style === 'knock') {
          const fraction = Math.min(1, Math.max(0, (now - c.at) / 42)),
            angle = c.angle + ((fraction - 0.5) * 100 * Math.PI) / 180,
            arc = active ? (12 * Math.PI) / 180 : (100 * Math.PI) / 180,
            aim = active ? angle : c.angle;
          h.fillStyle(color, active ? 0.15 : 0.035)
            .slice(c.x, c.y, 420, aim - arc / 2, aim + arc / 2)
            .fillPath();
          h.lineStyle(3, color, 0.8)
            .beginPath()
            .arc(c.x, c.y, 420, aim - arc / 2, aim + arc / 2)
            .strokePath();
          arrow(
            c.x + Math.cos(c.angle + Math.PI) * 150,
            c.y + Math.sin(c.angle + Math.PI) * 150,
            c.angle + Math.PI,
            0xb9ddc6,
          );
          label(c.id, String(Math.min(3, Math.max(1, c.progress))) + ' / 3', c.x, c.y - 65);
        } else if (c.style === 'warp') {
          circle(c.endX, c.endY, 44, color);
          h.lineStyle(2, 0xc6d8bd, 0.6).lineBetween(c.x, c.y, c.endX, c.endY);
        } else if (c.style === 'summon' && !active) circle(c.x, c.y, 95, color);
      }
    }
    for (const [id, im] of this.images)
      if (!alive.has(id)) {
        im.destroy();
        this.images.delete(id);
      }
    for (const [id, t] of this.labels)
      if (!texts.has(id)) {
        t.destroy();
        this.labels.delete(id);
      }
  }
}
