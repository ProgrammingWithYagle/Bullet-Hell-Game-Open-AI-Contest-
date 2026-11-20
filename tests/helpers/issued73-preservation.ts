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
  newMessages = new Set<string>([...issued.introduced74MessageKeys,...tankEdition.introduced77MessageKeys,...interceptorEdition.introduced78MessageKeys,...bastionEdition.addedLocaleKeys,...lateBastionEdition.addedLocaleKeys,...bulwarkFittings.addedLocaleKeys,...lateMedicEdition.addedLocaleKeys,...medicEdition.addedLocaleKeys,...interceptorFittings.addedLocaleKeys]);
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
