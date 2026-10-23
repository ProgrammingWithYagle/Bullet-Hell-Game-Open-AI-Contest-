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
export const assets = {
  arena,
  cover,
  soldier,
  boss,
  medic,
  lineup,
  directions: { soldierNorth, soldierSouth, medicNorth, medicSouth, medicEast, medicWest },
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
