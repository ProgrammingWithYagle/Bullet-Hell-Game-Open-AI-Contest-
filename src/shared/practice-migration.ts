import { CONTENT_REVISION, PROTOCOL } from './protocol.ts';

/** Only old local Practice boundaries migrate. Signed online state stays strict. */
export function migratePracticeBoundary(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const legacy = value as Record<string, unknown>;
  if (legacy.protocolVersion !== 4 && legacy.protocolVersion !== 5) return value;
  if (
    legacy.schemaVersion !== 1 ||
    legacy.contentRevision !== CONTENT_REVISION ||
    legacy.practiceOnly !== true ||
    legacy.serverOnly === true ||
    legacy.players !== undefined ||
    legacy.transactions !== undefined ||
    !legacy.player ||
    typeof legacy.player !== 'object' ||
    !(legacy.protocolVersion === 4 ? ['soldier', 'medic'] : ['soldier', 'medic', 'heavy']).includes(
      (legacy.player as Record<string, unknown>).classId as string,
    ) ||
    JSON.stringify(value).length > 32768
  )
    throw Error('versionMismatch');
  if (
    legacy.protocolVersion === 5 &&
    (!Array.isArray(legacy.completedBossIds) ||
      !legacy.completedBossIds.every((id) => ['constable', 'lantern-warden'].includes(String(id))))
  )
    throw Error('invalidBossHistory');
  const contract = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
      throw Error('invalidCards');
    const card = candidate as Record<string, unknown>;
    if (legacy.protocolVersion === 5) {
      if (!['constable', 'lantern-warden'].includes(card.bossId as string))
        throw Error('invalidCards');
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
      legacy.protocolVersion === 5
        ? legacy.completedBossIds
        : typeof legacy.encounter === 'number' && legacy.encounter > 0
          ? ['constable']
          : [],
    selectedContract: contract(legacy.selectedContract),
    contractCards: legacy.contractCards.map(contract),
  };
}
