import messages from "./field-journal-messages.json";
export function journalText(
  locale: string,
  key: string,
  values: Record<string, string | number> = {},
) {
  const words = (messages[locale as keyof typeof messages] ??
    messages.en) as Record<string, string>;
  let text = words["journal." + key];
  if (typeof text !== "string")
    throw Error("Unknown field journal message: " + key);
  for (const [name, value] of Object.entries(values))
    text = text.replaceAll("{" + name + "}", String(value));
  return text;
}
