import { CONTENT_REVISION, PROTOCOL } from './protocol.ts';

/** Bounded local migrations preserve old Practice saves. Online signatures stay strict. */
export function migratePracticeBoundary(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const legacy = value as Record<string, unknown>;
  if (![4, 5, 6, 7, 8].includes(legacy.protocolVersion as number)) return value;
  const version = legacy.protocolVersion as number;
  const bosses =
    version >= 7
      ? [
          'constable',
          'lantern-warden',
          'courier',
          'ratcatcher',
          'quarantine-clerk',
          'tollkeeper',
          'chain-marshal',
          'gate-widow',
          'black-ambulance',
        ]
      : version === 4
        ? ['constable']
        : version === 5
          ? ['constable', 'lantern-warden']
          : ['constable', 'lantern-warden', 'courier', 'ratcatcher', 'quarantine-clerk'];
  const oldSettings = legacy.settings as Record<string, unknown> | undefined;
  if (
    !oldSettings ||
    typeof oldSettings !== 'object' ||
    !['short', 'endless'].includes(oldSettings.mode as string) ||
    (oldSettings.openingBossId !== undefined &&
      !bosses.includes(oldSettings.openingBossId as string)) ||
    (version < 7 &&
      oldSettings.openingArenaId !== undefined &&
      oldSettings.openingArenaId !== 'gatehouse')
  )
    throw Error('versionMismatch');
  if (
    legacy.schemaVersion !== 1 ||
    legacy.contentRevision !== CONTENT_REVISION ||
    legacy.practiceOnly !== true ||
    legacy.serverOnly === true ||
    legacy.players !== undefined ||
    legacy.transactions !== undefined ||
    !legacy.player ||
    typeof legacy.player !== 'object' ||
    !(
      version === 8
        ? ['soldier', 'medic', 'heavy', 'tank', 'mage', 'engineer', 'assassin']
        : version === 4
          ? ['soldier', 'medic']
          : ['soldier', 'medic', 'heavy']
    ).includes((legacy.player as Record<string, unknown>).classId as string) ||
    JSON.stringify(value).length > 32768
  )
    throw Error('versionMismatch');
  if (
    version !== 4 &&
    (!Array.isArray(legacy.completedBossIds) ||
      !legacy.completedBossIds.every((id) => bosses.includes(String(id))))
  )
    throw Error('invalidBossHistory');
  const contract = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
      throw Error('invalidCards');
    const card = candidate as Record<string, unknown>;
    if (version !== 4) {
      if (!bosses.includes(card.bossId as string)) throw Error('invalidCards');
      return { ...card };
    }
    if (card.bossId !== undefined && card.bossId !== 'constable') throw Error('invalidCards');
    return { ...card, bossId: 'constable' };
  };
  if (!Array.isArray(legacy.contractCards) || legacy.contractCards.length > 3)
    throw Error('invalidCards');
  return {
    ...legacy,
    protocolVersion: PROTOCOL,
    completedBossIds:
      version !== 4
        ? legacy.completedBossIds
        : typeof legacy.encounter === 'number' && legacy.encounter > 0
          ? ['constable']
          : [],
    selectedContract: contract(legacy.selectedContract),
    contractCards: legacy.contractCards.map(contract),
  };
}
