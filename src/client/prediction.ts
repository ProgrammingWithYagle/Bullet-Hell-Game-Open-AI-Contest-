import { moveBody, distance } from '../shared/geometry.ts';
import { gateObstacles, leaveClosingGates } from '../shared/civic-director.ts';
import { data } from '../shared/game.ts';
import { DT, HZ, type InputFrame } from '../shared/protocol.ts';
import type { PlayerView, View } from '../shared/view.ts';
export class Prediction {
  player: PlayerView | null = null;
  private pending: InputFrame[] = [];
  private tick = 0;
  acknowledge(view: View, id: string) {
    const p = view.players.find((p) => p.id === id);
    if (!p) return;
    this.player = { ...p };
    this.tick = view.combatTick;
    this.pending =
      view.phase === 'combat' ? this.pending.filter((i) => i.sequence > p.ack).slice(-120) : [];
    for (const i of this.pending) this.advance(i, view);
  }
  submit(input: InputFrame, view: View) {
    this.pending.push({ ...input });
    if (this.pending.length > 120) this.pending.shift();
    this.advance(input, view);
  }
  private advance(i: InputFrame, view: View) {
    const p = this.player;
    if (!p || view.phase !== 'combat' || p.status !== 'active') return;
    const now = ++this.tick,
      len = Math.hypot(i.moveX, i.moveY),
      mx = len > 1 ? i.moveX / len : i.moveX,
      my = len > 1 ? i.moveY / len : i.moveY;
    p.aim = i.aim;
    const gates = gateObstacles(view.bossCues, now);
    const clear = leaveClosingGates(p, gates, data.rules.playerRadius);
    p.x = clear.x;
    p.y = clear.y;
    if (i.dodge && now >= p.dodgeAt) {
      p.dashX = len ? mx : Math.cos(i.aim);
      p.dashY = len ? my : Math.sin(i.aim);
      p.dashUntil = now + Math.ceil(data.rules.dodgeDuration * HZ);
      p.dodgeAt = now + Math.ceil(data.rules.dodgeCooldown * p.dodgeCooldown * HZ);
    }
    const rally = Math.max(
        0,
        ...view.fields
          .filter((f) => f.kind === 'rally' && distance(p, f) <= f.radius)
          .map((f) => f.movement ?? 0),
      ),
      dash = now < p.dashUntil,
      speed = dash ? data.rules.dodgeSpeed : p.speed * (now < p.slowUntil ? 0.65 : 1) * (1 + rally);
    const next = moveBody(
      p,
      { x: (dash ? p.dashX : mx) * speed * DT, y: (dash ? p.dashY : my) * speed * DT },
      data.rules.playerRadius,
      [...data.arenas.find((a) => a.id === view.arenaId)!.obstacles, ...gates],
    );
    p.x = next.x;
    p.y = next.y;
  }
}
