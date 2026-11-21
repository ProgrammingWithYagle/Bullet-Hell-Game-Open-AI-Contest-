import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {homeGalleryMarkup,bindHomeGallery} from '../src/client/ui/home-gallery.ts';
import {menuEnvironment,menuBundle} from './helpers/menu-fixture.ts';
import {data} from '../src/shared/game.ts';
const messages=JSON.parse(readFileSync('locales/en.json','utf8')).messages as Record<string,string>;
const t=(key:string,values:Record<string,string|number>={})=>(messages[key]??key).replace(/\{(\w+)\}/g,(_m,key)=>String(values[key]));
const art={cover:'/cover.png',lineup:'/survivors.png',arenaGrounds:Object.fromEntries(['gatehouse','triage-yard','ossuary-works','sunken-chapel','bell-foundry','crown-crypt'].map(id=>[id,'/map-'+id+'.png']))};

test('manual cover arrows and direct page buttons wrap without stealing focus or changing setup',context=>{
  const env=menuEnvironment(context);env.host.innerHTML=homeGalleryMarkup(art,t,String);
  const root=env.host.querySelector('[data-home-gallery]')!,changes:number[]=[];
  const dispose=bindHomeGallery(root as unknown as HTMLElement,t,String,{onChange:index=>changes.push(index)});context.after(dispose);
  const next=root.querySelector('[data-gallery-next]')!,previous=root.querySelector('[data-gallery-previous]')!;
  next.focus();next.click();assert.equal(root.querySelector('[data-gallery-title]')!.textContent,'Meet the survivors');assert.equal(env.document.activeElement,next);
  next.click();assert.equal(root.querySelector('[data-gallery-position]')!.textContent,'Image 3 of 3');next.click();assert.equal(changes.at(-1),0);previous.click();assert.equal(changes.at(-1),2);
  root.querySelector('[data-gallery-index="1"]')!.click();assert.equal(changes.at(-1),1);
  const slides=root.querySelectorAll('[data-gallery-slide]');assert.deepEqual(slides.map(s=>s.hidden),[true,false,true]);
  assert.equal(root.querySelector('[data-gallery-index="1"]')!.getAttribute('aria-current'),'true');
  dispose();const count=changes.length;next.click();root.dispatch('keydown',{key:'End'});assert.equal(changes.length,count,'Detached old controls must not change later pages');
});

test('gallery keyboard navigation follows RTL and keeps the remembered image on a later mount',context=>{
  const env=menuEnvironment(context);env.host.innerHTML=homeGalleryMarkup(art,t,String);const root=env.host.querySelector('[data-home-gallery]')!;
  const changes:number[]=[];const dispose=bindHomeGallery(root as unknown as HTMLElement,t,String,{initial:1,rtl:true,onChange:index=>changes.push(index)});context.after(dispose);
  assert.equal(changes.at(-1),1);root.dispatch('keydown',{key:'ArrowLeft'});assert.equal(changes.at(-1),2);root.dispatch('keydown',{key:'ArrowRight'});assert.equal(changes.at(-1),1);
  root.dispatch('keydown',{key:'Home'});assert.equal(changes.at(-1),0);root.dispatch('keydown',{key:'End'});assert.equal(changes.at(-1),2);
  assert.equal(root.querySelector('[data-gallery-next-arrow]')!.textContent,'‹');
});

test('the real home menu keeps its gallery image when returning from setup and cleans old controls',async context=>{
  const env=menuEnvironment(context),ui=await menuBundle(context,'src/client/ui/setup.ts');
  const dispose=ui.mountSetup(env.host,{resume(){},launch(){},profileChanged:async()=>{},settingsHTML:()=>'',bindSettings(){}});context.after(dispose);
  const previousRoot=env.host.querySelector('[data-home-gallery]')!,oldNext=previousRoot.querySelector('[data-gallery-next]')!;oldNext.click();
  env.host.querySelector('#new-run')!.click();assert.equal(env.host.querySelector('[data-home-gallery]'),null);oldNext.click();
  env.host.querySelector('#brand-home')!.click();const root=env.host.querySelector('[data-home-gallery]')!;
  assert(root.querySelector('[data-gallery-slide="0"]')!.hidden);assert(!root.querySelector('[data-gallery-slide="1"]')!.hidden);assert(env.host.querySelector('#gentle-start'));
});

test('all fifteen catalogs have source-backed image navigation and missing art fails before rendering',async()=>{
  const {homeGalleryMessages}=await import(pathToFileURL(resolve('locales/source/home-gallery.mjs')).href);
  for(const {id} of data.locales){const catalog=JSON.parse(readFileSync('locales/'+id+'.json','utf8')).messages;for(const [key,value] of Object.entries(homeGalleryMessages(id)))assert.equal(catalog[key],value);}
  assert.throws(()=>homeGalleryMarkup({...art,arenaGrounds:{}},t,String),/Missing home gallery art/);
});
