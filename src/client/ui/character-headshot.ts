import {escape as e} from './html.ts';
const crops:Record<string,[number,number,number,number]>={
  soldier:[175,20,145,145],heavy:[164,10,160,160],tank:[167,10,160,160],
  medic:[164,16,170,170],mage:[164,50,158,158],engineer:[170,15,150,150],assassin:[164,12,160,160],
};
/** Display a head-and-shoulders crop of the existing character portrait; do not alter the native. */
export function characterHeadshot(classId:string,url:string){
  const crop=crops[classId];if(!crop||!url)throw Error('Missing character portrait: '+classId);
  return `<svg class="character-headshot" viewBox="${crop.join(' ')}" aria-hidden="true" focusable="false"><image href="${e(url)}" width="480" height="640"/></svg>`;
}
