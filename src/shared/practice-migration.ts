import catalog from '../../content/catalog.json';
import { CONTENT_REVISION, PROTOCOL, type BossId } from './protocol.ts';
import { classifiedContract } from './boss-threat.ts';

/** Bounded local migrations preserve old Practice saves. Online signatures stay strict. */
export function migratePracticeBoundary(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const issued = value as Record<string, unknown>;
  if(issued.protocolVersion===40||issued.protocolVersion===39){
    if(issued.schemaVersion!==1||issued.contentRevision!==CONTENT_REVISION||issued.practiceOnly!==true||
      issued.serverOnly===true||issued.players!==undefined||issued.transactions!==undefined||JSON.stringify(issued).length>32768)
      throw Error('versionMismatch');
    return {...issued,protocolVersion:PROTOCOL};
  }
  if (issued.protocolVersion === 38) {
    if (issued.schemaVersion !== 1 || issued.contentRevision !== CONTENT_REVISION ||
      issued.practiceOnly !== true || issued.serverOnly === true || issued.players !== undefined ||
      issued.transactions !== undefined || JSON.stringify(issued).length > 32768)
      throw Error('versionMismatch');
    const settings = issued.settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw Error('invalidCheckpoint');
    return { ...issued, protocolVersion: PROTOCOL,
      settings: { ...settings, arenaSelection: 'fixed' } };
  }
  // Carry known issued local content revisions forward, preserving their identity and progress.
  // The existing version-specific and full restore validation still apply.
  // Current-version cards never pass through legacy reclassification.
  const compatibleRevision =
    ['6bf9b3f3f87c98e2e552b99e4dbf6ae856b57b3aba032d03a72bcc97c8367cdd','6f97c9a4f3aabc87e6875b99e18aba60f667335d501ec50e94d215a1f8bc806c','7266df2511e22b94f34915a97c0b4a61e2881778de5cfddff4011a41c2f29fe2','94552a8007ad25febb2f9c8e212ffdf28360bcb1df528a7c7ab226f7388ee675','0d8d0df4d5bd156da29529164a249489dcb3f3dbdda7026921bcc76555eb6266','b6cdeb5a0d7475f65192d16f26a91d31660e9593843704738e1ddf494f5191bb','90c1bd18708bffd5fab92a98490b9f173ba4cdb85956aabda8fef67c4cd6c28d','850f5e0dd38cfd283ff0dbf079892b3595ccc489a95c70586e4fd4a24505402b','e6db0059a1510315047e400e2c135ca2fd3a0368cea21c035946ff6a877631b2','39ca64136ddb477d344eb75408a22ed239af57efb1d3a3a4f5893ac33c13864d','b6d1eca2e4cc89073c4e45a5007b4e39ff98bc30ba98337782777170210a0438','cc48fbf30b18e546d600b05f4c4648330cfd012631c53fd7a4fe57b734b7a97b','a36ec57bba4b76a595d42ac812c69bbda0ab2305ea22cf131b1770e03a57d9d2','27c4b2e298912b53f88b115654857f923966aeccdb80b730e449536a2045ef27','da37e2a0e2beb54343495ce39027211df254fa1c79ab42ec3f3360373ad792db','9598869248912ad6a787d6e72791183acf4e12d38da92f2a677164f93e3f51c7','312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006','86ace79844ae1abe21b7fa54d18fa2de1f4316a2b5a0578c1878e6b27479ffdf','82763fd1f5288303f8170a798b656f5443fc8f5236b652786a9e3b27070c41af','b8d9fb6918c854f3eed38b327ed0cb3026e071e6fe24932e50beed36943db241', '43b7b2848b50bbe56072bfa134e5775355a7faca28092624744bdae6a0d318bb','cbb6b8e68c9fb6f3191a3f0ef4a6411c8a3d3e41e3aeca783c122b07ab73d546','1ad00eee45a117a45929e56884c6a39a8c4eb614b0728ab31e847403fb8735bb','d4419d906f67286576ca3f6795e03a921269aff861b36e2e82ce68aa2e501775','535eb34c7cdabce5ad2fe910ea0a792278a7cc08e360b4f5712d7ee2d9e767f6'].includes(issued.contentRevision as string) &&
    [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, PROTOCOL].includes(issued.protocolVersion as number) &&
    issued.schemaVersion === 1 &&
    issued.practiceOnly === true &&
    issued.serverOnly !== true &&
    issued.players === undefined &&
    issued.transactions === undefined &&
    JSON.stringify(issued).length <= 32768;
  const legacy = compatibleRevision ? { ...issued, contentRevision: CONTENT_REVISION } : issued;
  if(issued.protocolVersion===37){
    if(issued.contentRevision!=='6bf9b3f3f87c98e2e552b99e4dbf6ae856b57b3aba032d03a72bcc97c8367cdd'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===36){
    if(issued.contentRevision!=='6f97c9a4f3aabc87e6875b99e18aba60f667335d501ec50e94d215a1f8bc806c'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===35){
    if(issued.contentRevision!=='7266df2511e22b94f34915a97c0b4a61e2881778de5cfddff4011a41c2f29fe2'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===34){
    if(issued.contentRevision!=='94552a8007ad25febb2f9c8e212ffdf28360bcb1df528a7c7ab226f7388ee675'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===33){
    if(issued.contentRevision!=='0d8d0df4d5bd156da29529164a249489dcb3f3dbdda7026921bcc76555eb6266'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===32){
    if(issued.contentRevision!=='b6cdeb5a0d7475f65192d16f26a91d31660e9593843704738e1ddf494f5191bb'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===31){
    if(issued.contentRevision!=='90c1bd18708bffd5fab92a98490b9f173ba4cdb85956aabda8fef67c4cd6c28d'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===30){
    if(issued.contentRevision!=='850f5e0dd38cfd283ff0dbf079892b3595ccc489a95c70586e4fd4a24505402b'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===29){
    if(issued.contentRevision!=='e6db0059a1510315047e400e2c135ca2fd3a0368cea21c035946ff6a877631b2'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===28){
    if(issued.contentRevision!=='39ca64136ddb477d344eb75408a22ed239af57efb1d3a3a4f5893ac33c13864d'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if (issued.protocolVersion === 27) {
    if (issued.contentRevision !== 'b6d1eca2e4cc89073c4e45a5007b4e39ff98bc30ba98337782777170210a0438' || !compatibleRevision) throw Error('versionMismatch');
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 26) {
    if (issued.contentRevision !== 'cc48fbf30b18e546d600b05f4c4648330cfd012631c53fd7a4fe57b734b7a97b' || !compatibleRevision) throw Error('versionMismatch');
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 25) {
    if (issued.contentRevision !== 'a36ec57bba4b76a595d42ac812c69bbda0ab2305ea22cf131b1770e03a57d9d2' || !compatibleRevision)
      throw Error('versionMismatch');
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if (issued.protocolVersion === 24) {
    if (issued.contentRevision !== '27c4b2e298912b53f88b115654857f923966aeccdb80b730e449536a2045ef27' || !compatibleRevision)
      throw Error('versionMismatch');
    return { ...legacy, protocolVersion: PROTOCOL };
  }
  if(issued.protocolVersion===23){
    if(issued.contentRevision!=='da37e2a0e2beb54343495ce39027211df254fa1c79ab42ec3f3360373ad792db'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===22){
    if(issued.contentRevision!=='9598869248912ad6a787d6e72791183acf4e12d38da92f2a677164f93e3f51c7'||!compatibleRevision)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if(issued.protocolVersion===21){
    if(issued.contentRevision!=='312aa30276cffb7bb00cf9a303cc3b3461cce80d32e054afd5e91c08f76e2006' || !compatibleRevision)throw Error('versionMismatch');
    // Protocol 21 already records Standard/Brutal/Crazed completion separately.
    // Full restoration below validates every form and identity without downgrading that history.
    return {...legacy,protocolVersion:PROTOCOL};
  }
  if (legacy.protocolVersion===15 || legacy.protocolVersion===16 || legacy.protocolVersion===17 || legacy.protocolVersion===18 || legacy.protocolVersion===19 || legacy.protocolVersion===20) {
    if(legacy.schemaVersion!==1 || legacy.contentRevision!==CONTENT_REVISION || legacy.practiceOnly!==true || legacy.serverOnly===true || legacy.players!==undefined || legacy.transactions!==undefined || JSON.stringify(legacy).length>32768)throw Error('versionMismatch');
    return {...legacy,protocolVersion:PROTOCOL,completedBossForms:Object.fromEntries(((legacy.completedBossIds??[]) as string[]).map(id=>[id,'normal']))};
  }
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
    completedBossForms:Object.fromEntries(((legacy.completedBossIds??[]) as string[]).map(id=>[id,'normal'])),
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
