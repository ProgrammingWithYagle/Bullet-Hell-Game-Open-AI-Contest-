import {validRoomPassword} from '../../shared/room-password-policy.ts';
import {escape as e} from './html.ts';
import {passwordToggleMarkup,bindPasswordVisibility} from './password-visibility.ts';
type Translate=(key:string)=>string;
/** Clear the form on close; a successful Session retains its invitation in private memory only. */
export function promptRoomPassword(host:HTMLElement,t:Translate,join:(password:string)=>void,retry=false){
  const dialog=document.createElement('dialog');dialog.className='room-password-dialog';
  dialog.setAttribute('aria-labelledby','room-password-heading');
  dialog.innerHTML=`<form><h2 id="room-password-heading">${e(t('ui.roomPasswordRequired'))}</h2><p id="room-password-help">${e(t('ui.roomPasswordJoinHelp'))}</p><label>${e(t('ui.roomPassword'))}<span class="password-field"><input id="join-room-password" type="password" name="room-password" autocomplete="current-password" maxlength="128" required aria-describedby="room-password-help room-password-error">${passwordToggleMarkup('join-room-password',t)}</span></label><p id="room-password-error" role="alert" ${retry?'':'hidden'}>${retry?e(t('ui.errorRoomPassword')):''}</p><div class="actions"><button type="button" data-password-cancel>${e(t('ui.cancel'))}</button><button type="submit" class="primary">${e(t('ui.joinRoom'))}</button></div></form>`;
  bindPasswordVisibility(dialog,t);
  const input=dialog.querySelector<HTMLInputElement>('input')!;
  const clear=()=>{input.value='';dialog.remove();};
  dialog.addEventListener('close',clear,{once:true});
  dialog.querySelector<HTMLButtonElement>('[data-password-cancel]')!.onclick=()=>dialog.close();
  dialog.querySelector('form')!.onsubmit=event=>{
    event.preventDefault();
    if(!validRoomPassword(input.value)){
      const error=dialog.querySelector<HTMLElement>('#room-password-error')!;
      error.textContent=t('ui.roomPasswordHelp');error.hidden=false;input.focus();return;
    }
    const password=input.value;input.value='';dialog.close();dialog.remove();join(password);
  };
  host.append(dialog);dialog.showModal();input.focus();
}
