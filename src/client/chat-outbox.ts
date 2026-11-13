import {chatText} from '../shared/room-chat.ts';
import {isChatReceipt,type ChatRequest,type ChatReceipt} from '../shared/chat-delivery.ts';
export type ChatDeliveryState={status:'idle'|'sending'|'sent'|'invalid'|'disabled'|'cooldown'|'unavailable'|'offline'|'uncertain';requestId:string;draft:string;retryAfterMs:number};
type Pending={request:ChatRequest;draft:string;waiting:boolean};
/** One in-memory request. Keep its identity after uncertainty so an explicit retry is safe. */
export class ChatOutbox{
  state:ChatDeliveryState={status:'idle',requestId:'',draft:'',retryAfterMs:0};
  onChange:(state:ChatDeliveryState)=>void=()=>{};
  private pending?:Pending;
  private timer?:ReturnType<typeof setTimeout>;
  private destroyed=false;
  constructor(private transport:(request:ChatRequest)=>void,private timeoutMs=6000){}
  private emit(status:ChatDeliveryState['status'],draft:string,requestId='',retryAfterMs=0){this.state={status,draft,requestId,retryAfterMs};this.onChange(this.state);}
  private clearTimer(){if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
  send(draft:string,connected:boolean,enabled:boolean){
    if(this.destroyed||this.pending?.waiting)return false;
    const text=chatText(draft);
    if(!text){this.emit('invalid',draft);return false;}
    if(!enabled){this.emit('disabled',draft);return false;}
    if(!connected){this.emit('offline',draft);return false;}
    this.clearTimer();
    const request=this.pending?.request.text===text?this.pending.request:{requestId:crypto.randomUUID(),text};
    this.pending={request,draft,waiting:true};this.emit('sending',draft,request.requestId);
    this.timer=setTimeout(()=>this.disconnected(),this.timeoutMs);
    try{this.transport(request);}catch{this.disconnected();}
    return true;
  }
  receive(value:unknown):value is ChatReceipt{
    if(this.destroyed||!isChatReceipt(value)||value.requestId!==this.pending?.request.requestId)return false;
    const p=this.pending;
    if(value.ok&&value.message.text!==p.request.text)return false;
    this.clearTimer();p.waiting=false;
    if(value.ok){this.pending=undefined;this.emit('sent',p.draft,value.requestId);}
    else{
      this.emit(value.reason,p.draft,value.requestId,value.retryAfterMs);
      if(value.reason==='cooldown')this.timer=setTimeout(()=>{this.timer=undefined;this.emit('idle',p.draft,value.requestId);},value.retryAfterMs);
    }
    return true;
  }
  disconnected(){
    if(this.destroyed||!this.pending?.waiting)return;
    this.clearTimer();this.pending.waiting=false;this.emit('uncertain',this.pending.draft,this.pending.request.requestId);
  }
  disabled(){
    if(!this.pending?.waiting)return;
    this.clearTimer();this.pending.waiting=false;this.emit('disabled',this.pending.draft,this.pending.request.requestId);
  }
  destroy(){this.destroyed=true;this.clearTimer();this.pending=undefined;this.onChange=()=>{};}
}
