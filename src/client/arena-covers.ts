import { runtimeArena,runtimeArenas } from '../shared/arena-layouts.ts';
export function arenaCoverPlan(id: string,difficulty='normal') {
  const arena = runtimeArena(id,difficulty);
  const cover=id==='gatehouse'?arena.cover.slice(runtimeArenas.find(a=>a.id===id)!.cover.length):arena.cover;
  const props=id==='gatehouse'?[1]:arena.props;
  if (!props.length || props.some(prop=>!Number.isInteger(prop)||prop<1||prop>7))throw Error('Arena cover requires a non-bed prop: '+id);
  return cover.map((rect,index)=>({...rect,texture:'environment-'+props[index%props.length]}));
}
