import {chatRequestId,type ChatReceipt} from './chat-delivery.ts';
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
  private receipts=new Map<string,Map<string,ChatMessage>>();
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
    this.receipts.delete(id);
  }
  history() {
    return this.messages.map((m) => ({ ...m }));
  }
  historyAllowed(id: string, now: number) {
    if (now < (this.historyAt.get(id) ?? 0)) return false;
    this.historyAt.set(id, now + 5000);
    return true;
  }
  historyRetryAfter(id:string,now:number){return Math.max(1,Math.min(5000,Math.ceil((this.historyAt.get(id)??now)-now)));}
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
  /** Retries acknowledge the original message without broadcasting it twice. */
  deliver(senderId:string,name:string,value:unknown,now:number,ready=true):{receipt:ChatReceipt;message?:ChatMessage}|null{
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const r=value as Record<string,unknown>;
    if(!chatRequestId(r.requestId))return null;
    const fail=(reason:'invalid'|'disabled'|'cooldown'|'unavailable',retryAfterMs=0)=>({receipt:{requestId:r.requestId as string,ok:false as const,reason,retryAfterMs}});
    const text=chatText(r.text);
    if(Object.keys(r).length!==2||!text)return fail('invalid');
    const known=this.receipts.get(senderId),previous=known?.get(r.requestId);
    if(previous)return previous.text===text?{receipt:{requestId:r.requestId,ok:true,message:{...previous}}}:fail('invalid');
    if(!ready)return fail('unavailable');
    if(!this.enabled.has(senderId))return fail('disabled');
    if(now<(this.nextAt.get(senderId)??0))return fail('cooldown',Math.min(1500,Math.max(1,Math.ceil(this.nextAt.get(senderId)!-now))));
    const message=this.accept(senderId,name,text,now)!;
    const cache=known??new Map<string,ChatMessage>();cache.set(r.requestId,{...message});
    while(cache.size>16)cache.delete(cache.keys().next().value!);
    this.receipts.set(senderId,cache);
    return {receipt:{requestId:r.requestId,ok:true,message:{...message}},message};
  }
}
