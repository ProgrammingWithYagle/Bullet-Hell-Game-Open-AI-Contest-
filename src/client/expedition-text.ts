import messages from "./expedition-messages.json";

export type ExpeditionMessage = keyof typeof messages.en;
export function expeditionText(
  language: string,
  key: ExpeditionMessage,
): string {
  const words = messages[language as keyof typeof messages] ?? messages.en;
  return words[key];
}
