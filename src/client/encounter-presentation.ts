import bellMotion from '../../assets/production/motion/bellringer-lab-library.json';
import {bellFrame,isBellCue} from './bell-presentation.ts';
import alchemistLab from '../../assets/production/motion/alchemist-lab-library.json';
import {moldFrame,isMoldCue} from './mold-presentation.ts';
import {matronFrame} from './matron-presentation.ts';
import {ambulanceFrame} from './ambulance-presentation.ts';
import smallWakes from '../../assets/production/motion/small-wakes-library.json';
import earlyWatch from '../../assets/production/motion/early-watch-library.json';
import endings from '../../assets/production/motion/endless-library.json';
import openingDefeats from '../../assets/production/motion/opening-defeats-library.json';
import courierMotion from '../../assets/production/motion/courier-library.json';
import { finalBossIds } from '../shared/endless-director.ts';
import raids from '../../assets/production/motion/raid-library.json';
import { raidBossIds } from '../shared/raid-director.ts';
import districts from '../../assets/production/motion/district-library.json';
import { districtBossIds } from '../shared/district-director.ts';
import services from '../../assets/production/motion/service-library.json';
import { serviceBossIds } from '../shared/service-director.ts';
import library from '../../assets/production/motion/encounter-library.json';
import civic from '../../assets/production/motion/civic-library.json';
import type { Boss } from '../shared/game.ts';
import type { BossCue } from '../shared/boss-director.ts';
const baseEncounterArt = [
  ...smallWakes.entries,
  ...earlyWatch.entries,
  ...library.entries,
  ...civic.entries,
  ...services.entries,
  ...districts.entries,
  ...raids.entries,
  ...endings.entries,
];
export const encounterArt = baseEncounterArt.map(
  (entry) =>
    (entry.bossId==='bellringer'?bellMotion.entry:undefined) ??
    (entry.bossId==='alchemist'?alchemistLab.entry:undefined) ??
    courierMotion.entries.find((clip) => clip.bossId === entry.bossId) ??
    openingDefeats.entries.find((clip) => clip.bossId === entry.bossId) ??
    entry,
);
export function encounterFrame(boss: Boss, now: number, cues: BossCue[], reduced = false) {
  if(boss.id==='bellringer'){if(boss.health<=0)return 7;if(now<boss.staggerUntil)return 0;return bellFrame(cues.filter(isBellCue),now,reduced);}
  if(boss.id==='alchemist'){if(boss.health<=0)return 7;if(now<boss.staggerUntil)return 0;return moldFrame(cues.filter(isMoldCue),now,reduced);}
  if(boss.id==='matron'){if(boss.health<=0)return 7;if(now<boss.staggerUntil)return 0;return matronFrame(cues.filter((q):q is import('../shared/matron-ward.ts').MatronCue=>q.kind==='matron-walk'||q.kind==='matron-brood'||q.kind==='matron-pulse'||q.kind==='matron-needles'||(q.kind==='service-prop'&&q.role==='nest')),now,reduced);}
  if (
    [...serviceBossIds, ...districtBossIds, ...raidBossIds, ...finalBossIds].some(
      (id) => id === boss.id,
    )
  ) {
    if (boss.health <= 0) return 7;
    if (reduced || now < boss.staggerUntil) return 0;
    const shapes = cues.filter(
      (c) =>
        (c.kind.startsWith('service-') ||
          c.kind.startsWith('district-') ||
          c.kind.startsWith('raid-') ||
          c.kind.startsWith('endless-')) &&
        'at' in c &&
        'until' in c &&
        c.until > now &&
        !(c.kind === 'service-prop' && c.at <= now),
    );
    const next = shapes
      .filter((c) => 'at' in c && c.at > now)
      .sort((a, b) => ('at' in a ? a.at : 0) - ('at' in b ? b.at : 0))[0];
    if (next && 'at' in next) return next.at - now > 15 ? 2 : 3;
    const active = shapes.find((c) => 'at' in c && c.at <= now);
    if (active && 'at' in active) return now - active.at < 8 ? 4 : 5;
    return boss.castEndsAt > 0 && now < boss.castEndsAt + 12 ? 6 : 0;
  }
  if (reduced || now < boss.staggerUntil) return boss.id === 'courier' ? 7 : 0;
  if (boss.id === 'courier') {
    const lane = cues.find((cue) => cue.kind === 'charge');
    if (lane && lane.kind === 'charge') {
      if (now < lane.at) return now < lane.at - 12 ? 1 : 2;
      return 3 + (Math.floor((now - lane.at) / 4) % 3);
    }
    return 7;
  }
  if (boss.id === 'ratcatcher') {
    const rings=cues.filter(c=>c.kind==='ratcatcher-whistle');
    const released=rings.find(c=>now>=c.at && now<c.until);
    if(released&&released.kind==='ratcatcher-whistle')return Math.min(7,4+Math.floor((now-released.at)/3));
    const nextRing=rings.find(c=>now<c.at);
    if(nextRing&&nextRing.kind==='ratcatcher-whistle')return Math.min(3,1+Math.floor(Math.max(0,now-nextRing.at+36)/12));
    const lane = cues.find((cue) => cue.kind === 'scent');
    if (lane && lane.kind === 'scent') {
      if (lane.interrupted) return 0;
      if (now < lane.at) return Math.min(3, 1 + Math.floor(Math.max(0, now - lane.at + 36) / 12));
      return Math.min(7, 4 + Math.floor((now - lane.at) / 5));
    }
    return 0;
  }
  if (boss.id === 'quarantine-clerk') {
    const stamps = cues.filter(
      (cue): cue is Extract<BossCue, { kind: 'stamp' }> => cue.kind === 'stamp',
    );
    const strike = stamps
      .filter((s) => now >= s.at && now - s.at < 7)
      .sort((a, b) => b.at - a.at)[0];
    if (strike) return now - strike.at < 4 ? 4 : 5;
    const next = stamps.filter((s) => s.at > now).sort((a, b) => a.at - b.at)[0];
    if (next) return next.at - now > 20 ? 1 : next.at - now > 10 ? 2 : 3;
  }
  if (boss.id === 'tollkeeper') {
    const wheel = cues.find((c) => c.kind === 'wheel');
    if (wheel?.kind === 'wheel')
      return now < wheel.at
        ? wheel.at - now > 12
          ? 1
          : 2
        : Math.min(6, 4 + Math.floor((now - wheel.at) / 15));
    return 7;
  }
  if (boss.id === 'chain-marshal') {
    if(cues.some(c=>c.kind==='marshal-patrol'))return 0;
    const chain = cues.find((c) => c.kind === 'chain' && c.health > 0 && now < c.endsAt);
    if (chain?.kind === 'chain')
      return now < chain.at
        ? chain.at - now > 16
          ? 2
          : 3
        : Math.min(6, 4 + Math.floor((now - chain.at) / 25));
  }
  if (boss.id === 'gate-widow') {
    if(cues.some(c=>c.kind==='widow-walk'))return 0;
    const gate = cues.find((c) => c.kind === 'gate');
    if (gate?.kind === 'gate')
      return now < gate.at
        ? gate.at - now > 20
          ? 2
          : 3
        : Math.min(6, 4 + Math.floor((now - gate.at) / 25));
  }
  if (boss.id === 'black-ambulance') return ambulanceFrame(cues.filter((q):q is import('../shared/ambulance-route.ts').AmbulanceCue=>q.kind==='ambulance-patrol'||q.kind==='ambulance-lane'||q.kind==='ambulance-stop'||q.kind==='ambulance-burst'||q.kind==='driver'),now,reduced);
  return 0;
}
