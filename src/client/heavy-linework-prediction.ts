import catalog from '../../content/catalog.json';
import { HZ } from '../shared/protocol.ts';
import { HeavyLinework, lineworkIds, type LineworkContext } from '../shared/heavy-linework.ts';
import type { Player, Stats } from '../shared/game.ts';
import type { InputFrame } from '../shared/protocol.ts';
import type { PlayerView } from '../shared/view.ts';
import type { Rect } from '../shared/geometry.ts';
import type { Construct } from '../shared/class-kits.ts';
type Context = {
  scope: string;
  obstacles: readonly Rect[];
  masonry: readonly Rect[];
  constructs?(): readonly Construct[];
};
export function lineworkPredictedSpeed(p: PlayerView, now: number) {
  if (!p.skills.includes(lineworkIds.entry) || !Number.isFinite(p.kit.lineworkUncommittedSpeed))
    return p.speed;
  return (
    p.kit.lineworkUncommittedSpeed! *
    Math.min(now < p.braceUntil ? 0.6 : 1, now < p.overdriveUntil ? 0.65 : 1)
  );
}
/** Forecast acknowledged mechanical work only. A new physical attachment always awaits authority. */
export function lineworkPredictedMotion(
  p: PlayerView,
  i: InputFrame,
  now: number,
  c: Context,
  currentOrdinarySpeed: number,
) {
  const empty = { x: 0, y: 0, yoke: false, finish: () => {} };
  if (p.classId !== 'heavy' || !p.kit.lineworkConnection) return empty;
  const model = HeavyLinework.forPrediction(p, p.kit),
    actor = { ...p, input: { ...i }, expired: false, channelUntil: 0 } as unknown as Player;
  const context: LineworkContext = {
    ...c,
    tick: now,
    stats: () => ({ cooldown: 1 }) as Stats,
    canEmit: () => false,
    shoot: () => undefined,
    shot: () => undefined,
    remove: () => {},
    sound: () => {},
  };
  model.beforeMove(actor, context);
  const motion = model.force(actor, context, currentOrdinarySpeed);
  return {
    ...motion,
    finish: () => {
      actor.x = p.x;
      actor.y = p.y;
      model.afterMove(actor, context);
      if (
        i.reload &&
        now >= p.overdriveUntil &&
        !p.reloadAt &&
        p.ammo < (p.kit.lineworkMagazineCapacity ?? p.ammo)
      )
        model.interrupt(p.id);
      const cl = catalog.classes.find((c) => c.id === 'heavy')!,
        cooldown = p.kit.lineworkCooldownScale ?? 1;
      if (i.q && now >= p.qAt) {
        model.beforeAbility(actor, 'q');
        p.qAt = now + Math.ceil(cl.abilities[0].cooldown * cooldown * HZ);
      }
      if (i.e && now >= p.eAt) {
        p.eAt = now + Math.ceil(cl.abilities[1].cooldown * cooldown * HZ);
        p.braceUntil = now + Math.ceil(cl.abilities[1].duration * HZ);
      }
      if (i.technique1) model.cast(actor, context);
      if (i.ultimate && now >= p.ultimateAt) {
        model.beforeAbility(actor, 'ultimate');
        p.ultimateAt =
          now + Math.ceil(cl.ultimate.cooldown * (p.kit.lineworkUltimateCooldownScale ?? 1) * HZ);
        p.overdriveUntil =
          now + (p.kit.lineworkOverdriveTicks ?? Math.ceil(cl.ultimate.duration * HZ));
        actor.overdriveUntil = p.overdriveUntil;
      }
      const s = model.status(actor, now, {
        canEmit: false,
        magazineCapacity: p.kit.lineworkMagazineCapacity ?? p.ammo,
      });
      p.kit = {
        ...p.kit,
        lineworkConnection: s.lineworkConnection,
        lineworkUntil: s.lineworkUntil,
        lineworkAnchor: s.lineworkAnchor,
        lineworkActive: s.lineworkActive,
        lineworkMode: s.lineworkMode,
        lineworkPaidLength: s.lineworkPaidLength,
        lineworkAt: s.lineworkAt,
        lineworkCommandAt: s.lineworkCommandAt,
        lineworkCommandSequence: s.lineworkCommandSequence,
        lineworkBlocked: s.lineworkBlocked,
        lineworkCommandBlocked: s.lineworkCommandBlocked,
      };
    },
  };
}
