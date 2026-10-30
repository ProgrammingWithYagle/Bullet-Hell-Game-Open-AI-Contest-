// Native controller fixture only: no browser, rendering, CSS or layout engine.
const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_m, key: string) => ({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"})[key]!);
export class MenuElement {
 children: MenuElement[] = []; parentElement?: MenuElement; connectedRoot = false;
 attrs: Record<string,string> = {}; dataset: Record<string,string> = {}; html = ''; private content = ''; private selectedValue?: string;
 disabled = false; hidden = false; open = false; checked = false; onclick?: (event: any) => unknown; onchange?: (event: any) => unknown; oninput?: (event: any) => unknown; onkeydown?: (event: any) => unknown; ontoggle?: () => unknown;
 selectionStart: number | null = 0; selectionEnd: number | null = 0;
 get type() {return this.attrs.type ?? ''; } set type(value: string) {this.attrs.type=value;}
 get tabIndex() {return Number(this.attrs.tabindex??(['button','input','select','textarea'].includes(this.tag)?0:-1));} set tabIndex(value:number) {this.attrs.tabindex=String(value);}
 setSelectionRange(start:number,end:number) {this.selectionStart=start;this.selectionEnd=end;}
 showModal() {this.open=true;}
 close() {if(!this.open)return;this.open=false;this.dispatch('close');}
 contains(element:MenuElement) {return element===this||this.querySelectorAll('*').includes(element);}
 listeners = new Map<string, ((event: any) => unknown)[]>();
 style = {setProperty: (_name: string, _value: string) => {}, removeProperty: (_name: string) => {}, cssText: ''};
 constructor(public tag = 'div', public document?: MenuDocument) {}
 get id() { return this.attrs.id ?? ''; } set id(value: string) {this.attrs.id=value;}
 get className() { return this.attrs.class ?? ''; } set className(value: string) {this.attrs.class=value;}
 get classList() { return {add:(...names:string[])=>{this.className=[...new Set([...this.className.split(' '),...names])].join(' ');},remove:(...names:string[])=>{this.className=this.className.split(' ').filter(n=>!names.includes(n)).join(' ');},contains:(name:string)=>this.className.split(' ').includes(name),toggle:(name:string,on?:boolean)=>{const next=on??!this.className.split(' ').includes(name);next?this.classList.add(name):this.classList.remove(name);return next;}}; }
 get value(): string { return this.selectedValue ?? this.attrs.value ?? (this.tag === 'select' ? (this.querySelector('option[selected]') ?? this.querySelector('option'))?.value ?? '' : ''); }
 set value(value: string | number) {this.selectedValue=String(value);}
 get isConnected(): boolean { return this.connectedRoot || this.parentElement?.isConnected === true; }
 get childNodes() {return this.children;}
 get textContent(): string {return this.content+this.children.map(c=>c.textContent).join('');}
 set textContent(value: string) {this.replaceChildren();this.content=String(value);}
 get innerHTML() {return this.html;}
 set outerHTML(value:string) {if(!this.parentElement)return;const fragment=new MenuElement('div',this.document);fragment.innerHTML=value;this.before(...fragment.children);this.remove();}
 set innerHTML(value: string) {
  this.replaceChildren();this.content='';this.html=value;
  const stack: MenuElement[]=[this];
  for(const token of value.matchAll(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+/gi)) {
   const text=token[0];
   if(text.startsWith('<!--'))continue;
   if(text.startsWith('</')){if(stack.length>1)stack.pop();continue;}
   if(!text.startsWith('<')){stack.at(-1)!.content+=decode(text);continue;}
   const tag=text.match(/^<([\w-]+)/)![1].toLowerCase(), element=new MenuElement(tag,this.document);
   const rest=text.slice(tag.length+1,-1);
   for(const attr of rest.matchAll(/([\w:-]+)(?:="([^"]*)"|='([^']*)'|=([^\s>]+))?/g))element.setAttribute(attr[1],decode(attr[2]??attr[3]??attr[4]??''));
   stack.at(-1)!.append(element);if(!voidTags.has(tag)&&!text.endsWith('/>'))stack.push(element);
  }
 }
 setAttribute(key:string,value:string) {this.attrs[key]=value;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_m,c:string)=>c.toUpperCase())]=value;if(key==='disabled')this.disabled=true;if(key==='hidden')this.hidden=true;if(key==='open')this.open=true;if(key==='checked')this.checked=true;}
 getAttribute(key:string) {return this.attrs[key]??null;}
 removeAttribute(key:string) {delete this.attrs[key];if(key==='disabled')this.disabled=false;}
 private matches(simple:string):boolean {
  const tag=simple.match(/^[a-z][\w-]*/i)?.[0]; if(tag&&this.tag!==tag)return false;
  for(const id of simple.matchAll(/#([\w-]+)/g))if(this.id!==id[1])return false;
  for(const cls of simple.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(cls[1]))return false;
  for(const attr of simple.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g))if(!(attr[1] in this.attrs)||attr[2]!==undefined&&this.attrs[attr[1]]!==attr[2])return false;
  return true;
 }
 querySelectorAll<T=MenuElement>(selector:string):T[] {
  const descendants=this.children.flatMap(c=>[c,...c.querySelectorAll<MenuElement>('*')]);
  return descendants.filter(node=>selector.split(',').some(group=>{
   const parts=group.trim().split(/\s+/);if(!node.matches(parts.at(-1)!))return false;
   let parent=node.parentElement;
   for(let i=parts.length-2;i>=0;i--){while(parent&&!parent.matches(parts[i]))parent=parent.parentElement;if(!parent)return false;parent=parent.parentElement;}
   return true;
  })) as T[];
 }
 querySelector<T=MenuElement>(selector:string):T|null {return this.querySelectorAll<T>(selector)[0]??null;}
 closest(selector:string):MenuElement|null {for(let node:MenuElement|undefined=this;node;node=node.parentElement)if(node.matches(selector))return node;return null;}
 append(...nodes:MenuElement[]) {for(const node of nodes){node.remove();node.parentElement=this;node.document=this.document;this.children.push(node);}}
 prepend(...nodes:MenuElement[]) {for(const node of [...nodes].reverse()){node.remove();node.parentElement=this;this.children.unshift(node);}}
 before(...nodes:MenuElement[]) {this.insertSiblings(false,nodes);}
 after(...nodes:MenuElement[]) {this.insertSiblings(true,nodes);}
 private insertSiblings(after:boolean,nodes:MenuElement[]) {const parent=this.parentElement;if(!parent)return;for(const node of nodes){node.remove();node.parentElement=parent;}parent.children.splice(parent.children.indexOf(this)+(after?1:0),0,...nodes);}
 remove() {if(this.parentElement){const p=this.parentElement;p.children=p.children.filter(c=>c!==this);this.parentElement=undefined;}}
 replaceChildren(...nodes:MenuElement[]) {for(const child of this.children)child.parentElement=undefined;this.children=[];this.content='';this.append(...nodes);}
 insertAdjacentHTML(position:string,html:string) {const fragment=new MenuElement('div',this.document);fragment.innerHTML=html;position==='afterbegin'?this.prepend(...fragment.children):this.append(...fragment.children);}
 addEventListener(type:string,fn:(event:any)=>unknown) {this.listeners.set(type,[...(this.listeners.get(type)??[]),fn]);}
 removeEventListener(type:string,fn:(event:any)=>unknown) {this.listeners.set(type,(this.listeners.get(type)??[]).filter(f=>f!==fn));}
 dispatch(type:string,extra:Record<string,unknown>={}) {const event={target:this,preventDefault(){},...extra};(this as any)['on'+type]?.(event);for(const fn of this.listeners.get(type)??[])fn(event);}
 click() {if(!this.disabled)this.dispatch('click');}
 focus() {if(this.document)this.document.activeElement=this;}
 getBoundingClientRect() {return {top:600,bottom:800,width:300,height:200,left:0,right:300};}
}
export class MenuDocument {
 body=new MenuElement('body',this);activeElement?:MenuElement;hidden=false;documentElement=new MenuElement('html',this);listeners=new Map<string,((event:any)=>void)[]>();
 constructor(){this.body.connectedRoot=true;this.documentElement.append(this.body);}
 createElement(tag:string){return new MenuElement(tag,this);}
 querySelector<T=MenuElement>(selector:string):T|null {return this.body.querySelector<T>(selector);}
 querySelectorAll<T=MenuElement>(selector:string):T[] {return this.body.querySelectorAll<T>(selector);}
 getElementById(id:string){return this.querySelector('#'+id);}
 addEventListener(type:string,fn:(event:any)=>void){this.listeners.set(type,[...(this.listeners.get(type)??[]),fn]);}
}
