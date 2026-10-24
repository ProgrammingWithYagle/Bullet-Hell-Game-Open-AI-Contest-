import wheel from '../../assets/production/motion/tollkeeper-wheel-v1.png?url';
import arena from '../../assets/proofs/arena-v1.png?url';
import cover from '../../assets/proofs/cover-v1.png?url';
import soldier from '../../assets/proofs/animation/soldier-run-atlas.png?url';
import boss from '../../assets/proofs/animation/boss-attack-atlas.png?url';
import medic from '../../assets/prototype/medic-source-v2.png?url';
import lineup from '../../assets/proofs/survivors-v3.png?url';
import damageIcon from '../../assets/icons/upgrades/damage.png?url';
import rateIcon from '../../assets/icons/upgrades/fire-rate.png?url';
import magazineIcon from '../../assets/icons/upgrades/magazine.png?url';
import reloadIcon from '../../assets/icons/upgrades/reload.png?url';
import healthIcon from '../../assets/icons/upgrades/health.png?url';
import soldierNorth from '../../assets/sprites/soldier/north-walk.png?url';
import soldierSouth from '../../assets/sprites/soldier/south-walk.png?url';
import medicNorth from '../../assets/sprites/medic/north-walk.png?url';
import medicSouth from '../../assets/sprites/medic/south-walk.png?url';
import medicEast from '../../assets/proofs/directions/medic-east-seed.png?url';
import medicWest from '../../assets/proofs/directions/medic-west-seed.png?url';
import heavyPortrait from '../../assets/production/normalized/survivors/heavy/portrait-south-v1.png?url';
import tankPortrait from '../../assets/production/normalized/survivors/tank/portrait-south-v1.png?url';
import magePortrait from '../../assets/production/normalized/survivors/mage/portrait-south-v1.png?url';
import engineerPortrait from '../../assets/production/normalized/survivors/engineer/portrait-south-v1.png?url';
import assassinPortrait from '../../assets/production/normalized/survivors/assassin/portrait-south-v1.png?url';
import wardenIdle from '../../assets/production/motion/lantern-warden-idle-v1-atlas.png?url';
import wardenAttack from '../../assets/production/motion/lantern-warden-attack-v2-atlas.png?url';
import wardenChannel from '../../assets/production/motion/lantern-warden-channel-v1-atlas.png?url';
import wardenHurt from '../../assets/production/motion/lantern-warden-hurt-v1-atlas.png?url';
import wardenDefeat from '../../assets/production/motion/lantern-warden-defeat-v1-atlas.png?url';
import heavyReference from '../../assets/production/normalized/survivors/heavy/reference-atlas-v1.png?url';
import heavyRunNorth from '../../assets/production/motion/heavy-run-north-v1-atlas.png?url';
import heavyRunSouth from '../../assets/production/motion/heavy-run-south-v1-atlas.png?url';
import heavyRunEast from '../../assets/production/motion/heavy-run-east-v1-atlas.png?url';
import heavyRunWest from '../../assets/production/motion/heavy-run-west-v1-atlas.png?url';
const survivorReferences = import.meta.glob(
  '../../assets/production/normalized/survivors/*/reference-atlas-v1.png',
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;
const survivorRuns = import.meta.glob('../../assets/production/motion/*-run-*-v1-atlas.png', {
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
const encounterMotion = import.meta.glob('../../assets/production/motion/*-action-v1-atlas.png', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
export const assets = {
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
  survivorRuns: Object.fromEntries(
    Object.entries(survivorRuns).map(([path, url]) => [
      path.split('/').at(-1)!.replace('-v1-atlas.png', ''),
      url,
    ]),
  ) as Record<string, string>,
  wheel,
  items: Object.fromEntries(
    Object.entries(items).map(([path, url]) => [
      path.split('/icons/')[1].replace(/\.png$/, ''),
      url,
    ]),
  ) as Record<string, string>,
  encounters: Object.fromEntries(
    Object.entries(encounterMotion).map(([path, url]) => [
      path.split('/').at(-1)!.replace('-action-v1-atlas.png', ''),
      url,
    ]),
  ) as Record<string, string>,
  arena,
  cover,
  soldier,
  boss,
  medic,
  lineup,
  directions: {
    soldierNorth,
    soldierSouth,
    medicNorth,
    medicSouth,
    medicEast,
    medicWest,
  },
  warden: {
    idle: wardenIdle,
    attack: wardenAttack,
    channel: wardenChannel,
    hurt: wardenHurt,
    defeat: wardenDefeat,
  },
  heavy: {
    reference: heavyReference,
    North: heavyRunNorth,
    South: heavyRunSouth,
    East: heavyRunEast,
    West: heavyRunWest,
  },
  portraits: {
    heavy: heavyPortrait,
    tank: tankPortrait,
    mage: magePortrait,
    engineer: engineerPortrait,
    assassin: assassinPortrait,
  } as Record<string, string>,
  upgrades: {
    damage: damageIcon,
    'fire-rate': rateIcon,
    magazine: magazineIcon,
    reload: reloadIcon,
    health: healthIcon,
  } as Record<string, string>,
};
