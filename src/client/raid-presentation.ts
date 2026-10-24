import Phaser from 'phaser';
import type { RaidCue } from '../shared/raid-director.ts';
import { encounterArt } from './encounter-presentation.ts';

/** Geometry and timing are authoritative. These sprites never add collision. */
export class RaidPresentation {
  private images = new Map<number, Phaser.GameObjects.Image>();
  private labels = new Map<number, Phaser.GameObjects.Text>();
  constructor(private scene: Phaser.Scene) {}
  draw(
    h: Phaser.GameObjects.Graphics,
    f: Phaser.GameObjects.Graphics,
    cues: RaidCue[],
    now: number,
    reduced: boolean,
    hitboxes: boolean,
  ) {
    const alive = new Set<number>(),
      labelled = new Set<number>();
    const image = (
      id: number,
      key: string,
      x: number,
      y: number,
      w: number,
      height = w,
      frame = 0,
      originY = 0.5,
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
        .setDepth(5 + y / 1000);
    };
    const circle = (x: number, y: number, r: number, color: number, fill = 0.02) => {
      h.lineStyle(3, color, 0.95).strokeCircle(x, y, r);
      h.fillStyle(color, fill).fillCircle(x, y, r);
    };
    for (const c of cues) {
      if (now >= c.until) continue;
      const active = now >= c.at,
        color = active ? 0xf0a07d : 0xe4d29c;
      if (c.kind === 'raid-prop') {
        if (c.health <= 0) continue;
        const part =
          c.role === 'keeper'
            ? 'bell-keeper'
            : c.role === 'attendant'
              ? 'throne-attendant'
              : undefined;
        if (part) {
          const clip = encounterArt.find((e) => e.bossId === part)!;
          const frame = reduced ? 0 : c.active && c.role === 'keeper' ? 3 : Math.floor(now / 5) % 2;
          image(
            c.id,
            part + '-action',
            c.x,
            c.y,
            clip.displayCell,
            clip.displayCell,
            frame,
            clip.origin[1],
          );
        } else {
          const index = ({ pylon: 0, rib: 1, core: 4, wall: 3 } as const)[
            c.role as 'pylon' | 'rib' | 'core' | 'wall'
          ];
          image(c.id, 'raid-prop-' + index, c.x, c.y, c.radius * 2.5);
        }
        const tint =
          c.role === 'rib' && !c.active
            ? 0x6d8075
            : c.active && c.role === 'keeper'
              ? 0xf4dba6
              : 0xc0dfc1;
        if (c.role === 'rib' || c.role === 'keeper' || hitboxes)
          circle(c.x, c.y, c.radius + 4, tint, 0.035);
        f.fillStyle(0x0e231d, 1).fillRect(c.x - 25, c.y + c.radius + 10, 50, 5);
        f.fillStyle(tint, 1).fillRect(
          c.x - 25,
          c.y + c.radius + 10,
          (50 * c.health) / c.maxHealth,
          5,
        );
        if (c.role === 'keeper' && c.active) {
          h.lineStyle(4, 0xf1dba3, 0.95)
            .beginPath()
            .arc(
              c.x,
              c.y,
              c.radius + 11,
              -Math.PI / 2,
              -Math.PI / 2 + (Math.PI * 2 * c.interrupt) / c.maximumInterrupt,
            )
            .strokePath();
        }
      } else if (c.kind === 'raid-lane') {
        const tint = c.disabled ? 0xaddfc1 : c.style === 'pull' ? 0xaec5cc : color;
        const width = c.disabled ? 2 : c.width,
          alpha = c.disabled ? 0.45 : active ? 0.28 : 0.09;
        h.lineStyle(width, tint, alpha).lineBetween(c.x1, c.y1, c.x2, c.y2);
        if (!c.disabled) {
          h.fillStyle(tint, alpha)
            .fillCircle(c.x1, c.y1, width / 2)
            .fillCircle(c.x2, c.y2, width / 2);
        }
        h.lineStyle(2, tint, 0.9).lineBetween(c.x1, c.y1, c.x2, c.y2);
        if (c.style === 'pull' && !c.disabled) {
          const sign = Math.sign(c.forceX) || 1;
          for (let i = 1; i <= 3; i++) {
            const x = c.x1,
              y = c.y1 + ((c.y2 - c.y1) * i) / 4;
            h.lineStyle(3, tint, 0.9)
              .lineBetween(x - 20 * sign, y, x + 20 * sign, y)
              .lineBetween(x + 20 * sign, y, x + 8 * sign, y - 10)
              .lineBetween(x + 20 * sign, y, x + 8 * sign, y + 10);
          }
        }
      } else if (c.kind === 'raid-pad') {
        const tint = c.disabled ? 0x7aab92 : 0xafdcc3;
        circle(c.x, c.y, c.radius, tint, 0.04);
        if (c.style === 'valve') {
          image(c.id, 'raid-prop-2', c.x, c.y, 48);
          labelled.add(c.id);
          let label = this.labels.get(c.id);
          if (!label) {
            label = this.scene.add
              .text(c.x, c.y, 'F', {
                fontFamily: 'sans-serif',
                fontSize: '15px',
                color: '#f0e3b9',
                backgroundColor: '#18352f',
              })
              .setOrigin(0.5);
            this.labels.set(c.id, label);
          }
          label
            .setPosition(c.x, c.y + 35)
            .setAlpha(c.disabled ? 0.4 : 1)
            .setDepth(8);
          h.lineStyle(5, 0xe9dca5, 1)
            .beginPath()
            .arc(
              c.x,
              c.y,
              34,
              -Math.PI / 2,
              -Math.PI / 2 + Math.PI * 2 * Math.min(1, c.progress / 45),
            )
            .strokePath();
        } else {
          h.lineStyle(3, tint, 0.95)
            .strokeRect(c.x - 16, c.y - 16, 32, 32)
            .lineBetween(c.x - 10, c.y, c.x + 10, c.y)
            .lineBetween(c.x, c.y - 10, c.x, c.y + 10);
        }
      } else if (c.kind === 'raid-state') {
        if (c.style === 'procession') {
          circle(c.endX, c.endY, 32, c.progress ? 0xafdcc3 : 0xe3d49f);
          h.lineStyle(2, 0xcbd2b3, 0.6).lineBetween(c.x, c.y, c.endX, c.endY);
        } else if (c.style === 'breath') {
          circle(c.x, c.y, 72, active ? 0xa7c6ce : 0xe3d49f);
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3,
              x = c.x + Math.cos(a) * 110,
              y = c.y + Math.sin(a) * 110;
            h.lineStyle(2, 0xa7c6ce, 0.75).lineBetween(
              x,
              y,
              c.x + Math.cos(a) * 80,
              c.y + Math.sin(a) * 80,
            );
          }
        } else if (c.style === 'exhale' && !active) {
          circle(c.x, c.y, 82 + c.index * 12, 0xd5c8a1);
        }
      }
    }
    for (const [id, im] of this.images)
      if (!alive.has(id)) {
        im.destroy();
        this.images.delete(id);
      }
    for (const [id, label] of this.labels)
      if (!labelled.has(id)) {
        label.destroy();
        this.labels.delete(id);
      }
  }
}
