import catalog from '../../content/catalog.json';
import { CONTENT_REVISION, PROTOCOL, type BossId } from './protocol.ts';
import { classifiedContract } from './boss-threat.ts';

/** Bounded local migrations preserve old Practice saves. Online signatures stay strict. */
export function migratePracticeBoundary(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const issued = value as Record<string, unknown>;
  // This issued revision differs only in Constable encounter authoring. Carry local
  // boundaries forward, then run the existing version-specific and full restore validation.
  // Current-version cards never pass through legacy reclassification.
  const compatibleRevision =
    ['b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241', '43b7b2848b50bbe56072bfa134e5775355a7faca28092624744bdae6a0d318bb'].includes(issued.contentRevision as string) &&
    [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, PROTOCOL].includes(issued.protocolVersion as number) &&
    issued.schemaVersion === 1 &&
    issued.practiceOnly === true &&
    issued.serverOnly !== true &&
    issued.players === undefined &&
    issued.transactions === undefined &&
    JSON.stringify(issued).length <= 32768;
  const legacy = compatibleRevision ? { ...issued, contentRevision: CONTENT_REVISION } : issued;
  if (![4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(legacy.protocolVersion as number)) return legacy;
  const version = legacy.protocolVersion as number;
  const previousServiceBosses = [
    'matron',
    'alchemist',
    'bellringer',
    'stitchwright',
    'glass-surgeon',
    'ash-baker',
    'sluice-keeper',
    'stationmaster',
    'lamplighter',
    'anatomist',
    'plague-gardener',
    'choir',
    'red-abbess',
    'vesper-judge',
  ];
  const previousDistrictBosses = [
    'pallbearer',
    'cinder-foreman',
    'canal-diver',
    'clockmender',
    'wire-seamstress',
    'gravedigger',
    'ink-notary',
    'spore-beekeeper',
    'ice-custodian',
    'bridge-ferryman',
    'porcelain-mourner',
    'boiler-tender',
    'mirror-undertaker',
    'chalk-magistrate',
    'wire-harpist',
    'crow-shepherd',
    'ledger-leech',
    'engine',
    'regent',
    'salt-patriarch',
  ];
  const previousRaidBosses = [
    'chain-colossus',
    'ossuary-leviathan',
    'bell-triplets',
    'quarantine-heart',
    'crown-procession',
    'city-eater',
    'last-breath-saint',
  ];
  const bosses =
    version >= 12
      ? catalog.bosses.filter(b => !['ashen-usher','brass-toad','ragpicker-kite'].includes(b.id)).map((b) => b.id)
      : version >= 7
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
            ...(version >= 9 ? previousServiceBosses : []),
            ...(version >= 10 ? previousDistrictBosses : []),
            ...(version >= 11 ? previousRaidBosses : []),
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
    !(
      version >= 11
        ? ['short', 'standard', 'long', 'raid', 'endless']
        : version === 10
          ? ['short', 'standard', 'long', 'endless']
          : version === 9
            ? ['short', 'standard', 'endless']
            : ['short', 'endless']
    ).includes(oldSettings.mode as string) ||
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
      version >= 8
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
    if (card.variant !== undefined && !['normal', 'brutal'].includes(String(card.variant)))
      throw Error('invalidCards');
    if (version === 14) {
      if (!bosses.includes(card.bossId as string)) throw Error('invalidCards');
      return card; // Issued fixed-grade cards are validated unchanged by the full restore.
    }
    if (
      !Number.isSafeInteger(card.risk) ||
      Number(card.risk) < 0 ||
      Number(card.risk) > 2 ||
      !Number.isSafeInteger(card.threat) ||
      Number(card.threat) < 1 ||
      Number(card.threat) > 11 ||
      typeof card.bounty !== 'number' ||
      !Number.isFinite(card.bounty) ||
      card.bounty < 1 ||
      card.bounty > 3
    )
      throw Error('invalidCards');
    if (version !== 4) {
      if (!bosses.includes(card.bossId as string)) throw Error('invalidCards');
      return {
        ...card,
        ...classifiedContract(
          card.bossId as BossId,
          card.variant === 'brutal' ? 'brutal' : 'normal',
        ),
      };
    }
    if (card.bossId !== undefined && card.bossId !== 'constable') throw Error('invalidCards');
    return {
      ...card,
      ...classifiedContract('constable', card.variant === 'brutal' ? 'brutal' : 'normal'),
    };
  };
  if (!Array.isArray(legacy.contractCards) || legacy.contractCards.length > 3)
    throw Error('invalidCards');
  return {
    ...legacy,
    protocolVersion: PROTOCOL,
    settings: {
      ...oldSettings,
      runId:
        version >= 13 ? oldSettings.runId : 'legacy-' + oldSettings.seed + '-' + oldSettings.mode,
    },
    player: {
      ...(legacy.player as object),
      progress:
        version >= 13
          ? (legacy.player as Record<string, unknown>).progress
          : {
              clears: legacy.encounter,
              rescues: 0,
              campaignClears: legacy.campaignBank
                ? (legacy.campaignBank as { encounters: number }).encounters
                : 0,
              firstEncounter: Number(legacy.encounter) > 0 ? 0 : -1,
              clearedBossIds:
                version === 4
                  ? Number(legacy.encounter) > 0
                    ? ['constable']
                    : []
                  : legacy.completedBossIds,
            },
    },
    ...(version >= 12
      ? {
          timeouts: legacy.timeouts,
          secretStatus: legacy.secretStatus,
          campaignBank: legacy.campaignBank,
          extensionParticipants: legacy.extensionParticipants,
          endlessHistory: legacy.endlessHistory,
        }
      : {
          timeouts: 0,
          secretStatus: 'locked',
          campaignBank: null,
          extensionParticipants: [],
          endlessHistory: {
            recent:
              oldSettings.mode === 'endless' && Array.isArray(legacy.completedBossIds)
                ? legacy.completedBossIds.slice(-12)
                : [],
            routeBag: [],
            exclusiveBag: [],
          },
        }),
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
