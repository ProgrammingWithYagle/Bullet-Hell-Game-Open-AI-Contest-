import {escape as e} from './html.ts';
type Translate=(key:string,values?:Record<string,string|number>)=>string;
type Art={cover:string;lineup:string;arenaGrounds:Record<string,string>};
const maps=['gatehouse','triage-yard','ossuary-works','sunken-chapel','bell-foundry','crown-crypt'];
const titles=['ui.galleryCover','ui.gallerySurvivors','ui.galleryMaps'];

export function homeGalleryMarkup(art:Art,t:Translate,number:(n:number)=>string) {
  if(!art.cover||!art.lineup||maps.some(id=>!art.arenaGrounds[id]))throw Error('Missing home gallery art');
  const frames=[
    `<img src="${e(art.cover)}" alt="${e(t(titles[0]))}" width="1672" height="941" fetchpriority="high">`,
    `<img src="${e(art.lineup)}" alt="${e(t(titles[1]))}" width="2172" height="724" loading="lazy" decoding="async">`,
    `<div class="home-gallery-maps" role="img" aria-label="${e(t(titles[2]))}">${maps.map(id=>`<img src="${e(art.arenaGrounds[id])}" alt="" loading="lazy" decoding="async">`).join('')}</div>`,
  ];
  return `<section class="home-art home-gallery" data-home-gallery role="region" aria-label="${e(t('ui.galleryTitle'))}" tabindex="0"><div class="home-gallery-viewport">${frames.map((frame,i)=>`<div class="home-gallery-slide" data-gallery-slide="${i}" ${i?'hidden':''}>${frame}</div>`).join('')}</div><div class="home-gallery-navigation"><button type="button" data-gallery-previous aria-label="${e(t('ui.galleryPrevious'))}" title="${e(t('ui.galleryPrevious'))}"><span aria-hidden="true" data-gallery-previous-arrow>‹</span></button><p class="home-gallery-caption" aria-live="polite" aria-atomic="true"><strong data-gallery-title>${e(t(titles[0]))}</strong><span data-gallery-position>${e(t('ui.galleryPosition',{current:number(1),total:number(3)}))}</span></p><button type="button" data-gallery-next aria-label="${e(t('ui.galleryNext'))}" title="${e(t('ui.galleryNext'))}"><span aria-hidden="true" data-gallery-next-arrow>›</span></button></div><div class="home-gallery-dots" role="group" aria-label="${e(t('ui.galleryTitle'))}">${titles.map((key,i)=>`<button type="button" data-gallery-index="${i}" aria-label="${e(t('ui.galleryShow',{number:number(i+1)}))}" ${i?'':'aria-current="true"'}><span aria-hidden="true"></span></button>`).join('')}</div></section>`;
}

/** Manual navigation only: no timer, focus stealing or change to setup choices. */
export function bindHomeGallery(root:HTMLElement,t:Translate,number:(n:number)=>string,options:{initial?:number;rtl?:boolean;onChange?:(index:number)=>void}={}) {
  const slides=Array.from(root.querySelectorAll<HTMLElement>('[data-gallery-slide]'));
  const dots=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-gallery-index]'));
  if(slides.length!==titles.length||dots.length!==titles.length)throw Error('Incomplete home gallery');
  const previous=root.querySelector<HTMLButtonElement>('[data-gallery-previous]')!,next=root.querySelector<HTMLButtonElement>('[data-gallery-next]')!;
  let index=Number.isInteger(options.initial)?Math.max(0,Math.min(slides.length-1,options.initial!)):0,disposed=false;
  const show=(wanted:number)=>{
    if(disposed)return;index=(wanted+slides.length)%slides.length;
    slides.forEach((slide,i)=>{slide.hidden=i!==index;});
    dots.forEach((dot,i)=>i===index?dot.setAttribute('aria-current','true'):dot.removeAttribute('aria-current'));
    root.querySelector<HTMLElement>('[data-gallery-title]')!.textContent=t(titles[index]);
    root.querySelector<HTMLElement>('[data-gallery-position]')!.textContent=t('ui.galleryPosition',{current:number(index+1),total:number(slides.length)});
    options.onChange?.(index);
  };
  root.querySelector<HTMLElement>('[data-gallery-previous-arrow]')!.textContent=options.rtl?'›':'‹';
  root.querySelector<HTMLElement>('[data-gallery-next-arrow]')!.textContent=options.rtl?'‹':'›';
  previous.onclick=()=>show(index-1);next.onclick=()=>show(index+1);
  dots.forEach((dot,i)=>{dot.onclick=()=>show(i);});
  const keyboard=(event:KeyboardEvent)=>{
    const direction=options.rtl?-1:1;
    if(event.key==='ArrowLeft'){event.preventDefault();show(index-direction);}
    else if(event.key==='ArrowRight'){event.preventDefault();show(index+direction);}
    else if(event.key==='Home'){event.preventDefault();show(0);}
    else if(event.key==='End'){event.preventDefault();show(slides.length-1);}
  };
  root.addEventListener('keydown',keyboard);show(index);
  return ()=>{disposed=true;root.removeEventListener('keydown',keyboard);previous.onclick=next.onclick=null;dots.forEach(dot=>{dot.onclick=null;});};
}
