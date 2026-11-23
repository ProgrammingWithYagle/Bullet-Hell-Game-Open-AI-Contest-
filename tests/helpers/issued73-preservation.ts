import replyEdition from '../fixtures/swordsman-issued96-bindings.json';
import measuredEdition from '../fixtures/bard-issued95-bindings.json';
import entranceEdition from '../fixtures/bard-issued94-bindings.json';
import lamentEdition from '../fixtures/bard-issued93-bindings.json';
import conductorEdition from '../fixtures/bard-issued92-bindings.json';
import hunterEdition from '../fixtures/assassin-issued91-bindings.json';
import infiltratorEdition from '../fixtures/assassin-issued90-bindings.json';
import duelistEdition from '../fixtures/assassin-issued89-bindings.json';
import volatileEdition from '../fixtures/mage-issued88-bindings.json';
import spatialEdition from '../fixtures/mage-issued87-bindings.json';
import mageEdition from '../fixtures/mage-issued86-bindings.json';
import preventiveEdition from '../fixtures/medic-issued85-bindings.json';
import responseEdition from '../fixtures/medic-issued84-bindings.json';
import lateMedicEdition from '../fixtures/medic-issued83-bindings.json';
import medicEdition from '../fixtures/medic-issued82-bindings.json';
import interceptorFittings from '../fixtures/tank-interceptor-issued81-bindings.json';
import bulwarkFittings from '../fixtures/tank-bulwark-issued80-bindings.json';
import lateBastionEdition from '../fixtures/tank-bastion-issued79-bindings.json';
import bastionEdition from '../fixtures/tank-bastion-issued78-bindings.json';
import interceptorEdition from '../fixtures/tank-interceptor-issued77-bindings.json';
import tankEdition from '../fixtures/tank-issued76-bindings.json';
import fs from 'node:fs';
const issued = JSON.parse(
  fs.readFileSync(new URL('../fixtures/heavy-linework-issued73.json', import.meta.url), 'utf8'),
);
const ids = new Set<string>(issued.issuedSpecializationIds),
  rules = new Set<string>(issued.issuedRuleKeys),
  newMessages = new Set<string>([...issued.introduced74MessageKeys,...tankEdition.introduced77MessageKeys,...interceptorEdition.introduced78MessageKeys,...bastionEdition.addedLocaleKeys,...lateBastionEdition.addedLocaleKeys,...bulwarkFittings.addedLocaleKeys,...replyEdition.addedLocaleKeys, ...measuredEdition.addedLocaleKeys, ...entranceEdition.addedLocaleKeys, ...lamentEdition.addedLocaleKeys, ...conductorEdition.addedLocaleKeys, ...hunterEdition.addedLocaleKeys, ...infiltratorEdition.addedLocaleKeys, ...duelistEdition.addedLocaleKeys, ...volatileEdition.addedLocaleKeys, ...spatialEdition.addedLocaleKeys, ...mageEdition.addedLocaleKeys, ...preventiveEdition.addedLocaleKeys, ...responseEdition.addedLocaleKeys,...lateMedicEdition.addedLocaleKeys,...medicEdition.addedLocaleKeys,...interceptorFittings.addedLocaleKeys]);
export const issuedAtOrBefore73 = (s: { id: string }) => ids.has(s.id);
export function catalogAt73<
  T extends { rules: Record<string, unknown>; specializationSkills: readonly { id: string }[] },
>(catalog: T): T {
  return {
    ...catalog,
    rules: Object.fromEntries(Object.entries(catalog.rules).filter(([k]) => rules.has(k))),
    specializationSkills: catalog.specializationSkills.filter(issuedAtOrBefore73),
  } as T;
}
export const messagesAt73 = (messages: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(messages).filter(([key]) => !newMessages.has(key) && key !== 'ui.technique3' &&
    !key.startsWith('ui.heavy.reserve') && !key.startsWith('skill.heavy-linework-reserve-1.') &&
    !key.startsWith('ui.heavy.guide') && !key.startsWith('skill.heavy-linework-guide-1.')));
