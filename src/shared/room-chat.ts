export type ChatMessage = {
  id: number;
  senderId: string;
  name: string;
  text: string;
  at: number;
};
const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });
export function chatText(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1024) return null;
  const text = value.normalize("NFC").trim();
  if (
    !text ||
    new TextEncoder().encode(text).length > 512 ||
    [...graphemes.segment(text)].length > 160 ||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>]/u.test(text)
  )
    return null;
  return text;
}
export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const m = value as ChatMessage;
  return (
    Object.keys(m).length === 5 &&
    Number.isSafeInteger(m.id) &&
    m.id > 0 &&
    typeof m.senderId === "string" &&
    m.senderId.length <= 100 &&
    typeof m.name === "string" &&
    m.name.length <= 96 &&
    Number.isSafeInteger(m.at) &&
    m.at >= 0 &&
    chatText(m.text) === m.text
  );
}
/** Per-room, ephemeral, bounded messages; sender identity always comes from the server. */
export class RoomChat {
  private messages: ChatMessage[] = [];
  private enabled = new Set<string>();
  private nextAt = new Map<string, number>();
  private serial = 0;
  private historyAt = new Map<string, number>();
  subscribe(id: string, enabled: boolean) {
    if (enabled) this.enabled.add(id);
    else this.enabled.delete(id);
  }
  receives(id: string) {
    return this.enabled.has(id);
  }
  remove(id: string) {
    this.enabled.delete(id);
    this.nextAt.delete(id);
    this.historyAt.delete(id);
  }
  history() {
    return this.messages.map((m) => ({ ...m }));
  }
  historyAllowed(id: string, now: number) {
    if (now < (this.historyAt.get(id) ?? 0)) return false;
    this.historyAt.set(id, now + 5000);
    return true;
  }
  accept(senderId: string, name: string, value: unknown, now: number) {
    const text = chatText(value);
    if (
      !text ||
      !this.enabled.has(senderId) ||
      now < (this.nextAt.get(senderId) ?? 0)
    )
      return null;
    this.nextAt.set(senderId, now + 1500);
    const message = {
      id: ++this.serial,
      senderId,
      name: name.slice(0, 96),
      text,
      at: Math.floor(now),
    };
    this.messages.push(message);
    if (this.messages.length > 50) this.messages.shift();
    return message;
  }
}
