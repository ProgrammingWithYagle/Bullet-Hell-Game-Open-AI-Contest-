export type Message = string | { plural: string; forms: Record<string, string> };
export function formatMessage(
  value: Message,
  locale: string,
  args: Record<string, string | number> = {},
): string {
  const template =
    typeof value === 'string'
      ? value
      : (value.forms[new Intl.PluralRules(locale).select(Number(args[value.plural] ?? 0))] ??
        value.forms.other);
  if (typeof template !== 'string') throw Error('Invalid message forms');
  // One substitution pass prevents a player's display name from becoming a second template.
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (all, key) =>
    args[key] === undefined
      ? all
      : typeof args[key] === 'number'
        ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(args[key] as number)
        : String(args[key]),
  );
}
