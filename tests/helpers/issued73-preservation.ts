import fs from 'node:fs';
const issued = JSON.parse(
  fs.readFileSync(new URL('../fixtures/heavy-linework-issued73.json', import.meta.url), 'utf8'),
);
const ids = new Set<string>(issued.issuedSpecializationIds),
  rules = new Set<string>(issued.issuedRuleKeys),
  newMessages = new Set<string>(issued.introduced74MessageKeys);
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
    !key.startsWith('ui.heavy.reserve') && !key.startsWith('skill.heavy-linework-reserve-1.')));
