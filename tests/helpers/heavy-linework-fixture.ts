import assert from 'node:assert/strict';
import { Game } from '../../src/shared/game.ts';
import { idleInput, type InputFrame } from '../../src/shared/protocol.ts';
import { lineworkIds } from '../../src/shared/heavy-linework.ts';
import geometry from '../fixtures/heavy-linework-geometry.json';
export const lineworkGeometry = geometry.rows.find(
  (r) => r.arena === 'gatehouse' && r.difficulty === 'normal',
)!;
/** Controlled shop/quiet collision fixture. Proposed raw ownership is never used. */
export function lineworkFixture(mode = 'bare', budget = 9) {
  assert(['bare', 'yoke', 'sheave'].includes(mode));
  const g: any = new Game({
      mode: 'short',
      difficulty: 'normal',
      seed: 41,
      maxPlayers: 2,
      openingArenaId: 'gatehouse',
      arenaSelection: 'fixed',
    }),
    p = g.addPlayer('solo', 'Controlled canonical Lineworker', 'heavy');
  p.totalSp = budget;
  for (const item of [
    'heavy-ordnance-1',
    lineworkIds.entry,
    ...(mode === 'bare' ? [] : [lineworkIds[mode as 'yoke' | 'sheave']]),
  ])
    assert(g.transact(p.id, { id: 'fixture-' + item, kind: 'skill', item }).ok);
  assert(g.start());
  Object.defineProperty(g, 'arena', { value: structuredClone(g.arena) });
  g.boss.staggerUntil = g.boss.deadline = 1e9;
  const aim = Math.atan2(
      lineworkGeometry.example.anchor.y - p.y,
      lineworkGeometry.example.anchor.x - p.x,
    ),
    away = { moveX: -Math.cos(aim), moveY: -Math.sin(aim) },
    shots: any[] = [],
    events: any[] = [],
    trace: any[] = [];
  let sequence = 0;
  const status = () =>
      g.linework.status(p, g.combatTick, {
        canEmit: g.canEmitShots('friendly', 1),
        magazineCapacity: g.stats(p).magazine,
      }),
    step = (props: Partial<InputFrame> = {}) => {
      const input = {
        ...idleInput(),
        aim,
        ...props,
        sequence: ++sequence,
        clientTick: g.combatTick,
      };
      assert(g.submitInput(p.id, input));
      g.step();
      for (const event of g.drainEvents()) {
        events.push(structuredClone(event));
        if (event.type === 'shots')
          shots.push(
            ...event.shots
              .filter((s: any) => s.owner === p.id)
              .map((s: any) => ({ ...s, at: g.combatTick })),
          );
      }
      const s = status();
      trace.push({
        tick: g.combatTick,
        x: p.x,
        y: p.y,
        ammo: p.ammo,
        ...s,
        actualDistance: s.lineworkAnchor
          ? Math.hypot(p.x - s.lineworkAnchor.x, p.y - s.lineworkAnchor.y)
          : null,
      });
      return input;
    };
  const ammo = p.ammo,
    attach = () => {
      step({ technique1: true });
      for (let n = 0; n < 20 && !status().lineworkUntil; n++) step();
      assert(
        status().lineworkUntil > g.combatTick,
        'Actual current masonry must hold the physical anchor',
      );
    };
  return {
    g,
    p,
    aim,
    away,
    step,
    status,
    attach,
    shots,
    emitted: shots,
    events,
    trace,
    ammo,
    initialAmmo: ammo,
    controlledBudget: budget,
    heldBossAttackFixture: true,
  };
}
export function attachedLineworkFixture(mode = 'bare') {
  const f = lineworkFixture(mode);
  f.attach();
  return f;
}
