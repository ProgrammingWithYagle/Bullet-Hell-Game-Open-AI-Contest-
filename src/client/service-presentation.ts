import Phaser from 'phaser';
import type { ServiceCue } from '../shared/service-director.ts';
import type { Rect } from '../shared/geometry.ts';
import { encounterArt } from './encounter-presentation.ts';
/** Disposable art only: all timing, health, paths and danger geometry come from simulation. */
export class ServicePresentation {
  private images = new Map<number, Phaser.GameObjects.Image>();
  private alive = new Set<number>();
  constructor(private scene: Phaser.Scene) {}
  private image(
    id: number,
    key: string,
    x: number,
    y: number,
    width: number,
    height = width,
    rotation = 0,
    frame = 0,
    alpha = 1,
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
      .setDisplaySize(width, height)
      .setRotation(rotation)
      .setAlpha(alpha)
      .setDepth(5 + y / 1000);
  }
  draw(
    h: Phaser.GameObjects.Graphics,
    f: Phaser.GameObjects.Graphics,
    cues: ServiceCue[],
    now: number,
    bounds: Rect,
    reduceMotion: boolean,
    hitboxes: boolean,
  ) {
    this.alive.clear();
    const arrow = (x: number, y: number, angle: number, color: number, length = 45) => {
      const c = Math.cos(angle),
        s = Math.sin(angle);
      h.lineStyle(3, color, 0.95).lineBetween(
        x - (c * length) / 2,
        y - (s * length) / 2,
        x + (c * length) / 2,
        y + (s * length) / 2,
      );
      for (const turn of [-0.65, 0.65])
        h.lineBetween(
          x + (c * length) / 2,
          y + (s * length) / 2,
          x + (c * length) / 2 - Math.cos(angle + turn) * 13,
          y + (s * length) / 2 - Math.sin(angle + turn) * 13,
        );
    };
    for (const cue of cues) {
      const active = now >= cue.at && now < cue.until,
        color = active ? 0xf19a77 : 0xe4cf91,
        opacity = active ? 0.85 : 0.6;
      if (cue.kind === 'service-prop') {
        const role = cue.role,
          index = role === 'nest' ? 0 : role === 'needle' ? 1 : role === 'root' ? 3 : -1;
        if (index >= 0)
          this.image(
            cue.id,
            'midnight-prop-' + index,
            cue.x,
            cue.y,
            role === 'nest' ? 90 : role === 'root' ? 62 : 54,
          );
        else {
          const clip = encounterArt.find((e) => e.bossId === 'choir-voice');
          if (clip) {
            const beam = cues.find(
                (c): c is Extract<ServiceCue, { kind: 'service-beam' }> =>
                  c.kind === 'service-beam' && c.dependencies.includes(cue.id) && !c.disabled,
              ),
              frame =
                cue.health <= 0
                  ? 7
                  : reduceMotion
                    ? 0
                    : beam
                      ? now < beam.at
                        ? beam.at - now > 15
                          ? 2
                          : 3
                        : now < beam.until
                          ? 5
                          : 6
                      : 0;
            this.image(
              cue.id,
              'choir-voice-action',
              cue.x,
              cue.y - 28,
              clip.displayCell * 0.65,
              clip.displayCell * 0.65,
              0,
              frame,
              cue.health <= 0 ? 0.4 : 1,
            );
          }
          for (let dot = 0; dot <= cue.index; dot++)
            h.fillStyle(0xe4cf91, 1).fillCircle(cue.x - 10 + dot * 9, cue.y + 35, 3);
        }
        if (hitboxes) h.lineStyle(2, 0xeddac0, 0.8).strokeCircle(cue.x, cue.y, cue.radius);
        if (cue.health > 0) {
          f.fillStyle(0x102822, 0.9).fillRect(cue.x - 28, cue.y - cue.radius - 15, 56, 6);
          f.fillStyle(0xd9bf87, 1).fillRect(
            cue.x - 28,
            cue.y - cue.radius - 15,
            (56 * cue.health) / cue.maxHealth,
            6,
          );
        }
      } else if (cue.kind === 'service-pool') {
        h.fillStyle(active ? 0xa6ae67 : 0xbccaa2, active ? 0.17 : 0.05).fillCircle(
          cue.x,
          cue.y,
          cue.radius,
        );
        h.lineStyle(active ? 4 : 2, active ? 0xd5bf7d : 0xc8d2ae, opacity).strokeCircle(
          cue.x,
          cue.y,
          cue.radius,
        );
        if (!active)
          h.lineStyle(2, 0xdfe0b5, 0.6).strokeCircle(
            cue.x,
            cue.y,
            Math.max(8, cue.radius * (1 - (cue.at - now) / 39)),
          );
      } else if (cue.kind === 'service-ring') {
        const radius = active ? Math.max(3, cue.radius) : 80,
          start = cue.gapAngle + cue.gap / 2,
          end = cue.gapAngle + Math.PI * 2 - cue.gap / 2;
        h.lineStyle(cue.width, active ? 0xf3c78c : 0xded9b2, opacity)
          .beginPath()
          .arc(cue.x, cue.y, radius, start, end)
          .strokePath();
        arrow(
          cue.x + Math.cos(cue.gapAngle) * (radius + 25),
          cue.y + Math.sin(cue.gapAngle) * (radius + 25),
          cue.gapAngle,
          0xa7e0c6,
          35,
        );
      } else if (cue.kind === 'service-beam') {
        const cut = cue.cutAt > 0 && now >= cue.cutAt,
          beamColor = cut ? 0xa6e0bf : cue.disabled ? 0x648278 : color;
        h.lineStyle(
          active && !cut && !cue.disabled ? cue.width : 3,
          beamColor,
          cue.disabled ? 0.3 : opacity,
        ).lineBetween(cue.x1, cue.y1, cue.x2, cue.y2);
        if (!active && !cue.disabled) {
          h.lineStyle(1, 0xf0dfb4, 0.5).strokeCircle(cue.x1, cue.y1, 11);
          arrow(
            (cue.x1 + cue.x2) / 2,
            (cue.y1 + cue.y2) / 2,
            Math.atan2(cue.y2 - cue.y1, cue.x2 - cue.x1),
            beamColor,
            30,
          );
        }
        if (cut)
          h.lineStyle(2, 0xa6e0bf, 0.8).strokeCircle(
            (cue.x1 + cue.x2) / 2,
            (cue.y1 + cue.y2) / 2,
            16,
          );
      } else if (cue.kind === 'service-tether') {
        this.image(cue.id, 'midnight-prop-7', cue.x, cue.y, 52);
        h.lineStyle(cue.attached ? 6 : 2, cue.attached ? 0xf0b1a0 : 0xd8cc9e, 0.9).lineBetween(
          cue.x,
          cue.y,
          cue.endX,
          cue.endY,
        );
        h.lineStyle(3, color, 0.8).strokeCircle(cue.endX, cue.endY, cue.attached ? 18 : 70);
        h.lineStyle(6, 0xa2ddc4, 1)
          .beginPath()
          .arc(
            cue.x,
            cue.y,
            34,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * Math.min(1, cue.progress / 30),
          )
          .strokePath();
        f.fillStyle(0xd9bf87, 1).fillRect(
          cue.x - 24,
          cue.y - 40,
          (48 * cue.health) / cue.maxHealth,
          5,
        );
      } else if (cue.kind === 'service-loaf') {
        h.lineStyle(2, 0xe6c48c, 0.6).lineBetween(cue.x, cue.y, cue.endX, cue.endY);
        for (const turn of [-Math.PI / 3, Math.PI / 3])
          arrow(
            cue.endX + Math.cos(cue.angle + turn) * 45,
            cue.endY + Math.sin(cue.angle + turn) * 45,
            cue.angle + turn,
            0xe6c48c,
            50,
          );
        h.lineStyle(2, color, 0.8).strokeCircle(cue.endX, cue.endY, 26);
        this.image(cue.id, 'midnight-prop-4', cue.x, cue.y, 58, 58, cue.angle);
        if (hitboxes) h.lineStyle(1, 0xeddfbe, 1).strokeCircle(cue.x, cue.y, cue.radius);
      } else if (cue.kind === 'service-current') {
        h.fillStyle(0x83c9ce, active ? 0.12 : 0.04).fillRect(cue.x, cue.y, cue.width, cue.height);
        h.lineStyle(2, 0x9dd3d1, 0.75).strokeRect(cue.x, cue.y, cue.width, cue.height);
        for (let x = cue.x + 80; x < cue.x + cue.width; x += 180)
          arrow(x, cue.y + cue.height / 2, Math.atan2(cue.forceY, cue.forceX), 0xa5dcda, 60);
      } else if (cue.kind === 'service-rail') {
        const railColor = cue.open ? 0xa4dec5 : color;
        h.lineStyle(3, railColor, 0.7)
          .lineBetween(cue.x - cue.width / 2, cue.y, cue.x - cue.width / 2, cue.y + cue.height)
          .lineBetween(cue.x + cue.width / 2, cue.y, cue.x + cue.width / 2, cue.y + cue.height);
        for (let y = cue.y + 100; y < cue.y + cue.height; y += 180) {
          if (cue.open) arrow(cue.x, y, Math.PI / 2, railColor);
          else
            h.lineStyle(4, railColor, 0.95)
              .lineBetween(cue.x - 18, y - 18, cue.x + 18, y + 18)
              .lineBetween(cue.x + 18, y - 18, cue.x - 18, y + 18);
        }
        if (active && !cue.open) {
          this.image(
            cue.id,
            'midnight-prop-5',
            cue.x,
            cue.trainY + cue.trainHeight / 2,
            cue.trainHeight,
            cue.width,
            Math.PI / 2,
          );
          if (hitboxes)
            h.lineStyle(2, 0xeddfbe, 1).strokeRect(
              cue.x - cue.width / 2,
              cue.trainY,
              cue.width,
              cue.trainHeight,
            );
        }
      } else if (cue.kind === 'service-sanctuary') {
        if (active && !cue.neutralized) {
          if (cue.style === 'lamp')
            h.fillStyle(0xe99e78, 0.12).fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
          else h.lineStyle(cue.width, 0xf1ba91, 0.7).strokeCircle(cue.x, cue.y, cue.radius);
        }
        cue.pads.forEach((pad, index) => {
          h.fillStyle(0x183f33, 0.9).fillCircle(pad.x, pad.y, cue.safeRadius);
          h.lineStyle(4, 0xa6e4c8, 1).strokeCircle(pad.x, pad.y, cue.safeRadius);
          this.image(
            -cue.id * 10 - index,
            'midnight-prop-' + (cue.style === 'lamp' ? 2 : 6),
            pad.x,
            pad.y - 36,
            55,
          );
          if (cue.style === 'abbess')
            h.lineStyle(7, 0xf1dda6, 1)
              .beginPath()
              .arc(
                pad.x,
                pad.y,
                cue.safeRadius - 8,
                -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * Math.min(1, cue.progress[index] / 36),
              )
              .strokePath();
        });
      } else if (cue.kind === 'service-caliper') {
        h.fillStyle(color, active ? 0.22 : 0.04).fillCircle(cue.x, cue.y, cue.radius);
        h.lineStyle(active ? 5 : 3, color, 1).strokeCircle(cue.x, cue.y, cue.radius);
        const locked = now >= cue.lockAt;
        if (locked)
          h.lineStyle(3, 0xf1dfac, 1)
            .lineBetween(cue.x - 12, cue.y - 12, cue.x + 12, cue.y + 12)
            .lineBetween(cue.x + 12, cue.y - 12, cue.x - 12, cue.y + 12);
        else h.lineStyle(2, 0xf1dfac, 1).strokeCircle(cue.x, cue.y, 12);
      } else if (cue.kind === 'service-verdict') {
        h.fillStyle(color, active ? 0.26 : 0.07).fillRect(cue.x, cue.y, cue.width, cue.height);
        h.lineStyle(active ? 6 : 3, color, 0.9).strokeRect(cue.x, cue.y, cue.width, cue.height);
        arrow(
          cue.side ? cue.x - 45 : cue.x + cue.width + 45,
          cue.y + cue.height * 0.65,
          cue.side ? Math.PI : 0,
          0xa7e0c6,
          55,
        );
        for (let y = cue.y + 120; y < cue.y + cue.height; y += 180)
          h.lineStyle(3, color, 0.8)
            .lineBetween(cue.x + cue.width / 2 - 20, y - 20, cue.x + cue.width / 2 + 20, y + 20)
            .lineBetween(cue.x + cue.width / 2 + 20, y - 20, cue.x + cue.width / 2 - 20, y + 20);
      } else if (cue.kind === 'service-spiral') {
        h.lineStyle(2, 0xe0c396, 0.6).strokeCircle(cue.x, cue.y, 35);
        if (!reduceMotion)
          arrow(cue.x, cue.y, cue.angle + (cue.emitted * Math.PI * 2) / cue.count, 0xe0c396, 50);
      }
    }
    for (const [id, image] of this.images)
      if (!this.alive.has(id)) {
        image.destroy();
        this.images.delete(id);
      }
  }
}
