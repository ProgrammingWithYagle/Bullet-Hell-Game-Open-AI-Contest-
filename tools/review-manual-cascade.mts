// One-off source cascade diagnosis, not a browser, layout engine or screenshot.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const {parsers}=await import(pathToFileURL(root+'/node_modules/prettier/plugins/postcss.mjs').href);
const {MenuDocument}=await import(pathToFileURL(root+'/tests/helpers/menu-dom.ts').href);
const names=['src/client/ui/polish.css','src/client/ui/skill-map.css'],sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const before=names.map(f=>execFileSync('git',['-c','core.bare=false','show','76bac94af793762aa3176a85bd0c18b929ec1bfd:'+f],{encoding:'utf8',maxBuffer:4*1024*1024}));
const after=names.map(f=>fs.readFileSync(f,'utf8'));
function inspect(sheets:string[],role:string,state:string){
  const doc=new MenuDocument(),host=doc.createElement('section');doc.body.append(host);host.innerHTML='<section class="pathway-choices"><article class="pathway-technique role-'+role+'"><button class="item-node skill-node '+state+'"><img class="item-art"><span class="node-grade">SS+</span><span class="node-status">Owned</span></button></article></section>';
  const button=host.querySelector('button')!,badge=host.querySelector('.node-grade')!,image=host.querySelector('img')!,targets=[button,badge,image],values=targets.map(()=>new Map<string,any>());let order=0;
  for(let sheet=0;sheet<sheets.length;sheet++){
    const ast:any=parsers.css.parse(sheets[sheet],{parser:'css'});
    for(const rule of ast.nodes){if(rule.type!=='css-rule')continue;const raw=rule.raws.selector??rule.selector?.text;if(typeof raw!=='string')continue;
      for(const selector of raw.split(',').map(s=>s.trim())){
        if(!/\.(?:item-node|skill-node|node-grade|item-art)\b/.test(selector)||/[:>+~]/.test(selector))continue;
        const specificity=(selector.match(/#[\w-]+/g)?.length??0)*100+(selector.match(/\.[\w-]+/g)?.length??0)*10+(selector.match(/(?:^|\s)[a-z][\w-]*/gi)?.length??0);
        for(const d of rule.nodes){if(d.type!=='css-decl')continue;const value=d.value?.text??d.raws?.value;if(typeof value!=='string')continue;order++;const props:Record<string,string>={[d.prop]:value};
          if(d.prop==='border'){const parts=value.split(/\s+/);if(parts.length===3){props['border-width']=parts[0];props['border-style']=parts[1];props['border-color']=parts[2];}}
          for(let i=0;i<targets.length;i++){if(!host.querySelectorAll(selector).includes(targets[i]))continue;for(const [property,v]of Object.entries(props)){const next={value:v,important:!!d.important,specificity,order,selector,sheet:names[sheet]},old=values[i].get(property);if(!old||Number(next.important)>Number(old.important)||next.important===old.important&&(specificity>old.specificity||specificity===old.specificity&&order>old.order))values[i].set(property,next);}}
        }
      }
    }
  }
  const select=(i:number,props:string[])=>Object.fromEntries(props.map(p=>[p,values[i].get(p)]));return {role,state,button:select(0,['border-width','border-style','border-color','background']),badge:select(1,['top','bottom','left','right','transform']),image:select(2,['filter'])};
}
const cases=[['entry','available'],['active','available'],['active','owned unavailable'],['evolution','available'],['capstone','owned unavailable inspected']];
const oldRows=cases.map(([role,state])=>inspect(before,role,state)),rows=cases.map(([role,state])=>inspect(after,role,state));
assert.equal(oldRows[1].button['border-width'].value,'1.5px');assert.equal(oldRows[1].button['border-style'].value,'solid');assert.notEqual(oldRows[0].badge.top.value,'auto');assert.notEqual(oldRows[0].badge.bottom.value,'auto');
assert.equal(rows[1].button['border-width'].value,'5px');assert.equal(rows[1].button['border-style'].value,'double');assert.equal(rows[4].button['border-width'].value,'4px');
for(const row of rows){assert.equal(row.badge.top.value,'auto');assert.equal(row.badge.right.value,'auto');assert.equal(row.badge.left.value,'-8px');assert.equal(row.badge.transform.value,'none');assert(!row.button.background.value.includes('#e8e5cd'));}
for(const row of rows.filter(r=>r.state.includes('owned')))assert(row.image.filter.value.includes('drop-shadow'));
const report={passed:true,baseline:'76bac94af793762aa3176a85bd0c18b929ec1bfd',sheets:names.map((f,i)=>({file:f,beforeSha256:sha(before[i]),afterSha256:sha(after[i])})),before:oldRows,after:rows,limits:['Native parser + simple class-selector source cascade for the normal top-level stylesheet rules only. This is not a complete CSS engine, browser, rendered view or physical-device acceptance.','Proves the legacy important-border/background and conflicting badge-anchor defects and their scoped corrections. Font layout, media-query rendering and human aesthetics remain separate.']};fs.writeFileSync('reviews/manual-cascade-2026-11-03/cascade-review.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,oldActiveFrame:{width:oldRows[1].button['border-width'].value,style:oldRows[1].button['border-style'].value},newActiveFrame:{width:rows[1].button['border-width'].value,style:rows[1].button['border-style'].value},cases:rows.length,badgeAnchorsCorrected:true,ownedArtRemainsFullColor:true}));
