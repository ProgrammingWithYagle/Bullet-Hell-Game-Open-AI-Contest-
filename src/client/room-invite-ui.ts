import { roomCodeMarkup, bindRoomCode } from './ui/waiting-room.ts';
export class RoomInviteUI {
  readonly root = document.createElement('details');
  private summary = document.createElement('summary');
  private card = document.createElement('div');
  private code = '';
  constructor(host: HTMLElement, private t: (key:string)=>string, changed:()=>void) {
    this.root.className='room-invite-hud';this.root.hidden=true;
    this.summary.textContent=t('ui.roomCodeButton');this.summary.setAttribute('aria-controls','room-invite-card');
    this.card.id='room-invite-card';this.root.append(this.summary,this.card);host.append(this.root);
    this.root.ontoggle=()=>changed();
    this.root.addEventListener('pointerdown',event=>event.stopPropagation());
    this.root.addEventListener('pointerup',event=>event.stopPropagation());
    this.root.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter')event.stopPropagation();});
  }
  get open(){return !this.root.hidden&&this.root.open;}
  close(){this.root.open=false;this.summary.focus({preventScroll:true});}
  update(code:string){
    this.root.hidden=!code;
    if(code===this.code)return;
    this.code=code;this.card.innerHTML=roomCodeMarkup(code,this.t);
    const note=document.createElement('small');note.textContent=this.t('ui.onlinePause');this.card.append(note);
    bindRoomCode(this.card,code,this.t);
  }
  destroy(){this.root.ontoggle=null;this.root.remove();}
}
