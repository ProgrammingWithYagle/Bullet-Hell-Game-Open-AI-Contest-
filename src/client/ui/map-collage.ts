import {escape as e} from './html.ts';
export function mapCollage(urls:Record<string,string>){
  const ids=['gatehouse','triage-yard','ossuary-works','sunken-chapel','bell-foundry','crown-crypt'];
  if(ids.some(id=>!urls[id]))throw Error('Missing map imagery for random choice');
  return `<span class="map-collage" aria-hidden="true">${ids.map(id=>`<img src="${e(urls[id])}" alt="" loading="lazy" decoding="async">`).join('')}</span>`;
}
