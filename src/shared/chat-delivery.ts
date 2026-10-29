import {isChatMessage,type ChatMessage} from './room-chat.ts';
export type ChatRequest={requestId:string;text:string};
export type ChatFailure='invalid'|'disabled'|'cooldown'|'unavailable';
export type ChatReceipt={requestId:string;ok:true;message:ChatMessage}|{requestId:string;ok:false;reason:ChatFailure;retryAfterMs:number};
export const chatRequestId=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function isChatReceipt(value:unknown):value is ChatReceipt{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const r=value as ChatReceipt;
  return chatRequestId(r.requestId)&&(r.ok===true?Object.keys(r).length===3&&isChatMessage(r.message):r.ok===false&&Object.keys(r).length===4&&['invalid','disabled','cooldown','unavailable'].includes(r.reason)&&Number.isInteger(r.retryAfterMs)&&r.retryAfterMs>=0&&r.retryAfterMs<=1500);
}
