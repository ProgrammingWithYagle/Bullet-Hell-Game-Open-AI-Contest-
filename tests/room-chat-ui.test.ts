import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomChatUI } from '../src/client/room-chat-ui.ts';
import type { Session } from '../src/client/session.ts';

// A deliberately small DOM fixture tests moving the actual chat UI, drafts and focus.
class Element {
  children: Element[]=[];parentElement:Element|null=null;className='';dataset:Record<string,string>={};
  hidden=false;textContent='';value='';id='';scrollTop=0;clientHeight=100;scrollHeight=100;
  attributes=new Map<string,string>();onclick?:()=>void;onkeydown?:(e:unknown)=>void;onsubmit?:(e:unknown)=>void;
  constructor(readonly tagName:string,readonly doc:Doc){}
  classList={remove:(name:string)=>{this.className=this.className.split(' ').filter(n=>n!==name).join(' ');},
    toggle:(name:string,on:boolean)=>{this.classList.remove(name);if(on)this.className+=' '+name;}};
  contains(other:unknown):boolean{return this===other||this.children.some(c=>c.contains(other));}
  append(...nodes:Element[]){for(const node of nodes){if(node.parentElement){if(node.contains(this.doc.activeElement))this.doc.activeElement=null;node.remove();}node.parentElement=this;this.children.push(node);}}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
  replaceChildren(...nodes:Element[]){this.children.forEach(c=>c.parentElement=null);this.children=[];this.append(...nodes);}
  closest(selector:string):Element|null{return selector.split(',').some(s => s === this.tagName || s[0] === '.' && this.className.split(' ').includes(s.slice(1))) ? this : this.parentElement?.closest(selector)??null;}
  setAttribute(key:string,value:string){this.attributes.set(key,value);}
  removeAttribute(key:string){this.attributes.delete(key);}
  focus(){this.doc.activeElement=this;}
  find(tag:string):Element|undefined{return this.tagName===tag?this:this.children.map(c=>c.find(tag)).find(Boolean);}
}
class Doc{activeElement:Element|null=null;createElement(tag:string){return new Element(tag,this);}createTextNode(value:string){const node=this.createElement('#text');node.textContent=value;return node;}}
function setup(){
  const doc=new Doc(),previous=globalThis.document;
  Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
  const host=doc.createElement('main');const messages:{id:number;name:string;senderId:string;text:string;at:number}[]=[];
  let sent='';const session={chatMessages:messages,onChat:()=>{},setChatEnabled:()=>{},sendChat:(value:string)=>{sent=value;return Boolean(value.trim());}};
  let changes=0;const ui=new RoomChatUI(session as unknown as Session,host as unknown as HTMLElement,()=>changes++,{title:'Room chat',message:'Message',send:'Send',note:'Room only',locale:'en'});
  const dock=()=>{const layout=doc.createElement('div');layout.className='dialog-layout';const slot=doc.createElement('div');layout.append(slot);host.append(layout);return{layout,slot};};
  return{doc,host,ui,session,dock,get sent(){return sent;},get changes(){return changes;},restore:()=>Object.defineProperty(globalThis,'document',{value:previous,configurable:true})};
}
test('the real chat form retains its draft, focus and input guard as it moves through upgrades, settings and combat',()=>{
  const f=setup();try{
    f.ui.configure(true,true);f.ui.setOpen(true);const input=f.host.find('input')!;input.value='Save this draft';
    const shop=f.dock(),settings=f.dock();
    f.ui.place(shop.slot as unknown as HTMLElement);assert(shop.layout.className.includes('with-chat'));assert.equal(f.doc.activeElement,input);
    f.ui.place(settings.slot as unknown as HTMLElement);assert(!shop.layout.className.includes('with-chat'));assert(settings.layout.className.includes('with-chat'));
    assert.equal(f.doc.activeElement,input);assert.equal(input.value,'Save this draft');assert.equal(f.ui.blocksInput,true);
    f.ui.place();assert(!settings.layout.className.includes('with-chat'));assert.equal(f.doc.activeElement,input);assert.equal(input.value,'Save this draft');
    let stopped=false;input.onkeydown?.({key:'Escape',preventDefault(){},stopPropagation(){stopped=true;}});
    assert(stopped);assert.equal(f.ui.blocksInput,false);assert.equal(f.doc.activeElement,f.ui.button as unknown);
  }finally{f.restore();}
});
test('chat history refresh and menu replacement keep the draft; successful send clears it and disabled/offline chat cannot block controls',()=>{
  const f=setup();try{
    f.ui.configure(true,true);f.ui.setOpen(true);const input=f.host.find('input')!;input.value='Hello';
    f.session.chatMessages.push({id:1,senderId:'peer',name:'Iona',text:'Ready?',at:1000});f.session.onChat();
    assert.equal(input.value,'Hello');assert.equal(f.doc.activeElement,input);
    const old=f.dock();f.ui.place(old.slot as unknown as HTMLElement);f.ui.place();old.layout.remove();
    const next=f.dock();f.ui.place(next.slot as unknown as HTMLElement);assert.equal(f.host.find('input'),input);
    f.host.find('form')!.onsubmit?.({preventDefault(){}});assert.equal(f.sent,'Hello');assert.equal(input.value,'');
    f.ui.configure(false,true);f.ui.setOpen(true);assert.equal(f.ui.blocksInput,false);assert(!next.layout.className.includes('with-chat'));
    f.ui.configure(true,false);f.ui.setOpen(true);assert.equal(f.ui.blocksInput,false);
    f.ui.destroy();assert.equal(f.host.find('input'),undefined);
  }finally{f.restore();}
});
test('C toggles chat, Enter starts typing, and text/copy/custom gameplay bindings remain usable',()=>{
  const f=setup();try{
    f.ui.configure(true,true);
    const key=(overrides:Record<string,unknown>={})=>({code:'KeyC',target:f.host,repeat:false,isComposing:false,ctrlKey:false,metaKey:false,altKey:false,preventDefault(){},stopImmediatePropagation(){},...overrides}) as unknown as KeyboardEvent;
    assert(f.ui.handleShortcut(key()));assert.equal(f.ui.blocksInput,true);const input=f.host.find('input')!,panel=f.host.find('section')!;assert.equal(f.doc.activeElement,panel);
    assert(f.ui.handleShortcut(key({target:panel})));assert.equal(f.ui.blocksInput,false);
    assert(f.ui.handleShortcut(key()));panel.onkeydown?.({key:'Enter',target:panel,preventDefault(){},stopPropagation(){}});assert.equal(f.doc.activeElement,input);
    input.value='contains c';assert(!f.ui.handleShortcut(key({target:input})));assert.equal(input.value,'contains c');
    f.ui.setOpen(false);assert(!f.ui.handleShortcut(key({ctrlKey:true})));assert(!f.ui.handleShortcut(key({repeat:true})));assert(!f.ui.handleShortcut(key({isComposing:true})));
    f.ui.setShortcutEnabled(false);assert(!f.ui.handleShortcut(key()));assert.equal(f.ui.blocksInput,false);
    f.ui.setShortcutEnabled(true);f.ui.configure(true,false);assert(!f.ui.handleShortcut(key()));
  }finally{f.restore();}
});
