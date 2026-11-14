import {bulwarkIds} from '../../shared/tank-bulwark.ts';
import {data} from '../../shared/game.ts';
import type {PlayerView} from '../../shared/view.ts';
import type {ControlOptions,Action} from '../input-bindings.ts';
import {bindingMarkup} from './engineer-controls.ts';
import {actionLabel} from './control-settings.ts';
import {escape as e} from './html.ts';
import {locale,t} from '../i18n.ts';

export function tankKitMarkup(p:PlayerView,controls:ControlOptions,open:boolean){
  if(p.classId!=='tank'||p.training)return '';
  const cl=data.classes.find(c=>c.id==='tank')!;
  const rows:{action:'q'|'e'|'ultimate'|'technique1'|'technique2'|'reload'|'fire';key:string}[]=[
    {action:'q',key:'ability.'+cl.abilities[0].id+'.name'},
    {action:'e',key:'ability.'+cl.abilities[1].id+'.name'},
    {action:'ultimate',key:'ability.'+cl.ultimate.id+'.name'},
  ];
  const owned=p.skills.includes(bulwarkIds.entry);
  if(owned){
    rows.push({action:'technique1',key:'ui.tank.carryAction'},{action:'reload',key:'ui.reload'});
    if(p.skills.includes(bulwarkIds.pivot))rows.push({action:'technique2',key:'skill.'+bulwarkIds.pivot+'.name'});
    if(p.skills.includes(bulwarkIds.port))rows.push({action:'technique2',key:'skill.'+bulwarkIds.port+'.name'},{action:'fire',key:'ui.tank.primary'});
  }
  const help=[t('ui.tank.carryHelp'),p.skills.includes(bulwarkIds.pivot)?t('ui.tank.pivotHelp'):'',p.skills.includes(bulwarkIds.port)?t('ui.tank.portHelp'):''].filter(Boolean).join(' ');
  return '<details class="engineer-kit tank-kit" data-class-kit data-tank-kit'+(open?' open':'')+'><summary id="tank-kit-controls"><span lang="'+e(locale)+'">'+e(t('ui.controls'))+'</span><small>'+e(t('ui.equipped'))+'</small></summary><p lang="en" dir="ltr">'+e(help)+'</p><ul>'+rows.map(({action,key})=>'<li data-kit-action="'+action+'"><span class="engineer-kit-slot">'+e(actionLabel(action as Action))+'</span><strong lang="'+e(key.startsWith('ui.tank.')||key.startsWith('skill.tank-bulwark-')?'en':locale)+'" dir="auto">'+e(t(key))+'</strong>'+bindingMarkup(action,controls)+'</li>').join('')+'</ul></details>';
}
