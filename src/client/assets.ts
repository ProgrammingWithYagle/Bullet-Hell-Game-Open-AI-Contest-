import wheel from '../../assets/production/motion/tollkeeper-wheel-v1.png?url';
import arena from '../../assets/proofs/arena-v1.png?url';
const arenaGroundImages = import.meta.glob('../../assets/production/arenas/*-ground-v1.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
import cover from '../../assets/proofs/cover-v1.png?url';
import boss from '../../assets/proofs/animation/boss-attack-atlas.png?url';
import constableShuffle from '../../assets/production/motion/constable-shuffle-v1-atlas.png?url';
import constableIdle from '../../assets/production/motion/constable-idle-v1-atlas.png?url';
import constableHurt from '../../assets/production/motion/constable-hurt-v1-atlas.png?url';
import constableStagger from '../../assets/production/motion/constable-stagger-v1-atlas.png?url';
import constableDefeat from '../../assets/production/motion/constable-defeat-v1-atlas.png?url';
import medic from '../../assets/proofs/directions/medic-south-seed.png?url';
import lineup from '../../assets/proofs/survivors-v3.png?url';
import damageIcon from '../../assets/icons/upgrades/damage.png?url';
import rateIcon from '../../assets/icons/upgrades/fire-rate.png?url';
import magazineIcon from '../../assets/icons/upgrades/magazine.png?url';
import reloadIcon from '../../assets/icons/upgrades/reload.png?url';
import healthIcon from '../../assets/icons/upgrades/health.png?url';
import wardenIdle from '../../assets/production/motion/lantern-warden-idle-v1-atlas.png?url';
import wardenAttack from '../../assets/production/motion/lantern-warden-attack-v2-atlas.png?url';
import wardenChannel from '../../assets/production/motion/lantern-warden-channel-v1-atlas.png?url';
import wardenHurt from '../../assets/production/motion/lantern-warden-hurt-v1-atlas.png?url';
import wardenDefeat from '../../assets/production/motion/lantern-warden-defeat-v1-atlas.png?url';
import heavyReference from '../../assets/production/normalized/survivors/heavy/reference-atlas-v1.png?url';
const selectionPortraits = import.meta.glob(
  '../../assets/delivery/selection-portraits-v1/*-selection-v1.png',
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;
const survivorReferences = import.meta.glob(
  '../../assets/production/normalized/survivors/*/reference-atlas-v1.png',
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;
const survivorMotion = import.meta.glob('../../assets/delivery/survivor-motion-v1/*-v1-atlas.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const survivorMotionUrls = Object.fromEntries(
  Object.entries(survivorMotion).map(([path, url]) => [
    path.split('/').at(-1)!.replace('-v1-atlas.png', ''),
    url,
  ]),
) as Record<string, string>;
const endlessProps = import.meta.glob('../../assets/production/endless-props/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const raidProps = import.meta.glob('../../assets/production/raid-props/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const pilgrimageProps = import.meta.glob('../../assets/production/pilgrimage-props/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const midnightProps = import.meta.glob('../../assets/production/midnight-props/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const constructProps = import.meta.glob('../../assets/production/constructs/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const environmentProps = import.meta.glob('../../assets/production/environment/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const items = import.meta.glob('../../assets/production/items/icons/*/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const bossSettledIdentities = import.meta.glob(
  ['../../assets/delivery/boss-loading-v3/*-defeat-reference-v2.png','../../assets/delivery/boss-loading-v4/*-defeat-reference-v2.png'],
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;
const bossIdentities = import.meta.glob(
  ['../../assets/delivery/boss-loading-v3/*-reference-v3.png','../../assets/delivery/boss-loading-v4/*-reference-v3.png'],
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;
const encounterMotion = import.meta.glob(
  [
    '../../assets/production/motion/*-action-v1-atlas.png',
    '../../assets/production/motion/*-action-v2-atlas.png',
    '../../assets/production/motion/*-action-v3-atlas.png',
    '!../../assets/production/motion/courier-action-v2-atlas.png',
    '!../../assets/production/motion/courier-action-v1-atlas.png',
    '!../../assets/production/motion/ratcatcher-action-v1-atlas.png',
    '!../../assets/production/motion/quarantine-clerk-action-v1-atlas.png',
    '!../../assets/production/motion/tollkeeper-action-v1-atlas.png',
    '!../../assets/production/motion/chain-marshal-action-v1-atlas.png',
    '!../../assets/production/motion/gate-widow-action-v1-atlas.png',
    '!../../assets/production/motion/black-ambulance-action-v1-atlas.png',
  ],
  {
    query: '?url',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;
export const assets = {
  bossIdentities: Object.fromEntries(
    Object.entries(bossIdentities).map(([path, url]) => [
      path.split('/').at(-1)!.replace('-reference-v3.png', ''),
      url,
    ]),
  ) as Record<string, string>,
  bossSettledIdentities: Object.fromEntries(
    Object.entries(bossSettledIdentities).map(([path, url]) => [
      path.split('/').at(-1)!.replace('-defeat-reference-v2.png', ''),
      url,
    ]),
  ) as Record<string, string>,
  survivorActions: survivorMotionUrls,
  endlessProps: Object.fromEntries(
    Object.entries(endlessProps).map(([p, u]) => [p.split('/').at(-1)!.replace('.png', ''), u]),
  ),
  raidProps: Object.fromEntries(
    Object.entries(raidProps).map(([p, u]) => [p.split('/').at(-1)!.replace('.png', ''), u]),
  ),
  pilgrimageProps: Object.fromEntries(
    Object.entries(pilgrimageProps).map(([p, u]) => [p.split('/').at(-1)!.replace('.png', ''), u]),
  ),
  midnightProps: Object.fromEntries(
    Object.entries(midnightProps).map(([p, u]) => [p.split('/').at(-1)!.replace('.png', ''), u]),
  ),
  constructs: Object.fromEntries(
    Object.entries(constructProps).map(([p, u]) => [p.split('/').at(-1)!.replace('.png', ''), u]),
  ),
  environment: Object.fromEntries(
    Object.entries(environmentProps).map(([p, u]) => [p.split('/').at(-1)!.replace('.png', ''), u]),
  ),
  survivorReferences: Object.fromEntries(
    Object.entries(survivorReferences).map(([path, url]) => [
      path.split('/survivors/')[1].split('/')[0],
      url,
    ]),
  ) as Record<string, string>,
  survivorRuns: survivorMotionUrls,
  wheel,
  items: Object.fromEntries(
    Object.entries(items).map(([path, url]) => [
      path.split('/icons/')[1].replace(/\.png$/, ''),
      url,
    ]),
  ) as Record<string, string>,
  encounters: Object.fromEntries(
    Object.entries(encounterMotion).map(([path, url]) => [
      path
        .split('/')
        .at(-1)!
        .replace(/-action-v[123]-atlas\.png$/, ''),
      url,
    ]),
  ) as Record<string, string>,
  arena,
  arenaGrounds: {
    gatehouse: arena,
    ...Object.fromEntries(
      Object.entries(arenaGroundImages).map(([path, url]) => [
        path.split('/').at(-1)!.replace('-ground-v1.png', ''),
        url,
      ]),
    ),
  } as Record<string, string>,
  cover,
  boss,
  constable: {
    shuffle: constableShuffle,
    idle: constableIdle,
    hurt: constableHurt,
    stagger: constableStagger,
    defeat: constableDefeat,
    attack: boss,
  },
  medic,
  lineup,
  warden: {
    idle: wardenIdle,
    attack: wardenAttack,
    channel: wardenChannel,
    hurt: wardenHurt,
    defeat: wardenDefeat,
  },
  heavy: {
    reference: heavyReference,
    North: survivorMotionUrls['heavy-run-north'],
    South: survivorMotionUrls['heavy-run-south'],
    East: survivorMotionUrls['heavy-run-east'],
    West: survivorMotionUrls['heavy-run-west'],
  },
  portraits: Object.fromEntries(
    Object.entries(selectionPortraits).map(([path, url]) => [
      path.split('/').at(-1)!.replace('-selection-v1.png', ''),
      url,
    ]),
  ) as Record<string, string>,
  upgrades: {
    damage: damageIcon,
    'fire-rate': rateIcon,
    magazine: magazineIcon,
    reload: reloadIcon,
    health: healthIcon,
  } as Record<string, string>,
};
