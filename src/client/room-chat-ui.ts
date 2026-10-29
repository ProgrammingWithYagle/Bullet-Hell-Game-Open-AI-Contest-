import type { Session } from "./session.ts";
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
  private opened = false;
  constructor(
    private session: Session,
    private host: HTMLElement,
    private changed: () => void,
    private words: { title: string; message: string; send: string; note: string; locale: string },
  ) {
    this.shell.className = "room-chat-shell";
    this.shell.dataset.placement = "combat";
    this.button.id = "room-chat-toggle";
    this.button.className = "room-chat-toggle";
    this.button.textContent = words.title;
    this.button.setAttribute("aria-controls", "room-chat");
    this.button.setAttribute("aria-expanded", "false");
    this.panel.id = "room-chat";
    this.panel.className = "room-chat";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", words.title);
    const title = document.createElement("strong");
    title.textContent = words.title;
    this.list.setAttribute("role", "log");
    this.list.setAttribute("aria-live", "polite");
    this.input.maxLength = 160;
    this.input.setAttribute("aria-label", words.message);
    this.input.autocomplete = "off";
    this.send.textContent = words.send;
    const note = document.createElement("small");
    note.textContent = words.note;
    this.form.append(this.input, this.send);
    this.panel.append(title, this.list, this.form, note);
    this.shell.append(this.button, this.panel);
    host.append(this.shell);
    this.button.onclick = () => this.setOpen(!this.opened);
    this.form.onsubmit = (e) => {
      e.preventDefault();
      if (this.session.sendChat(this.input.value)) this.input.value = "";
    };
    this.input.onkeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.setOpen(false);
      }
    };
    session.onChat = () => this.render();
  }
  get blocksInput() {
    return this.enabled && this.online && this.opened;
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
  setOpen(value: boolean) {
    if (value && (!this.enabled || !this.online)) return;
    this.opened = value;
    this.panel.hidden = !value;
    this.button.setAttribute("aria-expanded", String(value));
    this.changed();
    if (value) this.input.focus();
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
    this.dock?.closest('.dialog-layout')?.classList.remove('with-chat');
    this.shell.remove();
  }
}
