import {build, type Plugin} from 'esbuild';
import {mkdtempSync, writeFileSync, readFileSync, unlinkSync, rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {TestContext} from 'node:test';
import {MenuDocument, MenuElement} from './menu-dom.ts';
export function menuEnvironment(t: TestContext) {
 const document = new MenuDocument(), host = document.createElement('main'); host.id = 'app'; document.body.append(host);
 const saved = new Map<string,string>(), listeners = new Map<string,((event:any)=>void)[]>(), cleanup: (()=>unknown)[] = [];
 const window = {innerHeight: 800, location: {protocol: 'http:', hostname: '127.0.0.1'}, scrollTo() {}, addEventListener(type:string,fn:(event:any)=>void){listeners.set(type,[...(listeners.get(type)??[]),fn]);}};
 const values = {document, window, HTMLElement: MenuElement, ResizeObserver: class {observe(){} disconnect(){}}, localStorage: {getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value),removeItem:(key:string)=>saved.delete(key)}};
 const originals = Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
 for(const [key,value] of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,value});
 t.after(async()=>{for(const fn of cleanup.reverse())await fn();for(const [key,descriptor] of originals)descriptor?Object.defineProperty(globalThis,key,descriptor):Reflect.deleteProperty(globalThis,key);});
 return {document,host,saved,cleanup,key:(code:string)=>{for(const fn of listeners.get('keydown')??[])fn({code,preventDefault(){}});}};
}
const common: Record<string,string> = {
 'i18n.ts': "export const locale='en',languages=[['en','English']];export const number=String,t=key=>key,initialLanguage=()=> 'en',setLanguage=async()=>{};",
 'assets.ts': "export const assets={cover:'/cover.png',portraits:Object.fromEntries(['soldier','medic','heavy','tank','mage','engineer','assassin'].map(id=>[id,'/portrait-'+id+'.png'])),medic:'/medic.png',lineup:'/lineup.png',arenaWorlds:{},arenaCovers:{},arenaGrounds:Object.fromEntries(['gatehouse','triage-yard','ossuary-works','sunken-chapel','bell-foundry','crown-crypt'].map(id=>[id,'/map-'+id+'.png']))};",
};
export async function menuBundle(t:TestContext,entry:string,extra:Record<string,string>={},exports='') {
 const stubs={...common,...extra};
 const plugin:Plugin={name:'native-menu-fixtures',setup(builder){
  builder.onResolve({filter:/.*/},args=>{const name=args.path==='phaser'?'phaser':args.path.split('/').at(-1)!;if(name in stubs)return {path:name,namespace:'native-menu-fixture'};});
  builder.onLoad({filter:/.*/,namespace:'native-menu-fixture'},args=>({contents:stubs[args.path],loader:'js'}));
  if(exports)builder.onLoad({filter:/[\\/]src[\\/]client[\\/]main\.ts$/},args=>({contents:readFileSync(args.path,'utf8')+'\n'+exports,loader:'ts'}));
 }};
 const bundle=await build({entryPoints:[entry],bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',banner:{js:"import {createRequire as fixtureRequire} from 'node:module';const require=fixtureRequire(import.meta.url);"},define:{__GA_TESTING_BUILD__:'false','import.meta.env.DEV':'false'},loader:{'.css':'empty'},plugins:[plugin]});
 const directory=mkdtempSync(join(tmpdir(),'grave-native-menu-')),file=join(directory,'menu.mjs');writeFileSync(file,bundle.outputFiles[0].text);
 t.after(()=>{unlinkSync(file);rmdirSync(directory);});
 return import(pathToFileURL(file).href);
}
