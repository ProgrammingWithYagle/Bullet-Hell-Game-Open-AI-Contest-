import messages from './profile-messages.json';
export type ProfileMessage = keyof typeof messages.en;
export function profileText(
  locale: string,
  key: ProfileMessage,
  values: Record<string, string | number> = {},
) {
  let result = (messages[locale as keyof typeof messages] ?? messages.en)[key];
  for (const [k, v] of Object.entries(values)) result = result.replaceAll('{' + k + '}', String(v));
  return result;
}
