import catalog from '../../../content/catalog.json';
import {conflictingSkill} from '../../shared/skill-conflicts.ts';
import {escape as e} from './html.ts';

type Point = {x:number;y:number};
export type SpecializationMap = {
  width:number;height:number;
  nodes:(Point & {id:string;reference:boolean})[];
  edges:{from:string;to:string}[];
  exclusions:{a:string;b:string}[];
};
// Positions are authored for real techniques. Adding a technique requires
// choosing its place in the graph; proposed pathways never become placeholders.
const positions:Record<string,Point> = {
  'engineer-constructs-1':{x:360,y:66},
  'engineer-machinery-1':{x:180,y:250},
  'engineer-traps-1':{x:540,y:250},
};
export function specializationMapLayout(classId:string):SpecializationMap|null {
  const techniques=catalog.specializationSkills.filter(s=>s.classId===classId);
  if(!techniques.length)return null;
  const references=[...new Set(techniques.map(s=>s.prerequisite).filter(Boolean))];
  const nodes=[...references.map(id=>({id,reference:true})),...techniques.map(s=>({id:s.id,reference:false}))].map(n=>{
    const point=positions[n.id];if(!point)throw Error('Specialization needs an authored position: '+n.id);
    return {...n,...point};
  });
  return {
    width:720,height:500,nodes,
    edges:techniques.filter(s=>s.prerequisite).map(s=>({from:s.prerequisite!,to:s.id})),
    exclusions:techniques.flatMap((a,i)=>techniques.slice(i+1).filter(b=>conflictingSkill([a.id],b.id)).map(b=>({a:a.id,b:b.id}))),
  };
}
export function specializationFocus(map:SpecializationMap,id:string,key:string):string|null {
  const current=map.nodes.find(n=>n.id===id);if(!current)return null;
  if(key==='Home')return map.nodes[0].id;
  if(key==='End')return map.nodes.at(-1)!.id;
  const direction:Record<string,Point>={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1}};
  const d=direction[key];if(!d)return id;
  return map.nodes.filter(n=>(n.x-current.x)*d.x+(n.y-current.y)*d.y>.01).map(n=>{
    const dx=n.x-current.x,dy=n.y-current.y,along=dx*d.x+dy*d.y,across=Math.abs(dx*d.y-dy*d.x);
    return {id:n.id,score:1000*across/along+Math.hypot(dx,dy)};
  }).sort((a,b)=>a.score-b.score)[0]?.id??id;
}
export function specializationMapMarkup(map:SpecializationMap,owned:readonly string[],render:(id:string,reference:boolean)=>string) {
  const byId=new Map(map.nodes.map(n=>[n.id,n]));
  const edges=map.edges.map(edge=>{
    const a=byId.get(edge.from)!,b=byId.get(edge.to)!,state=owned.includes(edge.to)?'owned-route':conflictingSkill(owned,edge.to)?'conflicting-route':owned.includes(edge.from)?'available-route':'locked-route';
    return '<path class="'+state+'" data-from="'+e(edge.from)+'" data-to="'+e(edge.to)+'" d="M'+a.x+' '+(a.y+40)+' C'+a.x+' '+(a.y+110)+','+b.x+' '+(b.y-110)+','+b.x+' '+(b.y-46)+'"/>';
  }).join('');
  return '<div class="specialization-graph" role="group" aria-label="Specializations"><svg class="specialization-connections" viewBox="0 0 '+map.width+' '+map.height+'" preserveAspectRatio="none" aria-hidden="true" focusable="false">'+edges+'</svg>'+map.nodes.map(n=>'<div class="specialization-position '+(n.reference?'foundation-reference':'technique-position')+'" data-graph-cell="'+e(n.id)+'" style="--node-x:'+n.x/map.width*100+'%;--node-y:'+n.y/map.height*100+'%">'+render(n.id,n.reference)+'</div>').join('')+'</div>';
}
export function prepareSpecializationMap(host:HTMLElement,map:SpecializationMap) {
  const graph=host.querySelector<HTMLElement>('.specialization-graph');if(!graph)return;
  const buttons=[...graph.querySelectorAll<HTMLButtonElement>('[data-graph-focus]')];
  const selected=buttons.find(b=>b.getAttribute('aria-pressed')==='true')??buttons[0];
  for(const b of buttons){
    b.tabIndex=b===selected?0:-1;
    b.addEventListener('focus',()=>{for(const item of buttons)item.tabIndex=item===b?0:-1;});
  }
  graph.onkeydown=event=>{
    if(event.isComposing||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    const current=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-graph-focus]');if(!current)return;
    const id=specializationFocus(map,current.dataset.graphFocus!,event.key),next=buttons.find(b=>b.dataset.graphFocus===id);if(!next)return;
    event.preventDefault();for(const item of buttons)item.tabIndex=item===next?0:-1;
    next.focus({preventScroll:true});next.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});
  };
}
