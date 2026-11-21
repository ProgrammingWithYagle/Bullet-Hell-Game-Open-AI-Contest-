import type { Field, Vec } from './protocol.ts';
export function fieldPosition(
  field: Field,
  players: ({ id: string; status: string } & Vec)[],
  local?: { id: string; status: string } & Vec,
): Vec {
  if (!field.anchor) return field;
  if (local?.id === field.anchor && local.status === 'active') return local;
  return (
    players.find((p) => p.id === field.anchor && p.status === 'active') ?? field
  );
}
