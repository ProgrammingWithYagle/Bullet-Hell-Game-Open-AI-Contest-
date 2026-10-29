import type {ChatDeliveryState} from './chat-outbox.ts';
export function chatDeliveryText(state:ChatDeliveryState,t:(key:string,args?:Record<string,string|number>)=>string){
  return state.status==='idle'?'':t('ui.chatDelivery'+state.status[0].toUpperCase()+state.status.slice(1),{seconds:Math.max(1,Math.ceil(state.retryAfterMs/1000))});
}
