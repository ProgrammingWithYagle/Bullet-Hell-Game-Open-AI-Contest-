import {languages,locale,setLanguage,t} from '../i18n.ts';
import {changeProfile} from '../profile.ts';
import {escape as e} from './html.ts';

/** First-visit page. Preview language loads are cancellable and saved only on Continue. */
export function mountLanguageWelcome(host:HTMLElement,done:(saved:boolean)=>void) {
  let disposed=false,pending=false,message='',request:AbortController|undefined;
  const alive=()=>!disposed&&host.isConnected;
  const dispose=()=>{disposed=true;request?.abort();};
  function render(focus?:string) {
    if(!alive())return;
    const active=document.activeElement as HTMLElement|null;
    const previousFocus=focus??(active?.id&&host.contains(active)?'#'+active.id:undefined);
    host.innerHTML=`<main class="language-welcome-page"><section class="language-welcome" aria-labelledby="language-welcome-title"><p class="language-welcome-brand" dir="ltr">Grave Accord</p><h1 id="language-welcome-title" tabindex="-1">${e(t('ui.welcomeLanguageTitle'))}</h1><p>${e(t('ui.welcomeLanguageHelp'))}</p><div class="language-welcome-options" role="group" aria-label="${e(t('ui.language'))}">${languages.map(([id,name])=>`<button type="button" id="choose-language-${e(id)}" data-welcome-language="${e(id)}" aria-pressed="${locale===id}" lang="${e(id)}" dir="${id==='ar'||id==='ur'?'rtl':'ltr'}">${e(name)}</button>`).join('')}</div><p id="notice" class="language-welcome-status" role="status" aria-live="polite">${e(message?t(message):'')}</p><button type="button" id="language-continue" class="primary" ${pending?'disabled':''}>${e(t('ui.languageContinue'))}</button></section></main>`;
    const options=host.querySelector<HTMLElement>('.language-welcome-options')!;
    options.setAttribute('aria-busy',String(pending));
    host.querySelectorAll<HTMLButtonElement>('[data-welcome-language]').forEach(button=>{
      button.onclick=()=>void(async()=>{
        if(!alive())return;
        request?.abort();const current=request=new AbortController();
        pending=true;message='ui.loadingLanguage';render('#'+button.id);
        try {
          const applied=await setLanguage(button.dataset.welcomeLanguage!,current.signal,false);
          if(!alive()||current.signal.aborted||request!==current||applied===false)return;
          message='';
        } catch { if(!alive()||current.signal.aborted||request!==current)return;message='ui.errorLanguage'; }
        pending=false;render();
      })();
    });
    host.querySelector<HTMLButtonElement>('#language-continue')!.onclick=()=>{
      if(!alive()||pending)return;
      let saved=true;
      try {
        changeProfile(localStorage,p=>{p.locale=locale;});
        localStorage.setItem('ga-language',locale);
      } catch { saved=false; }
      dispose();done(saved);
    };
    host.querySelector<HTMLElement>(previousFocus??'#language-welcome-title')?.focus();
  }
  render();return dispose;
}
