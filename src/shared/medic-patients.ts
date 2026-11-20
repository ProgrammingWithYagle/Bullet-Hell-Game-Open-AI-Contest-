import { distance, segmentRect, type Rect } from './geometry.ts';
import type { Player } from './game.ts';
import type { Vec } from './protocol.ts';

export const activeCareParticipant = (player: Player | undefined): player is Player =>
  !!player && player.connected && !player.expired && player.status === 'active' && player.health > 0;

export const injuredCareParticipant = (player: Player | undefined): player is Player =>
  activeCareParticipant(player) && player.maxHealth - player.health > 1e-6;

export function careLineClear(from: Vec, to: Vec, obstacles: readonly Rect[]) {
  return obstacles.every(wall => segmentRect(from, to, wall, 1) === null);
}

export function aimedCarePatient(owner: Player, aim: number, players: ReadonlyMap<string, Player>,
  obstacles: readonly Rect[], range: number, facingDot: number, requireInjury = true) {
  const x = Math.cos(aim), y = Math.sin(aim);
  let closest: Player | undefined;
  let nearestDistance = Infinity;
  for (const peer of players.values()) {
    if (peer.id === owner.id || !activeCareParticipant(peer)) continue;
    const dx = peer.x - owner.x, dy = peer.y - owner.y;
    const span = Math.hypot(dx, dy);
    if (span > range || span > nearestDistance || dx * x + dy * y < span * facingDot) continue;
    if (span === nearestDistance && closest && peer.id >= closest.id) continue;
    closest = peer;
    nearestDistance = span;
  }
  const target = closest ?? owner;
  return activeCareParticipant(target) && (!requireInjury || injuredCareParticipant(target)) && (target.id === owner.id ||
    (distance(owner, target) <= range && careLineClear(owner, target, obstacles))) ? target : undefined;
}
