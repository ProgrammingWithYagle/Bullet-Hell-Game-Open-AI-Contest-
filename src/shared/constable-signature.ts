import type { Boss } from './game.ts';
import { DT, HZ, type Vec, type Warning } from './protocol.ts';
import { clamp, distance, moveBody, segmentRect, type Rect } from './geometry.ts';

type Attack = {
  kind: string;
  count: number;
  speed: number;
  damage: number;
  telegraph: number;
  arc?: number;
  gap?: number;
  radius?: number;
  duration?: number;
};
type PatternContext = {
  boss: Boss;
  now: number;
  target: Vec;
  bounds: Rect;
  obstacles: Rect[];
  attack: Attack;
};
type PendingWarning = Omit<Warning, 'id'>;
const ticks = (seconds: number) => Math.ceil(seconds * HZ);
const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Every delayed volley is created now, with its own visible warning and a locked origin/aim.
export function constablePattern({
  boss,
  now,
  target,
  bounds,
  obstacles,
  attack: a,
}: PatternContext) {
  const warnings: PendingWarning[] = [];
  const aim = Math.atan2(target.y - boss.y, target.x - boss.x);
  const release = now + ticks(a.telegraph);
  const side = Math.floor(now / (HZ * 4)) % 2 ? 1 : -1;
  function openOrigin(point: Vec) {
    for (let f = 1; f >= 0; f -= 0.2) {
      const p = {
        x: clamp(boss.x + (point.x - boss.x) * f, bounds.x + 8, bounds.x + bounds.width - 8),
        y: clamp(boss.y + (point.y - boss.y) * f, bounds.y + 8, bounds.y + bounds.height - 8),
      };
      if (!obstacles.some((r) => segmentRect(p, p, r, 8))) return p;
    }
    return { x: boss.x, y: boss.y };
  }
  function volley(
    kind: 'fan' | 'ring',
    origin: Vec,
    angle: number,
    count: number,
    arc: number,
    at: number,
  ) {
    warnings.push({
      kind,
      x: origin.x,
      y: origin.y,
      aim: angle,
      count,
      arc,
      speed: a.speed,
      damage: a.damage,
      radius: 5,
      at,
      until: 0,
    });
  }
  if (a.kind === 'zone') {
    const count = Math.min(boss.phase >= 3 ? 5 : 4, a.count);
    // A spaced line, rather than overlapping randomly placed disks. No arena-wide closure.
    for (let n = 0; n < count; n++) {
      const offset = (n - (count - 1) / 2) * 160;
      const p = {
        x: clamp(
          target.x + Math.cos(aim + Math.PI / 2) * offset,
          bounds.x + 70,
          bounds.x + bounds.width - 70,
        ),
        y: clamp(
          target.y + Math.sin(aim + Math.PI / 2) * offset,
          bounds.y + 70,
          bounds.y + bounds.height - 70,
        ),
      };
      if (obstacles.some((r) => segmentRect(p, p, r, (a.radius ?? 60) + 10))) continue;
      warnings.push({
        kind: 'zone',
        ...p,
        aim: 0,
        count: 1,
        arc: 0,
        speed: 0,
        damage: a.damage,
        radius: a.radius ?? 60,
        at: release,
        until: release + ticks(a.duration ?? 2.4),
      });
    }
  } else if (boss.phase === 0) {
    volley('fan', boss, aim, a.count, radians(a.arc ?? 90), release);
    volley('fan', boss, aim + side * radians(12), a.count, radians(72), release + ticks(0.4));
  } else if (boss.phase === 1) {
    // Opposed flank origins make the trajectories cross at the warned target position.
    for (const flank of [-1, 1]) {
      const origin = openOrigin({
        x: boss.x + Math.cos(aim + Math.PI / 2) * flank * 175,
        y: boss.y + Math.sin(aim + Math.PI / 2) * flank * 175,
      });
      const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
      volley('fan', origin, angle, a.count, radians(a.arc ?? 60), release);
      volley(
        'fan',
        origin,
        angle + flank * radians(10),
        Math.max(3, a.count - 2),
        radians(50),
        release + ticks(0.5),
      );
    }
  } else {
    const gap = radians(a.gap ?? 95);
    const waves = boss.phase >= 3 ? 3 : 2;
    for (let wave = 0; wave < waves; wave++)
      volley(
        'ring',
        boss,
        aim + side * radians((wave - (waves - 1) / 2) * 18),
        a.count,
        gap,
        release + ticks(wave * 0.45),
      );
  }
  return { warnings, lastReleaseAt: Math.max(release, ...warnings.map((w) => w.at)) };
}

// Small, collision-resolved steps. Casts and Accords plant the feet; damage never stun-locks patrol.
export function moveConstable(
  boss: Boss,
  now: number,
  bounds: Rect,
  obstacles: Rect[],
  targets: Vec[],
  paused: boolean,
) {
  if (
    paused ||
    now <= 2 * HZ ||
    boss.health <= 0 ||
    now < boss.staggerUntil ||
    (now >= boss.castAt && now < boss.castEndsAt)
  )
    return;
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const target = targets.reduce<Vec | undefined>(
    (best, p) => (!best || distance(boss, p) < distance(boss, best) ? p : best),
    undefined,
  );
  const theta = now / (HZ * 4.5);
  let goal = {
    x: center.x + Math.cos(theta) * bounds.width * 0.27,
    y: center.y - Math.sin(theta) * bounds.height * 0.23,
  };
  if (boss.phase >= 2 && target) {
    const away = Math.atan2(boss.y - target.y, boss.x - target.x);
    goal = {
      x: target.x + Math.cos(away + Math.sin(theta) * 0.7) * 210,
      y: target.y + Math.sin(away + Math.sin(theta) * 0.7) * 210,
    };
  }
  const radius = 58;
  goal = {
    x: clamp(goal.x, bounds.x + radius, bounds.x + bounds.width - radius),
    y: clamp(goal.y, bounds.y + radius, bounds.y + bounds.height - radius),
  };
  const speed = [56, 76, 96, 108][Math.min(3, boss.phase)];
  const angle = Math.atan2(goal.y - boss.y, goal.x - boss.x);
  let best = { x: boss.x, y: boss.y },
    score = -Infinity;
  for (const turn of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
    const point = moveBody(
      boss,
      { x: Math.cos(angle + turn) * speed * DT, y: Math.sin(angle + turn) * speed * DT },
      radius,
      obstacles,
    );
    point.x = clamp(point.x, bounds.x + radius, bounds.x + bounds.width - radius);
    point.y = clamp(point.y, bounds.y + radius, bounds.y + bounds.height - radius);
    const progress = distance(boss, goal) - distance(point, goal);
    if (progress > score) {
      best = point;
      score = progress;
    }
  }
  boss.x = best.x;
  boss.y = best.y;
}
