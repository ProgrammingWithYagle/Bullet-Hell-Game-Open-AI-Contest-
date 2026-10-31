import type { Session } from "./session.ts";
import type {ChatDeliveryState} from './chat-outbox.ts';
export class RoomChatUI {
  private shell = document.createElement("aside");
  readonly button = document.createElement("button");
  private panel = document.createElement("section");
  private list = document.createElement("ol");
  private form = document.createElement("form");
  private input = document.createElement("input");
  private send = document.createElement("button");
  private enabled = true;
  private online = false;
  private dock?: HTMLElement;
  private shortcut = document.createElement('kbd');
  private shortcutEnabled = true;
  private opened = false;
  private delivery = document.createElement('small');
  private draftRevision=0;
  private submittedRevision=0;
  private activeRequest='';
  private composing=false;
  constructor(
    private session: Session,
    private host: HTMLElement,
    private changed: () => void,
    private words: { title: string; message: string; send: string; note: string; locale: string; keyboardHelp?: string;delivery?:(state:ChatDeliveryState)=>string },
  ) {
    this.shell.className = "room-chat-shell";
    this.shell.dataset.placement = "combat";
    this.button.id = "room-chat-toggle";
    this.button.className = "room-chat-toggle";
    this.button.textContent = words.title;
    this.shortcut.textContent = 'C';
    this.button.append(this.shortcut);
    this.button.setAttribute('aria-keyshortcuts','C');
    this.button.setAttribute("aria-controls", "room-chat");
    this.button.setAttribute("aria-expanded", "false");
    this.panel.id = "room-chat";
    this.panel.className = "room-chat";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", words.title);
    this.panel.tabIndex = -1;
    const title = document.createElement("strong");
    title.textContent = words.title;
    this.list.setAttribute("role", "log");
    this.list.setAttribute("aria-live", "polite");
    this.input.maxLength = 1024;
    this.input.setAttribute("aria-label", words.message);
    this.input.autocomplete = "off";
    this.send.textContent = words.send;
    const note = document.createElement("small");
    note.textContent = words.note;
    this.form.append(this.input, this.send);
    this.delivery.className='chat-delivery-status';this.delivery.hidden=true;this.delivery.setAttribute('role','status');this.delivery.setAttribute('aria-live','polite');
    this.panel.append(title, this.list, this.form,this.delivery, note);
    if (words.keyboardHelp) {
      const help = document.createElement('small'); help.className = 'chat-keyboard-help';
      help.textContent = words.keyboardHelp; this.panel.append(help);
    }
    this.shell.append(this.button, this.panel);
    host.append(this.shell);
    this.button.onclick = () => this.setOpen(!this.opened);
    this.form.onsubmit = (e) => {
      e.preventDefault();
      if(this.composing)return;
      this.submittedRevision=this.draftRevision;
      this.session.sendChat(this.input.value);
    };
    this.input.oninput=()=>{this.draftRevision++;};
    this.input.addEventListener('compositionstart',()=>{this.composing=true;});
    this.input.addEventListener('compositionend',()=>{this.composing=false;});
    session.onChatDelivery=state=>{
      if(state.status==='sending')this.activeRequest=state.requestId;
      if(state.status==='sent'&&state.requestId===this.activeRequest&&this.input.value===state.draft&&this.draftRevision===this.submittedRevision)this.input.value='';
      this.send.disabled=state.status==='sending'||state.status==='cooldown';
      this.input.setAttribute('aria-busy',String(state.status==='sending'));
      this.delivery.textContent=this.words.delivery?.(state)??'';this.delivery.hidden=!this.delivery.textContent;
    };
    this.input.onkeydown = (e) => {
      if(e.isComposing)return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.setOpen(false);
      }
    };
    this.panel.onkeydown = e => {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); this.setOpen(false);
      } else if (e.key === 'Enter' && e.target === this.panel) {
        e.preventDefault(); e.stopPropagation(); this.input.focus();
      }
    };
    session.onChat = () => this.render();
  }
  get blocksInput() {
    return this.enabled && this.online && this.opened;
  }
  setShortcutEnabled(value: boolean) {
    this.shortcutEnabled = value;
    this.shortcut.hidden = !value;
    if (value) this.button.setAttribute('aria-keyshortcuts','C');
    else this.button.removeAttribute('aria-keyshortcuts');
  }
  handleShortcut(event: KeyboardEvent) {
    if (!this.enabled || !this.online || !this.shortcutEnabled || event.code !== 'KeyC'
      || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return false;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('input,select,textarea,[contenteditable="true"]')) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.setOpen(!this.opened, 'panel');
    return true;
  }
  // Keep the same form, draft and history when menus rebuild after a purchase.
  place(dock?: HTMLElement) {
    const focused = this.shell.contains(document.activeElement)
      ? document.activeElement as HTMLElement : null;
    this.dock?.closest('.dialog-layout')?.classList.remove('with-chat');
    this.dock = dock;
    const target = dock ?? this.host;
    if (this.shell.parentElement !== target) target.append(this.shell);
    this.shell.dataset.placement = dock ? "menu" : "combat";
    dock?.closest('.dialog-layout')?.classList.toggle('with-chat', this.enabled && this.online);
    if (focused) focused.focus({ preventScroll: true });
  }
  setOpen(value: boolean, focus: 'input'|'panel' = 'input') {
    if (value && (!this.enabled || !this.online)) return;
    this.opened = value;
    this.panel.hidden = !value;
    this.button.setAttribute("aria-expanded", String(value));
    this.changed();
    if (value) (focus === 'panel' ? this.panel : this.input).focus();
    else this.button.focus();
  }
  configure(enabled: boolean, online: boolean) {
    this.enabled = enabled;
    this.online = online;
    this.shell.hidden = !enabled || !online;
    this.button.hidden = !enabled || !online;
    if (!enabled || !online) {
      this.opened = false;
      this.panel.hidden = true;
      this.button.setAttribute("aria-expanded", "false");
    }
    this.session.setChatEnabled(enabled && online);
    this.dock?.closest('.dialog-layout')?.classList.toggle('with-chat', enabled && online);
    this.render();
  }
  private render() {
    const atBottom =
      this.list.scrollTop + this.list.clientHeight >=
      this.list.scrollHeight - 16;
    this.list.replaceChildren();
    for (const message of this.session.chatMessages) {
      const row = document.createElement("li"),
        name = document.createElement("bdi"),
        time = document.createElement("time"),
        body = document.createElement("span");
      name.textContent = message.name;
      time.textContent = new Intl.DateTimeFormat(this.words.locale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(message.at);
      body.textContent = message.text;
      body.dir = "auto";
      row.append(time, name, document.createTextNode(": "), body);
      this.list.append(row);
    }
    if (atBottom) this.list.scrollTop = this.list.scrollHeight;
  }
  destroy() {
    this.session.onChat = () => {};
    this.session.onChatDelivery=()=>{};
    this.dock?.closest('.dialog-layout')?.classList.remove('with-chat');
    this.shell.remove();
  }
}
