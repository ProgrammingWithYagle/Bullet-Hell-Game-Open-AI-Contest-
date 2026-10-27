import { t, locale } from "./i18n.ts";
import type { Session } from "./session.ts";
export class RoomChatUI {
  readonly button = document.createElement("button");
  private panel = document.createElement("section");
  private list = document.createElement("ol");
  private form = document.createElement("form");
  private input = document.createElement("input");
  private send = document.createElement("button");
  private enabled = true;
  private opened = false;
  constructor(
    private session: Session,
    host: HTMLElement,
    private changed: () => void,
  ) {
    this.button.id = "room-chat-toggle";
    this.button.className = "room-chat-toggle";
    this.button.textContent = t("ui.roomChat");
    this.button.setAttribute("aria-controls", "room-chat");
    this.button.setAttribute("aria-expanded", "false");
    this.panel.id = "room-chat";
    this.panel.className = "room-chat";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", t("ui.roomChat"));
    const title = document.createElement("strong");
    title.textContent = t("ui.roomChat");
    this.list.setAttribute("role", "log");
    this.list.setAttribute("aria-live", "polite");
    this.input.maxLength = 160;
    this.input.setAttribute("aria-label", t("ui.chatMessage"));
    this.input.autocomplete = "off";
    this.send.textContent = t("ui.chatSend");
    const note = document.createElement("small");
    note.textContent = t("ui.chatEphemeral");
    this.form.append(this.input, this.send);
    this.panel.append(title, this.list, this.form, note);
    host.append(this.button, this.panel);
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
    return this.enabled && this.opened;
  }
  setOpen(value: boolean) {
    this.opened = value;
    this.panel.hidden = !value;
    this.button.setAttribute("aria-expanded", String(value));
    this.changed();
    if (value) this.input.focus();
    else this.button.focus();
  }
  configure(enabled: boolean, online: boolean) {
    this.enabled = enabled;
    this.button.hidden = !enabled || !online;
    if (!enabled || !online) {
      this.opened = false;
      this.panel.hidden = true;
      this.button.setAttribute("aria-expanded", "false");
    }
    this.session.setChatEnabled(enabled && online);
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
      time.textContent = new Intl.DateTimeFormat(locale, {
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
    this.button.remove();
    this.panel.remove();
  }
}
