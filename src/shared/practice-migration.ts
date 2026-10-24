import catalog from '../../content/catalog.json';
import { CONTENT_REVISION, PROTOCOL } from './protocol.ts';

/** Bounded local migrations preserve old Practice saves. Online signatures stay strict. */
export function migratePracticeBoundary(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const legacy = value as Record<string, unknown>;
  if (![4, 5, 6, 7, 8, 9, 10, 11, 12].includes(legacy.protocolVersion as number)) return value;
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
    version === 12
      ? catalog.bosses.map((b) => b.id)
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
    settings: { ...oldSettings, runId: 'legacy-' + oldSettings.seed + '-' + oldSettings.mode },
    player: {
      ...(legacy.player as object),
      progress: {
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
    ...(version === 12
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
